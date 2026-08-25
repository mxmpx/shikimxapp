import os
import re
import time
import logging
import requests
import json
from flask import session
from database import get_connection
from dotenv import load_dotenv
from markupsafe import Markup
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

logger = logging.getLogger("shikimxapp.utils")

SHIKIMORI_BASE = "https://shikimori.io"
CLIENT_ID = os.getenv("SHIKIMORI_CLIENT_ID")
CLIENT_SECRET = os.getenv("SHIKIMORI_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SHIKIMORI_REDIRECT_URI", "http://127.0.0.1:5000/auth/callback")
APP_NAME = os.getenv("SHIKIMORI_APP_NAME", "MyLocalApp/1.0")
AUTH_URL = f"{SHIKIMORI_BASE}/oauth/authorize"
TOKEN_URL = f"{SHIKIMORI_BASE}/oauth/token"
WHOAMI_URL = f"{SHIKIMORI_BASE}/api/users/whoami"

_API_CACHE_CLEANUP_INTERVAL = 300
_last_api_cache_cleanup = 0


def _cleanup_api_cache(force=False):
    global _last_api_cache_cleanup
    now = time.time()
    if not force and now - _last_api_cache_cleanup < _API_CACHE_CLEANUP_INTERVAL:
        return
    _last_api_cache_cleanup = now
    
    try:
        conn = get_connection()
        conn.execute("DELETE FROM api_cache WHERE expires_at <= ?", (now,))
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error cleaning API cache: %s", exc)

def fetch_with_retry(url, headers):
    last_status = None
    for attempt in range(4):
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                return r.json()
            last_status = r.status_code
            if r.status_code == 429:
                logger.warning("Rate limit 429 for %s (attempt %d/4)", url, attempt + 1)
                time.sleep(0.3 * (attempt + 1))
            else:
                logger.warning("API %s returned %s (attempt %d/4)", url, r.status_code, attempt + 1)
        except requests.RequestException as exc:
            logger.warning("Request failed for %s (attempt %d/4): %s", url, attempt + 1, exc)
            time.sleep(0.2)
    logger.error("All retry attempts failed for %s (last status: %s)", url, last_status)
    return None

def fetch_cached_api(url, headers, ttl=1800):
    _cleanup_api_cache()
    now = time.time()
    
    conn = None
    try:
        conn = get_connection()
        row = conn.execute("SELECT data, expires_at FROM api_cache WHERE url = ?", (url,)).fetchone()
        if row:
            if now < row['expires_at']:
                conn.close()
                return json.loads(row['data'])
            conn.execute("DELETE FROM api_cache WHERE url = ?", (url,))
            conn.commit()
    except Exception as exc:
        logger.error("Error reading API cache: %s", exc)
    
    data = fetch_with_retry(url, headers)
    if data is not None:
        try:
            if conn is None:
                conn = get_connection()
            conn.execute("INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)", (url, json.dumps(data), now + ttl))
            conn.commit()
        except Exception as exc:
            logger.error("Error writing API cache: %s", exc)
    else:
        logger.warning("Failed to fetch API data: %s", url)
        
    if conn:
        conn.close()
    return data

def fetch_user_rate(target_id, target_type):
    """Fetch user rate for a given target (Anime/Manga). Returns dict or None."""
    user_id = session.get("user_id")
    auth_headers = get_auth_headers()
    if not user_id or not auth_headers:
        return None
    rate_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
    try:
        rate_data = fetch_with_retry(rate_url, auth_headers)
        if rate_data and isinstance(rate_data, list) and len(rate_data) > 0:
            item = rate_data[0]
            return {
                "id": item.get("id"),
                "status": item.get("status"),
                "score": item.get("score", 0),
                "episodes": item.get("episodes", 0),
                "chapters": item.get("chapters", 0),
                "volumes": item.get("volumes", 0),
                "text": item.get("text", "") or "",
                "rewatches": item.get("rewatches", 0)
            }
    except Exception as exc:
        logger.debug("Could not load user rate for %s %s: %s", target_type, target_id, exc)
    return None


def invalidate_user_rates_cache():
    """Clear cached rates when user modifies a rate."""
    user_id = session.get("user_id")
    if not user_id:
        return
    prefix = f"{SHIKIMORI_BASE}/api/v2/user_rates"
    try:
        conn = get_connection()
        conn.execute("DELETE FROM api_cache WHERE url LIKE ?", (f"{prefix}%{user_id}%",))
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error invalidating API cache: %s", exc)



def get_auth_headers():
    access_token = session.get("access_token")
    if not access_token:
        return None
    return {"User-Agent": APP_NAME, "Authorization": f"Bearer {access_token}"}

def fix_image_url(image_data, high_res=False):
    if not image_data:
        return ""
    if isinstance(image_data, dict):
        if high_res:
            path = image_data.get("original") or image_data.get("x160") or image_data.get("preview") or image_data.get("main") or ""
        else:
            path = image_data.get("x160") or image_data.get("preview") or image_data.get("main") or image_data.get("original") or ""
    else:
        path = str(image_data)
        if high_res:
            path = re.sub(r"/(x64|x32|preview)/", "/original/", path)

    if not path or path == "None" or path == "{}" or "missing_original" in path or "missing_preview" in path:
        return ""
    if not path.startswith("http://") and not path.startswith("https://"):
        if not path.startswith("/"):
            path = "/" + path
        path = f"https://shikimori.io{path}"

    return path

def resolve_posters_graphql(anime_ids, headers=None):
    """Query Shikimori GraphQL to resolve high-res webp poster URLs for anime IDs."""
    if not anime_ids:
        return {}
    if headers is None:
        headers = {"User-Agent": APP_NAME}

    poster_map = {}
    ids_list = [str(x) for x in anime_ids if str(x).isdigit()]
    for i in range(0, len(ids_list), 50):
        batch = ids_list[i:i + 50]
        query = f"""
        query {{
          animes(ids: "{','.join(batch)}", limit: 50) {{
            id
            poster {{
              mainUrl
              originalUrl
            }}
          }}
        }}
        """
        try:
            r = requests.post(f"{SHIKIMORI_BASE}/api/graphql", json={"query": query}, headers=headers, timeout=6)
            if r.status_code == 200:
                for a in r.json().get("data", {}).get("animes", []):
                    p = a.get("poster")
                    if p:
                        url = p.get("mainUrl") or p.get("originalUrl")
                        if url:
                            poster_map[str(a["id"])] = fix_image_url(url)
        except Exception as exc:
            logger.debug("Failed to resolve GraphQL posters: %s", exc)
    return poster_map


def resolve_single_anime_poster_graphql(anime_id, headers=None):
    """Query Shikimori GraphQL for a single anime poster URL in high resolution."""
    if not anime_id:
        return ""
    if headers is None:
        headers = {"User-Agent": APP_NAME}
    query = f"""
    query {{
      animes(ids: "{anime_id}", limit: 1) {{
        id
        poster {{
          originalUrl
          mainUrl
        }}
      }}
    }}
    """
    try:
        r = requests.post(f"{SHIKIMORI_BASE}/api/graphql", json={"query": query}, headers=headers, timeout=6)
        if r.status_code == 200:
            animes = r.json().get("data", {}).get("animes", [])
            if animes:
                p = animes[0].get("poster")
                if p:
                    url = p.get("originalUrl") or p.get("mainUrl")
                    if url:
                        return fix_image_url(url, high_res=True)
    except Exception as exc:
        logger.debug("Failed to resolve single GraphQL poster: %s", exc)
    return ""



def parse_shikimori_bbcode(text):
    if not text:
        return ""
    text = re.sub(r'\[center\](.*?)\[/center\]', r'<div style="text-align: center;">\1</div>', text, flags=re.DOTALL)
    text = re.sub(r'\[size=(\d+)\](.*?)\[/size\]', r'<span style="font-size: \1px;">\2</span>', text, flags=re.DOTALL)

    def replace_shiki_tag(m):
        tag_type, attr_str = m.group(1), m.group(2)
        ids_match = re.search(r'ids=([\d,]+)', attr_str)
        cols_match = re.search(r'columns=(\d+)', attr_str)
        ids = ids_match.group(1) if ids_match else ''
        cols = cols_match.group(1) if cols_match else ('8' if tag_type == 'characters' else '5')
        wall_class = ' wall-grid' if 'wall' in attr_str else ''
        return f'<div class="shiki-grid{wall_class}" data-type="{tag_type}" data-ids="{ids}" style="--cols: {cols}"></div>'

    text = re.sub(r'\[(animes|characters)\s+([^\]]+)\]', replace_shiki_tag, text)
    return Markup(text)