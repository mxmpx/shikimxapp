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
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.history")
history_bp = Blueprint('history', __name__)

HISTORY_CACHE_TTL = 900  # 15 minutes

_history_locks = {}
_history_locks_guard = threading.Lock()
_history_mem_cache = {}  # user_id -> {"data": [...], "expires_at": float}


def _get_user_lock(user_id):
    with _history_locks_guard:
        if user_id not in _history_locks:
            _history_locks[user_id] = threading.Lock()
        return _history_locks[user_id]


def invalidate_user_history_cache(user_id=None):
    """Clear memory and DB cache for user history."""
    if user_id is None:
        user_id = session.get("user_id")
    if not user_id:
        return
    uid = str(user_id)
    _history_mem_cache.pop(uid, None)
    try:
        conn = get_connection()
        try:
            conn.execute("DELETE FROM api_cache WHERE url = ?", (f"history:user_{uid}",))
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error invalidating history cache from DB: %s", exc)


def _get_cached_history_from_db(user_id):
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (f"history:user_{user_id}",)
            ).fetchone()
            if row:
                return json.loads(row["data"]), float(row["expires_at"])
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading history cache from DB: %s", exc)
    return None, 0.0


def _save_history_to_db_and_mem(user_id, history_items):
    now = time.time()
    expires_at = now + HISTORY_CACHE_TTL
    uid = str(user_id)
    _history_mem_cache[uid] = {
        "data": history_items,
        "expires_at": expires_at
    }
    try:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (f"history:user_{uid}", json.dumps(history_items), expires_at)
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error writing history cache to DB: %s", exc)


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


def _fetch_fresh_history_sync(user_id, headers):
    url = f"{SHIKIMORI_BASE}/api/users/{user_id}/history?limit=40"
    history_data = fetch_cached_api(url, headers, ttl=HISTORY_CACHE_TTL)
    history = history_data if isinstance(history_data, list) else []
    enriched = enrich_history(history)
    _save_history_to_db_and_mem(user_id, enriched)
    return enriched


@history_bp.route("/api/tab/history")
@history_bp.route("/api/history")
@api_route
def tab_history():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    uid = str(user_id)
    now = time.time()

    # 1. Fast in-memory check (<0.1ms)
    mem = _history_mem_cache.get(uid)
    if mem and now < mem["expires_at"]:
        return jsonify(mem["data"])

    # 2. Database check (<2ms)
    db_data, db_expires_at = _get_cached_history_from_db(uid)
    if db_data is not None:
        _history_mem_cache[uid] = {
            "data": db_data,
            "expires_at": db_expires_at
        }
        if now < db_expires_at:
            return jsonify(db_data)

        # Stale-While-Revalidate: Return stale DB data immediately and refresh asynchronously
        user_lock = _get_user_lock(uid)
        def _bg_worker(h=dict(headers)):
            if user_lock.acquire(blocking=False):
                try:
                    logger.debug("Background refreshing stale history for user=%s...", uid)
                    _fetch_fresh_history_sync(uid, h)
                    logger.debug("Background history refresh complete for user=%s.", uid)
                except Exception as exc:
                    logger.error("Background history refresh failed: %s", exc)
                finally:
                    user_lock.release()

        threading.Thread(target=_bg_worker, daemon=True).start()
        logger.info("Serving stale history feed (SWR) for user=%s while background refresh runs", uid)
        return jsonify(db_data)

    # 3. Cold start: fetch synchronously
    user_lock = _get_user_lock(uid)
    with user_lock:
        mem = _history_mem_cache.get(uid)
        if mem and now < mem["expires_at"]:
            return jsonify(mem["data"])
        enriched = _fetch_fresh_history_sync(uid, headers)
        logger.debug("Loaded %d enriched history items for user_id=%s", len(enriched), uid)
        return jsonify(enriched)
