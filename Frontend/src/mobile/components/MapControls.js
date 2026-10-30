import { COLORS, GLASS } from "../theme";
import { IconInfo, IconReset } from "./Icons";

const roundBtn = {
  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "none", color: COLORS.blue, cursor: "pointer", padding: 0,
};

// glass button stack top-right (about, 2d/3d, reset), hidden and unclickable when the sheet is full
function MapControls({ wide, snap, is3D, onAbout, onToggle3D, onReset }) {
  return (
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
      <button className="ds-row" onClick={onAbout} aria-label="About" style={roundBtn}><IconInfo size={20} /></button>
      <div style={{ height: 1, background: COLORS.line, margin: "0 6px" }} />
      <button className="ds-row" onClick={onToggle3D} aria-label="Toggle 2D / 3D" style={{ ...roundBtn, fontSize: 14, fontWeight: 700 }}>{is3D ? "2D" : "3D"}</button>
      <div style={{ height: 1, background: COLORS.line, margin: "0 6px" }} />
      <button className="ds-row" onClick={onReset} aria-label="Reset view" style={roundBtn}><IconReset size={18} /></button>
    </div>
  );
}

export default MapControls;
