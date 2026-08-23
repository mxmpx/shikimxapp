import logging
from flask import Blueprint, jsonify, session
from utils import SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url, get_auth_headers, fetch_with_retry, fetch_user_rate
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.manga")
manga_bp = Blueprint('manga', __name__)

@manga_bp.route("/api/manga/<int:manga_id>")
@api_route
def get_manga_details(manga_id):
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/mangas/{manga_id}"

    data = fetch_cached_api(url, headers, ttl=3600)
    if not data or not isinstance(data, dict):
        logger.warning("Manga data unavailable for manga_id=%s", manga_id)
        raise AppError("Не удалось получить данные о манге", 502)

    poster = fix_image_url(data.get("image"))

    genres = [g.get("russian") or g.get("name") for g in data.get("genres", [])]
    publishers = [p.get("name") for p in data.get("publishers", [])]

    status_map = {
        'released': 'Издано',
        'ongoing': 'Издается',
        'anons': 'Анонс',
        'paused': 'Приостановлено',
        'discontinued': 'Прекращено'
    }
    kind_map = {
        'manga': 'Манга',
        'manhwa': 'Манхва',
        'manhua': 'Маньхуа',
        'light_novel': 'Ранобэ',
        'novel': 'Новелла',
        'one_shot': 'Ваншот',
        'doujin': 'Додзинси'
    }

    user_rate = fetch_user_rate(manga_id, "Manga")
    if user_rate:
        user_rate = {
            "status": user_rate.get("status"),
            "chapters": user_rate.get("chapters", 0),
            "volumes": user_rate.get("volumes", 0)
        }

    logger.debug("Manga details loaded: manga_id=%s", manga_id)
    return jsonify({
        "id": data.get("id"),
        "name": data.get("name"),
        "russian": data.get("russian") or data.get("name"),
        "image": poster,
        "kind": kind_map.get(data.get("kind"), (data.get("kind") or "").upper()),
        "score": data.get("score"),
        "status": status_map.get(data.get("status"), data.get("status")),
        "volumes": data.get("volumes"),
        "chapters": data.get("chapters"),
        "aired_on": data.get("aired_on"),
        "released_on": data.get("released_on"),
        "genres": genres,
        "publishers": publishers,
        "description": data.get("description_html") or data.get("description") or "Описание отсутствует.",
        "shikimori_url": f"{SHIKIMORI_BASE}{data.get('url')}" if data.get('url') else "",
        "user_rate": user_rate
    })
