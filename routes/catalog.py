import re
import random
import logging
import requests
from flask import Blueprint, jsonify, request
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    fetch_graphql, resolve_posters_graphql
)
from routes.news import parse_news_topic
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.catalog")
catalog_bp = Blueprint('catalog', __name__)


@catalog_bp.route("/api/catalog")
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
    if season and season not in ("popularity", "ranked", "aired_on", "name", "id", "random", "status", "episodes"):
        if re.search(r'\d', season):
            gql_vars["season"] = season
        else:
            logger.warning("Ignoring invalid season parameter: %r", season)
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
                "episodes_aired": item.get("episodesAired") or item.get("episodes_aired"),
                "year": year,
                "genres": genres,
            })
        logger.debug("Catalog page=%s returned %d items via GraphQL", page, len(results))
        return jsonify(results)

    # Fallback to REST API
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


@catalog_bp.route("/api/random")
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


@catalog_bp.route("/api/genres")
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
        genres_list = [
            {
                "id": g.get("id"),
                "name": g.get("russian") or g.get("name"),
                "english": g.get("name"),
                "russian": g.get("russian"),
                "kind": g.get("kind"),
            }
            for g in data["genres"]
            if isinstance(g, dict)
        ]
        return jsonify(genres_list)

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


@catalog_bp.route("/api/recommendations")
@api_route
def get_recommendations():
    """Get smart / popular recommendations with multi-page support."""
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 36)), 50)

    query = """
    query GetRecommendations($page: Int, $limit: Int) {
      animes(order: popularity, page: $page, limit: $limit, score: 7, kind: "tv,movie") {
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
    gql_data = fetch_graphql(query, {"page": page, "limit": limit}, ttl=3600)
    items = gql_data.get("animes", []) if gql_data else []
    if not items:
        headers = {"User-Agent": APP_NAME}
        url = f"{SHIKIMORI_BASE}/api/animes?order=popularity&page={page}&limit={limit}&score=7&kind=tv,movie"
        items = fetch_cached_api(url, headers, ttl=3600) or []

    results = []
    seen_ids = set()
    for item in items:
        item_id = item.get("id")
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        p = item.get("poster") or {}
        poster = p.get("mainUrl") or p.get("originalUrl") or item.get("image") or ""
        year = str(item.get("airedOn", {}).get("year") or "") if isinstance(item.get("airedOn"), dict) else (item.get("aired_on") or "")[:4]
        results.append({
            "id": item_id,
            "name": item.get("name"),
            "russian": item.get("russian") or item.get("name"),
            "image": fix_image_url(poster),
            "score": item.get("score"),
            "kind": (item.get("kind") or "").upper(),
            "year": year,
            "status": item.get("status"),
        })

    return jsonify(results)


@catalog_bp.route("/api/top100")
@api_route
def get_top100():
    """Get Top 100 anime/manga/movie/ongoing with ranks."""
    top_type = request.args.get("type", "anime")
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 100)), 100)

    if top_type == "manga":
        query = """
        query TopManga($page: Int, $limit: Int) {
          mangas(order: ranked, limit: $limit, page: $page) {
            id
            name
            russian
            score
            kind
            volumes
            chapters
            status
            poster { mainUrl originalUrl }
            genres { id name russian }
          }
        }
        """
        items = []
        if limit > 50:
            gql1 = fetch_graphql(query, {"page": 1, "limit": 50}, ttl=1800)
            gql2 = fetch_graphql(query, {"page": 2, "limit": 50}, ttl=1800)
            items = (gql1.get("mangas", []) if gql1 else []) + (gql2.get("mangas", []) if gql2 else [])
        else:
            gql_data = fetch_graphql(query, {"page": page, "limit": limit}, ttl=1800)
            items = gql_data.get("mangas", []) if gql_data else []

        if not items:
            headers = {"User-Agent": APP_NAME}
            if limit > 50:
                url1 = f"{SHIKIMORI_BASE}/api/mangas?order=ranked&page=1&limit=50"
                url2 = f"{SHIKIMORI_BASE}/api/mangas?order=ranked&page=2&limit=50"
                r1 = fetch_cached_api(url1, headers, ttl=1800) or []
                r2 = fetch_cached_api(url2, headers, ttl=1800) or []
                items = (r1 if isinstance(r1, list) else []) + (r2 if isinstance(r2, list) else [])
            else:
                url = f"{SHIKIMORI_BASE}/api/mangas?order=ranked&page={page}&limit={limit}"
                items = fetch_cached_api(url, headers, ttl=1800) or []

        results = []
        base_rank = (page - 1) * limit
        for idx, item in enumerate(items, 1):
            p = item.get("poster") or {}
            poster = p.get("mainUrl") or p.get("originalUrl") or item.get("image") or ""
            genres = [g.get("russian") or g.get("name") for g in item.get("genres", []) if g]
            img_url = fix_image_url(poster)
            results.append({
                "rank": base_rank + idx,
                "id": item.get("id"),
                "name": item.get("name"),
                "russian": item.get("russian") or item.get("name"),
                "image": img_url or "",
                "score": item.get("score"),
                "kind": (item.get("kind") or "").upper(),
                "status": item.get("status"),
                "chapters": item.get("chapters"),
                "volumes": item.get("volumes"),
                "genres": genres,
                "is_manga": True
            })
        return jsonify(results)

    # Anime Top variants
    kind_filter = None
    status_filter = None
    if top_type == "movie":
        kind_filter = "movie"
    elif top_type == "ongoing":
        status_filter = "ongoing"

    query = """
    query TopAnime($page: Int, $limit: Int, $kind: AnimeKindString, $status: AnimeStatusString) {
      animes(order: ranked, limit: $limit, page: $page, kind: $kind, status: $status) {
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
    vars_dict = {"page": page, "limit": limit}
    if kind_filter: vars_dict["kind"] = kind_filter
    if status_filter: vars_dict["status"] = status_filter

    items = []
    if limit > 50:
        vars1 = dict(vars_dict, page=1, limit=50)
        vars2 = dict(vars_dict, page=2, limit=50)
        gql1 = fetch_graphql(query, vars1, ttl=1800)
        gql2 = fetch_graphql(query, vars2, ttl=1800)
        items = (gql1.get("animes", []) if gql1 else []) + (gql2.get("animes", []) if gql2 else [])
    else:
        gql_data = fetch_graphql(query, vars_dict, ttl=1800)
        items = gql_data.get("animes", []) if gql_data else []

    if not items:
        headers = {"User-Agent": APP_NAME}
        kind_q = f"&kind={kind_filter}" if kind_filter else ""
        status_q = f"&status={status_filter}" if status_filter else ""
        if limit > 50:
            url1 = f"{SHIKIMORI_BASE}/api/animes?order=ranked&page=1&limit=50{kind_q}{status_q}"
            url2 = f"{SHIKIMORI_BASE}/api/animes?order=ranked&page=2&limit=50{kind_q}{status_q}"
            r1 = fetch_cached_api(url1, headers, ttl=1800) or []
            r2 = fetch_cached_api(url2, headers, ttl=1800) or []
            items = (r1 if isinstance(r1, list) else []) + (r2 if isinstance(r2, list) else [])
        else:
            url = f"{SHIKIMORI_BASE}/api/animes?order=ranked&page={page}&limit={limit}{kind_q}{status_q}"
            items = fetch_cached_api(url, headers, ttl=1800) or []

    results = []
    base_rank = (page - 1) * limit
    for idx, item in enumerate(items, 1):
        p = item.get("poster") or {}
        poster = p.get("mainUrl") or p.get("originalUrl") or item.get("image") or ""
        genres = [g.get("russian") or g.get("name") for g in item.get("genres", []) if g]
        year = str(item.get("airedOn", {}).get("year") or "") if isinstance(item.get("airedOn"), dict) else (item.get("aired_on") or "")[:4]
        img_url = fix_image_url(poster)
        results.append({
            "rank": base_rank + idx,
            "id": item.get("id"),
            "name": item.get("name"),
            "russian": item.get("russian") or item.get("name"),
            "image": img_url or "",
            "score": item.get("score"),
            "kind": (item.get("kind") or "").upper(),
            "status": item.get("status"),
            "episodes": item.get("episodes"),
            "episodes_aired": item.get("episodesAired") or item.get("episodes_aired"),
            "year": year,
            "genres": genres,
            "is_manga": False
        })
    return jsonify(results)


@catalog_bp.route("/api/manga/catalog")
@api_route
def get_manga_catalog():
    """Get Manga catalog with filters."""
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 24)), 48)
    kind = request.args.get("kind")
    status = request.args.get("status")
    order = request.args.get("order", "ranked")
    search_q = request.args.get("search")

    query = """
    query MangaCatalog($page: Int, $limit: Int, $order: OrderEnum, $kind: MangaKindString, $status: MangaStatusString, $search: String) {
      mangas(page: $page, limit: $limit, order: $order, kind: $kind, status: $status, search: $search) {
        id
        name
        russian
        score
        kind
        status
        volumes
        chapters
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
    if search_q: gql_vars["search"] = search_q

    gql_data = fetch_graphql(query, gql_vars, ttl=600)
    if gql_data and isinstance(gql_data.get("mangas"), list):
        results = []
        for item in gql_data["mangas"]:
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
                "chapters": item.get("chapters"),
                "volumes": item.get("volumes"),
                "year": year,
                "genres": genres,
            })
        return jsonify(results)

    headers = {"User-Agent": APP_NAME}
    params = {"page": page, "limit": limit, "order": order}
    if kind: params["kind"] = kind
    if status: params["status"] = status
    if search_q: params["search"] = search_q

    query_str = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    url = f"{SHIKIMORI_BASE}/api/mangas?{query_str}"
    data = fetch_cached_api(url, headers, ttl=600) or []
    results = []
    if isinstance(data, list):
        for item in data:
            genres = [g.get("russian") or g.get("name") for g in item.get("genres", [])] if item.get("genres") else []
            results.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "russian": item.get("russian") or item.get("name"),
                "image": fix_image_url(item.get("image")),
                "score": item.get("score"),
                "kind": (item.get("kind") or "").upper(),
                "status": item.get("status"),
                "chapters": item.get("chapters"),
                "volumes": item.get("volumes"),
                "year": (item.get("aired_on") or "")[:4],
                "genres": genres,
            })
    return jsonify(results)


@catalog_bp.route("/api/ranobe/catalog")
@api_route
def get_ranobe_catalog():
    """Get Ranobe / Light novel catalog."""
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 24)), 48)
    status = request.args.get("status")
    order = request.args.get("order", "ranked")
    search_q = request.args.get("search")

    headers = {"User-Agent": APP_NAME}
    params = {"page": page, "limit": limit, "order": order}
    if status: params["status"] = status
    if search_q: params["search"] = search_q

    query_str = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    url = f"{SHIKIMORI_BASE}/api/ranobe?{query_str}"
    data = fetch_cached_api(url, headers, ttl=600) or []
    results = []
    if isinstance(data, list):
        for item in data:
            genres = [g.get("russian") or g.get("name") for g in item.get("genres", [])] if item.get("genres") else []
            results.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "russian": item.get("russian") or item.get("name"),
                "image": fix_image_url(item.get("image")),
                "score": item.get("score"),
                "kind": "РАНОБЭ",
                "status": item.get("status"),
                "chapters": item.get("chapters"),
                "volumes": item.get("volumes"),
                "year": (item.get("aired_on") or "")[:4],
                "genres": genres,
            })
    return jsonify(results)


@catalog_bp.route("/api/collections/catalog")
@api_route
def get_collections_catalog():
    """Get user collections from topics with multi-page support."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 60))
    search_q = request.args.get("search") or request.args.get("q")

    headers = {"User-Agent": APP_NAME}
    search_param = f"&search={requests.utils.quote(search_q)}" if search_q else ""

    if limit > 30:
        url1 = f"{SHIKIMORI_BASE}/api/topics?forum=collections&page={(page - 1) * 2 + 1}&limit=30{search_param}"
        url2 = f"{SHIKIMORI_BASE}/api/topics?forum=collections&page={(page - 1) * 2 + 2}&limit=30{search_param}"
        r1 = fetch_cached_api(url1, headers, ttl=1800) or []
        r2 = fetch_cached_api(url2, headers, ttl=1800) or []
        data = (r1 if isinstance(r1, list) else []) + (r2 if isinstance(r2, list) else [])
    else:
        url = f"{SHIKIMORI_BASE}/api/topics?forum=collections&page={page}&limit={limit}{search_param}"
        data = fetch_cached_api(url, headers, ttl=1800) or []

    results = []
    seen_ids = set()
    if isinstance(data, list):
        for t in data:
            tid = t.get("id")
            if tid in seen_ids:
                continue
            seen_ids.add(tid)
            parsed = parse_news_topic(t)
            if not parsed:
                continue
            results.append({
                "id": tid,
                "title": parsed["title"],
                "url": parsed["url"],
                "image": parsed["image"],
                "author": parsed["author"],
                "comments_count": parsed["comments_count"],
                "date": parsed["date"],
            })

    return jsonify(results)
