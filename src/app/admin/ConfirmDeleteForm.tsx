"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  id: string;
  message: string;
  children?: ReactNode;
};

export function ConfirmDeleteForm({ action, id, message, children }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {children ?? "Excluir"}
      </button>
    </form>
  );
}
