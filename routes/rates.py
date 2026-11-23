import time
import json
import logging
import threading
import requests
from flask import Blueprint, session, jsonify, request
from database import get_connection
from utils import (
    SHIKIMORI_BASE, APP_NAME, get_auth_headers, fetch_cached_api,
    resolve_posters_graphql, resolve_manga_posters_graphql, resolve_franchise_poster,
    fetch_graphql, fix_image_url, fetch_with_retry, background_executor
)
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.rates")
rates_bp = Blueprint('rates', __name__)

RATES_CACHE_TTL = 1800  # 30 minutes

from services.rates_cache import (
    _rates_mem_cache,
    _rates_locks,
    _build_rates_index,
    _get_rates_lock,
    invalidate_user_rates_mem_cache
)


def _verify_rate_ownership(user_id, rate_id, headers):
    """Check that rate_id belongs to user_id to defeat IDOR attacks."""
    if not user_id or not rate_id:
        return False
    uid = str(user_id)
    rid = str(rate_id)

    # 1. Check in-memory rates cache
    mem = _rates_mem_cache.get(uid)
    rates_data = mem.get("data") if mem else None
    if not rates_data:
        rates_data, _ = _get_cached_rates_from_db(uid)
    if rates_data:
        for r in rates_data:
            if str(r.get("id")) == rid:
                return True

    # 2. Check directly via Shikimori API
    try:
        url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rid}"
        r = requests.get(url, headers=headers, timeout=8)
        if r.status_code == 200:
            rate_info = r.json()
            if str(rate_info.get("user_id")) == uid:
                return True
            logger.warning("IDOR attempt: user %s tried accessing rate %s owned by user %s", uid, rid, rate_info.get("user_id"))
            return False
        elif r.status_code == 404:
            return False
    except Exception as exc:
        logger.warning("Error verifying rate ownership for rate_id=%s: %s", rid, exc)
    return False


def _get_cached_rates_from_db(user_id):
    try:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT data, expires_at FROM api_cache WHERE url = ?",
                (f"rates:user_{user_id}",)
            ).fetchone()
            if row:
                rates_data = json.loads(row["data"])
                expires_at = float(row["expires_at"])
                uid = str(user_id)
                _rates_mem_cache[uid] = {
                    "data": rates_data,
                    "by_target": _build_rates_index(rates_data),
                    "expires_at": expires_at
                }
                return rates_data, expires_at
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error reading rates cache from DB: %s", exc)
    return None, 0.0


def _save_rates_to_db_and_mem(user_id, rates_list):
    now = time.time()
    expires_at = now + RATES_CACHE_TTL
    uid = str(user_id)
    by_target = _build_rates_index(rates_list)
    _rates_mem_cache[uid] = {
        "data": rates_list,
        "by_target": by_target,
        "expires_at": expires_at
    }
    try:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (url, data, expires_at) VALUES (?, ?, ?)",
                (f"rates:user_{uid}", json.dumps(rates_list), expires_at)
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error writing rates cache to DB: %s", exc)


def _normalize_rate_entry(item, target_type):
    target = item.get("anime") if target_type == "Anime" else item.get("manga")
    if not target or not isinstance(target, dict):
        return None

    target_id = target.get("id")
    if not target_id:
        return None

    img_obj = target.get("image") or {}
    img_url = ""
    if isinstance(img_obj, dict):
        # Choose lightweight preview image (preview or x96 or main), avoiding heavy originals
        img_url = img_obj.get("preview") or img_obj.get("x96") or img_obj.get("main") or img_obj.get("original") or ""
    elif isinstance(img_obj, str):
        img_url = img_obj

    aired_date = target.get("aired_on") or target.get("released_on") or ""

    return {
        "id": item.get("id"),
        "user_id": (item.get("user") or {}).get("id") if isinstance(item.get("user"), dict) else None,
        "target_id": target_id,
        "target_type": target_type,
        "score": item.get("score", 0),
        "status": item.get("status", "planned"),
        "episodes": item.get("episodes", 0),
        "chapters": item.get("chapters", 0),
        "volumes": item.get("volumes", 0),
        "text": item.get("text", "") or "",
        "rewatches": item.get("rewatches", 0),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
        "target_data": {
            "id": target_id,
            "name": target.get("name", ""),
            "russian": target.get("russian", "") or target.get("name", ""),
            "kind": target.get("kind", ""),
            "score": target.get("score"),
            "status": target.get("status", ""),
            "episodes": target.get("episodes", 0),
            "episodes_aired": target.get("episodes_aired", 0),
            "chapters": target.get("chapters", 0),
            "volumes": target.get("volumes", 0),
            "duration": target.get("duration", 0),
            "season": target.get("season", ""),
            "aired_on": aired_date,
            "licensors": target.get("licensors", []),
            "genres": target.get("genres", []),
            "studios": target.get("studios", []),
            "image": fix_image_url(img_url)
        }
    }


def _has_missing_posters(rates):
    if not isinstance(rates, list):
        return False
    for r in rates:
        if not isinstance(r, dict):
            continue
        td = r.get("target_data") or {}
        if not td.get("image"):
            return True
    return False


def enrich_rates_posters(rates_list, headers=None):
    """Enrich anime and manga rate entries with GraphQL posters if image is missing."""
    if not isinstance(rates_list, list) or not rates_list:
        return False

    missing_anime = []
    missing_manga = []

    for item in rates_list:
        if not isinstance(item, dict):
            continue
        tdata = item.get("target_data")
        if not tdata or not isinstance(tdata, dict):
            continue
        if not tdata.get("image"):
            tid = item.get("target_id")
            ttype = item.get("target_type")
            if ttype == "Anime" and tid:
                missing_anime.append(str(tid))
            elif ttype == "Manga" and tid:
                missing_manga.append(str(tid))

    if not missing_anime and not missing_manga:
        return False

    updated = False

    # 1. Resolve missing anime posters via GraphQL
    if missing_anime:
        try:
            anime_posters = resolve_posters_graphql(missing_anime, headers=headers)
        except Exception as exc:
            logger.debug("Failed batch resolving anime posters for rates: %s", exc)
            anime_posters = {}

        franchise_lookups = 0
        for item in rates_list:
            if item.get("target_type") == "Anime":
                tid = str(item.get("target_id"))
                tdata = item.get("target_data") or {}
                if not tdata.get("image"):
                    if tid in anime_posters and anime_posters[tid]:
                        tdata["image"] = anime_posters[tid]
                        updated = True
                    elif franchise_lookups < 8:
                        fr = resolve_franchise_poster(tid, is_manga=False)
                        franchise_lookups += 1
                        if fr:
                            tdata["image"] = fr
                            updated = True

    # 2. Resolve missing manga posters via GraphQL
    if missing_manga:
        try:
            manga_posters = resolve_manga_posters_graphql(missing_manga, headers=headers)
        except Exception as exc:
            logger.debug("Failed batch resolving manga posters for rates: %s", exc)
            manga_posters = {}

        franchise_lookups = 0
        for item in rates_list:
            if item.get("target_type") == "Manga":
                tid = str(item.get("target_id"))
                tdata = item.get("target_data") or {}
                if not tdata.get("image"):
                    if tid in manga_posters and manga_posters[tid]:
                        tdata["image"] = manga_posters[tid]
                        updated = True
                    elif franchise_lookups < 8:
                        fr = resolve_franchise_poster(tid, is_manga=True)
                        franchise_lookups += 1
                        if fr:
                            tdata["image"] = fr
                            updated = True

    return updated


def _fetch_fresh_rates_sync(user_id, headers):
    uid = str(user_id)
    rates = []

    # 1. Fetch anime rates via /api/users/{uid}/anime_rates (fast & includes full anime data)
    anime_raw = []
    page = 1
    while True:
        url = f"{SHIKIMORI_BASE}/api/users/{uid}/anime_rates?limit=500&page={page}"
        data = fetch_with_retry(url, headers)
        if not data or not isinstance(data, list):
            break
        anime_raw.extend(data)
        if len(data) < 500 or page >= 10:
            break
        page += 1

    # 2. Fetch manga rates via /api/users/{uid}/manga_rates (fast & includes full manga data)
    manga_raw = []
    page = 1
    while True:
        url = f"{SHIKIMORI_BASE}/api/users/{uid}/manga_rates?limit=500&page={page}"
        data = fetch_with_retry(url, headers)
        if not data or not isinstance(data, list):
            break
        manga_raw.extend(data)
        if len(data) < 500 or page >= 10:
            break
        page += 1

    for item in anime_raw:
        entry = _normalize_rate_entry(item, "Anime")
        if entry:
            rates.append(entry)

    for item in manga_raw:
        entry = _normalize_rate_entry(item, "Manga")
        if entry:
            rates.append(entry)

    # 3. If primary endpoints returned empty, check stale cache before returning empty
    if not rates:
        db_data, _ = _get_cached_rates_from_db(uid)
        if db_data and len(db_data) > 0:
            logger.warning("Fresh rates fetch empty/failed for user_id=%s, serving stale cache (%d items)", uid, len(db_data))
            return db_data

    # Batch enrich any missing posters via GraphQL & franchise/related fallback
    enrich_rates_posters(rates, headers)

    logger.info("Loaded %d fresh rates for user_id=%s (fast 2-request pipeline + GraphQL posters)", len(rates), user_id)
    _save_rates_to_db_and_mem(user_id, rates)
    return rates


@rates_bp.route("/api/tab/rates", methods=["GET"])
@api_route
def tab_rates():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    uid = str(user_id)
    now = time.time()

    # 1. Fast in-memory check (<0.1ms)
    mem = _rates_mem_cache.get(uid)
    if mem and now < mem["expires_at"]:
        rates_data = mem["data"]
        if _has_missing_posters(rates_data):
            if enrich_rates_posters(rates_data, headers):
                _save_rates_to_db_and_mem(uid, rates_data)
        return jsonify(rates_data)

    # 2. Database check (<2ms)
    db_data, db_expires_at = _get_cached_rates_from_db(uid)
    if db_data is not None:
        if _has_missing_posters(db_data):
            if enrich_rates_posters(db_data, headers):
                _save_rates_to_db_and_mem(uid, db_data)
        _rates_mem_cache[uid] = {
            "data": db_data,
            "expires_at": db_expires_at
        }
        if now < db_expires_at:
            return jsonify(db_data)

        # Stale-While-Revalidate: Return stale data immediately and refresh asynchronously
        user_lock = _get_rates_lock(uid)
        def _bg_worker(h=dict(headers)):
            if user_lock.acquire(blocking=False):
                try:
                    logger.debug("Background refreshing stale rates for user=%s...", uid)
                    _fetch_fresh_rates_sync(uid, h)
                    logger.debug("Background rates refresh complete for user=%s.", uid)
                except Exception as exc:
                    logger.error("Background rates refresh failed: %s", exc)
                finally:
                    user_lock.release()

        background_executor.submit(_bg_worker)
        logger.info("Serving stale rates feed (SWR) for user=%s while background refresh runs", uid)
        return jsonify(db_data)

    # 3. Cold start: fetch synchronously
    user_lock = _get_rates_lock(uid)
    with user_lock:
        mem = _rates_mem_cache.get(uid)
        if mem and now < mem["expires_at"]:
            rates_data = mem["data"]
            if _has_missing_posters(rates_data):
                if enrich_rates_posters(rates_data, headers):
                    _save_rates_to_db_and_mem(uid, rates_data)
            return jsonify(rates_data)
        rates = _fetch_fresh_rates_sync(uid, headers)
        return jsonify(rates)

@rates_bp.route("/api/grid-data", methods=["GET"])
@api_route
def grid_data():
    grid_type = request.args.get("type")
    raw_ids = request.args.get("ids", "")
    if not raw_ids:
        return jsonify([])

    ids_list = [i.strip() for i in raw_ids.split(",") if i.strip() and i.strip().isdigit()][:200]

    if grid_type == "animes":
        items_dict = {}
        for i in range(0, len(ids_list), 50):
            chunk = ids_list[i:i + 50]
            query = """
            query BatchAnimesGrid($ids: String!) {
              animes(ids: $ids, limit: 50) {
                id
                name
                russian
                kind
                score
                poster {
                  mainUrl
                  originalUrl
                }
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if data and isinstance(data.get("animes"), list):
                for item in data["animes"]:
                    p = item.get("poster") or {}
                    poster = p.get("mainUrl") or p.get("originalUrl") or ""
                    items_dict[str(item["id"])] = {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "russian": item.get("russian") or item.get("name"),
                        "kind": item.get("kind"),
                        "score": item.get("score"),
                        "image": fix_image_url(poster)
                    }
        logger.debug("Grid data loaded via GraphQL: type=animes, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])

    if grid_type == "characters":
        items_dict = {}
        for i in range(0, len(ids_list), 50):
            chunk = ids_list[i:i + 50]
            query = """
            query BatchCharsGrid($ids: String!) {
              characters(ids: $ids, limit: 50) {
                id
                name
                russian
                poster {
                  mainUrl
                  originalUrl
                }
                url
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=86400)
            if data and isinstance(data.get("characters"), list):
                for item in data["characters"]:
                    p = item.get("poster") or {}
                    poster = p.get("mainUrl") or p.get("originalUrl") or ""
                    items_dict[str(item["id"])] = {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "russian": item.get("russian") or item.get("name"),
                        "image": fix_image_url(poster),
                        "url": item.get("url") or f"/characters/{item.get('id')}"
                    }
        logger.debug("Grid data loaded via GraphQL: type=characters, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])

    if grid_type in ("mangas", "manga"):
        items_dict = {}
        for i in range(0, len(ids_list), 50):
            chunk = ids_list[i:i + 50]
            query = """
            query BatchMangasGrid($ids: String!) {
              mangas(ids: $ids, limit: 50) {
                id
                name
                russian
                kind
                score
                poster {
                  mainUrl
                  originalUrl
                }
              }
            }
            """
            data = fetch_graphql(query, {"ids": ",".join(chunk)}, ttl=3600)
            if data and isinstance(data.get("mangas"), list):
                for item in data["mangas"]:
                    p = item.get("poster") or {}
                    poster = p.get("mainUrl") or p.get("originalUrl") or ""
                    items_dict[str(item["id"])] = {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "russian": item.get("russian") or item.get("name"),
                        "kind": item.get("kind"),
                        "score": item.get("score"),
                        "image": fix_image_url(poster)
                    }
        logger.debug("Grid data loaded via GraphQL: type=mangas, count=%d", len(items_dict))
        return jsonify([items_dict[i] for i in ids_list if i in items_dict])

    logger.warning("Unknown grid type requested: %s", grid_type)
    return jsonify([])



@rates_bp.route("/api/rate", methods=["POST"])
@api_route
def save_user_rate():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    data = request.get_json(silent=True) or {}
    target_id = data.get("target_id")
    target_type = data.get("target_type", "Anime")  # Anime or Manga
    rate_id = data.get("id")

    if not target_id:
        raise AppError("Не указан target_id", 400)

    rate_payload = {
        "status": data.get("status", "watching"),
        "score": data.get("score", 0),
        "episodes": data.get("episodes", 0),
        "chapters": data.get("chapters", 0),
        "volumes": data.get("volumes", 0),
        "text": data.get("text", "") or "",
    }
    if "rewatches" in data:
        rate_payload["rewatches"] = data.get("rewatches", 0)

    # If rate_id is missing, check if user already has a rate for this target
    if not rate_id:
        check_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
        try:
            chk_res = requests.get(check_url, headers=headers, timeout=8)
            if chk_res.status_code == 200 and isinstance(chk_res.json(), list) and len(chk_res.json()) > 0:
                rate_id = chk_res.json()[0].get("id")
        except Exception as exc:
            logger.warning("Failed to check existing rate: %s", exc)

    headers["Content-Type"] = "application/json"

    try:
        if rate_id:
            if not _verify_rate_ownership(user_id, rate_id, headers):
                raise AppError("Доступ запрещен: оценка не принадлежит текущему пользователю", 403)
            # PATCH existing
            url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rate_id}"
            r = requests.patch(url, headers=headers, json={"user_rate": rate_payload}, timeout=10)
        else:
            # POST new
            url = f"{SHIKIMORI_BASE}/api/v2/user_rates"
            post_data = dict(rate_payload)
            post_data["user_id"] = user_id
            post_data["target_id"] = target_id
            post_data["target_type"] = target_type
            r = requests.post(url, headers=headers, json={"user_rate": post_data}, timeout=10)
    except requests.RequestException as exc:
        logger.error("Rate save failed: %s", exc)
        raise AppError("Не удалось сохранить оценку в Shikimori", 502)

    if r.status_code not in (200, 201):
        logger.warning("Shikimori rate save returned %s: %s", r.status_code, r.text[:200])
        raise AppError(f"Ошибка сохранения ({r.status_code}): {r.text[:100]}", r.status_code)

    from utils import invalidate_user_rates_cache
    invalidate_user_rates_cache()

    logger.info("User rate saved successfully for user=%s target=%s(%s)", user_id, target_id, target_type)
    return jsonify({"success": True, "rate": r.json()})


@rates_bp.route("/api/rate/increment", methods=["POST"])
@api_route
def increment_user_rate():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    data = request.get_json(silent=True) or {}
    target_id = data.get("target_id")
    target_type = data.get("target_type", "Anime")
    total_count = data.get("total_count", 0)  # total episodes or chapters

    if not target_id:
        raise AppError("Не указан target_id", 400)

    # Fetch existing rate
    check_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
    existing_rate = None
    try:
        chk_res = requests.get(check_url, headers=headers, timeout=8)
        if chk_res.status_code == 200 and isinstance(chk_res.json(), list) and len(chk_res.json()) > 0:
            existing_rate = chk_res.json()[0]
    except Exception as exc:
        logger.error("Failed to query rate for increment: %s", exc)

    headers["Content-Type"] = "application/json"

    if existing_rate:
        rate_id = existing_rate.get("id")
        current_ep = existing_rate.get("episodes" if target_type == "Anime" else "chapters") or 0
        new_ep = current_ep + 1
        new_status = existing_rate.get("status")

        if total_count and new_ep >= total_count:
            new_status = "completed"
        elif new_status == "planned":
            new_status = "watching"

        field = "episodes" if target_type == "Anime" else "chapters"
        payload = {"user_rate": {field: new_ep, "status": new_status}}
        url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rate_id}"
        r = requests.patch(url, headers=headers, json=payload, timeout=10)
    else:
        new_ep = 1
        new_status = "completed" if total_count and new_ep >= total_count else "watching"
        field = "episodes" if target_type == "Anime" else "chapters"
        payload = {
            "user_rate": {
                "user_id": user_id,
                "target_id": target_id,
                "target_type": target_type,
                field: new_ep,
                "status": new_status
            }
        }
        url = f"{SHIKIMORI_BASE}/api/v2/user_rates"
        r = requests.post(url, headers=headers, json=payload, timeout=10)

    if r.status_code not in (200, 201):
        logger.warning("Rate increment error %s: %s", r.status_code, r.text[:200])
        raise AppError("Не удалось обновить прогресс", r.status_code)

    from utils import invalidate_user_rates_cache
    invalidate_user_rates_cache()

    logger.info("Incremented progress for user=%s target=%s -> %s", user_id, target_id, new_ep)
    return jsonify({"success": True, "rate": r.json()})


@rates_bp.route("/api/rate/<int:rate_id>", methods=["DELETE"])
@rates_bp.route("/api/rate", methods=["DELETE"])
@api_route
def delete_user_rate(rate_id=None):
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    if not rate_id:
        data = request.get_json(silent=True) or {}
        rate_id = data.get("id")
        if not rate_id and data.get("target_id"):
            target_id = data.get("target_id")
            target_type = data.get("target_type", "Anime")
            check_url = f"{SHIKIMORI_BASE}/api/v2/user_rates?user_id={user_id}&target_id={target_id}&target_type={target_type}"
            chk = requests.get(check_url, headers=headers, timeout=8)
            if chk.status_code == 200 and len(chk.json()) > 0:
                rate_id = chk.json()[0].get("id")

    if not rate_id:
        raise AppError("Не указан ID оценки", 400)

    if not _verify_rate_ownership(user_id, rate_id, headers):
        raise AppError("Доступ запрещен: оценка не принадлежит текущему пользователю", 403)

    url = f"{SHIKIMORI_BASE}/api/v2/user_rates/{rate_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Rate delete failed: %s", exc)
        raise AppError("Не удалось удалить из списка", 502)

    if r.status_code not in (200, 204):
        logger.warning("Delete rate %s returned %s", rate_id, r.status_code)
        raise AppError("Ошибка при удалении", r.status_code)

    from utils import invalidate_user_rates_cache
    invalidate_user_rates_cache()

    logger.info("Deleted rate %s for user=%s", rate_id, user_id)
    return jsonify({"success": True, "deleted_id": rate_id})

