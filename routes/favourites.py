import time
import json
import logging
import threading
import requests
from flask import Blueprint, session, jsonify
from database import get_connection
from utils import (
    SHIKIMORI_BASE, get_auth_headers, fetch_cached_api,
    fetch_graphql, fix_image_url
)
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.favourites")
favourites_bp = Blueprint('favourites', __name__)

FAVOURITES_CACHE_TTL = 3600  # 1 hour

_favs_locks = {}
_favs_locks_guard = threading.Lock()
_favs_mem_cache = {}  # user_id -> {"data": {...}, "expires_at": float}


def _get_favs_lock(user_id):
    with _favs_locks_guard:
        if user_id not in _favs_locks:
            _favs_locks[user_id] = threading.Lock()
        return _favs_locks[user_id]


def _get_cached_favs_from_db(user_id):
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (f"favourites:user_{user_id}",)
            ).fetchone()
            if row:
                return json.loads(row["data"]), float(row["expires_at"])
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading favourites cache from DB: %s", exc)
    return None, 0.0


def _save_favs_to_db_and_mem(user_id, favs_data):
    now = time.time()
    expires_at = now + FAVOURITES_CACHE_TTL
    uid = str(user_id)
    _favs_mem_cache[uid] = {
        "data": favs_data,
        "expires_at": expires_at
    }
    try:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (f"favourites:user_{uid}", json.dumps(favs_data), expires_at)
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error writing favourites cache to DB: %s", exc)


def _enrich_anime_chunk(animes):
    if not isinstance(animes, list) or not animes:
        return
    anime_ids = [str(x["id"]) for x in animes if isinstance(x, dict) and x.get("id")]
    for i in range(0, len(anime_ids), 50):
        chunk = anime_ids[i:i + 50]
        query = """
        query FavAnimes($ids: String!) {
          animes(ids: $ids, limit: 50) {
            id
            name
            russian
            poster { mainUrl originalUrl }
            url
          }
        }
        """
        data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
        if data and isinstance(data.get("animes"), list):
            item_map = {str(a["id"]): a for a in data["animes"]}
            for item in animes:
                aid = str(item.get("id"))
                if aid in item_map:
                    t = item_map[aid]
                    p = t.get("poster") or {}
                    item["image"] = fix_image_url(p.get("mainUrl") or p.get("originalUrl"))
                    item["url"] = t.get("url") or f"/animes/{aid}"
                    item["russian"] = t.get("russian") or item.get("russian")


def _enrich_manga_chunk(mangas):
    if not isinstance(mangas, list) or not mangas:
        return
    manga_ids = [str(x["id"]) for x in mangas if isinstance(x, dict) and x.get("id")]
    for i in range(0, len(manga_ids), 50):
        chunk = manga_ids[i:i + 50]
        query = """
        query FavMangas($ids: String!) {
          mangas(ids: $ids, limit: 50) {
            id
            name
            russian
            poster { mainUrl originalUrl }
            url
          }
        }
        """
        data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
        if data and isinstance(data.get("mangas"), list):
            item_map = {str(m["id"]): m for m in data["mangas"]}
            for item in mangas:
                mid = str(item.get("id"))
                if mid in item_map:
                    t = item_map[mid]
                    p = t.get("poster") or {}
                    item["image"] = fix_image_url(p.get("mainUrl") or p.get("originalUrl"))
                    item["url"] = t.get("url") or f"/mangas/{mid}"
                    item["russian"] = t.get("russian") or item.get("russian")


def _enrich_char_chunk(chars):
    if not isinstance(chars, list) or not chars:
        return
    char_ids = [str(c["id"]) for c in chars if isinstance(c, dict) and c.get("id")]
    for i in range(0, len(char_ids), 50):
        chunk = char_ids[i:i + 50]
        query = """
        query FavChars($ids: String!) {
          characters(ids: $ids, limit: 50) {
            id
            name
            russian
            poster { mainUrl originalUrl }
            url
          }
        }
        """
        data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=86400)
        if data and isinstance(data.get("characters"), list):
            char_map = {str(c["id"]): c for c in data["characters"]}
            for c in chars:
                cid = str(c.get("id"))
                if cid in char_map:
                    t = char_map[cid]
                    p = t.get("poster") or {}
                    c["image"] = fix_image_url(p.get("mainUrl") or p.get("originalUrl"))
                    c["url"] = t.get("url") or f"/characters/{cid}"
                    c["russian"] = t.get("russian") or c.get("russian")


def enrich_favourites(favs, headers):
    if not isinstance(favs, dict):
        return {"characters": [], "animes": [], "mangas": []}

    animes = favs.get("animes", [])
    mangas = favs.get("mangas", [])
    chars = favs.get("characters", [])

    # Parallelize enrichment across categories
    with ThreadPoolExecutor(max_workers=3) as executor:
        f_anime = executor.submit(_enrich_anime_chunk, animes)
        f_manga = executor.submit(_enrich_manga_chunk, mangas)
        f_chars = executor.submit(_enrich_char_chunk, chars)

        f_anime.result()
        f_manga.result()
        f_chars.result()

    return favs


def _fetch_fresh_favourites_sync(user_id, headers):
    try:
        r = requests.get(f"{SHIKIMORI_BASE}/api/users/{user_id}/favourites", headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Failed to fetch favourites: %s", exc)
        raise AppError("Не удалось загрузить избранное", 502, logging.ERROR)

    if r.status_code == 200 and isinstance(r.json(), dict):
        favs = enrich_favourites(r.json(), headers)
        logger.info("Favourites loaded and enriched for user_id=%s", user_id)
        _save_favs_to_db_and_mem(user_id, favs)
        return favs

    logger.warning("Favourites API returned %s for user_id=%s", r.status_code, user_id)
    empty = {"characters": [], "animes": [], "mangas": []}
    _save_favs_to_db_and_mem(user_id, empty)
    return empty


@favourites_bp.route("/api/tab/favourites")
@api_route
def tab_favourites():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    uid = str(user_id)
    now = time.time()

    # 1. Fast in-memory check (<0.1ms)
    mem = _favs_mem_cache.get(uid)
    if mem and now < mem["expires_at"]:
        return jsonify(mem["data"])

    # 2. Database check (<2ms)
    db_data, db_expires_at = _get_cached_favs_from_db(uid)
    if db_data is not None:
        _favs_mem_cache[uid] = {
            "data": db_data,
            "expires_at": db_expires_at
        }
        if now < db_expires_at:
            return jsonify(db_data)

        # Stale-While-Revalidate: Return stale DB data immediately and refresh asynchronously
        user_lock = _get_favs_lock(uid)
        def _bg_worker(h=dict(headers)):
            if user_lock.acquire(blocking=False):
                try:
                    logger.debug("Background refreshing stale favourites for user=%s...", uid)
                    _fetch_fresh_favourites_sync(uid, h)
                    logger.debug("Background favourites refresh complete for user=%s.", uid)
                except Exception as exc:
                    logger.error("Background favourites refresh failed: %s", exc)
                finally:
                    user_lock.release()

        threading.Thread(target=_bg_worker, daemon=True).start()
        logger.info("Serving stale favourites feed (SWR) for user=%s while background refresh runs", uid)
        return jsonify(db_data)

    # 3. Cold start: fetch synchronously
    user_lock = _get_favs_lock(uid)
    with user_lock:
        mem = _favs_mem_cache.get(uid)
        if mem and now < mem["expires_at"]:
            return jsonify(mem["data"])
        favs = _fetch_fresh_favourites_sync(uid, headers)
        return jsonify(favs)
