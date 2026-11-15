import re
import logging
from typing import Dict, List, Optional, Union, Any

logger = logging.getLogger("shikimxapp.poster_resolver")

_franchise_poster_mem_cache: Dict[tuple, str] = {}


def fix_image_url(image_data: Union[dict, str, None], high_res: bool = False) -> str:
    """Normalize and resolve full Shikimori CDN URLs for anime and manga posters/avatars."""
    if not image_data:
        return ""
    if isinstance(image_data, dict):
        if high_res:
            path = (
                image_data.get("original")
                or image_data.get("x160")
                or image_data.get("preview")
                or image_data.get("main")
                or ""
            )
        else:
            path = (
                image_data.get("preview")
                or image_data.get("x160")
                or image_data.get("main")
                or image_data.get("original")
                or ""
            )
    else:
        path = str(image_data)
        if "/clubs/" in path:
            path = re.sub(r"/preview/", "/main/", path)
        elif high_res:
            path = re.sub(r"/(x64|x32|preview)/", "/original/", path)
        elif "/animes/" in path or "/mangas/" in path:
            path = re.sub(r"/original/", "/preview/", path)

    if (
        not path
        or path == "None"
        or path == "{}"
        or "missing_original" in path
        or "missing_preview" in path
        or "missing_avatar" in path
    ):
        return ""
    if not path.startswith("http://") and not path.startswith("https://"):
        if not path.startswith("/"):
            path = "/" + path
        path = f"https://shikimori.io{path}"

    return path


def resolve_posters_graphql(anime_ids: List[Union[int, str]], headers: Optional[dict] = None) -> Dict[str, str]:
    """Query Shikimori GraphQL to resolve high-res webp poster URLs for anime IDs."""
    if not anime_ids:
        return {}

    # Import locally to avoid circular dependency
    from services.api_client import fetch_graphql

    poster_map: Dict[str, str] = {}
    ids_list = [str(x) for x in anime_ids if str(x).isdigit()]
    for i in range(0, len(ids_list), 50):
        batch = ids_list[i : i + 50]
        query = """
        query BatchPosters($ids: String!) {
          animes(ids: $ids, limit: 50) {
            id
            poster {
              mainUrl
              originalUrl
            }
          }
        }
        """
        try:
            data = fetch_graphql(query, {"ids": ",".join(batch)}, headers=headers, ttl=3600)
            if data and isinstance(data.get("animes"), list):
                for a in data["animes"]:
                    p = a.get("poster")
                    if p:
                        url = p.get("mainUrl") or p.get("originalUrl")
                        if url:
                            poster_map[str(a["id"])] = fix_image_url(url)
        except Exception as exc:
            logger.debug("Failed to resolve GraphQL posters: %s", exc)
    return poster_map


def resolve_single_anime_poster_graphql(anime_id: Union[int, str], headers: Optional[dict] = None) -> str:
    """Query Shikimori GraphQL for a single anime poster URL in high resolution."""
    if not anime_id:
        return ""
    from services.api_client import fetch_graphql

    query = """
    query SinglePoster($id: String!) {
      animes(ids: $id, limit: 1) {
        id
        poster {
          originalUrl
          mainUrl
        }
      }
    }
    """
    try:
        data = fetch_graphql(query, {"id": str(anime_id)}, headers=headers, ttl=3600)
        if data and isinstance(data.get("animes"), list) and len(data["animes"]) > 0:
            p = data["animes"][0].get("poster")
            if p:
                url = p.get("originalUrl") or p.get("mainUrl")
                if url:
                    return fix_image_url(url, high_res=True)
    except Exception as exc:
        logger.debug("Failed to resolve single GraphQL poster: %s", exc)
    return ""


def resolve_manga_posters_graphql(manga_ids: List[Union[int, str]], headers: Optional[dict] = None) -> Dict[str, str]:
    """Query Shikimori GraphQL to resolve high-res webp poster URLs for manga IDs."""
    if not manga_ids:
        return {}

    from services.api_client import fetch_graphql

    poster_map: Dict[str, str] = {}
    ids_list = [str(x) for x in manga_ids if str(x).isdigit()]
    for i in range(0, len(ids_list), 50):
        batch = ids_list[i : i + 50]
        query = """
        query BatchMangaPosters($ids: String!) {
          mangas(ids: $ids, limit: 50) {
            id
            poster {
              mainUrl
              originalUrl
            }
          }
        }
        """
        try:
            data = fetch_graphql(query, {"ids": ",".join(batch)}, headers=headers, ttl=3600)
            if data and isinstance(data.get("mangas"), list):
                for m in data["mangas"]:
                    p = m.get("poster")
                    if p:
                        url = p.get("mainUrl") or p.get("originalUrl")
                        if url:
                            poster_map[str(m["id"])] = fix_image_url(url)
        except Exception as exc:
            logger.debug("Failed to resolve GraphQL manga posters: %s", exc)
    return poster_map


def resolve_franchise_poster(item_id: Union[int, str], is_manga: bool = False) -> str:
    """Fallback to franchise / predecessor / related poster if current title has no poster on Shikimori."""
    if not item_id:
        return ""
    cache_key = (str(item_id), bool(is_manga))
    if cache_key in _franchise_poster_mem_cache:
        return _franchise_poster_mem_cache[cache_key]

    from services.api_client import fetch_cached_api, SHIKIMORI_BASE, APP_NAME

    media_type = "mangas" if is_manga else "animes"
    headers = {"User-Agent": APP_NAME}
    result_url = ""

    # 1. Try franchise tree
    url = f"{SHIKIMORI_BASE}/api/{media_type}/{item_id}/franchise"
    try:
        data = fetch_cached_api(url, headers, ttl=86400)
        if data and isinstance(data, dict):
            nodes = data.get("nodes", [])
            for n in nodes:
                img = n.get("image_url") or ""
                if img and "missing_" not in img:
                    cleaned = re.sub(r"/(x96|x48|preview)/", "/original/", img)
                    result_url = fix_image_url(cleaned, high_res=True)
                    break
    except Exception as e:
        logger.debug("Franchise poster lookup error for %s (%s): %s", item_id, media_type, e)

    # 2. Try related entries (adaptation, prequel, sequel, etc.)
    if not result_url:
        rel_url = f"{SHIKIMORI_BASE}/api/{media_type}/{item_id}/related"
        try:
            rel_data = fetch_cached_api(rel_url, headers, ttl=86400)
            if rel_data and isinstance(rel_data, list):
                for entry in rel_data:
                    rel = entry.get("anime") or entry.get("manga") or {}
                    img_obj = rel.get("image") or {}
                    if isinstance(img_obj, dict):
                        img = img_obj.get("original") or img_obj.get("main") or img_obj.get("preview") or ""
                    else:
                        img = str(img_obj)
                    if img and "missing_" not in img:
                        cleaned = re.sub(r"/(x96|x48|preview)/", "/original/", img)
                        result_url = fix_image_url(cleaned, high_res=True)
                        break
        except Exception as e:
            logger.debug("Related poster lookup error for %s (%s): %s", item_id, media_type, e)

    _franchise_poster_mem_cache[cache_key] = result_url
    return result_url
