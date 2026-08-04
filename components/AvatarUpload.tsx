"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/types";

/**
 * Circular profile picture: click the pencil button to upload/replace it,
 * click the picture itself to see it full-size in an expanding lightbox.
 * Files go to the "avatars" Storage bucket at `${user.id}/avatar.<ext>` —
 * RLS on storage.objects restricts writes to that uid-named folder, see
 * supabase/migrations/0004_profile_customization.sql.
 */
export default function AvatarUpload({ initialUrl, teamName }: { initialUrl: string | null; teamName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setError("Not signed in");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);

    if (updateError) {
      setUploading(false);
      setError(updateError.message);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust: the storage path is stable across re-uploads, so without
    // this the browser (and Next's image cache) would keep showing the old
    // picture until a hard refresh.
    setUrl(`${pub.publicUrl}?t=${Date.now()}`);
    setUploading(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => url && setExpanded(true)}
          className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#2a3a33] to-[#182420] flex items-center justify-center shrink-0"
          aria-label={url ? "View profile picture" : "No profile picture set"}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Your profile picture" className="w-full h-full object-cover" />
          ) : (
            <span className="font-black text-lg text-sub">{initials(teamName || "?")}</span>
          )}
        </button>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-2 rounded-smcard border border-lineHi text-[12.5px] font-bold text-sub"
          >
            {uploading ? "Uploading…" : url ? "Change photo" : "Add photo"}
          </button>
          {error && <p className="text-xs text-sub mt-1.5">{error}</p>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      </div>

      {expanded && url && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Your profile picture, expanded" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/60 text-white font-bold flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
