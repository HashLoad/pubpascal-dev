import React from "react";
import Link from "next/link";
import {
  getPackageReviews,
  getUserReview,
  getPackageRatingSummary,
  getFlaggedReviewCount,
} from "@/utils/queries/reviews";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";

type Props = {
  packageId: string;
  userId: string | null;
};

function RatingSummaryHeader({ avg, count }: { avg: number | null; count: number }) {
  if (count === 0) {
    return (
      <p className="text-sm text-slate-400">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
    );
  }
  return (
    <p className="text-sm text-slate-300">
      <span className="text-amber-400 font-bold text-base">★ {avg?.toFixed(1)}</span>
      <span className="text-slate-500"> de 5 — </span>
      <span className="font-semibold">{count}</span>
      <span className="text-slate-500"> avaliação{count !== 1 ? "s" : ""}</span>
    </p>
  );
}

export default async function ReviewsTab({ packageId, userId }: Props) {
  const [reviews, ratingSummary, userReview, flaggedCount] = await Promise.all([
    getPackageReviews(packageId),
    getPackageRatingSummary(packageId),
    userId ? getUserReview(packageId, userId) : Promise.resolve(null),
    getFlaggedReviewCount(packageId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
        <h2 className="font-display text-lg font-bold text-white mb-2">Avaliações</h2>
        <RatingSummaryHeader avg={ratingSummary.avg} count={ratingSummary.count} />
      </div>

      {userId ? (
        <ReviewForm
          packageId={packageId}
          existingReview={
            userReview
              ? { id: userReview.id, rating: userReview.rating, body: userReview.body }
              : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 text-center">
          <p className="text-sm text-slate-400">
            <Link href="/login" className="text-brand-blue hover:underline font-semibold">
              Faça login
            </Link>{" "}
            para avaliar este pacote.
          </p>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-6">
          Nenhuma avaliação pública ainda.
        </p>
      )}

      {flaggedCount > 0 && (
        <p className="text-xs text-slate-500 text-center">
          {flaggedCount} avaliação{flaggedCount !== 1 ? "ões" : ""} oculta
          {flaggedCount !== 1 ? "s" : ""} por moderação.
        </p>
      )}
    </div>
  );
}
