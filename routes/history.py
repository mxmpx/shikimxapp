import logging
import requests
from flask import Blueprint, session, jsonify
from utils import SHIKIMORI_BASE, get_auth_headers
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.history")
history_bp = Blueprint('history', __name__)

@history_bp.route("/api/tab/history")
@api_route
def tab_history():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    try:
        r = requests.get(
            f"{SHIKIMORI_BASE}/api/users/{user_id}/history",
            headers=headers,
            params={"limit": 40},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("Failed to fetch history: %s", exc)
        raise AppError("Не удалось загрузить историю", 502, logging.ERROR)

    history = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
    if r.status_code != 200:
        logger.warning("History API returned %s for user_id=%s", r.status_code, user_id)

    logger.debug("Loaded %d history items for user_id=%s", len(history), user_id)
    return jsonify(history)
