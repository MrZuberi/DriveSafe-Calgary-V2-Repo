import { useEffect, useState, useRef } from "react";
import './App.css';
import './mobiles.css';
import image1 from "./image1.jpg";
import { CALGARY_CENTER } from "./shared/config";
import { fetchIncidents, searchIncidents, fetchNearestCameras } from "./shared/api";
import { isWithinLastWeek, isToday } from "./shared/dates";
import { font } from "./desktop/styles";
import Map3D from "./desktop/components/Map3D";
import MapControls from "./desktop/components/MapControls";
import IncidentList from "./desktop/components/IncidentList";
import TitleCard from "./desktop/components/TitleCard";
import PageTabs from "./desktop/components/PageTabs";
import LatestIncidents from "./desktop/components/LatestIncidents";
import ExitButton from "./desktop/components/ExitButton";
import CameraCard from "./desktop/components/CameraCard";
import DetailsCard from "./desktop/components/DetailsCard";
import AboutModal from "./desktop/components/AboutModal";
import ImageModal from "./desktop/components/ImageModal";

// decode the list page background up front so it doesn't pop in
const preloadBg = new Image();
preloadBg.src = image1;
if (preloadBg.decode) preloadBg.decode().catch(() => {});

// desktop root: owns all state, switches between the map and list pages
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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  // fetches 100 incidents, drops ones without coords or older than a week, keeps the old array if ids/modified_dt match
  function loadIncidents() {
    fetchIncidents(100).then(res => {
      if (res.data?.items) {
        const clean = res.data.items.filter(i => i.coordinates?.lat && i.coordinates?.lon && isWithinLastWeek(i.start_dt));
        setIncidents(prev => (
          prev.length === clean.length && prev.every((p, idx) => p.id === clean[idx].id && p.modified_dt === clean[idx].modified_dt)
        ) ? prev : clean);
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

  // selects the incident, reopens both cards, switches to the map and loads nearby cameras
  function handleSelectIncident(incident) {
    setSelectedIncident(incident);
    setActiveCameraIndex(0);
    setNearestCameras([]);
    setActivePage("map");

    setShowCameraCard(true);
    setShowDetailsCard(true);

    if (incident?.coordinates) {
      setIsLoadingCameras(true);
      fetchNearestCameras(incident.coordinates)
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

  // drops the selection and tells Map3D to fly back out
  function handleExit() {
    setSelectedIncident(null);
    setNearestCameras([]);
    window.dispatchEvent(new Event('zoomOutFromIncident'));
  }

  // map pins and the latest panel only use today's incidents
  const todayIncidents = incidents.filter(i => isToday(i.start_dt));
  const recentIncidents = todayIncidents.slice(0, 5);

  // search hits keep backend relevance order, the full list sorts newest first
  const isSearching = searchResults !== null;
  let processedList = isSearching ? searchResults.filter(i => isWithinLastWeek(i.start_dt)) : [...incidents];
  if (!isSearching) {
    processedList.sort((a, b) => {
      const dateA = new Date(a.start_dt || 0);
      const dateB = new Date(b.start_dt || 0);
      return dateB - dateA;
    });
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', fontFamily: font, fontWeight: 800 }}>Loading traffic data....</div>;

  // eases pitch and bearing to 0 for a flat top-down view
  const handleMake2D = () => {
    if (mapRef.current) {
      mapRef.current.stop();
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  };

  // exits the incident and eases back to the zoom 10 city view
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

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden", position: "relative", fontFamily: font }}>

      {/* map is hidden rather than unmounted on the list page so it doesn't reload */}
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        opacity: activePage === "map" ? 1 : 0,
        visibility: activePage === "map" ? "visible" : "hidden",
        pointerEvents: activePage === "map" ? "auto" : "none",
        transition: "opacity 0.3s ease-in-out, visibility 0.3s ease-in-out"
      }}>
        <Map3D
          incidents={todayIncidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          onMapLoad={(mapInstance) => { mapRef.current = mapInstance; }}
        />
      </div>

      {activePage === "map" && (
        <MapControls
          onMake2D={handleMake2D}
          onResetView={handleResetView}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
        />
      )}

      {/* blurred list background, always mounted and faded by opacity */}
      <div style={{ position: "absolute", inset: "-40px", zIndex: 1, backgroundImage: `url(${image1})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(4px)", transform: "translateZ(0)", willChange: "opacity", opacity: activePage === "list" ? 1 : 0, pointerEvents: "none", transition: "opacity 0.3s ease-in-out" }}></div>

      {activePage === "list" && (
        <IncidentList
          incidents={processedList}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          expandedCard={expandedCard}
          setExpandedCard={setExpandedCard}
          onSelectIncident={handleSelectIncident}
        />
      )}

      <TitleCard onHome={() => setActivePage("map")} onAbout={() => setShowAbout(true)} />

      <PageTabs activePage={activePage} setActivePage={setActivePage} />

      {activePage === "map" && !selectedIncident && (
        <LatestIncidents incidents={recentIncidents} onSelectIncident={handleSelectIncident} />
      )}

      {activePage === "map" && selectedIncident && (
        <>
          <ExitButton onClick={handleExit} />

          {showCameraCard && (
            <CameraCard
              cameras={nearestCameras}
              activeIndex={activeCameraIndex}
              setActiveIndex={setActiveCameraIndex}
              isLoading={isLoadingCameras}
              onClose={() => setShowCameraCard(false)}
            />
          )}

          {showDetailsCard && (
            <DetailsCard incident={selectedIncident} onClose={() => setShowDetailsCard(false)} />
          )}
        </>
      )}

      <AboutModal show={showAbout} onClose={() => setShowAbout(false)} />

      {showImageModal && (
        <ImageModal src={showImageModal} onClose={() => setShowImageModal(null)} />
      )}
    </div>
  );
}

export default App;
