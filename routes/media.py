import os
import hashlib
import logging
import requests
from urllib.parse import urlparse
from flask import Blueprint, redirect, request, send_from_directory, current_app
from utils import APP_NAME

logger = logging.getLogger("shikimxapp.media")
media_bp = Blueprint('media', __name__)

ALLOWED_IMAGE_HOSTS = {
    "shikimori.one",
    "shikimori.io",
    "shikimori.me",
    "desu.shikimori.one",
    "desu.shikimori.io",
    "desu.shikimori.me",
    "dere.shikimori.one",
    "dere.shikimori.io",
    "dere.shikimori.me",
    "nyaa.si",
    "nyaa.iss.one",
    "img.youtube.com",
    "i.ytimg.com",
    "i9.ytimg.com",
    "youtube.com",
    "www.youtube.com",
    "cdn.myanimelist.net",
    "raw.githubusercontent.com",
    "images.weserv.nl"
}

ALLOWED_HOST_SUFFIXES = (
    ".shikimori.one",
    ".shikimori.io",
    ".shikimori.me",
    ".youtube.com",
    ".ytimg.com",
    ".myanimelist.net"
)


def is_allowed_image_url(url_str):
    try:
        parsed = urlparse(url_str)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        # Prevent loopback and private IP SSRF
        if (
            hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1")
            or hostname.startswith("192.168.")
            or hostname.startswith("10.")
            or hostname.startswith("172.16.")
            or hostname.startswith("172.17.")
            or hostname.startswith("172.18.")
            or hostname.startswith("172.19.")
            or hostname.startswith("172.20.")
            or hostname.startswith("172.21.")
            or hostname.startswith("172.22.")
            or hostname.startswith("172.23.")
            or hostname.startswith("172.24.")
            or hostname.startswith("172.25.")
            or hostname.startswith("172.26.")
            or hostname.startswith("172.27.")
            or hostname.startswith("172.28.")
            or hostname.startswith("172.29.")
            or hostname.startswith("172.30.")
            or hostname.startswith("172.31.")
            or hostname.startswith("169.254.")
        ):
            return False
        if hostname in ALLOWED_IMAGE_HOSTS or any(hostname.endswith(sfx) for sfx in ALLOWED_HOST_SUFFIXES):
            return True
        return False
    except Exception:
        return False


@media_bp.route("/cache/img")
def cache_img():
    img_url = request.args.get("url")
    if not img_url:
        logger.warning("Image cache request without URL")
        return "Missing URL", 400

    if not is_allowed_image_url(img_url):
        logger.warning("Disallowed image cache host attempted: %s", img_url)
        return "Forbidden host", 403

    clean_url = img_url.split("?")[0]
    ext = clean_url.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"

    cache_dir = os.path.join(current_app.root_path, "static", "img_cache")
    os.makedirs(cache_dir, exist_ok=True)

    filename = hashlib.md5(img_url.encode("utf-8")).hexdigest() + f".{ext}"
    filepath = os.path.join(cache_dir, filename)

    if os.path.exists(filepath):
        logger.debug("Image cache hit: %s", filename)
        return send_from_directory(cache_dir, filename)

    try:
        r = requests.get(img_url, headers={"User-Agent": APP_NAME}, timeout=10)
        if r.status_code == 200 and len(r.content) <= 15 * 1024 * 1024:  # Max 15MB
            with open(filepath, "wb") as f:
                f.write(r.content)
            logger.debug("Image cached: %s", filename)
            return send_from_directory(cache_dir, filename)
        logger.warning("Image download failed (%s): %s", r.status_code, img_url)
    except requests.RequestException as exc:
        logger.warning("Image cache error for %s: %s", img_url, exc)

    logger.info("Redirecting to original image: %s", img_url)
    return redirect(img_url)
