import os
import logging

from flask import Flask
from utils import parse_shikimori_bbcode, fix_image_url
from logging_config import setup_logging
from errors import register_error_handlers, register_request_logging
from database import init_db

from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.rates import rates_bp
from routes.favourites import favourites_bp
from routes.friend import friend_bp
from routes.history import history_bp
from routes.explore import explore_bp
from routes.anime import anime_bp
from routes.manga import manga_bp
from routes.about import about_bp
from routes.settings import settings_bp
from routes.auth_status import auth_status_bp

logger = logging.getLogger("shikimxapp")

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default-secret-key")

if app.secret_key == "default-secret-key":
    logger.warning("FLASK_SECRET_KEY not set — using insecure default")

app.jinja_env.filters['bbcode'] = parse_shikimori_bbcode
app.jinja_env.filters['img_url'] = fix_image_url

app.register_blueprint(auth_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(rates_bp)
app.register_blueprint(favourites_bp)
app.register_blueprint(friend_bp)
app.register_blueprint(history_bp)
app.register_blueprint(explore_bp)
app.register_blueprint(anime_bp)
app.register_blueprint(manga_bp)
app.register_blueprint(about_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(auth_status_bp)

if not os.getenv("DISABLE_CUSTOM_LOGGING"):
    setup_logging(debug=app.debug)
register_error_handlers(app)
register_request_logging(app)

# Initialize database
init_db()

if __name__ == "__main__":
    logger.info("Starting Shiki MX App on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
