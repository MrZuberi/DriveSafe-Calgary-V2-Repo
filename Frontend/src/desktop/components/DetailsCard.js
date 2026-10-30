import { closeBtnStyle } from "../styles";
import { orNA, formatTime, formatDateTime } from "../../shared/format";
import FormattedDescription from "./FormattedDescription";

// right floating card with the road name, description, and when/quadrant/updated
function DetailsCard({ incident, onClose }) {
  return (
    <div style={{ position: "absolute", top: "25vh", right: "8%", width: "420px", background: "white", padding: "1.5rem", borderRadius: "16px", border: "3px solid #222", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)", zIndex: 100, maxHeight: "60vh", overflowY: "auto", animation: "fadeIn 0.3s ease-in-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, color: "#d64545", fontSize: "1.4rem", fontWeight: 900 }}>{orNA(incident.roadway_name)}</h2>
        <button onClick={onClose} style={closeBtnStyle} onMouseEnter={(e) => e.currentTarget.style.color = "#ff0000"} onMouseLeave={(e) => e.currentTarget.style.color = "#d64545"}>✕</button>
      </div>

      <div style={{ fontSize: "0.95rem", marginBottom: "1rem", lineHeight: "1.4", fontWeight: 700, color: "#333", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <FormattedDescription text={incident.description} />
      </div>

      <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "10px", marginBottom: "0.5rem", border: "2px solid #ddd" }}>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 800 }}><b>When:</b> {formatTime(incident.start_dt)}</p>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 800 }}><b>Quadrant:</b> {orNA(incident.quadrant)}</p>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 800 }}><b>Last updated:</b> {formatDateTime(incident.modified_dt || incident.start_dt)}</p>
      </div>
    </div>
  );
}

export default DetailsCard;
