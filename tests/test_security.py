from security import InboundRateLimiter, verify_csrf_protection
from routes.media import _is_private_host, is_valid_image_content


def test_is_private_host_detection():
    """Verify SSRF protection correctly flags loopback, private, and reserved addresses."""
    assert _is_private_host("127.0.0.1") is True
    assert _is_private_host("localhost") is True
    assert _is_private_host("10.0.0.1") is True
    assert _is_private_host("192.168.1.1") is True
    assert _is_private_host("172.16.0.1") is True
    assert _is_private_host("172.31.255.255") is True
    assert _is_private_host("169.254.169.254") is True
    assert _is_private_host("::1") is True

    # Public hosts should pass
    assert _is_private_host("shikimori.one") is False
    assert _is_private_host("8.8.8.8") is False


def test_image_content_and_magic_bytes_validation():
    """Test magic bytes inspection for JPEG, PNG, GIF, WebP."""
    # JPEG magic bytes
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    assert is_valid_image_content(jpeg_bytes, "image/jpeg") is True

    # PNG magic bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert is_valid_image_content(png_bytes, "image/png") is True

    # GIF magic bytes
    gif_bytes = b"GIF89a\x01\x00\x01\x00"
    assert is_valid_image_content(gif_bytes, "image/gif") is True

    # WebP magic bytes
    webp_bytes = b"RIFF\x1a\x00\x00\x00WEBPVP8 "
    assert is_valid_image_content(webp_bytes, "image/webp") is True

    # Reject non-images / malicious scripts masquerading as images
    php_bytes = b"<?php echo 'malicious'; ?>"
    assert is_valid_image_content(php_bytes, "image/jpeg") is False
    assert is_valid_image_content(php_bytes, "text/html") is False

    # Reject mismatched / non-image Content-Type even with bytes
    assert is_valid_image_content(jpeg_bytes, "application/javascript") is False


def test_csrf_protection(app):
    """Test CSRF verification blocks untrusted cross-origin requests."""
    # GET requests should always pass
    with app.test_request_context("/", method="GET"):
        ok, _ = verify_csrf_protection()
        assert ok is True

    # POST with matching Origin should pass
    with app.test_request_context(
        "/api/rate",
        method="POST",
        headers={"Host": "127.0.0.1:5000", "Origin": "http://127.0.0.1:5000"}
    ):
        ok, _ = verify_csrf_protection()
        assert ok is True

    # POST with mismatched Origin should be blocked
    with app.test_request_context(
        "/api/rate",
        method="POST",
        headers={"Host": "127.0.0.1:5000", "Origin": "http://evil-attacker.com"}
    ):
        ok, reason = verify_csrf_protection()
        assert ok is False
        assert "Origin" in reason

    # POST with custom AJAX header should pass
    with app.test_request_context(
        "/api/rate",
        method="POST",
        headers={"Host": "127.0.0.1:5000", "X-Requested-With": "XMLHttpRequest"}
    ):
        ok, _ = verify_csrf_protection()
        assert ok is True


def test_inbound_rate_limiter(app):
    """Test rate limiter allows requests up to threshold and throttles beyond."""
    limiter = InboundRateLimiter(default_limit=3, window_sec=60)
    with app.test_request_context("/api/custom_endpoint"):
        # First 3 should pass
        assert limiter.check_rate_limit()[0] is True
        assert limiter.check_rate_limit()[0] is True
        assert limiter.check_rate_limit()[0] is True

        # 4th request exceeds limit
        allowed, retry_after = limiter.check_rate_limit()
        assert allowed is False
        assert retry_after > 0


def test_csp_and_security_headers(client):
    """Test defensive security headers and Content-Security-Policy."""
    res = client.get("/health")
    assert res.status_code == 200
    assert "Content-Security-Policy" in res.headers
    csp = res.headers["Content-Security-Policy"]
    assert "default-src 'self'" in csp
    assert "object-src 'none'" in csp
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "SAMEORIGIN"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_open_redirect_blocked(client):
    """Ensure disallowed external domains return 403 Forbidden instead of 302 redirect."""
    res = client.get("/cache/img?url=https://malicious-attacker.com/evil.jpg")
    assert res.status_code == 403
    assert res.is_json
    assert res.get_json().get("error") == "Forbidden host"


def test_bounded_collections():
    """Verify BoundedDict and BoundedSet maintain maxsize bound without memory leaks."""
    from services.cache_utils import BoundedDict, BoundedSet

    bdict = BoundedDict(maxsize=3)
    bdict["a"] = 1
    bdict["b"] = 2
    bdict["c"] = 3
    bdict["d"] = 4  # Evicts 'a'

    assert len(bdict) == 3
    assert "a" not in bdict
    assert bdict.get("b") == 2
    assert bdict.get("d") == 4

    bset = BoundedSet(maxsize=2)
    bset.add("url1")
    bset.add("url2")
    bset.add("url3")  # Evicts 'url1'

    assert len(bset) == 2
    assert "url1" not in bset
    assert "url2" in bset
    assert "url3" in bset


def test_rates_idor_protection(client):
    """Verify rates delete endpoint rejects unauthorized/unowned rate deletion."""
    with client.session_transaction() as sess:
        sess["user_id"] = 12345
        sess["access_token"] = "mock_token"

    # Attempt to delete rate 99999 without ownership
    res = client.delete("/api/rate/99999", headers={"X-Requested-With": "XMLHttpRequest"})
    assert res.status_code in (403, 502)


def test_query_param_validation(client):
    """Verify malformed query parameters don't cause 500 crashes."""
    res = client.get("/api/forum/topics?page=invalid&limit=abc")
    assert res.status_code == 200

    res = client.get("/api/catalog?page=foo&limit=bar")
    assert res.status_code == 200

    res = client.get("/api/news?page=-10&limit=99999")
    assert res.status_code == 200


def test_spa_catchall_routes(client):
    """Verify SPA view routes return index page and unknown paths return 404."""
    # SPA routes registered
    for route in ["/calendar", "/catalog", "/explore", "/settings"]:
        res = client.get(route)
        assert res.status_code in (200, 503)  # 200 if dist exists, 503 template fallback if not built

    # Non-existent routes return 404
    res = client.get("/this_route_definitely_does_not_exist_404")
    assert res.status_code == 404


def test_oauth_state_cross_domain_resilience(client):
    """Verify OAuth state validation succeeds when state was issued by server even without cookie."""
    from unittest.mock import patch, MagicMock
    from routes.auth import _pending_oauth_states, _oauth_lock
    import time

    test_state = "valid_server_issued_test_state_12345"
    with _oauth_lock:
        _pending_oauth_states[test_state] = time.time()

    mock_token_resp = MagicMock()
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {"access_token": "mock_shiki_token"}

    mock_whoami_resp = MagicMock()
    mock_whoami_resp.status_code = 200
    mock_whoami_resp.json.return_value = {"id": 99999}

    with patch("routes.auth.requests.post", return_value=mock_token_resp), \
         patch("routes.auth.requests.get", return_value=mock_whoami_resp):
        # 1. State issued by server but cookie empty (cross-domain or partitioned cookie)
        res = client.get(f"/auth/callback?code=mock_code_1&state={test_state}")
        assert res.status_code == 302  # redirects to index

        # Clear session to test replay from an unauthenticated client
        with client.session_transaction() as sess:
            sess.clear()

        # 2. Replay of same state should fail because it was popped
        res2 = client.get(f"/auth/callback?code=mock_code_2&state={test_state}")
        assert res2.status_code == 400

        # 3. Completely bogus state fails
        res3 = client.get("/auth/callback?code=mock_code_3&state=unauthorized_fake_state")
        assert res3.status_code == 400


