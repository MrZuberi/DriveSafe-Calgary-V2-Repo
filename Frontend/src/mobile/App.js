import { useEffect, useState, useRef } from "react";
import axios from "axios";
import './App.css'; 
import driveGif from "../drive.gif"; 
import image1 from "../image1.jpg"; 

const maplibregl = window.maplibregl;

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "https://drivesafecalgary-13a17c07f5d1.herokuapp.com";
const CALGARY_CENTER = [-114.0719, 51.0447];

const font = "'Nunito', sans-serif";

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

function FormattedDescription({ text }) {
  const safeText = orNA(text);
  if (safeText === "No Details") return <span>No Details</span>;
  
  const formatted = safeText
    .replace(/(Activities:|Speed Restriction:|Details:|Directions:)/gi, "\n$1")
    .split("\n")
    .filter(p => p.trim() !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {formatted.map((paragraph, idx) => (
        <div key={idx}>{paragraph.trim()}</div>
      ))}
    </div>
  );
}

function DescriptionDropdown({ incident }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "0.5rem 0", fontFamily: font }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#004c8c', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        Description {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '3px solid #dee2e6', lineHeight: '1.5' }}>
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}><FormattedDescription text={incident.details} /></p>
        </div>
      )}
    </div>
  );
}

function Map3D({ incidents, selectedIncident, onSelectIncident, onMapLoad }) {
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
      style: "https://tiles.openfreemap.org/styles/bright",
      center: CALGARY_CENTER,
      zoom: 10.0, 
      pitch: 45, 
      bearing: 0,
    });
    map.current = m;
    
    if (onMapLoad) {
      onMapLoad(m);
    }

    m.on("load", () => {
      m.resize();
      if (!m.getLayer("3d-buildings")) {
        try {
          const sources = m.getStyle().sources;
          const vectorSource = Object.keys(sources).find((k) => sources[k].type === "vector");
          if (vectorSource) {
            m.addLayer({
              id: "3d-buildings", source: vectorSource, "source-layer": "building", type: "fill-extrusion", minzoom: 13,
              paint: {
                "fill-extrusion-color": ["step", ["coalesce", ["get", "render_height"], 10], "#FFD1D1", 15, "#85B8F0", 50, "#B5D8FF"],
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.95,
              },
            });
          }
        } catch (e) { console.warn("3D buildings layer failed:", e); }
      }
    });

    m.on("error", (e) => console.warn("Map error:", e.error || e));

    return () => {
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      m.remove();
      map.current = null; 
      if (onMapLoad) {
        onMapLoad(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        width: "24px", height: "24px", backgroundColor: "#d64545",
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
      const expandedBounds = new maplibregl.LngLatBounds([sw.lng - 0.05, sw.lat - 0.05], [ne.lng + 0.05, ne.lat + 0.05]);
      map.current.fitBounds(expandedBounds, { padding: { top: 50, bottom: 50, left: 50, right: 50 }, pitch: 45, maxZoom: 10.0 });
      hasFitBounds.current = true; 
    }
  }, [incidents]);

  useEffect(() => {
    if (map.current && selectedIncident?.coordinates) {
      map.current.stop(); 
      map.current.flyTo({
        center: [selectedIncident.coordinates.lon, selectedIncident.coordinates.lat],
        zoom: 14, pitch: 60, bearing: -20, speed: 0.8, curve: 1.2, essential: true,
      });
    }
  }, [selectedIncident]);

  useEffect(() => {
    const handleZoomOut = () => {
      if (map.current) {
        map.current.easeTo({ zoom: 11.5, pitch: 45, duration: 1000 });
      }
    };
    window.addEventListener('zoomOutFromIncident', handleZoomOut);
    return () => window.removeEventListener('zoomOutFromIncident', handleZoomOut);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("map"); 
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [nearestCameras, setNearestCameras] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  
  // Toggle between Details and Cameras in the bottom sheet
  const [activeTab, setActiveTab] = useState("details"); 

  const [showImageModal, setShowImageModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef(null);

  const [listFilter, setListFilter] = useState("ALL");
  const [listSort, setListSort] = useState("newest");
  const [expandedCard, setExpandedCard] = useState(null);

  function loadIncidents() {
    axios.get(`${API_BASE_URL}/api/incidents?limit=500`).then(res => {
      if (res.data?.items) {
        const clean = res.data.items.filter(i => i.coordinates?.lat && i.coordinates?.lon);
        setIncidents(clean);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }

  useEffect(() => { loadIncidents(); const t = setInterval(loadIncidents, 30000); return () => clearInterval(t); }, []);

  function handleSelectIncident(incident) {
    setSelectedIncident(incident);
    setActiveCameraIndex(0);
    setNearestCameras([]);
    setActivePage("map"); 
    setActiveTab("details"); // Reset to details tab
    
    if (incident?.coordinates) {
      setIsLoadingCameras(true);
      axios.get(`${API_BASE_URL}/api/nearest-cameras`, { params: { lat: incident.coordinates.lat, lon: incident.coordinates.lon, limit: 4 } })
        .then(res => { 
          if (res.data) setNearestCameras(res.data.items); 
          setIsLoadingCameras(false);
        })
        .catch(() => {
          setNearestCameras([]);
          setIsLoadingCameras(false);
        });
    }
  }

  function handleExit() {
    setSelectedIncident(null);
    setNearestCameras([]);
    window.dispatchEvent(new Event('zoomOutFromIncident'));
  }

  const recentIncidents = incidents.slice(0, 5);

  let processedList = [...incidents];
  if (listFilter !== "ALL") {
    processedList = processedList.filter(i => 
      (i.description && i.description.toUpperCase().includes(listFilter)) || 
      (i.details && i.details.toUpperCase().includes(listFilter))
    );
  }
  processedList.sort((a, b) => {
    const dateA = new Date(a.start_dt || 0);
    const dateB = new Date(b.start_dt || 0);
    return listSort === "newest" ? dateB - dateA : dateA - dateB;
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', fontFamily: font, fontWeight: 800 }}>Loading traffic data....</div>;

  const filterBtn = (label) => (
    <button 
      onClick={() => setListFilter(label)}
      style={{ 
        background: listFilter === label ? "#222" : "#fff", 
        color: listFilter === label ? "#fff" : "#222", 
        border: "2px solid #222", borderRadius: "8px", padding: "4px 10px", 
        fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", fontFamily: font,
        boxShadow: "2px 2px 0px rgba(0,0,0,0.8)"
      }}
    >
      {label}
    </button>
  );

  const handleMake2D = () => {
    if (mapRef.current) {
      mapRef.current.stop(); 
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  };

  const handleResetView = () => {
    handleExit();
    if (mapRef.current) {
      mapRef.current.stop();
      mapRef.current.easeTo({
        center: CALGARY_CENTER,
        zoom: 10.0, 
        pitch: 45,
        bearing: 0,
        duration: 1000
      });
    }
  };

  const btnStyle = { background: "white", padding: "8px 12px", borderRadius: "8px", border: "2px solid #222", cursor: "pointer", fontWeight: 900, color: "#222", boxShadow: "2px 2px 0px rgba(0,0,0,0.8)", fontSize: "12px", zIndex: 50, fontFamily: font };
  const zoomBtnStyle = { background: "white", width: "40px", height: "40px", borderRadius: "8px", border: "2px solid #222", cursor: "pointer", fontWeight: 900, fontSize: "20px", color: "#222", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, fontFamily: font };

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden", position: "relative", fontFamily: font }}>
      
      {activePage === "map" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <Map3D 
            incidents={incidents} 
            selectedIncident={selectedIncident} 
            onSelectIncident={handleSelectIncident} 
            onMapLoad={(mapInstance) => { mapRef.current = mapInstance; }}
          />
        </div>
      )}

      {/* MAP CONTROLS (HIDE IF CARD IS OPEN) */}
      {activePage === "map" && !selectedIncident && (
        <>
          <div style={{ position: "absolute", bottom: "30px", left: "15px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10 }}>
            <button onClick={handleMake2D} style={btnStyle}>2D</button>
            <button onClick={handleResetView} style={btnStyle}>Reset</button>
          </div>

          <div style={{ position: "absolute", bottom: "30px", right: "15px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10 }}>
            <button onClick={() => mapRef.current?.zoomIn()} style={zoomBtnStyle}>+</button>
            <button onClick={() => mapRef.current?.zoomOut()} style={zoomBtnStyle}>-</button>
          </div>
        </>
      )}

      {/* LIST PAGE */}
      {activePage === "list" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1, overflowY: "auto" }}>
          <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${image1})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(6px)", zIndex: -1 }}></div>
          <div style={{ padding: "80px 15px 30px 15px", display: "flex", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ width: "100%", maxWidth: "800px" }}> 
              <div style={{ marginBottom: "20px" }}>
                <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "10px 0 15px 0", color: "#fff", letterSpacing: "-1px", textShadow: "2px 2px 0px #222, 4px 4px 0px rgba(0,0,0,0.5)" }}>Traffic Incidents</h1>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["ALL", "NE", "NW", "SE", "SW", "DOWNTOWN"].map(f => filterBtn(f))}
                  </div>
                  <button onClick={() => setListSort(prev => prev === "newest" ? "oldest" : "newest")} style={{ background: "#FFC107", border: "2px solid #222", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", boxShadow: "2px 2px 0px rgba(0,0,0,0.8)", color: "#222" }}>
                    Sort: {listSort === "newest" ? "Newest ↓" : "Oldest ↑"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {processedList.map((incident) => {
                  const isOpen = expandedCard === incident.id;
                  return (
                    <div key={incident.id} style={{ background: "white", border: "3px solid #222", borderRadius: "12px", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", overflow: "hidden", transition: "all 0.2s" }}>
                      <div onClick={() => setExpandedCard(isOpen ? null : incident.id)} style={{ padding: "12px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isOpen ? "#f8f9fa" : "white" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "35px", height: "35px", background: "#FDF2C0", border: "2px solid #222", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🚗</div>
                          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#222", lineHeight: 1.2 }}>{orNA(incident.roadway_name)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#222" }}>{formatTime(incident.start_dt)}</div>
                          <div style={{ fontSize: "1rem", color: "#222", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</div>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 15px 15px 15px", background: "#f8f9fa", borderTop: "2px dashed #ccc" }}>
                          <div style={{ marginTop: "10px", fontSize: "0.9rem", fontWeight: 700, color: "#444", lineHeight: 1.4, marginBottom: "10px" }}>
                            <FormattedDescription text={incident.description} />
                          </div>
                          <div style={{ background: "white", padding: "10px", borderRadius: "8px", border: "2px solid #ddd" }}>
                            <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", fontWeight: 800 }}><b>Lanes Affected:</b> {orNA(incident.lanes_affected)}</p>
                            <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", fontWeight: 800 }}><b>Details:</b> {orNA(incident.details)}</p>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800 }}><b>Last Updated:</b> {formatDateTime(incident.modified_dt)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {processedList.length === 0 && <div style={{ textAlign: "center", fontWeight: 800, fontSize: "1.2rem", marginTop: "40px", color: "#fff", textShadow: "1px 1px 2px #000" }}>No incidents found for this filter.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT PAGE */}
      {activePage === "about" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1, overflowY: "auto" }}>
          <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${image1})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(6px)", zIndex: -1 }}></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
            <div style={{ background: "white", borderRadius: "16px", padding: "25px", maxWidth: "800px", width: "100%", border: "3px solid #222", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1.1, margin: "0 0 15px 0", color: "#222" }}>About DriveSafe Calgary.</h1>
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#444", lineHeight: "1.5", marginBottom: "15px" }}>
                DriveSafe Calgary is an application made by <a href="https://tahazuberi.vercel.app/" target="_blank" rel="noreferrer" style={{ color: "#004c8c", textDecoration: "underline" }}>Taha Zuberi</a>. 
                It is a public, free tool built for Calgary residents to get real-time traffic incidents and live camera feeds. 
                The goal is to keep the community informed and safe on the roads.
              </p>
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#444", lineHeight: "1.5", marginBottom: "20px" }}>If you have any questions or concerns, please email below:</p>
              <a href="mailto:taha.zuberi@ucalgary.ca" style={{ display: "inline-flex", alignItems: "center", background: "#f8f9fa", border: "2px solid #222", borderRadius: "10px", padding: "10px 15px", color: "#222", fontWeight: 900, fontSize: "0.95rem", textDecoration: "none", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)", transition: "transform 0.1s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <span style={{ fontSize: "1rem", marginRight: "8px" }}>✉️</span> taha.zuberi@ucalgary.ca
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{ position: "absolute", top: "15px", left: "15px", zIndex: 10, background: "#22335C", border: "2px solid #fff", borderRadius: "12px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)", cursor: "pointer" }} onClick={() => setActivePage("map")}>
        <img src={driveGif} alt="Drive Animation" style={{ height: "30px", borderRadius: "6px", border: "2px solid #fff" }} />
        <div>
          <h1 style={{ fontSize: "1rem", margin: 0, fontWeight: 900, letterSpacing: "-0.5px", color: "#fff" }}>DriveSafe</h1>
          <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, color: "#E0E6ED" }}>Calgary</p>
        </div>
      </div>

      <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 10, background: "white", border: "2px solid #222", borderRadius: "16px", padding: "6px 15px", display: "flex", gap: "15px", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)" }}>
        <span onClick={() => setActivePage("map")} style={{ fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", color: "#222", opacity: activePage === "map" ? 1 : 0.5 }}>MAP</span>
        <span onClick={() => setActivePage("list")} style={{ fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", color: "#222", opacity: activePage === "list" ? 1 : 0.5 }}>LIST</span>
        <span onClick={() => setActivePage("about")} style={{ fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", color: "#222", opacity: activePage === "about" ? 1 : 0.5 }}>ABOUT</span>
      </div>

      {/* LATEST INCIDENTS HORIZONTAL SCROLLER */}
      {activePage === "map" && !selectedIncident && (
        <div style={{ position: "absolute", top: "80px", left: "0", right: "0", zIndex: 10, padding: "0 15px", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", paddingLeft: "5px" }}>
            <span style={{ fontSize: "1rem" }}>📍</span>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: "0.8rem", color: "#fff", letterSpacing: "1px", textShadow: "1px 1px 2px #000" }}>LATEST INCIDENTS</h3>
          </div>
          
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px", pointerEvents: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {recentIncidents.map((inc, i) => (
              <div key={inc.id} onClick={() => handleSelectIncident(inc)} style={{ minWidth: "160px", background: "#F9F6EE", border: "2px solid #222", borderRadius: "12px", padding: "10px", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#aaa" }}>0{i + 1}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#aaa" }}>{formatTime(inc.start_dt)}</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orNA(inc.roadway_name)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SWIPEABLE BOTTOM SHEET OVERLAYS */}
      {activePage === "map" && selectedIncident && (
        <>
          <button onClick={handleExit} style={{ position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "8px 16px", borderRadius: "20px", background: "#d64545", color: "white", border: "2px solid #222", fontSize: "0.9rem", fontWeight: 900, cursor: "pointer", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)", fontFamily: font }}>
            ✕ EXIT
          </button>

          <div style={{ 
            position: "absolute", 
            bottom: 0, 
            left: 0, 
            right: 0, 
            background: "white", 
            borderTopLeftRadius: "24px", 
            borderTopRightRadius: "24px", 
            borderTop: "4px solid #222", 
            boxShadow: "0 -10px 30px rgba(0,0,0,0.5)", 
            zIndex: 1000,
            maxHeight: "60vh",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* TABS HEADER */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "10px" }}>
              <div style={{ width: "40px", height: "5px", background: "#ccc", borderRadius: "3px" }}></div>
            </div>

            <div style={{ padding: "15px 15px 10px 15px", display: "flex", gap: "10px", borderBottom: "2px dashed #eee" }}>
               <button onClick={() => setActiveTab("details")} style={{ flex: 1, padding: "10px", fontWeight: 900, fontSize: "1rem", borderRadius: "10px", border: "3px solid #222", background: activeTab === "details" ? "#222" : "white", color: activeTab === "details" ? "white" : "#222", cursor: "pointer", boxShadow: "2px 2px 0px rgba(0,0,0,0.8)" }}>DETAILS</button>
               <button onClick={() => setActiveTab("cameras")} style={{ flex: 1, padding: "10px", fontWeight: 900, fontSize: "1rem", borderRadius: "10px", border: "3px solid #222", background: activeTab === "cameras" ? "#222" : "white", color: activeTab === "cameras" ? "white" : "#222", cursor: "pointer", boxShadow: "2px 2px 0px rgba(0,0,0,0.8)" }}>CAMERAS</button>
            </div>

            <div style={{ padding: "15px", overflowY: "auto" }}>
              {activeTab === "details" && (
                <>
                  <h2 style={{ margin: "0 0 10px 0", color: "#d64545", fontSize: "1.2rem", fontWeight: 900 }}>{orNA(selectedIncident.roadway_name)}</h2>
                  <div style={{ fontSize: "0.95rem", marginBottom: "15px", lineHeight: "1.4", fontWeight: 700, color: "#333", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <FormattedDescription text={selectedIncident.description} />
                  </div>
                  <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px", marginBottom: "15px", border: "2px solid #ddd" }}>
                    <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 800 }}><b>When:</b> {formatTime(selectedIncident.start_dt)}</p>
                    <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 800 }}><b>Lanes:</b> {orNA(selectedIncident.lanes_affected)}</p>
                    <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 800 }}><b>Last updated:</b> {formatDateTime(selectedIncident.modified_dt)}</p>
                    <DescriptionDropdown incident={selectedIncident} />
                  </div>
                </>
              )}

              {activeTab === "cameras" && (
                <>
                  <h2 style={{ margin: "0 0 10px 0", color: "#004c8c", fontSize: "1.2rem", fontWeight: 900 }}>Nearby Cameras</h2>
                  {isLoadingCameras ? (
                    <div style={{ width: "100%", height: "180px", background: "#eee", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #222", marginBottom: "1rem" }}>
                      <span style={{ fontWeight: 800, color: "#666" }}>Loading cameras...</span>
                    </div>
                  ) : nearestCameras.length > 0 ? (
                    <>
                      <div style={{ width: "100%", height: "200px", background: "#eee", borderRadius: "10px", overflow: "hidden", position: "relative", marginBottom: "15px", border: "2px solid #222" }}>
                        <img src={nearestCameras[activeCameraIndex].url} alt="Traffic Camera" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => e.target.src = "https://via.placeholder.com/400x200?text=Camera+Offline"} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button onClick={() => setActiveCameraIndex((prev) => prev > 0 ? prev - 1 : nearestCameras.length - 1)} style={{ background: "#FFC107", color: "#222", border: "2px solid #222", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "1.2rem", fontWeight: 900, boxShadow: "2px 2px 0px rgba(0,0,0,0.8)" }}>&lt;</button>
                        <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#222" }}>📍 ~{nearestCameras[activeCameraIndex].distance_km.toFixed(2)} km</div>
                        <button onClick={() => setActiveCameraIndex((prev) => prev < nearestCameras.length - 1 ? prev + 1 : 0)} style={{ background: "#FFC107", color: "#222", border: "2px solid #222", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "1.2rem", fontWeight: 900, boxShadow: "2px 2px 0px rgba(0,0,0,0.8)" }}>&gt;</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ width: "100%", height: "180px", background: "#eee", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #222", marginBottom: "1rem" }}>
                      <span style={{ fontWeight: 800, color: "#666" }}>No cameras available</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showImageModal && (
        <div className="modal" onClick={() => setShowImageModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <img src={showImageModal} alt="camera" style={{ maxWidth: "95vw", maxHeight: "95vh", borderRadius: "12px", border: "4px solid #222" }} onClick={e => e.stopPropagation()} />
          <button className="close-btn" onClick={() => setShowImageModal(null)} style={{ position: "absolute", top: "1rem", right: "1rem", padding: "8px 16px", background: "white", border: "2px solid #222", borderRadius: "8px", cursor: "pointer", fontWeight: 900, fontSize: "1rem", boxShadow: "3px 3px 0px rgba(0,0,0,0.8)", fontFamily: font }}>Close</button>
        </div>
      )}
    </div>
  );
}

export default App;