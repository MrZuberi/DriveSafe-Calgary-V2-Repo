import { useEffect, useRef } from "react";
import { CALGARY_CENTER } from "../../shared/config";

const maplibregl = window.maplibregl;

// maplibre map with 3d buildings and incident pins, padding comes from paddingRef so fly-tos clear the sheet
function Map3D({ incidents, selectedIncident, onSelectIncident, onMapLoad, paddingRef }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const markerEls = useRef({});
  const onSelectRef = useRef(onSelectIncident);
  const hasFitBounds = useRef(false);
  onSelectRef.current = onSelectIncident;

  // builds the map once on openfreemap bright
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

    // extrudes the first vector source's building layer from zoom 13, colored by height
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

  // rebuilds the pins, and on the first batch fits the map to them with ~0.05 deg of slack
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
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.display = "flex";
      el.style.alignItems = "flex-end";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; transform-origin: 50% 100%; transition: transform 0.25s ease; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));">
          <path d="M12 2C7.58 2 4 5.58 4 10C4 16 12 22 12 22C12 22 20 16 20 10C20 5.58 16.42 2 12 2Z" fill="#d64545" stroke="white" stroke-width="1.2"/>
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

  // scales the selected pin to 1.3x, resets the rest
  useEffect(() => {
    Object.entries(markerEls.current).forEach(([id, el]) => {
      const svg = el.firstElementChild;
      if (svg) svg.style.transform = selectedIncident && String(selectedIncident.id) === String(id) ? "scale(1.3)" : "scale(1)";
    });
  }, [selectedIncident, incidents]);

  // zoom 15, pitch 55 onto the selection using the current sheet padding
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

  // "zoomOutFromIncident" flies home, using event.detail.zoom when given (reset passes 9.4) else 10
  useEffect(() => {
    const handleZoomOut = (e) => {
      if (map.current) {
        map.current.flyTo({
          center: CALGARY_CENTER,
          zoom: (e && e.detail && e.detail.zoom) || 10.0,
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

export default Map3D;
