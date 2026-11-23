import os
import sys
import time
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


class SafeRotatingFileHandler(RotatingFileHandler):
    """
    RotatingFileHandler that safely handles Windows file locking (WinError 32)
    during rollover across multiple concurrent threads or background processes.
    Prevents cascading exceptions and I/O lockup on Windows.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._last_rollover_fail = 0.0

    def shouldRollover(self, record):
        # Cool down rollover attempts for 30s if file is temporarily locked by another thread
        if time.time() - self._last_rollover_fail < 30.0:
            return False
        return super().shouldRollover(record)

    def doRollover(self):
        try:
            super().doRollover()
            self._last_rollover_fail = 0.0
        except (PermissionError, OSError):
            self._last_rollover_fail = time.time()
            if not self.stream:
                try:
                    self.stream = self._open()
                except Exception:
                    pass


def setup_logging(debug=True):
    """
    Configure structured logging for Shiki MX App.
    - Console output with timestamps and module names (or structured JSON if LOG_FORMAT=json).
    - File logging with rotation to logs/shikimxapp.log.
    """
    root_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    root_level = getattr(logging, root_level_name, logging.INFO)

    use_json = os.getenv("LOG_FORMAT", "").lower() == "json"

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(root_level)

    # 1. Console Stream Handler
    console_level_name = os.getenv("CONSOLE_LOG_LEVEL", "INFO").upper()
    console_level = getattr(logging, console_level_name, logging.INFO)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(console_level)
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

        file_handler = SafeRotatingFileHandler(
            log_file_path,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG if debug else logging.INFO)
        if use_json:
            file_handler.setFormatter(JSONFormatter())
        else:
            file_handler.setFormatter(logging.Formatter(FILE_LOG_FORMAT, FILE_DATE_FORMAT))
        root.addHandler(file_handler)
    except Exception as exc:
        sys.stderr.write(f"Warning: Could not configure file logger: {exc}\n")

    # Muffle high-volume internal/third-party loggers that flood DEBUG (especially HTTP/2 hpack & asyncio)
    noisy_loggers = [
        "hpack",
        "httpcore",
        "httpx",
        "asyncio",
        "urllib3",
        "requests",
        "charset_normalizer",
        "anicli_api",
        "werkzeug",
    ]
    for name in noisy_loggers:
        logging.getLogger(name).setLevel(logging.WARNING)

    # Shiki MX App application logger
    app_logger = logging.getLogger("shikimxapp")
    app_logger.setLevel(logging.DEBUG if debug else logging.INFO)
    app_logger.info(
        "[INIT] Logger initialized (root_level=%s, app_level=%s, console=%s, json_format=%s)",
        root_level_name, "DEBUG" if debug else "INFO", console_level_name, use_json
    )
    return app_logger
