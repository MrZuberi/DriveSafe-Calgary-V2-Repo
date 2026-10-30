import { btnStyle, zoomBtnStyle } from "../styles";
import { IconPlus, IconMinus } from "./Icons";

// make 2d / reset view stack bottom-left, zoom +/- stack bottom-right
function MapControls({ onMake2D, onResetView, onZoomIn, onZoomOut }) {
  return (
    <>
      <div style={{ position: "absolute", bottom: "30px", left: "30px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10 }}>
        <button onClick={onMake2D} style={btnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>Make 2D</button>
        <button onClick={onResetView} style={btnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>Reset View</button>
      </div>

      <div style={{ position: "absolute", bottom: "30px", right: "30px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 10 }}>
        <button onClick={onZoomIn} style={zoomBtnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}><IconPlus size={20} color="#222" /></button>
        <button onClick={onZoomOut} style={zoomBtnStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}><IconMinus size={20} color="#222" /></button>
      </div>
    </>
  );
}

export default MapControls;
