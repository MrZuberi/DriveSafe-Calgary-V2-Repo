import { closeBtnStyle } from "../styles";

// tries mailto first, opens gmail compose if the window never lost focus within 900ms
function openEmail(e) {
  e.preventDefault();
  const to = "taha.zuberi@ucalgary.ca";
  let left = false;
  const onBlur = () => { left = true; };
  window.addEventListener("blur", onBlur, { once: true });
  window.location.href = `mailto:${to}`;
  setTimeout(() => {
    window.removeEventListener("blur", onBlur);
    if (!left) window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}`, "_blank", "noopener,noreferrer");
  }, 900);
}

// about popup, always mounted and faded via opacity/visibility so it can animate out
function AboutModal({ show, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", opacity: show ? 1 : 0, visibility: show ? "visible" : "hidden", transition: "opacity 0.3s ease-in-out, visibility 0.3s ease-in-out" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "white", borderRadius: "24px", padding: "40px", maxWidth: "700px", width: "100%", maxHeight: "90vh", overflowY: "auto", border: "4px solid #222", boxShadow: "8px 8px 0px rgba(0,0,0,0.8)", transform: show ? "scale(1) translateY(0)" : "scale(0.96) translateY(10px)", transition: "transform 0.3s ease-in-out" }}>
        <button onClick={onClose} style={{ ...closeBtnStyle, position: "absolute", top: "16px", right: "16px", fontSize: "1.4rem" }} onMouseEnter={(e) => e.currentTarget.style.color = "#ff0000"} onMouseLeave={(e) => e.currentTarget.style.color = "#d64545"}>✕</button>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1.1, margin: "0 0 20px 0", color: "#222", paddingRight: "30px" }}>About DriveSafe Calgary.</h1>
        <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#444", lineHeight: "1.6", marginBottom: "20px" }}>
          DriveSafe Calgary is an application made by <a href="https://tahazuberi.vercel.app/" target="_blank" rel="noreferrer" style={{ color: "#004c8c", textDecoration: "underline" }}>Taha Zuberi</a>.
          It is a public, free tool built for Calgary residents to get real-time traffic incidents and live camera feeds.
          The goal is to keep the community informed and safe on the roads.
        </p>
        <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#444", lineHeight: "1.6", marginBottom: "30px" }}>If you have any questions or concerns, please email below:</p>
        <a href="mailto:taha.zuberi@ucalgary.ca" onClick={openEmail} style={{ display: "inline-flex", alignItems: "center", background: "#f8f9fa", border: "3px solid #222", borderRadius: "12px", padding: "12px 24px", color: "#222", fontWeight: 900, fontSize: "1.1rem", textDecoration: "none", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
          taha.zuberi@ucalgary.ca
        </a>
      </div>
    </div>
  );
}

export default AboutModal;
