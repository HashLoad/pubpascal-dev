"use server";

import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  checkRateLimit,
  clientIpFromForwardedFor,
  partnerApplyIpKey,
} from "@/lib/rate-limit";

const HTTPS_URL_REGEX = /^https:\/\/.+/i;
const CONTROL_CHARS = /[\x00-\x08\x0B-\x1F]/g;

// Form field the Cloudflare Turnstile widget injects with the solved token.
const TURNSTILE_FIELD = "cf-turnstile-response";

export type ApplyValues = {
  name: string;
  cnpj: string;
  area: string;
  logo_url: string;
  website_url: string;
  description: string;
};

export type ApplyState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "invalid"; errors: Record<string, string>; values: ApplyValues }
  | { status: "error"; message: string; values: ApplyValues };

function readValues(formData: FormData): ApplyValues {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    name: get("name"),
    cnpj: get("cnpj"),
    area: get("area"),
    logo_url: get("logo_url"),
    website_url: get("website_url"),
    description: get("description").replace(CONTROL_CHARS, ""),
  };
}

function validateApplication(values: ApplyValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.name.length < 3 || values.name.length > 100) {
    errors.name = "O nome deve ter entre 3 e 100 caracteres.";
  }
  if (!values.cnpj) errors.cnpj = "Informe o CNPJ.";
  if (!values.area) errors.area = "Informe a área de atuação.";
  if (!HTTPS_URL_REGEX.test(values.logo_url)) {
    errors.logo_url = "A URL do logo deve começar com https://.";
  }
  if (!HTTPS_URL_REGEX.test(values.website_url)) {
    errors.website_url = "A URL do site deve começar com https://.";
  }
  if (values.description.length < 20 || values.description.length > 600) {
    errors.description = "A descrição deve ter entre 20 e 600 caracteres.";
  }
  return errors;
}

// Layer 1 — per-IP rate limit (defense in depth, AC-08). Fail-open (BR3): an
// Upstash hiccup never blocks a legitimate applicant. Returns a localized error
// message when over-limit, or null to proceed.
async function checkPartnerApplyRateLimit(
  ip: string,
  dict: { rateLimited: string },
): Promise<string | null> {
  const rate = await checkRateLimit("partner-apply", partnerApplyIpKey(ip));
  return rate.ok ? null : dict.rateLimited;
}

// Layer 2 — server-verify the Cloudflare Turnstile token BEFORE the insert
// (AC-07). Missing/invalid → localized message, null when the challenge passes.
async function verifyPartnerApplyCaptcha(
  formData: FormData,
  ip: string,
  dict: { captchaFailed: string; captchaError: string },
): Promise<string | null> {
  const verdict = await verifyTurnstile(
    formData.get(TURNSTILE_FIELD)?.toString() ?? null,
    ip,
  );
  if (verdict.ok) return null;
  return verdict.reason === "verify-error" ? dict.captchaError : dict.captchaFailed;
}

export async function submitPartnerApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const values = readValues(formData);
  const dict = (await getDictionary(await getRequestLocale())).partners.apply;

  // Platform-normalized client IP for the anti-spam keys (ADR-135 / R3 / A4).
  const ip = clientIpFromForwardedFor(
    (await headers()).get("x-forwarded-for"),
  );

  const rateError = await checkPartnerApplyRateLimit(ip, dict);
  if (rateError) {
    return { status: "error", message: rateError, values };
  }

  // Cheap local validation before consuming the single-use Turnstile token, so
  // a field-error retry does not waste the applicant's solved challenge.
  const errors = validateApplication(values);
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", errors, values };
  }

  const captchaError = await verifyPartnerApplyCaptcha(formData, ip, dict);
  if (captchaError) {
    return { status: "error", message: captchaError, values };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("partners").insert({
      name: values.name,
      cnpj: values.cnpj,
      area: values.area,
      logo_url: values.logo_url,
      website_url: values.website_url,
      description: values.description,
      status: "applied",
      sort_order: 0,
    });

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return {
          status: "invalid",
          errors: { name: "Já existe um parceiro com este nome." },
          values,
        };
      }
      console.warn("[partners/apply] insert failed", error);
      return {
        status: "error",
        message: "Não foi possível enviar sua candidatura agora. Tente novamente em instantes.",
        values,
      };
    }

    return { status: "success" };
  } catch (err) {
    console.warn("[partners/apply] unexpected error", err);
    return {
      status: "error",
      message: "Erro inesperado ao enviar a candidatura.",
      values,
    };
  }
}
