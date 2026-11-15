import os

from app import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"Starting Shiki MX App on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
