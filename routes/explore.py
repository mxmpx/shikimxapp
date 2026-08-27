import re
import logging
import random
import requests
from flask import Blueprint, jsonify, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    fetch_graphql, resolve_posters_graphql
)
from concurrent.futures import ThreadPoolExecutor
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.explore")
explore_bp = Blueprint('explore', __name__)

def build_topic_url(t):
    url = t.get("url")
    if url:
        if url.startswith("http"):
            return url
        return f"{SHIKIMORI_BASE}{'' if url.startswith('/') else '/'}{url}"
    
    topic_id = t.get("id")
    if not topic_id:
        return SHIKIMORI_BASE

    forum_info = t.get("forum") or {}
    forum_name = forum_info.get("name") if isinstance(forum_info, dict) else ""

    forum_path = "animanga"
    if "collection" in forum_name:
        forum_path = "collections"
    elif "critique" in forum_name:
        forum_path = "critiques"
    elif "article" in forum_name:
        forum_path = "articles"
    elif "news" in forum_name:
        forum_path = "news"

    return f"{SHIKIMORI_BASE}/forum/{forum_path}/{topic_id}"

def parse_news_topic(t):
    title = t.get("topic_title") or t.get("title") or ""
    href = build_topic_url(t)
    created_at = t.get("created_at", "")[:10] if t.get("created_at") else ""
    author = (t.get("user") or {}).get("nickname", "")
    topic_id = t.get("id")

    img_src = ""
    linked = t.get("linked")
    if linked and isinstance(linked, dict) and linked.get("image"):
        img_dict = linked.get("image")
        if isinstance(img_dict, dict):
            candidate = img_dict.get("original") or img_dict.get("preview") or ""
            if candidate and "missing" not in candidate:
                img_src = candidate

    if not img_src:
        html_content = (t.get("html_body") or "") + " " + (t.get("html_footer") or "")
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html_content)
        if img_match:
            candidate = img_match.group(1)
            if "missing" not in candidate:
                img_src = candidate

    if not img_src:
        all_text = (t.get("html_body") or "") + " " + (t.get("html_footer") or "") + " " + (t.get("body") or "")
        yt_match = re.search(r'youtube\.com/vi/([^/]+)', all_text)
        if yt_match:
            img_src = f"https://img.youtube.com/vi/{yt_match.group(1)}/hqdefault.jpg"

    if img_src:
        if "missing" in img_src:
            img_src = ""
        else:
            if img_src.startswith("//"):
                img_src = "https:" + img_src
            elif not img_src.startswith("http"):
                img_src = f"{SHIKIMORI_BASE}" + ("" if img_src.startswith("/") else "/") + img_src
            
            img_src = re.sub(r'/(preview|x64|x32|x96|x148|x160)/', '/original/', img_src)

    cached_img = f"/cache/img?url={img_src}" if img_src else ""

    if title and href:
        return {
            "id": topic_id,
            "title": title, "url": href, "image": cached_img,
            "author": author, "date": created_at, "tags": ["Новость"]
        }
    return None

@explore_bp.route("/api/search")
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
        # Fallback to REST if GraphQL returned nothing
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



@explore_bp.route("/api/news")
@api_route
def get_news():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/topics?forum=news&page={page}&limit={limit}"
    
    topics = fetch_cached_api(url, headers, ttl=900) or []
    if not isinstance(topics, list):
        logger.warning("News API returned non-list for page=%s", page)
        return jsonify([])

    items = []
    for t in topics:
        item = parse_news_topic(t)
        if item:
            items.append(item)

    logger.debug("News page=%s limit=%s returned %d items", page, limit, len(items))
    return jsonify(items)

def parse_topic_item(t, default_tag=""):
    title = t.get("topic_title") or t.get("title") or ""
    topic_id = t.get("id")
    forum = (t.get("forum") or {}).get("name") or "" if isinstance(t.get("forum"), dict) else ""
    
    tag_name = default_tag
    if "collection" in forum: tag_name = "Коллекция"
    elif "critique" in forum: tag_name = "Рецензия"
    elif "article" in forum: tag_name = "Статья"
    elif "news" in forum: tag_name = "Новость"

    return {
        "id": topic_id,
        "title": title,
        "url": build_topic_url(t),
        "comments_count": t.get("comments_count", 0),
        "tag": tag_name,
        "author": (t.get("user") or {}).get("nickname", ""),
        "date": t.get("created_at", "")[:10] if t.get("created_at") else ""
    }

@explore_bp.route("/api/tab/explore")
@api_route
def tab_explore():
    headers = {"User-Agent": APP_NAME}
    
    urls = {
        "news": f"{SHIKIMORI_BASE}/api/topics?forum=news&page=1&limit=13",
        "collections": f"{SHIKIMORI_BASE}/api/topics?forum=collections&limit=4",
        "critiques": f"{SHIKIMORI_BASE}/api/topics?forum=critiques&limit=4",
        "articles": f"{SHIKIMORI_BASE}/api/topics?forum=articles&limit=4",
        "hot": f"{SHIKIMORI_BASE}/api/topics?forum=animanga&limit=8"
    }

    results = {}
    def fetch_url(key_url):
        key, url = key_url
        return key, fetch_cached_api(url, headers, ttl=900)

    with ThreadPoolExecutor(max_workers=2) as executor:
        for k, data in executor.map(fetch_url, urls.items()):
            results[k] = data if isinstance(data, list) else []
            if not isinstance(data, list):
                logger.warning("Explore feed %s returned non-list", k)

    content_items = []
    for t in results.get("collections", []): content_items.append(parse_topic_item(t, "Коллекция"))
    for t in results.get("critiques", []): content_items.append(parse_topic_item(t, "Рецензия"))
    for t in results.get("articles", []): content_items.append(parse_topic_item(t, "Статья"))

    hot_items = [parse_topic_item(t, "Обсуждение") for t in results.get("hot", [])]

    news_topics = results.get("news", [])
    parsed_news = []
    for t in news_topics:
        item = parse_news_topic(t)
        if item:
            parsed_news.append(item)

    logger.info(
        "Explore feed loaded: content=%d hot=%d news=%d",
        len(content_items), len(hot_items), len(parsed_news),
    )
    return jsonify({
        "content": content_items,
        "hot": hot_items,
        "latest": parsed_news[:3],
        "other": parsed_news[3:]
    })


@explore_bp.route("/api/calendar")
@api_route
def get_airing_calendar():
    """Fetch airing anime calendar from Shikimori, grouped by day of the week."""
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/calendar"
    data = fetch_cached_api(url, headers, ttl=1800) or []

    if not isinstance(data, list):
        logger.warning("Calendar API returned non-list")
        return jsonify([])

    anime_ids = [str(entry["anime"]["id"]) for entry in data if entry.get("anime") and entry["anime"].get("id")]
    poster_map = resolve_posters_graphql(anime_ids, headers)

    days_names = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
    
    items = []
    for entry in data:
        anime = entry.get("anime") or {}
        aid = str(anime.get("id"))
        if not anime or not aid:
            continue

        next_ep_at = entry.get("next_episode_at")
        day_of_week = None
        time_str = ""
        date_str = ""

        if next_ep_at:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(next_ep_at.replace("Z", "+00:00"))
                day_of_week = dt.weekday()  # 0=Monday, 6=Sunday
                time_str = dt.strftime("%H:%M")
                date_str = dt.strftime("%d.%m")
            except Exception as exc:
                logger.debug("Failed to parse date %s: %s", next_ep_at, exc)

        poster = poster_map.get(aid) or fix_image_url(anime.get("image"))

        items.append({
            "id": anime.get("id"),
            "name": anime.get("name"),
            "russian": anime.get("russian") or anime.get("name"),
            "image": poster,
            "score": anime.get("score"),
            "kind": (anime.get("kind") or "").upper(),
            "status": anime.get("status"),
            "episodes": anime.get("episodes"),
            "episodes_aired": anime.get("episodes_aired"),
            "next_episode": entry.get("next_episode"),
            "next_episode_at": next_ep_at,
            "day_of_week": day_of_week,
            "day_name": days_names[day_of_week] if day_of_week is not None else "Скоро",
            "time_str": time_str,
            "date_str": date_str,
        })

    logger.debug("Airing calendar loaded: %d items", len(items))
    return jsonify(items)


@explore_bp.route("/api/catalog")
@api_route
def get_catalog():
    """Advanced catalog search with filtering via GraphQL."""
    page = request.args.get("page", 1, type=int)
    limit = min(request.args.get("limit", 24, type=int), 50)
    order = request.args.get("order", "ranked")
    kind = request.args.get("kind", "")
    status = request.args.get("status", "")
    season = request.args.get("season", "")
    score = request.args.get("score", "")
    genre = request.args.get("genre", "")
    search_q = request.args.get("search", "").strip()

    query = """
    query CatalogQuery(
      $page: Int,
      $limit: Int,
      $order: OrderEnum,
      $kind: AnimeKindString,
      $status: AnimeStatusString,
      $season: SeasonString,
      $score: Int,
      $genre: String,
      $search: String
    ) {
      animes(
        page: $page,
        limit: $limit,
        order: $order,
        kind: $kind,
        status: $status,
        season: $season,
        score: $score,
        genre: $genre,
        search: $search
      ) {
        id
        name
        russian
        score
        kind
        status
        episodes
        episodesAired
        airedOn { year }
        poster { mainUrl originalUrl }
        genres { id name russian }
      }
    }
    """
    gql_vars = {
        "page": page,
        "limit": limit,
        "order": order if order else "ranked"
    }
    if kind: gql_vars["kind"] = kind
    if status: gql_vars["status"] = status
    if season: gql_vars["season"] = season
    if score and str(score).isdigit(): gql_vars["score"] = int(score)
    if genre: gql_vars["genre"] = str(genre)
    if search_q: gql_vars["search"] = search_q

    gql_data = fetch_graphql(query, gql_vars, ttl=600)
    if gql_data and isinstance(gql_data.get("animes"), list):
        results = []
        for item in gql_data["animes"]:
            p = item.get("poster") or {}
            poster = p.get("mainUrl") or p.get("originalUrl") or ""
            genres = [g.get("russian") or g.get("name") for g in item.get("genres", []) if g]
            year = str(item.get("airedOn", {}).get("year") or "") if isinstance(item.get("airedOn"), dict) else ""
            results.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "russian": item.get("russian") or item.get("name"),
                "image": fix_image_url(poster),
                "score": item.get("score"),
                "kind": (item.get("kind") or "").upper(),
                "status": item.get("status"),
                "episodes": item.get("episodes"),
                "episodes_aired": item.get("episodes_aired"),
                "year": year,
                "genres": genres,
            })
        logger.debug("Catalog page=%s returned %d items via GraphQL", page, len(results))
        return jsonify(results)

    # Fallback to REST API if GraphQL returned nothing
    headers = {"User-Agent": APP_NAME}
    params = {"page": page, "limit": limit, "order": order}
    if kind: params["kind"] = kind
    if status: params["status"] = status
    if season: params["season"] = season
    if score: params["score"] = score
    if genre: params["genre"] = genre
    if search_q: params["search"] = search_q

    query_str = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    url = f"{SHIKIMORI_BASE}/api/animes?{query_str}"
    data = fetch_cached_api(url, headers, ttl=600) or []
    if not isinstance(data, list):
        logger.warning("Catalog REST fallback returned non-list")
        return jsonify([])

    anime_ids = [str(item["id"]) for item in data if item.get("id")]
    poster_map = resolve_posters_graphql(anime_ids, headers)

    results = []
    for item in data:
        aid = str(item.get("id"))
        poster = poster_map.get(aid) or fix_image_url(item.get("image"))
        genres = [g.get("russian") or g.get("name") for g in item.get("genres", [])] if item.get("genres") else []
        results.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "russian": item.get("russian") or item.get("name"),
            "image": poster,
            "score": item.get("score"),
            "kind": (item.get("kind") or "").upper(),
            "status": item.get("status"),
            "episodes": item.get("episodes"),
            "episodes_aired": item.get("episodes_aired"),
            "year": (item.get("aired_on") or "")[:4],
            "genres": genres,
        })

    logger.debug("Catalog page=%s returned %d items via REST fallback", page, len(results))
    return jsonify(results)


@explore_bp.route("/api/random")
@api_route
def get_random_anime():
    """Get a random high-rated anime via GraphQL."""
    page = random.randint(1, 10)
    query = """
    query RandomAnime($page: Int) {
      animes(order: popularity, score: 7, limit: 50, page: $page, kind: "tv,movie") {
        id
        name
        russian
        score
        kind
        airedOn { year }
        poster { mainUrl originalUrl }
      }
    }
    """
    data = fetch_graphql(query, {"page": page}, ttl=1800)
    animes = data.get("animes", []) if data else []
    if not animes:
        data = fetch_graphql(query, {"page": 1}, ttl=1800)
        animes = data.get("animes", []) if data else []

    if animes:
        chosen = random.choice(animes)
        p = chosen.get("poster") or {}
        poster = p.get("mainUrl") or p.get("originalUrl") or ""
        year = str(chosen.get("airedOn", {}).get("year") or "") if isinstance(chosen.get("airedOn"), dict) else ""
        return jsonify({
            "id": chosen.get("id"),
            "name": chosen.get("name"),
            "russian": chosen.get("russian") or chosen.get("name"),
            "image": fix_image_url(poster),
            "score": chosen.get("score"),
            "kind": (chosen.get("kind") or "").upper(),
            "year": year,
        })

    raise AppError("Не удалось подобрать случайное аниме", 502)


@explore_bp.route("/api/genres")
@api_route
def get_genres():
    """Get list of anime genres via GraphQL."""
    query = """
    query {
      genres(entryType: Anime) {
        id
        name
        russian
        kind
      }
    }
    """
    data = fetch_graphql(query, ttl=86400)
    if data and isinstance(data.get("genres"), list) and data["genres"]:
        return jsonify(data["genres"])

    # Fallback to REST if GraphQL empty
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/genres"
    rest_data = fetch_cached_api(url, headers, ttl=86400) or []
    if isinstance(rest_data, list):
        anime_genres = [
            {"id": g["id"], "name": g.get("russian") or g.get("name"), "kind": g.get("kind")}
            for g in rest_data
            if isinstance(g, dict) and g.get("entry_type") == "Anime"
        ]
        return jsonify(anime_genres)

    return jsonify([])


@explore_bp.route("/api/recommendations")
@api_route
def get_recommendations():
    """Get smart / popular recommendations."""
    headers = {"User-Agent": APP_NAME}
    # Get top trending / popular of the season
    url = f"{SHIKIMORI_BASE}/api/animes?order=popularity&limit=12&score=7.5&kind=tv,movie"
    data = fetch_cached_api(url, headers, ttl=3600) or []

    results = []
    if isinstance(data, list):
        for item in data:
            results.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "russian": item.get("russian") or item.get("name"),
                "image": fix_image_url(item.get("image")),
                "score": item.get("score"),
                "kind": (item.get("kind") or "").upper(),
                "year": (item.get("aired_on") or "")[:4],
                "status": item.get("status"),
            })

    return jsonify(results)

