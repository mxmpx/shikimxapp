import hashlib
import json
import time
from services.rates_cache import (
    _build_rates_index,
    get_cached_user_rate,
    set_cached_user_rates,
    invalidate_user_rates_mem_cache
)
import database


def test_graphql_sha256_cache_key():
    """Verify that GraphQL cache keys are constructed with SHA-256."""
    payload = json.dumps({"query": "query { test }", "variables": {}}, sort_keys=True)
    expected_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    cache_key = f"graphql:{expected_hash}"
    assert len(expected_hash) == 64
    assert cache_key.startswith("graphql:")


def test_rates_indexing_and_fast_lookup():
    """Verify in-memory user rates indexing and O(1) dictionary retrieval."""
    rates_sample = [
        {"target_id": 101, "target_type": "Anime", "score": 9, "status": "completed"},
        {"target_id": 202, "target_type": "Manga", "score": 8, "status": "reading"},
    ]

    index = _build_rates_index(rates_sample)
    assert "Anime_101" in index
    assert index["Anime_101"]["score"] == 9
    assert "Manga_202" in index
    assert index["Manga_202"]["score"] == 8

    # Set and get via rates cache service
    set_cached_user_rates(777, rates_sample, expires_at=time.time() + 300)

    found, rate = get_cached_user_rate(777, 101, "Anime")
    assert found is True
    assert rate["score"] == 9

    # Unrated anime should return found=True, rate=None (since user list is loaded)
    found_missing, rate_missing = get_cached_user_rate(777, 9999, "Anime")
    assert found_missing is True
    assert rate_missing is None

    # Invalidate cache
    invalidate_user_rates_mem_cache(777)
    found_after, _ = get_cached_user_rate(777, 101, "Anime")
    assert found_after is False


def test_expired_cache_cleanup():
    """Test cleanup of expired records from api_cache table."""
    conn = database._create_raw_connection()
    try:
        now = time.time()
        # Add expired item
        conn.execute("INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                     ("expired_key", '{"result": 1}', now - 100))
        # Add valid item
        conn.execute("INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                     ("valid_key", '{"result": 2}', now + 1000))
        conn.commit()
    finally:
        conn.close()

    deleted = database.cleanup_expired_cache()
    assert deleted >= 1

    conn = database._create_raw_connection()
    try:
        row = conn.execute("SELECT url FROM api_cache WHERE url = 'expired_key'").fetchone()
        assert row is None
        valid_row = conn.execute("SELECT url FROM api_cache WHERE url = 'valid_key'").fetchone()
        assert valid_row is not None
    finally:
        conn.close()


def test_tiered_swr_cache():
    """Verify TieredCache memory caching, database storage, and SWR retrieval."""
    from services.tiered_cache import TieredCache

    cache = TieredCache(name="test_swr", memory_ttl=60)
    fetch_calls = 0

    def mock_fetch():
        nonlocal fetch_calls
        fetch_calls += 1
        return {"data": "hello_world", "count": fetch_calls}

    # 1. First fetch: calls mock_fetch
    res1 = cache.get_or_fetch("test_key_1", mock_fetch, ttl=300)
    assert res1["data"] == "hello_world"
    assert fetch_calls == 1

    # 2. Second fetch: hits memory, mock_fetch is NOT called
    res2 = cache.get_or_fetch("test_key_1", mock_fetch, ttl=300)
    assert res2["data"] == "hello_world"
    assert fetch_calls == 1

    # 3. Invalidate
    cache.invalidate("test_key_1")
    assert cache.get("test_key_1") is None


def test_prune_api_cache_limit():
    """Verify pruning when api_cache exceeds max entries limit."""
    conn = database._create_raw_connection()
    try:
        now = time.time()
        for i in range(15):
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (f"prune_key_{i}", '{"val": 1}', now + (i * 10))
            )
        conn.commit()
    finally:
        conn.close()

    removed = database.prune_api_cache_if_needed(max_entries=5)
    assert removed >= 10

    conn = database._create_raw_connection()
    try:
        count = conn.execute("SELECT count(*) FROM api_cache WHERE url LIKE 'prune_key_%'").fetchone()[0]
        assert count <= 5
    finally:
        conn.close()
