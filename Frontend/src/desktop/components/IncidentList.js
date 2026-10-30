import { font, closeBtnStyle } from "../styles";
import { IconSearch } from "./Icons";
import IncidentCard from "./IncidentCard";

// list page: weekly title, search box, and one card per incident
function IncidentList({ incidents, searchQuery, setSearchQuery, expandedCard, setExpandedCard, onSelectIncident }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 1,
      overflowY: "auto",
      animation: "fadeIn 0.3s ease-in-out"
    }}>
      <div style={{ padding: "100px 40px 60px 40px", maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ marginBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: font, fontSize: "24px", fontWeight: 800, lineHeight: 1.15, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)", whiteSpace: "nowrap", margin: "0 0 16px 0", textAlign: "center" }}>Weekly Traffic Incidents</div>
          <div style={{ position: "relative", width: "100%", maxWidth: "520px" }}>
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
              <IconSearch size={20} color="#555" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roads or locations..."
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 46px 12px 46px", border: "3px solid #222", borderRadius: "20px", fontSize: "1rem", fontWeight: 700, fontFamily: font, color: "#222", background: "white", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", outline: "none" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} title="Clear" style={{ ...closeBtnStyle, position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#ff0000"} onMouseLeave={(e) => e.currentTarget.style.color = "#d64545"}>✕</button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {incidents.map((incident) => {
            const isOpen = expandedCard === incident.id;
            return (
              <IncidentCard
                key={incident.id}
                incident={incident}
                isOpen={isOpen}
                onToggle={() => setExpandedCard(isOpen ? null : incident.id)}
                onSelectIncident={onSelectIncident}
              />
            );
          })}
          {incidents.length === 0 && (
            <div style={{ textAlign: "center", fontWeight: 800, fontSize: "1.2rem", marginTop: "40px", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              No incidents found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentList;
