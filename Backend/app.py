import os
import threading

from flask import Flask
from flask_cors import CORS

from settings import INCIDENTS_URL
from routes import api
from incidents_service import incidents_warmer


app = Flask(__name__)
# expose the cache/timing headers so the browser can read them
CORS(app, expose_headers=["X-Cache", "X-Response-Time-ms"])
app.register_blueprint(api)


# starts at import so gunicorn workers warm the cache too, not just `python app.py`
if INCIDENTS_URL:
    threading.Thread(target=incidents_warmer, daemon=True).start()


# local dev server, heroku runs gunicorn app:app instead
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))

    app.run(host="0.0.0.0", port=port, debug=False)
