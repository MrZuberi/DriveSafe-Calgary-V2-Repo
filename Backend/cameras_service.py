import requests

from settings import CAMERAS_URL, CAMERAS_REDIS_KEY, CAMERAS_CACHE_SECONDS
from redis_cache import redis_get_json, redis_set_json
from memory_cache import cameras_cache, is_cache_expired, update_cache
from helpers import calculate_distance_km
from cleaners import clean_camera_data


# checks redis, then the memory cache, then pulls fresh from the city api
def get_cameras():
    cached = redis_get_json(CAMERAS_REDIS_KEY)
    if cached is not None:
        return cached

    if not is_cache_expired(cameras_cache, CAMERAS_CACHE_SECONDS):
        return cameras_cache["data"]

    params = {
        "$limit": 5000
    }
    r = requests.get(CAMERAS_URL, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    cameras = [clean_camera_data(x) for x in data if x]

    update_cache(cameras_cache, cameras)
    redis_set_json(CAMERAS_REDIS_KEY, cameras, CAMERAS_CACHE_SECONDS)
    return cameras


# tags each located camera with distance_km and returns the closest `limit`
def find_nearest_cameras(lat, lon, limit):
    cams = [c for c in get_cameras() if c.get("coordinates")]
    for c in cams:
        clat = c["coordinates"]["lat"]
        clon = c["coordinates"]["lon"]
        c["distance_km"] = calculate_distance_km(lat, lon, clat, clon)

    cams.sort(key=lambda x: x.get("distance_km", float("inf")))
    return {"count": min(limit, len(cams)), "items": cams[:limit]}
