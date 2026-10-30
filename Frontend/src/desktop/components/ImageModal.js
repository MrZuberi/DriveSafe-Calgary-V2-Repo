import { font } from "../styles";

// full-screen image viewer, clicking the backdrop closes it
function ImageModal({ src, onClose }) {
  return (
    <div className="modal" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, animation: "fadeIn 0.3s ease-in-out" }}>
      <img src={src} alt="camera" style={{ maxWidth: "95vw", maxHeight: "95vh", borderRadius: "12px", border: "4px solid #222", transform: "scale(0.95)", transition: "transform 0.3s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(0.95)"} onClick={e => e.stopPropagation()} />
      <button className="close-btn" onClick={onClose} style={{ position: "absolute", top: "2rem", right: "2rem", padding: "12px 24px", background: "white", border: "3px solid #222", borderRadius: "10px", cursor: "pointer", fontWeight: 900, fontSize: "1.1rem", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", fontFamily: font, transition: "all 0.2s ease-in-out" }}>Close</button>
    </div>
  );
}

export default ImageModal;
