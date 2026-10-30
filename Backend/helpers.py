import math
import time

from settings import CALGARY_MIN_LAT, CALGARY_MAX_LAT, CALGARY_MIN_LON, CALGARY_MAX_LON


# current unix time in whole seconds
def get_current_time():
    return int(time.time())


# haversine distance in km
def calculate_distance_km(lat1, lon1, lat2, lon2):
    earth_radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c


# unix seconds to "YYYY-MM-DDTHH:MM:SSZ", None if it can't be parsed
def unix_to_iso(value):
    try:
        if value is None:
            return None
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(value)))
    except (ValueError, TypeError, OverflowError):
        return None


# trims the api's utc timestamp to seconds and tags it with Z
def utc_text_to_iso(value):
    if not value:
        return None
    s = str(value).strip()
    if len(s) < 19:
        return None
    return s[:19] + "Z"


# true if the point parses as floats and sits inside the calgary box
def is_in_calgary(lat, lon):
    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        return False
    return (CALGARY_MIN_LAT <= lat <= CALGARY_MAX_LAT and
            CALGARY_MIN_LON <= lon <= CALGARY_MAX_LON)
