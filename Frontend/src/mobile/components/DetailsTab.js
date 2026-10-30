import { COLORS } from "../theme";
import { orNA, formatDateTime } from "../../shared/format";
import InfoRow, { groupCard } from "./InfoRow";
import FormattedDescription from "./FormattedDescription";

// when/quadrant/updated card plus description, plain function (not a component) so nodes get reused across tab switches
export function renderDetailsTab(incident) {
  return (
    <>
      <div style={groupCard}>
        <InfoRow label="When" value={formatDateTime(incident.start_dt)} />
        <InfoRow label="Quadrant" value={orNA(incident.quadrant)} />
        <InfoRow label="Last updated" value={formatDateTime(incident.modified_dt || incident.start_dt)} last />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5, margin: "18px 4px 8px" }}>Description</div>
      <div style={{ ...groupCard, padding: "12px 14px", fontSize: 15, lineHeight: 1.45, color: COLORS.text, fontWeight: 500 }}>
        <FormattedDescription text={incident.description} />
      </div>
    </>
  );
}
