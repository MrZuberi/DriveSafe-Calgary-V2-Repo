import { closeBtnStyle } from "../styles";
import { IconMapPin, IconVideo } from "./Icons";

const prevNextStyle = { background: "#FFC107", color: "#222", border: "2px solid #222", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem", fontWeight: 900, boxShadow: "2px 2px 0px rgba(0,0,0,0.8)", transition: "all 0.2s ease-in-out" };

// left floating card with the current camera image, distance, and wrap-around prev/next
function CameraCard({ cameras, activeIndex, setActiveIndex, isLoading, onClose }) {
  return (
    <div style={{ position: "absolute", top: "25vh", left: "8%", width: "420px", background: "white", padding: "1rem", borderRadius: "16px", border: "3px solid #222", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)", zIndex: 100, maxHeight: "60vh", overflowY: "auto", animation: "fadeIn 0.3s ease-in-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, color: "#222", textAlign: "center", fontSize: "1.1rem", fontWeight: 900, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <IconVideo size={20} color="#222" /> Cameras
        </h3>
        <button onClick={onClose} style={closeBtnStyle} onMouseEnter={(e) => e.currentTarget.style.color = "#ff0000"} onMouseLeave={(e) => e.currentTarget.style.color = "#d64545"}>✕</button>
      </div>

      {isLoading ? (
        <div style={{ width: "100%", height: "220px", background: "#eee", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #222", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 800, color: "#666" }}>Loading cameras...</span>
        </div>
      ) : cameras.length > 0 ? (
        <>
          <div style={{ width: "100%", height: "220px", background: "#eee", borderRadius: "10px", overflow: "hidden", position: "relative", marginBottom: "1rem", border: "2px solid #222" }}>
            <img src={cameras[activeIndex].url} alt="Traffic Camera" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"} onError={(e) => e.target.src = "https://via.placeholder.com/400x220?text=Camera+Offline"} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setActiveIndex((prev) => prev > 0 ? prev - 1 : cameras.length - 1)} style={prevNextStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>&lt;</button>
            <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#222", display: "flex", alignItems: "center", gap: "4px" }}>
              <IconMapPin size={16} color="#d64545" /> ~{cameras[activeIndex].distance_km.toFixed(2)} km
            </div>
            <button onClick={() => setActiveIndex((prev) => prev < cameras.length - 1 ? prev + 1 : 0)} style={prevNextStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>&gt;</button>
          </div>
        </>
      ) : (
        <div style={{ width: "100%", height: "220px", background: "#eee", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #222", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 800, color: "#666" }}>No cameras available</span>
        </div>
      )}
    </div>
  );
}

export default CameraCard;
