import logging
from functools import wraps

from flask import jsonify, request

logger = logging.getLogger("shikimxapp")


class AppError(Exception):
    def __init__(self, message, status_code=400, log_level=logging.WARNING):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.log_level = log_level


def json_error(message, status_code=500, log_level=logging.WARNING, exc=None):
    if exc is not None:
        logger.log(log_level, "%s: %s", message, exc, exc_info=log_level >= logging.ERROR)
    else:
        logger.log(log_level, "%s", message)
    return jsonify({"error": message}), status_code


def log_exception(context, exc):
    logger.exception("%s", context)


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error):
        logger.log(error.log_level, "AppError [%s %s]: %s", request.method, request.path, error.message)
        if _wants_json():
            return jsonify({"error": error.message}), error.status_code
        return error.message, error.status_code

    @app.errorhandler(404)
    def handle_not_found(error):
        logger.warning("404 %s %s", request.method, request.path)
        if _wants_json():
            return jsonify({"error": "Ресурс не найден"}), 404
        return "Страница не найдена", 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        logger.warning("405 %s %s", request.method, request.path)
        if _wants_json():
            return jsonify({"error": "Метод не поддерживается"}), 405
        return "Метод не поддерживается", 405

    @app.errorhandler(500)
    def handle_internal_error(error):
        logger.error("500 %s %s", request.method, request.path)
        if _wants_json():
            return jsonify({"error": "Внутренняя ошибка сервера"}), 500
        return "Внутренняя ошибка сервера", 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        if isinstance(error, AppError):
            raise error
        logger.exception("Unhandled exception [%s %s]", request.method, request.path)
        if _wants_json():
            return jsonify({"error": "Внутренняя ошибка сервера"}), 500
        return "Внутренняя ошибка сервера", 500


def register_request_logging(app):
    @app.before_request
    def log_incoming_request():
        if _skip_request_log():
            return
        logger.debug("→ %s %s", request.method, request.path)

    @app.after_request
    def log_outgoing_response(response):
        if _skip_request_log():
            return response
        logger.debug("← %s %s %s", request.method, request.path, response.status_code)
        return response


def api_route(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AppError as error:
            logger.log(error.log_level, "%s: %s", f.__name__, error.message)
            return jsonify({"error": error.message}), error.status_code
        except Exception as error:
            logger.exception("Unhandled error in %s", f.__name__)
            return jsonify({"error": "Внутренняя ошибка сервера"}), 500

    return wrapper


def _wants_json():
    return request.path.startswith("/api/") or request.accept_mimetypes.best == "application/json"


def _skip_request_log():
    return request.path.startswith("/static/") or request.path.startswith("/cache/img")
