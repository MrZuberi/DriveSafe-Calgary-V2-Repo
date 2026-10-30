export const font = "'Nunito', sans-serif";

// white chunky button used for Make 2D / Reset View
export const btnStyle = {
  background: "white", padding: "10px 16px", borderRadius: "8px", border: "3px solid #222",
  cursor: "pointer", fontWeight: 900, color: "#222", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)",
  fontSize: "14px", zIndex: 50, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.2s ease-in-out"
};

// square 50px button for map zoom
export const zoomBtnStyle = {
  background: "white", width: "50px", height: "50px", borderRadius: "10px", border: "3px solid #222",
  cursor: "pointer", fontWeight: 900, color: "#222", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, fontFamily: font,
  transition: "all 0.2s ease-in-out"
};

// red ✕ close button, no background
export const closeBtnStyle = {
  background: "transparent",
  border: "none",
  fontSize: "1.2rem",
  cursor: "pointer",
  fontWeight: 900,
  color: "#d64545",
  padding: "0 5px",
  transition: "all 0.2s ease-in-out"
};
