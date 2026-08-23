import logging
from flask import Blueprint, render_template, session
from utils import SHIKIMORI_BASE, get_auth_headers, fetch_cached_api
from routes.about import load_app_info

logger = logging.getLogger("shikimxapp.profile")
profile_bp = Blueprint('profile', __name__)

@profile_bp.route("/")
def index():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    profile = None
    if user_id and headers:
        url = f"{SHIKIMORI_BASE}/api/users/{user_id}"
        profile = fetch_cached_api(url, headers, ttl=600)
        if profile:
            logger.debug("Profile loaded for user_id=%s", user_id)
        else:
            logger.warning("Failed to load profile for user_id=%s", user_id)
    else:
        logger.debug("Rendering index for guest user")

    app_info = load_app_info()
    return render_template(
        "index.html",
        profile=profile,
        app_version=app_info.get("version", "1.0.0"),
        app_name=app_info.get("app_name", "Shiki MX App"),
        app_description=app_info.get("description", ""),
        app_features=app_info.get("features", []),
        app_stack=app_info.get("stack", []),
    )
