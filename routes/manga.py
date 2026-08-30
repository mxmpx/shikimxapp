import logging
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, jsonify, session
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    get_auth_headers, fetch_with_retry, fetch_user_rate
)
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.manga")
manga_bp = Blueprint('manga', __name__)

def format_manga_aired(date_str):
    if not date_str:
        return "—"
    try:
        parts = date_str.split('-')
        year = parts[0]
        if len(parts) > 1:
            m_idx = int(parts[1]) - 1
            months = [
                'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
                'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
            ]
            if 0 <= m_idx < 12:
                return f"{months[m_idx]} {year} г."
        return f"{year} г."
    except Exception:
        return date_str

@manga_bp.route("/api/manga/<int:manga_id>")
@api_route
def get_manga_details(manga_id):
    headers = {"User-Agent": APP_NAME}
    url_manga = f"{SHIKIMORI_BASE}/api/mangas/{manga_id}"
    url_roles = f"{SHIKIMORI_BASE}/api/mangas/{manga_id}/roles"
    url_related = f"{SHIKIMORI_BASE}/api/mangas/{manga_id}/related"

    with ThreadPoolExecutor(max_workers=3) as executor:
        f_manga = executor.submit(fetch_cached_api, url_manga, headers, ttl=3600)
        f_roles = executor.submit(fetch_cached_api, url_roles, headers, ttl=3600)
        f_related = executor.submit(fetch_cached_api, url_related, headers, ttl=3600)

        data = f_manga.result()
        roles_data = f_roles.result() or []
        related_data = f_related.result() or []

    if not data or not isinstance(data, dict):
        logger.warning("Manga data unavailable for manga_id=%s", manga_id)
        raise AppError("Не удалось получить данные о манге", 502)

    poster = fix_image_url(data.get("image"), high_res=True)

    genres = [g.get("russian") or g.get("name") for g in data.get("genres", [])]
    publishers = [p.get("name") for p in data.get("publishers", [])]

    status_map = {
        'released': 'Вышло',
        'ongoing': 'Онгоинг',
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

    raw_status = data.get("status")
    status_ru = status_map.get(raw_status, raw_status or "—")
    kind_ru = kind_map.get(data.get("kind"), (data.get("kind") or "Манга").capitalize())

    characters = []
    for r in roles_data:
        ch = r.get("character")
        if ch:
            characters.append({
                "id": ch.get("id"),
                "name": ch.get("name"),
                "russian": ch.get("russian") or ch.get("name"),
                "image": fix_image_url(ch.get("image")),
                "role": r.get("roles_russian", [None])[0] or (r.get("roles", [None])[0]) or ""
            })

    related = []
    for r in related_data:
        rel_ru = r.get("relation_russian") or r.get("relation") or ""
        item = r.get("anime") or r.get("manga")
        if item:
            is_anime = bool(r.get("anime"))
            aired_on = item.get("aired_on") or ""
            year = aired_on[:4] if aired_on else ""
            year_str = f"{year} год" if year else ""
            item_kind = "TV" if is_anime else "Манга"
            if item.get("kind") == "light_novel":
                item_kind = "Ранобе"
            elif item.get("kind"):
                item_kind = kind_map.get(item.get("kind"), item.get("kind").capitalize())

            parts = [year_str, item_kind, rel_ru]
            meta_text = " • ".join([p for p in parts if p])

            related.append({
                "id": item.get("id"),
                "name": item.get("russian") or item.get("name"),
                "original_name": item.get("name"),
                "is_anime": is_anime,
                "kind": item_kind,
                "relation": rel_ru,
                "year": year_str,
                "meta_text": meta_text,
                "image": fix_image_url(item.get("image"))
            })

    user_rate = fetch_user_rate(manga_id, "Manga")

    logger.debug("Manga details loaded: manga_id=%s, chars=%d, rel=%d", manga_id, len(characters), len(related))
    return jsonify({
        "id": data.get("id"),
        "name": data.get("name"),
        "russian": data.get("russian") or data.get("name"),
        "image": poster,
        "kind": kind_ru,
        "score": data.get("score") or "—",
        "status": status_ru,
        "type_and_status": f"{kind_ru} • {status_ru}",
        "volumes": data.get("volumes"),
        "chapters": data.get("chapters"),
        "aired_on": data.get("aired_on"),
        "aired_on_formatted": format_manga_aired(data.get("aired_on")),
        "released_on": data.get("released_on"),
        "genres": genres,
        "publishers": publishers,
        "description": data.get("description_html") or data.get("description") or "",
        "rates_statuses_stats": data.get("rates_statuses_stats", []),
        "characters": characters[:30],
        "characters_total": len(characters),
        "related": related[:20],
        "related_total": len(related),
        "shikimori_url": f"{SHIKIMORI_BASE}{data.get('url')}" if data.get('url') else "",
        "user_rate": user_rate
    })
