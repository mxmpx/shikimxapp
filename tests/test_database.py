import sqlite3
import database


def test_migrations_applied():
    """Verify that schema_migrations table exists and migrations 1 & 2 are applied."""
    conn = database._create_raw_connection()
    try:
        cur = conn.execute("SELECT version, name FROM schema_migrations ORDER BY version")
        rows = cur.fetchall()
        versions = [r[0] for r in rows]
        assert 1 in versions
        assert 2 in versions
    finally:
        conn.close()


def test_user_creation_and_retrieval():
    """Test user creation and lookup by ID and provider."""
    user = database.get_or_create_user(
        shikimori_id=99999,
        email="tester@example.com",
        name="TestUser",
        avatar="https://example.com/avatar.jpg"
    )
    assert user is not None
    assert user["shikimori_id"] == 99999
    assert user["name"] == "TestUser"

    fetched = database.get_user_by_id(user["id"])
    assert fetched is not None
    assert fetched["name"] == "TestUser"
    assert fetched["email"] == "tester@example.com"


def test_user_settings_crud():
    """Test setting, getting, and deleting user preferences."""
    user = database.get_or_create_user(shikimori_id=88888, name="SettingsUser")
    uid = user["id"]

    database.set_user_setting(uid, "theme", "dark")
    database.set_user_setting(uid, "player_volume", 0.75)

    assert database.get_user_setting(uid, "theme") == "dark"
    assert database.get_user_setting(uid, "player_volume") == 0.75
    assert database.get_user_setting(uid, "nonexistent", default="default_val") == "default_val"

    all_settings = database.get_user_settings(uid)
    assert all_settings.get("theme") == "dark"
    assert all_settings.get("player_volume") == 0.75

    database.delete_user_setting(uid, "theme")
    assert database.get_user_setting(uid, "theme") is None


def test_connection_proxy_reuse(app):
    """Test that multiple get_connection calls in the same request reuse the connection."""
    with app.test_request_context():
        conn1 = database.get_connection()
        conn2 = database.get_connection()
        # Proxy delegates to the same underlying connection in flask.g
        assert conn1._conn is conn2._conn

        # Closing conn1 is a safe no-op inside request context
        conn1.close()
        row = conn2.execute("SELECT 1").fetchone()
        assert row[0] == 1
