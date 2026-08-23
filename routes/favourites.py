import logging
import requests
from flask import Blueprint, session, jsonify
from utils import SHIKIMORI_BASE, get_auth_headers, fetch_cached_api
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.favourites")
favourites_bp = Blueprint('favourites', __name__)

def enrich_favourites(favs, headers):
    if not isinstance(favs, dict):
        return {"characters": [], "animes": [], "mangas": []}

    for key, api_path in [("animes", "animes"), ("mangas", "mangas")]:
        items = favs.get(key, [])
        if isinstance(items, list) and items:
            item_ids = [str(x["id"]) for x in items if isinstance(x, dict) and x.get("id")]
            if item_ids:
                full_data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/{api_path}?ids={','.join(item_ids)}&limit=100", headers, ttl=3600)
                if isinstance(full_data, list):
                    item_map = {str(a["id"]): a for a in full_data}
                    for item in items:
                        if isinstance(item, dict) and str(item.get("id")) in item_map:
                            t = item_map[str(item["id"])]
                            item["image"], item["url"], item["russian"] = t.get("image"), t.get("url"), t.get("russian") or item.get("russian")

    chars = favs.get("characters", [])
    if isinstance(chars, list) and chars:
        def fetch_char(c):
            if not isinstance(c, dict) or not c.get("id"):
                return c
            # If image or url is already present, skip extra API call
            if c.get("image") and c.get("russian"):
                return c
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/characters/{c['id']}", headers, ttl=86400)
            if data and isinstance(data, dict):
                c["image"], c["url"], c["russian"] = data.get("image") or c.get("image"), data.get("url") or c.get("url"), data.get("russian") or c.get("russian")
            return c
        with ThreadPoolExecutor(max_workers=2) as executor:
            favs["characters"] = list(executor.map(fetch_char, chars))

    return favs


@favourites_bp.route("/api/tab/favourites")
@api_route
def tab_favourites():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    try:
        r = requests.get(f"{SHIKIMORI_BASE}/api/users/{user_id}/favourites", headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Failed to fetch favourites: %s", exc)
        raise AppError("Не удалось загрузить избранное", 502, logging.ERROR)

    if r.status_code == 200 and isinstance(r.json(), dict):
        favs = enrich_favourites(r.json(), headers)
        logger.info("Favourites loaded for user_id=%s", user_id)
        return jsonify(favs)

    logger.warning("Favourites API returned %s for user_id=%s", r.status_code, user_id)
    return jsonify({"characters": [], "animes": [], "mangas": []})
