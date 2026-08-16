import os

os.environ["DISABLE_CUSTOM_LOGGING"] = "1"

from app import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting Shiki MX App on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
