import React from "react";

function initials(name: string | null, email: string): string {
  const base = (name && name.trim()) || email;
  return base.slice(0, 2).toUpperCase();
}

function joinedLabel(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  // Stable month/year, formatted in the caller's locale (no Date.now needed)
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
}

type Props = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  joinedAt: string | null;
  locale: string;
  memberSince: string;
  avatarNode?: React.ReactNode;
};

export default function ProfileHeader({ fullName, email, avatarUrl, joinedAt, locale, memberSince, avatarNode }: Props) {
  const joined = joinedLabel(joinedAt, locale);
  const displayName = (fullName && fullName.trim()) || email.split("@")[0];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      {avatarNode ? (
        avatarNode
      ) : avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-24 w-24 shrink-0 rounded-full border-2 border-slate-800 object-cover"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-slate-800 bg-brand-red/90 text-2xl font-bold text-white">
          {initials(fullName, email)}
        </div>
      )}
      <div className="text-center sm:text-left">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          {displayName}
        </h1>
        <p className="mt-1 text-slate-400">{email}</p>
        {joined && (
          <p className="mt-1 text-sm text-slate-500">{memberSince} {joined}</p>
        )}
      </div>
    </div>
  );
}
