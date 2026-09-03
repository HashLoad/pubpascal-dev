import React from "react";
import type { ReviewRow } from "@/utils/queries/reviews";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= rating ? "text-amber-400" : "text-slate-600"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(iso));
}

function Avatar({ username, avatarUrl }: { username: string | null; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={username ?? "Usuário"}
        className="h-9 w-9 rounded-full object-cover border border-slate-700"
      />
    );
  }
  const initials = (username ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
      {initials}
    </div>
  );
}

type Props = {
  review: ReviewRow;
};

export default function ReviewCard({ review }: Props) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="flex items-start gap-3 mb-3">
        <Avatar username={review.reviewer_username} avatarUrl={review.reviewer_avatar} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {review.reviewer_username ?? "Usuário anônimo"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <StarDisplay rating={review.rating} />
            <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
          </div>
        </div>
      </div>
      {review.body && (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {review.body}
        </p>
      )}
    </article>
  );
}
