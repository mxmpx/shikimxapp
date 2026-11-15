import os
import sys
import time
import logging

from flask import Flask, jsonify, request, send_file, Response
from flask_compress import Compress
from utils import parse_shikimori_bbcode, fix_image_url, APP_NAME, CLIENT_ID
from logging_config import setup_logging
from errors import register_error_handlers, register_request_logging
from database import init_db, DB_PATH, close_request_db, get_connection
from security import InboundRateLimiter, verify_csrf_protection

from routes.auth import auth_bp
from routes.media import media_bp
from routes.profile import profile_bp
from routes.rates import rates_bp
from routes.favourites import favourites_bp
from routes.friends import friends_bp
from routes.history import history_bp
from routes.explore import explore_bp
from routes.search import search_bp
from routes.catalog import catalog_bp
from routes.calendar import calendar_bp
from routes.news import news_bp
from routes.forum import forum_bp
from routes.anime import anime_bp
from routes.manga import manga_bp
from routes.about import about_bp
from routes.settings import settings_bp

# Initialize comprehensive logger immediately
if not os.getenv("DISABLE_CUSTOM_LOGGING"):
    logger = setup_logging(debug=True)
else:
    logger = logging.getLogger("shikimxapp")

app = Flask(__name__)

# Compress configuration: ensure large JSON API responses and assets are gzipped
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml', 'application/json', 'application/javascript'
]
app.config['COMPRESS_LEVEL'] = 6
app.config['COMPRESS_MIN_SIZE'] = 500
Compress(app)

_startup_time = time.time()

# Session Secret Key Configuration:
# Never accept default placeholder strings which permit session forgery
_env_secret = os.getenv("FLASK_SECRET_KEY")
if _env_secret and _env_secret.strip() not in ("", "change_this_to_a_random_secret_string"):
    app.secret_key = _env_secret
else:
    # Use/generate a persistent random secret key file to prevent session forgery across restarts
    _secret_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".flask_secret")
    if os.path.exists(_secret_file):
        try:
            with open(_secret_file, "r", encoding="utf-8") as _f:
                app.secret_key = _f.read().strip()
        except Exception:
            import secrets
            app.secret_key = secrets.token_hex(32)
    else:
        import secrets
        app.secret_key = secrets.token_hex(32)
        try:
            with open(_secret_file, "w", encoding="utf-8") as _f:
                _f.write(app.secret_key)
        except Exception:
            pass
    logger.info("FLASK_SECRET_KEY not set or placeholder; using secure persistent local key.")

app.jinja_env.filters['bbcode'] = parse_shikimori_bbcode
app.jinja_env.filters['img_url'] = fix_image_url

# Initialize Inbound Rate Limiter
inbound_limiter = InboundRateLimiter(default_limit=120, window_sec=60)


@app.before_request
def security_checks():
    """Apply rate limiting and CSRF protection to inbound HTTP requests."""
    # 1. Rate limiting check
    allowed, retry_after = inbound_limiter.check_rate_limit()
    if not allowed:
        res = jsonify({"error": "Too Many Requests", "retry_after": retry_after})
        res.status_code = 429
        res.headers["Retry-After"] = str(retry_after)
        return res

    # 2. CSRF / Origin verification on state-changing requests
    csrf_ok, csrf_reason = verify_csrf_protection()
    if not csrf_ok:
        logger.warning("CSRF check blocked request to %s: %s", request.path, csrf_reason)
        return jsonify({"error": "Forbidden", "message": csrf_reason}), 403


@app.after_request
def add_security_and_caching_headers(response):
    """Add defensive security headers, Content-Security-Policy, and HTTP caching directives."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Robust Content-Security-Policy (CSP) protecting against XSS and injection while supporting embedded video CDNs
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://shikimori.one https://*.shikimori.one https://*.shikimori.me https://*.shikimori.io https://kodik.info https://*.kodik.info",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https: http: ws: wss:",
        "frame-src 'self' https: http: blob:",
        "media-src 'self' blob: https: http:",
        "object-src 'none'",
        "base-uri 'self'",
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

    # Avoid overriding Service Worker no-cache policy
    if request.path == "/sw.js":
        return response

    # Long-term immutable caching for built/versioned dist assets
    if request.path.startswith("/static/dist/assets/") or request.path.startswith("/static/fonts/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.path.startswith("/static/icons/"):
        response.headers["Cache-Control"] = "public, max-age=604800"
    elif request.path.startswith("/static/") and "Cache-Control" not in response.headers:
        response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"

    return response


# Database request teardown handler: cleans up request-scoped connection
app.teardown_appcontext(close_request_db)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(media_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(rates_bp)
app.register_blueprint(favourites_bp)
app.register_blueprint(friends_bp)
app.register_blueprint(history_bp)
app.register_blueprint(explore_bp)
app.register_blueprint(search_bp)
app.register_blueprint(catalog_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(news_bp)
app.register_blueprint(forum_bp)
app.register_blueprint(anime_bp)
app.register_blueprint(manga_bp)
app.register_blueprint(about_bp)
app.register_blueprint(settings_bp)


@app.route('/health')
@app.route('/api/health')
def health():
    """Health check endpoint for monitoring and container readiness probes."""
    db_connected = False
    cache_count = 0
    wal_mode = False
    try:
        conn = get_connection()
        row = conn.execute("PRAGMA journal_mode;").fetchone()
        if row:
            wal_mode = (str(row[0]).upper() == "WAL")
        cache_row = conn.execute("SELECT count(*) FROM api_cache;").fetchone()
        cache_count = cache_row[0] if cache_row else 0
        db_connected = True
    except Exception as exc:
        logger.error("Health check DB failure: %s", exc)

    status = "ok" if db_connected else "degraded"
    code = 200 if db_connected else 503
    return jsonify({
        "status": status,
        "app": "Shiki MX App",
        "uptime_seconds": round(time.time() - _startup_time, 2),
        "database": {
            "connected": db_connected,
            "path": DB_PATH,
            "exists": os.path.exists(DB_PATH),
            "wal_mode": wal_mode,
            "cached_entries": cache_count
        }
    }), code


@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json')


@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('icons/icon-192.png')


@app.route('/apple-touch-icon.png')
@app.route('/apple-touch-icon-precomposed.png')
def apple_touch_icon():
    return app.send_static_file('icons/icon-192.png')


@app.route('/sw.js')
def service_worker():
    response = app.send_static_file('sw.js')
    response.headers['Service-Worker-Allowed'] = '/'
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.route('/translations.txt')
def translations_txt():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    txt_path = os.path.join(root_dir, 'translations.txt')
    if not os.path.exists(txt_path):
        return Response("Not found", status=404)
    stat = os.stat(txt_path)
    etag = f'"{int(stat.st_mtime)}-{stat.st_size}"'

    if request.headers.get('If-None-Match') == etag:
        res = Response(status=304)
        res.headers['ETag'] = etag
        res.headers['Cache-Control'] = 'public, max-age=3600'
        return res

    response = send_file(txt_path, mimetype='text/plain; charset=utf-8')
    response.headers['ETag'] = etag
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response


@app.route('/.well-known/appspecific/com.chrome.devtools.json')
def chrome_devtools_json():
    return jsonify({})


# Register error handlers and detailed request logger
register_error_handlers(app)
register_request_logging(app)

# Initialize database
init_db()


# Log startup diagnostics
def _log_startup_diagnostics():
    logger.info("=" * 60)
    logger.info(" Shiki MX App — Diagnostic Info")
    logger.info(" Python: %s on %s", sys.version.split()[0], sys.platform)
    logger.info(" Database: %s (exists=%s)", DB_PATH, os.path.exists(DB_PATH))
    logger.info(" User-Agent: %s", APP_NAME)
    logger.info(" OAuth Client ID: %s", "Configured" if CLIENT_ID else "NOT CONFIGURED (Check .env)")
    logger.info(" Frontend: React 18 SPA (static/dist)")
    logger.info(" Registered Blueprints: %d", len(app.blueprints))
    logger.info("=" * 60)

_log_startup_diagnostics()

if __name__ == "__main__":
    logger.info("Starting Shiki MX App dev server on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
