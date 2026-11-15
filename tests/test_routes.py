def test_static_manifest(client):
    """Test manifest.json is served with 200 OK."""
    res = client.get("/manifest.json")
    assert res.status_code == 200
    assert "application/json" in res.content_type


def test_service_worker_headers(client):
    """Test sw.js contains proper no-cache and service-worker headers."""
    res = client.get("/sw.js")
    assert res.status_code == 200
    assert res.headers.get("Service-Worker-Allowed") == "/"
    assert "no-cache" in res.headers.get("Cache-Control", "")


def test_security_headers_present(client):
    """Test after_request attaches security headers."""
    res = client.get("/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_404_error_handler(client):
    """Test 404 error handler returns proper response."""
    res = client.get("/non_existent_page_123456")
    assert res.status_code == 404
