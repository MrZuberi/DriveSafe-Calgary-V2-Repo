# DriveSafe Calgary
*Real-time traffic incident monitoring and visualization for Calgary*

**🌐 [View Live Application](https://www.drivesafecalgary.ca/)**

## What Is This Project?
DriveSafe Calgary is a full-stack web app that shows what is happening on Calgary's roads right now. It pulls live traffic incident data from the City of Calgary's Open Data portal, cleans it, caches it, and shows it on an interactive 3D map next to a searchable list of the past week's incidents. Pick an incident and the app finds the closest traffic cameras so you can see the road for yourself.

It is built as two separate apps:

* **Backend** (Python / Flask) - a set of small modules that download, clean, cache and serve the data through a small JSON API, with `app.py` as the entry point. Hosted on **Heroku**.
* **Frontend** (React) - a desktop UI and a separate mobile UI, each split into components, sharing config, API calls and date helpers, both talking to the backend. Hosted on **Vercel** with a custom domain.

## Features
* **Live 3D Traffic Map** - MapLibre GL map with 3D buildings/tilt and clickable incident markers. The map only shows incidents from **today**.
* **Weekly Traffic Incidents List** - every incident from the last **7 days**, newest first, under a "Weekly Traffic Incidents" title above the search bar.
* **Incident Details** - time, quadrant, description and last-updated info for each incident.
* **Nearby Traffic Cameras** - the closest camera feeds to the selected incident, with next/prev navigation.

## How It Works

1. A background thread on the backend downloads the latest incidents every 25 seconds.
2. Each record is cleaned, filtered to Calgary and to the last 7 days, and sorted newest first.
3. The full list is stored in **Redis** (and in memory as a backup) and pushed into **Elasticsearch** for search
4. The frontend calls the backend every 30 seconds, filters what goes on the map to today, and renders the list

## Technologies
### Frontend
* **React** 
* **MapLibre GL JS** 
* **Python Flask** 
* **Requests** - downloads data from Calgary Open Data and talks to Elasticsearch
* **Redis** - shared cache
* **Elasticsearch** - fuzzy, typo-tolerant search

### Hosting
* **Heroku** - Redis add-on, Elasticsearch (Bonsai) add-on
* **Vercel**

## Project Structure
```
├── Backend/
│   ├── app.py                  # entry point: creates the app, registers the routes, starts the warmer
│   ├── settings.py
│   ├── redis_cache.py
│   ├── memory_cache.py
│   ├── helpers.py
│   ├── cleaners.py
│   ├── elastic.py
│   ├── cameras_service.py
│   ├── incidents_service.py
│   ├── routes.py
│   ├── config.js, config.json  # the city API urls for reference (the app reads env vars)
│   ├── requirements.txt
│   └── Procfile                # gunicorn app:app
└── Frontend/
    └── src/
        ├── index.js
        ├── App.js              # picks desktop or mobile and lazy-loads it
        ├── DesktopApp.js       # desktop root (state + layout)
        ├── App.css, mobiles.css
        ├── shared/
        │   ├── config.js
        │   ├── api.js
        │   ├── format.js
        │   └── dates.js
        ├── desktop/
        │   ├── styles.js
        │   └── components/
        │       ├── Map3D.js, MapControls.js
        │       ├── IncidentList.js, IncidentCard.js, LatestIncidents.js
        │       ├── CameraCard.js, DetailsCard.js, ExitButton.js
        │       ├── TitleCard.js, PageTabs.js, AboutModal.js, ImageModal.js
        │       └── FormattedDescription.js, Icons.js
        └── mobile/
            ├── App.js          # mobile root (state + layout)
            ├── App.css
            ├── theme.js
            ├── timeAgo.js
            ├── hooks/
            │   └── useViewport.js
            └── components/
                ├── Map3D.js, MapControls.js, TitleBadge.js
                ├── BottomSheet.js, SheetHeader.js, TabSwitch.js, SheetBody.js
                ├── IncidentRow.js, DetailsTab.js, CamerasTab.js, InfoRow.js
                ├── AboutOverlay.js
                └── FormattedDescription.js, Icons.js
```

### What Each File Does

**Backend**

| File | What it does |
| --- | --- |
| `app.py` | Creates the Flask app, sets up CORS (exposes `X-Cache` and `X-Response-Time-ms`), registers the routes blueprint, starts the incidents warmer thread, runs the dev server |
| `settings.py` | Env vars (`CAMERAS_URL`, `INCIDENTS_URL`, `REDIS_URL`, `ELASTICSEARCH_URL`/`BONSAI_URL`), Calgary bounding box, cache durations, Redis keys, Elasticsearch index name |
| `redis_cache.py` | Connects to Redis when `REDIS_URL` is set, plus `redis_get_json` / `redis_set_json` helpers |
| `memory_cache.py` | In-memory camera and incident caches (the backup when Redis is off) and their expiry/update helpers |
| `helpers.py` | Distance calculation, time conversion, and the "is this inside Calgary" check |
| `cleaners.py` | `clean_camera_data` and `clean_incident_data`, which turn raw city records into the app's format |
| `elastic.py` | Elasticsearch index setup, bulk indexing, and fuzzy search; owns the `es_ready` flag |
| `cameras_service.py` | `get_cameras` (Redis → memory → city API) and `find_nearest_cameras` |
| `incidents_service.py` | Fetches, cleans, filters, sorts and caches incidents, the 25-second background warmer, and the backup search |
| `routes.py` | All `/api/...` routes as a Flask Blueprint, plus the response timing / cache headers |

**Frontend**

| File | What it does |
| --- | --- |
| `App.js` | Detects mobile vs desktop and lazy-loads `./DesktopApp` or `./mobile/App` |
| `DesktopApp.js` | Desktop state (incidents, selection, cameras, search, page) and page layout |
| `mobile/App.js` | Mobile state (incidents, selection, cameras, search, sheet snap, 2D/3D) and layout |
| `shared/config.js` | Backend URL and the Calgary map center |
| `shared/api.js` | Calls to `/api/incidents`, `/api/search` and `/api/nearest-cameras` |
| `shared/format.js` | `orNA`, `formatTime`, `formatDateTime` |
| `shared/dates.js` | `isWithinLastWeek` (list) and `isToday` (map) |
| `desktop/styles.js` | Desktop font and shared button styles |
| `desktop/components/*` | Map, map controls, weekly list + cards, latest incidents panel, camera/details cards, title card, MAP/LIST tabs, about and image modals |
| `mobile/theme.js` | Mobile font, colors, glass style and global CSS |
| `mobile/timeAgo.js` | "Xm ago" labels used by the sheet header and list rows |
| `mobile/hooks/useViewport.js` | Window size, so the layout switches to the side panel at 700px+ |
| `mobile/components/*` | Map, floating controls, title badge, draggable bottom sheet and its header/tabs/body, list rows, details/cameras tabs, about overlay |

`FormattedDescription` and the icons live in each platform folder rather than `shared/` because the desktop and mobile versions are styled differently.

### Build Order
Each layer only imports from the layers above it, so this is the order to read or build the project in.

**Backend**
1. `settings.py`
2. `helpers.py`, `redis_cache.py`
3. `memory_cache.py`, `cleaners.py`, `elastic.py`
4. `cameras_service.py`, `incidents_service.py`
5. `routes.py`
6. `app.py`

**Frontend**
1. `shared/` (`config.js` → `api.js`, `format.js`, `dates.js`)
2. `desktop/styles.js`, `mobile/theme.js`, `mobile/timeAgo.js`, `mobile/hooks/useViewport.js`
3. `desktop/components/`, `mobile/components/` (icons and small pieces first, then the cards, list, sheet and map)
4. `DesktopApp.js`, `mobile/App.js`
5. `App.js`

## How to Run the Application

### Backend (Python Flask)
1. **Go to the backend folder**
   ```bash
   cd Backend
   ```
2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
3. **Set environment variables**
   ```bash
   export CAMERAS_URL="https://data.calgary.ca/resource/k7p9-kppz.json"
   export INCIDENTS_URL="https://data.calgary.ca/resource/35ra-9556.json"
   export PORT=5000
   # optional
   export REDIS_URL="redis://localhost:6379"
   export ELASTICSEARCH_URL="http://localhost:9200"
   ```
4. **Run the server**
   ```bash
   python app.py
   ```
   The backend starts on `http://localhost:5000`. Without Redis or Elasticsearch it still works using the memory cache and backup search.

### Frontend (React)
1. **Go to the frontend folder**
   ```bash
   cd Frontend
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Point it at your backend (optional)**
   ```bash
   export REACT_APP_BACKEND_URL=http://localhost:5000
   ```
4. **Start the dev server**
   ```bash
   npm start
   ```
   The frontend starts on `http://localhost:3000`.

## License
This project is licensed under the GNU General Public License v3.0 (GPLv3) - see the [LICENSE](LICENSE) file for details.