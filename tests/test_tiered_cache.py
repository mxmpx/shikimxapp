import time
import json
from unittest.mock import MagicMock
from services.tiered_cache import TieredCache
from database import get_connection


def test_tiered_cache_memory_hit(app):
    """Tier 1: Verify data is served from memory sub-millisecond."""
    cache = TieredCache(name="test_mem", memory_ttl=60)
    cache.set("item_1", {"title": "Test Anime"}, ttl=300)

    # In-memory retrieval
    result = cache.get("item_1")
    assert result is not None
    assert result["title"] == "Test Anime"


def test_tiered_cache_sqlite_fallback(app):
    """Tier 2: Verify SQLite fallback when in-memory cache is empty or cleared."""
    cache = TieredCache(name="test_fallback", memory_ttl=60)
    cache.set("item_2", {"title": "Fallback Anime"}, ttl=300)

    # Clear memory cache to simulate process restart or memory expiry
    cache._mem_cache.clear()
    assert cache.get("item_2") is None

    # Fetch should fall back to SQLite without invoking fetch_fn
    mock_fetch = MagicMock()
    result = cache.get_or_fetch("item_2", fetch_fn=mock_fetch)

    assert result is not None
    assert result["title"] == "Fallback Anime"
    mock_fetch.assert_not_called()

    # Memory cache should now be repopulated
    assert cache.get("item_2") == {"title": "Fallback Anime"}


def test_tiered_cache_background_swr_revalidation(app):
    """Tier 3: SWR behavior — returns stale data immediately while revalidating in background."""
    cache = TieredCache(name="test_swr", memory_ttl=60)
    key = "stale_item"
    now = time.time()

    # Insert an expired entry directly into SQLite
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
        (key, json.dumps({"version": 1, "status": "stale"}), int(now - 100))
    )
    conn.commit()
    conn.close()

    mock_fetch = MagicMock(return_value={"version": 2, "status": "fresh"})

    # 1. First call: immediately returns stale data
    result = cache.get_or_fetch(key, fetch_fn=mock_fetch, ttl=300, background_refresh=True)
    assert result is not None
    assert result["status"] == "stale"
    assert result["version"] == 1

    # 2. Wait for background thread execution to complete
    time.sleep(0.3)
    mock_fetch.assert_called_once()

    # 3. Next call should return the refreshed data from memory
    fresh_result = cache.get(key)
    assert fresh_result is not None
    assert fresh_result["status"] == "fresh"
    assert fresh_result["version"] == 2


def test_tiered_cache_invalidate(app):
    """Verify invalidate removes item from both memory and SQLite."""
    cache = TieredCache(name="test_inval", memory_ttl=60)
    key = "to_delete"
    cache.set(key, {"data": "secret"}, ttl=300)

    assert cache.get(key) is not None

    cache.invalidate(key)
    assert cache.get(key) is None

    conn = get_connection()
    row = conn.execute("SELECT data FROM api_cache WHERE url = ?", (key,)).fetchone()
    conn.close()
    assert row is None
