import driveGif from "../../drive.gif";

// logo badge top-left, sits right of the side panel when wide and fades out when the sheet is full
function TitleBadge({ wide, snap }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        left: wide ? 404 : "calc(env(safe-area-inset-left, 0px) + 12px)",
        zIndex: 15,
        background: "#22335C",
        border: "2px solid #fff",
        borderRadius: 12,
        padding: "5px 10px 5px 6px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        opacity: snap === "full" && !wide ? 0 : 1,
        pointerEvents: "none",
        transition: "opacity 0.25s ease",
      }}
    >
      <img src={driveGif} alt="" style={{ height: 28, width: 28, borderRadius: 7, objectFit: "cover", border: "1.5px solid #fff" }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.2px" }}>DriveSafe Calgary</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#E0E6ED", lineHeight: 1.2 }}>Live Traffic Incidents</div>
      </div>
    </div>
  );
}

export default TitleBadge;
