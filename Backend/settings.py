import os


# city open data endpoints, set in heroku config vars
CAMERAS_URL = os.getenv('CAMERAS_URL')
INCIDENTS_URL = os.getenv('INCIDENTS_URL')

# padded calgary box, anything outside gets dropped
CALGARY_MIN_LAT = 50.80
CALGARY_MAX_LAT = 51.25
CALGARY_MIN_LON = -114.40
CALGARY_MAX_LON = -113.75

# redis connection and the keys the full lists live under
REDIS_URL = os.getenv('REDIS_URL')
INCIDENTS_REDIS_KEY = "drivesafe:incidents:all"
CAMERAS_REDIS_KEY = "drivesafe:cameras:all"

# bonsai sets BONSAI_URL, local dev can use ELASTICSEARCH_URL
ES_URL = os.getenv('ELASTICSEARCH_URL') or os.getenv('BONSAI_URL')
ES_INDEX = "drivesafe_incidents"

# cache ttls in seconds, incidents older than 7 days are cut
CAMERAS_CACHE_SECONDS = 60
INCIDENTS_CACHE_SECONDS = 30
INCIDENT_MAX_AGE_DAYS = 7
