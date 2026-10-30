import { orNA } from "../../shared/format";
import { IconMapPin } from "./Icons";

// "Xm/Xh/Xd" since the timestamp, "now" under a minute
function timeAgoShort(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

// top-right panel of the 5 newest incidents today, rows invert to dark on hover
function LatestIncidents({ incidents, onSelectIncident }) {
  return (
    <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10, background: "#F9F6EE", border: "3px solid #222", borderRadius: "16px", padding: "16px", width: "300px", boxShadow: "6px 6px 0px rgba(0,0,0,0.8)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingLeft: "8px" }}>
        <IconMapPin size={18} color="#555" />
        <h3 style={{ margin: 0, fontWeight: 900, fontSize: "0.9rem", color: "#555", letterSpacing: "1px" }}>LATEST INCIDENTS</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {incidents.map((inc) => (
          <div key={inc.id} onClick={() => onSelectIncident(inc)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#222"; e.currentTarget.querySelector('.title').style.color = "#fff"; e.currentTarget.querySelector('.time').style.color = "#ccc"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector('.title').style.color = "#222"; e.currentTarget.querySelector('.time').style.color = "#aaa"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#aaa" }}>0{incidents.indexOf(inc) + 1}</span>
              <span className="title" style={{ fontWeight: 900, fontSize: "1.05rem", color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px", transition: "color 0.2s ease-in-out" }}>{orNA(inc.roadway_name)}</span>
            </div>
            <div className="time" style={{ fontSize: "0.9rem", fontWeight: 800, color: "#aaa", transition: "color 0.2s ease-in-out" }}>{timeAgoShort(inc.start_dt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LatestIncidents;
