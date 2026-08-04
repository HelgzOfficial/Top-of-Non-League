/**
 * The crown-on-steps mark, inlined as SVG so it never depends on an
 * external image file loading. Used as the small badge on the sign-in,
 * verify, and setup screens — these previously used an <img> pointing at
 * /icons/icon-192.png, which kept failing to load whenever that file
 * didn't make it into the repo correctly. Inlining it here means there's
 * nothing to upload for this particular use of the artwork — it's just
 * part of the code.
 */
export default function AppLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className}>
      <defs>
        <linearGradient id="applogo-gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe49a" />
          <stop offset="45%" stopColor="#f4c04a" />
          <stop offset="100%" stopColor="#c8891f" />
        </linearGradient>
        <linearGradient id="applogo-goldsoft" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe49a" />
          <stop offset="100%" stopColor="#e8ac33" />
        </linearGradient>
        <radialGradient id="applogo-field" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#1a3d26" />
          <stop offset="60%" stopColor="#123320" />
          <stop offset="100%" stopColor="#0a2015" />
        </radialGradient>
      </defs>

      <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#applogo-field)" />
      <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="url(#applogo-gold)" strokeWidth="10" />
      <rect x="34" y="34" width="444" height="444" rx="94" fill="none" stroke="#3ddc84" strokeWidth="2" opacity="0.5" />

      <g transform="translate(74,70) scale(1.15)">
        <g stroke="#0a2015" strokeWidth="4" strokeLinejoin="round">
          <rect x="0" y="250" width="60" height="60" fill="url(#applogo-goldsoft)" />
          <rect x="72" y="205" width="60" height="105" fill="url(#applogo-goldsoft)" />
          <rect x="144" y="150" width="60" height="160" fill="url(#applogo-goldsoft)" />
          <rect x="216" y="90" width="68" height="220" fill="url(#applogo-gold)" />
        </g>
        <g fill="#fff3d6" opacity="0.55">
          <rect x="0" y="250" width="60" height="7" />
          <rect x="72" y="205" width="60" height="7" />
          <rect x="144" y="150" width="60" height="7" />
          <rect x="216" y="90" width="68" height="8" />
        </g>
        <g transform="translate(180,10)">
          <path
            d="M8,66 L26,18 L44,48 L70,4 L96,48 L114,18 L132,66 Z"
            fill="url(#applogo-gold)"
            stroke="#0a2015"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect x="4" y="60" width="132" height="24" rx="5" fill="url(#applogo-gold)" stroke="#0a2015" strokeWidth="4" />
          <circle cx="26" cy="18" r="7" fill="#fff3d6" stroke="#0a2015" strokeWidth="3" />
          <circle cx="70" cy="4" r="9" fill="#fff3d6" stroke="#0a2015" strokeWidth="3" />
          <circle cx="114" cy="18" r="7" fill="#fff3d6" stroke="#0a2015" strokeWidth="3" />
          <circle cx="70" cy="72" r="6" fill="#2ba566" stroke="#0a2015" strokeWidth="3" />
        </g>
      </g>
    </svg>
  );
}
