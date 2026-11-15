import time
import threading
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

_anime_base_cache = {}
_anime_cache_lock = threading.Lock()

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
            poster_obj = target.get("poster") or {}
            poster_url = fix_image_url(poster_obj.get("mainUrl") or poster_obj.get("originalUrl"))
            related.append({
                "id": target.get("id"),
                "name": target.get("russian") or target.get("name"),
                "kind": rel_ru,
                "image": poster_url,
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
        "episodes_aired": a.get("episodesAired") or a.get("episodes_aired"),
        "duration": a.get("duration"),
        "aired_on": aired_on,
        "released_on": released_on,
        "rating": (a.get("rating") or "").upper(),
        "genres": genres,
        "studios": studios,
        "fandate": None,
        "franchise": a.get("franchise"),
        "description": a.get("descriptionHtml") or a.get("description") or "Описание отсутствует.",
        "shikimori_url": f"https://shikimori.one/animes/{anime_id}",
        "user_rate": user_rate,
        "synonyms": a.get("synonyms", []),
        "japanese": a.get("japanese") or [],
        "english": a.get("english") or [],
        "statuses_stats": a.get("statusesStats") or [],
        "scores_stats": a.get("scoresStats") or [],
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
        "shikimori_url": f"https://shikimori.one/animes/{anime_id}",
        "user_rate": user_rate,
        "synonyms": data.get("synonyms", []),
        "japanese": data.get("japanese", []),
        "english": data.get("english", []),
        "statuses_stats": [
            {"status": s.get("name"), "count": s.get("value")}
            for s in (data.get("rates_statuses_stats") or [])
        ],
        "scores_stats": [
            {"score": s.get("name"), "count": s.get("value")}
            for s in (data.get("rates_scores_stats") or [])
        ],
        "related": [
            {
                "id": r.get("anime") and r["anime"].get("id") or r.get("manga") and r["manga"].get("id"),
                "name": (r.get("anime") and r["anime"].get("russian") or r.get("anime") and r["anime"].get("name") or r.get("manga") and r["manga"].get("russian") or r.get("manga") and r["manga"].get("name")),
                "kind": r.get("relation") or r.get("relation_russian"),
                "image": fix_image_url((r.get("anime") and r["anime"].get("image") and (r["anime"]["image"].get("original") or r["anime"]["image"].get("preview"))) or (r.get("manga") and r["manga"].get("image") and (r["manga"]["image"].get("original") or r["manga"]["image"].get("preview")))),
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
    now = time.time()
    with _anime_cache_lock:
        cached = _anime_base_cache.get(anime_id)
        if cached and now < cached["expires_at"]:
            result = dict(cached["data"])
            result["user_rate"] = fetch_user_rate(anime_id, "Anime")
            return jsonify(result)

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
        japanese
        english
        scoresStats { score count }
        statusesStats { status count }
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
            anime_obj = _build_anime_from_graphql(gql_data["animes"][0], anime_id)
            try:
                anime_obj["external_links"] = fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes/{anime_id}/external_links", {"User-Agent": APP_NAME}, ttl=86400) or []
            except Exception:
                anime_obj["external_links"] = []
            with _anime_cache_lock:
                _anime_base_cache[anime_id] = {"data": dict(anime_obj), "expires_at": now + 3600}
            anime_obj["user_rate"] = fetch_user_rate(anime_id, "Anime")
            return jsonify(anime_obj)
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
    anime_obj = _build_anime_result(data, anime_id, characters_data=roles_data)
    try:
        anime_obj["external_links"] = fetch_cached_api(f"{SHIKIMORI_BASE}/api/animes/{anime_id}/external_links", {"User-Agent": APP_NAME}, ttl=86400) or []
    except Exception:
        anime_obj["external_links"] = []
    with _anime_cache_lock:
        _anime_base_cache[anime_id] = {"data": dict(anime_obj), "expires_at": now + 3600}
    anime_obj["user_rate"] = fetch_user_rate(anime_id, "Anime")
    return jsonify(anime_obj)


_anime_community_cache = {}
_anime_community_cache_lock = threading.Lock()


@anime_bp.route("/api/anime/<int:anime_id>/members")
@api_route
def get_anime_community_members(anime_id):
    """
    Fetch real Shikimori community members and friends for this anime.
    Returns real user profiles and avatars from Shikimori API/GraphQL.
    """
    now = time.time()
    user_id = session.get("user_id")
    auth_headers = get_auth_headers()
    is_authorized = bool(user_id and auth_headers)

    # 1. Check cached community data (TTL: 1 hour)
    cached_community = None
    with _anime_community_cache_lock:
        entry = _anime_community_cache.get(anime_id)
        if entry and now < entry["expires_at"]:
            cached_community = entry["data"]

    if not cached_community:
        # Fetch real user rates for this anime from Shikimori
        rates_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?target_id={anime_id}&target_type=Anime&limit=40"
        headers = {"User-Agent": APP_NAME}
        raw_rates = fetch_cached_api(rates_url, headers, ttl=3600) or []

        status_map = {
            "watching": ("Смотрю", "#38bdf8"),
            "completed": ("Просмотрено", "#4ade80"),
            "planned": ("В планах", "#818cf8"),
            "on_hold": ("Отложено", "#facc15"),
            "dropped": ("Брошено", "#ef4444"),
            "rewatching": ("Пересматриваю", "#06b6d4"),
        }

        user_rate_info = {}
        if isinstance(raw_rates, list):
            for rate in raw_rates:
                uid = str(rate.get("user_id"))
                st = rate.get("status", "watching")
                ru_st, color = status_map.get(st, ("Смотрю", "#38bdf8"))
                if uid not in user_rate_info:
                    user_rate_info[uid] = {
                        "status": ru_st,
                        "status_color": color,
                        "score": rate.get("score", 0),
                    }

        uids = list(user_rate_info.keys())[:24]
        community_users = []
        if uids:
            alias_queries = "\n".join(
                f'u{uid}: users(ids: "{uid}") {{ id nickname avatarUrl }}'
                for uid in uids
            )
            gql_query = f"query {{\n{alias_queries}\n}}"
            try:
                gql_res = fetch_graphql(gql_query, ttl=3600)
                if gql_res and isinstance(gql_res, dict):
                    for uid in uids:
                        u_list = gql_res.get(f"u{uid}") or []
                        if u_list and isinstance(u_list, list) and u_list[0].get("avatarUrl"):
                            u = u_list[0]
                            info = user_rate_info.get(uid, {})
                            avatar = fix_image_url(u.get("avatarUrl"))
                            community_users.append({
                                "id": int(u["id"]),
                                "name": u.get("nickname") or f"Пользователь {uid}",
                                "avatar": avatar,
                                "status": info.get("status", "Смотрю"),
                                "status_color": info.get("status_color", "#38bdf8"),
                                "score": info.get("score", 0)
                            })
            except Exception as exc:
                logger.debug("Failed resolving community avatars via GraphQL: %s", exc)

        cached_community = community_users
        with _anime_community_cache_lock:
            _anime_community_cache[anime_id] = {
                "data": community_users,
                "expires_at": now + 3600
            }

    # 2. Check user's real friends if authorized
    friends_watching = []
    if is_authorized:
        try:
            friends_url = f"{SHIKIMORI_BASE}/api/users/{user_id}/friends"
            raw_friends = fetch_cached_api(friends_url, auth_headers, ttl=900) or []
            if isinstance(raw_friends, list) and raw_friends:
                friend_map = {str(f.get("id")): f for f in raw_friends if f.get("id")}
                for u in cached_community:
                    uid_str = str(u["id"])
                    if uid_str in friend_map:
                        f_info = friend_map[uid_str]
                        f_avatar = fix_image_url(f_info.get("avatar") or (f_info.get("image") or {}).get("x160") or u["avatar"])
                        friends_watching.append({
                            "id": u["id"],
                            "name": f_info.get("nickname") or u["name"],
                            "avatar": f_avatar,
                            "status": u["status"],
                            "status_color": u["status_color"],
                            "score": u["score"]
                        })
        except Exception as exc:
            logger.debug("Error checking friends for anime %s: %s", anime_id, exc)

    # 3. Community watchers for display (active viewers)
    community_watchers = [
        u for u in cached_community
        if u["status"] in ("Смотрю", "Просмотрено", "Пересматриваю")
    ][:4]
    if not community_watchers:
        community_watchers = cached_community[:4]

    return jsonify({
        "is_authorized": is_authorized,
        "friends": friends_watching,
        "community_watchers": community_watchers,
        "favorites": cached_community[:18],
        "total_favorites": len(cached_community)
    })




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
    if anime_data.get("russian") and anime_data["russian"] not in titles_pool:
        titles_pool.append(anime_data["russian"])
    if anime_data.get("name") and anime_data["name"] not in titles_pool:
        titles_pool.append(anime_data["name"])

    # Добавляем синонимы только при недостатке основных названий (не более 3 всего)
    if len(titles_pool) < 2:
        synonyms = anime_data.get("synonyms") or []
        if isinstance(synonyms, list):
            for s in synonyms:
                if s and s not in titles_pool:
                    titles_pool.append(s)
                    if len(titles_pool) >= 2:
                        break

    titles_pool = [t for t in titles_pool if t and len(t.strip()) > 1][:3]
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
    animes = [
        {
            "id": a.get("id"),
            "name": a.get("russian") or a.get("name"),
            "original_name": a.get("name"),
            "role": a.get("role"),
            "kind": (a.get("kind") or "").upper(),
            "score": str(a.get("score")) if a.get("score") else "",
            "image": fix_image_url(a.get("image")),
        }
        for a in data.get("animes", [])
    ]
    mangas = [
        {
            "id": m.get("id"),
            "name": m.get("russian") or m.get("name"),
            "original_name": m.get("name"),
            "role": m.get("role"),
            "kind": (m.get("kind") or "").upper(),
            "score": str(m.get("score")) if m.get("score") else "",
            "image": fix_image_url(m.get("image")),
        }
        for m in data.get("mangas", [])
    ]

    seyu = [
        {
            "id": s.get("id"),
            "name": s.get("russian") or s.get("name"),
            "original_name": s.get("name"),
            "image": fix_image_url(s.get("image")),
            "url": f"{SHIKIMORI_BASE}{s.get('url')}" if s.get('url') else ""
        }
        for s in data.get("seyu", [])
    ]

    logger.debug("Character loaded: char_id=%s animes=%d mangas=%d", char_id, len(animes), len(mangas))
    return jsonify({
        "id": data.get("id"),
        "name": data.get("name"),
        "russian": data.get("russian") or data.get("name"),
        "japanese": data.get("japanese") or "",
        "image": poster,
        "description": data.get("description_html") or data.get("description") or "",
        "animes": animes,
        "mangas": mangas,
        "seyu": seyu,
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
