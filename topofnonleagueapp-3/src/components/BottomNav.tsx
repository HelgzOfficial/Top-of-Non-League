"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/pick", label: "Pick" },
  { href: "/teams", label: "Teams" },
  { href: "/table", label: "Table" },
  { href: "/profile", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] flex justify-around items-center
                 px-1.5 pt-2.5 bg-[rgba(14,21,18,0.86)] backdrop-blur-xl border-t border-line z-50"
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
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
