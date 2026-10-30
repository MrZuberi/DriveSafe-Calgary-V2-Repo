import driveGif from "../../drive.gif";

// navy logo card top-left, click goes to the map, "i" opens about
function TitleCard({ onHome, onAbout }) {
  return (
    <div style={{ position: "fixed", top: "20px", left: "20px", zIndex: 10, background: "#22335C", border: "3px solid #fff", borderRadius: "16px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", cursor: "pointer", transition: "transform 0.2s ease-in-out" }} onClick={onHome} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
      <img src={driveGif} alt="Drive Animation" style={{ height: "50px", borderRadius: "10px", border: "2px solid #fff" }} />
      <div>
        <h1 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 900, letterSpacing: "-0.5px", color: "#fff" }}>DriveSafe Calgary</h1>
        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#E0E6ED" }}>Live Traffic Incidents</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAbout(); }}
        title="About"
        style={{ width: "30px", height: "30px", borderRadius: "50%", border: "2px solid #fff", background: "transparent", color: "#fff", fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 700, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, marginLeft: "4px", transition: "all 0.2s ease-in-out" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#22335C"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#fff"; }}
      >i</button>
    </div>
  );
}

export default TitleCard;
