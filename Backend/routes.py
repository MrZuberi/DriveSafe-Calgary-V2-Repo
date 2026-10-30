import time

from flask import Blueprint, jsonify, request, g

import elastic
from settings import ES_URL
from cameras_service import get_cameras, find_nearest_cameras
from incidents_service import get_incidents, fallback_search


api = Blueprint("api", __name__)


# stamps the request start time, app-wide so 404s get timed too
@api.before_app_request
def start_timer():
    g.t0 = time.perf_counter()


# adds X-Response-Time-ms, plus X-Cache when get_incidents set a status
@api.after_app_request
def add_timing_headers(resp):
    t0 = getattr(g, "t0", None)
    if t0 is not None:
        resp.headers["X-Response-Time-ms"] = f"{(time.perf_counter() - t0) * 1000:.1f}"
    status = getattr(g, "cache_status", None)
    if status:
        resp.headers["X-Cache"] = status
    return resp


@api.get("/api/health")
def health():
    return jsonify({"ok": True})


# newest incidents, limit clamped to 1-1000 (default 100)
@api.get("/api/incidents")
def get_incidents_endpoint():
    try:
        limit = int(request.args.get("limit", "100"))
    except Exception:
        limit = 100
    limit = max(1, min(limit, 1000))
    data = get_incidents(limit=limit)
    return jsonify({"count": len(data), "items": data})


@api.get("/api/incidents/all")
def get_incidents_all():
    data = get_incidents(limit=None)
    return jsonify({"count": len(data), "items": data})


# needs q of 2+ chars, uses elasticsearch when ready and falls back to difflib on error
@api.get("/api/search")
def search_incidents():
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"count": 0, "items": [], "engine": None})

    try:
        limit = int(request.args.get("limit", "10"))
    except Exception:
        limit = 10
    limit = max(1, min(limit, 50))

    # warms the cache and sets X-Cache even when elasticsearch answers
    get_incidents(limit=None)

    items = None
    engine = "fallback"
    if ES_URL and elastic.es_ready:
        try:
            items = elastic.es_search(query, limit)
            engine = "elasticsearch"
        except Exception as e:
            print("elasticsearch search failed, using fallback:", e)
    if items is None:
        items = fallback_search(query, limit)
    return jsonify({"count": len(items), "items": items, "engine": engine})


@api.get("/api/cameras")
def get_cameras_endpoint():
    cams = get_cameras()
    return jsonify({"count": len(cams), "items": cams})


# 400 unless lat/lon parse as floats, limit clamped to 1-20 (default 4)
@api.get("/api/nearest-cameras")
def nearest_cameras():
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
    except Exception:
        return jsonify({"error": "lat and lon are required floats"}), 400

    try:
        limit = int(request.args.get("limit", "4"))
    except Exception:
        limit = 4
    limit = max(1, min(limit, 20))

    return jsonify(find_nearest_cameras(lat, lon, limit))


# looks up an incident by id and attaches its closest cameras, 404 if missing
@api.get("/api/incident-with-cameras")
def incident_with_cameras():
    inc_id = request.args.get("id")
    if not inc_id:
        return jsonify({"error": "id is required"}), 400

    try:
        limit = int(request.args.get("limit", "4"))
    except Exception:
        limit = 4
    limit = max(1, min(limit, 20))

    incidents = get_incidents(limit=None)
    incident = next(
        (x for x in incidents if str(x.get("id")) == str(inc_id)),
        None
    )
    if not incident or not incident.get("coordinates"):
        return jsonify({"error": "incident not found or missing coordinates"}), 404

    lat = incident["coordinates"]["lat"]
    lon = incident["coordinates"]["lon"]
    cams_resp = find_nearest_cameras(lat, lon, limit)
    return jsonify({"incident": incident, "nearest_cameras": cams_resp})
