import time
import difflib
import threading

import requests
from flask import g

from settings import INCIDENTS_URL, INCIDENTS_REDIS_KEY, INCIDENTS_CACHE_SECONDS, INCIDENT_MAX_AGE_DAYS
from redis_cache import redis_get_json, redis_set_json
from memory_cache import incidents_cache, is_cache_expired, update_cache
from helpers import get_current_time, unix_to_iso
from cleaners import clean_incident_data
from elastic import index_incidents_async


# held while a refresh runs so two don't overlap
incidents_lock = threading.Lock()


# pulls the last 7 days from the api, retries without filters if it 4xx's on them
def fetch_incidents_raw():
    url = INCIDENTS_URL or ""
    cutoff = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(time.time() - INCIDENT_MAX_AGE_DAYS * 86400))
    # don't add $where/$limit if the configured url already has them
    params = {}
    if "$where" not in url and "%24where" not in url:
        params["$where"] = f"start_dt_utc >= '{cutoff}'"
    if "$limit" not in url and "%24limit" not in url:
        params["$limit"] = 5000
    try:
        r = requests.get(INCIDENTS_URL, params=params, timeout=20)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        if e.response is None or not (400 <= e.response.status_code < 500):
            raise
        print("incidents api rejected filter params, retrying plain:", e)
    r = requests.get(INCIDENTS_URL, timeout=20)
    r.raise_for_status()
    return r.json()


# fetches, cleans, drops anything older than 7 days, sorts newest first, then caches and indexes
def fetch_and_cache_incidents():
    with incidents_lock:
        # skip if another caller refreshed in the last 5s
        if incidents_cache["timestamp"] > 0 and (get_current_time() - incidents_cache["timestamp"]) < 5:
            return incidents_cache["data"]

        data = fetch_incidents_raw()

        incidents = [clean_incident_data(x) for x in data if x]
        incidents = [x for x in incidents if x]

        # incidents with no start time are kept
        cutoff_iso = unix_to_iso(time.time() - INCIDENT_MAX_AGE_DAYS * 86400)
        incidents = [x for x in incidents if not x.get("start_dt") or x["start_dt"] >= cutoff_iso]

        incidents.sort(
            key=lambda x: x.get("start_dt") or "",
            reverse=True
        )

        update_cache(incidents_cache, incidents)
        redis_set_json(INCIDENTS_REDIS_KEY, incidents, INCIDENTS_CACHE_SECONDS)

        index_incidents_async(incidents)
        return incidents


# kicks off a refresh on a daemon thread unless one is already running
def refresh_incidents_async():
    if incidents_lock.locked():
        return
    def _run():
        try:
            fetch_and_cache_incidents()
        except Exception as e:
            print("background incidents refresh failed:", e)
    threading.Thread(target=_run, daemon=True).start()


# redis first, then memory (serving stale while refreshing), else a blocking fetch; sets g.cache_status
def get_incidents(limit=None):
    cached = redis_get_json(INCIDENTS_REDIS_KEY)
    if cached is not None:
        g.cache_status = "HIT"
        return cached if limit is None else cached[:limit]

    if incidents_cache["timestamp"] > 0:
        cached_data = incidents_cache["data"]
        if is_cache_expired(incidents_cache, INCIDENTS_CACHE_SECONDS):
            g.cache_status = "STALE"
            refresh_incidents_async()
        else:
            g.cache_status = "HIT-MEMORY"
        return cached_data if limit is None else cached_data[:limit]

    g.cache_status = "MISS"
    incidents = fetch_and_cache_incidents()
    return incidents if limit is None else incidents[:limit]


# refetches every 25s forever so requests rarely hit a cold cache
def incidents_warmer():
    while True:
        try:
            fetch_and_cache_incidents()
        except Exception as e:
            print("incidents warmer failed:", e)
        time.sleep(25)


# difflib ratio on roadway_name, substring hits score 0.9, keeps anything >= 0.5
def fallback_search(query, limit):
    q = query.lower().strip()
    scored = []
    for inc in get_incidents(limit=None):
        name = (inc.get("roadway_name") or "").lower()
        text = " ".join(str(inc.get(k) or "") for k in ("roadway_name", "description", "details")).lower()
        score = difflib.SequenceMatcher(None, q, name).ratio()
        if q in text:
            score = max(score, 0.9)
        if score >= 0.5:
            scored.append((score, inc))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [inc for _, inc in scored[:limit]]
