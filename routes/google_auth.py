import os
import logging
from flask import Blueprint, jsonify
from errors import AppError

logger = logging.getLogger("shikimxapp.google_auth")
google_bp = Blueprint('google_auth', __name__)


@google_bp.route("/login/google")
def login_google():
    raise AppError("Авторизация через Google отключена", 404)


@google_bp.route("/auth/google/callback")
def google_callback():
    raise AppError("Авторизация через Google отключена", 404)


@google_bp.route("/auth/google/unlink")
def google_unlink():
    raise AppError("Авторизация через Google отключена", 404)
