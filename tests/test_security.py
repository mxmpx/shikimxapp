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
