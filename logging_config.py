import logging
import os
import sys

LOG_FORMAT = "[%(asctime)s] %(levelname)-8s %(name)s | %(message)s"
LOG_DATE_FORMAT = "%H:%M:%S"


def setup_logging(debug=False):
    level_name = os.getenv("LOG_LEVEL", "DEBUG" if debug else "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))
    root.addHandler(handler)

    logging.getLogger("werkzeug").setLevel(logging.INFO if debug else logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    app_logger = logging.getLogger("shikimxapp")
    app_logger.info("Logging initialized (level=%s, debug=%s)", level_name, debug)
    return app_logger
