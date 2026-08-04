"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ShirtGraphic, { type ShirtStyle } from "@/components/ShirtGraphic";

const STYLES: { value: ShirtStyle; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "stripes", label: "Stripes" },
  { value: "hoops", label: "Hoops" },
  { value: "sleeves", label: "Sleeve trim" },
  { value: "sash", label: "Sash" },
];

// A curated palette rather than a raw colour wheel — keeps every
// combination looking clean instead of risking clashing/unreadable kits.
const PALETTE = [
  "#e11d2e", // red
  "#f97316", // orange
  "#f5b400", // amber
  "#22c55e", // green
  "#0d9488", // teal
  "#06b6d4", // cyan
  "#0284c7", // sky
  "#2563eb", // blue
  "#4f46e5", // indigo
  "#7c3aed", // violet
  "#db2777", // pink
  "#7f1d1d", // maroon
  "#1e3a8a", // navy
  "#111827", // black
  "#6b7280", // grey
  "#ffffff", // white
];

export default function ShirtEditor({
  initial,
}: {
  initial: {
    shirt_style: ShirtStyle;
    shirt_color: string;
    shirt_trim_color: string;
    shirt_number: number | null;
  };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [style, setStyle] = useState<ShirtStyle>(initial.shirt_style);
  const [color, setColor] = useState(initial.shirt_color);
  const [trimColor, setTrimColor] = useState(initial.shirt_trim_color);
  const [number, setNumber] = useState<string>(initial.shirt_number != null ? String(initial.shirt_number) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const previewNumber = number.trim() === "" ? null : parseInt(number, 10) || null;

  async function save() {
    let num: number | null = null;
    if (number.trim() !== "") {
      const parsed = parseInt(number, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 99) {
        setMessage("Number must be between 1 and 99");
        return;
      }
      num = parsed;
    }

    setSaving(true);
    setMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        shirt_style: style,
        shirt_color: color,
        shirt_trim_color: trimColor,
        shirt_number: num,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Shirt updated");
    router.refresh();
  }

  return (
    <div className="card flex flex-col gap-4 mt-3.5">
      <div className="flex items-center gap-4">
        <ShirtGraphic style={style} color={color} trimColor={trimColor} number={previewNumber} size={84} />
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">Squad number</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Optional"
            className="w-24 px-3 py-2.5 rounded-smcard border border-lineHi bg-bg2 text-ink text-base outline-none focus:border-brandGreen"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">Style</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStyle(s.value)}
              className={`px-3 py-2 rounded-smcard text-[12.5px] font-bold border ${
                style === s.value ? "border-brandGreen text-brandGreen bg-brandGreen/[0.08]" : "border-lineHi text-sub"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">Main colour</label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Main colour ${c}`}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-brandGreen" : "border-transparent"}`}
              style={{ backgroundColor: c, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-sub mb-2">Trim colour</label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Trim colour ${c}`}
              onClick={() => setTrimColor(c)}
              className={`w-7 h-7 rounded-full border-2 ${trimColor === c ? "border-brandGreen" : "border-transparent"}`}
              style={{ backgroundColor: c, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
      </div>

      {message && <p className="text-xs text-sub">{message}</p>}
      <button onClick={save} disabled={saving} className="btn-primary w-full py-4 rounded-2xl font-extrabold text-[15px]">
        {saving ? "Saving…" : "Save shirt"}
      </button>
    </div>
  );
}
