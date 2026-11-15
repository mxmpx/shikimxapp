"""
Centralized in-memory rates caching and indexing to prevent circular dependencies.
"""
import time
import logging
import threading

logger = logging.getLogger("shikimxapp.rates_cache")

_MAX_RATES_LOCK_ENTRIES = 256
_rates_locks = {}
_rates_locks_guard = threading.Lock()
_rates_mem_cache = {}  # user_id -> {"data": [...], "by_target": {...}, "expires_at": float}


def _build_rates_index(rates_list):
    """Index rates list into a dictionary by target: {f'{target_type}_{target_id}': item}."""
    index = {}
    if not isinstance(rates_list, list):
        return index
    for item in rates_list:
        tid = str(item.get("target_id") or (item.get("anime") or {}).get("id") or (item.get("manga") or {}).get("id") or "")
        ttype = str(item.get("target_type") or ("Anime" if item.get("anime") else "Manga")).capitalize()
        if tid:
            index[f"{ttype}_{tid}"] = item
    return index


def _get_rates_lock(user_id):
    """Acquire a per-user threading Lock to synchronize rates fetching."""
    uid = str(user_id)
    with _rates_locks_guard:
        if uid not in _rates_locks:
            if len(_rates_locks) >= _MAX_RATES_LOCK_ENTRIES:
                stale = [u for u in list(_rates_locks) if u not in _rates_mem_cache]
                for u in stale[:len(stale) // 2 + 1]:
                    _rates_locks.pop(u, None)
                logger.debug("_rates_locks cleaned %d stale entries", len(stale))
            _rates_locks[uid] = threading.Lock()
        return _rates_locks[uid]


def get_cached_user_rate(user_id, target_id, target_type):
    """O(1) lookup of user rate in memory cache."""
    uid = str(user_id)
    cached = _rates_mem_cache.get(uid)
    if not cached:
        return False, None

    by_target = cached.get("by_target")
    if by_target is None and isinstance(cached.get("data"), list):
        by_target = _build_rates_index(cached["data"])
        cached["by_target"] = by_target

    key = f"{str(target_type).capitalize()}_{str(target_id)}"
    if by_target and key in by_target:
        item = by_target[key]
        return True, {
            "id": item.get("id"),
            "status": item.get("status"),
            "score": item.get("score", 0),
            "episodes": item.get("episodes", 0),
            "chapters": item.get("chapters", 0),
            "volumes": item.get("volumes", 0),
            "text": item.get("text", "") or "",
            "rewatches": item.get("rewatches", 0),
            "created_at": item.get("created_at"),
            "updated_at": item.get("updated_at")
        }
    elif by_target is not None:
        return True, None  # User rates list is cached, but target item is not in user list

    return False, None


def set_cached_user_rates(user_id, rates_list, expires_at):
    """Store user rates list and pre-built index in memory cache."""
    uid = str(user_id)
    by_target = _build_rates_index(rates_list)
    _rates_mem_cache[uid] = {
        "data": rates_list,
        "by_target": by_target,
        "expires_at": expires_at
    }


def invalidate_user_rates_mem_cache(user_id=None):
    """Remove user rates from memory cache."""
    if user_id is None:
        try:
            from flask import session
            user_id = session.get("user_id")
        except Exception:
            pass
    if user_id:
        uid = str(user_id)
        _rates_mem_cache.pop(uid, None)
