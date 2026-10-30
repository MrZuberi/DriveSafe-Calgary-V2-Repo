# DriveSafe Calgary
*Real-time traffic incident monitoring and visualization for Calgary*

**🌐 [View Live Application](https://www.drivesafecalgary.ca/)**

## What Is This Project?
DriveSafe Calgary is a full-stack web app that shows what is happening on Calgary's roads right now. It pulls live traffic incident data from the City of Calgary's Open Data portal, cleans it, caches it, and shows it on an interactive 3D map next to a searchable list of the past week's incidents. Pick an incident and the app finds the closest traffic cameras so you can see the road for yourself.

## Features
* **Live 3D Traffic Map** - MapLibre GL map with 3D buildings/tilt and clickable incident markers. The map only shows incidents from **today**.
* **Weekly Traffic Incidents List** - every incident from the last **7 days**, newest first, under a "Weekly Traffic Incidents" title above the search bar.
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
* **Redis** 
* **Elasticsearch** 

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
