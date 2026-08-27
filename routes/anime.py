import logging
import requests
from flask import Blueprint, jsonify, session, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    get_auth_headers, fetch_with_retry, fetch_user_rate,
    resolve_single_anime_poster_graphql, fetch_graphql
)
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.anime")

try:
    from services.video_aggregator import video_aggregator
except ImportError as exc:
    video_aggregator = None
    logging.getLogger("shikimxapp.anime").warning("video_aggregator unavailable: %s", exc)

anime_bp = Blueprint('anime', __name__)

def _build_anime_from_graphql(a, anime_id):
    """Построить структуру аниме из ответа GraphQL."""
    poster_obj = a.get("poster") or {}
    poster = poster_obj.get("originalUrl") or poster_obj.get("mainUrl") or ""

    status_map = {'released': 'Вышло', 'ongoing': 'Онгоинг', 'anons': 'Анонс'}
    kind_map = {'tv': 'ТВ Сериал', 'movie': 'Фильм', 'ova': 'OVA', 'ona': 'ONA', 'special': 'Спешл', 'music': 'Клип'}

    genres = [g.get("russian") or g.get("name") for g in a.get("genres", []) if g]
    studios = [s.get("name") for s in a.get("studios", []) if s and s.get("name")]

    user_rate = fetch_user_rate(anime_id, "Anime")

    characters = []
    seen_ids = set()
    for item in a.get("characterRoles", []) or []:
        c = item.get("character") if isinstance(item, dict) else None
        if not c or not c.get("id"):
            continue
        cid = str(c["id"])
        if cid in seen_ids:
            continue
        seen_ids.add(cid)
        c_poster = (c.get("poster") or {}).get("mainUrl") or (c.get("poster") or {}).get("originalUrl") or ""
        roles = item.get("rolesRu") or item.get("rolesEn") or []
        characters.append({
            "id": c.get("id"),
            "name": c.get("russian") or c.get("name"),
            "japanese": "",
            "image": fix_image_url(c_poster),
            "role": ", ".join(roles) if isinstance(roles, list) else str(roles),
            "url": f"https://shikimori.io{c.get('url')}" if c.get("url") else ""
        })

    related = []
    for r in a.get("related", []) or []:
        rel_ru = r.get("relationRu") or ""
        target = r.get("anime") or r.get("manga")
        if target:
            is_anime = bool(r.get("anime"))
            t_url = target.get("url") or (f"/animes/{target.get('id')}" if is_anime else f"/mangas/{target.get('id')}")
            related.append({
                "id": target.get("id"),
                "name": target.get("russian") or target.get("name"),
                "kind": rel_ru,
                "url": f"https://shikimori.io{t_url}" if not t_url.startswith("http") else t_url
            })

    screenshots = [
        fix_image_url(s.get("originalUrl") or s.get("x332Url"), high_res=True)
        for s in a.get("screenshots", []) if s
    ]

    videos = [
        {
            "id": v.get("id"),
            "url": v.get("url"),
            "name": v.get("name"),
            "kind": v.get("kind")
        }
        for v in a.get("videos", []) if v and v.get("url")
    ]

    aired_on = (a.get("airedOn") or {}).get("date") or str((a.get("airedOn") or {}).get("year") or "")
    released_on = (a.get("releasedOn") or {}).get("date") or str((a.get("releasedOn") or {}).get("year") or "")

    return {
        "id": a.get("id"),
        "name": a.get("name"),
        "russian": a.get("russian") or a.get("name"),
        "image": fix_image_url(poster, high_res=True),
        "kind": kind_map.get(a.get("kind"), (a.get("kind") or "").upper()),
        "score": a.get("score"),
        "scored_by": None,
        "status": status_map.get(a.get("status"), a.get("status")),
        "episodes": a.get("episodes"),
        "episodes_aired": a.get("episodes_aired"),
        "duration": a.get("duration"),
        "aired_on": aired_on,
        "released_on": released_on,
        "rating": (a.get("rating") or "").upper(),
        "genres": genres,
        "studios": studios,
        "fandate": None,
        "franchise": a.get("franchise"),
        "description": a.get("descriptionHtml") or a.get("description") or "Описание отсутствует.",
        "shikimori_url": f"https://shikimori.io{a.get('url')}" if a.get('url') else f"https://shikimori.io/animes/{anime_id}",
        "user_rate": user_rate,
        "synonyms": a.get("synonyms", []),
        "japanese": [],
        "related": related[:12],
        "characters": characters[:30],
        "screenshots": screenshots,
        "external_scores": [],
        "video": videos,
        "licensed_by": []
    }

def _build_anime_result(data, anime_id, characters_data=None):
    poster = fix_image_url(data.get("image"), high_res=True)
    if not poster or "missing_" in poster:
        poster = resolve_single_anime_poster_graphql(anime_id)


    genres = [g.get("russian") or g.get("name") for g in data.get("genres", [])]
    studios = [s.get("name") for s in data.get("studios", [])]

    status_map = {'released': 'Вышло', 'ongoing': 'Онгоинг', 'anons': 'Анонс'}
    kind_map = {'tv': 'ТВ Сериал', 'movie': 'Фильм', 'ova': 'OVA', 'ona': 'ONA', 'special': 'Спешл', 'music': 'Клип'}

    user_rate = fetch_user_rate(anime_id, "Anime")

    roles = characters_data if isinstance(characters_data, list) else []
    characters = []
    seen_ids = set()
    for item in roles:
        c = item.get("character") if isinstance(item, dict) else None
        if not c or not c.get("id"):
            continue
        cid = c["id"]
        if cid in seen_ids:
            continue
        seen_ids.add(cid)
        character_roles = item.get("roles_russian") or item.get("roles") or []
        characters.append({
            "id": c.get("id"),
            "name": c.get("russian") or c.get("name"),
            "japanese": c.get("name") if (c.get("russian") and c.get("name") != c.get("russian")) else "",
            "image": fix_image_url(c.get("image")),
            "role": ", ".join(character_roles) if character_roles else "",
            "url": f"{SHIKIMORI_BASE}{c.get('url')}" if c.get("url") else ""
        })

    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "russian": data.get("russian") or data.get("name"),
        "image": poster,
        "kind": kind_map.get(data.get("kind"), (data.get("kind") or "").upper()),
        "score": data.get("score"),
        "scored_by": data.get("scored_by"),
        "status": status_map.get(data.get("status"), data.get("status")),
        "episodes": data.get("episodes"),
        "episodes_aired": data.get("episodes_aired"),
        "duration": data.get("duration"),
        "aired_on": data.get("aired_on"),
        "released_on": data.get("released_on"),
        "rating": (data.get("rating") or "").upper(),
        "genres": genres,
        "studios": studios,
        "fandate": data.get("fandate"),
        "franchise": data.get("franchise"),
        "description": data.get("description_html") or data.get("description") or "Описание отсутствует.",
        "shikimori_url": f"{SHIKIMORI_BASE}{data.get('url')}" if data.get('url') else "",
        "user_rate": user_rate,
        "synonyms": data.get("synonyms", []),
        "japanese": data.get("japanese", []),
        "related": [
            {
                "id": r.get("anime") and r["anime"].get("id") or r.get("manga") and r["manga"].get("id"),
                "name": (r.get("anime") and r["anime"].get("russian") or r.get("anime") and r["anime"].get("name") or r.get("manga") and r["manga"].get("russian") or r.get("manga") and r["manga"].get("name")),
                "kind": r.get("relation") or r.get("relation_russian"),
                "url": (r.get("anime") and f"{SHIKIMORI_BASE}{r['anime'].get('url')}" or r.get("manga") and f"{SHIKIMORI_BASE}{r['manga'].get('url')}" or "")
            }
            for r in data.get("related", [])[:12]
            if r.get("anime") or r.get("manga")
        ],
        "characters": characters[:30],
        "screenshots": [fix_image_url(s, high_res=True) for s in data.get("screenshots", []) if s],
        "external_scores": data.get("external_scores", []),
        "video": data.get("video") or data.get("video_trailers") or [],
        "licensed_by": [l.get("name") for l in data.get("licensed_by", []) if l.get("name")]
    }

@anime_bp.route("/api/anime/<int:anime_id>")
@api_route
def get_anime_details(anime_id):
    # 1. Попытка загрузки через единый GraphQL-запрос со всеми связями
    query = """
    query AnimeDetails($id: String!) {
      animes(ids: $id, limit: 1) {
        id
        name
        russian
        kind
        score
        status
        episodes
        episodesAired
        duration
        rating
        descriptionHtml
        description
        airedOn { year date }
        releasedOn { year date }
        poster { originalUrl mainUrl }
        genres { id name russian }
        studios { id name }
        synonyms
        franchise
        url
        screenshots { id originalUrl x332Url }
        characterRoles {
          rolesRu
          rolesEn
          character {
            id
            name
            russian
            poster { mainUrl originalUrl }
            url
          }
        }
        related {
          relationRu
          anime { id name russian poster { mainUrl originalUrl } url }
          manga { id name russian poster { mainUrl originalUrl } url }
        }
        videos {
          id
          name
          url
          kind
        }
      }
    }
    """
    try:
        gql_data = fetch_graphql(query, {"id": str(anime_id)}, ttl=3600)
        if gql_data and isinstance(gql_data.get("animes"), list) and len(gql_data["animes"]) > 0:
            logger.debug("Anime details loaded via GraphQL for anime_id=%s", anime_id)
            return jsonify(_build_anime_from_graphql(gql_data["animes"][0], anime_id))
    except Exception as exc:
        logger.warning("GraphQL anime details failed for %s, fallback to REST: %s", anime_id, exc)

    # 2. Резервный REST путь, если GraphQL недоступен
    headers = {"User-Agent": APP_NAME}
    anime_url = f"{SHIKIMORI_BASE}/api/animes/{anime_id}"

    data = fetch_cached_api(anime_url, headers, ttl=3600)
    if not data or not isinstance(data, dict):
        logger.warning("Anime data unavailable for anime_id=%s", anime_id)
        raise AppError("Не удалось получить данные с Shikimori", 502)

    screenshots_url = f"{SHIKIMORI_BASE}/api/animes/{anime_id}/screenshots"
    screenshots_data = fetch_cached_api(screenshots_url, headers, ttl=3600)
    if isinstance(screenshots_data, list) and screenshots_data:
        data["screenshots"] = screenshots_data

    roles_url = f"{SHIKIMORI_BASE}/api/animes/{anime_id}/roles"
    roles_data = fetch_cached_api(roles_url, headers, ttl=3600)

    logger.debug("Anime details loaded via REST fallback: anime_id=%s", anime_id)
    return jsonify(_build_anime_result(data, anime_id, characters_data=roles_data))




@anime_bp.route("/api/anime/<int:anime_id>/anicli")
@anime_bp.route("/api/anime/<int:anime_id>/video")
@api_route
def get_anicli_stream(anime_id):
    custom_title = request.args.get("title", "").strip()

    if not video_aggregator:
        raise AppError("Сервис video_aggregator недоступен", 500, logging.ERROR)

    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/animes/{anime_id}"
    anime_data = fetch_cached_api(url, headers, ttl=3600) or {}

    titles_pool = []
    if custom_title:
        titles_pool.append(custom_title)
    if anime_data.get("russian"):
        titles_pool.append(anime_data["russian"])
    if anime_data.get("name"):
        titles_pool.append(anime_data["name"])

    synonyms = anime_data.get("synonyms") or []
    if isinstance(synonyms, list):
        for s in synonyms:
            if s and s not in titles_pool:
                titles_pool.append(s)

    titles_pool = list(dict.fromkeys(t for t in titles_pool if t and len(t.strip()) > 1))

    if not titles_pool:
        titles_pool = [f"Anime {anime_id}"]

    data = video_aggregator.get_aggregated_streams(
        anime_id, titles_pool, expected_episodes=anime_data.get("episodes")
    )
    if not data or not data.get("episodes"):
        logger.info("No video streams found for anime_id=%s titles=%s", anime_id, titles_pool[:3])
        raise AppError(f"Не удалось найти доступные плееры для '{titles_pool[0]}'", 404)

    logger.info(
        "Video streams loaded: anime_id=%s sources=%s episodes=%d",
        anime_id,
        data.get("sources_found", []),
        data.get("total_episodes", 0),
    )
    return jsonify(data)


@anime_bp.route("/api/character/<int:char_id>")
@api_route
def get_character_details(char_id):
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/characters/{char_id}"

    data = fetch_cached_api(url, headers, ttl=3600)
    if not data or not isinstance(data, dict):
        logger.warning("Character data unavailable for char_id=%s", char_id)
        raise AppError("Не удалось получить данные о персонаже", 502)

    poster = fix_image_url(data.get("image"))
    animes = [{"id": a.get("id"), "name": a.get("russian") or a.get("name"), "role": a.get("role")} for a in data.get("animes", [])]
    mangas = [{"id": m.get("id"), "name": m.get("russian") or m.get("name"), "role": m.get("role")} for m in data.get("mangas", [])]

    logger.debug("Character loaded: char_id=%s", char_id)
    return jsonify({
        "id": data.get("id"),
        "name": data.get("name"),
        "russian": data.get("russian") or data.get("name"),
        "japanese": data.get("japanese") or "",
        "image": poster,
        "description": data.get("description_html") or data.get("description") or "Описание отсутствует.",
        "animes": animes[:6],
        "mangas": mangas[:6],
        "shikimori_url": f"{SHIKIMORI_BASE}{data.get('url')}" if data.get('url') else ""
    })


@anime_bp.route("/api/club/<int:club_id>")
@api_route
def get_club_details(club_id):
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/clubs/{club_id}"

    data = fetch_cached_api(url, headers, ttl=3600)
    if not data or not isinstance(data, dict):
        logger.warning("Club data unavailable for club_id=%s", club_id)
        raise AppError("Не удалось получить данные о клубе", 502)

    logo = fix_image_url(data.get("logo") or data.get("image"))
    members = data.get("members", [])

    logger.debug("Club loaded: club_id=%s members=%d", club_id, len(members))
    return jsonify({
        "id": data.get("id"),
        "name": data.get("name"),
        "image": logo,
        "is_private": data.get("join_policy") == "owner_invitation",
        "members_count": len(members),
        "description": data.get("description_html") or data.get("description") or "Описание отсутствует.",
        "shikimori_url": f"{SHIKIMORI_BASE}/clubs/{data.get('id')}"
    })


@anime_bp.route("/api/anime/trace", methods=["POST"])
@api_route
def trace_anime_by_image():
    raise AppError("Поиск по картинке отключен", 404)
