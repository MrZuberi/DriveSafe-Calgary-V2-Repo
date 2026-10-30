import { useEffect, useRef } from "react";
import { CALGARY_CENTER } from "../../shared/config";

const maplibregl = window.maplibregl;

// maplibre map with a red pin per incident, flies to the selection and back out on reset
function Map3D({ incidents, selectedIncident, onSelectIncident, onMapLoad }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const onSelectRef = useRef(onSelectIncident);
  onSelectRef.current = onSelectIncident;

  // builds the map once on voyager, then swaps to arcgis satellite tiles on load
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
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
      m.setStyle("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}");
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

  // clears and re-adds all pins whenever the incident list changes
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];

    incidents.forEach((incident) => {
      if (!incident.coordinates) return;
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
  }, [incidents]);

  // zoom 15, pitch 60 onto the selected incident
  useEffect(() => {
    if (map.current && selectedIncident?.coordinates) {
      map.current.stop();
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

  // listens for the window "zoomOutFromIncident" event fired on exit
  useEffect(() => {
    const handleZoomOut = () => {
      if (map.current) {
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

export default Map3D;
