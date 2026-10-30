import { font } from "../styles";
import { orNA, formatDateTime } from "../../shared/format";
import { isToday } from "../../shared/dates";
import { IconMapPin, IconChevronDown } from "./Icons";
import FormattedDescription from "./FormattedDescription";

// one list card: header toggles the expand, map-pin button jumps to the map
function IncidentCard({ incident, isOpen, onToggle, onSelectIncident }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        overflow: "hidden",
        transition: "transform 0.2s ease-in-out",
        border: "3px solid #222",
        boxShadow: "6px 6px 0px rgba(0,0,0,0.8)"
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
    >

      <div
        onClick={onToggle}
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "background 0.2s ease-in-out"
        }}
      >
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#222", marginBottom: "6px" }}>
            {orNA(incident.roadway_name)}
          </div>
          <div style={{ fontSize: "0.9rem", color: "#4a5568", fontWeight: 700, fontFamily: font }}>
            {formatDateTime(incident.start_dt)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* only today's incidents are on the map, so only they get the pin */}
          {isToday(incident.start_dt) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectIncident(incident);
            }}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#edf2f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "2px solid #cbd5e0",
              transition: "all 0.2s ease-in-out"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#edf2f7"; e.currentTarget.style.transform = "scale(1)"; }}
            title="View on Map"
          >
            <IconMapPin size={18} color="#d64545" />
          </div>
          )}

          {/* red chevron for today, yellow for older */}
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: isToday(incident.start_dt) ? "#d64545" : "#FFC107",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s ease-in-out",
            cursor: "pointer"
          }}>
            <IconChevronDown
              size={18}
              color={isToday(incident.start_dt) ? "white" : "#222"}
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease-in-out" }}
            />
          </div>
        </div>
      </div>

      {/* grid-template-rows 0fr -> 1fr animates the expand height */}
      <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      <div style={{ overflow: "hidden", minHeight: 0 }}>
        <div style={{ padding: "0 24px 24px 24px", fontFamily: font, opacity: isOpen ? 1 : 0, transform: isOpen ? "translateY(0)" : "translateY(-8px)", transition: "opacity 0.3s ease-in-out, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>

           <div style={{ marginBottom: "20px", fontSize: "0.95rem", color: "#2d3748", lineHeight: "1.6" }}>
              <FormattedDescription text={incident.description} />
           </div>

           <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              background: "#f7fafc",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px"
           }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#718096", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>QUADRANT</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748" }}>{orNA(incident.quadrant)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#718096", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>LAST UPDATED</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748" }}>{formatDateTime(incident.modified_dt || incident.start_dt)}</div>
              </div>
           </div>

        </div>
      </div>
      </div>
    </div>
  );
}

export default IncidentCard;
