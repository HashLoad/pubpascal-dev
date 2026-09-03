"use client";

import React, { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useLang } from "@/utils/use-lang";
import { AlertTriangle, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";
import { submitPackage, type SubmitState, type SubmittedValues } from "@/app/publish/actions";
import {
  PLATFORM_ALLOWLIST,
  LANGUAGE_ALLOWLIST,
  CATEGORY_ALLOWLIST,
} from "@/app/[lang]/packages/searchParams";
import MarkdownEditor from "@/components/MarkdownEditor";
import { getReadmeOutcome } from "@/lib/publish-validation";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type PublishDict = Dictionary["publish"];
type MarkdownLabels = Dictionary["markdownEditor"];
type ValidationDict = Dictionary["publishValidation"];

// Outcome → success-panel README-block styling. Only pass/warn/fail can surface.
const README_RESULT: Record<
  "pass" | "warn" | "fail",
  { cls: string; Icon: typeof CheckCircle }
> = {
  pass: { cls: "border-green-500/30 bg-green-500/10 text-green-300", Icon: CheckCircle },
  warn: { cls: "border-amber-400/30 bg-amber-400/10 text-amber-300", Icon: AlertTriangle },
  fail: { cls: "border-rose-500/30 bg-rose-500/10 text-rose-300", Icon: XCircle },
};

function ReadmeOutcomeBlock({
  state,
  validationDict,
}: {
  state: Extract<SubmitState, { status: "success" }>;
  validationDict: ValidationDict;
}) {
  const outcome = getReadmeOutcome(state.validation);
  if (outcome !== "pass" && outcome !== "warn" && outcome !== "fail") return null;
  const { cls, Icon } = README_RESULT[outcome];
  return (
    <div className={`mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 ${cls}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold">{validationDict.readmeTitle}</p>
        <p className="mt-0.5 opacity-90">{validationDict.readme[outcome]}</p>
      </div>
    </div>
  );
}

const EMPTY_VALUES: SubmittedValues = {
  name: "",
  publisher_name: "",
  description: "",
  repository_url: "",
  license_type: "",
  license_name: "",
  website_url: "",
  platforms: [],
  languages: [],
  categories: [],
  example: "",
  installing: "",
};

const INITIAL_STATE: SubmitState = { status: "idle" };

function valuesFromState(state: SubmitState): SubmittedValues {
  if (state.status === "invalid" || state.status === "db_error") return state.values;
  return EMPTY_VALUES;
}

function errorFor(state: SubmitState, field: string): string | null {
  return state.status === "invalid" ? state.errors[field] ?? null : null;
}

function fieldClass(hasError: boolean): string {
  return `w-full bg-slate-900 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500/60"
      : "border-slate-800 focus:ring-brand-red/40 focus:border-brand-red/40"
  }`;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-400">{message}</p>;
}

function SubmitButton({ idle, pendingLabel }: { idle: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red hover:bg-brand-red-dark text-white font-bold text-sm px-4 py-3 shadow-lg shadow-brand-red/20 transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-brand-red/50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          <span>{idle}</span>
        </>
      )}
    </button>
  );
}

export default function PackageSubmitForm({
  defaultDisplayName = "",
  dict,
  markdownLabels,
  validationDict,
}: {
  defaultDisplayName?: string;
  dict: PublishDict;
  markdownLabels: MarkdownLabels;
  validationDict: ValidationDict;
}) {
  const lang = useLang();
  const [state, formAction] = useActionState(submitPackage, INITIAL_STATE);
  const f = dict.form;

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-green-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold text-white mb-1">
              {dict.success.title}
            </h2>
            <p className="text-sm text-slate-300">
              {dict.success.idLabel}{" "}
              <code className="font-mono text-green-300">{state.slug}</code>
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {dict.success.statusNotePrefix} <strong>pending</strong>{" "}
              {dict.success.statusNoteSuffix}
            </p>
            <ReadmeOutcomeBlock state={state} validationDict={validationDict} />
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/${lang}/packages/${state.slug}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
              >
                {dict.success.viewPackage}
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark transition-colors"
              >
                {dict.success.submitAnother}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const values = valuesFromState(state);
  const banner =
    state.status === "unauthorized"
      ? dict.banner.unauthorized
      : state.status === "db_error"
        ? state.message
        : null;

  return (
    <form action={formAction} className="space-y-6">
      {banner && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <span>{banner}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={80}
          defaultValue={values.name}
          placeholder={f.namePlaceholder}
          className={fieldClass(!!errorFor(state, "name"))}
        />
        <FieldError message={errorFor(state, "name")} />
      </div>

      <div>
        <label
          htmlFor="publisher_name"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.publisherNameLabel}
        </label>
        <input
          id="publisher_name"
          name="publisher_name"
          type="text"
          maxLength={60}
          defaultValue={values.publisher_name || defaultDisplayName}
          placeholder={f.publisherNamePlaceholder}
          className={fieldClass(!!errorFor(state, "publisher_name"))}
        />
        <p className="mt-1 text-xs text-slate-500">{f.publisherNameHelp}</p>
        <FieldError message={errorFor(state, "publisher_name")} />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.descriptionLabel}
        </label>
        <MarkdownEditor
          name="description"
          required
          minLength={20}
          maxLength={2000}
          rows={6}
          defaultValue={values.description}
          placeholder={f.descriptionPlaceholder}
          hasError={!!errorFor(state, "description")}
          labels={markdownLabels}
        />
        <FieldError message={errorFor(state, "description")} />
      </div>

      <div>
        <label
          htmlFor="repository_url"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.repositoryUrlLabel}
        </label>
        <input
          id="repository_url"
          name="repository_url"
          type="url"
          required
          defaultValue={values.repository_url}
          placeholder={f.repositoryUrlPlaceholder}
          className={fieldClass(!!errorFor(state, "repository_url"))}
        />
        <p className="mt-1 text-xs text-slate-500">{f.repositoryUrlHelp}</p>
        <FieldError message={errorFor(state, "repository_url")} />
      </div>

      <fieldset>
        <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {f.licenseTypeLegend}
        </legend>
        <div className="flex flex-wrap gap-4">
          {[
            { value: "open_source", label: f.licenseOpenSource },
            { value: "commercial", label: f.licenseCommercial },
          ].map((opt) => (
            <label
              key={opt.value}
              className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer"
            >
              <input
                type="radio"
                name="license_type"
                value={opt.value}
                required
                defaultChecked={values.license_type === opt.value}
                className="h-4 w-4 accent-brand-red"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <FieldError message={errorFor(state, "license_type")} />
      </fieldset>

      <div>
        <label
          htmlFor="license_name"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.licenseNameLabel}
        </label>
        <input
          id="license_name"
          name="license_name"
          type="text"
          required
          maxLength={60}
          defaultValue={values.license_name}
          placeholder={f.licenseNamePlaceholder}
          className={fieldClass(!!errorFor(state, "license_name"))}
        />
        <FieldError message={errorFor(state, "license_name")} />
      </div>

      <div>
        <label
          htmlFor="website_url"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.websiteUrlLabel}
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          defaultValue={values.website_url}
          placeholder={f.websiteUrlPlaceholder}
          className={fieldClass(!!errorFor(state, "website_url"))}
        />
        <FieldError message={errorFor(state, "website_url")} />
      </div>

      <div>
        <label
          htmlFor="example"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.exampleLabel}
        </label>
        <textarea
          id="example"
          name="example"
          maxLength={8000}
          rows={5}
          defaultValue={values.example}
          placeholder={f.examplePlaceholder}
          className={fieldClass(!!errorFor(state, "example"))}
        />
        <FieldError message={errorFor(state, "example")} />
      </div>

      <div>
        <label
          htmlFor="installing"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
        >
          {f.installingLabel}
        </label>
        <textarea
          id="installing"
          name="installing"
          maxLength={8000}
          rows={5}
          defaultValue={values.installing}
          placeholder={f.installingPlaceholder}
          className={fieldClass(!!errorFor(state, "installing"))}
        />
        <FieldError message={errorFor(state, "installing")} />
      </div>

      <fieldset>
        <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {f.platformsLegend}
        </legend>
        <div className="flex flex-wrap gap-3">
          {PLATFORM_ALLOWLIST.map((p) => (
            <label
              key={p}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 cursor-pointer hover:border-slate-700"
            >
              <input
                type="checkbox"
                name="platforms"
                value={p}
                defaultChecked={values.platforms.includes(p)}
                className="h-4 w-4 accent-brand-red"
              />
              <span>{p}</span>
            </label>
          ))}
        </div>
        <FieldError message={errorFor(state, "platforms")} />
      </fieldset>

      <fieldset>
        <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {f.languagesLegend}
        </legend>
        <div className="flex flex-wrap gap-3">
          {LANGUAGE_ALLOWLIST.map((l) => (
            <label
              key={l}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 cursor-pointer hover:border-slate-700"
            >
              <input
                type="checkbox"
                name="languages"
                value={l}
                defaultChecked={values.languages.includes(l)}
                className="h-4 w-4 accent-brand-red"
              />
              <span>{l}</span>
            </label>
          ))}
        </div>
        <FieldError message={errorFor(state, "languages")} />
      </fieldset>

      <fieldset>
        <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {f.categoriesLegend}
        </legend>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_ALLOWLIST.map((c) => (
            <label
              key={c}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 cursor-pointer hover:border-slate-700"
            >
              <input
                type="checkbox"
                name="categories"
                value={c}
                defaultChecked={values.categories.includes(c)}
                className="h-4 w-4 accent-brand-red"
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
        <FieldError message={errorFor(state, "categories")} />
      </fieldset>

      <SubmitButton idle={f.submitIdle} pendingLabel={f.submitPending} />
    </form>
  );
}
