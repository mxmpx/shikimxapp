import logging
import requests
from flask import Blueprint, jsonify, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url, build_topic_url
)
from errors import api_route

logger = logging.getLogger("shikimxapp.forum")
forum_bp = Blueprint('forum', __name__)

ALLOWED_FORUMS = {
    "all", "cosplay", "animanga", "site", "games", "vn",
    "critiques", "news", "clubs", "my_clubs", "reviews", "offtopic"
}


@forum_bp.route("/api/forum/topics", methods=["GET"])
@api_route
def get_forum_topics():
    """Get forum topics by category."""
    raw_forum = request.args.get("forum", "all")
    forum = raw_forum if raw_forum in ALLOWED_FORUMS else "all"

    page = max(1, request.args.get("page", 1, type=int) or 1)
    limit = max(1, min(request.args.get("limit", 20, type=int) or 20, 30))

    headers = {"User-Agent": APP_NAME}
    forum_param = f"&forum={requests.utils.quote(forum)}" if forum and forum != "all" else ""
    url = f"{SHIKIMORI_BASE}/api/topics?page={page}&limit={limit}{forum_param}"
    data = fetch_cached_api(url, headers, ttl=300) or []

    results = []
    if isinstance(data, list):
        for t in data:
            title = t.get("topic_title") or t.get("title") or ""
            href = build_topic_url(t)
            created_at = t.get("created_at", "")
            user = t.get("user") or {}
            forum_info = t.get("forum") or {}

            results.append({
                "id": t.get("id"),
                "title": title,
                "url": href,
                "created_at": created_at,
                "comments_count": t.get("comments_count", 0),
                "author": user.get("nickname", "Пользователь"),
                "author_avatar": fix_image_url(
                    user.get("avatar") or (user.get("image", {}).get("x48") if isinstance(user.get("image"), dict) else "")
                ),
                "forum_name": forum_info.get("name", "Форум"),
                "forum_permalink": forum_info.get("permalink", "animanga"),
                "type": t.get("type", "")
            })

    return jsonify(results)


@forum_bp.route("/api/clubs/popular", methods=["GET"])
@api_route
def get_popular_clubs():
    """Get list of clubs with multi-page support."""
    page = max(1, request.args.get("page", 1, type=int) or 1)
    limit = max(1, min(request.args.get("limit", 30, type=int) or 30, 60))
    search_q = request.args.get("search") or request.args.get("q")

    headers = {"User-Agent": APP_NAME}
    search_param = f"&search={requests.utils.quote(search_q.strip())}" if search_q and search_q.strip() else ""

    if limit > 30:
        url1 = f"{SHIKIMORI_BASE}/api/clubs?page={(page - 1) * 2 + 1}&limit=30{search_param}"
        url2 = f"{SHIKIMORI_BASE}/api/clubs?page={(page - 1) * 2 + 2}&limit=30{search_param}"
        r1 = fetch_cached_api(url1, headers, ttl=1800) or []
        r2 = fetch_cached_api(url2, headers, ttl=1800) or []
        data = (r1 if isinstance(r1, list) else []) + (r2 if isinstance(r2, list) else [])
    else:
        url = f"{SHIKIMORI_BASE}/api/clubs?page={page}&limit={limit}{search_param}"
        data = fetch_cached_api(url, headers, ttl=1800) or []

    results = []
    if isinstance(data, list):
        for c in data:
            logo = c.get("logo") or {}
            logo_url = (
                logo.get("main") or logo.get("original") or logo.get("x96") or ""
                if isinstance(logo, dict)
                else str(logo or "")
            )
            join_policy = c.get("join_policy", "free")
            members_label = "Открытый клуб" if join_policy == "free" else "По заявкам"
            results.append({
                "id": c.get("id"),
                "name": c.get("name", ""),
                "logo": fix_image_url(logo_url, high_res=True),
                "members_label": members_label,
                "is_censored": c.get("is_censored", False),
                "comment_policy": c.get("comment_policy", "free"),
                "url": f"{SHIKIMORI_BASE}/clubs/{c.get('id')}"
            })

    return jsonify(results)
