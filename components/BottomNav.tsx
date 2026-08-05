"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, PickIcon, TeamsIcon, TableIcon, LeagueIcon, ProfileIcon } from "@/components/icons";

const TABS = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/pick", label: "Pick", Icon: PickIcon },
  { href: "/teams", label: "Teams", Icon: TeamsIcon },
  { href: "/table", label: "Table", Icon: TableIcon },
  { href: "/league", label: "League", Icon: LeagueIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    // iOS Safari has a known bug where a single element combining
    // `position: fixed` with `backdrop-filter` (Tailwind's backdrop-blur)
    // can detach from the viewport and scroll away with the page instead
    // of staying pinned. Splitting the two across a plain fixed wrapper
    // and a separate blurred inner bar avoids the bug while keeping the
    // frosted-glass look.
    <div className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-50">
      <div
        className="flex justify-around items-center px-1.5 pt-2.5 bg-[var(--nav-bg)] backdrop-blur-xl border-t border-line"
        style={{ paddingBottom: "calc(10px + var(--safe-bottom))" }}
      >
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold ${
                active ? "text-brandGreen" : "text-subDim"
              }`}
            >
              <tab.Icon size={20} strokeWidth={active ? 2.1 : 1.8} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
