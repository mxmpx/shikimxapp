import sqlite3
import os
import logging
from datetime import datetime

logger = logging.getLogger("shikimxapp.database")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.db")


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize database tables if they don't exist."""
    conn = get_connection()
    try:
        conn.executescript("""
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
        """)
        conn.commit()
        logger.info("Database initialized successfully at %s", DB_PATH)
    except sqlite3.Error as exc:
        logger.error("Database initialization failed: %s", exc)
        raise
    finally:
        conn.close()


def get_or_create_user(shikimori_id=None, google_id=None, email=None, name=None, avatar=None, access_token=None):
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

        now = datetime.utcnow().isoformat()

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


def get_user_by_id(user_id):
    """Get user by internal database ID."""
    conn = get_connection()
    try:
        cur = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cur.fetchone()
        return dict(user) if user else None
    finally:
        conn.close()


def get_user_settings(user_id):
    """Get all settings for a user as a dict."""
    conn = get_connection()
    try:
        cur = conn.execute("SELECT key, value FROM user_settings WHERE user_id = ?", (user_id,))
        rows = cur.fetchall()
        settings = {}
        for row in rows:
            try:
                settings[row["key"]] = __import__("json").loads(row["value"])
            except (ValueError, TypeError):
                settings[row["key"]] = row["value"]
        return settings
    finally:
        conn.close()


def get_user_setting(user_id, key, default=None):
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
                return __import__("json").loads(row["value"])
            except (ValueError, TypeError):
                return row["value"]
        return default
    finally:
        conn.close()


def set_user_setting(user_id, key, value):
    """Set a single setting for a user (upsert)."""
    import json
    conn = get_connection()
    try:
        value_str = json.dumps(value) if not isinstance(value, str) else value
        now = datetime.utcnow().isoformat()
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


def set_user_settings(user_id, settings_dict):
    """Set multiple settings for a user at once in a single transaction."""
    if not settings_dict:
        return
    import json
    conn = get_connection()
    try:
        now = datetime.utcnow().isoformat()
        rows = []
        for key, value in settings_dict.items():
            value_str = json.dumps(value) if not isinstance(value, str) else value
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


def delete_user_setting(user_id, key):
    """Delete a setting for a user."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM user_settings WHERE user_id = ? AND key = ?", (user_id, key))
        conn.commit()
    finally:
        conn.close()


def delete_user(user_id):
    """Delete a user and all their settings."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    finally:
        conn.close()
