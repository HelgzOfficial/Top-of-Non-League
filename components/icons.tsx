/**
 * Hand-drawn line icons for the bottom nav — plain SVG, no icon library
 * dependency, no emoji. Every icon uses currentColor so it automatically
 * matches BottomNav's existing active/inactive text colour classes.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function HomeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h4.2v-6.2h2.6V21H18a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function PickIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.3 10.7 15 16 9.2" />
    </svg>
  );
}

export function TeamsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.3 20c0-3.2 2.6-5.7 5.7-5.7s5.7 2.5 5.7 5.7" />
      <circle cx="17" cy="9.2" r="2.2" />
      <path d="M14.7 14.8c2.6.4 4.5 2.6 4.5 5.2" />
    </svg>
  );
}

export function TableIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3" y="4" width="18" height="3" rx="1" />
      <rect x="3" y="10.5" width="13" height="3" rx="1" />
      <rect x="3" y="17" width="8" height="3" rx="1" />
    </svg>
  );
}

export function LeagueIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7.5 3.5h9V7a4.5 4.5 0 0 1-9 0V3.5z" />
      <path d="M7.5 4.5H4.7v1.8a3 3 0 0 0 3 3" />
      <path d="M16.5 4.5h2.8v1.8a3 3 0 0 1-3 3" />
      <path d="M12 11.5v3.2" />
      <path d="M9.3 20h5.4" />
      <path d="M10.1 14.7h3.8l1 5.3H9.1l1-5.3z" />
    </svg>
  );
}

export function ProfileIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.7 20c0-4 3.3-7 7.3-7s7.3 3 7.3 7" />
    </svg>
  );
}
