"""
utils.py — Unified facade re-exporting specialized modular services.

Modular structure:
- services/api_client.py: HTTP, GraphQL, Rate Limiting, Shikimori Session Auth
- services/poster_resolver.py: Image URL fixing, GraphQL batch posters, franchise resolution
- services/formatters.py: BBCode parsing and sanitization
- services/rates_cache.py: User rates in-memory cache
"""

from database import get_connection

from services.rates_cache import (
    get_cached_user_rate,
    set_cached_user_rates,
    invalidate_user_rates_mem_cache,
)

from services.api_client import (
    SHIKIMORI_BASE,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    APP_NAME,
    AUTH_URL,
    TOKEN_URL,
    WHOAMI_URL,
    ShikimoriRateLimiter,
    shiki_rate_limiter,
    get_auth_headers,
    fetch_with_retry,
    fetch_graphql,
    fetch_cached_api,
    fetch_user_rate,
    invalidate_user_rates_cache,
)

from services.poster_resolver import (
    unwrap_camo_url,
    fix_image_url,
    resolve_posters_graphql,
    resolve_single_anime_poster_graphql,
    resolve_manga_posters_graphql,
    resolve_franchise_poster,
)

from services.formatters import parse_shikimori_bbcode

__all__ = [
    "get_connection",
    "SHIKIMORI_BASE",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "REDIRECT_URI",
    "APP_NAME",
    "AUTH_URL",
    "TOKEN_URL",
    "WHOAMI_URL",
    "ShikimoriRateLimiter",
    "shiki_rate_limiter",
    "get_auth_headers",
    "fetch_with_retry",
    "fetch_graphql",
    "fetch_cached_api",
    "fetch_user_rate",
    "invalidate_user_rates_cache",
    "get_cached_user_rate",
    "set_cached_user_rates",
    "invalidate_user_rates_mem_cache",
    "fix_image_url",
    "resolve_posters_graphql",
    "resolve_single_anime_poster_graphql",
    "resolve_manga_posters_graphql",
    "resolve_franchise_poster",
    "parse_shikimori_bbcode",
]
