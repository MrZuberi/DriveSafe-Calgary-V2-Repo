import json

from settings import REDIS_URL


redis_client = None
# only connect when REDIS_URL is set, otherwise everything uses the memory cache
if REDIS_URL:
    try:
        import redis
        redis_kwargs = {"decode_responses": True, "socket_timeout": 1, "socket_connect_timeout": 1}
        # heroku redis uses a self-signed cert on rediss://
        if REDIS_URL.startswith("rediss://"):
            redis_kwargs["ssl_cert_reqs"] = "none"
        redis_client = redis.from_url(REDIS_URL, **redis_kwargs)
    except Exception as e:
        print("redis setup failed, using memory cache only:", e)
        redis_client = None


# returns the decoded value, or None on a miss or any redis error
def redis_get_json(key):
    if not redis_client:
        return None
    try:
        raw = redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        print("redis get failed:", e)
        return None


# stores value as json with a ttl, errors are logged and ignored
def redis_set_json(key, value, ttl_seconds):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl_seconds, json.dumps(value))
    except Exception as e:
        print("redis set failed:", e)
