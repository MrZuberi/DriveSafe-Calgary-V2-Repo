import { useEffect, useState, useRef } from "react";
import axios from "axios";
import './App.css';
import './mobiles.css'; 
import driveGif from "./drive.gif";
import image1 from "./image1.jpg"; 

const maplibregl = window.maplibregl;

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "https://drivesafecalgary-13a17c07f5d1.herokuapp.com";
const CALGARY_CENTER = [-114.0719, 51.0447];

const font = "'Nunito', sans-serif";
const cloudBackground = "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2000&auto=format&fit=crop";

// The Esri Satellite Style URL
const ESRI_SATELLITE_STYLE = "https://tiles.arcgis.com/tiles/xxxx/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"; 
const ESRI_OFFICIAL_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"; 

// --- COOLICONS VECTOR SVGs ---
const IconMapPin = ({ size = 20, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M12 21C12 21 19 15.5 19 10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10C5 15.5 12 21 12 21Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconVideo = ({ size = 20, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M15 10L19.553 7.724C20.217 7.392 21 7.875 21 8.618V15.382C21 16.125 20.217 16.608 19.553 16.276L15 14V10Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="3" y="6" width="12" height="12" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevronDown = ({ size = 20, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M6 9L12 15L18 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlus = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconMinus = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconArrowRight = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
// -----------------------------

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
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {formatted.map((paragraph, idx) => {
        const match = paragraph.trim().match(/^(Activities:|Speed Restriction:|Details:|Directions:)(.*)/i);
        
        if (match) {
          return (
            <div key={idx} style={{ fontWeight: 600 }}>
              <strong style={{ fontWeight: 900 }}>{match[1]}</strong>{match[2]}
            </div>
          );
        }
        
        return (
          <div key={idx} style={{ fontWeight: 600 }}>
            {paragraph.trim()}
          </div>
        );
      })}
    </div>
  );
}

function DescriptionDropdown({ incident }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "0.5rem 0", fontFamily: font }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#004c8c', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: "all 0.2s ease-in-out" }}>
        Description <IconChevronDown size={16} color="#004c8c" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease-in-out' }} />
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

    // Using the ESRI Official Satellite Style URL
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json", // Fallback, but we will try to use the satellite style
      center: CALGARY_CENTER,
      zoom: 10.0, 
      pitch: 45, 
      bearing: 0,
    });
    map.current = m;
    
    if (onMapLoad) {
      onMapLoad(m);
    }

    // Attempt to set the satellite style (this is the public Esri World Imagery style)
    m.on("load", () => {
      m.resize();
      m.setStyle("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}");
      
      // 3D buildings commented out because satellite imagery looks better flat
      /*
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
      */
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
      
      // Custom Red Teardrop Marker
      const el = document.createElement("div");
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor: pointer; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.5));">
          <path d="M12 2C7.58172 2 4 5.58172 4 10C4 16 12 22 12 22C12 22 20 16 20 10C20 5.58172 16.4183 2 12 2Z" fill="#d64545"/>
          <circle cx="12" cy="10" r="4" fill="white"/>
        </svg>
      `;
      
      el.addEventListener("click", () => onSelectRef.current({ ...incident }));
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
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
      // Smooth Fly To animation
      map.current.flyTo({
        center: [selectedIncident.coordinates.lon, selectedIncident.coordinates.lat],
        zoom: 15, 
        pitch: 60, 
        bearing: -20, 
        speed: 1.2, 
        curve: 1.5,
        essential: true
      });
    }
  }, [selectedIncident]);

  useEffect(() => {
    const handleZoomOut = () => {
      if (map.current) {
        // Smooth Fly Out animation
        map.current.flyTo({ 
          center: CALGARY_CENTER,
          zoom: 10.0, 
          pitch: 45, 
          bearing: 0,
          speed: 1.2,
          curve: 1.5,
          essential: true
        });
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
  
  const [showCameraCard, setShowCameraCard] = useState(true);
  const [showDetailsCard, setShowDetailsCard] = useState(true);

  const [showImageModal, setShowImageModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef(null);

  const [listFilter, setListFilter] = useState("ALL");
  const [expandedCard, setExpandedCard] = useState(null);

  function loadIncidents() {
    axios.get(`${API_BASE_URL}/api/incidents?limit=100`).then(res => {
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
    
    setShowCameraCard(true);
    setShowDetailsCard(true);
    
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
    return dateB - dateA;
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', fontFamily: font, fontWeight: 800 }}>Loading traffic data....</div>;

  const filterBtn = (label) => {
    const isActive = listFilter === label;
    return (
      <button 
        onClick={() => setListFilter(label)}
        style={{ 
          background: isActive ? "#d64545" : "white", 
          color: isActive ? "white" : "#555", 
          border: "3px solid #222", 
          borderRadius: "20px", 
          padding: "6px 18px", 
          fontWeight: 800, 
          fontSize: "0.85rem", 
          cursor: "pointer", 
          fontFamily: font,
          transition: "all 0.2s ease-in-out",
          boxShadow: "4px 4px 0px rgba(0,0,0,0.8)",
          transform: isActive ? "translateY(2px)" : "translateY(0px)"
        }}
      >
        {label}
      </button>
    );
  };

  // Map Controls
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

  const btnStyle = { 
    background: "white", padding: "10px 16px", borderRadius: "8px", border: "3px solid #222", 
    cursor: "pointer", fontWeight: 900, color: "#222", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", 
    fontSize: "14px", zIndex: 50, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s ease-in-out"
  };
  
  const zoomBtnStyle = { 
    background: "white", width: "50px", height: "50px", borderRadius: "10px", border: "3px solid #222", 
    cursor: "pointer", fontWeight: 900, color: "#222", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", 
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, fontFamily: font,
    transition: "all 0.2s ease-in-out"
  };
  
  const closeBtnStyle = { 
    background: "transparent", 
    border: "none", 
    fontSize: "1.2rem", 
    cursor: "pointer", 
    fontWeight: 900, 
    color: "#d64545", 
    padding: "0 5px",
    transition: "all 0.2s ease-in-out"
  };

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

      {/* BOTTOM LEFT MAP CONTROLS */}
      {activePage === "map" && (
        <div style={{ position: "absolute", bottom: "30px", left: "30px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10 }}>
          <button onClick={handleMake2D} style={btnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>Make 2D</button>
          <button onClick={handleResetView} style={btnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>Reset View</button>
        </div>
      )}

      {/* BOTTOM RIGHT ZOOM CONTROLS */}
      {activePage === "map" && (
        <div style={{ position: "absolute", bottom: "30px", right: "30px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10 }}>
          <button onClick={() => mapRef.current?.zoomIn()} style={zoomBtnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}><IconPlus size={20} color="#222" /></button>
          <button onClick={() => mapRef.current?.zoomOut()} style={zoomBtnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}><IconMinus size={20} color="#222" /></button>
        </div>
      )}

      {/* LIST PAGE (CLOUD BACKGROUND & CLAY STYLE) */}
      {activePage === "list" && (
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          zIndex: 1, 
          overflowY: "auto", 
          backgroundImage: `url(${cloudBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        }}>
          
          <div style={{ padding: "140px 40px 60px 40px", maxWidth: "900px", margin: "0 auto" }}>
            
            <div style={{ marginBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "0 0 20px 0", color: "#1a202c", letterSpacing: "-0.5px", textTransform: "uppercase", textShadow: "0 2px 4px rgba(255,255,255,0.8)" }}>
                Traffic Incidents
              </h1>
              
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {["ALL", "SW", "SE", "DOWNTOWN", "NW", "NE"].map(f => filterBtn(f))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {processedList.map((incident) => {
                const isOpen = expandedCard === incident.id;
                return (
                  <div 
                    key={incident.id} 
                    style={{ 
                      background: "rgba(255, 255, 255, 0.95)", 
                      backdropFilter: "blur(10px)", 
                      borderRadius: "16px", 
                      overflow: "hidden", 
                      transition: "transform 0.2s ease-in-out", 
                      border: "3px solid #222", 
                      boxShadow: "6px 6px 0px rgba(0,0,0,0.8)"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    
                    <div 
                      onClick={() => setExpandedCard(isOpen ? null : incident.id)} 
                      style={{ 
                        padding: "20px 24px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        cursor: "pointer",
                        transition: "background 0.2s ease-in-out"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#222", marginBottom: "6px" }}>
                          {orNA(incident.roadway_name)}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#4a5568", fontWeight: 700, fontFamily: font }}>
                          {formatDateTime(incident.start_dt)}
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleSelectIncident(incident);
                          }}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "#edf2f7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            border: "2px solid #cbd5e0",
                            transition: "all 0.2s ease-in-out"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.transform = "scale(1.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#edf2f7"; e.currentTarget.style.transform = "scale(1)"; }}
                          title="View on Map"
                        >
                          <IconMapPin size={18} color="#d64545" />
                        </div>

                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#d64545",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s ease-in-out",
                          cursor: "pointer"
                        }}>
                          <IconChevronDown 
                            size={18} 
                            color="white" 
                            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease-in-out" }} 
                          />
                        </div>
                      </div>
                    </div>
                    
                    {isOpen && (
                      <div style={{ padding: "0 24px 24px 24px", animation: "fadeIn 0.3s ease-in-out", fontFamily: font }}>
                        
                         <div style={{ marginBottom: "20px", fontSize: "0.95rem", color: "#2d3748", lineHeight: "1.6" }}>
                            <FormattedDescription text={incident.description} />
                         </div>

                         <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "1fr 1fr", 
                            gap: "16px", 
                            background: "#f7fafc", 
                            padding: "16px", 
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            marginBottom: "20px"
                         }}>
                            <div>
                              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#718096", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>LANES</div>
                              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748" }}>{orNA(incident.lanes_affected)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#718096", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>LAST UPDATED</div>
                              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748" }}>{formatDateTime(incident.modified_dt)}</div>
                            </div>
                         </div>

                         <div style={{ paddingTop: "16px", borderTop: "2px dashed #cbd5e0" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#718096", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>DETAILS</div>
                            <div style={{ fontSize: "0.95rem", color: "#4a5568", lineHeight: "1.6" }}>{orNA(incident.details)}</div>
                         </div>

                      </div>
                    )}
                  </div>
                );
              })}
              {processedList.length === 0 && (
                <div style={{ textAlign: "center", fontWeight: 800, fontSize: "1.2rem", marginTop: "40px", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                  No incidents found for this filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePage === "about" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1, overflowY: "auto" }}>
          <div style={{ position: "fixed", inset: 0, backgroundImage: `url(${image1})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(6px)", zIndex: -1 }}></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" }}>
            <div style={{ background: "white", borderRadius: "24px", padding: "40px", maxWidth: "800px", width: "100%", border: "4px solid #222", boxShadow: "8px 8px 0px rgba(0,0,0,0.8)", transition: "transform 0.2s ease-in-out" }}>
              <h1 style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1.1, margin: "0 0 20px 0", color: "#222" }}>About DriveSafe Calgary.</h1>
              <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#444", lineHeight: "1.6", marginBottom: "20px" }}>
                DriveSafe Calgary is an application made by <a href="https://tahazuberi.vercel.app/" target="_blank" rel="noreferrer" style={{ color: "#004c8c", textDecoration: "underline" }}>Taha Zuberi</a>. 
                It is a public, free tool built for Calgary residents to get real-time traffic incidents and live camera feeds. 
                The goal is to keep the community informed and safe on the roads.
              </p>
              <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#444", lineHeight: "1.6", marginBottom: "30px" }}>If you have any questions or concerns, please email below:</p>
              <a href="mailto:taha.zuberi@ucalgary.ca" style={{ display: "inline-flex", alignItems: "center", background: "#f8f9fa", border: "3px solid #222", borderRadius: "12px", padding: "12px 24px", color: "#222", fontWeight: 900, fontSize: "1.1rem", textDecoration: "none", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <IconArrowRight size={20} color="#004c8c" style={{ marginRight: "10px" }} /> taha.zuberi@ucalgary.ca
              </a>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "fixed", top: "20px", left: "20px", zIndex: 10, background: "#22335C", border: "3px solid #fff", borderRadius: "16px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", cursor: "pointer", transition: "transform 0.2s ease-in-out" }} onClick={() => setActivePage("map")} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
        <img src={driveGif} alt="Drive Animation" style={{ height: "50px", borderRadius: "10px", border: "2px solid #fff" }} />
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 900, letterSpacing: "-0.5px", color: "#fff" }}>DriveSafe Calgary</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#E0E6ED" }}>Live Traffic Incidents</p>
        </div>
      </div>

      <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "white", border: "3px solid #222", borderRadius: "20px", padding: "8px 30px", display: "flex", gap: "30px", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)" }}>
        <span onClick={() => setActivePage("map")} style={{ fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", color: "#222", opacity: activePage === "map" ? 1 : 0.5, transition: "all 0.2s ease-in-out" }}>MAP</span>
        <span onClick={() => setActivePage("list")} style={{ fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", color: "#222", opacity: activePage === "list" ? 1 : 0.5, transition: "all 0.2s ease-in-out" }}>LIST</span>
        <span onClick={() => setActivePage("about")} style={{ fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", color: "#222", opacity: activePage === "about" ? 1 : 0.5, transition: "all 0.2s ease-in-out" }}>ABOUT</span>
      </div>

      {activePage === "map" && !selectedIncident && (
        <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10, background: "#F9F6EE", border: "3px solid #222", borderRadius: "16px", padding: "16px", width: "300px", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingLeft: "8px" }}>
            <IconMapPin size={18} color="#555" />
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: "0.9rem", color: "#555", letterSpacing: "1px" }}>LATEST INCIDENTS</h3>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {recentIncidents.map((inc, i) => (
              <div key={inc.id} onClick={() => handleSelectIncident(inc)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#222"; e.currentTarget.querySelector('.num').style.color = "#aaa"; e.currentTarget.querySelector('.title').style.color = "#fff"; e.currentTarget.querySelector('.time').style.color = "#aaa"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector('.num').style.color = "#aaa"; e.currentTarget.querySelector('.title').style.color = "#222"; e.currentTarget.querySelector('.time').style.color = "#aaa"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="num" style={{ fontSize: "0.85rem", fontWeight: 800, color: "#aaa" }}>0{i + 1}</span>
                  <span className="title" style={{ fontWeight: 900, fontSize: "1.05rem", color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>{orNA(inc.roadway_name)}</span>
                </div>
                <div className="time" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#aaa" }}>{formatTime(inc.start_dt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePage === "map" && selectedIncident && (
        <>
          <button onClick={handleExit} style={{ position: "absolute", top: "100px", left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 24px", borderRadius: "25px", background: "#d64545", color: "white", border: "3px solid #222", fontSize: "1.1rem", fontWeight: 900, cursor: "pointer", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", fontFamily: font, transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translate(-50%, -2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translate(-50%, 0)"}>
            ✕ EXIT
          </button>

          {showCameraCard && (
            <div style={{ position: "absolute", top: "25vh", left: "8%", width: "420px", background: "white", padding: "1rem", borderRadius: "16px", border: "3px solid #222", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)", zIndex: 100, maxHeight: "60vh", overflowY: "auto", animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, color: "#222", textAlign: "center", fontSize: "1.1rem", fontWeight: 900, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <IconVideo size={20} color="#222" /> Cameras
                </h3>
                <button onClick={() => setShowCameraCard(false)} style={closeBtnStyle} onMouseEnter={(e) => e.currentTarget.style.color = "#ff0000"} onMouseLeave={(e) => e.currentTarget.style.color = "#d64545"}>✕</button>
              </div>
              
              {isLoadingCameras ? (
                <div style={{ width: "100%", height: "220px", background: "#eee", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #222", marginBottom: "1rem" }}>
                  <span style={{ fontWeight: 800, color: "#666" }}>Loading cameras...</span>
                </div>
              ) : nearestCameras.length > 0 ? (
                <>
                  <div style={{ width: "100%", height: "220px", background: "#eee", borderRadius: "10px", overflow: "hidden", position: "relative", marginBottom: "1rem", border: "2px solid #222" }}>
                    <img src={nearestCameras[activeCameraIndex].url} alt="Traffic Camera" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"} onError={(e) => e.target.src = "https://via.placeholder.com/400x220?text=Camera+Offline"} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => setActiveCameraIndex((prev) => prev > 0 ? prev - 1 : nearestCameras.length - 1)} style={{ background: "#FFC107", color: "#222", border: "2px solid #222", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", fontWeight: 900, boxShadow: "2px 2px 0px rgba(0,0,0,0.8)", transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>&lt;</button>
                    <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#222", display: "flex", alignItems: "center", gap: "4px" }}>
                      <IconMapPin size={16} color="#d64545" /> ~{nearestCameras[activeCameraIndex].distance_km.toFixed(2)} km
                    </div>
                    <button onClick={() => setActiveCameraIndex((prev) => prev < nearestCameras.length - 1 ? prev + 1 : 0)} style={{ background: "#FFC107", color: "#222", border: "2px solid #222", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", fontWeight: 900, boxShadow: "2px 2px 0px rgba(0,0,0,0.8)", transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>&gt;</button>
                  </div>
                </>
              ) : (
                <div style={{ width: "100%", height: "220px", background: "#eee", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #222", marginBottom: "1rem" }}>
                  <span style={{ fontWeight: 800, color: "#666" }}>No cameras available</span>
                </div>
              )}
            </div>
          )}

          {showDetailsCard && (
            <div style={{ position: "absolute", top: "25vh", right: "8%", width: "420px", background: "white", padding: "1.5rem", borderRadius: "16px", border: "3px solid #222", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)", zIndex: 100, maxHeight: "60vh", overflowY: "auto", animation: "fadeIn 0.3s ease-in-out" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <h2 style={{ margin: 0, color: "#d64545", fontSize: "1.4rem", fontWeight: 900 }}>{orNA(selectedIncident.roadway_name)}</h2>
                <button onClick={() => setShowDetailsCard(false)} style={closeBtnStyle} onMouseEnter={(e) => e.currentTarget.style.color = "#ff0000"} onMouseLeave={(e) => e.currentTarget.style.color = "#d64545"}>✕</button>
              </div>
              
              <div style={{ fontSize: "0.95rem", marginBottom: "1rem", lineHeight: "1.4", fontWeight: 700, color: "#333", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <FormattedDescription text={selectedIncident.description} />
              </div>
              
              <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "10px", marginBottom: "0.5rem", border: "2px solid #ddd" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 800 }}><b>When:</b> {formatTime(selectedIncident.start_dt)}</p>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 800 }}><b>Lanes:</b> {orNA(selectedIncident.lanes_affected)}</p>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 800 }}><b>Last updated:</b> {formatDateTime(selectedIncident.modified_dt)}</p>
                <DescriptionDropdown incident={selectedIncident} />
              </div>
            </div>
          )}
        </>
      )}

      {showImageModal && (
        <div className="modal" onClick={() => setShowImageModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, animation: "fadeIn 0.3s ease-in-out" }}>
          <img src={showImageModal} alt="camera" style={{ maxWidth: "95vw", maxHeight: "95vh", borderRadius: "12px", border: "4px solid #222", transform: "scale(0.95)", transition: "transform 0.3s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(0.95)"} onClick={e => e.stopPropagation()} />
          <button className="close-btn" onClick={() => setShowImageModal(null)} style={{ position: "absolute", top: "2rem", right: "2rem", padding: "12px 24px", background: "white", border: "3px solid #222", borderRadius: "10px", cursor: "pointer", fontWeight: 900, fontSize: "1.1rem", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", fontFamily: font, transition: "all 0.2s ease-in-out" }}>Close</button>
        </div>
      )}
    </div>
  );
}

export default App;