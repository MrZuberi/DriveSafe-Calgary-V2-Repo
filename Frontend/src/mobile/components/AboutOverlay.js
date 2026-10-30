import driveGif from "../../drive.gif";
import { font, COLORS } from "../theme";
import { IconClose } from "./Icons";

// about panel: slides up from the bottom on phones, centered card when wide; always mounted so it can fade out
function AboutOverlay({ show, wide, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center",
        padding: wide ? 20 : 0,
        opacity: show ? 1 : 0, visibility: show ? "visible" : "hidden",
        transition: "opacity 0.3s ease, visibility 0.3s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "85%", overflowY: "auto",
          background: "white", fontFamily: font, color: COLORS.text,
          borderRadius: wide ? 20 : "20px 20px 0 0",
          padding: "24px 20px calc(env(safe-area-inset-bottom, 0px) + 24px) 20px",
          transform: show ? "translateY(0)" : "translateY(40px)",
          transition: "transform 0.35s cubic-bezier(0.22, 0.9, 0.3, 1)",
          position: "relative",
        }}
      >
        <button
          className="ds-press"
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(118,118,128,0.2)", color: COLORS.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
        >
          <IconClose size={16} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingRight: 40 }}>
          <img src={driveGif} alt="DriveSafe" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", background: "#22335C" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>DriveSafe Calgary</div>
            <div style={{ fontSize: 14, color: COLORS.sub, marginTop: 2 }}>Live traffic incidents</div>
          </div>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.5, color: "#3a3a3c", margin: "0 0 12px 0" }}>
          DriveSafe Calgary is an application made by <a href="https://tahazuberi.vercel.app/" target="_blank" rel="noreferrer" style={{ color: COLORS.blue, textDecoration: "none", fontWeight: 600 }}>Taha Zuberi</a>.
          It is a public, free tool built for Calgary residents to get real-time traffic incidents and live camera feeds.
          The goal is to keep the community informed and safe on the roads.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: "#3a3a3c", margin: "0 0 18px 0" }}>
          If you have any questions or concerns, please email below:
        </p>
        <a
          href="mailto:taha.zuberi@ucalgary.ca"
          className="ds-press"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.blue, color: "white", borderRadius: 14, padding: "14px 16px", fontWeight: 700, fontSize: 16, textDecoration: "none" }}
        >
          taha.zuberi@ucalgary.ca
        </a>
      </div>
    </div>
  );
}

export default AboutOverlay;
