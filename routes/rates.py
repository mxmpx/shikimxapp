import logging
import requests
from flask import Blueprint, session, jsonify, request
from utils import SHIKIMORI_BASE, APP_NAME, get_auth_headers, fetch_cached_api
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.rates")
rates_bp = Blueprint('rates', __name__)

@rates_bp.route("/api/tab/rates")
@api_route
def tab_rates():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    try:
        r = requests.get(
            f"{SHIKIMORI_BASE}/api/v2/user_rates",
            headers=headers,
            params={"user_id": user_id, "limit": 500},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("Failed to fetch user rates: %s", exc)
        raise AppError("Не удалось загрузить списки", 502, logging.ERROR)

    if r.status_code != 200:
        logger.warning("User rates API returned %s", r.status_code)
        raise AppError("Не удалось загрузить списки", r.status_code)

    rates = r.json() if isinstance(r.json(), list) else []
    if not rates:
        logger.debug("Empty rates list for user_id=%s", user_id)
        return jsonify([])

    anime_ids = list({str(item["target_id"]) for item in rates if item.get("target_type") == "Anime" and item.get("target_id")})
    manga_ids = list({str(item["target_id"]) for item in rates if item.get("target_type") == "Manga" and item.get("target_id")})

    anime_map = {}
    if anime_ids:
        for i in range(0, len(anime_ids), 50):
            chunk = anime_ids[i:i + 50]
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes?ids={','.join(chunk)}&limit=100", headers, ttl=3600)
            if isinstance(data, list):
                for a in data:
                    anime_map[a["id"]] = a

    manga_map = {}
    if manga_ids:
        for i in range(0, len(manga_ids), 50):
            chunk = manga_ids[i:i + 50]
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/mangas?ids={','.join(chunk)}&limit=100", headers, ttl=3600)
            if isinstance(data, list):
                for m in data:
                    manga_map[m["id"]] = m

    for rate in rates:
        t_id, t_type = rate.get("target_id"), rate.get("target_type")
        if t_type == "Anime" and t_id in anime_map:
            rate["target_data"] = anime_map[t_id]
        elif t_type == "Manga" and t_id in manga_map:
            rate["target_data"] = manga_map[t_id]

    logger.info("Loaded %d rates for user_id=%s", len(rates), user_id)
    return jsonify(rates)

@rates_bp.route("/api/grid-data")
@api_route
def grid_data():
    grid_type = request.args.get("type")
    raw_ids = request.args.get("ids", "")
    if not raw_ids:
        return jsonify([])

    ids_list = [i.strip() for i in raw_ids.split(",") if i.strip()]
    headers = {"User-Agent": APP_NAME}

    if grid_type == "animes":
        items_dict = {}
        for i in range(0, len(ids_list), 15):
            chunk = ids_list[i:i + 15]
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes?ids={','.join(chunk)}&limit=100", headers, ttl=3600)
            if isinstance(data, list):
                for item in data:
                    items_dict[str(item["id"])] = item
        logger.debug("Grid data loaded: type=animes, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])

    if grid_type == "characters":
        items_dict = {}

        def fetch_char(char_id):
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/characters/{char_id}", headers, ttl=3600)
            return data if isinstance(data, dict) and "id" in data else None

        with ThreadPoolExecutor(max_workers=5) as executor:
            for item in executor.map(fetch_char, ids_list):
                if item:
                    items_dict[str(item["id"])] = item
        logger.debug("Grid data loaded: type=characters, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])

    logger.warning("Unknown grid type requested: %s", grid_type)
    return jsonify([])
