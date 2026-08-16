import logging
from flask import Blueprint, jsonify, session, request
from utils import SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url, get_auth_headers, fetch_with_retry
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.anime")

try:
    from services.video_aggregator import video_aggregator
except ImportError as exc:
    video_aggregator = None
    logging.getLogger("shikimxapp.anime").warning("video_aggregator unavailable: %s", exc)

anime_bp = Blueprint('anime', __name__)

def _build_anime_result(data, anime_id):
    poster = fix_image_url(data.get("image"))

    genres = [g.get("russian") or g.get("name") for g in data.get("genres", [])]
    studios = [s.get("name") for s in data.get("studios", [])]

    status_map = {'released': 'Вышло', 'ongoing': 'Онгоинг', 'anons': 'Анонс'}
    kind_map = {'tv': 'ТВ Сериал', 'movie': 'Фильм', 'ova': 'OVA', 'ona': 'ONA', 'special': 'Спешл', 'music': 'Клип'}

    user_rate = None
    try:
        user_id = session.get("user_id")
        auth_headers = get_auth_headers()
        if user_id and auth_headers:
            rate_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={anime_id}&target_type=Anime"
            rate_data = fetch_with_retry(rate_url, auth_headers)
            if rate_data and isinstance(rate_data, list) and len(rate_data) > 0:
                user_rate = {
                    "status": rate_data[0].get("status"),
                    "episodes": rate_data[0].get("episodes", 0)
                }
    except Exception as exc:
        logger.debug("Could not load user rate for anime_id=%s: %s", anime_id, exc)
        user_rate = None

    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "russian": data.get("russian") or data.get("name"),
        "image": poster,
        "kind": kind_map.get(data.get("kind"), (data.get("kind") or "").upper()),
        "score": data.get("score"),
        "status": status_map.get(data.get("status"), data.get("status")),
        "episodes": data.get("episodes"),
        "episodes_aired": data.get("episodes_aired"),
        "duration": data.get("duration"),
        "aired_on": data.get("aired_on"),
        "released_on": data.get("released_on"),
        "rating": (data.get("rating") or "").upper(),
        "genres": genres,
        "studios": studios,
        "description": data.get("description_html") or data.get("description") or "Описание отсутствует.",
        "shikimori_url": f"{SHIKIMORI_BASE}{data.get('url')}" if data.get('url') else "",
        "user_rate": user_rate,
        "synonyms": data.get("synonyms", []),
        "japanese": data.get("japanese", [])
    }

@anime_bp.route("/api/anime/<int:anime_id>")
@api_route
def get_anime_details(anime_id):
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/animes/{anime_id}"

    data = fetch_cached_api(url, headers, ttl=3600)
    if not data or not isinstance(data, dict):
        logger.warning("Anime data unavailable for anime_id=%s", anime_id)
        raise AppError("Не удалось получить данные с Shikimori", 502)

    logger.debug("Anime details loaded: anime_id=%s", anime_id)
    return jsonify(_build_anime_result(data, anime_id))


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
