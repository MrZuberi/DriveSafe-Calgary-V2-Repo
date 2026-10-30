// map/list switch at the top center, inactive tab dimmed to 0.5
function PageTabs({ activePage, setActivePage }) {
  return (
    <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "white", border: "3px solid #222", borderRadius: "20px", padding: "8px 30px", display: "flex", gap: "30px", boxShadow: "4px 4px 0px rgba(0,0,0,0.8)" }}>
      <span onClick={() => setActivePage("map")} style={{ fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", color: "#222", opacity: activePage === "map" ? 1 : 0.5, transition: "all 0.2s ease-in-out" }}>MAP</span>
      <span onClick={() => setActivePage("list")} style={{ fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", color: "#222", opacity: activePage === "list" ? 1 : 0.5, transition: "all 0.2s ease-in-out" }}>LIST</span>
    </div>
  );
}

export default PageTabs;
