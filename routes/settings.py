import json
import logging
from flask import Blueprint, jsonify, request, session
from database import (
    get_or_create_user, get_user_settings, set_user_settings,
    get_user_setting, set_user_setting
)

logger = logging.getLogger("shikimxapp.settings")
settings_bp = Blueprint('settings', __name__)

DEFAULT_SETTINGS = {
    "background": {
        "mode": "theme",  # theme — фон темы | color — свой цвет | image — своё фото
        "color": "",
        "image": "",
    },
    "navbar_view": "full",
    "section_visibility": {},
    "language": "ru"
}


ALLOWED_SETTINGS_KEYS = set(DEFAULT_SETTINGS.keys()) | {"theme", "player", "sidebar", "video_player"}
MAX_GUEST_SETTING_VAL_BYTES = 512
MAX_GUEST_CONTINUE_WATCHING = 5


def _get_current_user_id():
    """Get the current logged-in user's internal database ID from session."""
    shikimori_id = session.get("user_id")

    if shikimori_id:
        # Find or create user by shikimori_id
        user = get_or_create_user(shikimori_id=shikimori_id)
        return user["id"]
    return None


@settings_bp.route("/api/settings", methods=["GET"])
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
        guest_settings = dict(DEFAULT_SETTINGS)
        for k in DEFAULT_SETTINGS:
            if f"setting_{k}" in session:
                guest_settings[k] = session[f"setting_{k}"]
        return jsonify(guest_settings)


@settings_bp.route("/api/settings", methods=["POST"])
def save_settings():
    """Save settings for the current user."""
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Некорректные данные"}), 400

    user_id = _get_current_user_id()
    if user_id:
        set_user_settings(user_id, data)
        logger.info("Settings saved in DB for user_id=%s: %s", user_id, list(data.keys()))
    else:
        for k, v in data.items():
            if k in ALLOWED_SETTINGS_KEYS:
                # Prevent cookie overflow on guest sessions
                try:
                    val_str = json.dumps(v)
                    if len(val_str) <= MAX_GUEST_SETTING_VAL_BYTES:
                        session[f"setting_{k}"] = v
                except (TypeError, ValueError):
                    pass

    return jsonify({"success": True, "settings": data})


@settings_bp.route("/api/settings/<key>", methods=["GET"])
def get_setting(key):
    """Get a single setting for the current user."""
    user_id = _get_current_user_id()

    if user_id:
        value = get_user_setting(user_id, key)
        if value is None and key in DEFAULT_SETTINGS:
            value = DEFAULT_SETTINGS[key]
        return jsonify({key: value, "value": value})
    else:
        value = session.get(f"setting_{key}", DEFAULT_SETTINGS.get(key))
        return jsonify({key: value, "value": value})


@settings_bp.route("/api/settings/<key>", methods=["POST"])
def save_setting(key):
    """Save a single setting for the current user."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Некорректные данные"}), 400

    val = data.get("value", data) if isinstance(data, dict) else data
    user_id = _get_current_user_id()
    if user_id:
        set_user_setting(user_id, key, val)
        logger.info("Setting '%s' saved in DB for user_id=%s", key, user_id)
    else:
        if key in ALLOWED_SETTINGS_KEYS:
            try:
                val_str = json.dumps(val)
                if len(val_str) <= MAX_GUEST_SETTING_VAL_BYTES:
                    session[f"setting_{key}"] = val
            except (TypeError, ValueError):
                pass

    return jsonify({"success": True, "key": key, "value": val})


# ==================== CONTINUE WATCHING DB API ====================

@settings_bp.route("/api/continue_watching", methods=["GET"])
def get_continue_watching():
    """Get continue watching list for the current user from database or guest session."""
    user_id = _get_current_user_id()
    if user_id:
        data = get_user_setting(user_id, "continue_watching", [])
    else:
        data = session.get("continue_watching", [])

    if not isinstance(data, list):
        data = []
    return jsonify(data)


@settings_bp.route("/api/continue_watching", methods=["POST"])
def save_continue_watching():
    """Save or update continue watching list for the current user in database or session."""
    user_id = _get_current_user_id()
    req_data = request.get_json(silent=True)
    if not req_data:
        return jsonify({"error": "Некорректные данные"}), 400

    if user_id:
        current_list = get_user_setting(user_id, "continue_watching", [])
    else:
        current_list = session.get("continue_watching", [])

    if not isinstance(current_list, list):
        current_list = []

    if isinstance(req_data, list):
        new_list = req_data
    elif isinstance(req_data, dict):
        anime_id = req_data.get("id") or req_data.get("anime_id")
        if not anime_id:
            return jsonify({"error": "Missing anime id"}), 400
        try:
            req_data["id"] = int(anime_id)
        except (ValueError, TypeError):
            req_data["id"] = anime_id
        current_list = [
            item for item in current_list
            if str(item.get("id")) != str(anime_id) and str(item.get("anime_id")) != str(anime_id)
        ]
        current_list.insert(0, req_data)
        new_list = current_list[:30]
    else:
        return jsonify({"error": "Invalid format"}), 400

    if user_id:
        set_user_settings(user_id, {"continue_watching": new_list})
        logger.info("Saved continue_watching for user_id=%s (%d items)", user_id, len(new_list))
    else:
        # Keep minimal fields and small count in session cookie for guests to prevent overflow
        slim_list = [
            {
                "id": item.get("id"),
                "anime_id": item.get("anime_id") or item.get("id"),
                "title": (item.get("title") or item.get("name") or "")[:40],
                "ep": item.get("ep") or item.get("episode") or 1,
            }
            for item in new_list[:MAX_GUEST_CONTINUE_WATCHING]
        ]
        session["continue_watching"] = slim_list
        session.modified = True
        logger.info("Saved compact continue_watching in session for guest (%d items)", len(slim_list))

    return jsonify({"success": True, "data": new_list})


@settings_bp.route("/api/continue_watching/<int:anime_id>", methods=["DELETE"])
def delete_continue_watching(anime_id):
    """Remove item from continue watching list in database or session."""
    user_id = _get_current_user_id()
    if user_id:
        current_list = get_user_setting(user_id, "continue_watching", [])
    else:
        current_list = session.get("continue_watching", [])

    if isinstance(current_list, list):
        current_list = [
            item for item in current_list
            if str(item.get("id")) != str(anime_id) and str(item.get("anime_id")) != str(anime_id)
        ]
        if user_id:
            set_user_settings(user_id, {"continue_watching": current_list})
        else:
            session["continue_watching"] = current_list
            session.modified = True

    logger.info("Removed anime_id=%s from continue_watching", anime_id)
    return jsonify({"success": True})
