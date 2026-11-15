import time
from unittest.mock import MagicMock, patch
from services.video_aggregator import (
    clean_title,
    clean_translation_name,
    extract_season_num,
    match_score,
    video_aggregator,
    STREAM_CACHE
)


def test_clean_title_normalization():
    assert clean_title("One Piece (TV)") == "one piece"
    assert clean_title("Kaguya-sama wa Kokurasetai: Ultra Romantic") == "kaguya sama wa kokurasetai ultra romantic"
    assert clean_title("2nd Season") == "сезон 2"


def test_clean_translation_name():
    assert clean_translation_name("Русская озвучка AniLibria") == "AniLibria"
    assert clean_translation_name("Субтитры: crunchyroll") == "Субтитры (crunchyroll)"
    assert clean_translation_name("Озвучка (SHIZA Project)") == "SHIZA Project"


def test_extract_season_num():
    assert extract_season_num("Mob Psycho 100 III") == 3
    assert extract_season_num("Attack on Titan Season 4") == 4
    assert extract_season_num("Kimi no Na wa.") == 1


def test_match_score_seasons():
    # Matching season should score much higher than mismatched season
    score_same = match_score("Bleach Season 2", "Bleach Season 2")
    score_diff = match_score("Bleach Season 1", "Bleach Season 2")
    assert score_same > 0.8
    assert score_diff < 0.6


def test_video_aggregator_cache_and_fast_path(app):
    """Test get_aggregated_streams stores and retrieves from RAM and SQLite cache."""
    anime_id = 99999
    cache_key = f"stream:{anime_id}"
    STREAM_CACHE.pop(cache_key, None)

    mock_kodik = {
        "source_name": "Kodik API",
        "episodes": {
            "1": {"Дубляж": [{"player": "Kodik", "url": "https://kodik.info/serial/1"}]},
            "2": {"Дубляж": [{"player": "Kodik", "url": "https://kodik.info/serial/2"}]}
        },
        "total_episodes": 2
    }

    original_token = video_aggregator.kodik_token
    video_aggregator.kodik_token = "test_kodik_token"

    try:
        with patch.object(video_aggregator, "fetch_kodik_direct", return_value=mock_kodik), \
             patch.object(video_aggregator, "fetch_single_anicli_source", return_value={}):
            start = time.monotonic()
            res1 = video_aggregator.get_aggregated_streams(anime_id, ["Test Anime"], expected_episodes=2)
            elapsed1 = time.monotonic() - start

            assert res1 is not None
            assert "1" in res1["episodes"]
            assert "2" in res1["episodes"]
            assert "Kodik API" in res1["sources_found"]
            assert elapsed1 < 3.0  # Fast path should finish quickly

            # Second call: must hit RAM cache immediately (< 0.05s)
            start2 = time.monotonic()
            res2 = video_aggregator.get_aggregated_streams(anime_id, ["Test Anime"], expected_episodes=2)
            elapsed2 = time.monotonic() - start2

            assert res2 == res1
            assert elapsed2 < 0.05
    finally:
        video_aggregator.kodik_token = original_token
