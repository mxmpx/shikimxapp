import os
import logging
from flask import Blueprint, jsonify

logger = logging.getLogger("shikimxapp.about")

about_bp = Blueprint('about', __name__)

INFO_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app_info.txt")

_INFO_CACHE = {"data": None, "mtime": None}

def _parse_info_file():
    """Parse app_info.txt and return structured data."""
    info = {
        "app_name": "Shiki MX App",
        "version": "1.0.0",
        "description": "",
        "author": "Shiki MX Team",
        "stack": [],
        "features": [],
        "changelog": [],
        "shikimori_status": "Подключено",
    }
    
    if not os.path.exists(INFO_FILE):
        logger.error("App info file not found: %s", INFO_FILE)
        return info
    
    try:
        with open(INFO_FILE, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    except OSError as exc:
        logger.error("Failed to read app info file %s: %s", INFO_FILE, exc)
        return info
    
    section = None
    current_entry = None
    
    for raw_line in lines:
        line = raw_line.strip()
        if not line or (line.startswith("#") and not line.startswith("###")):
            continue
        
        # Section headers
        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1].strip().upper()
            continue
        
        # CHANGELOG section
        if section == "CHANGELOG":
            if line.startswith("###"):
                parts = [p.strip() for p in line.lstrip("#").strip().split("|", 2)]
                if len(parts) >= 2:
                    current_entry = {
                        "version": parts[0],
                        "date": parts[1],
                        "title": parts[2] if len(parts) > 2 else "",
                        "changes": [],
                    }
                    info["changelog"].append(current_entry)
                else:
                    current_entry = None
            elif line.startswith("-") and current_entry is not None:
                current_entry["changes"].append(line.lstrip("-").strip())
            continue
        
        # FEATURES section
        if section == "FEATURES":
            info["features"].append(line)
            continue
        
        # Key=value pairs (before any section)
        if "=" in line:
            key, value = line.split("=", 1)
            key, value = key.strip().upper(), value.strip()
            if key == "VERSION":
                info["version"] = value
            elif key == "APP_NAME":
                info["app_name"] = value
            elif key == "DESCRIPTION":
                info["description"] = value
            elif key == "AUTHOR":
                info["author"] = value
            elif key == "STACK":
                info["stack"] = [s.strip() for s in value.split(";") if s.strip()]
            elif key == "SHIKIMORI_STATUS":
                info["shikimori_status"] = value
    
    return info

def load_app_info():
    """Load app info with mtime-based caching."""
    try:
        mtime = os.path.getmtime(INFO_FILE)
    except OSError:
        mtime = None
    
    if _INFO_CACHE["data"] is not None and _INFO_CACHE["mtime"] == mtime:
        return _INFO_CACHE["data"]
    
    data = _parse_info_file()
    _INFO_CACHE["data"] = data
    _INFO_CACHE["mtime"] = mtime
    return data

@about_bp.route("/about")
@about_bp.route("/api/about")
def get_about_info():
    info = load_app_info()
    return jsonify(info)
