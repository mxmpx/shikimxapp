import os
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, session, send_from_directory, jsonify
from utils import SHIKIMORI_BASE, get_auth_headers, fetch_with_retry
from services.tiered_cache import TieredCache

logger = logging.getLogger("shikimxapp.profile")
profile_bp = Blueprint('profile', __name__)

_profile_tiered_cache = TieredCache(name="profile", memory_ttl=1800, max_workers=2)

def get_fast_user_profile(user_id, headers):
    """Retrieve profile instantly from TieredCache with background SWR revalidation."""
    if not user_id or not headers:
        return None

    url = f"{SHIKIMORI_BASE}/api/users/{user_id}"

    def fetch_fn():
        return fetch_with_retry(url, headers)

    return _profile_tiered_cache.get_or_fetch(
        url,
        fetch_fn=fetch_fn,
        ttl=86400,
        background_refresh=True
    )

@profile_bp.route("/api/profile")
def api_profile():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        return jsonify({"authenticated": False, "nickname": None}), 200

    profile = get_fast_user_profile(user_id, headers)
    if not profile:
        return jsonify({"authenticated": False, "nickname": None}), 200

    avatar = profile.get("avatar")
    if not avatar and isinstance(profile.get("image"), dict):
        avatar = profile["image"].get("x160") or profile["image"].get("x80") or profile["image"].get("original")

    return jsonify({
        "authenticated": True,
        "id": profile.get("id"),
        "nickname": profile.get("nickname"),
        "avatar": avatar or "",
        "stats": profile.get("stats"),
    })

@profile_bp.route("/")
@profile_bp.route("/animes/<int:anime_id>")
@profile_bp.route("/mangas/<int:manga_id>")
def index(anime_id=None, manga_id=None):
    from flask import current_app
    dist_dir = os.path.join(current_app.root_path, "static", "dist")
    dist_index = os.path.join(dist_dir, "index.html")
    if os.path.exists(dist_index):
        return send_from_directory(dist_dir, "index.html")

    return (
        "<!DOCTYPE html><html lang='ru'><head><meta charset='utf-8'><title>Shiki MX App</title></head>"
        "<body style='font-family:system-ui,sans-serif;background:#0d0d12;color:#f3f4f6;padding:2rem;text-align:center;'>"
        "<h2>Frontend bundle missing</h2>"
        "<p>Пожалуйста, соберите фронтенд командой: <code>npm --prefix frontend run build</code></p>"
        "</body></html>",
        503,
        {"Content-Type": "text/html; charset=utf-8"}
    )

