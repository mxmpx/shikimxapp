def test_health_endpoint(client):
    """Test health check endpoint reports status 200 and database health."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["app"] == "Shiki MX App"
    assert "uptime_seconds" in data
    assert data["database"]["connected"] is True
    assert data["database"]["wal_mode"] is True


def test_api_health_endpoint(client):
    """Test /api/health alias endpoint returns identical healthy payload."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["database"]["connected"] is True
