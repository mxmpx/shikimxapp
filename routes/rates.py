import logging
import requests
from flask import Blueprint, session, jsonify, request
from utils import SHIKIMORI_BASE, APP_NAME, get_auth_headers, fetch_cached_api, resolve_posters_graphql
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
        poster_map = resolve_posters_graphql(anime_ids, headers)
        for i in range(0, len(anime_ids), 50):
            chunk = anime_ids[i:i + 50]
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes?ids={','.join(chunk)}&limit=100", headers, ttl=3600)
            if isinstance(data, list):
                for a in data:
                    aid = str(a["id"])
                    if aid in poster_map:
                        a["image"] = poster_map[aid]
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
        poster_map = resolve_posters_graphql(ids_list, headers)
        for i in range(0, len(ids_list), 50):
            chunk = ids_list[i:i + 50]
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes?ids={','.join(chunk)}&limit=100", headers, ttl=3600)
            if isinstance(data, list):
                for item in data:
                    aid = str(item["id"])
                    if aid in poster_map:
                        item["image"] = poster_map[aid]
                    items_dict[aid] = item
        logger.debug("Grid data loaded: type=animes, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])


    if grid_type == "characters":
        items_dict = {}

        def fetch_char(char_id):
            data = fetch_cached_api(f"{SHIKIMORI_BASE}/api/characters/{char_id}", headers, ttl=86400)
            return data if isinstance(data, dict) and "id" in data else None

        with ThreadPoolExecutor(max_workers=2) as executor:
            for item in executor.map(fetch_char, ids_list):
                if item:
                    items_dict[str(item["id"])] = item
        logger.debug("Grid data loaded: type=characters, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])


    logger.warning("Unknown grid type requested: %s", grid_type)
    return jsonify([])


@rates_bp.route("/api/rate", methods=["POST"])
@api_route
def save_user_rate():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    data = request.get_json(silent=True) or {}
    target_id = data.get("target_id")
    target_type = data.get("target_type", "Anime")  # Anime or Manga
    rate_id = data.get("id")

    if not target_id:
        raise AppError("Не указан target_id", 400)

    rate_payload = {
        "status": data.get("status", "watching"),
        "score": data.get("score", 0),
        "episodes": data.get("episodes", 0),
        "chapters": data.get("chapters", 0),
        "volumes": data.get("volumes", 0),
        "text": data.get("text", "") or "",
    }
    if "rewatches" in data:
        rate_payload["rewatches"] = data.get("rewatches", 0)

    # If rate_id is missing, check if user already has a rate for this target
    if not rate_id:
        check_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
        try:
            chk_res = requests.get(check_url, headers=headers, timeout=8)
            if chk_res.status_code == 200 and isinstance(chk_res.json(), list) and len(chk_res.json()) > 0:
                rate_id = chk_res.json()[0].get("id")
        except Exception as exc:
            logger.warning("Failed to check existing rate: %s", exc)

    headers["Content-Type"] = "application/json"

    try:
        if rate_id:
            # PATCH existing
            url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rate_id}"
            r = requests.patch(url, headers=headers, json={"user_rate": rate_payload}, timeout=10)
        else:
            # POST new
            url = f"{SHIKIMORI_BASE}/api/v2/user_rates"
            post_data = dict(rate_payload)
            post_data["user_id"] = user_id
            post_data["target_id"] = target_id
            post_data["target_type"] = target_type
            r = requests.post(url, headers=headers, json={"user_rate": post_data}, timeout=10)
    except requests.RequestException as exc:
        logger.error("Rate save failed: %s", exc)
        raise AppError("Не удалось сохранить оценку в Shikimori", 502)

    if r.status_code not in (200, 201):
        logger.warning("Shikimori rate save returned %s: %s", r.status_code, r.text[:200])
        raise AppError(f"Ошибка сохранения ({r.status_code}): {r.text[:100]}", r.status_code)

    from utils import invalidate_user_rates_cache
    invalidate_user_rates_cache()

    logger.info("User rate saved successfully for user=%s target=%s(%s)", user_id, target_id, target_type)
    return jsonify({"success": True, "rate": r.json()})


@rates_bp.route("/api/rate/increment", methods=["POST"])
@api_route
def increment_user_rate():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    data = request.get_json(silent=True) or {}
    target_id = data.get("target_id")
    target_type = data.get("target_type", "Anime")
    total_count = data.get("total_count", 0)  # total episodes or chapters

    if not target_id:
        raise AppError("Не указан target_id", 400)

    # Fetch existing rate
    check_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
    existing_rate = None
    try:
        chk_res = requests.get(check_url, headers=headers, timeout=8)
        if chk_res.status_code == 200 and isinstance(chk_res.json(), list) and len(chk_res.json()) > 0:
            existing_rate = chk_res.json()[0]
    except Exception as exc:
        logger.error("Failed to query rate for increment: %s", exc)

    headers["Content-Type"] = "application/json"

    if existing_rate:
        rate_id = existing_rate.get("id")
        current_ep = existing_rate.get("episodes" if target_type == "Anime" else "chapters") or 0
        new_ep = current_ep + 1
        new_status = existing_rate.get("status")

        if total_count and new_ep >= total_count:
            new_status = "completed"
        elif new_status == "planned":
            new_status = "watching"

        field = "episodes" if target_type == "Anime" else "chapters"
        payload = {"user_rate": {field: new_ep, "status": new_status}}
        url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rate_id}"
        r = requests.patch(url, headers=headers, json=payload, timeout=10)
    else:
        new_ep = 1
        new_status = "completed" if total_count and new_ep >= total_count else "watching"
        field = "episodes" if target_type == "Anime" else "chapters"
        payload = {
            "user_rate": {
                "user_id": user_id,
                "target_id": target_id,
                "target_type": target_type,
                field: new_ep,
                "status": new_status
            }
        }
        url = f"{SHIKIMORI_BASE}/api/v2/user_rates"
        r = requests.post(url, headers=headers, json=payload, timeout=10)

    if r.status_code not in (200, 201):
        logger.warning("Rate increment error %s: %s", r.status_code, r.text[:200])
        raise AppError("Не удалось обновить прогресс", r.status_code)

    from utils import invalidate_user_rates_cache
    invalidate_user_rates_cache()

    logger.info("Incremented progress for user=%s target=%s -> %s", user_id, target_id, new_ep)
    return jsonify({"success": True, "rate": r.json()})


@rates_bp.route("/api/rate/<int:rate_id>", methods=["DELETE"])
@rates_bp.route("/api/rate", methods=["DELETE"])
@api_route
def delete_user_rate(rate_id=None):
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    if not rate_id:
        data = request.get_json(silent=True) or {}
        rate_id = data.get("id")
        if not rate_id and data.get("target_id"):
            target_id = data.get("target_id")
            target_type = data.get("target_type", "Anime")
            check_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
            chk = requests.get(check_url, headers=headers, timeout=8)
            if chk.status_code == 200 and len(chk.json()) > 0:
                rate_id = chk.json()[0].get("id")

    if not rate_id:
        raise AppError("Не указан ID оценки", 400)

    url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rate_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Rate delete failed: %s", exc)
        raise AppError("Не удалось удалить из списка", 502)

    if r.status_code not in (200, 204):
        logger.warning("Delete rate %s returned %s", rate_id, r.status_code)
        raise AppError("Ошибка при удалении", r.status_code)

    from utils import invalidate_user_rates_cache
    invalidate_user_rates_cache()

    logger.info("Deleted rate %s for user=%s", rate_id, user_id)
    return jsonify({"success": True, "deleted_id": rate_id})

