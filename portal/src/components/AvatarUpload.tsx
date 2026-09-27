"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type AvatarDict = {
  changePhoto: string;
  errorFormat: string;
  errorSize: string;
  errorUpload: string;
};

type Props = {
  userId: string;
  initialUrl: string | null;
  fallback: string;
  dict: AvatarDict;
};

export default function AvatarUpload({ userId, initialUrl, fallback, dict }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError(dict.errorFormat);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(dict.errorSize);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      setUrl(publicUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(dict.errorUpload);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={dict.changePhoto}
        className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-red/50 disabled:opacity-70"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-brand-red/90 text-2xl font-bold text-white">
            {fallback}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={onPick}
        className="hidden"
      />
      <span className="text-[11px] text-slate-500">{dict.changePhoto}</span>
      {error && <span className="max-w-[12rem] text-center text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
