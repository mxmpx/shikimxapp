"""
Security middlewares: Inbound Rate Limiting and Origin/CSRF Verification.
"""
import time
import logging
import threading
from urllib.parse import urlparse
from typing import Dict, List, Tuple
from flask import request, jsonify, Response, current_app

logger = logging.getLogger("shikimxapp.security")


class InboundRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter for inbound HTTP requests.
    Prevents API denial-of-service and brute force abuse.
    """
    def __init__(self, default_limit: int = 120, window_sec: int = 60):
        self.default_limit = default_limit
        self.window_sec = window_sec
        self.route_limits: Dict[str, int] = {
            "/api/search": 40,
            "/cache/img": 60,
            "/api/rate": 60,
        }
        self._records: Dict[str, List[float]] = {}
        self._lock = threading.Lock()
        self._last_cleanup = time.time()

    def _get_client_ip(self) -> str:
        # Check standard reverse proxy headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.remote_addr or "127.0.0.1"

    def _cleanup_old_records(self, now: float):
        if now - self._last_cleanup < 60:
            return
        self._last_cleanup = now
        stale_threshold = now - self.window_sec
        stale_keys = [k for k, timestamps in self._records.items() if not timestamps or timestamps[-1] < stale_threshold]
        for k in stale_keys:
            del self._records[k]

    def check_rate_limit(self) -> Tuple[bool, int]:
        """
        Check if current request exceeds the rate limit.
        Returns (is_allowed, retry_after_seconds).
        """
        # Exempt health check and static assets
        path = request.path
        if path in ("/health", "/api/health", "/manifest.json", "/sw.js", "/favicon.ico"):
            return True, 0
        if path.startswith("/static/"):
            return True, 0

        ip = self._get_client_ip()
        limit = self.route_limits.get(path, self.default_limit)
        key = f"{ip}:{path}"
        now = time.time()
        window_start = now - self.window_sec

        with self._lock:
            self._cleanup_old_records(now)
            timestamps = self._records.setdefault(key, [])
            # Filter timestamps outside the sliding window
            timestamps = [t for t in timestamps if t > window_start]
            self._records[key] = timestamps

            if len(timestamps) >= limit:
                retry_after = max(1, int(timestamps[0] + self.window_sec - now))
                return False, retry_after

            timestamps.append(now)
            return True, 0


def verify_csrf_protection() -> Tuple[bool, str]:
    """
    Verify origin and custom headers for state-changing HTTP requests.
    Defends cookie-authenticated sessions against cross-origin forgery (CSRF).
    """
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return True, ""

    # Allow OAuth callback or public auth endpoints
    if request.path.startswith("/auth/"):
        return True, ""

    expected_host = (request.host or "").lower()

    # 1. Check Origin header
    origin = request.headers.get("Origin")
    if origin:
        try:
            parsed = urlparse(origin)
            if (parsed.netloc or "").lower() == expected_host:
                return True, ""
            return False, f"CSRF check failed: Origin {parsed.netloc} does not match {expected_host}"
        except Exception:
            return False, "CSRF check failed: Malformed Origin header"

    # 2. Check Referer header if Origin is absent
    referer = request.headers.get("Referer")
    if referer:
        try:
            parsed = urlparse(referer)
            if (parsed.netloc or "").lower() == expected_host:
                return True, ""
            return False, f"CSRF check failed: Referer {parsed.netloc} does not match {expected_host}"
        except Exception:
            return False, "CSRF check failed: Malformed Referer header"

    # 3. If neither Origin nor Referer is present, require safe custom request header
    # Browsers disallow setting custom headers in cross-origin form submissions without CORS preflight
    custom_header = (
        request.headers.get("X-Requested-With")
        or request.headers.get("X-CSRF-Token")
        or request.headers.get("Sec-Fetch-Site") in ("same-origin", "same-site")
    )
    if custom_header:
        return True, ""

    # Content-type application/json sent from browsers triggers preflight or indicates programmatic fetch
    content_type = request.headers.get("Content-Type", "")
    if "application/json" in content_type:
        return True, ""

    return False, "CSRF check failed: Missing Origin, Referer, or custom AJAX header"
