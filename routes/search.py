import logging
import requests
from flask import Blueprint, jsonify, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    fetch_graphql, resolve_posters_graphql
)
from errors import api_route

logger = logging.getLogger("shikimxapp.search")
search_bp = Blueprint('search', __name__)


@search_bp.route("/api/search")
@api_route
def search():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify([])

    query = """
    query GlobalSearch($search: String!) {
      animes(search: $search, limit: 8) {
        id
        name
        russian
        kind
        score
        status
        airedOn { year }
        poster {
          mainUrl
          originalUrl
        }
        genres {
          name
          russian
        }
      }
      mangas(search: $search, limit: 8) {
        id
        name
        russian
        kind
        score
        status
        airedOn { year }
        poster {
          mainUrl
          originalUrl
        }
        genres {
          name
          russian
        }
      }
    }
    """
    gql_data = fetch_graphql(query, {"search": q}, ttl=300)
    formatted = []

    if gql_data and isinstance(gql_data, dict):
        for item in gql_data.get("animes", []) or []:
            p = item.get("poster") or {}
            poster_url = p.get("mainUrl") or p.get("originalUrl") or ""
            genres = [g.get("russian") or g.get("name") for g in item.get("genres", []) if g]
            year = str(item.get("airedOn", {}).get("year") or "") if isinstance(item.get("airedOn"), dict) else ""
            formatted.append({
                "id": item.get("id"),
                "content_type": "anime",
                "name": item.get("name", ""),
                "russian": item.get("russian") or item.get("name", ""),
                "kind": (item.get("kind") or "").upper(),
                "year": year,
                "status": item.get("status", ""),
                "genres": genres,
                "image": fix_image_url(poster_url),
                "url": f"https://shikimori.io/animes/{item.get('id')}"
            })

        for item in gql_data.get("mangas", []) or []:
            p = item.get("poster") or {}
            poster_url = p.get("mainUrl") or p.get("originalUrl") or ""
            genres = [g.get("russian") or g.get("name") for g in item.get("genres", []) if g]
            year = str(item.get("airedOn", {}).get("year") or "") if isinstance(item.get("airedOn"), dict) else ""
            formatted.append({
                "id": item.get("id"),
                "content_type": "manga",
                "name": item.get("name", ""),
                "russian": item.get("russian") or item.get("name", ""),
                "kind": (item.get("kind") or "").upper(),
                "year": year,
                "status": item.get("status", ""),
                "genres": genres,
                "image": fix_image_url(poster_url),
                "url": f"https://shikimori.io/mangas/{item.get('id')}"
            })
    else:
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

        anime_ids = [str(item["id"]) for item in combined if item.get("content_type") == "anime" and item.get("id")]
        poster_map = resolve_posters_graphql(anime_ids, headers)
        for item in combined:
            aid = str(item.get("id"))
            poster = poster_map.get(aid) if item.get("content_type") == "anime" else fix_image_url(item.get("image"))
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
                "image": poster,
                "url": f"https://shikimori.io/{item.get('content_type')}s/{item.get('id')}"
            })

    logger.debug("Search q=%r returned %d results via GraphQL", q, len(formatted))
    return jsonify(formatted)


@search_bp.route("/api/users/search")
@api_route
def search_users():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify([])

    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/users?search={requests.utils.quote(q)}&limit=10"
    data = fetch_cached_api(url, headers, ttl=300) or []

    result = []
    if isinstance(data, list):
        for u in data:
            result.append({
                "id": u.get("id"),
                "nickname": u.get("nickname"),
                "avatar": fix_image_url(u.get("avatar") or (u.get("image") or {}).get("x160") or ""),
                "last_online": u.get("last_online_at"),
            })
    return jsonify(result)
