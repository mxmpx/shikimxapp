import logging
import requests
from flask import Blueprint, session, jsonify
from utils import SHIKIMORI_BASE, APP_NAME, get_auth_headers, fetch_cached_api, fix_image_url
from errors import AppError, api_route

logger = logging.getLogger("shikimxapp.friend")
friend_bp = Blueprint('friend', __name__)

@friend_bp.route("/api/tab/friends")
@api_route
def tab_friends():
    user_id = session.get("user_id")
    headers = get_auth_headers()
    if not user_id or not headers:
        raise AppError("Требуется авторизация", 401)

    try:
        r_friends = requests.get(f"{SHIKIMORI_BASE}/api/users/{user_id}/friends", headers=headers, timeout=10)
        r_clubs = requests.get(f"{SHIKIMORI_BASE}/api/users/{user_id}/clubs", headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Failed to fetch friends/clubs: %s", exc)
        raise AppError("Не удалось загрузить друзей и клубы", 502, logging.ERROR)

    friends = r_friends.json() if r_friends.status_code == 200 and isinstance(r_friends.json(), list) else []
    clubs = r_clubs.json() if r_clubs.status_code == 200 and isinstance(r_clubs.json(), list) else []

    if r_friends.status_code != 200:
        logger.warning("Friends API returned %s", r_friends.status_code)
    if r_clubs.status_code != 200:
        logger.warning("Clubs API returned %s", r_clubs.status_code)

    logger.debug("Friends loaded: friends=%d clubs=%d", len(friends), len(clubs))
    return jsonify({"friends": friends, "clubs": clubs})


@friend_bp.route("/api/friend/<user_id>")
@friend_bp.route("/api/user_info/<user_id>")
@api_route
def get_friend_details(user_id):
    headers = {"User-Agent": APP_NAME}
    url = f"{SHIKIMORI_BASE}/api/users/{user_id}"

    data = fetch_cached_api(url, headers, ttl=1800)
    if not data or not isinstance(data, dict):
        logger.warning("User data unavailable for user_id=%s", user_id)
        raise AppError("Не удалось получить данные пользователя", 502)

    avatar = fix_image_url(data.get("image"))

    stats = data.get("stats") or {}
    anime_stats = stats.get("statuses", {}).get("anime", [])
    manga_stats = stats.get("statuses", {}).get("manga", [])

    completed_anime = next((s.get("size") for s in anime_stats if s.get("name") == "completed"), 0)
    watching_anime = next((s.get("size") for s in anime_stats if s.get("name") == "watching"), 0)
    planned_anime = next((s.get("size") for s in anime_stats if s.get("name") == "planned"), 0)
    on_hold_anime = next((s.get("size") for s in anime_stats if s.get("name") == "on_hold"), 0)
    dropped_anime = next((s.get("size") for s in anime_stats if s.get("name") == "dropped"), 0)

    completed_manga = next((s.get("size") for s in manga_stats if s.get("name") == "completed"), 0)
    reading_manga = next((s.get("size") for s in manga_stats if s.get("name") == "watching"), 0)
    planned_manga = next((s.get("size") for s in manga_stats if s.get("name") == "planned"), 0)
    on_hold_manga = next((s.get("size") for s in manga_stats if s.get("name") == "on_hold"), 0)
    dropped_manga = next((s.get("size") for s in manga_stats if s.get("name") == "dropped"), 0)

    sex_map = {"male": "Мужской", "female": "Женский"}
    sex = sex_map.get(data.get("sex"), data.get("sex") or "—")

    logger.debug("Friend profile loaded: user_id=%s nickname=%s", user_id, data.get("nickname"))
    return jsonify({
        "id": data.get("id"),
        "nickname": data.get("nickname"),
        "name": data.get("name") or data.get("nickname"),
        "image": avatar,
        "last_online_at": (data.get("last_online_at") or "")[:10],
        "sex": sex,
        "age": data.get("full_years") or "—",
        "completed_anime": completed_anime,
        "watching_anime": watching_anime,
        "planned_anime": planned_anime,
        "on_hold_anime": on_hold_anime,
        "dropped_anime": dropped_anime,
        "completed_manga": completed_manga,
        "reading_manga": reading_manga,
        "planned_manga": planned_manga,
        "on_hold_manga": on_hold_manga,
        "dropped_manga": dropped_manga,
        "about": data.get("about") or "Информация о себе не заполнена.",
        "shikimori_url": f"{SHIKIMORI_BASE}/{data.get('nickname')}" if data.get('nickname') else ""
    })
