import os
import hashlib
import logging
import requests
from flask import Blueprint, redirect, request, session, url_for, send_from_directory, current_app
from utils import CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, APP_NAME, AUTH_URL, TOKEN_URL, WHOAMI_URL
from errors import AppError, api_route
from database import get_or_create_user

logger = logging.getLogger("shikimxapp.auth")
auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/cache/img")
def cache_img():
    img_url = request.args.get("url")
    if not img_url:
        logger.warning("Image cache request without URL")
        return "Missing URL", 400

    clean_url = img_url.split("?")[0]
    ext = clean_url.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"

    cache_dir = os.path.join(current_app.root_path, "static", "img_cache")
    os.makedirs(cache_dir, exist_ok=True)

    filename = hashlib.md5(img_url.encode("utf-8")).hexdigest() + f".{ext}"
    filepath = os.path.join(cache_dir, filename)

    if os.path.exists(filepath):
        logger.debug("Image cache hit: %s", filename)
        return send_from_directory(cache_dir, filename)

    try:
        r = requests.get(img_url, headers={"User-Agent": APP_NAME}, timeout=10)
        if r.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(r.content)
            logger.debug("Image cached: %s", filename)
            return send_from_directory(cache_dir, filename)
        logger.warning("Image download failed (%s): %s", r.status_code, img_url)
    except requests.RequestException as exc:
        logger.warning("Image cache error for %s: %s", img_url, exc)

    logger.info("Redirecting to original image: %s", img_url)
    return redirect(img_url)

@auth_bp.route("/login")
def login():
    if not CLIENT_ID:
        logger.error("OAuth login attempted without SHIKIMORI_CLIENT_ID")
        raise AppError("OAuth не настроен: отсутствует SHIKIMORI_CLIENT_ID", 500, logging.ERROR)
    params = {"client_id": CLIENT_ID, "redirect_uri": REDIRECT_URI, "response_type": "code", "scope": ""}
    req = requests.Request("GET", AUTH_URL, params=params).prepare()
    logger.info("Redirecting user to Shikimori OAuth")
    return redirect(req.url)

@auth_bp.route("/auth/callback")
def callback():
    code = request.args.get("code")
    error = request.args.get("error")
    if error or not code:
        logger.warning("OAuth callback error: %s", error or "missing code")
        raise AppError(f"Ошибка авторизации: {error or 'код не получен'}", 400)

    token_data = {
        "grant_type": "authorization_code", "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET, "code": code, "redirect_uri": REDIRECT_URI
    }
    try:
        response = requests.post(TOKEN_URL, headers={"User-Agent": APP_NAME}, data=token_data, timeout=10)
    except requests.RequestException as exc:
        logger.error("Token request failed: %s", exc)
        raise AppError("Не удалось связаться с Shikimori для получения токена", 502, logging.ERROR)

    if response.status_code != 200:
        logger.error("Token exchange failed (%s): %s", response.status_code, response.text[:200])
        raise AppError(f"Не удалось получить токен: {response.text}", response.status_code, logging.ERROR)

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
        raise AppError(f"Ошибка whoami: {whoami_res.text}", whoami_res.status_code, logging.ERROR)

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

@auth_bp.route("/logout")
def logout():
    user_id = session.get("user_id")
    google_user = session.get("google_user")
    session.clear()
    logger.info("User logged out (user_id=%s, google_user=%s)", user_id, bool(google_user))
    return redirect(url_for("profile.index"))
