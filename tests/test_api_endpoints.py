from unittest.mock import patch


def test_api_catalog_endpoint(client):
    """Test /api/catalog returns 200 and valid JSON with anime items."""
    mock_gql_data = {
        "animes": [
            {
                "id": 21,
                "name": "One Piece",
                "russian": "Ван-Пис",
                "score": 8.7,
                "kind": "tv",
                "status": "ongoing",
                "episodes": 1100,
                "episodesAired": 1090,
                "poster": {"mainUrl": "https://shikimori.one/posters/21.jpg"},
                "genres": [{"russian": "Приключения"}],
            }
        ]
    }
    with patch("routes.catalog.fetch_graphql", return_value=mock_gql_data):
        res = client.get("/api/catalog?page=1&limit=24")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, (list, dict))
        if isinstance(data, dict):
            assert "animes" in data
            assert len(data["animes"]) == 1
            assert data["animes"][0]["id"] == 21
        else:
            assert len(data) == 1
            assert data[0]["id"] == 21


def test_api_calendar_endpoint(client):
    """Test /api/calendar returns 200 and schedule items."""
    mock_calendar_data = [
        {
            "next_episode_at": "2026-11-15T12:00:00Z",
            "duration": 24,
            "next_episode": 1091,
            "anime": {
                "id": 21,
                "name": "One Piece",
                "russian": "Ван-Пис",
                "image": {"original": "/test.jpg"},
                "kind": "tv",
                "score": "8.7"
            }
        }
    ]
    with patch("routes.calendar.fetch_cached_api", return_value=mock_calendar_data):
        res = client.get("/api/calendar")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["id"] == 21


def test_api_news_endpoint(client):
    """Test /api/news returns 200 and parsed topics."""
    mock_news_data = [
        {
            "id": 101,
            "topic_title": "Анонсирован новый аниме-сезон",
            "body": "Подробности читайте в источнике.",
            "created_at": "2026-11-15T10:00:00Z",
            "comments_count": 5,
            "forum": {"name": "news"}
        }
    ]
    with patch("routes.news.fetch_cached_api", return_value=mock_news_data):
        res = client.get("/api/news")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == 101


def test_api_search_endpoint(client):
    """Test /api/search returns 200 and search results via GraphQL."""
    mock_search_data = {
        "animes": [
            {
                "id": 21,
                "name": "One Piece",
                "russian": "Ван-Пис",
                "kind": "tv",
                "score": "8.72",
                "status": "ongoing",
                "airedOn": {"year": 1999},
                "poster": {"mainUrl": "/21.jpg"},
                "genres": [{"name": "Action", "russian": "Экшен"}]
            }
        ],
        "mangas": []
    }
    with patch("routes.search.fetch_graphql", return_value=mock_search_data):
        res = client.get("/api/search?q=one")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == 21
        assert data[0]["name"] == "One Piece"


def test_api_anime_community_members(client):
    """Test /api/anime/<id>/members returns 200 and real community avatars."""
    mock_rates = [{"user_id": 999, "status": "watching", "score": 10}]
    mock_users_gql = {
        "u999": [
            {
                "id": "999",
                "nickname": "ShikiMaster",
                "avatarUrl": "https://shikimori.one/system/users/x160/999.png"
            }
        ]
    }
    with patch("routes.anime.fetch_cached_api", return_value=mock_rates), \
         patch("routes.anime.fetch_graphql", return_value=mock_users_gql):
        res = client.get("/api/anime/21/members")
        assert res.status_code == 200
        data = res.get_json()
        assert "community_watchers" in data
        assert "favorites" in data
        assert "friends" in data
        assert len(data["community_watchers"]) == 1
        assert data["community_watchers"][0]["name"] == "ShikiMaster"
        assert data["community_watchers"][0]["avatar"] == "https://shikimori.one/system/users/x160/999.png"


def test_api_forum_topics_endpoint(client):
    """Test /api/forum/topics returns 200 and topics list."""
    mock_topics = [
        {
            "id": 500,
            "topic_title": "Обсуждение новинок осени",
            "body": "Текст топика",
            "created_at": "2026-11-15T09:00:00Z",
            "comments_count": 12,
            "forum": {"name": "animanga"}
        }
    ]
    with patch("routes.forum.fetch_cached_api", return_value=mock_topics):
        res = client.get("/api/forum/topics")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == 500


def test_api_clubs_popular_endpoint(client):
    """Test /api/clubs/popular returns 200 and popular clubs."""
    mock_clubs = [
        {
            "id": 1,
            "name": "Клуб любителей сёнэнов",
            "members_count": 1500,
            "logo": {"original": "/logo.jpg"}
        }
    ]
    with patch("routes.forum.fetch_cached_api", return_value=mock_clubs):
        res = client.get("/api/clubs/popular")
        assert res.status_code == 200
        data = res.get_json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == 1
