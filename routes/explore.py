import re
import logging
import requests
from flask import Blueprint, jsonify, request
from utils import SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.explore")
explore_bp = Blueprint('explore', __name__)

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
    forum_name = forum_info.get("name") if isinstance(forum_info, dict) else ""

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

    img_src = ""
    linked = t.get("linked")
    if linked and isinstance(linked, dict) and linked.get("image"):
        img_dict = linked.get("image")
        if isinstance(img_dict, dict):
            candidate = img_dict.get("original") or img_dict.get("preview") or ""
            if candidate and "missing" not in candidate:
                img_src = candidate

    if not img_src:
        html_content = (t.get("html_body") or "") + " " + (t.get("html_footer") or "")
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html_content)
        if img_match:
            candidate = img_match.group(1)
            if "missing" not in candidate:
                img_src = candidate

    if not img_src:
        all_text = (t.get("html_body") or "") + " " + (t.get("html_footer") or "") + " " + (t.get("body") or "")
        yt_match = re.search(r'youtube\.com/vi/([^/]+)', all_text)
        if yt_match:
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

    if title and href:
        return {
            "id": topic_id,
            "title": title, "url": href, "image": cached_img,
            "author": author, "date": created_at, "tags": ["Новость"]
        }
    return None

@explore_bp.route("/api/search")
@api_route
def search():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify([])

    headers = {"User-Agent": APP_NAME}
    anime_url = f"{SHIKIMORI_BASE}/api/animes?search={requests.utils.quote(q)}&limit=8"
    manga_url = f"{SHIKIMORI_BASE}/api/mangas?search={requests.utils.quote(q)}&limit=8"

    anime_data = fetch_cached_api(anime_url, headers, ttl=300) or []
    manga_data = fetch_cached_api(manga_url, headers, ttl=300) or []

    combined = []
    if isinstance(anime_data, list):
        for item in anime_data:
            item["content_type"] = "anime"
            combined.append(item)
    if isinstance(manga_data, list):
        for item in manga_data:
            item["content_type"] = "manga"
            combined.append(item)

    formatted = []
    for item in combined:
        genres = [g.get("russian") or g.get("name") for g in item.get("genres", [])]
        formatted.append({
            "id": item.get("id"),
            "content_type": item.get("content_type"),
            "name": item.get("name", ""),
            "russian": item.get("russian") or item.get("name", ""),
            "kind": (item.get("kind") or "").upper(),
            "year": (item.get("aired_on") or "")[:4],
            "status": item.get("status", ""),
            "genres": genres,
            "image": fix_image_url(item.get("image")),
            "url": f"https://shikimori.io{item.get('url')}" if item.get("url") else f"https://shikimori.io/{item.get('content_type')}s/{item.get('id')}"
        })

    logger.debug("Search q=%r returned %d results", q, len(formatted))
    return jsonify(formatted)

@explore_bp.route("/api/news")
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

def parse_topic_item(t, default_tag=""):
    title = t.get("topic_title") or t.get("title") or ""
    topic_id = t.get("id")
    forum = (t.get("forum") or {}).get("name") or "" if isinstance(t.get("forum"), dict) else ""
    
    tag_name = default_tag
    if "collection" in forum: tag_name = "Коллекция"
    elif "critique" in forum: tag_name = "Рецензия"
    elif "article" in forum: tag_name = "Статья"
    elif "news" in forum: tag_name = "Новость"

    return {
        "id": topic_id,
        "title": title,
        "url": build_topic_url(t),
        "comments_count": t.get("comments_count", 0),
        "tag": tag_name,
        "author": (t.get("user") or {}).get("nickname", ""),
        "date": t.get("created_at", "")[:10] if t.get("created_at") else ""
    }

@explore_bp.route("/api/tab/explore")
@api_route
def tab_explore():
    headers = {"User-Agent": APP_NAME}
    
    urls = {
        "news": f"{SHIKIMORI_BASE}/api/topics?forum=news&page=1&limit=13",
        "collections": f"{SHIKIMORI_BASE}/api/topics?forum=collections&limit=4",
        "critiques": f"{SHIKIMORI_BASE}/api/topics?forum=critiques&limit=4",
        "articles": f"{SHIKIMORI_BASE}/api/topics?forum=articles&limit=4",
        "hot": f"{SHIKIMORI_BASE}/api/topics?forum=animanga&limit=8"
    }

    results = {}
    def fetch_url(key_url):
        key, url = key_url
        return key, fetch_cached_api(url, headers, ttl=900)

    with ThreadPoolExecutor(max_workers=5) as executor:
        for k, data in executor.map(fetch_url, urls.items()):
            results[k] = data if isinstance(data, list) else []
            if not isinstance(data, list):
                logger.warning("Explore feed %s returned non-list", k)

    content_items = []
    for t in results.get("collections", []): content_items.append(parse_topic_item(t, "Коллекция"))
    for t in results.get("critiques", []): content_items.append(parse_topic_item(t, "Рецензия"))
    for t in results.get("articles", []): content_items.append(parse_topic_item(t, "Статья"))

    hot_items = [parse_topic_item(t, "Обсуждение") for t in results.get("hot", [])]

    news_topics = results.get("news", [])
    parsed_news = []
    for t in news_topics:
        item = parse_news_topic(t)
        if item:
            parsed_news.append(item)

    logger.info(
        "Explore feed loaded: content=%d hot=%d news=%d",
        len(content_items), len(hot_items), len(parsed_news),
    )
    return jsonify({
        "content": content_items,
        "hot": hot_items,
        "latest": parsed_news[:3],
        "other": parsed_news[3:]
    })
