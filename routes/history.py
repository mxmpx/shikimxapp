import time
import logging
from flask import Blueprint, session, jsonify
from utils import (
    SHIKIMORI_BASE, get_auth_headers, fetch_cached_api,
    fetch_graphql, fix_image_url
)
from services.tiered_cache import TieredCache
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.history")
history_bp = Blueprint('history', __name__)

HISTORY_CACHE_TTL = 900  # 15 minutes
_history_tiered_cache = TieredCache(name="history", memory_ttl=HISTORY_CACHE_TTL, max_workers=2)


def invalidate_user_history_cache(user_id=None):
    """Clear memory and DB cache for user history."""
    if user_id is None:
        user_id = session.get("user_id")
    if not user_id:
        return
    _history_tiered_cache.invalidate(f"history:user_{user_id}")


def enrich_history(history_items):
    if not isinstance(history_items, list) or not history_items:
        return history_items

    anime_ids = []
    manga_ids = []
    for item in history_items:
        if isinstance(item, dict):
            target = item.get("target") or {}
            tid = target.get("id")
            if tid:
                ttype = (item.get("target_type") or target.get("type") or target.get("target_type") or "").lower()
                if "manga" in ttype or "ranobe" in ttype:
                    manga_ids.append(str(tid))
                else:
                    anime_ids.append(str(tid))

    anime_map = {}
    for i in range(0, len(anime_ids), 50):
        chunk = anime_ids[i:i + 50]
        query = """
        query HistoryAnimePosters($ids: String!) {
          animes(ids: $ids, limit: 50) {
            id
            russian
            name
            poster {
              mainUrl
              originalUrl
            }
          }
        }
        """
        try:
            gql_res = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if gql_res and isinstance(gql_res.get("animes"), list):
                for a in gql_res["animes"]:
                    anime_map[str(a["id"])] = a
        except Exception as exc:
            logger.debug("Failed resolving GraphQL anime history posters: %s", exc)

    manga_map = {}
    for i in range(0, len(manga_ids), 50):
        chunk = manga_ids[i:i + 50]
        query = """
        query HistoryMangaPosters($ids: String!) {
          mangas(ids: $ids, limit: 50) {
            id
            russian
            name
            poster {
              mainUrl
              originalUrl
            }
          }
        }
        """
        try:
            gql_res = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if gql_res and isinstance(gql_res.get("mangas"), list):
                for m in gql_res["mangas"]:
                    manga_map[str(m["id"])] = m
        except Exception as exc:
            logger.debug("Failed resolving GraphQL manga history posters: %s", exc)

    for item in history_items:
        if not isinstance(item, dict):
            continue
        target = item.get("target") or {}
        tid = str(target.get("id"))
        extra = anime_map.get(tid) or manga_map.get(tid)
        if extra:
            if extra.get("russian"):
                target["russian"] = extra["russian"]
            p = extra.get("poster")
            if p:
                img_url = p.get("mainUrl") or p.get("originalUrl")
                if img_url:
                    target["image_url"] = fix_image_url(img_url)

        if not target.get("image_url") and target.get("image"):
            target["image_url"] = fix_image_url(target.get("image"))

    return history_items


def _fetch_fresh_history_sync(user_id, headers):
    url = f"{SHIKIMORI_BASE}/api/users/{user_id}/history?limit=40"
    history_data = fetch_cached_api(url, headers, ttl=HISTORY_CACHE_TTL)
    history = history_data if isinstance(history_data, list) else []
    return enrich_history(history)


@history_bp.route("/api/tab/history", methods=["GET"])
@history_bp.route("/api/history", methods=["GET"])
@api_route
def tab_history():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401, log_level=logging.INFO)

    uid = str(user_id)
    cache_key = f"history:user_{uid}"

    def fetch_fn():
        return _fetch_fresh_history_sync(uid, headers)

    data = _history_tiered_cache.get_or_fetch(
        cache_key,
        fetch_fn=fetch_fn,
        ttl=HISTORY_CACHE_TTL,
        background_refresh=True
    )

    return jsonify(data or [])
