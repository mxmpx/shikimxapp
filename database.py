import sqlite3
import os
import json
import time
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime, timezone

try:
    from flask import has_request_context, g
except ImportError:
    has_request_context = lambda: False
    g = None

logger = logging.getLogger("shikimxapp.database")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.db")


class _ConnectionProxy:
    """
    Proxy around sqlite3.Connection to allow safe connection reuse across a single Flask request.
    Calling conn.close() is a no-op within a request context, leaving actual closing to teardown_appcontext.
    """
    __slots__ = ("_conn",)

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def close(self):
        # No-op in request context; connection is closed by teardown handler
        pass

    def __getattr__(self, name: str):
        return getattr(self._conn, name)

    def __enter__(self):
        return self._conn.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._conn.__exit__(exc_type, exc_val, exc_tb)


def _create_raw_connection() -> sqlite3.Connection:
    """Create a new raw database connection with row factory and high performance PRAGMAs."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA cache_size = -64000;")  # 64 MB RAM cache
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def get_connection():
    """
    Get a database connection.
    If inside a Flask request context, reuses the request-scoped connection stored in `g._db_conn`.
    Otherwise, returns a dedicated raw connection.
    """
    if has_request_context() and g is not None:
        if not hasattr(g, "_db_conn") or g._db_conn is None:
            g._db_conn = _create_raw_connection()
        return _ConnectionProxy(g._db_conn)
    return _create_raw_connection()


def close_request_db(exception: Optional[BaseException] = None):
    """Teardown handler to close request-scoped database connection."""
    if has_request_context() and g is not None:
        conn = getattr(g, "_db_conn", None)
        if conn is not None:
            try:
                conn.close()
            except Exception as exc:
                logger.debug("Error closing request DB connection: %s", exc)
            finally:
                g._db_conn = None


def cleanup_expired_cache() -> int:
    """Delete expired records from api_cache using the indexed expires_at field."""
    try:
        conn = _create_raw_connection()
        try:
            now = time.time()
            res = conn.execute("DELETE FROM api_cache WHERE expires_at < ?", (now,))
            conn.commit()
            count = res.rowcount
            if count > 0:
                logger.info("Cleaned up %d expired api_cache entries", count)
            return count
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error during expired api_cache cleanup: %s", exc)
        return 0


MAX_CACHE_ENTRIES = 5000


def prune_api_cache_if_needed(max_entries: int = MAX_CACHE_ENTRIES) -> int:
    """Ensure api_cache does not grow unbounded by pruning expired or oldest entries."""
    try:
        conn = _create_raw_connection()
        try:
            now = time.time()
            # 1. First remove expired entries
            res = conn.execute("DELETE FROM api_cache WHERE expires_at < ?", (now,))
            removed = res.rowcount

            # 2. If still exceeding max_entries, remove oldest by expires_at / FIFO
            cur = conn.execute("SELECT count(*) FROM api_cache")
            total = cur.fetchone()[0]
            if total > max_entries:
                overflow = total - max_entries
                res2 = conn.execute(
                    "DELETE FROM api_cache WHERE url IN (SELECT url FROM api_cache ORDER BY expires_at ASC LIMIT ?)",
                    (overflow,)
                )
                removed += res2.rowcount
            conn.commit()
            return removed
        finally:
            conn.close()
    except Exception as exc:
        logger.error("Error during api_cache pruning: %s", exc)
        return 0


# Database Schema Migrations
MIGRATIONS = [
    (1, "initial_schema", """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shikimori_id INTEGER UNIQUE,
            google_id TEXT UNIQUE,
            email TEXT,
            name TEXT,
            avatar TEXT,
            access_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, key)
        );

        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id_key ON user_settings(user_id, key);
        CREATE INDEX IF NOT EXISTS idx_users_shikimori_id ON users(shikimori_id);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

        CREATE TABLE IF NOT EXISTS api_cache (
            url TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            expires_at REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
    """),
    (2, "add_schema_indexes", """
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    """)
]


def run_migrations(conn: sqlite3.Connection):
    """Run incremental database migrations."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()

    cur = conn.execute("SELECT version FROM schema_migrations")
    applied = {row[0] for row in cur.fetchall()}

    for version, name, sql in MIGRATIONS:
        if version not in applied:
            logger.info("Applying database migration %d: %s", version, name)
            conn.executescript(sql)
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
                (version, name, datetime.now(timezone.utc).isoformat())
            )
            conn.commit()


def init_db():
    """Initialize database tables and run migrations."""
    conn = _create_raw_connection()
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        run_migrations(conn)
        logger.info("Database initialized successfully at %s", DB_PATH)
    except sqlite3.Error as exc:
        logger.error("Database initialization failed: %s", exc)
        raise
    finally:
        conn.close()

    # Perform startup cleanup of expired cache entries
    cleanup_expired_cache()


def get_or_create_user(shikimori_id=None, google_id=None, email=None, name=None, avatar=None, access_token=None) -> Dict[str, Any]:
    """
    Get existing user or create a new one.
    Returns user dict with id and other fields.
    """
    if not shikimori_id and not google_id:
        raise ValueError("Either shikimori_id or google_id must be provided")

    conn = get_connection()
    try:
        user = None

        # Try to find by shikimori_id
        if shikimori_id:
            cur = conn.execute("SELECT * FROM users WHERE shikimori_id = ?", (shikimori_id,))
            user = cur.fetchone()

        # Try to find by google_id if not found by shikimori_id
        if not user and google_id:
            cur = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
            user = cur.fetchone()

        now = datetime.now(timezone.utc).isoformat()

        if user:
            # Update existing user
            update_fields = {}
            if email and email != user["email"]:
                update_fields["email"] = email
            if name and name != user["name"]:
                update_fields["name"] = name
            if avatar and avatar != user["avatar"]:
                update_fields["avatar"] = avatar
            if access_token and access_token != user["access_token"]:
                update_fields["access_token"] = access_token
            update_fields["updated_at"] = now

            if update_fields:
                set_clause = ", ".join(f"{k} = ?" for k in update_fields.keys())
                values = list(update_fields.values()) + [user["id"]]
                conn.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
                conn.commit()
                user = dict(user)
                user.update(update_fields)
            else:
                user = dict(user)
        else:
            # Create new user
            cur = conn.execute(
                """INSERT INTO users (shikimori_id, google_id, email, name, avatar, access_token, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (shikimori_id, google_id, email, name, avatar, access_token, now)
            )
            conn.commit()
            user_id = cur.lastrowid
            user = {
                "id": user_id,
                "shikimori_id": shikimori_id,
                "google_id": google_id,
                "email": email,
                "name": name,
                "avatar": avatar,
                "access_token": access_token,
                "created_at": now,
                "updated_at": now,
            }

        return user
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by internal database ID."""
    conn = get_connection()
    try:
        cur = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cur.fetchone()
        return dict(user) if user else None
    finally:
        conn.close()


def get_user_settings(user_id: int) -> Dict[str, Any]:
    """Get all settings for a user as a dict."""
    conn = get_connection()
    try:
        cur = conn.execute("SELECT key, value FROM user_settings WHERE user_id = ?", (user_id,))
        rows = cur.fetchall()
        settings = {}
        for row in rows:
            try:
                settings[row["key"]] = json.loads(row["value"])
            except (ValueError, TypeError, json.JSONDecodeError):
                settings[row["key"]] = row["value"]
        return settings
    finally:
        conn.close()


def get_user_setting(user_id: int, key: str, default: Any = None) -> Any:
    """Get a single setting for a user."""
    conn = get_connection()
    try:
        cur = conn.execute(
            "SELECT value FROM user_settings WHERE user_id = ? AND key = ?",
            (user_id, key)
        )
        row = cur.fetchone()
        if row:
            try:
                return json.loads(row["value"])
            except (ValueError, TypeError, json.JSONDecodeError):
                return row["value"]
        return default
    finally:
        conn.close()


def set_user_setting(user_id: int, key: str, value: Any) -> None:
    """Set a single setting for a user (upsert)."""
    conn = get_connection()
    try:
        value_str = json.dumps(value)
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """INSERT INTO user_settings (user_id, key, value, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, key) DO UPDATE SET
                   value = excluded.value,
                   updated_at = excluded.updated_at""",
            (user_id, key, value_str, now)
        )
        conn.commit()
    finally:
        conn.close()


def set_user_settings(user_id: int, settings_dict: Dict[str, Any]) -> None:
    """Set multiple settings for a user at once in a single transaction."""
    if not settings_dict:
        return
    conn = get_connection()
    try:
        now = datetime.now(timezone.utc).isoformat()
        rows = []
        for key, value in settings_dict.items():
            value_str = json.dumps(value)
            rows.append((user_id, key, value_str, now))
        conn.executemany(
            """INSERT INTO user_settings (user_id, key, value, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, key) DO UPDATE SET
                   value = excluded.value,
                   updated_at = excluded.updated_at""",
            rows
        )
        conn.commit()
    finally:
        conn.close()


def delete_user_setting(user_id: int, key: str) -> None:
    """Delete a setting for a user."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM user_settings WHERE user_id = ? AND key = ?", (user_id, key))
        conn.commit()
    finally:
        conn.close()


def delete_user(user_id: int) -> None:
    """Delete a user and all their settings."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    finally:
        conn.close()
