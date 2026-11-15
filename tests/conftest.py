import os
import tempfile
import pytest

# Ensure custom logging does not pollute test runner
os.environ["DISABLE_CUSTOM_LOGGING"] = "1"
os.environ["FLASK_SECRET_KEY"] = "test_secret_key_for_unit_tests_32char"

from app import app as flask_app
import database


@pytest.fixture
def app():
    """Create and configure a Flask test app instance with a temporary database."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    original_db_path = database.DB_PATH
    database.DB_PATH = db_path

    flask_app.config.update({
        "TESTING": True,
        "DEBUG": False,
    })

    with flask_app.app_context():
        database.init_db()

    yield flask_app

    # Cleanup
    database.DB_PATH = original_db_path
    os.close(db_fd)
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass


@pytest.fixture
def client(app):
    """Test client for HTTP requests."""
    return app.test_client()
