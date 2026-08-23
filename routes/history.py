import logging
import requests
from flask import Blueprint, session, jsonify
from utils import SHIKIMORI_BASE, get_auth_headers, fetch_cached_api
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

    url = f"{SHIKIMORI_BASE}/api/users/{user_id}/history?limit=40"
    history_data = fetch_cached_api(url, headers, ttl=180)

    history = history_data if isinstance(history_data, list) else []
    logger.debug("Loaded %d history items for user_id=%s", len(history), user_id)
    return jsonify(history)

