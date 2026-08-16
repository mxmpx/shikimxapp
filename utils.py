import os
import re
import time
import logging
import requests
from flask import session
from dotenv import load_dotenv
from markupsafe import Markup
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

logger = logging.getLogger("shikimxapp.utils")

SHIKIMORI_BASE = "https://shikimori.io"
CLIENT_ID = os.getenv("SHIKIMORI_CLIENT_ID")
CLIENT_SECRET = os.getenv("SHIKIMORI_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SHIKIMORI_REDIRECT_URI", "http://127.0.0.1:5000/auth/callback")
APP_NAME = os.getenv("SHIKIMORI_APP_NAME", "MyLocalApp/1.0")
AUTH_URL = f"{SHIKIMORI_BASE}/oauth/authorize"
TOKEN_URL = f"{SHIKIMORI_BASE}/oauth/token"
WHOAMI_URL = f"{SHIKIMORI_BASE}/api/users/whoami"

API_DATA_CACHE = {}

def fetch_with_retry(url, headers):
    last_status = None
    for attempt in range(4):
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                return r.json()
            last_status = r.status_code
            if r.status_code == 429:
                logger.warning("Rate limit 429 for %s (attempt %d/4)", url, attempt + 1)
                time.sleep(0.3 * (attempt + 1))
            else:
                logger.warning("API %s returned %s (attempt %d/4)", url, r.status_code, attempt + 1)
        except requests.RequestException as exc:
            logger.warning("Request failed for %s (attempt %d/4): %s", url, attempt + 1, exc)
            time.sleep(0.2)
    logger.error("All retry attempts failed for %s (last status: %s)", url, last_status)
    return None

def fetch_cached_api(url, headers, ttl=1800):
    now = time.time()
    if url in API_DATA_CACHE:
        data, expires = API_DATA_CACHE[url]
        if now < expires:
            return data
    data = fetch_with_retry(url, headers)
    if data is not None:
        API_DATA_CACHE[url] = (data, now + ttl)
        logger.debug("Cached API response: %s (ttl=%ss)", url, ttl)
    else:
        logger.warning("Failed to fetch API data: %s", url)
    return data

def get_auth_headers():
    access_token = session.get("access_token")
    if not access_token:
        return None
    return {"User-Agent": APP_NAME, "Authorization": f"Bearer {access_token}"}

def fix_image_url(image_data):
    if not image_data:
        return ""
    if isinstance(image_data, dict):
        path = image_data.get("original") or image_data.get("x160") or image_data.get("x148") or image_data.get("x96") or image_data.get("preview") or image_data.get("main") or ""
    else:
        path = str(image_data)
        path = re.sub(r"/(x64|x32|preview)/", "/original/", path)

    if not path or path == "None" or path == "{}":
        return ""
    if not path.startswith("http://") and not path.startswith("https://"):
        if not path.startswith("/"):
            path = "/" + path
        path = f"https://shikimori.io{path}"

    return f"/cache/img?url={path}"

def parse_shikimori_bbcode(text):
    if not text:
        return ""
    text = re.sub(r'\[center\](.*?)\[/center\]', r'<div style="text-align: center;">\1</div>', text, flags=re.DOTALL)
    text = re.sub(r'\[size=(\d+)\](.*?)\[/size\]', r'<span style="font-size: \1px;">\2</span>', text, flags=re.DOTALL)

    def replace_shiki_tag(m):
        tag_type, attr_str = m.group(1), m.group(2)
        ids_match = re.search(r'ids=([\d,]+)', attr_str)
        cols_match = re.search(r'columns=(\d+)', attr_str)
        ids = ids_match.group(1) if ids_match else ''
        cols = cols_match.group(1) if cols_match else ('8' if tag_type == 'characters' else '5')
        wall_class = ' wall-grid' if 'wall' in attr_str else ''
        return f'<div class="shiki-grid{wall_class}" data-type="{tag_type}" data-ids="{ids}" style="--cols: {cols}"></div>'

    text = re.sub(r'\[(animes|characters)\s+([^\]]+)\]', replace_shiki_tag, text)
    return Markup(text)