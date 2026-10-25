import { useEffect, useState, useRef } from "react";
import axios from "axios";
import './App.css';
import './mobiles.css'; 
import driveGif from "./drive.gif";
import image1 from "./image1.jpg"; 

const maplibregl = window.maplibregl;

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "https://drivesafecalgary-13a17c07f5d1.herokuapp.com";
const CALGARY_CENTER = [-114.0719, 51.0447];

function orNA(value) {
  if (value === null || value === undefined) return "No Details";
  const s = String(value).trim();
  if (s === "" || s.toLowerCase() === "no data" || s.toLowerCase() === "unknown" || s.toLowerCase() === "none") return "No Details";
  return s;
}

function formatTime(value) {
  if (!value) return "No Details";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No Details";
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return "No Details";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No Details";
  return d.toLocaleString();
}

function Map3D({ incidents, selectedIncident, onSelectIncident }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const onSelectRef = useRef(onSelectIncident);
  onSelectRef.current = onSelectIncident;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: CALGARY_CENTER,
      zoom: 9,
      pitch: 45, // A nice 3D tilt
      bearing: 0,
      // maxBounds REMOVED so you can freely pan and zoom out
    });
    map.current = m;

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");

    m.on("load", () => {
      m.resize();
      const sources = m.getStyle().sources;
      const vectorSource = Object.keys(sources).find((k) => sources[k].type === "vector");
      
      if (vectorSource && !m.getLayer("3d-buildings")) {
        try {
          m.addLayer({
            id: "3d-buildings",
            source: vectorSource,
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": "#cccccc",
              "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
              "fill-extrusion-opacity": 0.85,
            },
          });
        } catch (e) {
          console.warn("3D buildings layer failed:", e);
        }
      }
    });

    m.on("error", (e) => console.error("Map error:", e.error || e));

    return () => {
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      m.remove();
      map.current = null; 
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    incidents.forEach((incident) => {
      if (!incident.coordinates) return;
      hasPoints = true;
      
      bounds.extend([incident.coordinates.lon, incident.coordinates.lat]);

      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "20px", height: "20px", backgroundColor: "#d64545",
        borderRadius: "50%", border: "3px solid white",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)", cursor: "pointer",
      });
      el.addEventListener("click", () => onSelectRef.current(incident));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.coordinates.lon, incident.coordinates.lat])
        .addTo(map.current);
      markers.current.push(marker);
    });

    if (hasPoints && !bounds.isEmpty()) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      // Expand by ~5km so it doesn't hug the dots too tightly
      const expandedBounds = new maplibregl.LngLatBounds(
        [sw.lng - 0.05, sw.lat - 0.05], 
        [ne.lng + 0.05, ne.lat + 0.05]  
      );

      map.current.fitBounds(expandedBounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        pitch: 45,
        maxZoom: 9 // Forces it to stay zoomed out to the city level
      });
    }
  }, [incidents]);

  useEffect(() => {
    if (map.current && selectedIncident?.coordinates) {
      map.current.flyTo({
        center: [selectedIncident.coordinates.lon, selectedIncident.coordinates.lat],
        zoom: 16.5, pitch: 60, bearing: -20, speed: 0.8, curve: 1.2, essential: true,
      });
    }
  }, [selectedIncident]);

  return <div ref={mapContainer} style={{ width: "100%", height: "500px", position: "relative", zIndex: 10 }} />;
}

function DescriptionDropdown({ incident }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "0.3rem 0" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#004c8c', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        Description {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{ marginTop: '0.5rem', paddingLeft: '0.25rem', borderLeft: '3px solid #dee2e6' }}>
          <p style={{ margin: "0 0 0.4rem 0" }}><b>Description:</b> {orNA(incident.description)}</p>
          <p style={{ margin: "0 0 0.4rem 0" }}><b>Details:</b> {orNA(incident.details)}</p>
          <p style={{ margin: "0 0 0.4rem 0" }}><b>Last updated:</b> {formatDateTime(incident.modified_dt)}</p>
        </div>
      )}
    </div>
  );
}

function App() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [nearestCameras, setNearestCameras] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  function loadIncidents() {
    axios.get(`${API_BASE_URL}/api/incidents?limit=500`).then(res => {
      if (res.data?.items) {
        const clean = res.data.items.filter(i => i.coordinates?.lat && i.coordinates?.lon).sort((a,b) => new Date(b.start_dt||0) - new Date(a.start_dt||0));
        setIncidents(clean);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }

  useEffect(() => { loadIncidents(); const t = setInterval(loadIncidents, 30000); return () => clearInterval(t); }, []);

  function handleSelectIncident(incident) {
    setSelectedIncident(incident);
    if (incident?.coordinates) {
      axios.get(`${API_BASE_URL}/api/nearest-cameras`, { params: { lat: incident.coordinates.lat, lon: incident.coordinates.lon, limit: 4 } }).then(res => { if (res.data) setNearestCameras(res.data.items); }).catch(() => setNearestCameras([]));
    } else { setNearestCameras([]); }
  }

  function handlePickFromList(incident) {
    if (incident?.id) {
      axios.get(`${API_BASE_URL}/api/incident-with-cameras`, { params: { id: incident.id, limit: 4 } }).then(res => { if (res.data) setShowModal({ incident: res.data.incident, cameras: res.data.nearest_cameras.items || [] }); }).catch(() => setShowModal({ incident, cameras: [] }));
    }
  }

  const filteredIncidents = [];
  const searchLower = searchText.toLowerCase().trim();
  incidents.forEach(i => {
    if (searchLower === "" || (i.roadway_name && i.roadway_name.toLowerCase().includes(searchLower)) || (i.description && i.description.toLowerCase().includes(searchLower))) filteredIncidents.push(i);
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>Loading traffic data....</div>;

  return (
    <div style={{ backgroundImage: `url(${image1})`, backgroundSize: "cover", backgroundAttachment: "fixed", minHeight: "100vh", backgroundPosition: "center center", display: "flex" }}>
      <div className="header-left">
        <img src={driveGif} alt="Drive Animation" className="header-gif" />
        <div><h1 style={{ fontSize: '32px' }}>DriveSafe Calgary</h1><h2 style={{ fontSize: '16px' }}>Calgary Live Traffic Incidents</h2></div>
      </div>
      <div className="main-content">
        <div className="container" style={{ paddingBottom: "6rem" }}>
          <div className="grid-2">
            <div className="card" style={{ padding: 0, minHeight: "520px", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: '0.8rem', background: '#f5f6f7', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
                <div style={{ fontWeight: 600, color: '#004c8c', fontSize: '1rem' }}>🗺️ Calgary Traffic Map (3D)</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.3rem' }}>Zoom and rotate the map. Tap any red marker to fly to the location.</div>
              </div>
              <div style={{ flex: 1, position: 'relative' }}><Map3D incidents={incidents} selectedIncident={selectedIncident} onSelectIncident={handleSelectIncident} /></div>
            </div>
            <div className="card" style={{ height: "auto", padding: "0.5rem" }}>
              {!selectedIncident ? (
                <div className="right-panel-empty" style={{ fontSize: "0.9rem" }}><div>Click any map icon to see accidents</div><div className="badge" style={{ marginTop: "0.25rem" }}>Live feed. Updates automatically.</div></div>
              ) : (
                <div className="details" style={{ overflow: "visible", lineHeight: "1.2rem" }}>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "0.3rem" }}>{orNA(selectedIncident.roadway_name)}</h2>
                  <p style={{ fontSize: "0.95rem", margin: "0 0 0.3rem 0" }}>{orNA(selectedIncident.description)}</p>
                  <p style={{ margin: "0 0 0.3rem 0" }}><b>When:</b> {formatTime(selectedIncident.start_dt)}</p>
                  <p style={{ margin: "0 0 0.3rem 0" }}><b>Lanes affected:</b> {orNA(selectedIncident.lanes_affected)}</p>
                  <DescriptionDropdown incident={selectedIncident} />
                  <div className="section-title" style={{ marginBottom: "0.25rem" }}>Closest traffic cameras:</div>
                  <p style={{ textAlign: "center", fontSize: "0.75rem", color: "gray", margin: "0.1rem 0 0.25rem 0" }}>Click on images to enlarge!</p>
                  <div className="cam-grid" style={{ gap: "0.25rem" }}>
                    {nearestCameras.map((cam, idx) => (
                      <div key={idx}>
                        <img src={cam.url} alt={cam.description} onClick={() => setShowImageModal(cam.url)} style={{ height: "150px", width: "310px", objectFit: "cover" }} onError={e => e.target.style.display = 'none'} />
                        <div className="cam-distance" style={{ fontSize: "0.75rem", marginTop: "0.1rem" }}>~{cam.distance_km ? cam.distance_km.toFixed(2) : 0} km</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="search-list">
            <div className="search-bar"><input placeholder="Search any recent incidents..." value={searchText} onChange={e => setSearchText(e.target.value)} /><div className="badge">{filteredIncidents.length} matches</div></div>
            <div className="item-list">
              {filteredIncidents.map(inc => (
                <div key={inc.id} className="item" onClick={() => handlePickFromList(inc)}>
                  <div className="item-header"><div className="item-title">{orNA(inc.roadway_name)}</div><div className="badge" style={{ background: "red", color: "white" }}>{formatTime(inc.start_dt)}</div></div>
                  <div className="item-description">{orNA(inc.description)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal" onClick={() => setShowModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{orNA(showModal.incident.roadway_name)}</div><button className="close-btn" onClick={() => setShowModal(null)}>Close</button></div>
            <div className="inline-modal-content">
              <p><b>Description:</b> {orNA(showModal.incident.description)}</p>
              <p><b>When:</b> {formatTime(showModal.incident.start_dt)}</p>
              <p><b>Lanes affected:</b> {orNA(showModal.incident.lanes_affected)}</p>
              <DescriptionDropdown incident={showModal.incident} />
              <div className="section-title"><p><b>Closest traffic cameras:</b></p></div>
            </div>
            <div className="cam-grid" style={{ padding: "0.5rem 1rem 1rem 1rem" }}>
              {showModal.cameras.map((cam, idx) => (
                <div key={idx} style={{ textAlign: "center" }}>
                  <img src={cam.url} alt={cam.description} onClick={() => setShowImageModal(cam.url)} style={{ height: "140px", width: "100%", maxWidth: "320px" }} onError={e => e.target.style.display = 'none'} />
                  <div className="cam-distance">~{cam.distance_km ? cam.distance_km.toFixed(2) : 0} km</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showImageModal && (
        <div className="modal" onClick={() => setShowImageModal(null)} style={{ alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.9)" }}>
          <img src={showImageModal} alt="camera" style={{ maxWidth: "95vw", maxHeight: "95vh" }} onClick={e => e.stopPropagation()} />
          <button className="close-btn" onClick={() => setShowImageModal(null)} style={{ position: "absolute", top: "1rem", right: "1rem" }}>Close</button>
        </div>
      )}
    </div>
  );
}

export default App;