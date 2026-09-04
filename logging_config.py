import os
import sys
import logging
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


def setup_logging(debug=True):
    """
    Настройка максимально подробного и структурированного логирования для Shiki MX App.
    - Вывод в stdout с таймстемпами (мс) и именами модулей/строк.
    - Запись полной истории логов в logs/shikimxapp.log с ротацией (до 5 файлов по 10 МБ).
    - Подробный уровень DEBUG по умолчанию для быстрой диагностики.
    """
    level_name = os.getenv("LOG_LEVEL", "DEBUG" if debug else "INFO").upper()
    level = getattr(logging, level_name, logging.DEBUG)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    # 1. Console Stream Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
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
        file_handler.setLevel(logging.DEBUG)  # Всегда пишем DEBUG в файл
        file_handler.setFormatter(logging.Formatter(FILE_LOG_FORMAT, FILE_DATE_FORMAT))
        root.addHandler(file_handler)
    except Exception as exc:
        sys.stderr.write(f"Warning: Could not configure file logger: {exc}\n")

    # Настройка уровней для библиотек
    logging.getLogger("werkzeug").setLevel(logging.INFO if debug else logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)

    app_logger = logging.getLogger("shikimxapp")
    app_logger.info(
        "[INIT] Logger initialized (level=%s, debug=%s, file_log=%s)",
        level_name, debug, os.path.exists(log_dir) if 'log_dir' in locals() else False
    )
    return app_logger

