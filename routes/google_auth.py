import os
import logging
import requests
from urllib.parse import urlencode
from flask import Blueprint, redirect, request, session, url_for
from database import get_or_create_user

logger = logging.getLogger("shikimxapp.google_auth")
google_bp = Blueprint('google_auth', __name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")


@google_bp.route("/login/google")
def login_google():
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        logger.error("Google OAuth login attempted without GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI")
        return "Google OAuth не настроен", 500

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    logger.info("Redirecting user to Google OAuth")
    return redirect(google_auth_url)


@google_bp.route("/auth/google/callback")
def google_callback():
    code = request.args.get("code")
    error = request.args.get("error")
    if error or not code:
        logger.warning("Google OAuth callback error: %s", error or "missing code")
        return f"Ошибка авторизации Google: {error or 'код не получен'}", 400

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        logger.error("Google OAuth callback attempted without credentials configured")
        return "Google OAuth не настроен", 500

    # Обмен authorization code на access_token
    try:
        token_res = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("Google token request failed: %s", exc)
        return "Не удалось связаться с Google для получения токена", 502

    if token_res.status_code != 200:
        logger.error("Google token exchange failed (%s): %s", token_res.status_code, token_res.text[:200])
        return f"Не удалось получить токен Google: {token_res.text}", token_res.status_code

    token_data = token_res.json()
    access_token = token_data.get("access_token")
    if not access_token:
        logger.error("Google token response missing access_token: %s", token_data)
        return "Ответ Google не содержит access_token", 502

    # Получение профиля пользователя
    try:
        user_info_res = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("Google userinfo request failed: %s", exc)
        return "Не удалось получить профиль Google", 502

    if user_info_res.status_code != 200:
        logger.error("Google userinfo failed (%s): %s", user_info_res.status_code, user_info_res.text[:200])
        return f"Ошибка получения профиля Google: {user_info_res.text}", user_info_res.status_code

    user_info = user_info_res.json()

    # Сохраняем данные профиля (email, name, picture, id) в сессию
    session["google_user"] = {
        "id": user_info.get("id"),
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "avatar": user_info.get("picture"),
    }

    # Create or update user in database
    try:
        user = get_or_create_user(
            google_id=user_info.get("id"),
            email=user_info.get("email"),
            name=user_info.get("name"),
            avatar=user_info.get("picture"),
        )
        session["db_user_id"] = user["id"]
        logger.info("Google user authenticated and saved to DB (email=%s, db_id=%s)", user_info.get("email"), user["id"])
    except Exception as exc:
        logger.error("Failed to save Google user to DB: %s", exc)

    logger.info("Google user authenticated successfully (email=%s)", user_info.get("email"))
    return redirect(url_for("profile.index"))


@google_bp.route("/auth/google/unlink")
def google_unlink():
    session.pop("google_user", None)
    logger.info("Google account unlinked")
    return redirect(url_for("profile.index"))
