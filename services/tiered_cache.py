import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, Optional, Tuple
from database import get_connection

from services.cache_utils import BoundedDict

logger = logging.getLogger("shikimxapp.tiered_cache")


class TieredCache:
    """
    Two-tier Stale-While-Revalidate (SWR) cache:
    - Tier 1: In-memory cache for sub-millisecond responses
    - Tier 2: Persistent SQLite api_cache table
    - Tier 3: Fetch function execution with background revalidation when stale
    """

    def __init__(self, name: str, memory_ttl: int = 1800, max_workers: int = 2, max_mem_entries: int = 1000):
        self.name = name
        self.memory_ttl = memory_ttl
        self._mem_cache = BoundedDict(maxsize=max_mem_entries)
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix=f"swr_{name}"
        )

    def _refresh_in_background(self, key: str, fetch_fn: Callable[[], Any], ttl: int):
        try:
            data = fetch_fn()
            if data is not None:
                self.set(key, data, ttl)
        except Exception as exc:
            logger.debug("[%s] Background refresh failed for %s: %s", self.name, key, exc)

    def get(self, key: str) -> Optional[Any]:
        """Fetch item if available in memory and still within memory_ttl."""
        now = time.time()
        cached = self._mem_cache.get(key)
        if cached and (now - cached[1] < self.memory_ttl):
            return cached[0]
        return None

    def set(self, key: str, data: Any, ttl: int = 1800):
        """Store item in both memory and SQLite."""
        now = time.time()
        self._mem_cache[key] = (data, now)
        try:
            conn = get_connection()
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                    (key, json.dumps(data), now + ttl)
                )
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            logger.debug("[%s] DB write failed for %s: %s", self.name, key, exc)

    def invalidate(self, key: str):
        """Remove item from memory and SQLite."""
        self._mem_cache.pop(key, None)
        try:
            conn = get_connection()
            try:
                conn.execute("DELETE FROM api_cache WHERE url = ?", (key,))
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            logger.debug("[%s] Invalidate failed for %s: %s", self.name, key, exc)

    def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], Any],
        ttl: int = 1800,
        background_refresh: bool = True
    ) -> Optional[Any]:
        """
        Fast SWR read:
        1. Return in-memory if fresh.
        2. Else read SQLite:
           - If SQLite entry is expired and background_refresh=True, return stale and queue async refresh.
           - If fresh in SQLite, populate memory and return.
        3. If no cache exists at all, run fetch_fn synchronously and cache result.
        """
        now = time.time()

        # 1. Memory check (< 0.01ms)
        cached = self._mem_cache.get(key)
        if cached and (now - cached[1] < self.memory_ttl):
            return cached[0]

        # 2. SQLite check
        try:
            conn = get_connection()
            try:
                row = conn.execute(
                    "SELECT data, expires_at FROM api_cache WHERE url = ?", (key,)
                ).fetchone()
                if row:
                    data = json.loads(row["data"])
                    self._mem_cache[key] = (data, now)
                    if now >= row["expires_at"] and background_refresh:
                        self._executor.submit(self._refresh_in_background, key, fetch_fn, ttl)
                    return data
            finally:
                conn.close()
        except Exception as exc:
            logger.debug("[%s] SQLite read failed for %s: %s", self.name, key, exc)

        # 3. Synchronous fetch
        try:
            data = fetch_fn()
            if data is not None:
                self.set(key, data, ttl)
            return data
        except Exception as exc:
            logger.error("[%s] Synchronous fetch failed for %s: %s", self.name, key, exc)
            return None
