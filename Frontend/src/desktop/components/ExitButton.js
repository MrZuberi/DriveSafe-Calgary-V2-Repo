import { font } from "../styles";

// red pill under the tabs that leaves the selected incident
function ExitButton({ onClick }) {
  return (
    <button onClick={onClick} style={{ position: "absolute", top: "100px", left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 24px", borderRadius: "25px", background: "#d64545", color: "white", border: "3px solid #222", fontSize: "1.1rem", fontWeight: 900, cursor: "pointer", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)", fontFamily: font, transition: "all 0.2s ease-in-out" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translate(-50%, -2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translate(-50%, 0)"}>
      ✕ EXIT
    </button>
  );
}

export default ExitButton;
