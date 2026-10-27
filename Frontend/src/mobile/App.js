import { useEffect, useState, useRef } from "react";
import axios from "axios";
import './App.css'; 
import driveGif from "../drive.gif"; 

const maplibregl = window.maplibregl;

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "https://drivesafecalgary-13a17c07f5d1.herokuapp.com";
const CALGARY_CENTER = [-114.0719, 51.0447];

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Nunito', system-ui, sans-serif";

const COLORS = {
  red: "#d64545",
  blue: "#007AFF",
  text: "#1c1c1e",
  sub: "#6e6e73",
  line: "rgba(60,60,67,0.18)",
  fill: "rgba(118,118,128,0.12)",
};

const GLASS = {
  background: "rgba(255,255,255,0.86)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
};

const GLOBAL_CSS = `
  .ds-press { transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease; -webkit-tap-highlight-color: transparent; }
  .ds-press:active { transform: scale(0.94); }
  .ds-row { -webkit-tap-highlight-color: transparent; transition: background 0.15s ease; }
  .ds-row:active { background: rgba(0,0,0,0.06); }
  .ds-scroll::-webkit-scrollbar { display: none; }
  .ds-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  @keyframes ds-spin { to { transform: rotate(360deg); } }
  @keyframes ds-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  button { font-family: inherit; }
`;

// ---------- ICONS ----------
const Svg = ({ size = 20, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>{children}</svg>
);
const sp = { strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const IconSearch = ({ size = 20, color = "currentColor" }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="6.5" stroke={color} {...sp} />
    <path d="M16 16L20 20" stroke={color} {...sp} />
  </Svg>
);
const IconInfo = ({ size = 20, color = "currentColor" }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" stroke={color} {...sp} />
    <path d="M12 11V16" stroke={color} {...sp} />
    <circle cx="12" cy="8" r="0.6" fill={color} stroke={color} strokeWidth="1" />
  </Svg>
);
const IconClose = ({ size = 18, color = "currentColor" }) => (
  <Svg size={size}><path d="M6 6L18 18M18 6L6 18" stroke={color} {...sp} /></Svg>
);
const IconReset = ({ size = 20, color = "currentColor" }) => (
  <Svg size={size}>
    <path d="M4 12A8 8 0 1 0 6.3 6.3" stroke={color} {...sp} />
    <path d="M4 4V8.5H8.5" stroke={color} {...sp} />
  </Svg>
);
const IconChevronRight = ({ size = 16, color = "currentColor" }) => (
  <Svg size={size}><path d="M9 6L15 12L9 18" stroke={color} {...sp} /></Svg>
);
const IconChevronLeft = ({ size = 18, color = "currentColor" }) => (
  <Svg size={size}><path d="M15 6L9 12L15 18" stroke={color} {...sp} /></Svg>
);
const IconCar = ({ size = 18, color = "currentColor" }) => (
  <Svg size={size}>
    <path d="M5 16V11L7 6H17L19 11V16" stroke={color} {...sp} />
    <rect x="3" y="11" width="18" height="6" rx="2" stroke={color} {...sp} />
    <circle cx="7.5" cy="14" r="0.6" fill={color} stroke={color} strokeWidth="1" />
    <circle cx="16.5" cy="14" r="0.6" fill={color} stroke={color} strokeWidth="1" />
  </Svg>
);

// ---------- HELPERS ----------
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

function timeAgo(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
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
            <div key={idx}>
              <strong style={{ fontWeight: 700 }}>{match[1]}</strong>{match[2]}
            </div>
          );
        }
        return <div key={idx}>{paragraph.trim()}</div>;
      })}
    </div>
  );
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return vp;
}

// ---------- MAP ----------
function Map3D({ incidents, selectedIncident, onSelectIncident, onMapLoad, paddingRef }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const markerEls = useRef({});
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
      attributionControl: { compact: true },
    });
    map.current = m;
    if (onMapLoad) onMapLoad(m);

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
      if (onMapLoad) onMapLoad(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    markerEls.current = {};

    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    incidents.forEach((incident) => {
      if (!incident.coordinates) return;
      hasPoints = true;
      bounds.extend([incident.coordinates.lon, incident.coordinates.lat]);

      const el = document.createElement("div");
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.display = "flex";
      el.style.alignItems = "flex-end";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; transform-origin: 50% 100%; transition: transform 0.25s ease; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));">
          <path d="M12 2C7.58 2 4 5.58 4 10C4 16 12 22 12 22C12 22 20 16 20 10C20 5.58 16.42 2 12 2Z" fill="#d64545"/>
          <circle cx="12" cy="10" r="4" fill="white"/>
        </svg>
      `;
      el.addEventListener("click", (e) => { e.stopPropagation(); onSelectRef.current({ ...incident }); });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([incident.coordinates.lon, incident.coordinates.lat])
        .addTo(map.current);
      markers.current.push(marker);
      markerEls.current[incident.id] = el;
    });

    if (!hasFitBounds.current && hasPoints && !bounds.isEmpty()) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const expandedBounds = new maplibregl.LngLatBounds([sw.lng - 0.05, sw.lat - 0.05], [ne.lng + 0.05, ne.lat + 0.05]);
      map.current.fitBounds(expandedBounds, { padding: { top: 60, bottom: 60, left: 30, right: 30 }, pitch: 45, maxZoom: 10.0 });
      hasFitBounds.current = true;
    }
  }, [incidents]);

  // Highlight selected marker
  useEffect(() => {
    Object.entries(markerEls.current).forEach(([id, el]) => {
      const svg = el.firstElementChild;
      if (svg) svg.style.transform = selectedIncident && String(selectedIncident.id) === String(id) ? "scale(1.3)" : "scale(1)";
    });
  }, [selectedIncident, incidents]);

  // Fly to selected incident (offset so it sits above the sheet)
  useEffect(() => {
    if (map.current && selectedIncident?.coordinates) {
      map.current.stop();
      map.current.flyTo({
        center: [selectedIncident.coordinates.lon, selectedIncident.coordinates.lat],
        zoom: 15,
        pitch: 55,
        bearing: -20,
        speed: 1.2,
        curve: 1.4,
        padding: paddingRef.current,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIncident]);

  useEffect(() => {
    const handleZoomOut = () => {
      if (map.current) {
        map.current.flyTo({
          center: CALGARY_CENTER,
          zoom: 10.0,
          pitch: 45,
          bearing: 0,
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          speed: 1.2,
          curve: 1.4,
          essential: true,
        });
      }
    };
    window.addEventListener("zoomOutFromIncident", handleZoomOut);
    return () => window.removeEventListener("zoomOutFromIncident", handleZoomOut);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ---------- BOTTOM SHEET (Apple Maps style) ----------
const SNAPS = ["peek", "half", "full"];
const PEEK_HEIGHT = 76;

function BottomSheet({ snap, onSnap, vh, wide, grab, sticky, children }) {
  const heights = { peek: PEEK_HEIGHT, half: Math.round(vh * 0.52), full: vh - 56 };
  const [dragH, setDragH] = useState(null);
  const drag = useRef(null);
  const target = heights[snap];
  const h = dragH !== null ? dragH : target;
  const clamp = (v) => Math.max(heights.peek, Math.min(heights.full, v));

  const onDown = (e) => {
    if (wide) return;
    drag.current = { el: e.currentTarget, id: e.pointerId, y: e.clientY, h: target, ly: e.clientY, lt: e.timeStamp, v: 0, moved: false };
  };
  const onMove = (e) => {
    const s = drag.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (!s.moved && Math.abs(dy) > 6) {
      s.moved = true;
      try { s.el.setPointerCapture(s.id); } catch (err) { /* ignore */ }
    }
    if (!s.moved) return;
    const dt = e.timeStamp - s.lt;
    if (dt > 0) s.v = (s.ly - e.clientY) / dt;
    s.ly = e.clientY;
    s.lt = e.timeStamp;
    setDragH(clamp(s.h + dy));
  };
  const onUp = (e) => {
    const s = drag.current;
    if (!s) return;
    drag.current = null;
    if (!s.moved) {
      if (snap === "peek") onSnap("half");
      return;
    }
    const cur = clamp(s.h + s.y - e.clientY);
    let next;
    if (Math.abs(s.v) > 0.4) {
      const i = SNAPS.indexOf(snap);
      next = SNAPS[Math.max(0, Math.min(2, i + (s.v > 0 ? 1 : -1)))];
    } else {
      next = SNAPS.reduce((a, b) => (Math.abs(heights[a] - cur) < Math.abs(heights[b] - cur) ? a : b));
    }
    setDragH(null);
    onSnap(next);
  };

  const base = {
    position: "absolute",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...GLASS,
    boxShadow: "0 -4px 30px rgba(0,0,0,0.22)",
    fontFamily: font,
    color: COLORS.text,
  };

  const style = wide
    ? { ...base, left: 12, top: "calc(env(safe-area-inset-top, 0px) + 12px)", bottom: 12, width: 380, borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.28)" }
    : {
        ...base,
        left: 0, right: 0, bottom: 0,
        height: `calc(${h}px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: "calc(100% - 44px)",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        transition: dragH !== null ? "none" : "height 0.38s cubic-bezier(0.22, 0.9, 0.3, 1)",
      };

  return (
    <div style={style}>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", flexShrink: 0 }}
      >
        {!wide && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 6px 0" }}>
            <div style={{ width: 36, height: 5, borderRadius: 3, background: "rgba(60,60,67,0.3)" }} />
          </div>
        )}
        {wide && <div style={{ height: 12 }} />}
        {grab}
      </div>
      <div style={{ flexShrink: 0 }}>{sticky}</div>
      <div
        className="ds-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: snap === "peek" && !wide ? "hidden" : "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- APP ----------
function App() {
  const { w: vw, h: vh } = useViewport();
  const wide = vw >= 700;

  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [nearestCameras, setNearestCameras] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [snap, setSnap] = useState("peek");
  const [showAbout, setShowAbout] = useState(false);
  const [is3D, setIs3D] = useState(true);

  const mapRef = useRef(null);
  const paddingRef = useRef({ top: 0, bottom: 0, left: 0, right: 0 });

  paddingRef.current = wide
    ? { top: 0, bottom: 0, left: 392, right: 0 }
    : { top: 90, bottom: Math.round(vh * 0.52), left: 0, right: 0 };

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

  // Fuzzy search (Elasticsearch on the backend) - waits a moment after typing stops
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      axios.get(`${API_BASE_URL}/api/search`, { params: { q, limit: 50 } })
        .then(res => { if (!cancelled) setSearchResults(res.data?.items || []); })
        .catch(() => {
          if (cancelled) return;
          const ql = q.toLowerCase();
          setSearchResults(incidents.filter(i => `${i.roadway_name || ""} ${i.description || ""} ${i.details || ""}`.toLowerCase().includes(ql)));
        });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function handleSelectIncident(incident) {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setSelectedIncident(incident);
    setActiveCameraIndex(0);
    setNearestCameras([]);
    setActiveTab("details");
    setSnap("half");

    if (incident?.coordinates) {
      setIsLoadingCameras(true);
      axios.get(`${API_BASE_URL}/api/nearest-cameras`, { params: { lat: incident.coordinates.lat, lon: incident.coordinates.lon, limit: 4 } })
        .then(res => {
          if (res.data) setNearestCameras(res.data.items || []);
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
    setSnap("half");
    window.dispatchEvent(new Event("zoomOutFromIncident"));
  }

  const handleToggle3D = () => {
    const m = mapRef.current;
    if (!m) return;
    m.stop();
    if (m.getPitch() > 5) {
      m.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      setIs3D(false);
    } else {
      m.easeTo({ pitch: 55, duration: 700 });
      setIs3D(true);
    }
  };

  const handleReset = () => {
    setSelectedIncident(null);
    setNearestCameras([]);
    setIs3D(true);
    window.dispatchEvent(new Event("zoomOutFromIncident"));
  };

  // when searching, keep the search relevance order; otherwise newest first
  const isSearching = searchResults !== null;
  let processedList = isSearching ? [...searchResults] : [...incidents];
  if (!isSearching) processedList.sort((a, b) => new Date(b.start_dt || 0) - new Date(a.start_dt || 0));

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: font, color: COLORS.sub, fontWeight: 600 }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(0,0,0,0.1)", borderTopColor: COLORS.red, borderRadius: "50%", animation: "ds-spin 0.8s linear infinite" }} />
        <style>{GLOBAL_CSS}</style>
        Loading traffic data...
      </div>
    );
  }

  // ----- shared small pieces -----
  const roundBtn = {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "none", color: COLORS.blue, cursor: "pointer", padding: 0,
  };

  const segBtn = (key, label) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        flex: 1, padding: "7px 0", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
        background: activeTab === key ? "white" : "transparent",
        color: COLORS.text,
        boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );

  const inDetails = !!selectedIncident;

  // ----- sheet header content -----
  const grabContent = inDetails ? (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "4px 16px 10px 16px" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {orNA(selectedIncident.roadway_name)}
        </div>
        <div style={{ marginTop: 3, fontSize: 14, color: COLORS.sub, fontWeight: 500 }}>
          {formatTime(selectedIncident.start_dt)} · {timeAgo(selectedIncident.start_dt)}
        </div>
      </div>
      <button
        className="ds-press"
        onClick={handleExit}
        aria-label="Close"
        style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(118,118,128,0.2)", color: COLORS.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
      >
        <IconClose size={16} />
      </button>
    </div>
  ) : (
    <div style={{ padding: "2px 16px 10px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.fill, borderRadius: 12, padding: "0 12px", height: 44 }}>
        <IconSearch size={18} color={COLORS.sub} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (!wide) setSnap("full"); }}
          placeholder="Search roads or locations"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, fontWeight: 500, color: COLORS.text, fontFamily: font, height: "100%" }}
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(118,118,128,0.4)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
          >
            <IconClose size={12} />
          </button>
        ) : (
          <div style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: "white", background: COLORS.red, borderRadius: 10, padding: "2px 9px" }}>{incidents.length}</div>
        )}
      </div>
    </div>
  );

  const stickyContent = inDetails ? (
    <div style={{ padding: "0 16px 10px 16px" }}>
      <div style={{ display: "flex", background: COLORS.fill, borderRadius: 10, padding: 2 }}>
        {segBtn("details", "Details")}
        {segBtn("cameras", "Cameras")}
      </div>
    </div>
  ) : null;

  // ----- sheet body -----
  const infoRow = (label, value, last) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderBottom: last ? "none" : `1px solid ${COLORS.line}` }}>
      <span style={{ fontSize: 15, color: COLORS.sub, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 15, color: COLORS.text, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );

  const groupCard = { background: "rgba(255,255,255,0.9)", borderRadius: 14, border: `1px solid ${COLORS.line}`, overflow: "hidden" };

  const listBody = (
    <div>
      {processedList.map((inc, i) => (
        <div
          key={inc.id}
          className="ds-row"
          onClick={() => handleSelectIncident(inc)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer" }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.red, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconCar size={20} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0, borderBottom: i === processedList.length - 1 ? "none" : `1px solid ${COLORS.line}`, padding: "4px 0 12px 0", marginBottom: -4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orNA(inc.roadway_name)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, color: COLORS.sub, fontSize: 13, flexShrink: 0 }}>
                {timeAgo(inc.start_dt)} <IconChevronRight size={14} color="#c4c4c7" />
              </div>
            </div>
            <div style={{ fontSize: 13, color: COLORS.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {orNA(inc.description).replace(/\s+/g, " ")}
            </div>
          </div>
        </div>
      ))}
      {processedList.length === 0 && (
        <div style={{ textAlign: "center", color: COLORS.sub, fontWeight: 600, padding: "40px 20px" }}>No incidents found.</div>
      )}
    </div>
  );

  const detailsBody = selectedIncident && (
    <div style={{ padding: "4px 16px 0 16px", animation: "ds-fade 0.3s ease" }}>
      <div style={groupCard}>
        {infoRow("When", formatDateTime(selectedIncident.start_dt))}
        {infoRow("Lanes", orNA(selectedIncident.lanes_affected))}
        {infoRow("Last updated", formatDateTime(selectedIncident.modified_dt), true)}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5, margin: "18px 4px 8px" }}>Description</div>
      <div style={{ ...groupCard, padding: "12px 14px", fontSize: 15, lineHeight: 1.45, color: COLORS.text, fontWeight: 500 }}>
        <FormattedDescription text={selectedIncident.description} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5, margin: "18px 4px 8px" }}>Details</div>
      <div style={{ ...groupCard, padding: "12px 14px", fontSize: 15, lineHeight: 1.45, color: COLORS.text, fontWeight: 500 }}>
        <FormattedDescription text={selectedIncident.details} />
      </div>
    </div>
  );

  const cam = nearestCameras[activeCameraIndex];
  const camerasBody = selectedIncident && (
    <div style={{ padding: "4px 16px 0 16px", animation: "ds-fade 0.3s ease" }}>
      {isLoadingCameras ? (
        <div style={{ aspectRatio: "16 / 9", borderRadius: 14, background: "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.sub, fontWeight: 600 }}>
          Loading cameras...
        </div>
      ) : cam ? (
        <>
          <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden", background: "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.sub, fontWeight: 600 }}>
            Camera offline
            <img
              key={cam.url}
              src={cam.url}
              alt="Traffic Camera"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#e5e5ea" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <button
              className="ds-press"
              onClick={() => setActiveCameraIndex((p) => (p > 0 ? p - 1 : nearestCameras.length - 1))}
              aria-label="Previous camera"
              style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: COLORS.fill, color: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            >
              <IconChevronLeft size={22} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>Camera {activeCameraIndex + 1} of {nearestCameras.length}</div>
              <div style={{ fontSize: 13, color: COLORS.sub, marginTop: 2 }}>~{Number(cam.distance_km).toFixed(2)} km away</div>
            </div>
            <button
              className="ds-press"
              onClick={() => setActiveCameraIndex((p) => (p < nearestCameras.length - 1 ? p + 1 : 0))}
              aria-label="Next camera"
              style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: COLORS.fill, color: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            >
              <IconChevronRight size={22} />
            </button>
          </div>
        </>
      ) : (
        <div style={{ aspectRatio: "16 / 9", borderRadius: 14, background: "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.sub, fontWeight: 600 }}>
          No cameras available
        </div>
      )}
    </div>
  );

  const sheetBody = inDetails ? (activeTab === "details" ? detailsBody : camerasBody) : listBody;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: font, overscrollBehavior: "none", touchAction: "manipulation" }}>
      <style>{GLOBAL_CSS}</style>

      {/* MAP */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <Map3D
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          onMapLoad={(mapInstance) => { mapRef.current = mapInstance; }}
          paddingRef={paddingRef}
        />
      </div>

      {/* TITLE (top left) */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          left: wide ? 404 : "calc(env(safe-area-inset-left, 0px) + 12px)",
          zIndex: 15,
          background: "#22335C",
          border: "2px solid #fff",
          borderRadius: 12,
          padding: "5px 10px 5px 6px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          opacity: snap === "full" && !wide ? 0 : 1,
          pointerEvents: "none",
          transition: "opacity 0.25s ease",
        }}
      >
        <img src={driveGif} alt="" style={{ height: 28, width: 28, borderRadius: 7, objectFit: "cover", border: "1.5px solid #fff" }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.2px" }}>DriveSafe Calgary</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#E0E6ED", lineHeight: 1.2 }}>Live Traffic Incidents</div>
        </div>
      </div>

      {/* FLOATING MAP CONTROLS (top right, glass pill like Apple Maps) */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          right: "calc(env(safe-area-inset-right, 0px) + 12px)",
          zIndex: 15,
          ...GLASS,
          borderRadius: 14,
          boxShadow: "0 2px 14px rgba(0,0,0,0.25)",
          overflow: "hidden",
          opacity: snap === "full" && !wide ? 0 : 1,
          pointerEvents: snap === "full" && !wide ? "none" : "auto",
          transition: "opacity 0.25s ease",
        }}
      >
        <button className="ds-row" onClick={() => setShowAbout(true)} aria-label="About" style={roundBtn}><IconInfo size={20} /></button>
        <div style={{ height: 1, background: COLORS.line, margin: "0 6px" }} />
        <button className="ds-row" onClick={handleToggle3D} aria-label="Toggle 2D / 3D" style={{ ...roundBtn, fontSize: 14, fontWeight: 700 }}>{is3D ? "2D" : "3D"}</button>
        <div style={{ height: 1, background: COLORS.line, margin: "0 6px" }} />
        <button className="ds-row" onClick={handleReset} aria-label="Reset view" style={roundBtn}><IconReset size={18} /></button>
      </div>

      {/* BOTTOM SHEET */}
      <BottomSheet snap={snap} onSnap={setSnap} vh={vh} wide={wide} grab={grabContent} sticky={stickyContent}>
        {sheetBody}
      </BottomSheet>

      {/* ABOUT OVERLAY */}
      <div
        onClick={() => setShowAbout(false)}
        style={{
          position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center",
          padding: wide ? 20 : 0,
          opacity: showAbout ? 1 : 0, visibility: showAbout ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 480, maxHeight: "85%", overflowY: "auto",
            background: "white", fontFamily: font, color: COLORS.text,
            borderRadius: wide ? 20 : "20px 20px 0 0",
            padding: "24px 20px calc(env(safe-area-inset-bottom, 0px) + 24px) 20px",
            transform: showAbout ? "translateY(0)" : "translateY(40px)",
            transition: "transform 0.35s cubic-bezier(0.22, 0.9, 0.3, 1)",
            position: "relative",
          }}
        >
          <button
            className="ds-press"
            onClick={() => setShowAbout(false)}
            aria-label="Close"
            style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(118,118,128,0.2)", color: COLORS.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
          >
            <IconClose size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingRight: 40 }}>
            <img src={driveGif} alt="DriveSafe" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", background: "#22335C" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>DriveSafe Calgary</div>
              <div style={{ fontSize: 14, color: COLORS.sub, marginTop: 2 }}>Live traffic incidents</div>
            </div>
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.5, color: "#3a3a3c", margin: "0 0 12px 0" }}>
            DriveSafe Calgary is an application made by <a href="https://tahazuberi.vercel.app/" target="_blank" rel="noreferrer" style={{ color: COLORS.blue, textDecoration: "none", fontWeight: 600 }}>Taha Zuberi</a>.
            It is a public, free tool built for Calgary residents to get real-time traffic incidents and live camera feeds.
            The goal is to keep the community informed and safe on the roads.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "#3a3a3c", margin: "0 0 18px 0" }}>
            If you have any questions or concerns, please email below:
          </p>
          <a
            href="mailto:taha.zuberi@ucalgary.ca"
            className="ds-press"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.blue, color: "white", borderRadius: 14, padding: "14px 16px", fontWeight: 700, fontSize: 16, textDecoration: "none" }}
          >
            taha.zuberi@ucalgary.ca
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;