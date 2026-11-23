import logging
from flask import Blueprint, jsonify, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, build_topic_url,
    parse_news_topic, parse_topic_item, strip_html_tags
)
from errors import api_route

logger = logging.getLogger("shikimxapp.news")
news_bp = Blueprint('news', __name__)


@news_bp.route("/api/news", methods=["GET"])
@api_route
def get_news():
    page = max(1, request.args.get("page", 1, type=int) or 1)
    limit = max(1, min(request.args.get("limit", 10, type=int) or 10, 50))
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/topics?forum=news&page={page}&limit={limit}"

    topics = fetch_cached_api(url, headers, ttl=900) or []
    if not isinstance(topics, list):
        logger.warning("News API returned non-list for page=%s", page)
        return jsonify([])

    items = []
    for t in topics:
        item = parse_news_topic(t)
        if item:
            items.append(item)

    logger.debug("News page=%s limit=%s returned %d items", page, limit, len(items))
    return jsonify(items)


@news_bp.route("/api/critiques/catalog", methods=["GET"])
@api_route
def get_critiques_catalog():
    """Get critiques and reviews from topics with continuous multi-page support."""
    page = max(1, request.args.get("page", 1, type=int) or 1)
    limit = max(1, min(request.args.get("limit", 30, type=int) or 30, 60))

    headers = {"User-Agent": APP_NAME}
    data = []

    # Always fetch reviews and critiques for the requested page
    crit_url = f"{SHIKIMORI_BASE}/api/topics?forum=critiques&page={page}&limit={limit}"
    crit_data = fetch_cached_api(crit_url, headers, ttl=1800) or []
    if isinstance(crit_data, list):
        data.extend(crit_data)

    # If critiques don't fully saturate the requested limit, supplement with animanga
    if len(data) < limit:
        needed = limit - len(data)
        existing_ids = {t.get("id") for t in data if isinstance(t, dict)}
        animanga_url = f"{SHIKIMORI_BASE}/api/topics?forum=animanga&page={page}&limit={needed}"
        ani_data = fetch_cached_api(animanga_url, headers, ttl=1800) or []
        if isinstance(ani_data, list):
            for t in ani_data:
                if t.get("id") not in existing_ids:
                    data.append(t)

    results = []
    seen_ids = set()
    for t in data:
        if not isinstance(t, dict):
            continue
        tid = t.get("id")
        if not tid or tid in seen_ids:
            continue
        seen_ids.add(tid)
        parsed = parse_news_topic(t)
        if not parsed:
            continue
        body_text = strip_html_tags(t.get("html_body") or t.get("body") or "", max_length=260)
        results.append({
            "id": tid,
            "title": parsed["title"],
            "url": parsed["url"],
            "image": parsed["image"],
            "author": parsed["author"],
            "comments_count": parsed["comments_count"],
            "date": parsed["date"],
            "snippet": body_text,
            "linked": t.get("linked")
        })

    return jsonify(results)


@news_bp.route("/api/articles/catalog", methods=["GET"])
@api_route
def get_articles_catalog():
    """Get articles from topics with multi-page support."""
    page = max(1, request.args.get("page", 1, type=int) or 1)
    limit = max(1, min(request.args.get("limit", 30, type=int) or 30, 60))

    headers = {"User-Agent": APP_NAME}
    if limit > 30:
        url1 = f"{SHIKIMORI_BASE}/api/topics?forum=articles&page={(page - 1) * 2 + 1}&limit=30"
        url2 = f"{SHIKIMORI_BASE}/api/topics?forum=articles&page={(page - 1) * 2 + 2}&limit=30"
        r1 = fetch_cached_api(url1, headers, ttl=1800) or []
        r2 = fetch_cached_api(url2, headers, ttl=1800) or []
        data = (r1 if isinstance(r1, list) else []) + (r2 if isinstance(r2, list) else [])
    else:
        url = f"{SHIKIMORI_BASE}/api/topics?forum=articles&page={page}&limit={limit}"
        data = fetch_cached_api(url, headers, ttl=1800) or []

    results = []
    seen_ids = set()
    if isinstance(data, list):
        for t in data:
            if not isinstance(t, dict):
                continue
            tid = t.get("id")
            if not tid or tid in seen_ids:
                continue
            seen_ids.add(tid)
            parsed = parse_news_topic(t)
            if not parsed:
                continue
            body_text = strip_html_tags(t.get("html_body") or t.get("body") or "", max_length=200)
            results.append({
                "id": tid,
                "title": parsed["title"],
                "url": parsed["url"],
                "image": parsed["image"],
                "author": parsed["author"],
                "comments_count": parsed["comments_count"],
                "date": parsed["date"],
                "snippet": body_text
            })

    return jsonify(results)
