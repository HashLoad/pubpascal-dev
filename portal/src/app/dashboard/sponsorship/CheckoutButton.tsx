"use client";

import { useActionState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { startCheckout, type CheckoutState } from "./actions";

export function CheckoutButton({ planId }: { planId: string }) {
  const [state, formAction, isPending] = useActionState<CheckoutState, FormData>(
    startCheckout,
    null,
  );

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="planId" value={planId} />
        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          {isPending ? "Aguarde…" : "Contratar"}
        </button>
      </form>
      {state?.error && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
