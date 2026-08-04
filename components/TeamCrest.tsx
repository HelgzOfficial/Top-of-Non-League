import Image from "next/image";
import { initials } from "@/lib/types";

/**
 * Renders a club crest if one's been uploaded (teams.logo_path), otherwise
 * falls back to a text-initials badge. Safe to use before every team has a
 * real logo — that's expected to happen gradually.
 */
export default function TeamCrest({
  name,
  logoPath,
  size = 26,
  active = false,
}: {
  name: string;
  logoPath?: string | null;
  size?: number;
  active?: boolean;
}) {
  if (logoPath) {
    return (
      <span
        className="flex items-center justify-center rounded-[7px] bg-white/90 shrink-0 overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image src={logoPath} alt={`${name} crest`} width={size} height={size} className="object-contain p-0.5" />
      </span>
    );
  }

  return (
    <span
      className={`rounded-[7px] flex items-center justify-center font-black shrink-0 ${
        active ? "bg-brandGreen text-[#06150e]" : "bg-bg2 border border-line text-sub"
      }`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.42) }}
    >
      {initials(name)}
    </span>
  );
}
