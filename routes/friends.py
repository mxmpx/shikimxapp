import time
import json
import logging
import threading
import requests
from flask import Blueprint, session, jsonify
from database import get_connection
from utils import SHIKIMORI_BASE, APP_NAME, get_auth_headers, fetch_cached_api, fix_image_url
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.friends")
friends_bp = Blueprint('friends', __name__)

FRIENDS_CACHE_TTL = 900  # 15 minutes

_friends_locks = {}
_friends_locks_guard = threading.Lock()
_friends_mem_cache = {}  # user_id -> {"data": {...}, "expires_at": float}


def _get_friends_lock(user_id):
    with _friends_locks_guard:
        if user_id not in _friends_locks:
            _friends_locks[user_id] = threading.Lock()
        return _friends_locks[user_id]


def _get_cached_friends_from_db(user_id):
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (f"friends:user_{user_id}",)
            ).fetchone()
            if row:
                return json.loads(row["data"]), float(row["expires_at"])
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading friends cache from DB: %s", exc)
    return None, 0.0


def _save_friends_to_db_and_mem(user_id, data):
    now = time.time()
    expires_at = now + FRIENDS_CACHE_TTL
    uid = str(user_id)
    _friends_mem_cache[uid] = {
        "data": data,
        "expires_at": expires_at
    }
    try:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (f"friends:user_{uid}", json.dumps(data), expires_at)
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error writing friends cache to DB: %s", exc)


def _fetch_fresh_friends_sync(user_id, headers):
    friends_url = f"{SHIKIMORI_BASE}/api/users/{user_id}/friends"
    clubs_url = f"{SHIKIMORI_BASE}/api/users/{user_id}/clubs"

    with ThreadPoolExecutor(max_workers=2) as executor:
        f_friends = executor.submit(fetch_cached_api, friends_url, headers, ttl=FRIENDS_CACHE_TTL)
        f_clubs = executor.submit(fetch_cached_api, clubs_url, headers, ttl=FRIENDS_CACHE_TTL)

        friends_data = f_friends.result()
        clubs_data = f_clubs.result()

    friends = friends_data if isinstance(friends_data, list) else []
    clubs = clubs_data if isinstance(clubs_data, list) else []

    payload = {"friends": friends, "clubs": clubs}
    logger.debug("Friends loaded: user_id=%s friends=%d clubs=%d (parallel)", user_id, len(friends), len(clubs))
    _save_friends_to_db_and_mem(user_id, payload)
    return payload


@friends_bp.route("/api/tab/friends")
@api_route
def tab_friends():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    uid = str(user_id)
    now = time.time()

    # 1. Fast in-memory check (<0.1ms)
    mem = _friends_mem_cache.get(uid)
    if mem and now < mem["expires_at"]:
        return jsonify(mem["data"])

    # 2. Database check (<2ms)
    db_data, db_expires_at = _get_cached_friends_from_db(uid)
    if db_data is not None:
        _friends_mem_cache[uid] = {
            "data": db_data,
            "expires_at": db_expires_at
        }
        if now < db_expires_at:
            return jsonify(db_data)

        # Stale-While-Revalidate: Return stale data immediately and refresh in background
        user_lock = _get_friends_lock(uid)
        def _bg_worker(h=dict(headers)):
            if user_lock.acquire(blocking=False):
                try:
                    logger.debug("Background refreshing stale friends for user=%s...", uid)
                    _fetch_fresh_friends_sync(uid, h)
                    logger.debug("Background friends refresh complete for user=%s.", uid)
                except Exception as exc:
                    logger.error("Background friends refresh failed: %s", exc)
                finally:
                    user_lock.release()

        threading.Thread(target=_bg_worker, daemon=True).start()
        logger.info("Serving stale friends feed (SWR) for user=%s while background refresh runs", uid)
        return jsonify(db_data)

    # 3. Cold start: fetch synchronously
    user_lock = _get_friends_lock(uid)
    with user_lock:
        mem = _friends_mem_cache.get(uid)
        if mem and now < mem["expires_at"]:
            return jsonify(mem["data"])
        data = _fetch_fresh_friends_sync(uid, headers)
        return jsonify(data)


@friends_bp.route("/api/friend/<user_id>")
@friends_bp.route("/api/user_info/<user_id>")
@api_route
def get_friend_details(user_id):
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/users/{user_id}"

    data = fetch_cached_api(url, headers, ttl=1800)
    if not data or not isinstance(data, dict):
        logger.warning("User data unavailable for user_id=%s", user_id)
        raise AppError("Не удалось получить данные пользователя", 502)

    avatar = fix_image_url(data.get("image"))

    stats = data.get("stats") or {}
    statuses = stats.get("statuses") or {}
    anime_stats = statuses.get("anime") or []
    manga_stats = statuses.get("manga") or []

    completed_anime = next((s.get("size") for s in anime_stats if s.get("name") == "completed"), 0)
    watching_anime = next((s.get("size") for s in anime_stats if s.get("name") == "watching"), 0)
    planned_anime = next((s.get("size") for s in anime_stats if s.get("name") == "planned"), 0)
    on_hold_anime = next((s.get("size") for s in anime_stats if s.get("name") == "on_hold"), 0)
    dropped_anime = next((s.get("size") for s in anime_stats if s.get("name") == "dropped"), 0)

    completed_manga = next((s.get("size") for s in manga_stats if s.get("name") == "completed"), 0)
    reading_manga = next((s.get("size") for s in manga_stats if s.get("name") == "watching"), 0)
    planned_manga = next((s.get("size") for s in manga_stats if s.get("name") == "planned"), 0)
    on_hold_manga = next((s.get("size") for s in manga_stats if s.get("name") == "on_hold"), 0)
    dropped_manga = next((s.get("size") for s in manga_stats if s.get("name") == "dropped"), 0)

    sex_map = {"male": "Мужской", "female": "Женский"}
    sex = sex_map.get(data.get("sex"), data.get("sex") or "—")

    logger.debug("Friend profile loaded: user_id=%s nickname=%s", user_id, data.get("nickname"))
    return jsonify({
        "id": data.get("id"),
        "nickname": data.get("nickname"),
        "name": data.get("name") or data.get("nickname"),
        "image": avatar,
        "last_online_at": (data.get("last_online_at") or "")[:10],
        "sex": sex,
        "age": data.get("full_years") or "—",
        "completed_anime": completed_anime,
        "watching_anime": watching_anime,
        "planned_anime": planned_anime,
        "on_hold_anime": on_hold_anime,
        "dropped_anime": dropped_anime,
        "completed_manga": completed_manga,
        "reading_manga": reading_manga,
        "planned_manga": planned_manga,
        "on_hold_manga": on_hold_manga,
        "dropped_manga": dropped_manga,
        "about": data.get("about") or "Информация о себе не заполнена.",
        "shikimori_url": f"{SHIKIMORI_BASE}/{data.get('nickname')}" if data.get('nickname') else ""
    })
