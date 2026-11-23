import os
import logging
import threading
import time
import secrets
from urllib.parse import urlparse
import requests
from flask import Blueprint, redirect, request, session, url_for, jsonify, current_app
from utils import CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, APP_NAME, AUTH_URL, TOKEN_URL, WHOAMI_URL, BoundedDict
from errors import AppError, api_route
from database import get_or_create_user

logger = logging.getLogger("shikimxapp.auth")
auth_bp = Blueprint('auth', __name__)

_oauth_lock = threading.Lock()
_processed_oauth_codes = BoundedDict(maxsize=1000)  # code -> timestamp
_pending_oauth_states = BoundedDict(maxsize=1000)   # state -> timestamp


@auth_bp.route("/api/auth/status", methods=["GET"])
@api_route
def auth_status():
    """Check if the current user is authenticated."""
    is_authenticated = bool(session.get("user_id"))
    return jsonify({
        "authenticated": is_authenticated,
        "user_id": session.get("user_id"),
        "db_user_id": session.get("db_user_id")
    })


@auth_bp.route("/login", methods=["GET"])
@auth_bp.route("/api/auth/login", methods=["GET"])
def login():
    if not CLIENT_ID:
        logger.error("OAuth login attempted without SHIKIMORI_CLIENT_ID")
        raise AppError("OAuth не настроен: отсутствует SHIKIMORI_CLIENT_ID", 500, logging.ERROR)

    # If the user accessed /login from e.g. localhost:5000, but REDIRECT_URI is on 127.0.0.1:5000,
    # redirect to the canonical callback host first so cookies/session align.
    if REDIRECT_URI and not current_app.config.get("TESTING"):
        redirect_parsed = urlparse(REDIRECT_URI)
        if redirect_parsed.netloc and request.host != redirect_parsed.netloc:
            target_url = f"{redirect_parsed.scheme}://{redirect_parsed.netloc}{request.full_path}"
            logger.info("Redirecting /login from %s to %s for OAuth domain alignment", request.host, redirect_parsed.netloc)
            return redirect(target_url)

    state = secrets.token_urlsafe(32)
    session["oauth_state"] = state
    with _oauth_lock:
        _pending_oauth_states[state] = time.time()

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "user_rates",
        "state": state
    }
    req = requests.Request("GET", AUTH_URL, params=params).prepare()
    logger.info("Redirecting user to Shikimori OAuth with scope=user_rates")
    return redirect(req.url)


@auth_bp.route("/auth/callback", methods=["GET"])
def callback():
    code = request.args.get("code")
    error = request.args.get("error")
    state = request.args.get("state")

    # If the user is already authenticated in this session, safely redirect home
    if session.get("user_id") and session.get("access_token"):
        logger.info("User already authenticated in session, redirecting to index")
        return redirect(url_for("profile.index"))

    now = time.time()
    with _oauth_lock:
        # Check if code was already redeemed in parallel thread
        if code and code in _processed_oauth_codes:
            logger.info("Duplicate OAuth callback for already redeemed code, redirecting to index")
            return redirect(url_for("profile.index"))

    saved_state = session.pop("oauth_state", None)

    is_valid_server_state = False
    with _oauth_lock:
        if state and state in _pending_oauth_states:
            created_at = _pending_oauth_states.pop(state, 0.0)
            if now - created_at < 600:  # 10 minutes TTL
                is_valid_server_state = True

    if error or not code:
        logger.warning("OAuth callback error: %s", error or "missing code")
        raise AppError(f"Ошибка авторизации: {error or 'код не получен'}", 400)

    if not state or not (is_valid_server_state or (saved_state and state == saved_state)):
        # Check if parallel thread already processed this callback
        if session.get("user_id"):
            return redirect(url_for("profile.index"))
        logger.warning("OAuth CSRF state mismatch: received=%s, expected=%s, server_valid=%s", state, saved_state, is_valid_server_state)
        raise AppError("Ошибка безопасности: неверный CSRF токен (state)", 400)

    token_data = {
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    try:
        response = requests.post(TOKEN_URL, headers={"User-Agent": APP_NAME}, data=token_data, timeout=10)
    except requests.RequestException as exc:
        logger.error("Token request failed: %s", exc)
        raise AppError("Не удалось связаться с Shikimori для получения токена", 502, logging.ERROR)

    if response.status_code != 200:
        if session.get("user_id") or (code and code in _processed_oauth_codes):
            logger.info("Token exchange returned %s but user/code already processed in race, redirecting to index", response.status_code)
            return redirect(url_for("profile.index"))
        logger.error("Token exchange failed (%s): %s", response.status_code, response.text[:200])
        raise AppError("Не удалось получить токен авторизации от Shikimori", response.status_code, logging.ERROR)

    with _oauth_lock:
        if code:
            _processed_oauth_codes[code] = time.time()

    access_token = response.json().get("access_token")
    if not access_token:
        logger.error("Token response missing access_token")
        raise AppError("Ответ Shikimori не содержит access_token", 502, logging.ERROR)

    try:
        whoami_res = requests.get(
            WHOAMI_URL,
            headers={"User-Agent": APP_NAME, "Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("Whoami request failed: %s", exc)
        raise AppError("Не удалось проверить авторизацию пользователя", 502, logging.ERROR)

    if whoami_res.status_code != 200:
        logger.error("Whoami failed (%s): %s", whoami_res.status_code, whoami_res.text[:200])
        raise AppError("Не удалось получить профиль пользователя от Shikimori", whoami_res.status_code, logging.ERROR)

    user_id = whoami_res.json().get("id")
    session["access_token"] = access_token
    session["user_id"] = user_id

    # Create or update user in database
    try:
        user = get_or_create_user(
            shikimori_id=user_id,
            access_token=access_token,
        )
        session["db_user_id"] = user["id"]
        logger.info("User authenticated and saved to DB (shikimori_id=%s, db_id=%s)", user_id, user["id"])
    except Exception as exc:
        logger.error("Failed to save user to DB: %s", exc)

    return redirect(url_for("profile.index"))


@auth_bp.route("/logout", methods=["GET", "POST"])
@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    # Protect GET /logout against cross-site link/img triggers
    if request.method == "GET":
        sec_site = request.headers.get("Sec-Fetch-Site", "").lower()
        if sec_site == "cross-site":
            logger.warning("Blocked cross-site GET /logout invocation")
            return redirect(url_for("profile.index"))

    user_id = session.get("user_id")
    session.clear()
    logger.info("User logged out (user_id=%s)", user_id)
    if request.is_json or request.path.startswith("/api/"):
        return jsonify({"success": True})
    return redirect(url_for("profile.index"))
