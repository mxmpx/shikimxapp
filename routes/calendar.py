import logging
from datetime import datetime
from flask import Blueprint, jsonify
from utils import (
    SHIKIMORI_BASE, APP_NAME, fetch_cached_api, fix_image_url,
    resolve_posters_graphql
)
from services.tiered_cache import TieredCache
from errors import api_route

logger = logging.getLogger("shikimxapp.calendar")
calendar_bp = Blueprint('calendar', __name__)

CALENDAR_CACHE_TTL = 3600  # 1 hour
_calendar_tiered_cache = TieredCache(name="calendar", memory_ttl=CALENDAR_CACHE_TTL, max_workers=1)

DAYS_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def _fetch_calendar_raw():
    url = f"{SHIKIMORI_BASE}/api/calendar"
    headers = {"User-Agent": APP_NAME}
    data = fetch_cached_api(url, headers, ttl=CALENDAR_CACHE_TTL)
    if not isinstance(data, list):
        return []

    anime_ids = [
        str(entry["anime"]["id"])
        for entry in data
        if entry.get("anime") and entry["anime"].get("id")
    ]
    poster_map = resolve_posters_graphql(anime_ids, headers)

    items = []
    for entry in data:
        anime = entry.get("anime") or {}
        aid = str(anime.get("id"))
        if not anime or not aid:
            continue

        next_ep_at = entry.get("next_episode_at")
        day_of_week = None
        time_str = ""
        date_str = ""

        if next_ep_at:
            try:
                dt = datetime.fromisoformat(next_ep_at.replace("Z", "+00:00"))
                day_of_week = dt.weekday()
                time_str = dt.strftime("%H:%M")
                date_str = dt.strftime("%d.%m")
            except Exception as exc:
                logger.debug("Failed to parse calendar date %s: %s", next_ep_at, exc)

        poster = poster_map.get(aid) or fix_image_url(anime.get("image"))

        items.append({
            "id": anime.get("id"),
            "name": anime.get("name"),
            "russian": anime.get("russian") or anime.get("name"),
            "image": poster,
            "score": anime.get("score"),
            "kind": (anime.get("kind") or "").upper(),
            "status": anime.get("status"),
            "episodes": anime.get("episodes"),
            "episodes_aired": anime.get("episodes_aired"),
            "next_episode": entry.get("next_episode"),
            "next_episode_at": next_ep_at,
            "day_of_week": day_of_week,
            "day_name": DAYS_NAMES[day_of_week] if day_of_week is not None else "Скоро",
            "time_str": time_str,
            "date_str": date_str,
        })

    logger.debug("Airing calendar loaded: %d items", len(items))
    return items


@calendar_bp.route("/api/calendar")
@api_route
def get_airing_calendar():
    """Fetch airing anime calendar from Shikimori, grouped by day of the week."""
    items = _calendar_tiered_cache.get_or_fetch(
        "calendar:airing",
        fetch_fn=_fetch_calendar_raw,
        ttl=CALENDAR_CACHE_TTL,
        background_refresh=True
    )
    return jsonify(items or [])
