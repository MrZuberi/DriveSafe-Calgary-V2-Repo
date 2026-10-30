from helpers import get_current_time


# in-process fallback caches for when redis isn't available
cameras_cache = {"timestamp": 0, "data": []}
incidents_cache = {"timestamp": 0, "data": []}


# true once the cache is at least max_age_seconds old
def is_cache_expired(cache, max_age_seconds):
    current_time = get_current_time()
    return (current_time - cache["timestamp"]) >= max_age_seconds


# swaps in new data and stamps it with the current time
def update_cache(cache, new_data):
    cache["timestamp"] = get_current_time()
    cache["data"] = new_data
