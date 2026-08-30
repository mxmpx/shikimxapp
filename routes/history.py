import logging
import requests
from flask import Blueprint, session, jsonify
from utils import (
    SHIKIMORI_BASE, get_auth_headers, fetch_cached_api,
    fetch_graphql, fix_image_url
)
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.history")
history_bp = Blueprint('history', __name__)

def enrich_history(history_items):
    if not isinstance(history_items, list) or not history_items:
        return history_items

    anime_ids = []
    for item in history_items:
        if isinstance(item, dict):
            target = item.get("target") or {}
            aid = target.get("id")
            if aid:
                anime_ids.append(str(aid))

    if not anime_ids:
        return history_items

    # Batch enrich in chunks of 50 via GraphQL
    anime_map = {}
    for i in range(0, len(anime_ids), 50):
        chunk = anime_ids[i:i + 50]
        query = """
        query HistoryPosters($ids: String!) {
          animes(ids: $ids, limit: 50) {
            id
            name
            russian
            poster { mainUrl originalUrl }
          }
        }
        """
        data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
        if data and isinstance(data.get("animes"), list):
            for a in data["animes"]:
                anime_map[str(a["id"])] = a

    for item in history_items:
        if isinstance(item, dict):
            target = item.get("target")
            if isinstance(target, dict):
                aid = str(target.get("id"))
                if aid in anime_map:
                    meta = anime_map[aid]
                    poster = meta.get("poster") or {}
                    p_url = fix_image_url(poster.get("mainUrl") or poster.get("originalUrl"))
                    if p_url:
                        target["image"] = p_url
                    if meta.get("russian"):
                        target["russian"] = meta["russian"]

    return history_items

@history_bp.route("/api/tab/history")
@history_bp.route("/api/history")
@api_route
def tab_history():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    url = f"{SHIKIMORI_BASE}/api/users/{user_id}/history?limit=40"
    history_data = fetch_cached_api(url, headers, ttl=180)

    history = history_data if isinstance(history_data, list) else []
    history = enrich_history(history)
    logger.debug("Loaded %d enriched history items for user_id=%s", len(history), user_id)
    return jsonify(history)

