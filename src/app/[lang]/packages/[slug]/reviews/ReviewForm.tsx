"use client";

import React, { useActionState } from "react";
import { submitReview, deleteReview, type ReviewActionState } from "./actions";

type ExistingReview = {
  id: string;
  rating: number;
  body: string | null;
};

type Props = {
  packageId: string;
  existingReview?: ExistingReview;
};

function StarRadio({
  value,
  defaultChecked,
}: {
  value: number;
  defaultChecked: boolean;
}) {
  return (
    <>
      <input
        type="radio"
        id={`star-${value}`}
        name="rating"
        value={String(value)}
        defaultChecked={defaultChecked}
        className="sr-only peer"
        required
      />
      <label
        htmlFor={`star-${value}`}
        className="text-2xl cursor-pointer text-slate-600 peer-checked:text-amber-400 hover:text-amber-300 transition-colors"
        aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
      >
        ★
      </label>
    </>
  );
}

export default function ReviewForm({ packageId, existingReview }: Props) {
  const [submitState, submitAction, isSubmitPending] = useActionState<ReviewActionState, FormData>(
    submitReview,
    null,
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState<ReviewActionState, FormData>(
    deleteReview,
    null,
  );

  const isEditing = Boolean(existingReview);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
      <h3 className="font-display text-base font-bold text-white mb-4">
        {isEditing ? "Sua avaliação" : "Avaliar este pacote"}
      </h3>

      <form action={submitAction} className="flex flex-col gap-4">
        <input type="hidden" name="packageId" value={packageId} />
        {existingReview && (
          <input type="hidden" name="reviewId" value={existingReview.id} />
        )}

        <fieldset className="flex flex-row-reverse justify-end gap-1">
          <legend className="sr-only">Selecione uma nota de 1 a 5 estrelas</legend>
          {[5, 4, 3, 2, 1].map((v) => (
            <StarRadio
              key={v}
              value={v}
              defaultChecked={existingReview?.rating === v}
            />
          ))}
        </fieldset>

        <textarea
          name="body"
          rows={4}
          maxLength={2000}
          defaultValue={existingReview?.body ?? ""}
          placeholder="Escreva um comentário (opcional)..."
          className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-red focus:outline-none resize-none"
        />

        {submitState?.error && (
          <p className="text-sm text-red-400" role="alert">
            {submitState.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors self-start"
        >
          {isSubmitPending && (
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {isEditing ? "Atualizar avaliação" : "Avaliar"}
        </button>
      </form>

      {existingReview && (
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!window.confirm("Excluir sua avaliação?")) e.preventDefault();
          }}
          className="mt-3"
        >
          <input type="hidden" name="reviewId" value={existingReview.id} />
          <button
            type="submit"
            disabled={isDeletePending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-red-500 hover:text-red-400 disabled:opacity-60 transition-colors"
          >
            {isDeletePending && (
              <span className="h-4 w-4 border-2 border-slate-400/40 border-t-slate-300 rounded-full animate-spin" />
            )}
            Excluir
          </button>
          {deleteState?.error && (
            <p className="text-sm text-red-400 mt-1" role="alert">
              {deleteState.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
