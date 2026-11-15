import os
import time
import random
import hashlib
import json
import logging
import threading
import requests
from typing import Optional, Dict, Any, Union
from flask import session
from dotenv import load_dotenv
from database import get_connection
from services.rates_cache import (
    get_cached_user_rate,
    set_cached_user_rates,
    invalidate_user_rates_mem_cache,
)

load_dotenv()

logger = logging.getLogger("shikimxapp.api_client")

SHIKIMORI_BASE = "https://shikimori.io"
CLIENT_ID = os.getenv("SHIKIMORI_CLIENT_ID")
CLIENT_SECRET = os.getenv("SHIKIMORI_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SHIKIMORI_REDIRECT_URI", "http://127.0.0.1:5000/auth/callback")
APP_NAME = os.getenv("SHIKIMORI_APP_NAME", "MyLocalApp/1.0")
AUTH_URL = f"{SHIKIMORI_BASE}/oauth/authorize"
TOKEN_URL = f"{SHIKIMORI_BASE}/oauth/token"
WHOAMI_URL = f"{SHIKIMORI_BASE}/api/users/whoami"

_API_CACHE_CLEANUP_INTERVAL = 300
_last_api_cache_cleanup = 0.0

# HTTP statuses where retry is futile
_NO_RETRY_STATUSES = {401, 403, 404}
# Max elapsed seconds across all retry attempts for a single request
_FETCH_MAX_ELAPSED = 30.0


class ShikimoriRateLimiter:
    """
    Thread-safe Rate Limiter for the Shikimori API.
    - Max frequency: ~3.5 RPS (safely below Shikimori's 5 RPS threshold).
    - Minimum pause between requests: >= 280 ms.
    - Global lock/pause upon receiving 429 Too Many Requests.
    """

    def __init__(self, min_interval: float = 0.28):
        self.min_interval = min_interval
        self.last_request_time = 0.0
        self.paused_until = 0.0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            if now < self.paused_until:
                sleep_time = self.paused_until - now
                logger.warning("RateLimiter: 429 global pause active, sleeping %.2f s", sleep_time)
                time.sleep(sleep_time)
                now = time.time()

            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)

            self.last_request_time = time.time()

    def report_429(self, retry_after: Optional[Union[str, float]] = None):
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
            logger.warning("RateLimiter: paused for %.2f s due to 429 from Shikimori", pause_duration)


shiki_rate_limiter = ShikimoriRateLimiter(min_interval=0.28)


def _cleanup_api_cache(force: bool = False):
    """Periodically delete expired API cache entries."""
    global _last_api_cache_cleanup
    now = time.time()
    if not force and now - _last_api_cache_cleanup < _API_CACHE_CLEANUP_INTERVAL:
        return
    _last_api_cache_cleanup = now

    try:
        from database import cleanup_expired_cache
        cleanup_expired_cache()
    except Exception as exc:
        logger.error("Error cleaning API cache: %s", exc)


def get_auth_headers() -> Optional[Dict[str, str]]:
    """Return Authorization headers if user is logged into Shikimori in the active session."""
    access_token = session.get("access_token")
    if not access_token:
        return None
    return {"User-Agent": APP_NAME, "Authorization": f"Bearer {access_token}"}


def fetch_with_retry(url: str, headers: Optional[Dict[str, str]] = None) -> Optional[Any]:
    """Execute GET request with 429 rate limit protection, Retry-After handling, and exponential backoff."""
    last_status = None
    start_t = time.monotonic()

    for attempt in range(5):
        if time.monotonic() - start_t >= _FETCH_MAX_ELAPSED:
            logger.warning("fetch_with_retry: elapsed time exceeded %.0f s for %s", _FETCH_MAX_ELAPSED, url)
            break

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
                logger.warning("Rate limit 429 for %s (attempt %d/5), sleeping %.2f s", url, attempt + 1, wait_sec)
                time.sleep(wait_sec)
            elif r.status_code in _NO_RETRY_STATUSES:
                logger.warning("API %s returned %s — fast-exit without retrying", url, r.status_code)
                break
            else:
                logger.warning("API %s returned status %s (attempt %d/5)", url, r.status_code, attempt + 1)
                time.sleep(0.4 * (attempt + 1))
        except requests.RequestException as exc:
            logger.warning("Network error for %s (attempt %d/5): %s", url, attempt + 1, exc)
            time.sleep(0.5)

    logger.error("All retry attempts exhausted for %s (last status: %s)", url, last_status)

    # Stale-while-error fallback
    try:
        conn = get_connection()
        try:
            row = conn.execute("SELECT data FROM api_cache WHERE url = ?", (url,)).fetchone()
            if row:
                logger.warning("Returning stale cache data for %s after failure", url)
                return json.loads(row["data"])
        finally:
            conn.close()
    except Exception as exc:
        logger.debug("Error reading stale cache for %s: %s", url, exc)

    return None


def fetch_graphql(
    query: str,
    variables: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    ttl: int = 1800,
) -> Optional[Any]:
    """Execute cached, rate-limited Shikimori GraphQL query."""
    _cleanup_api_cache()
    now = time.time()

    req_headers = {"User-Agent": APP_NAME, "Content-Type": "application/json"}
    if headers:
        for k, v in headers.items():
            req_headers[k] = v

    cache_payload = json.dumps({"query": query.strip(), "variables": variables or {}}, sort_keys=True)
    cache_key = f"graphql:{hashlib.sha256(cache_payload.encode('utf-8')).hexdigest()}"

    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?", (cache_key,)
            ).fetchone()
            if row:
                if now < row["expires_at"]:
                    return json.loads(row["data"])
                conn.execute("DELETE FROM api_cache WHERE url = ?", (cache_key,))
                conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading GraphQL cache: %s", exc)

    endpoint = f"{SHIKIMORI_BASE}/api/graphql"
    last_status = None
    data = None
    start_t = time.monotonic()

    for attempt in range(5):
        if time.monotonic() - start_t >= _FETCH_MAX_ELAPSED:
            logger.warning("fetch_graphql: elapsed time exceeded %.0f s", _FETCH_MAX_ELAPSED)
            break

        shiki_rate_limiter.wait()
        try:
            r = requests.post(
                endpoint,
                json={"query": query, "variables": variables or {}},
                headers=req_headers,
                timeout=8,
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
                logger.warning("GraphQL 429 rate limit (attempt %d/5), sleeping %.2f s", attempt + 1, wait_sec)
                time.sleep(wait_sec)
            elif r.status_code in _NO_RETRY_STATUSES:
                logger.warning("GraphQL returned %s — fast-exit", r.status_code)
                break
            else:
                logger.warning("GraphQL returned %s (attempt %d/5): %s", r.status_code, attempt + 1, r.text[:150])
                time.sleep(0.4 * (attempt + 1))
        except requests.RequestException as exc:
            logger.warning("GraphQL network error (attempt %d/5): %s", attempt + 1, exc)
            time.sleep(0.5)

    if data is not None:
        try:
            conn = get_connection()
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                    (cache_key, json.dumps(data), now + ttl),
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            logger.error("Error writing GraphQL cache: %s", exc)
    else:
        try:
            conn = get_connection()
            try:
                row = conn.execute("SELECT data FROM api_cache WHERE url = ?", (cache_key,)).fetchone()
                if row:
                    logger.warning("Returning stale GraphQL cache data after error")
                    data = json.loads(row["data"])
            finally:
                conn.close()
        except Exception:
            pass

    return data


def fetch_cached_api(url: str, headers: Optional[Dict[str, str]], ttl: int = 1800) -> Optional[Any]:
    """Fetch HTTP API endpoint with caching in SQLite api_cache table."""
    _cleanup_api_cache()
    now = time.time()

    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?", (url,)
            ).fetchone()
            if row:
                if now < row["expires_at"]:
                    return json.loads(row["data"])
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
                conn.execute(
                    "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                    (url, json.dumps(data), now + ttl),
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            logger.error("Error writing API cache: %s", exc)
    else:
        logger.warning("Failed to fetch API data: %s", url)

    return data


def fetch_user_rate(target_id: Union[int, str], target_type: str) -> Optional[Dict[str, Any]]:
    """Fetch user rate for a given target (Anime/Manga). Returns dict or None."""
    user_id = session.get("user_id")
    if not user_id:
        return None

    # 1. Fast in-memory check (O(1))
    found, rate = get_cached_user_rate(user_id, target_id, target_type)
    if found:
        return rate

    # 2. Local database cache check
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (f"rates:user_{user_id}",),
            ).fetchone()
        finally:
            conn.close()

        if row and row["data"]:
            rates_list = json.loads(row["data"])
            expires_at = (
                float(row["expires_at"])
                if "expires_at" in row.keys()
                else (time.time() + 1800)
            )
            set_cached_user_rates(user_id, rates_list, expires_at)
            found, rate = get_cached_user_rate(user_id, target_id, target_type)
            if found:
                return rate
            return None
    except Exception as exc:
        logger.debug("DB rate lookup failed: %s", exc)

    # 3. Fallback to network
    auth_headers = get_auth_headers()
    if not auth_headers:
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
                "updated_at": item.get("updated_at"),
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
        invalidate_user_rates_mem_cache(user_id)
    except Exception:
        pass
