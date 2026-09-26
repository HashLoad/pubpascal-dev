"use client";

import { useActionState } from "react";
import { useLang } from "@/utils/use-lang";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Script from "next/script";
import { CheckCircle, Send, Loader2 } from "lucide-react";
import {
  submitPartnerApplication,
  type ApplyState,
  type ApplyValues,
} from "./actions";

const EMPTY: ApplyValues = {
  name: "",
  cnpj: "",
  area: "",
  logo_url: "",
  website_url: "",
  description: "",
};

const INITIAL: ApplyState = { status: "idle" };

// Cloudflare Turnstile widget script (implicit rendering: it auto-mounts every
// `.cf-turnstile` element and injects a hidden `cf-turnstile-response` input
// into the enclosing form, which the server action then verifies — ESP-002).
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function valuesFromState(state: ApplyState): ApplyValues {
  if (state.status === "invalid" || state.status === "error") return state.values;
  return EMPTY;
}

function errorFor(state: ApplyState, field: string): string | null {
  return state.status === "invalid" ? state.errors[field] ?? null : null;
}

const labelClass =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";

function fieldClass(hasError: boolean): string {
  return `w-full rounded-md border bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${
    hasError
      ? "border-rose-500/60 focus:border-rose-500/60"
      : "border-slate-800 hover:border-slate-700 focus:border-brand-red"
  }`;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-rose-400">{message}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Enviar candidatura
        </>
      )}
    </button>
  );
}

export function PartnerApplyForm() {
  const lang = useLang();
  const [state, formAction] = useActionState<ApplyState, FormData>(
    submitPartnerApplication,
    INITIAL,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-4" />
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          Candidatura enviada
        </h2>
        <p className="text-slate-300 leading-relaxed">
          Recebemos sua candidatura de parceria. Nossa equipe vai analisar e
          entrar em contato. Obrigado pelo interesse!
        </p>
        <Link
          href={`/${lang}/partners`}
          className="mt-6 inline-block text-sm text-brand-red hover:underline"
        >
          ← Voltar aos parceiros
        </Link>
      </div>
    );
  }

  const values = valuesFromState(state);

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className={labelClass}>Nome da empresa *</label>
        <input id="name" name="name" type="text" required defaultValue={values.name} className={fieldClass(!!errorFor(state, "name"))} />
        <FieldError message={errorFor(state, "name")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cnpj" className={labelClass}>CNPJ *</label>
          <input id="cnpj" name="cnpj" type="text" required defaultValue={values.cnpj} className={fieldClass(!!errorFor(state, "cnpj"))} />
          <FieldError message={errorFor(state, "cnpj")} />
        </div>
        <div>
          <label htmlFor="area" className={labelClass}>Área de atuação *</label>
          <input id="area" name="area" type="text" required defaultValue={values.area} className={fieldClass(!!errorFor(state, "area"))} />
          <FieldError message={errorFor(state, "area")} />
        </div>
      </div>

      <div>
        <label htmlFor="logo_url" className={labelClass}>URL do logo (https) *</label>
        <input id="logo_url" name="logo_url" type="url" required defaultValue={values.logo_url} className={fieldClass(!!errorFor(state, "logo_url"))} />
        <FieldError message={errorFor(state, "logo_url")} />
      </div>

      <div>
        <label htmlFor="website_url" className={labelClass}>URL do site (https) *</label>
        <input id="website_url" name="website_url" type="url" required defaultValue={values.website_url} className={fieldClass(!!errorFor(state, "website_url"))} />
        <FieldError message={errorFor(state, "website_url")} />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>Descrição *</label>
        <textarea id="description" name="description" rows={4} required defaultValue={values.description} className={fieldClass(!!errorFor(state, "description"))} />
        <FieldError message={errorFor(state, "description")} />
      </div>

      {TURNSTILE_SITE_KEY ? (
        <div>
          <Script src={TURNSTILE_SCRIPT} async defer />
          <div
            className="cf-turnstile"
            data-sitekey={TURNSTILE_SITE_KEY}
            data-theme="dark"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton />
        <Link href={`/${lang}/partners`} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
