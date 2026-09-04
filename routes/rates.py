import time
import json
import logging
import threading
import requests
from flask import Blueprint, session, jsonify, request
from database import get_connection
from utils import (
    SHIKIMORI_BASE, APP_NAME, get_auth_headers, fetch_cached_api,
    resolve_posters_graphql, fetch_graphql, fix_image_url
)
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.rates")
rates_bp = Blueprint('rates', __name__)

RATES_CACHE_TTL = 1800  # 30 minutes

_rates_locks = {}
_rates_locks_guard = threading.Lock()
_rates_mem_cache = {}  # user_id -> {"data": [...], "expires_at": float}


def _get_rates_lock(user_id):
    with _rates_locks_guard:
        if user_id not in _rates_locks:
            _rates_locks[user_id] = threading.Lock()
        return _rates_locks[user_id]


def invalidate_user_rates_mem_cache(user_id=None):
    if user_id is None:
        user_id = session.get("user_id")
    if user_id:
        uid = str(user_id)
        _rates_mem_cache.pop(uid, None)


def _get_cached_rates_from_db(user_id):
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (f"rates:user_{user_id}",)
            ).fetchone()
            if row:
                return json.loads(row["data"]), float(row["expires_at"])
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading rates cache from DB: %s", exc)
    return None, 0.0


def _save_rates_to_db_and_mem(user_id, rates_list):
    now = time.time()
    expires_at = now + RATES_CACHE_TTL
    uid = str(user_id)
    _rates_mem_cache[uid] = {
        "data": rates_list,
        "expires_at": expires_at
    }
    try:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (f"rates:user_{uid}", json.dumps(rates_list), expires_at)
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error writing rates cache to DB: %s", exc)


def _fetch_fresh_rates_sync(user_id, headers):
    rates = []
    page = 1
    while True:
        try:
            r = requests.get(
                f"{SHIKIMORI_BASE}/api/v2/user_rates",
                headers=headers,
                params={"user_id": user_id, "limit": 500, "page": page},
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to fetch user rates: %s", exc)
            raise AppError("Не удалось загрузить списки", 502, logging.ERROR)

        if r.status_code != 200:
            logger.warning("User rates API returned %s", r.status_code)
            raise AppError("Не удалось загрузить списки", r.status_code)

        chunk = r.json() if isinstance(r.json(), list) else []
        if not chunk:
            break
        rates.extend(chunk)
        if len(chunk) < 500 or page >= 20:
            break
        page += 1

    if not rates:
        logger.debug("Empty rates list for user_id=%s", user_id)
        _save_rates_to_db_and_mem(user_id, [])
        return []

    anime_ids = list({str(item["target_id"]) for item in rates if item.get("target_type") == "Anime" and item.get("target_id")})
    manga_ids = list({str(item["target_id"]) for item in rates if item.get("target_type") == "Manga" and item.get("target_id")})

    anime_map = {}
    manga_map = {}

    def fetch_anime_chunk(chunk):
        query = """
        query BatchRatesDetails($ids: String!) {
          animes(ids: $ids, limit: 50) {
            id
            name
            russian
            kind
            score
            status
            episodes
            episodesAired
            duration
            season
            rating
            licensors
            airedOn {
              year
              date
            }
            genres {
              id
              name
              russian
            }
            studios {
              id
              name
            }
            poster {
              originalUrl
              mainUrl
            }
          }
        }
        """
        data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
        if data and isinstance(data.get("animes"), list):
            res = []
            for a in data["animes"]:
                poster = a.get("poster") or {}
                img_url = poster.get("originalUrl") or poster.get("mainUrl") or ""
                aired_date = (a.get("airedOn") or {}).get("date") or str((a.get("airedOn") or {}).get("year") or "")
                res.append({
                    "id": int(a["id"]) if a.get("id") else 0,
                    "name": a.get("name", ""),
                    "russian": a.get("russian", "") or a.get("name", ""),
                    "kind": a.get("kind", ""),
                    "score": a.get("score"),
                    "status": a.get("status", ""),
                    "episodes": a.get("episodes", 0),
                    "episodes_aired": a.get("episodesAired", 0),
                    "duration": a.get("duration", 0),
                    "season": a.get("season", ""),
                    "aired_on": aired_date,
                    "licensors": a.get("licensors", []),
                    "rating": a.get("rating", ""),
                    "genres": a.get("genres", []),
                    "studios": a.get("studios", []),
                    "image": img_url
                })
            return res
        return fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes?ids={','.join(chunk)}&limit=100", headers, ttl=3600)

    def fetch_manga_chunk(chunk):
        query = """
        query BatchMangaRatesDetails($ids: String!) {
          mangas(ids: $ids, limit: 50) {
            id
            name
            russian
            kind
            score
            status
            chapters
            volumes
            licensors
            airedOn {
              year
              date
            }
            genres {
              id
              name
              russian
            }
            publishers {
              id
              name
            }
            poster {
              originalUrl
              mainUrl
            }
          }
        }
        """
        data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
        if data and isinstance(data.get("mangas"), list):
            res = []
            for m in data["mangas"]:
                poster = m.get("poster") or {}
                img_url = poster.get("originalUrl") or poster.get("mainUrl") or ""
                aired_date = (m.get("airedOn") or {}).get("date") or str((m.get("airedOn") or {}).get("year") or "")
                res.append({
                    "id": int(m["id"]) if m.get("id") else 0,
                    "name": m.get("name", ""),
                    "russian": m.get("russian", "") or m.get("name", ""),
                    "kind": m.get("kind", ""),
                    "score": m.get("score"),
                    "status": m.get("status", ""),
                    "chapters": m.get("chapters", 0),
                    "volumes": m.get("volumes", 0),
                    "aired_on": aired_date,
                    "licensors": m.get("licensors", []),
                    "genres": m.get("genres", []),
                    "publishers": m.get("publishers", []),
                    "studios": m.get("publishers", []),
                    "image": img_url
                })
            return res
        return fetch_cached_api(f"{SHIKIMORI_BASE}/api/mangas?ids={','.join(chunk)}&limit=100", headers, ttl=3600)

    with ThreadPoolExecutor(max_workers=6) as executor:
        anime_chunks = [anime_ids[i:i + 50] for i in range(0, len(anime_ids), 50)]
        manga_chunks = [manga_ids[i:i + 50] for i in range(0, len(manga_ids), 50)]

        anime_futures = [executor.submit(fetch_anime_chunk, chunk) for chunk in anime_chunks]
        manga_futures = [executor.submit(fetch_manga_chunk, chunk) for chunk in manga_chunks]

        anime_results = [f.result() for f in anime_futures]
        manga_results = [f.result() for f in manga_futures]

    # Assemble anime map
    for data in anime_results:
        if isinstance(data, list):
            for a in data:
                anime_map[a["id"]] = a

    # Assemble manga map
    for data in manga_results:
        if isinstance(data, list):
            for m in data:
                manga_map[m["id"]] = m

    for rate in rates:
        t_id, t_type = rate.get("target_id"), rate.get("target_type")
        if t_type == "Anime" and t_id in anime_map:
            rate["target_data"] = anime_map[t_id]
        elif t_type == "Manga" and t_id in manga_map:
            rate["target_data"] = manga_map[t_id]

    logger.info("Loaded %d rates for user_id=%s (parallelized)", len(rates), user_id)
    _save_rates_to_db_and_mem(user_id, rates)
    return rates


@rates_bp.route("/api/tab/rates")
@api_route
def tab_rates():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    uid = str(user_id)
    now = time.time()

    # 1. Fast in-memory check (<0.1ms)
    mem = _rates_mem_cache.get(uid)
    if mem and now < mem["expires_at"]:
        return jsonify(mem["data"])

    # 2. Database check (<2ms)
    db_data, db_expires_at = _get_cached_rates_from_db(uid)
    if db_data is not None:
        _rates_mem_cache[uid] = {
            "data": db_data,
            "expires_at": db_expires_at
        }
        if now < db_expires_at:
            return jsonify(db_data)

        # Stale-While-Revalidate: Return stale data immediately and refresh asynchronously
        user_lock = _get_rates_lock(uid)
        def _bg_worker(h=dict(headers)):
            if user_lock.acquire(blocking=False):
                try:
                    logger.debug("Background refreshing stale rates for user=%s...", uid)
                    _fetch_fresh_rates_sync(uid, h)
                    logger.debug("Background rates refresh complete for user=%s.", uid)
                except Exception as exc:
                    logger.error("Background rates refresh failed: %s", exc)
                finally:
                    user_lock.release()

        threading.Thread(target=_bg_worker, daemon=True).start()
        logger.info("Serving stale rates feed (SWR) for user=%s while background refresh runs", uid)
        return jsonify(db_data)

    # 3. Cold start: fetch synchronously
    user_lock = _get_rates_lock(uid)
    with user_lock:
        mem = _rates_mem_cache.get(uid)
        if mem and now < mem["expires_at"]:
            return jsonify(mem["data"])
        rates = _fetch_fresh_rates_sync(uid, headers)
        return jsonify(rates)

@rates_bp.route("/api/grid-data")
@api_route
def grid_data():
    grid_type = request.args.get("type")
    raw_ids = request.args.get("ids", "")
    if not raw_ids:
        return jsonify([])

    ids_list = [i.strip() for i in raw_ids.split(",") if i.strip()]

    if grid_type == "animes":
        items_dict = {}
        for i in range(0, len(ids_list), 50):
            chunk = ids_list[i:i + 50]
            query = """
            query BatchAnimesGrid($ids: String!) {
              animes(ids: $ids, limit: 50) {
                id
                name
                russian
                kind
                score
                poster {
                  mainUrl
                  originalUrl
                }
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if data and isinstance(data.get("animes"), list):
                for item in data["animes"]:
                    p = item.get("poster") or {}
                    poster = p.get("mainUrl") or p.get("originalUrl") or ""
                    items_dict[str(item["id"])] = {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "russian": item.get("russian") or item.get("name"),
                        "kind": item.get("kind"),
                        "score": item.get("score"),
                        "image": fix_image_url(poster)
                    }
        logger.debug("Grid data loaded via GraphQL: type=animes, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])

    if grid_type == "characters":
        items_dict = {}
        for i in range(0, len(ids_list), 50):
            chunk = ids_list[i:i + 50]
            query = """
            query BatchCharsGrid($ids: String!) {
              characters(ids: $ids, limit: 50) {
                id
                name
                russian
                poster {
                  mainUrl
                  originalUrl
                }
                url
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=86400)
            if data and isinstance(data.get("characters"), list):
                for item in data["characters"]:
                    p = item.get("poster") or {}
                    poster = p.get("mainUrl") or p.get("originalUrl") or ""
                    items_dict[str(item["id"])] = {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "russian": item.get("russian") or item.get("name"),
                        "image": fix_image_url(poster),
                        "url": item.get("url") or f"/characters/{item.get('id')}"
                    }
        logger.debug("Grid data loaded via GraphQL: type=characters, count=%d", len(items_dict))
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

