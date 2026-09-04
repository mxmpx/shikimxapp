import time
import json
import logging
from functools import wraps

from flask import jsonify, request, session

logger = logging.getLogger("shikimxapp.request")


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
        user_id = session.get("user_id", "anon")
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        logger.log(
            error.log_level,
            "[APP_ERR] [%s %s] status=%s user=%s ip=%s | %s",
            request.method, request.full_path.rstrip('?'), error.status_code, user_id, ip, error.message
        )
        if _wants_json():
            return jsonify({"error": error.message}), error.status_code
        return error.message, error.status_code

    @app.errorhandler(404)
    def handle_not_found(error):
        if not _skip_request_log():
            logger.warning("[404_NOT_FOUND] %s %s", request.method, request.full_path.rstrip('?'))
        if _wants_json():
            return jsonify({"error": "Ресурс не найден"}), 404
        return "Страница не найдена", 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        logger.warning("[405_METHOD_NOT_ALLOWED] %s %s", request.method, request.full_path.rstrip('?'))
        if _wants_json():
            return jsonify({"error": "Метод не поддерживается"}), 405
        return "Метод не поддерживается", 405

    @app.errorhandler(500)
    def handle_internal_error(error):
        logger.error("[500_INTERNAL_ERROR] on %s %s", request.method, request.full_path.rstrip('?'))
        if _wants_json():
            return jsonify({"error": "Внутренняя ошибка сервера"}), 500
        return "Внутренняя ошибка сервера", 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        if isinstance(error, AppError):
            raise error
        user_id = session.get("user_id", "anon")
        logger.exception(
            "[UNHANDLED_EXCEPTION] [%s %s] user=%s: %s",
            request.method, request.full_path.rstrip('?'), user_id, error
        )
        if _wants_json():
            return jsonify({"error": "Внутренняя ошибка сервера"}), 500
        return "Внутренняя ошибка сервера", 500


def register_request_logging(app):
    @app.before_request
    def log_incoming_request():
        request.environ['_req_start_time'] = time.perf_counter()
        if _skip_request_log():
            return

        user_id = session.get("user_id", "anon")
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        query_str = f"?{request.query_string.decode('utf-8')}" if request.query_string else ""
        
        body_summary = ""
        if request.method in ("POST", "PUT", "PATCH") and request.is_json:
            try:
                raw_body = request.get_json(silent=True)
                if raw_body:
                    body_summary = f" body={json.dumps(raw_body, ensure_ascii=False)[:120]}"
            except Exception:
                pass

        logger.debug(
            "--> [REQ] %s %s%s | user=%s | ip=%s%s",
            request.method, request.path, query_str, user_id, ip, body_summary
        )

    @app.after_request
    def log_outgoing_response(response):
        if _skip_request_log():
            return response

        start_time = request.environ.get('_req_start_time')
        duration_ms = (time.perf_counter() - start_time) * 1000 if start_time else 0.0
        
        status = response.status_code
        size_bytes = response.content_length or 0
        size_str = f"{size_bytes / 1024:.1f}KB" if size_bytes > 0 else f"{len(response.get_data(as_text=False))}B"

        if status >= 500:
            logger.error("<-- [RES] %s %s -> %s (%s, %.1fms)", request.method, request.path, status, size_str, duration_ms)
        elif status >= 400:
            logger.warning("<-- [RES] %s %s -> %s (%s, %.1fms)", request.method, request.path, status, size_str, duration_ms)
        else:
            logger.debug("<-- [RES] %s %s -> %s (%s, %.1fms)", request.method, request.path, status, size_str, duration_ms)

        if duration_ms > 1000:
            logger.warning("[SLOW_REQ] %s %s took %.1fms (>1.0s)", request.method, request.path, duration_ms)

        return response


def api_route(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        start_t = time.perf_counter()
        try:
            res = f(*args, **kwargs)
            return res
        except AppError as error:
            elapsed = (time.perf_counter() - start_t) * 1000
            logger.log(error.log_level, "[APP_ERROR] in %s (%.1fms): %s", f.__name__, elapsed, error.message)
            return jsonify({"error": error.message}), error.status_code
        except Exception as error:
            elapsed = (time.perf_counter() - start_t) * 1000
            logger.exception("[EXCEPTION] in %s (%.1fms): %s", f.__name__, elapsed, error)
            return jsonify({"error": "Внутренняя ошибка сервера"}), 500

    return wrapper


def _wants_json():
    return request.path.startswith("/api/") or request.accept_mimetypes.best == "application/json"


def _skip_request_log():
    # Only skip high-frequency internal polling if needed, keep API and page routes visible
    return request.path.startswith("/static/fonts/") or request.path.startswith("/static/icons/") or request.path == "/favicon.ico"
