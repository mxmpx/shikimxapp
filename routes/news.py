import re
import logging
from flask import Blueprint, jsonify, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url
)
from errors import api_route

logger = logging.getLogger("shikimxapp.news")
news_bp = Blueprint('news', __name__)


def build_topic_url(t):
    url = t.get("url")
    if url:
        if url.startswith("http"):
            return url
        return f"{SHIKIMORI_BASE}{'' if url.startswith('/') else '/'}{url}"

    topic_id = t.get("id")
    if not topic_id:
        return SHIKIMORI_BASE

    forum_info = t.get("forum") or {}
    forum_name = (forum_info.get("name") or "") if isinstance(forum_info, dict) else ""

    forum_path = "animanga"
    if "collection" in forum_name:
        forum_path = "collections"
    elif "critique" in forum_name:
        forum_path = "critiques"
    elif "article" in forum_name:
        forum_path = "articles"
    elif "news" in forum_name:
        forum_path = "news"

    return f"{SHIKIMORI_BASE}/forum/{forum_path}/{topic_id}"


def parse_news_topic(t):
    title = t.get("topic_title") or t.get("title") or ""
    href = build_topic_url(t)
    created_at = t.get("created_at", "")[:10] if t.get("created_at") else ""
    author = (t.get("user") or {}).get("nickname", "")
    topic_id = t.get("id")
    comments_count = t.get("comments_count", 0)

    img_src = ""
    is_youtube = False
    linked = t.get("linked")
    linked_anime_id = None
    if linked and isinstance(linked, dict):
        if linked.get("type") == "Anime":
            linked_anime_id = linked.get("id")
        if linked.get("image"):
            img_dict = linked.get("image")
            if isinstance(img_dict, dict):
                candidate = img_dict.get("original") or img_dict.get("preview") or ""
                if candidate and "missing" not in candidate:
                    img_src = candidate

    all_text = (t.get("html_body") or "") + " " + (t.get("html_footer") or "") + " " + (t.get("body") or "")
    if not img_src:
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', all_text)
        if img_match:
            candidate = img_match.group(1)
            if "missing" not in candidate:
                img_src = candidate

    yt_match = re.search(r'youtube\.com/vi/([^/]+)', all_text) or re.search(r'youtu\.be/([a-zA-Z0-9_\-]+)', all_text)
    if yt_match:
        is_youtube = True
        if not img_src:
            img_src = f"https://img.youtube.com/vi/{yt_match.group(1)}/hqdefault.jpg"

    if img_src:
        if "missing" in img_src:
            img_src = ""
        else:
            if img_src.startswith("//"):
                img_src = "https:" + img_src
            elif not img_src.startswith("http"):
                img_src = f"{SHIKIMORI_BASE}" + ("" if img_src.startswith("/") else "/") + img_src

            img_src = re.sub(r'/(preview|x64|x32|x96|x148|x160)/', '/original/', img_src)

    cached_img = f"/cache/img?url={img_src}" if img_src else ""

    tags = ["Аниме"]
    title_lower = title.lower()
    if "трейлер" in title_lower or "тизер" in title_lower or "pv" in title_lower or is_youtube:
        tags.append("Трейлер")
    elif "постер" in title_lower or "визуал" in title_lower:
        tags.append("Постер")
    elif "дата" in title_lower or "премьера" in title_lower:
        tags.append("Премьера")
    tags.append("Новость")

    if title and href:
        return {
            "id": topic_id,
            "title": title,
            "url": href,
            "image": cached_img,
            "author": author,
            "date": created_at,
            "tags": tags,
            "comments_count": comments_count,
            "is_youtube": is_youtube,
            "linked_anime_id": linked_anime_id
        }
    return None


def parse_topic_item(t, default_tag=""):
    title = t.get("topic_title") or t.get("title") or ""
    topic_id = t.get("id")
    forum = (t.get("forum") or {}).get("name") or "" if isinstance(t.get("forum"), dict) else ""

    tag_name = default_tag
    if "collection" in forum:
        tag_name = "Коллекция"
    elif "critique" in forum:
        tag_name = "Рецензия"
    elif "article" in forum:
        tag_name = "Статья"
    elif "news" in forum:
        tag_name = "Новость"

    return {
        "id": topic_id,
        "title": title,
        "url": build_topic_url(t),
        "comments_count": t.get("comments_count", 0),
        "tag": tag_name,
        "author": (t.get("user") or {}).get("nickname", ""),
        "date": t.get("created_at", "")[:10] if t.get("created_at") else ""
    }


@news_bp.route("/api/news")
@api_route
def get_news():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)
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


@news_bp.route("/api/critiques/catalog")
@api_route
def get_critiques_catalog():
    """Get critiques and reviews from topics with continuous multi-page support."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 30))

    headers = {"User-Agent": APP_NAME}
    data = []

    if page == 1:
        crit_url = f"{SHIKIMORI_BASE}/api/topics?forum=critiques&page=1&limit={limit}"
        crit_data = fetch_cached_api(crit_url, headers, ttl=1800) or []
        if isinstance(crit_data, list):
            data.extend(crit_data)

        existing_ids = {t.get("id") for t in data}
        animanga_url = f"{SHIKIMORI_BASE}/api/topics?forum=animanga&page=1&limit={limit}"
        ani_data = fetch_cached_api(animanga_url, headers, ttl=1800) or []
        if isinstance(ani_data, list):
            for t in ani_data:
                if t.get("id") not in existing_ids:
                    data.append(t)
    else:
        animanga_url = f"{SHIKIMORI_BASE}/api/topics?forum=animanga&page={page}&limit={limit}"
        ani_data = fetch_cached_api(animanga_url, headers, ttl=1800) or []
        if isinstance(ani_data, list):
            data = ani_data

    results = []
    seen_ids = set()
    for t in data:
        tid = t.get("id")
        if tid in seen_ids:
            continue
        seen_ids.add(tid)
        parsed = parse_news_topic(t)
        if not parsed:
            continue
        body_text = re.sub(r'<[^>]+>', ' ', t.get("html_body") or t.get("body") or "")[:260].strip()
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


@news_bp.route("/api/articles/catalog")
@api_route
def get_articles_catalog():
    """Get articles from topics with multi-page support."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 30))

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
            tid = t.get("id")
            if tid in seen_ids:
                continue
            seen_ids.add(tid)
            parsed = parse_news_topic(t)
            if not parsed:
                continue
            body_text = re.sub(r'<[^>]+>', ' ', t.get("html_body") or t.get("body") or "")[:200].strip()
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
