import os
import sys
import json
import logging
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler

LOG_FORMAT = "[%(asctime)s.%(msecs)03d] %(levelname)-7s | [%(name)s:%(lineno)d] %(message)s"
LOG_DATE_FORMAT = "%H:%M:%S"
FILE_LOG_FORMAT = "%(asctime)s.%(msecs)03d [%(process)d:%(threadName)s] %(levelname)-8s %(name)s:%(lineno)d - %(message)s"
FILE_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class JSONFormatter(logging.Formatter):
    """Structured JSON formatter for production monitoring and log collectors."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "process": record.process,
            "thread": record.threadName,
            "file": record.filename,
            "line": record.lineno,
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj, ensure_ascii=False)


def setup_logging(debug=True):
    """
    Configure structured logging for Shiki MX App.
    - Console output with timestamps and module names (or structured JSON if LOG_FORMAT=json).
    - File logging with rotation to logs/shikimxapp.log.
    """
    level_name = os.getenv("LOG_LEVEL", "DEBUG" if debug else "INFO").upper()
    level = getattr(logging, level_name, logging.DEBUG)

    use_json = os.getenv("LOG_FORMAT", "").lower() == "json"

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    # 1. Console Stream Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    if use_json:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))
    root.addHandler(console_handler)

    # 2. File Handler (Rotating)
    try:
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file_path = os.path.join(log_dir, "shikimxapp.log")

        file_handler = RotatingFileHandler(
            log_file_path,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG)
        if use_json:
            file_handler.setFormatter(JSONFormatter())
        else:
            file_handler.setFormatter(logging.Formatter(FILE_LOG_FORMAT, FILE_DATE_FORMAT))
        root.addHandler(file_handler)
    except Exception as exc:
        sys.stderr.write(f"Warning: Could not configure file logger: {exc}\n")

    # Library log levels
    logging.getLogger("werkzeug").setLevel(logging.INFO if debug else logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)

    app_logger = logging.getLogger("shikimxapp")
    app_logger.info(
        "[INIT] Logger initialized (level=%s, debug=%s, json_format=%s)",
        level_name, debug, use_json
    )
    return app_logger
