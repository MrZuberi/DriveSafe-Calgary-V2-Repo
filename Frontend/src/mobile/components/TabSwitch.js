import { COLORS } from "../theme";

// ios-style segmented control for the details/cameras tabs
function TabSwitch({ activeTab, setActiveTab }) {
  // white raised pill marks the active segment
  const segBtn = (key, label) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        flex: 1, padding: "7px 0", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
        background: activeTab === key ? "white" : "transparent",
        color: COLORS.text,
        boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: "0 16px 10px 16px" }}>
      <div style={{ display: "flex", background: COLORS.fill, borderRadius: 10, padding: 2 }}>
        {segBtn("details", "Details")}
        {segBtn("cameras", "Cameras")}
      </div>
    </div>
  );
}

export default TabSwitch;
