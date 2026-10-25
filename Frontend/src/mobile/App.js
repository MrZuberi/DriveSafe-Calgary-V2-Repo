import { useEffect, useState, useRef } from "react";
import axios from "axios";
import './App.css';
import bgImage from "./image2.jpg";
import driveGif from "./drive.gif";

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
  const hasFitBounds = useRef(false); 
  onSelectRef.current = onSelectIncident;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: CALGARY_CENTER,
      zoom: 9,
      pitch: 45, 
      bearing: 0,
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
      el.addEventListener("click", () => onSelectRef.current({ ...incident }));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.coordinates.lon, incident.coordinates.lat])
        .addTo(map.current);
      markers.current.push(marker);
    });

    if (!hasFitBounds.current && hasPoints && !bounds.isEmpty()) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      const expandedBounds = new maplibregl.LngLatBounds(
        [sw.lng - 0.05, sw.lat - 0.05], 
        [ne.lng + 0.05, ne.lat + 0.05]  
      );

      map.current.fitBounds(expandedBounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        pitch: 45,
        maxZoom: 9 
      });

      hasFitBounds.current = true; 
    }
  }, [incidents]);

  useEffect(() => {
    if (map.current && selectedIncident?.coordinates) {
      map.current.stop(); 
      map.current.flyTo({
        center: [selectedIncident.coordinates.lon, selectedIncident.coordinates.lat],
        zoom: 16.5, pitch: 60, bearing: -20, speed: 0.8, curve: 1.2, essential: true,
      });
    }
  }, [selectedIncident]);

  const handleMake2D = () => {
    if (map.current) {
      map.current.stop(); 
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  };

  const handleResetView = () => {
    if (map.current && incidents.length > 0) {
      map.current.stop(); 
      
      const bounds = new maplibregl.LngLatBounds();
      incidents.forEach((incident) => {
        if (incident.coordinates) bounds.extend([incident.coordinates.lon, incident.coordinates.lat]);
      });
      
      if (!bounds.isEmpty()) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const expandedBounds = new maplibregl.LngLatBounds(
          [sw.lng - 0.05, sw.lat - 0.05], 
          [ne.lng + 0.05, ne.lat + 0.05]  
        );

        map.current.fitBounds(expandedBounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          pitch: 45,
          maxZoom: 9,
          duration: 1000
        });
      }
    }
  };

  const btnStyle = { background: "white", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer", fontWeight: "600", color: "#333", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", fontSize: "14px", zIndex: 30 };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 50 }}>
        <button onClick={handleMake2D} style={btnStyle}>Make 2D</button>
        <button onClick={handleResetView} style={btnStyle}>Reset View</button>
      </div>
      <div ref={mapContainer} style={{ width: "100%", height: "400px" }} />
    </div>
  );
}

function DescriptionDropdown({ incident }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "0.5rem 0" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#004c8c', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        Description {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{ marginTop: '0.75rem', paddingLeft: '0.75rem', borderLeft: '3px solid #dee2e6', lineHeight: '1.6' }}>
          <p style={{ margin: "0 0 0.75rem 0" }}><b>Description:</b> {orNA(incident.description)}</p>
          <p style={{ margin: "0 0 0.75rem 0" }}><b>Details:</b> {orNA(incident.details)}</p>
          <p style={{ margin: "0 0 0.75rem 0" }}><b>Last updated:</b> {formatDateTime(incident.modified_dt)}</p>
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

  function loadCameras() { axios.get(`${API_BASE_URL}/api/cameras`).catch(console.error); }

  useEffect(() => { loadIncidents(); loadCameras(); const t = setInterval(loadIncidents, 30000); return () => clearInterval(t); }, []);

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

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', background: `url(${bgImage})`, backgroundSize: 'cover', color: 'white' }}>🚗 Loading Calgary Traffic...</div>;

  return (
    <>
      <meta name="viewport" content="width=1200" />
      <div style={{ backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundAttachment: "scroll", minHeight: "100vh", backgroundPosition: "center center" }}>
        <div className="header-left">
          <img src={driveGif} alt="Drive Animation" className="header-gif" />
          <div>
            <h1 style={{ fontSize: '55px', opacity: 0.8, marginBottom: '15px' }}>DriveSafe Calgary</h1>
            <p>Live Traffic Incidents & Camera Feed</p>
            <p>Map • Search • Details • Updates</p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>*Recommend Viewing on Desktop*</p>
          </div>
        </div>

        <div className="main-content">
          <div className="container">
            <div className="grid-2">
              <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: '1.5rem', background: '#f5f6f7', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600, color: '#004c8c', fontSize: '1.1rem' }}>🗺️ Calgary Traffic Map</div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.5rem' }}>Tap any red marker to fly to the location!</div>
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <Map3D incidents={incidents} selectedIncident={selectedIncident} onSelectIncident={handleSelectIncident} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">🚨 Incident Details</div>
                {!selectedIncident ? (
                  <div className="right-panel-empty">
                    <div>Click any map marker to see incident details</div>
                    <div className="badge" style={{ marginTop: "1rem" }}>Live updates every 30 seconds</div>
                  </div>
                ) : (
                  <div className="details">
                    <h2>{orNA(selectedIncident.roadway_name)}</h2>
                    <p style={{ marginBottom: "1.5rem", lineHeight: '1.6' }}>{orNA(selectedIncident.description)}</p>
                    
                    <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                      <p style={{ margin: "0 0 0.75rem 0", lineHeight: '1.5' }}><b>📅 When:</b> {formatTime(selectedIncident.start_dt)}</p>
                      <p style={{ margin: "0 0 0.75rem 0", lineHeight: '1.5' }}><b>🛣️ Lanes affected:</b> {orNA(selectedIncident.lanes_affected)}</p>
                      <DescriptionDropdown incident={selectedIncident} />
                    </div>

                    <div className="section-title">📹 Nearest Traffic Cameras</div>
                    <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#6c757d", margin: "0.75rem 0 1.25rem 0", lineHeight: '1.4' }}>Scroll and Click images to view them in full size!</p>

                    <div className="cam-grid">
                      {nearestCameras.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6c757d', fontSize: '1rem' }}>📷 No cameras available near this incident</div>
                      ) : (
                        nearestCameras.map((cam, idx) => (
                          <div key={idx} style={{ position: 'relative'}}>
                            <img src={cam.url} alt={cam.description} onClick={() => setShowImageModal(cam.url)} onError={e => e.target.style.display = 'none'} style={{ width: '100%', height: '60%' }} />
                            <div className="cam-distance">📍 {cam.distance_km ? cam.distance_km.toFixed(2) : 0} km away</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="search-list">
              <div className="search-bar">
                <input placeholder="🔍 Search incidents, locations, or descriptions..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ padding: '1.25rem', fontSize: '1.05rem' }} />
                <div className="badge" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>{filteredIncidents.length} incidents found</div>
              </div>

              <div className="item-list">
                {filteredIncidents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#6c757d' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1.25rem' }}>🔍</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>No incidents found</div>
                    <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>Try adjusting your search terms</div>
                  </div>
                ) : (
                  filteredIncidents.map(inc => (
                    <div key={inc.id} className="item" onClick={() => handlePickFromList(inc)} style={{ padding: '1.5rem' }}>
                      <div className="item-header">
                        <div className="item-title" style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>🚨 {orNA(inc.roadway_name)}</div>
                        <div className="badge time" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{formatTime(inc.start_dt)}</div>
                      </div>
                      <div className="item-description" style={{ fontSize: '1rem', lineHeight: '1.6', marginBottom: '1rem' }}>{orNA(inc.description)}</div>
                      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6c757d', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', lineHeight: '1.4' }}>
                        <span>🛣️ {orNA(inc.lanes_affected)}</span>
                        <span>🕐 Updated: {formatTime(inc.modified_dt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="modal" onClick={() => setShowModal(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px'}}>
              <div className="modal-header">
                <div className="modal-title" style={{ fontSize: '1.3rem' }}>🚨 {orNA(showModal.incident.roadway_name)}</div>
                <button className="close-btn" onClick={() => setShowModal(null)} style={{ padding: '0.75rem 1.25rem' }}>✕</button>
              </div>
              <div className="modal-content">
                <div className="inline-modal-content">
                  <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                    <p style={{ marginBottom: '1rem', lineHeight: '1.5' }}><b>📍 Description:</b> {orNA(showModal.incident.description)}</p>
                    <p style={{ marginBottom: '1rem', lineHeight: '1.5' }}><b>📅 When:</b> {formatTime(showModal.incident.start_dt)}</p>
                    <p style={{ marginBottom: '1rem', lineHeight: '1.5' }}><b>🛣️ Lanes affected:</b> {orNA(showModal.incident.lanes_affected)}</p>
                    <DescriptionDropdown incident={showModal.incident} />
                  </div>
                  
                  {showModal.cameras.length > 0 && (
                    <>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#004c8c', marginBottom: '1.25rem', textAlign: 'center' }}>📹 Nearby Traffic Cameras</div>
                      <p style={{ textAlign: "center", fontSize: "0.95rem", color: "#6c757d", marginBottom: "1.5rem", lineHeight: '1.4' }}>Scroll and Click images to enlarge!</p>
                    </>
                  )}
                </div>
                
                {showModal.cameras.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {showModal.cameras.map((cam, idx) => (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        <img src={cam.url} alt={cam.description} onClick={() => setShowImageModal(cam.url)} style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer', transition: 'transform 0.2s ease' }} onError={e => e.target.style.display = 'none'} />
                        <div style={{ marginTop: '0.75rem', fontSize: '1rem', fontWeight: 600, color: '#004c8c', padding: '0.5rem' }}>📍 ~{cam.distance_km ? cam.distance_km.toFixed(2) : 0} km away</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showModal.cameras.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6c757d', fontSize: '1.1rem' }}>📷 No cameras available near this incident</div>
                )}
              </div>
            </div>
          </div>
        )}

        {showImageModal && (
          <div className="modal" onClick={() => setShowImageModal(null)} style={{ alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.95)", padding: '1.5rem' }}>
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
              <button className="close-btn" onClick={() => setShowImageModal(null)} style={{ position: "absolute", top: "-70px", right: "0", zIndex: 10001, padding: '0.75rem 1.5rem', fontSize: '1rem' }}>✕ Close</button>
              <img src={showImageModal} alt="Traffic Camera" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "12px", display: 'block', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;