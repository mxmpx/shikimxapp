import time
import json
import logging
import threading
from flask import Blueprint, jsonify
from database import get_connection
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    fetch_graphql
)
from concurrent.futures import ThreadPoolExecutor
from routes.news import parse_news_topic, parse_topic_item, news_bp
from routes.catalog import catalog_bp
from routes.calendar import calendar_bp
from routes.forum import forum_bp
from routes.search import search_bp
from errors import api_route

logger = logging.getLogger("shikimxapp.explore")
explore_bp = Blueprint('explore', __name__)

EXPLORE_FEED_CACHE_KEY = "explore:tab_feed_v2"
EXPLORE_FEED_TTL = 1800  # 30 minutes

_explore_lock = threading.Lock()
_explore_mem_cache = {
    "data": None,
    "expires_at": 0.0
}


def _get_cached_explore_from_db():
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (EXPLORE_FEED_CACHE_KEY,)
            ).fetchone()
            if row:
                return json.loads(row["data"]), float(row["expires_at"])
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading explore feed cache from DB: %s", exc)
    return None, 0.0


def _save_explore_to_db_and_mem(feed):
    now = time.time()
    expires_at = now + EXPLORE_FEED_TTL
    _explore_mem_cache["data"] = feed
    _explore_mem_cache["expires_at"] = expires_at
    try:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (EXPLORE_FEED_CACHE_KEY, json.dumps(feed), expires_at)
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error writing explore feed cache to DB: %s", exc)


def _fetch_explore_feed_raw():
    headers = {"User-Agent": APP_NAME}

    gql_query = """
    query HomeExploreData {
      on_screens: animes(status: "ongoing", order: popularity, limit: 16) {
        id
        name
        russian
        kind
        score
        studios { id name }
        poster { mainUrl originalUrl }
      }
      updates: animes(order: aired_on, limit: 16, kind: "tv,movie,ona,ova") {
        id
        name
        russian
        kind
        status
        rating
        airedOn { year }
        updatedAt
        poster { mainUrl originalUrl }
        genres { name russian }
      }
    }
    """

    urls = {
        "news": f"{SHIKIMORI_BASE}/api/topics?forum=news&page=1&limit=13",
        "collections": f"{SHIKIMORI_BASE}/api/topics?forum=collections&limit=6",
        "critiques": f"{SHIKIMORI_BASE}/api/topics?forum=critiques&limit=6",
        "articles": f"{SHIKIMORI_BASE}/api/topics?forum=articles&limit=6",
        "hot": f"{SHIKIMORI_BASE}/api/topics?forum=animanga&limit=8"
    }

    results = {}
    gql_data = {}

    def fetch_gql():
        return fetch_graphql(gql_query, ttl=1800) or {}

    def fetch_topic(key_url):
        key, url = key_url
        return key, fetch_cached_api(url, headers, ttl=1800)

    with ThreadPoolExecutor(max_workers=6) as executor:
        gql_future = executor.submit(fetch_gql)
        topic_futures = [executor.submit(fetch_topic, item) for item in urls.items()]

        try:
            gql_data = gql_future.result() or {}
        except Exception as exc:
            logger.warning("Explore GraphQL fetch failed: %s", exc)

        for f in topic_futures:
            try:
                k, data = f.result()
                results[k] = data if isinstance(data, list) else []
                if not isinstance(data, list):
                    logger.warning("Explore feed %s returned non-list", k)
            except Exception as exc:
                logger.warning("Explore topic fetch failed: %s", exc)

    on_screens = []
    for a in gql_data.get("on_screens", []) or []:
        p = a.get("poster") or {}
        poster = p.get("mainUrl") or p.get("originalUrl") or ""
        studios = ", ".join([s["name"] for s in a.get("studios", []) if s.get("name")])
        on_screens.append({
            "id": a.get("id"),
            "name": a.get("name"),
            "russian": a.get("russian") or a.get("name"),
            "image": fix_image_url(poster),
            "score": a.get("score"),
            "kind": (a.get("kind") or "").upper(),
            "studios": studios or "Студия не указана"
        })

    anime_updates = []
    for a in gql_data.get("updates", []) or []:
        p = a.get("poster") or {}
        poster = p.get("mainUrl") or p.get("originalUrl") or ""
        genres = [g.get("russian") or g.get("name") for g in a.get("genres", []) if g]
        anime_updates.append({
            "id": a.get("id"),
            "name": a.get("name"),
            "russian": a.get("russian") or a.get("name"),
            "image": fix_image_url(poster),
            "kind": (a.get("kind") or "").upper(),
            "status": a.get("status"),
            "rating": (a.get("rating") or "").upper(),
            "updated_at": a.get("updatedAt"),
            "genres": ", ".join(genres[:2]) if genres else ""
        })

    content_items = []
    for t in results.get("collections", []):
        content_items.append(parse_topic_item(t, "Коллекция"))
    for t in results.get("critiques", []):
        content_items.append(parse_topic_item(t, "Рецензия"))
    for t in results.get("articles", []):
        content_items.append(parse_topic_item(t, "Статья"))

    hot_items = [parse_topic_item(t, "Обсуждение Аниме") for t in results.get("hot", [])]

    news_topics = results.get("news", [])
    parsed_news = []
    for t in news_topics:
        item = parse_news_topic(t)
        if item:
            parsed_news.append(item)

    logger.info(
        "Explore feed loaded: on_screens=%d updates=%d content=%d hot=%d news=%d",
        len(on_screens), len(anime_updates), len(content_items), len(hot_items), len(parsed_news),
    )

    feed = {
        "on_screens": on_screens,
        "anime_updates": anime_updates,
        "content": content_items,
        "hot": hot_items,
        "latest": parsed_news[:3],
        "other": parsed_news[3:]
    }
    return feed


def _refresh_explore_feed_sync():
    feed = _fetch_explore_feed_raw()
    _save_explore_to_db_and_mem(feed)
    return feed


@explore_bp.route("/api/tab/explore")
@api_route
def tab_explore():
    now = time.time()

    if _explore_mem_cache["data"] and now < _explore_mem_cache["expires_at"]:
        return jsonify(_explore_mem_cache["data"])

    db_data, db_expires_at = _get_cached_explore_from_db()
    if db_data:
        _explore_mem_cache["data"] = db_data
        _explore_mem_cache["expires_at"] = db_expires_at

        if now < db_expires_at:
            return jsonify(db_data)

        def _bg_worker():
            if _explore_lock.acquire(blocking=False):
                try:
                    logger.debug("Background refreshing stale explore feed...")
                    _refresh_explore_feed_sync()
                    logger.debug("Background explore feed refresh complete.")
                except Exception as exc:
                    logger.error("Background explore feed refresh failed: %s", exc)
                finally:
                    _explore_lock.release()

        threading.Thread(target=_bg_worker, daemon=True).start()
        logger.info("Serving stale explore feed (SWR) while background refresh runs")
        return jsonify(db_data)

    with _explore_lock:
        if _explore_mem_cache["data"] and now < _explore_mem_cache["expires_at"]:
            return jsonify(_explore_mem_cache["data"])
        feed = _refresh_explore_feed_sync()
        return jsonify(feed)
