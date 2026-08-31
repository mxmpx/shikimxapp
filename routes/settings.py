import json
import logging
from flask import Blueprint, jsonify, request, session
from database import get_or_create_user, get_user_settings, set_user_settings, get_user_setting

logger = logging.getLogger("shikimxapp.settings")
settings_bp = Blueprint('settings', __name__)

DEFAULT_SETTINGS = {
    "background": {
        "mode": "theme",  # theme — фон темы | color — свой цвет | image — своё фото
        "color": "",
        "image": "",
    },
    "navbar_view": "full",
    "section_visibility": {}
}


def _get_current_user_id():
    """Get the current logged-in user's internal database ID from session."""
    shikimori_id = session.get("user_id")

    if shikimori_id:
        # Find or create user by shikimori_id
        user = get_or_create_user(shikimori_id=shikimori_id)
        return user["id"]
    return None


@settings_bp.route("/api/settings")
def get_settings():
    """Get settings for the current user, or defaults if not logged in."""
    user_id = _get_current_user_id()

    if user_id:
        # Load from database
        db_settings = get_user_settings(user_id)
        # Merge with defaults (db settings override defaults)
        merged = dict(DEFAULT_SETTINGS)
        merged.update(db_settings)
        logger.debug("Settings loaded from DB for user_id=%s", user_id)
        return jsonify(merged)
    else:
        logger.debug("Settings defaults returned (not logged in)")
        return jsonify(DEFAULT_SETTINGS)


@settings_bp.route("/api/settings", methods=["POST"])
def save_settings():
    """Save settings for the current user."""
    user_id = _get_current_user_id()

    if not user_id:
        logger.warning("Attempted to save settings without authentication")
        return jsonify({"error": "Требуется авторизация"}), 401

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Некорректные данные"}), 400

    # Save each top-level key as a separate setting
    set_user_settings(user_id, data)
    logger.info("Settings saved for user_id=%s: %s", user_id, list(data.keys()))
    return jsonify({"success": True, "settings": data})


@settings_bp.route("/api/settings/<key>", methods=["GET"])
def get_setting(key):
    """Get a single setting for the current user."""
    user_id = _get_current_user_id()

    if not user_id:
        # Return default if available
        if key in DEFAULT_SETTINGS:
            return jsonify({key: DEFAULT_SETTINGS[key]})
        return jsonify({"error": "Требуется авторизация"}), 401

    value = get_user_setting(user_id, key)
    if value is None and key in DEFAULT_SETTINGS:
        value = DEFAULT_SETTINGS[key]

    return jsonify({key: value})


@settings_bp.route("/api/settings/<key>", methods=["POST"])
def save_setting(key):
    """Save a single setting for the current user."""
    user_id = _get_current_user_id()

    if not user_id:
        return jsonify({"error": "Требуется авторизация"}), 401

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Некорректные данные"}), 400

    set_user_setting(user_id, key, data.get("value", data))
    logger.info("Setting '%s' saved for user_id=%s", key, user_id)
    return jsonify({"success": True, "key": key})


# ==================== CONTINUE WATCHING DB API ====================

@settings_bp.route("/api/continue_watching", methods=["GET"])
def get_continue_watching():
    """Get continue watching list for the current user from database."""
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify([])

    data = get_user_setting(user_id, "continue_watching", [])
    if not isinstance(data, list):
        data = []
    return jsonify(data)


@settings_bp.route("/api/continue_watching", methods=["POST"])
def save_continue_watching():
    """Save or update continue watching list for the current user in database."""
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Требуется авторизация"}), 401

    req_data = request.get_json(silent=True)
    if not req_data:
        return jsonify({"error": "Некорректные данные"}), 400

    current_list = get_user_setting(user_id, "continue_watching", [])
    if not isinstance(current_list, list):
        current_list = []

    if isinstance(req_data, list):
        new_list = req_data
    elif isinstance(req_data, dict):
        anime_id = req_data.get("id")
        if not anime_id:
            return jsonify({"error": "Missing anime id"}), 400
        current_list = [item for item in current_list if str(item.get("id")) != str(anime_id)]
        current_list.insert(0, req_data)
        new_list = current_list[:30]
    else:
        return jsonify({"error": "Invalid format"}), 400

    set_user_settings(user_id, {"continue_watching": new_list})
    logger.info("Saved continue_watching for user_id=%s (%d items)", user_id, len(new_list))
    return jsonify({"success": True, "data": new_list})


@settings_bp.route("/api/continue_watching/<int:anime_id>", methods=["DELETE"])
def delete_continue_watching(anime_id):
    """Remove item from continue watching list in database."""
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Требуется авторизация"}), 401

    current_list = get_user_setting(user_id, "continue_watching", [])
    if isinstance(current_list, list):
        current_list = [item for item in current_list if str(item.get("id")) != str(anime_id)]
        set_user_settings(user_id, {"continue_watching": current_list})

    logger.info("Removed anime_id=%s from continue_watching for user_id=%s", anime_id, user_id)
    return jsonify({"success": True})
