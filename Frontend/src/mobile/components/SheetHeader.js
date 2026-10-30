import { font, COLORS } from "../theme";
import { orNA, formatTime } from "../../shared/format";
import { timeAgo } from "../timeAgo";
import { IconSearch, IconClose } from "./Icons";

// incident title + close when selected, else weekly title + search; one component so react reuses the root div on switch
function SheetHeader({ incident, onClose, searchQuery, setSearchQuery, onFocus, count }) {
  if (incident) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "4px 16px 10px 16px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {orNA(incident.roadway_name)}
          </div>
          <div style={{ marginTop: 3, fontSize: 14, color: COLORS.sub, fontWeight: 500 }}>
            {formatTime(incident.start_dt)} · {timeAgo(incident.start_dt)}
          </div>
        </div>
        <button
          className="ds-press"
          onClick={onClose}
          aria-label="Close"
          style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(118,118,128,0.2)", color: COLORS.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
        >
          <IconClose size={16} />
        </button>
      </div>
    );
  }

  // clear button while typing, red incident count badge when empty
  return (
    <div style={{ padding: "2px 16px 10px 16px" }}>
      <div style={{ fontFamily: font, fontSize: 24, fontWeight: 800, lineHeight: 1.15, color: COLORS.text, whiteSpace: "nowrap", margin: "0 0 10px 0" }}>Weekly Traffic Incidents</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.fill, borderRadius: 12, padding: "0 12px", height: 44 }}>
        <IconSearch size={18} color={COLORS.sub} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={onFocus}
          placeholder="Search roads or locations"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, fontWeight: 500, color: COLORS.text, fontFamily: font, height: "100%" }}
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            style={{ flexShrink: 0, width: 28, height: 28, minWidth: 0, minHeight: 0, margin: "0 -4px 0 0", padding: 0, border: "none", background: "transparent", WebkitAppearance: "none", appearance: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <circle cx="10" cy="10" r="10" fill="#8e8e93" />
              <path d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <div style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: "white", background: COLORS.red, borderRadius: 10, padding: "2px 9px" }}>{count}</div>
        )}
      </div>
    </div>
  );
}

export default SheetHeader;
