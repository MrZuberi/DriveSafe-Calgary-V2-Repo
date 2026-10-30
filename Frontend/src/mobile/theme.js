export const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Nunito', system-ui, sans-serif";

// ios system palette
export const COLORS = {
  red: "#d64545",
  blue: "#007AFF",
  text: "#1c1c1e",
  sub: "#6e6e73",
  line: "rgba(60,60,67,0.18)",
  fill: "rgba(118,118,128,0.12)",
};

// frosted glass background for the sheet and floating controls
export const GLASS = {
  background: "rgba(255,255,255,0.86)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
};

// press/row tap feedback, hidden scrollbars, spinner and fade-in keyframes
export const GLOBAL_CSS = `
  .ds-press { transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease; -webkit-tap-highlight-color: transparent; }
  .ds-press:active { transform: scale(0.94); }
  .ds-row { -webkit-tap-highlight-color: transparent; transition: background 0.15s ease; }
  .ds-row:active { background: rgba(0,0,0,0.06); }
  .ds-scroll::-webkit-scrollbar { display: none; }
  .ds-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  @keyframes ds-spin { to { transform: rotate(360deg); } }
  @keyframes ds-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  button { font-family: inherit; }
`;
