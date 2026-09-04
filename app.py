import os
import sys
import logging

from flask import Flask, jsonify
from flask_compress import Compress
from utils import parse_shikimori_bbcode, fix_image_url, APP_NAME, CLIENT_ID
from logging_config import setup_logging
from build_assets import build_bundles
from errors import register_error_handlers, register_request_logging
from database import init_db, DB_PATH

from routes.auth import auth_bp
from routes.media import media_bp
from routes.profile import profile_bp
from routes.rates import rates_bp
from routes.favourites import favourites_bp
from routes.friends import friends_bp
from routes.history import history_bp
from routes.explore import explore_bp
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
Compress(app)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default-secret-key")

if app.secret_key == "default-secret-key":
    logger.warning("⚠️ FLASK_SECRET_KEY is using default value. Set FLASK_SECRET_KEY in .env for production security.")

app.jinja_env.filters['bbcode'] = parse_shikimori_bbcode
app.jinja_env.filters['img_url'] = fix_image_url

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(media_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(rates_bp)
app.register_blueprint(favourites_bp)
app.register_blueprint(friends_bp)
app.register_blueprint(history_bp)
app.register_blueprint(explore_bp)
app.register_blueprint(anime_bp)
app.register_blueprint(manga_bp)
app.register_blueprint(about_bp)
app.register_blueprint(settings_bp)

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
    from flask import send_file
    root_dir = os.path.dirname(os.path.abspath(__file__))
    txt_path = os.path.join(root_dir, 'translations.txt')
    response = send_file(txt_path, mimetype='text/plain; charset=utf-8')
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

# Build asset bundles
bundle_version = build_bundles(os.path.dirname(os.path.abspath(__file__)))

# Log startup diagnostics
def _log_startup_diagnostics():
    logger.info("=" * 60)
    logger.info(" Shiki MX App — Diagnostic Info")
    logger.info(" Python: %s on %s", sys.version.split()[0], sys.platform)
    logger.info(" Database: %s (exists=%s)", DB_PATH, os.path.exists(DB_PATH))
    logger.info(" User-Agent: %s", APP_NAME)
    logger.info(" OAuth Client ID: %s", "Configured" if CLIENT_ID else "NOT CONFIGURED (Check .env)")
    logger.info(" Asset Bundle Hash: %s", bundle_version)
    logger.info(" Registered Blueprints: %d", len(app.blueprints))
    logger.info("=" * 60)

_log_startup_diagnostics()

if __name__ == "__main__":
    logger.info("Starting Shiki MX App dev server on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)

