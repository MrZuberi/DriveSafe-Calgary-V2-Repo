import os
import math
import time
import json
import difflib
import threading
import requests
from flask import Flask, jsonify, request, g
from flask_cors import CORS


# creates the web server
app = Flask(__name__)
# allows frontend to talk to backend from different domains
# (expose_headers lets the browser read the cache/timing headers added below)
CORS(app, expose_headers=["X-Cache", "X-Response-Time-ms"])


# gets api urls from environment variables (heroku config)
CAMERAS_URL = os.getenv('CAMERAS_URL')
# 511 Alberta events API (all of Alberta - we filter to Calgary below)
INCIDENTS_URL = os.getenv('INCIDENTS_URL')  # set in heroku config vars (the open calgary json link)


# calgary bounding box (slightly padded so Airdrie/Okotoks/Cochrane edge events still appear)
CALGARY_MIN_LAT = 50.80
CALGARY_MAX_LAT = 51.25
CALGARY_MIN_LON = -114.40
CALGARY_MAX_LON = -113.75


# =====================================================================
# REDIS (shared cache) - set REDIS_URL in heroku config (heroku-redis add-on does this)
# if REDIS_URL is missing or redis is down, the app silently falls back to the in-memory cache
# =====================================================================
REDIS_URL = os.getenv('REDIS_URL')
INCIDENTS_REDIS_KEY = "drivesafe:incidents:all"
CAMERAS_REDIS_KEY = "drivesafe:cameras:all"

redis_client = None
if REDIS_URL:
    try:
        import redis
        redis_kwargs = {"decode_responses": True, "socket_timeout": 1, "socket_connect_timeout": 1}
        if REDIS_URL.startswith("rediss://"):
            redis_kwargs["ssl_cert_reqs"] = "none"  # heroku redis uses a self-signed cert
        redis_client = redis.from_url(REDIS_URL, **redis_kwargs)
    except Exception as e:
        print("redis setup failed, using memory cache only:", e)
        redis_client = None


# reads a json value from redis (returns None on miss or if redis is unavailable)
def redis_get_json(key):
    if not redis_client:
        return None
    try:
        raw = redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        print("redis get failed:", e)
        return None


# saves a json value to redis with an expiry (ttl) in seconds
def redis_set_json(key, value, ttl_seconds):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl_seconds, json.dumps(value))
    except Exception as e:
        print("redis set failed:", e)


# =====================================================================
# ELASTICSEARCH (fuzzy search) - set ELASTICSEARCH_URL (or BONSAI_URL from the bonsai add-on)
# uses plain REST calls through requests so it works with any elasticsearch version
# =====================================================================
ES_URL = os.getenv('ELASTICSEARCH_URL') or os.getenv('BONSAI_URL')
ES_INDEX = "drivesafe_incidents"
es_ready = False  # becomes True once the index exists and has been filled at least once


def es_request(method, path, **kwargs):
    return requests.request(method, f"{ES_URL.rstrip('/')}/{path}", timeout=5, **kwargs)


# creates the incidents index (with a geo_point for the map) if it doesn't exist yet
def es_ensure_index():
    global es_ready
    if es_ready:
        return True
    mapping = {
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "roadway_name": {"type": "text", "fields": {"raw": {"type": "keyword"}}},
                "description": {"type": "text"},
                "details": {"type": "text"},
                "start_dt": {"type": "date"},
                "modified_dt": {"type": "date"},
                "lanes_affected": {"type": "keyword"},
                "severity": {"type": "keyword"},
                "quadrant": {"type": "keyword"},
                "location": {"type": "geo_point"}
            }
        }
    }
    r = es_request("PUT", ES_INDEX, json=mapping)
    if r.status_code in (200, 201) or (r.status_code == 400 and "already_exists" in r.text):
        es_ready = True
    return es_ready


# pushes the latest incidents into elasticsearch and removes ones that were cleared
def index_incidents_to_es(incidents):
    global es_ready
    if not ES_URL:
        return
    try:
        if not es_ensure_index():
            return
        lines = []
        ids = []
        for inc in incidents:
            if inc.get("id") is None:
                continue
            doc = dict(inc)
            doc["location"] = {"lat": inc["coordinates"]["lat"], "lon": inc["coordinates"]["lon"]}
            lines.append(json.dumps({"index": {"_id": str(inc["id"])}}))
            lines.append(json.dumps(doc))
            ids.append(str(inc["id"]))
        if not lines:
            return
        es_request("POST", f"{ES_INDEX}/_bulk?refresh=true", data="\n".join(lines) + "\n",
                   headers={"Content-Type": "application/x-ndjson"})
        # delete anything that is no longer an active incident
        es_request("POST", f"{ES_INDEX}/_delete_by_query?refresh=true",
                   json={"query": {"bool": {"must_not": {"ids": {"values": ids}}}}})
    except Exception as e:
        print("elasticsearch indexing failed:", e)


# indexes in a background thread so it never slows down the api response
def index_incidents_async(incidents):
    if ES_URL:
        threading.Thread(target=index_incidents_to_es, args=(incidents,), daemon=True).start()


# fuzzy search: "deerfoot trial" still finds "Deerfoot Trail", also matches partial names as you type
def es_search(query, limit):
    body = {
        "size": limit,
        "query": {
            "bool": {
                "should": [
                    {"multi_match": {
                        "query": query,
                        "fields": ["roadway_name^3", "description", "details"],
                        "fuzziness": "AUTO",
                        "prefix_length": 1
                    }},
                    {"match_phrase_prefix": {"roadway_name": {"query": query, "boost": 2}}}
                ],
                "minimum_should_match": 1
            }
        }
    }
    r = es_request("POST", f"{ES_INDEX}/_search", json=body)
    r.raise_for_status()
    items = []
    for hit in r.json()["hits"]["hits"]:
        doc = hit["_source"]
        doc.pop("location", None)
        items.append(doc)
    return items


# backup search used when elasticsearch isn't configured or is down (basic typo tolerance with difflib)
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


# stores data in memory (backup if redis is not available)
cameras_cache = {"timestamp": 0, "data": []} # last got camera data
incidents_cache = {"timestamp": 0, "data": []} #  last got incident data

# how long to keep cached data before getting fresh data
CAMERAS_CACHE_SECONDS = 60  # (updates every minute and incidents is 30 sec)
INCIDENTS_CACHE_SECONDS = 30  


# gets current time as a number
def get_current_time():
    return int(time.time())

# checks if cached data is too old and needs refreshing
def is_cache_expired(cache, max_age_seconds):
    current_time = get_current_time()
    return (current_time - cache["timestamp"]) >= max_age_seconds

# saves new data to cache with current timestamp
def update_cache(cache, new_data):
    cache["timestamp"] = get_current_time()
    cache["data"] = new_data

# calculates distance between two points on earth using math
def calculate_distance_km(lat1, lon1, lat2, lon2): #calculating distances
    earth_radius = 6371.0 # earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c # returns distance in km


# converts a unix timestamp (int) to an ISO-8601 string.
# frontend does `new Date(value)` on this, so we return a string it parses reliably.
def unix_to_iso(value):
    try:
        if value is None:
            return None
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(value)))
    except (ValueError, TypeError, OverflowError):
        return None


# returns True if lat/lon fall inside the padded Calgary box
def is_in_calgary(lat, lon):
    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        return False
    return (CALGARY_MIN_LAT <= lat <= CALGARY_MAX_LAT and
            CALGARY_MIN_LON <= lon <= CALGARY_MAX_LON)


# takes messy camera data from api and makes it clean and consistent
def clean_camera_data(rec):
    # get camera url and description from different possible formats
    url = None
    desc = None
    if isinstance(rec.get("camera_url"), dict):
        url = rec["camera_url"].get("url")
        desc = rec["camera_url"].get("description")
    else:
        url = rec.get("camera_url")
        desc = rec.get("camera_location")

    # get coordinates from the weird api format
    coords = None
    if isinstance(rec.get("point"), dict) and rec["point"].get("coordinates"):
        lon, lat = rec["point"]["coordinates"] # api gives lon first, lat second
        coords = {"lat": lat, "lon": lon}
    else:
        coords = None

    # return clean, simple format
    return {
        "description": desc,
        "camera_location": rec.get("camera_location"),
        "quadrant": rec.get("quadrant"),
        "url": url,
        "coordinates": coords
    }

# converts open calgary timestamps like "2026-09-18T21:36:31.000" (utc, no Z) into "2026-09-18T21:36:31Z"
# so the frontend's new Date(...) reads them as utc and shows the right local time
def utc_text_to_iso(value):
    if not value:
        return None
    s = str(value).strip()
    if len(s) < 19:
        return None
    return s[:19] + "Z"


# takes messy incident data from the open calgary traffic incidents api and makes it clean.
# returns None if the record has no valid coordinates or is outside the Calgary bounds.
def clean_incident_data(rec):
    # open calgary gives latitude / longitude as text fields (and also a geojson "point")
    lat = rec.get("latitude")
    lon = rec.get("longitude")
    if (lat is None or lon is None) and isinstance(rec.get("point"), dict):
        pt = rec["point"].get("coordinates")
        if pt and len(pt) == 2:
            lon, lat = pt  # geojson is lon first, lat second

    # drop records with no coordinates or outside calgary
    if not is_in_calgary(lat, lon):
        return None

    coords = {"lat": float(lat), "lon": float(lon)}

    # clean format the rest of the app expects.
    # this dataset has no lanes / details / severity fields, so those stay None (the UI shows "No Details").
    return {
        "id": rec.get("id"),
        "roadway_name": rec.get("incident_info"),
        "description": rec.get("description"),
        "details": None,
        "start_dt": utc_text_to_iso(rec.get("start_dt_utc")),
        "modified_dt": utc_text_to_iso(rec.get("modified_dt_utc")),
        "lanes_affected": None,
        "severity": None,
        "quadrant": rec.get("quadrant"),
        "coordinates": coords
    }



# gets camera data from redis, memory, or the api (in that order)
def get_cameras():
    # 1) redis (shared between all workers)
    cached = redis_get_json(CAMERAS_REDIS_KEY)
    if cached is not None:
        return cached

    # 2) in-memory backup - don't hit api if we have recent data
    if not is_cache_expired(cameras_cache, CAMERAS_CACHE_SECONDS):
        return cameras_cache["data"]

    # 3) fetch fresh data from calgary api
    params = {
        "$limit": 5000  # more than enough for current dataset size
    }
    r = requests.get(CAMERAS_URL, params=params, timeout=20)
    r.raise_for_status() # crash if api call fails
    data = r.json()
    cameras = [clean_camera_data(x) for x in data if x] # clean up each camera record
    
    # save to both caches for next time
    update_cache(cameras_cache, cameras)
    redis_set_json(CAMERAS_REDIS_KEY, cameras, CAMERAS_CACHE_SECONDS)
    return cameras

# gets incident data from redis, memory, or the 511 api (in that order)
def get_incidents(limit=None):
    # 1) redis - the full list is cached once and every request just slices it
    cached = redis_get_json(INCIDENTS_REDIS_KEY)
    if cached is not None:
        g.cache_status = "HIT"
        return cached if limit is None else cached[:limit]

    # 2) in-memory backup (used if redis is not set up or is down)
    if incidents_cache["timestamp"] > 0 and not is_cache_expired(incidents_cache, INCIDENTS_CACHE_SECONDS):
        g.cache_status = "HIT-MEMORY"
        cached_data = incidents_cache["data"]
        return cached_data if limit is None else cached_data[:limit]

    # 3) cache miss - fetch fresh data from 511 alberta events api
    # (this api returns the full list; we filter to calgary afterward)
    g.cache_status = "MISS"
    r = requests.get(INCIDENTS_URL, timeout=20)
    r.raise_for_status() # crash if api fails
    data = r.json()

    # clean each incident, dropping anything outside calgary or invalid
    incidents = [clean_incident_data(x) for x in data if x]
    incidents = [x for x in incidents if x]

    # newest first (matches previous behavior)
    incidents.sort(
        key=lambda x: x.get("start_dt") or "",
        reverse=True
    )
    
    # always cache the FULL list (any limit is just a slice of it)
    update_cache(incidents_cache, incidents)
    redis_set_json(INCIDENTS_REDIS_KEY, incidents, INCIDENTS_CACHE_SECONDS)

    # keep the search index fresh (runs in the background)
    index_incidents_async(incidents)
    
    return incidents if limit is None else incidents[:limit]


# adds response time + cache hit/miss headers so you can measure latency (check them in browser devtools > network)
@app.before_request
def start_timer():
    g.t0 = time.perf_counter()

@app.after_request
def add_timing_headers(resp):
    t0 = getattr(g, "t0", None)
    if t0 is not None:
        resp.headers["X-Response-Time-ms"] = f"{(time.perf_counter() - t0) * 1000:.1f}"
    status = getattr(g, "cache_status", None)
    if status:
        resp.headers["X-Cache"] = status
    return resp


# simple health check to see if server is running
@app.get("/api/health")
def health():
    return jsonify({"ok": True})

# returns list of traffic incidents
@app.get("/api/incidents")
def get_incidents_endpoint():
    """Return incidents ordered by newest first
    Query params:
      - limit (int): number of incidents to return
    """
    # get limit from url parameter, default to 100
    try:
        limit = int(request.args.get("limit", "100"))
    except Exception:
        limit = 100 # fallback if bad input
    limit = max(1, min(limit, 1000)) # keep limit reasonable
    data = get_incidents(limit=limit)
    return jsonify({"count": len(data), "items": data})

# returns all available incidents
@app.get("/api/incidents/all")
def get_incidents_all():
    """Return as many incidents as API allows (capped)."""
    data = get_incidents(limit=None) # no limit
    return jsonify({"count": len(data), "items": data})

# fuzzy search for incidents by road / location / description
@app.get("/api/search")
def search_incidents():
    """Fuzzy search incidents (typo tolerant). Uses elasticsearch when configured.
    Query params:
      - q (str) required, at least 2 characters
      - limit (int) default 10
    """
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"count": 0, "items": [], "engine": None})

    try:
        limit = int(request.args.get("limit", "10"))
    except Exception:
        limit = 10
    limit = max(1, min(limit, 50))

    # makes sure incidents are loaded (and indexed) before searching
    get_incidents(limit=None)

    items = None
    engine = "fallback"
    if ES_URL and es_ready:
        try:
            items = es_search(query, limit)
            engine = "elasticsearch"
        except Exception as e:
            print("elasticsearch search failed, using fallback:", e)
    if items is None:
        items = fallback_search(query, limit)
    return jsonify({"count": len(items), "items": items, "engine": engine})

# returns list of traffic cameras
@app.get("/api/cameras")
def get_cameras_endpoint():
    cams = get_cameras()
    return jsonify({"count": len(cams), "items": cams})

# finds cameras closest to a given location
@app.get("/api/nearest-cameras")
def nearest_cameras():
    """Return nearest N cameras to a lat/lon.
    Query params:
      - lat (float) required
      - lon (float) required
      - limit (int) default 4
    """
    # get required coordinates from url
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
    except Exception:
        return jsonify({"error": "lat and lon are required floats"}), 400

    # get how many cameras to return
    try:
        limit = int(request.args.get("limit", "4"))
    except Exception:
        limit = 4
    limit = max(1, min(limit, 20)) # reasonable limits

    # get cameras that have coordinates and calculate how far they are
    cams = [c for c in get_cameras() if c.get("coordinates")]
    for c in cams:
        clat = c["coordinates"]["lat"]
        clon = c["coordinates"]["lon"]
        c["distance_km"] = calculate_distance_km(lat, lon, clat, clon) # add distance to each camera

    # sort by distance so closest comes first
    cams.sort(key=lambda x: x.get("distance_km", float("inf")))
    return jsonify({"count": min(limit, len(cams)), "items": cams[:limit]})

# gets incident details plus nearby cameras in one call
@app.get("/api/incident-with-cameras")
def incident_with_cameras():
    """Convenience: given incident id, return incident plus nearest N cameras.
    Query params:
      - id (str) required
      - limit (int) default 4
    """
    # get incident id from url (comes in as string, compare as string too)
    inc_id = request.args.get("id")
    if not inc_id:
        return jsonify({"error": "id is required"}), 400
    
    # get camera limit
    try:
        limit = int(request.args.get("limit", "4"))
    except Exception:
        limit = 4
    limit = max(1, min(limit, 20))

    # find the specific incident by id (ids are ints in the 511 api, so compare loosely)
    incidents = get_incidents(limit=None)
    incident = next(
        (x for x in incidents if str(x.get("id")) == str(inc_id)),
        None
    )
    if not incident or not incident.get("coordinates"):
        return jsonify({"error": "incident not found or missing coordinates"}), 404

    # get cameras near this incident
    lat = incident["coordinates"]["lat"]
    lon = incident["coordinates"]["lon"]
    cams_resp = find_nearest_cameras(lat, lon, limit)
    return jsonify({"incident": incident, "nearest_cameras": cams_resp})

# helper function to find cameras near a location
def find_nearest_cameras(lat, lon, limit):
    # get cameras with coordinates and calculate distances
    cams = [c for c in get_cameras() if c.get("coordinates")]
    for c in cams:
        clat = c["coordinates"]["lat"]
        clon = c["coordinates"]["lon"]
        c["distance_km"] = calculate_distance_km(lat, lon, clat, clon)
    
    # sort by distance closest first
    cams.sort(key=lambda x: x.get("distance_km", float("inf")))
    return {"count": min(limit, len(cams)), "items": cams[:limit]}


# starts the web server when script runs
if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000")) # heroku sets PORT, default 5000 locally
    
    app.run(host="0.0.0.0", port=port, debug=False) # start server