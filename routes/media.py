import os
import time
import hashlib
import logging
import threading
import ipaddress
import socket
import requests
from urllib.parse import urlparse, unquote
from flask import Blueprint, redirect, request, send_from_directory, current_app
from utils import APP_NAME

logger = logging.getLogger("shikimxapp.media")
media_bp = Blueprint('media', __name__)

# Очистка img_cache: максимальный возраст файла (секунд)
IMG_CACHE_MAX_AGE_SEC = 30 * 24 * 3600   # 30 дней
# Очистка запускается, если кэш превышает данный порог (байт)
IMG_CACHE_MAX_SIZE_BYTES = 500 * 1024 * 1024  # 500 МБ
# Интервал между запусками очистки (секунд)
IMG_CACHE_CLEANUP_INTERVAL = 3600  # 1 час

_img_cache_last_cleanup = 0.0
_img_cache_cleanup_lock = threading.Lock()
_failed_image_urls = set()
_failed_image_lock = threading.Lock()

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
    "camo-v3.shikimori.io",
    "nyaa.si",
    "nyaa.iss.one",
    "img.youtube.com",
    "i.ytimg.com",
    "i9.ytimg.com",
    "youtube.com",
    "www.youtube.com",
    "cdn.myanimelist.net",
    "raw.githubusercontent.com",
    "images.weserv.nl",
    "imgur.com",
    "i.imgur.com",
    "vk.com",
    "userapi.com",
    "vkuser.net",
    "i.redd.it",
    "preview.redd.it",
    "cdn.discordapp.com",
    "media.discordapp.net",
}

ALLOWED_HOST_SUFFIXES = (
    ".shikimori.one",
    ".shikimori.io",
    ".shikimori.me",
    ".youtube.com",
    ".ytimg.com",
    ".myanimelist.net",
    ".imgur.com",
    ".userapi.com",
    ".vk.me",
    ".vk.com",
    ".redd.it",
    ".discordapp.com",
    ".discordapp.net",
)


import urllib3.util.connection as urllib_conn

_orig_create_connection = urllib_conn.create_connection


def _safe_create_connection(address, *args, **kwargs):
    """Enforce socket-level IP validation right at connection time to defeat DNS rebinding attacks."""
    host, port = address
    try:
        addrinfo = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for *_, sockaddr in addrinfo:
            ip = ipaddress.ip_address(sockaddr[0])
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                raise OSError(f"SSRF blocked: connection to private address {ip} forbidden")
    except (socket.gaierror, ValueError) as exc:
        raise OSError(f"SSRF DNS resolution failed for {host}: {exc}") from exc

    return _orig_create_connection(address, *args, **kwargs)


def _is_private_host(hostname: str) -> bool:
    """Return True if hostname is a private/loopback/link-local/multicast/reserved address."""
    if not hostname:
        return True
    h = hostname.strip().lower().strip("[]")
    if h in ("localhost", "0.0.0.0"):
        return True
    try:
        ip = ipaddress.ip_address(h)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        try:
            resolved_ip = socket.gethostbyname(h)
            ip = ipaddress.ip_address(resolved_ip)
            return (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            )
        except (socket.gaierror, ValueError):
            return False


def is_valid_image_content(content: bytes, content_type: str = "") -> bool:
    """Validate image magic bytes and content-type header."""
    if not content or len(content) < 8:
        return False

    if content_type:
        ct = content_type.lower().split(";")[0].strip()
        if not ct.startswith("image/"):
            return False

    # JPEG: \xff\xd8\xff
    if content[:3] == b"\xff\xd8\xff":
        return True
    # PNG: \x89PNG\r\n\x1a\n
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    # GIF: GIF87a or GIF89a
    if content[:6] in (b"GIF87a", b"GIF89a"):
        return True
    # WebP: RIFF ... WEBP
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return True
    # AVIF
    if len(content) >= 12 and b"ftyp" in content[4:12]:
        return True

    return False


def is_allowed_image_url(url_str):
    """Возвращает True, если URL разрешён для проксирования."""
    try:
        parsed = urlparse(url_str)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname or _is_private_host(hostname):
            return False
        if hostname in ALLOWED_IMAGE_HOSTS or any(hostname.endswith(sfx) for sfx in ALLOWED_HOST_SUFFIXES):
            return True
        return False
    except Exception as exc:
        logger.debug("Ошибка проверки URL '%s': %s", url_str, exc)
        return False


def cleanup_img_cache(cache_dir: str, force: bool = False) -> None:
    """Удаляет старые файлы из img_cache/ по LRU-политике.

    Запускается автоматически раз в час (через IMG_CACHE_CLEANUP_INTERVAL) или force=True.
    Удаляет файлы старше IMG_CACHE_MAX_AGE_SEC и/или при превышении IMG_CACHE_MAX_SIZE_BYTES.
    """
    global _img_cache_last_cleanup
    if not force:
        if not _img_cache_cleanup_lock.acquire(blocking=False):
            return
        try:
            now = time.time()
            if now - _img_cache_last_cleanup < IMG_CACHE_CLEANUP_INTERVAL:
                return
            _img_cache_last_cleanup = now
        finally:
            _img_cache_cleanup_lock.release()

    try:
        if not os.path.isdir(cache_dir):
            return

        now = time.time()
        # Собираем все файлы с atime (время последнего обращения)
        entries = []
        total_size = 0
        for fname in os.listdir(cache_dir):
            fpath = os.path.join(cache_dir, fname)
            if not os.path.isfile(fpath):
                continue
            try:
                st = os.stat(fpath)
                entries.append((st.st_atime, fpath, st.st_size))
                total_size += st.st_size
            except OSError:
                continue

        removed_count = 0
        removed_size = 0

        # Шаг 1: удаляем файлы старше 30 дней
        for atime, fpath, size in entries:
            if now - atime > IMG_CACHE_MAX_AGE_SEC:
                try:
                    os.remove(fpath)
                    removed_count += 1
                    removed_size += size
                    total_size -= size
                except OSError:
                    pass

        # Шаг 2: если кэш всё ещё превышает лимит, удаляем наиболее старые (по atime)
        if total_size > IMG_CACHE_MAX_SIZE_BYTES:
            # Перестраиваем актуальные записи (исключаем уже удалённые)
            existing = [(a, p, s) for a, p, s in entries if os.path.exists(p)]
            existing.sort()  # самые старые atime — первые
            for atime, fpath, size in existing:
                if total_size <= IMG_CACHE_MAX_SIZE_BYTES:
                    break
                try:
                    os.remove(fpath)
                    removed_count += 1
                    removed_size += size
                    total_size -= size
                except OSError:
                    pass

        if removed_count:
            logger.info(
                "img_cache очищена: удалено %d файлов (%.1f МБ), осталось %.1f МБ",
                removed_count, removed_size / 1024 / 1024, total_size / 1024 / 1024
            )
        else:
            logger.debug("img_cache очистка: удалять нечего (%.1f МБ)", total_size / 1024 / 1024)

    except Exception as exc:
        logger.warning("Ошибка при очистке img_cache: %s", exc)


@media_bp.route("/cache/img")
def cache_img():
    # Извлекаем полный URL, сохраняя вложенные параметры и HMAC-подписи (например, camo tokens)
    qs = request.query_string.decode("utf-8", errors="ignore")
    if qs.startswith("url="):
        raw_target = qs[4:]
        if raw_target.startswith("http%3A") or raw_target.startswith("https%3A"):
            img_url = unquote(raw_target)
        else:
            img_url = raw_target
    else:
        img_url = request.args.get("url")

    if not img_url:
        logger.warning("Image cache request without URL")
        return "Missing URL", 400

    # Быстрый возврат для ранее проверенных недоступных/битых картинок (без зависания потоков)
    with _failed_image_lock:
        if img_url in _failed_image_urls:
            return "Image unavailable", 404

    if not is_allowed_image_url(img_url):
        try:
            parsed = urlparse(img_url)
            hostname = (parsed.hostname or "").lower()
            if parsed.scheme in ("http", "https") and hostname and not _is_private_host(hostname):
                logger.info("Redirecting unallowlisted public image directly: %s", img_url)
                return redirect(img_url, 302)
        except Exception:
            pass
        logger.warning("Disallowed image cache host attempted: %s", img_url)
        return "Forbidden host", 403

    clean_url = img_url.split("?")[0]
    ext = clean_url.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"

    cache_dir = os.path.join(current_app.root_path, "static", "img_cache")
    os.makedirs(cache_dir, exist_ok=True)

    # Фоновая очистка старых файлов не чаще раза в час
    global _img_cache_last_cleanup
    if time.time() - _img_cache_last_cleanup > IMG_CACHE_CLEANUP_INTERVAL:
        threading.Thread(
            target=cleanup_img_cache,
            args=(cache_dir,),
            daemon=True,
            name="img-cache-cleanup"
        ).start()

    filename = hashlib.md5(img_url.encode("utf-8")).hexdigest() + f".{ext}"
    filepath = os.path.join(cache_dir, filename)

    if os.path.exists(filepath):
        logger.debug("Image cache hit: %s", filename)
        response = send_from_directory(cache_dir, filename)
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response

    try:
        # Patch socket creation during proxy fetch to prevent DNS rebinding
        urllib_conn.create_connection = _safe_create_connection
        try:
            r = requests.get(img_url, headers={"User-Agent": APP_NAME}, timeout=3.5)
        finally:
            urllib_conn.create_connection = _orig_create_connection

        content_type = r.headers.get("Content-Type", "")
        if r.status_code == 200 and len(r.content) <= 15 * 1024 * 1024:  # Max 15MB
            if not is_valid_image_content(r.content, content_type):
                logger.warning("Invalid image content or MIME type (%s) for %s", content_type, img_url)
                return "Invalid image format", 400
            with open(filepath, "wb") as f:
                f.write(r.content)
            logger.debug("Image cached: %s", filename)
            response = send_from_directory(cache_dir, filename)
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response
        logger.warning("Image download failed (%s): %s", r.status_code, img_url)
        with _failed_image_lock:
            _failed_image_urls.add(img_url)
        return "Image unavailable", 404
    except requests.RequestException as exc:
        logger.warning("Image cache error for %s: %s", img_url, exc)
        with _failed_image_lock:
            _failed_image_urls.add(img_url)

    return "Image error", 404
