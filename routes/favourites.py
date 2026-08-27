import logging
import requests
from flask import Blueprint, session, jsonify
from utils import (
    SHIKIMORI_BASE, get_auth_headers, fetch_cached_api,
    fetch_graphql, fix_image_url
)
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.favourites")
favourites_bp = Blueprint('favourites', __name__)

def enrich_favourites(favs, headers):
    if not isinstance(favs, dict):
        return {"characters": [], "animes": [], "mangas": []}

    # Batch enrich animes
    animes = favs.get("animes", [])
    if isinstance(animes, list) and animes:
        anime_ids = [str(x["id"]) for x in animes if isinstance(x, dict) and x.get("id")]
        for i in range(0, len(anime_ids), 50):
            chunk = anime_ids[i:i + 50]
            query = """
            query FavAnimes($ids: String!) {
              animes(ids: $ids, limit: 50) {
                id
                name
                russian
                poster { mainUrl originalUrl }
                url
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if data and isinstance(data.get("animes"), list):
                item_map = {str(a["id"]): a for a in data["animes"]}
                for item in animes:
                    aid = str(item.get("id"))
                    if aid in item_map:
                        t = item_map[aid]
                        p = t.get("poster") or {}
                        item["image"] = fix_image_url(p.get("mainUrl") or p.get("originalUrl"))
                        item["url"] = t.get("url") or f"/animes/{aid}"
                        item["russian"] = t.get("russian") or item.get("russian")

    # Batch enrich mangas
    mangas = favs.get("mangas", [])
    if isinstance(mangas, list) and mangas:
        manga_ids = [str(x["id"]) for x in mangas if isinstance(x, dict) and x.get("id")]
        for i in range(0, len(manga_ids), 50):
            chunk = manga_ids[i:i + 50]
            query = """
            query FavMangas($ids: String!) {
              mangas(ids: $ids, limit: 50) {
                id
                name
                russian
                poster { mainUrl originalUrl }
                url
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if data and isinstance(data.get("mangas"), list):
                item_map = {str(m["id"]): m for m in data["mangas"]}
                for item in mangas:
                    mid = str(item.get("id"))
                    if mid in item_map:
                        t = item_map[mid]
                        p = t.get("poster") or {}
                        item["image"] = fix_image_url(p.get("mainUrl") or p.get("originalUrl"))
                        item["url"] = t.get("url") or f"/mangas/{mid}"
                        item["russian"] = t.get("russian") or item.get("russian")

    # Batch enrich characters via GraphQL in chunks of 50
    chars = favs.get("characters", [])
    if isinstance(chars, list) and chars:
        char_ids = [str(c["id"]) for c in chars if isinstance(c, dict) and c.get("id")]
        for i in range(0, len(char_ids), 50):
            chunk = char_ids[i:i + 50]
            query = """
            query FavChars($ids: String!) {
              characters(ids: $ids, limit: 50) {
                id
                name
                russian
                poster { mainUrl originalUrl }
                url
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=86400)
            if data and isinstance(data.get("characters"), list):
                char_map = {str(c["id"]): c for c in data["characters"]}
                for c in chars:
                    cid = str(c.get("id"))
                    if cid in char_map:
                        t = char_map[cid]
                        p = t.get("poster") or {}
                        c["image"] = fix_image_url(p.get("mainUrl") or p.get("originalUrl"))
                        c["url"] = t.get("url") or f"/characters/{cid}"
                        c["russian"] = t.get("russian") or c.get("russian")

    return favs



@favourites_bp.route("/api/tab/favourites")
@api_route
def tab_favourites():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    try:
        r = requests.get(f"{SHIKIMORI_BASE}/api/users/{user_id}/favourites", headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Failed to fetch favourites: %s", exc)
        raise AppError("Не удалось загрузить избранное", 502, logging.ERROR)

    if r.status_code == 200 and isinstance(r.json(), dict):
        favs = enrich_favourites(r.json(), headers)
        logger.info("Favourites loaded for user_id=%s", user_id)
        return jsonify(favs)

    logger.warning("Favourites API returned %s for user_id=%s", r.status_code, user_id)
    return jsonify({"characters": [], "animes": [], "mangas": []})
