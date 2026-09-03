"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  PLATFORM_ALLOWLIST,
  LANGUAGE_ALLOWLIST,
  CATEGORY_ALLOWLIST,
  EDITABLE_LICENSE_TYPES,
  type MyPackageEditable,
} from "@/utils/queries/publisher-packages-types";
import { updateMyPackage, type EditFormState } from "./actions";
import MarkdownEditor from "@/components/MarkdownEditor";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type DashboardDict = Dictionary["dashboard"];
type MarkdownLabels = Dictionary["markdownEditor"];

const labelClass =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";
const inputClass =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none";

export function PackageEditForm({
  pkg,
  dict,
  markdownLabels,
}: {
  pkg: MyPackageEditable;
  dict: DashboardDict;
  markdownLabels: MarkdownLabels;
}) {
  const [state, formAction, pending] = useActionState<EditFormState, FormData>(
    updateMyPackage,
    {},
  );
  const e = dict.edit;
  const licenseLabel: Record<string, string> = {
    open_source: e.licenseOpenSource,
    commercial: e.licenseCommercial,
  };

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      <input type="hidden" name="id" value={pkg.id} />

      <div className="rounded-lg border border-slate-850 bg-slate-950/60 px-4 py-3">
        <p className="text-sm font-semibold text-white">{pkg.name}</p>
        <p className="text-xs font-mono text-slate-500 mt-0.5 break-all">
          {pkg.repository_url}
        </p>
        <p className="text-[11px] text-slate-600 mt-1">{e.notEditable}</p>
      </div>

      <div>
        <label htmlFor="publisher_name" className={labelClass}>{e.publisherNameLabel}</label>
        <input
          id="publisher_name"
          name="publisher_name"
          type="text"
          maxLength={60}
          defaultValue={pkg.publisher_display_name ?? ""}
          placeholder={e.publisherNamePlaceholder}
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-slate-600">{e.publisherNameHelp}</p>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>{e.descriptionLabel} *</label>
        <MarkdownEditor
          name="description"
          required
          minLength={20}
          maxLength={2000}
          rows={6}
          defaultValue={pkg.description ?? ""}
          placeholder={e.descriptionPlaceholder}
          labels={markdownLabels}
        />
      </div>

      <div>
        <label htmlFor="website_url" className={labelClass}>{e.websiteLabel}</label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          defaultValue={pkg.website_url ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="funding_url" className={labelClass}>{e.fundingLabel}</label>
        <input
          id="funding_url"
          name="funding_url"
          type="url"
          defaultValue={pkg.funding_url ?? ""}
          placeholder={e.fundingPlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="screenshots" className={labelClass}>{e.screenshotsLabel}</label>
        <textarea
          id="screenshots"
          name="screenshots"
          rows={3}
          defaultValue={pkg.screenshots.join("\n")}
          placeholder={e.screenshotsPlaceholder}
          className={`${inputClass} font-mono`}
        />
        <p className="mt-1 text-[11px] text-slate-600">{e.screenshotsHelp}</p>
      </div>

      <div>
        <label htmlFor="example" className={labelClass}>{e.exampleLabel}</label>
        <textarea
          id="example"
          name="example"
          rows={5}
          maxLength={8000}
          defaultValue={pkg.example ?? ""}
          placeholder={e.examplePlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="installing" className={labelClass}>{e.installingLabel}</label>
        <textarea
          id="installing"
          name="installing"
          rows={5}
          maxLength={8000}
          defaultValue={pkg.installing ?? ""}
          placeholder={e.installingPlaceholder}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="license_type" className={labelClass}>{e.licenseTypeLabel} *</label>
          <select
            id="license_type"
            name="license_type"
            required
            defaultValue={pkg.license_type}
            className={inputClass}
          >
            {EDITABLE_LICENSE_TYPES.map((t) => (
              <option key={t} value={t}>{licenseLabel[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="license_name" className={labelClass}>{e.licenseNameLabel} *</label>
          <input
            id="license_name"
            name="license_name"
            type="text"
            required
            defaultValue={pkg.license_name}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>{e.platformsLegend} *</legend>
        <div className="flex flex-wrap gap-3">
          {PLATFORM_ALLOWLIST.map((p) => (
            <label key={p} className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="platforms"
                value={p}
                defaultChecked={pkg.platforms.includes(p)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-brand-red focus:ring-brand-red"
              />
              {p}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>{e.languagesLegend} *</legend>
        <div className="flex flex-wrap gap-3">
          {LANGUAGE_ALLOWLIST.map((l) => (
            <label key={l} className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="languages"
                value={l}
                defaultChecked={pkg.languages.includes(l)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-brand-red focus:ring-brand-red"
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>{e.categoriesLegend} *</legend>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_ALLOWLIST.map((c) => (
            <label key={c} className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="categories"
                value={c}
                defaultChecked={pkg.categories.includes(c)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-brand-red focus:ring-brand-red"
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="border-t border-slate-850 pt-5">
        <label htmlFor="deprecated_message" className={labelClass}>
          {e.deprecatedLabel}
        </label>
        <textarea
          id="deprecated_message"
          name="deprecated_message"
          rows={2}
          maxLength={280}
          defaultValue={pkg.deprecated_message ?? ""}
          placeholder={e.deprecatedPlaceholder}
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-slate-600">{e.deprecatedHelp}</p>
      </div>

      <div>
        <label htmlFor="yanked_versions" className={labelClass}>{e.yankedLabel}</label>
        <textarea
          id="yanked_versions"
          name="yanked_versions"
          rows={2}
          defaultValue={pkg.yanked_versions.join("\n")}
          placeholder={e.yankedPlaceholder}
          className={`${inputClass} font-mono`}
        />
        <p className="mt-1 text-[11px] text-slate-600">{e.yankedHelp}</p>
      </div>

      {state.error ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
        >
          {pending ? e.saving : e.save}
        </button>
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          {e.cancel}
        </Link>
      </div>
    </form>
  );
}
