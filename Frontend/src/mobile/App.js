import { useEffect, useState, useRef } from "react";
import './App.css';
import { fetchIncidents, searchIncidents, fetchNearestCameras } from "../shared/api";
import { isWithinLastWeek, isToday } from "../shared/dates";
import { font, COLORS, GLOBAL_CSS } from "./theme";
import useViewport from "./hooks/useViewport";
import Map3D from "./components/Map3D";
import BottomSheet, { PEEK_HEIGHT } from "./components/BottomSheet";
import TitleBadge from "./components/TitleBadge";
import MapControls from "./components/MapControls";
import SheetHeader from "./components/SheetHeader";
import TabSwitch from "./components/TabSwitch";
import SheetBody from "./components/SheetBody";
import AboutOverlay from "./components/AboutOverlay";

// reset zooms out to 9.4 instead of 10 so more of the city fits on a phone
const RESET_ZOOM = 9.4;

// mobile root: owns all state, lays out the map, floating controls, and bottom sheet
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
  const [searchResults, setSearchResults] = useState(null);
  const [snap, setSnap] = useState("peek");
  const [showAbout, setShowAbout] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const mapRef = useRef(null);
  const paddingRef = useRef({ top: 0, bottom: 0, left: 0, right: 0 });

  // fly-to padding: clear the 392px side panel when wide, else the top badge and the half-height sheet
  paddingRef.current = wide
    ? { top: 0, bottom: 0, left: 392, right: 0 }
    : { top: 90, bottom: Math.round(vh * 0.52), left: 0, right: 0 };

  // fetches 500 incidents, drops ones without coords or older than a week
  function loadIncidents() {
    fetchIncidents(500).then(res => {
      if (res.data?.items) {
        const clean = res.data.items.filter(i => i.coordinates?.lat && i.coordinates?.lon && isWithinLastWeek(i.start_dt));
        setIncidents(clean);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }

  // initial load plus a 30s poll
  useEffect(() => { loadIncidents(); const t = setInterval(loadIncidents, 30000); return () => clearInterval(t); }, []);

  // 250ms debounced search, falls back to a local substring match if the request fails
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      searchIncidents(q)
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

  // blurs the search input (drops the keyboard), opens details at half height, loads nearby cameras
  function handleSelectIncident(incident) {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setSelectedIncident(incident);
    setActiveCameraIndex(0);
    setNearestCameras([]);
    setActiveTab("details");
    setSnap("half");

    if (incident?.coordinates) {
      setIsLoadingCameras(true);
      fetchNearestCameras(incident.coordinates)
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

  // drops the selection, leaves the sheet at half, flies back to zoom 10
  function handleExit() {
    setSelectedIncident(null);
    setNearestCameras([]);
    setSnap("half");
    window.dispatchEvent(new Event("zoomOutFromIncident"));
  }

  // pitch > 5 counts as 3d; toggles between flat and pitch 55
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

  // like exit but keeps the sheet where it is and flies out to RESET_ZOOM
  const handleReset = () => {
    setSelectedIncident(null);
    setNearestCameras([]);
    setIs3D(true);
    window.dispatchEvent(new CustomEvent("zoomOutFromIncident", { detail: { zoom: RESET_ZOOM } }));
  };

  // map pins only use today's incidents
  const todayIncidents = incidents.filter(i => isToday(i.start_dt));

  // search hits keep backend relevance order, the full list sorts newest first
  const isSearching = searchResults !== null;
  let processedList = isSearching ? searchResults.filter(i => isWithinLastWeek(i.start_dt)) : [...incidents];
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

  const inDetails = !!selectedIncident;

  // sheet content swaps between the list view and the selected incident view
  const grabContent = (
    <SheetHeader
      incident={selectedIncident}
      onClose={handleExit}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onFocus={() => { if (!wide) setSnap("full"); }}
      count={incidents.length}
    />
  );

  const stickyContent = inDetails ? <TabSwitch activeTab={activeTab} setActiveTab={setActiveTab} /> : null;

  const sheetBody = (
    <SheetBody
      incident={selectedIncident}
      activeTab={activeTab}
      cameras={nearestCameras}
      activeCameraIndex={activeCameraIndex}
      setActiveCameraIndex={setActiveCameraIndex}
      isLoadingCameras={isLoadingCameras}
      incidents={processedList}
      expandedId={expandedId}
      setExpandedId={setExpandedId}
      onSelectIncident={handleSelectIncident}
    />
  );

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: font, overscrollBehavior: "none", touchAction: "manipulation" }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <Map3D
          incidents={todayIncidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          onMapLoad={(mapInstance) => { mapRef.current = mapInstance; }}
          paddingRef={paddingRef}
        />
      </div>

      <TitleBadge wide={wide} snap={snap} />

      <MapControls
        wide={wide}
        snap={snap}
        is3D={is3D}
        onAbout={() => setShowAbout(true)}
        onToggle3D={handleToggle3D}
        onReset={handleReset}
      />

      {/* list view peeks taller (114px) so the search field stays visible */}
      <BottomSheet snap={snap} onSnap={setSnap} vh={vh} wide={wide} grab={grabContent} sticky={stickyContent} peekH={inDetails ? PEEK_HEIGHT : 114}>
        {sheetBody}
      </BottomSheet>

      <AboutOverlay show={showAbout} wide={wide} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
