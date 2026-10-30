import { COLORS } from "../theme";

// rounded white card that groups InfoRows
export const groupCard = { background: "rgba(255,255,255,0.9)", borderRadius: 14, border: `1px solid ${COLORS.line}`, overflow: "hidden" };

// label left, value right, hairline divider unless it's the last row
function InfoRow({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderBottom: last ? "none" : `1px solid ${COLORS.line}` }}>
      <span style={{ fontSize: 15, color: COLORS.sub, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 15, color: COLORS.text, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default InfoRow;
