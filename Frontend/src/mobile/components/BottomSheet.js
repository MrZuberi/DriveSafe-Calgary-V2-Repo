import { useState, useRef } from "react";
import { font, COLORS, GLASS } from "../theme";

const SNAPS = ["peek", "half", "full"];
export const PEEK_HEIGHT = 76;

// draggable sheet snapping to peek/half/full, becomes a fixed left panel when wide
function BottomSheet({ snap, onSnap, vh, wide, grab, sticky, peekH = PEEK_HEIGHT, children }) {
  const heights = { peek: peekH, half: Math.round(vh * 0.52), full: vh - 56 };
  const [dragH, setDragH] = useState(null);
  const drag = useRef(null);
  const target = heights[snap];
  const h = dragH !== null ? dragH : target;
  const clamp = (v) => Math.max(heights.peek, Math.min(heights.full, v));

  // records the start point, drag isn't committed until it moves 6px
  const onDown = (e) => {
    if (wide) return;
    drag.current = { el: e.currentTarget, id: e.pointerId, y: e.clientY, h: target, ly: e.clientY, lt: e.timeStamp, v: 0, moved: false };
  };
  // past 6px grabs pointer capture, then follows the finger and tracks px/ms velocity
  const onMove = (e) => {
    const s = drag.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (!s.moved && Math.abs(dy) > 6) {
      s.moved = true;
      try { s.el.setPointerCapture(s.id); } catch (err) {}
    }
    if (!s.moved) return;
    const dt = e.timeStamp - s.lt;
    if (dt > 0) s.v = (s.ly - e.clientY) / dt;
    s.ly = e.clientY;
    s.lt = e.timeStamp;
    setDragH(clamp(s.h + dy));
  };
  // tap on peek opens to half; a flick over 0.4px/ms steps one snap, otherwise nearest snap wins
  const onUp = (e) => {
    const s = drag.current;
    if (!s) return;
    drag.current = null;
    if (!s.moved) {
      if (snap === "peek") onSnap("half");
      return;
    }
    const cur = clamp(s.h + s.y - e.clientY);
    let next;
    if (Math.abs(s.v) > 0.4) {
      const i = SNAPS.indexOf(snap);
      next = SNAPS[Math.max(0, Math.min(2, i + (s.v > 0 ? 1 : -1)))];
    } else {
      next = SNAPS.reduce((a, b) => (Math.abs(heights[a] - cur) < Math.abs(heights[b] - cur) ? a : b));
    }
    setDragH(null);
    onSnap(next);
  };

  const base = {
    position: "absolute",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...GLASS,
    boxShadow: "0 -4px 30px rgba(0,0,0,0.22)",
    fontFamily: font,
    color: COLORS.text,
  };

  // height transition is off while dragging so it tracks the finger 1:1
  const style = wide
    ? { ...base, left: 12, top: "calc(env(safe-area-inset-top, 0px) + 12px)", bottom: 12, width: 380, borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.28)" }
    : {
        ...base,
        left: 0, right: 0, bottom: 0,
        height: `calc(${h}px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: "calc(100% - 44px)",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        transition: dragH !== null ? "none" : "height 0.38s cubic-bezier(0.22, 0.9, 0.3, 1)",
      };

  return (
    <div style={style}>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", flexShrink: 0 }}
      >
        {!wide && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 6px 0" }}>
            <div style={{ width: 36, height: 5, borderRadius: 3, background: "rgba(60,60,67,0.3)" }} />
          </div>
        )}
        {wide && <div style={{ height: 12 }} />}
        {grab}
      </div>
      <div style={{ flexShrink: 0 }}>{sticky}</div>
      <div
        className="ds-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: snap === "peek" && !wide ? "hidden" : "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default BottomSheet;
