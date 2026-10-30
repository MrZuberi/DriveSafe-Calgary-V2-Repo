import { COLORS } from "../theme";
import { IconChevronLeft, IconChevronRight } from "./Icons";

const navBtn = { width: 44, height: 44, borderRadius: "50%", border: "none", background: COLORS.fill, color: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 };

// 16:9 camera frame with wrap-around prev/next, a broken img hides to reveal "Camera offline"; plain function like renderDetailsTab
export function renderCamerasTab({ cameras, activeIndex, setActiveIndex, isLoading }) {
  const cam = cameras[activeIndex];

  if (isLoading) {
    return (
      <div style={{ aspectRatio: "16 / 9", borderRadius: 14, background: "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.sub, fontWeight: 600 }}>
        Loading cameras...
      </div>
    );
  }

  if (!cam) {
    return (
      <div style={{ aspectRatio: "16 / 9", borderRadius: 14, background: "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.sub, fontWeight: 600 }}>
        No cameras available
      </div>
    );
  }

  return (
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
          onClick={() => setActiveIndex((p) => (p > 0 ? p - 1 : cameras.length - 1))}
          aria-label="Previous camera"
          style={navBtn}
        >
          <IconChevronLeft size={22} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>Camera {activeIndex + 1} of {cameras.length}</div>
          <div style={{ fontSize: 13, color: COLORS.sub, marginTop: 2 }}>~{Number(cam.distance_km).toFixed(2)} km away</div>
        </div>
        <button
          className="ds-press"
          onClick={() => setActiveIndex((p) => (p < cameras.length - 1 ? p + 1 : 0))}
          aria-label="Next camera"
          style={navBtn}
        >
          <IconChevronRight size={22} />
        </button>
      </div>
    </>
  );
}
