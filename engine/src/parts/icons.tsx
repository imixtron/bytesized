// Icon set (design language §5): 24-unit grid, 2px rounded strokes, drawn in currentColor.
import type { ReactNode } from "react";
import type { NodeSpec } from "../episode/schema";

const G = ({ children }: { children: ReactNode }) => (
  <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</g>
);

export const ICONS = {
  server: <G><rect x={3} y={3} width={18} height={7} rx={2} /><rect x={3} y={14} width={18} height={7} rx={2} /><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" /></G>,
  db: <G><ellipse cx={12} cy={5} rx={8} ry={3} /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></G>,
  lb: <G><circle cx={12} cy={5} r={2.5} /><path d="M12 7.5V12M12 12L5 19M12 12v7M12 12l7 7" /><path d="M3 17l2 2 2-2M10 17l2 2 2-2M17 17l2 2 2-2" /></G>,
  phone: <G><rect x={6} y={2} width={12} height={20} rx={3} /><path d="M11 18h2" /><path d="M10.5 8.5v5l4-2.5z" fill="currentColor" /></G>,
  user: <G><circle cx={12} cy={8} r={4} /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></G>,
  crowd: <G><circle cx={9} cy={8} r={3.2} /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx={17} cy={9} r={2.6} /><path d="M16 14.2c2.9.3 5 2.6 5 5.8" /></G>,
  cache: <G><rect x={3} y={3} width={18} height={18} rx={4} /><path d="M13 6l-4 7h4l-2 5" /></G>,
  queue: <G><rect x={3} y={5} width={4} height={14} rx={1.5} /><rect x={10} y={5} width={4} height={14} rx={1.5} /><rect x={17} y={5} width={4} height={14} rx={1.5} /></G>,
  cdn: <G><circle cx={12} cy={12} r={9} /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9" /></G>,
  gateway: <G><path d="M4 21V10a8 8 0 0 1 16 0v11M3 21h18M9 21v-6h6v6" /></G>,
  dns: <G><rect x={4} y={3} width={16} height={18} rx={2} /><path d="M8 8h8M8 12h8M8 16h5" /></G>,
  storage: <G><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5L12 12l9-4.5M12 12v9" /></G>,
  service: <G><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" /><circle cx={12} cy={12} r={3} /></G>,
  internet: <G><path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6-.9A4.5 4.5 0 0 0 7 18.5z" /></G>,
  thirdparty: <G><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" /></G>,
  city: <G><path d="M3 21h18M5 21V9l5-3v15M10 21V4l6 3v14M16 21v-9l4 2v7" /><path d="M13 10h.01M13 14h.01M7.5 13h.01M7.5 17h.01" /></G>,
  cop: <G><rect x={8} y={2} width={8} height={20} rx={3} /><circle cx={12} cy={7} r={1.6} /><circle cx={12} cy={12} r={1.6} /><circle cx={12} cy={17} r={1.6} fill="currentColor" /></G>,
  scale: <G><path d="M4 20V14M10 20V10M16 20V6M3 21h18" /><path d="M15 3h5v5M20 3l-6 6" /></G>,
  pulse: <G><path d="M2 12h4l2-5 4 10 3-7 2 2h5" /></G>,
  gauge: <G><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-6" /><circle cx={12} cy={18} r={1.3} fill="currentColor" /></G>,
} as const;

export type IconName = keyof typeof ICONS;

/** Icon for each node type (brand nodes show their logo instead). */
export const ICON_FOR: Record<Exclude<NodeSpec["type"], "brand">, IconName> = {
  phone: "phone", user: "user", crowd: "crowd", server: "server", db: "db", lb: "lb", cache: "cache",
  queue: "queue", cdn: "cdn", gateway: "gateway", dns: "dns", storage: "storage", service: "service",
  internet: "internet", thirdparty: "thirdparty",
};

export const Icon = ({ name, size, color }: { name: IconName; size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, display: "block", overflow: "visible" }}>
    {ICONS[name]}
  </svg>
);
