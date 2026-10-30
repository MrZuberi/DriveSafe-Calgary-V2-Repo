// 24x24 svg wrapper all the icons share
const Svg = ({ size = 20, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>{children}</svg>
);
const sp = { strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconSearch = ({ size = 20, color = "currentColor" }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="6.5" stroke={color} {...sp} />
    <path d="M16 16L20 20" stroke={color} {...sp} />
  </Svg>
);
export const IconInfo = ({ size = 20, color = "currentColor" }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" stroke={color} {...sp} />
    <path d="M12 11V16" stroke={color} {...sp} />
    <circle cx="12" cy="8" r="0.6" fill={color} stroke={color} strokeWidth="1" />
  </Svg>
);
export const IconClose = ({ size = 18, color = "currentColor" }) => (
  <Svg size={size}><path d="M6 6L18 18M18 6L6 18" stroke={color} {...sp} /></Svg>
);
export const IconReset = ({ size = 20, color = "currentColor" }) => (
  <Svg size={size}>
    <path d="M4 12A8 8 0 1 0 6.3 6.3" stroke={color} {...sp} />
    <path d="M4 4V8.5H8.5" stroke={color} {...sp} />
  </Svg>
);
export const IconChevronRight = ({ size = 16, color = "currentColor" }) => (
  <Svg size={size}><path d="M9 6L15 12L9 18" stroke={color} {...sp} /></Svg>
);
export const IconChevronLeft = ({ size = 18, color = "currentColor" }) => (
  <Svg size={size}><path d="M15 6L9 12L15 18" stroke={color} {...sp} /></Svg>
);
export const IconCar = ({ size = 18, color = "currentColor" }) => (
  <Svg size={size}>
    <path d="M5 16V11L7 6H17L19 11V16" stroke={color} {...sp} />
    <rect x="3" y="11" width="18" height="6" rx="2" stroke={color} {...sp} />
    <circle cx="7.5" cy="14" r="0.6" fill={color} stroke={color} strokeWidth="1" />
    <circle cx="16.5" cy="14" r="0.6" fill={color} stroke={color} strokeWidth="1" />
  </Svg>
);
