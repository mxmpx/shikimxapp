import re
from typing import Optional
from markupsafe import Markup, escape

MONTHS_RU = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
]

HTML_TAG_RE = re.compile(r'<[^>]+>')
SHIKI_USER_IMG_RE = re.compile(r'<img[^>]+src=["\'](https?://[^"\']*shikimori\.(?:one|io|me)/system/user_images_h/[^"\']+)["\']')
YT_VI_RE = re.compile(r'youtube\.com/vi/([^/]+)')
YT_BE_RE = re.compile(r'youtu\.be/([a-zA-Z0-9_\-]+)')
IMG_TAG_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']')


def strip_html_tags(text: str, max_length: Optional[int] = None) -> str:
    """Precompiled HTML tag removal with optional length limit."""
    if not text:
        return ""
    clean = HTML_TAG_RE.sub(' ', text).strip()
    clean = re.sub(r'\s+', ' ', clean)
    if max_length and len(clean) > max_length:
        clean = clean[:max_length].strip()
    return clean


def format_aired(date_str: str) -> str:
    """Format ISO date YYYY-MM-DD or YYYY into Russian readable string."""
    if not date_str:
        return "—"
    try:
        parts = date_str.split('-')
        year = parts[0]
        if len(parts) > 1:
            m_idx = int(parts[1]) - 1
            if 0 <= m_idx < 12:
                return f"{MONTHS_RU[m_idx]} {year} г."
        return f"{year} г."
    except Exception:
        return date_str


def build_topic_url(t: dict) -> str:
    """Build canonical Shikimori URL for a forum/news topic."""
    url = t.get("url")
    if url:
        if url.startswith("http"):
            return url.replace("shikimori.one", "shikimori.io")
        return f"https://shikimori.io{'' if url.startswith('/') else '/'}{url}".replace("shikimori.one", "shikimori.io")

    topic_id = t.get("id")
    if not topic_id:
        return "https://shikimori.io"

    forum_info = t.get("forum") or {}
    forum_name = (forum_info.get("name") or "") if isinstance(forum_info, dict) else ""

    forum_path = "animanga"
    if "collection" in forum_name:
        forum_path = "collections"
    elif "critique" in forum_name:
        forum_path = "critiques"
    elif "article" in forum_name:
        forum_path = "articles"
    elif "news" in forum_name:
        forum_path = "news"

    return f"https://shikimori.io/forum/{forum_path}/{topic_id}"


def parse_news_topic(t: dict) -> Optional[dict]:
    """Parse topic into a standardized structure with poster resolution."""
    if not isinstance(t, dict):
        return None
    title = t.get("topic_title") or t.get("title") or ""
    href = build_topic_url(t)
    created_at = t.get("created_at", "")[:10] if t.get("created_at") else ""
    author = (t.get("user") or {}).get("nickname", "")
    topic_id = t.get("id")
    comments_count = t.get("comments_count", 0)

    img_src = ""
    is_youtube = False
    linked = t.get("linked")
    linked_anime_id = None
    if linked and isinstance(linked, dict):
        if linked.get("type") == "Anime":
            linked_anime_id = linked.get("id")
        if linked.get("image"):
            img_dict = linked.get("image")
            if isinstance(img_dict, dict):
                candidate = img_dict.get("original") or img_dict.get("preview") or ""
                if candidate and "missing" not in candidate:
                    img_src = candidate

    all_text = f"{t.get('html_body') or ''} {t.get('html_footer') or ''} {t.get('body') or ''}"
    if not img_src:
        user_img_match = SHIKI_USER_IMG_RE.search(all_text)
        if user_img_match:
            img_src = user_img_match.group(1)

    yt_match = YT_VI_RE.search(all_text) or YT_BE_RE.search(all_text)
    if yt_match:
        is_youtube = True
        if not img_src:
            img_src = f"https://img.youtube.com/vi/{yt_match.group(1)}/hqdefault.jpg"

    if not img_src:
        img_match = IMG_TAG_RE.search(all_text)
        if img_match:
            candidate = img_match.group(1)
            if "missing" not in candidate:
                img_src = candidate

    tags = ["Аниме"]
    title_lower = title.lower()
    if "трейлер" in title_lower or "тизер" in title_lower or "pv" in title_lower or is_youtube:
        tags.append("Трейлер")
    elif "постер" in title_lower or "визуал" in title_lower:
        tags.append("Постер")
    elif "дата" in title_lower or "премьера" in title_lower:
        tags.append("Премьера")
    tags.append("Новость")

    from services.poster_resolver import fix_image_url
    return {
        "id": topic_id,
        "title": title,
        "url": href,
        "image": fix_image_url(img_src) if img_src else "",
        "created_at": created_at,
        "date": created_at,
        "author": author,
        "tags": tags,
        "comments_count": comments_count,
        "is_youtube": is_youtube,
        "linked_anime_id": linked_anime_id,
        "linked": linked
    }


def parse_topic_item(t, default_tag=""):
    title = t.get("topic_title") or t.get("title") or ""
    topic_id = t.get("id")
    forum = (t.get("forum") or {}).get("name") or "" if isinstance(t.get("forum"), dict) else ""

    tag_name = default_tag
    if "collection" in forum:
        tag_name = "Коллекция"
    elif "critique" in forum:
        tag_name = "Рецензия"
    elif "article" in forum:
        tag_name = "Статья"
    elif "news" in forum:
        tag_name = "Новость"

    return {
        "id": topic_id,
        "title": title,
        "url": build_topic_url(t),
        "comments_count": t.get("comments_count", 0),
        "tag": tag_name,
        "author": (t.get("user") or {}).get("nickname", ""),
        "date": t.get("created_at", "")[:10] if t.get("created_at") else ""
    }


def parse_shikimori_bbcode(text: str) -> Markup:
    """Parse Shikimori BBCode tags into sanitized, styled HTML markup."""
    if not text:
        return Markup("")
    escaped_text = str(escape(text))
    escaped_text = re.sub(
        r'\[center\](.*?)\[/center\]',
        r'<div style="text-align: center;">\1</div>',
        escaped_text,
        flags=re.DOTALL
    )
    escaped_text = re.sub(
        r'\[size=(\d{1,3})\](.*?)\[/size\]',
        r'<span style="font-size: \1px;">\2</span>',
        escaped_text,
        flags=re.DOTALL
    )

    def replace_shiki_tag(m):
        tag_type, attr_str = m.group(1), m.group(2)
        ids_match = re.search(r'ids=([\d,]+)', attr_str)
        cols_match = re.search(r'columns=(\d+)', attr_str)
        ids = ids_match.group(1) if ids_match else ''
        ids = re.sub(r'[^0-9,]', '', ids)
        cols = cols_match.group(1) if cols_match else ('8' if tag_type == 'characters' else '5')
        cols = re.sub(r'[^0-9]', '', cols)
        wall_class = ' wall-grid' if 'wall' in attr_str else ''
        return f'<div class="shiki-grid{wall_class}" data-type="{tag_type}" data-ids="{ids}" style="--cols: {cols}"></div>'

    escaped_text = re.sub(r'\[(animes|characters)\s+([^\]]+)\]', replace_shiki_tag, escaped_text)
    return Markup(escaped_text)
