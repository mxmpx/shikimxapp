import os
import re
import time
import logging
import requests
import json
import threading
import random
import hashlib
from flask import session
from database import get_connection
from dotenv import load_dotenv
from markupsafe import Markup, escape
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


class ShikimoriRateLimiter:
    """
    Потокобезопасный ограничитель частоты запросов (Rate Limiter) к API Shikimori.
    - Максимальная частота: ~3.5 RPS (ниже системного лимита Shikimori 5 RPS).
    - Гарантированная пауза между запросами: не менее 280 мс.
    - Общая блокировка всех потоков при ответе 429 (Too Many Requests).
    """
    def __init__(self, min_interval=0.28):
        self.min_interval = min_interval
        self.last_request_time = 0.0
        self.paused_until = 0.0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            # Если активна общая пауза после 429 ошибки
            if now < self.paused_until:
                sleep_time = self.paused_until - now
                logger.warning("RateLimiter: глобальная пауза 429, ожидание %.2f с", sleep_time)
                time.sleep(sleep_time)
                now = time.time()

            # Соблюдение минимального интервала между любыми запросами
            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)

            self.last_request_time = time.time()

    def report_429(self, retry_after=None):
        with self.lock:
            now = time.time()
            if retry_after is not None:
                try:
                    pause_duration = float(retry_after)
                except (ValueError, TypeError):
                    pause_duration = 3.0
            else:
                pause_duration = 2.5
            pause_duration += random.uniform(0.2, 0.5)
            self.paused_until = max(self.paused_until, now + pause_duration)
            logger.warning("RateLimiter: пауза на %.2f с из-за ответа 429 от Shikimori", pause_duration)


shiki_rate_limiter = ShikimoriRateLimiter(min_interval=0.28)


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
    """Выполнить GET запрос с защитой от 429, уважением Retry-After и экспоненциальным backoff."""
    last_status = None
    for attempt in range(5):
        shiki_rate_limiter.wait()
        try:
            r = requests.get(url, headers=headers, timeout=6)
            if r.status_code == 200:
                return r.json()
            last_status = r.status_code
            if r.status_code == 429:
                retry_after = r.headers.get("Retry-After")
                shiki_rate_limiter.report_429(retry_after)
                wait_sec = float(retry_after) if retry_after else (1.2 * (2 ** attempt) + random.uniform(0.1, 0.4))
                logger.warning("Rate limit 429 для %s (попытка %d/5), ожидание %.2f с", url, attempt + 1, wait_sec)
                time.sleep(wait_sec)
            else:
                logger.warning("API %s вернул статус %s (попытка %d/5)", url, r.status_code, attempt + 1)
                time.sleep(0.4 * (attempt + 1))
        except requests.RequestException as exc:
            logger.warning("Сетевая ошибка для %s (попытка %d/5): %s", url, attempt + 1, exc)
            time.sleep(0.5)

    logger.error("Все попытки исчерпаны для %s (последний статус: %s)", url, last_status)

    # Резервный возврат устаревших данных из кэша, если есть (stale-while-error)
    try:
        conn = get_connection()
        row = conn.execute("SELECT data FROM api_cache WHERE url = ?", (url,)).fetchone()
        conn.close()
        if row:
            logger.warning("Возврат устаревшего кэша для %s после ошибки 429/сбоя", url)
            return json.loads(row['data'])
    except Exception:
        pass

    return None


def fetch_graphql(query, variables=None, headers=None, ttl=1800):
    """Централизованный запуск GraphQL запроса к Shikimori с кэшированием и rate limiter'ом."""
    _cleanup_api_cache()
    now = time.time()

    req_headers = {"User-Agent": APP_NAME, "Content-Type": "application/json"}
    if headers:
        for k, v in headers.items():
            req_headers[k] = v

    cache_payload = json.dumps({"query": query.strip(), "variables": variables or {}}, sort_keys=True)
    cache_key = f"graphql:{hashlib.md5(cache_payload.encode('utf-8')).hexdigest()}"

    try:
        conn = get_connection()
        try:
            row = conn.execute("SELECT data, expires_at FROM api_cache WHERE url = ?", (cache_key,)).fetchone()
            if row:
                if now < row['expires_at']:
                    return json.loads(row['data'])
                conn.execute("DELETE FROM api_cache WHERE url = ?", (cache_key,))
                conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Ошибка чтения GraphQL кэша: %s", exc)

    endpoint = f"{SHIKIMORI_BASE}/api/graphql"
    last_status = None
    data = None

    for attempt in range(5):
        shiki_rate_limiter.wait()
        try:
            r = requests.post(
                endpoint,
                json={"query": query, "variables": variables or {}},
                headers=req_headers,
                timeout=8
            )
            if r.status_code == 200:
                resp_json = r.json()
                data = resp_json.get("data")
                break
            last_status = r.status_code
            if r.status_code == 429:
                retry_after = r.headers.get("Retry-After")
                shiki_rate_limiter.report_429(retry_after)
                wait_sec = float(retry_after) if retry_after else (1.2 * (2 ** attempt) + random.uniform(0.1, 0.4))
                logger.warning("GraphQL 429 rate limit (попытка %d/5), ожидание %.2f с", attempt + 1, wait_sec)
                time.sleep(wait_sec)
            else:
                logger.warning("GraphQL вернул %s (попытка %d/5): %s", r.status_code, attempt + 1, r.text[:150])
                time.sleep(0.4 * (attempt + 1))
        except requests.RequestException as exc:
            logger.warning("GraphQL ошибка сети (попытка %d/5): %s", attempt + 1, exc)
            time.sleep(0.5)

    if data is not None:
        try:
            conn = get_connection()
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                    (cache_key, json.dumps(data), now + ttl)
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            logger.error("Ошибка записи GraphQL кэша: %s", exc)
    else:
        # Резервный возврат устаревших данных
        try:
            conn = get_connection()
            try:
                row = conn.execute("SELECT data FROM api_cache WHERE url = ?", (cache_key,)).fetchone()
                if row:
                    logger.warning("Возврат устаревшего GraphQL кэша после сбоя")
                    data = json.loads(row['data'])
            finally:
                conn.close()
        except Exception:
            pass

    return data


def fetch_cached_api(url, headers, ttl=1800):
    _cleanup_api_cache()
    now = time.time()
    
    try:
        conn = get_connection()
        try:
            row = conn.execute("SELECT data, expires_at FROM api_cache WHERE url = ?", (url,)).fetchone()
            if row:
                if now < row['expires_at']:
                    return json.loads(row['data'])
                conn.execute("DELETE FROM api_cache WHERE url = ?", (url,))
                conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading API cache: %s", exc)
    
    data = fetch_with_retry(url, headers)
    if data is not None:
        try:
            conn = get_connection()
            try:
                conn.execute("INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)", (url, json.dumps(data), now + ttl))
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            logger.error("Error writing API cache: %s", exc)
    else:
        logger.warning("Failed to fetch API data: %s", url)
        
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
                "rewatches": item.get("rewatches", 0),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at")
            }
    except Exception as exc:
        logger.debug("Could not load user rate for %s %s: %s", target_type, target_id, exc)
    return None


def invalidate_user_rates_cache():
    """Clear cached rates and history when user modifies a rate."""
    user_id = session.get("user_id")
    if not user_id:
        return
    prefix = f"{SHIKIMORI_BASE}/api/v2/user_rates"
    try:
        conn = get_connection()
        conn.execute("DELETE FROM api_cache WHERE url LIKE ?", (f"{prefix}%{user_id}%",))
        conn.execute("DELETE FROM api_cache WHERE url = ?", (f"history:user_{user_id}",))
        conn.execute("DELETE FROM api_cache WHERE url = ?", (f"rates:user_{user_id}",))
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.error("Error invalidating API cache: %s", exc)
    try:
        from routes.history import invalidate_user_history_cache
        invalidate_user_history_cache(user_id)
    except Exception:
        pass
    try:
        from routes.rates import invalidate_user_rates_mem_cache
        invalidate_user_rates_mem_cache(user_id)
    except Exception:
        pass



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

    poster_map = {}
    ids_list = [str(x) for x in anime_ids if str(x).isdigit()]
    for i in range(0, len(ids_list), 50):
        batch = ids_list[i:i + 50]
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


def resolve_single_anime_poster_graphql(anime_id, headers=None):
    """Query Shikimori GraphQL for a single anime poster URL in high resolution."""
    if not anime_id:
        return ""
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


def resolve_franchise_poster(item_id, is_manga=False):
    """Fallback to franchise / predecessor poster if current title has no poster on Shikimori."""
    if not item_id:
        return ""
    media_type = "mangas" if is_manga else "animes"
    url = f"{SHIKIMORI_BASE}/api/{media_type}/{item_id}/franchise"
    headers = {"User-Agent": APP_NAME}
    try:
        data = fetch_cached_api(url, headers, ttl=86400)
        if data and isinstance(data, dict):
            nodes = data.get("nodes", [])
            for n in nodes:
                img = n.get("image_url") or ""
                if img and "missing_" not in img:
                    cleaned = re.sub(r"/(x96|x48|preview)/", "/original/", img)
                    return fix_image_url(cleaned, high_res=True)
    except Exception as e:
        logger.debug("Franchise poster lookup error for %s (%s): %s", item_id, media_type, e)
    return ""




def parse_shikimori_bbcode(text):
    if not text:
        return ""
    escaped_text = str(escape(text))
    escaped_text = re.sub(r'\[center\](.*?)\[/center\]', r'<div style="text-align: center;">\1</div>', escaped_text, flags=re.DOTALL)
    escaped_text = re.sub(r'\[size=(\d{1,3})\](.*?)\[/size\]', r'<span style="font-size: \1px;">\2</span>', escaped_text, flags=re.DOTALL)

    def replace_shiki_tag(m):
        tag_type, attr_str = m.group(1), m.group(2)
        ids_match = re.search(r'ids=([\d,]+)', attr_str)
        cols_match = re.search(r'columns=(\d+)', attr_str)
        ids = ids_match.group(1) if ids_match else ''
        ids = re.sub(r'[^0-9,]', '', ids)
        cols = cols_match.group(1) if cols_match else ('8' if tag_type == 'characters' else '5')
        cols = re.sub(r'[^0-9]', '', cols)
        wall_class = ' wall-grid' if 'wall' in attr_str else ''
        return f'<div class="shiki-grid{wall_class}" data-type="{tag_type}" data-ids="{ids}" style="--cols: {cols}"></div>'

    escaped_text = re.sub(r'\[(animes|characters)\s+([^\]]+)\]', replace_shiki_tag, escaped_text)
    return Markup(escaped_text)