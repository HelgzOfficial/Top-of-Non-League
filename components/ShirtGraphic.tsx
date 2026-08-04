"use client";

import { useId } from "react";

export type ShirtStyle = "solid" | "stripes" | "hoops" | "sleeves" | "sash";

// A simple jersey silhouette: V-neck collar, two short sleeves, body down to
// a rounded hem. Coordinates live in a 0-100 x 0-100 viewBox.
const BODY_PATH =
  "M35 8 L25 8 L8 26 L20 38 L28 30 L28 92 Q28 96 32 96 L68 96 Q72 96 72 92 L72 30 L80 38 L92 26 L75 8 L65 8 Q60 16 50 16 Q40 16 35 8 Z";

const LEFT_SLEEVE_PATH = "M35 8 L25 8 L8 26 L20 38 L28 30 L28 8 Z";
const RIGHT_SLEEVE_PATH = "M65 8 L75 8 L92 26 L80 38 L72 30 L72 8 Z";

export default function ShirtGraphic({
  style = "solid",
  color = "#1f8a4c",
  trimColor = "#ffffff",
  numberColor = "#ffffff",
  number = null,
  size = 64,
  className = "",
}: {
  style?: ShirtStyle;
  color?: string;
  trimColor?: string;
  numberColor?: string;
  number?: number | null;
  size?: number;
  className?: string;
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `shirt-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Shirt${number != null ? `, number ${number}` : ""}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      {/* base body colour */}
      <path d={BODY_PATH} fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth={1.2} />

      {/* pattern overlays, clipped to the shirt silhouette */}
      <g clipPath={`url(#${clipId})`}>
        {style === "stripes" &&
          Array.from({ length: 5 }).map((_, i) =>
            i % 2 === 1 ? <rect key={i} x={i * 16.8} y={0} width={16.8} height={100} fill={trimColor} /> : null
          )}
        {style === "hoops" &&
          Array.from({ length: 5 }).map((_, i) =>
            i % 2 === 1 ? <rect key={i} x={0} y={i * 20} width={100} height={20} fill={trimColor} /> : null
          )}
        {style === "sash" && <polygon points="8,10 28,8 92,86 70,96" fill={trimColor} />}
      </g>

      {/* sleeve-trim style paints the sleeve caps only, on top of the base body */}
      {style === "sleeves" && (
        <>
          <path d={LEFT_SLEEVE_PATH} fill={trimColor} stroke="rgba(0,0,0,0.25)" strokeWidth={1.2} />
          <path d={RIGHT_SLEEVE_PATH} fill={trimColor} stroke="rgba(0,0,0,0.25)" strokeWidth={1.2} />
        </>
      )}

      {number != null && (
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontSize="30"
          fontWeight={800}
          fill={numberColor}
          stroke="rgba(0,0,0,0.45)"
          strokeWidth={0.8}
          style={{ fontFamily: "sans-serif" }}
        >
          {number}
        </text>
      )}
    </svg>
  );
}
