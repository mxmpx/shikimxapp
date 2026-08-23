import logging
from flask import Blueprint, jsonify, session

logger = logging.getLogger("shikimxapp.auth_status")
auth_status_bp = Blueprint('auth_status', __name__)


@auth_status_bp.route("/api/auth/status")
def auth_status():
    """Check if the current user is authenticated."""
    is_authenticated = bool(session.get("user_id"))
    return jsonify({"authenticated": is_authenticated})
