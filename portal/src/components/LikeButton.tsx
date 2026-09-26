"use client";

import React from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Heart } from "lucide-react";
import { toggleLike } from "@/app/[lang]/packages/[slug]/actions";

export type LikeLabels = {
  like: string;
  liked: string;
  likesCount: string;
  signInToLike: string;
  likesLabel: string;
};

type Props = {
  packageId: string;
  liked: boolean;
  count: number;
  isAuthenticated: boolean;
  dict: LikeLabels;
};

function countLabel(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

function SubmitButton({ liked, count, dict }: { liked: boolean; count: number; dict: LikeLabels }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={liked}
      title={countLabel(dict.likesCount, count)}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
        liked
          ? "border-brand-red/40 bg-brand-red/10 text-brand-red hover:bg-brand-red/20"
          : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-brand-red/40 hover:text-white"
      }`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      <span>{liked ? dict.liked : dict.like}</span>
      <span className="text-slate-500">·</span>
      <span>{count}</span>
    </button>
  );
}

export default function LikeButton({ packageId, liked, count, isAuthenticated, dict }: Props) {
  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        title={countLabel(dict.likesCount, count)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-brand-red/40 hover:text-white"
      >
        <Heart className="h-4 w-4" />
        <span>{dict.signInToLike}</span>
        <span className="text-slate-500">·</span>
        <span>{count}</span>
      </Link>
    );
  }

  return (
    <form action={toggleLike}>
      <input type="hidden" name="packageId" value={packageId} />
      <SubmitButton liked={liked} count={count} dict={dict} />
    </form>
  );
}
