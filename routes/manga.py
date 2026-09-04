import logging
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, jsonify, session
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    get_auth_headers, fetch_with_retry, fetch_user_rate, fetch_graphql
)
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.manga")
manga_bp = Blueprint('manga', __name__)

STATUS_MAP = {
    'released': 'Вышло',
    'ongoing': 'Онгоинг',
    'anons': 'Анонс',
    'paused': 'Приостановлено',
    'discontinued': 'Прекращено'
}

KIND_MAP = {
    'manga': 'Манга',
    'manhwa': 'Манхва',
    'manhua': 'Маньхуа',
    'light_novel': 'Ранобэ',
    'novel': 'Новелла',
    'one_shot': 'Ваншот',
    'doujin': 'Додзинси'
}


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


def _build_manga_from_graphql(m, manga_id):
    poster_obj = m.get("poster") or {}
    poster = poster_obj.get("originalUrl") or poster_obj.get("mainUrl") or ""

    genres = [g.get("russian") or g.get("name") for g in m.get("genres", []) if g]
    publishers = [p.get("name") for p in m.get("publishers", []) if p and p.get("name")]

    raw_status = m.get("status")
    status_ru = STATUS_MAP.get(raw_status, raw_status or "—")
    kind_ru = KIND_MAP.get(m.get("kind"), (m.get("kind") or "Манга").capitalize())

    characters = []
    seen_ids = set()
    for item in m.get("characterRoles", []) or []:
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
            "name": c.get("name"),
            "russian": c.get("russian") or c.get("name"),
            "image": fix_image_url(c_poster),
            "role": ", ".join(roles) if isinstance(roles, list) else str(roles)
        })

    related = []
    for r in m.get("related", []) or []:
        rel_ru = r.get("relationRu") or ""
        target = r.get("anime") or r.get("manga")
        if target:
            is_anime = bool(r.get("anime"))
            p_obj = target.get("poster") or {}
            p_url = p_obj.get("mainUrl") or p_obj.get("originalUrl") or ""
            aired_obj = target.get("airedOn") or {}
            year = str(aired_obj.get("year") or "")
            year_str = f"{year} год" if year else ""
            t_kind = "TV" if is_anime else "Манга"
            if target.get("kind") == "light_novel":
                t_kind = "Ранобэ"
            elif target.get("kind"):
                t_kind = KIND_MAP.get(target.get("kind"), target.get("kind").capitalize())

            parts = [year_str, t_kind, rel_ru]
            meta_text = " • ".join([p for p in parts if p])

            related.append({
                "id": target.get("id"),
                "name": target.get("russian") or target.get("name"),
                "original_name": target.get("name"),
                "is_anime": is_anime,
                "kind": t_kind,
                "relation": rel_ru,
                "year": year_str,
                "meta_text": meta_text,
                "image": fix_image_url(p_url)
            })

    aired_on = (m.get("airedOn") or {}).get("date") or str((m.get("airedOn") or {}).get("year") or "")
    released_on = (m.get("releasedOn") or {}).get("date") or str((m.get("releasedOn") or {}).get("year") or "")
    user_rate = fetch_user_rate(manga_id, "Manga")

    return {
        "id": m.get("id"),
        "name": m.get("name"),
        "russian": m.get("russian") or m.get("name"),
        "image": fix_image_url(poster, high_res=True),
        "kind": kind_ru,
        "score": m.get("score") or "—",
        "status": status_ru,
        "type_and_status": f"{kind_ru} • {status_ru}",
        "volumes": m.get("volumes"),
        "chapters": m.get("chapters"),
        "aired_on": aired_on,
        "aired_on_formatted": format_manga_aired(aired_on),
        "released_on": released_on,
        "genres": genres,
        "publishers": publishers,
        "description": m.get("descriptionHtml") or m.get("description") or "",
        "rates_statuses_stats": [],
        "characters": characters[:30],
        "characters_total": len(characters),
        "related": related[:20],
        "related_total": len(related),
        "shikimori_url": f"https://shikimori.io{m.get('url')}" if m.get('url') else f"{SHIKIMORI_BASE}/mangas/{manga_id}",
        "user_rate": user_rate
    }


@manga_bp.route("/api/manga/<int:manga_id>")
@api_route
def get_manga_details(manga_id):
    # 1. Single unified GraphQL query
    query = """
    query MangaDetails($id: String!) {
      mangas(ids: $id, limit: 1) {
        id
        name
        russian
        kind
        score
        status
        chapters
        volumes
        descriptionHtml
        description
        airedOn { year date }
        releasedOn { year date }
        poster { originalUrl mainUrl }
        genres { id name russian }
        publishers { id name }
        url
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
          anime { id name russian kind poster { mainUrl originalUrl } url airedOn { year } }
          manga { id name russian kind poster { mainUrl originalUrl } url airedOn { year } }
        }
      }
    }
    """
    try:
        gql_data = fetch_graphql(query, {"id": str(manga_id)}, ttl=3600)
        if gql_data and isinstance(gql_data.get("mangas"), list) and len(gql_data["mangas"]) > 0:
            logger.debug("Manga details loaded via GraphQL for manga_id=%s", manga_id)
            return jsonify(_build_manga_from_graphql(gql_data["mangas"][0], manga_id))
    except Exception as exc:
        logger.warning("GraphQL manga details failed for %s, falling back to REST: %s", manga_id, exc)

    # 2. Parallel REST fallback
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

    raw_status = data.get("status")
    status_ru = STATUS_MAP.get(raw_status, raw_status or "—")
    kind_ru = KIND_MAP.get(data.get("kind"), (data.get("kind") or "Манга").capitalize())

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
                item_kind = "Ранобэ"
            elif item.get("kind"):
                item_kind = KIND_MAP.get(item.get("kind"), item.get("kind").capitalize())

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
