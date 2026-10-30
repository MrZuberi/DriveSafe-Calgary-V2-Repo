from helpers import is_in_calgary, utc_text_to_iso


# flattens a raw camera record, camera_url can be a dict or a plain string
def clean_camera_data(rec):
    url = None
    desc = None
    if isinstance(rec.get("camera_url"), dict):
        url = rec["camera_url"].get("url")
        desc = rec["camera_url"].get("description")
    else:
        url = rec.get("camera_url")
        desc = rec.get("camera_location")

    # geojson point is [lon, lat]
    coords = None
    if isinstance(rec.get("point"), dict) and rec["point"].get("coordinates"):
        lon, lat = rec["point"]["coordinates"]
        coords = {"lat": lat, "lon": lon}
    else:
        coords = None

    return {
        "description": desc,
        "camera_location": rec.get("camera_location"),
        "quadrant": rec.get("quadrant"),
        "url": url,
        "coordinates": coords
    }


# maps a raw incident to our shape, None if it has no usable calgary location
def clean_incident_data(rec):
    lat = rec.get("latitude")
    lon = rec.get("longitude")
    # fall back to the geojson point when lat/lon fields are missing
    if (lat is None or lon is None) and isinstance(rec.get("point"), dict):
        pt = rec["point"].get("coordinates")
        if pt and len(pt) == 2:
            lon, lat = pt

    if not is_in_calgary(lat, lon):
        return None

    coords = {"lat": float(lat), "lon": float(lon)}

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
