import { COLORS } from "../theme";
import { orNA, formatDateTime } from "../../shared/format";
import { isToday } from "../../shared/dates";
import { timeAgo } from "../timeAgo";
import { IconCar, IconChevronRight } from "./Icons";
import InfoRow, { groupCard } from "./InfoRow";
import FormattedDescription from "./FormattedDescription";

// one list row: today's incidents open on the map (red), older ones expand in place (yellow)
function IncidentRow({ inc, isLast, isOpen, setExpandedId, onSelectIncident }) {
  const onMap = isToday(inc.start_dt);
  return (
    <div>
    <div
      className="ds-row"
      onClick={onMap ? () => onSelectIncident(inc) : () => setExpandedId(isOpen ? null : inc.id)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer" }}
    >
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: onMap ? COLORS.red : "#FFC107", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <IconCar size={20} color={onMap ? "white" : COLORS.text} />
      </div>
      <div style={{ flex: 1, minWidth: 0, borderBottom: isLast ? "none" : `1px solid ${COLORS.line}`, padding: "4px 0 12px 0", marginBottom: -4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orNA(inc.roadway_name)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, color: COLORS.sub, fontSize: 13, flexShrink: 0 }}>
            {/* plain chevron for map rows, rotating down/up chevron for expandable rows */}
            {timeAgo(inc.start_dt)} {onMap ? <IconChevronRight size={14} color="#c4c4c7" /> : (
              <span style={{ display: "flex", transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s ease" }}>
                <IconChevronRight size={14} color="#c4c4c7" />
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 13, color: COLORS.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[inc.quadrant, orNA(inc.description)].filter(Boolean).join(" · ").replace(/\s+/g, " ")}
        </div>
      </div>
    </div>
    {!onMap && isOpen && (
      <div style={{ padding: "0 16px 14px 16px", animation: "ds-fade 0.3s ease" }}>
        <div style={groupCard}>
          <InfoRow label="When" value={formatDateTime(inc.start_dt)} />
          <InfoRow label="Quadrant" value={orNA(inc.quadrant)} />
          <InfoRow label="Last updated" value={formatDateTime(inc.modified_dt || inc.start_dt)} last />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 4px 8px" }}>Description</div>
        <div style={{ ...groupCard, padding: "12px 14px", fontSize: 15, lineHeight: 1.45, color: COLORS.text, fontWeight: 500 }}>
          <FormattedDescription text={inc.description} />
        </div>
      </div>
    )}
    </div>
  );
}

export default IncidentRow;
