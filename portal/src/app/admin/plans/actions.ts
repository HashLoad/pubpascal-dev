"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireAdminOrThrow, isUuid } from "@/utils/queries/admin-submissions";
import {
  isPlanTier,
  isBillingCycle,
  type PlanTier,
  type BillingCycle,
} from "@/utils/queries/admin-plans-types";

export type PlanFormState = { error?: string };

function revalidatePlansViews() {
  revalidatePath("/admin/plans");
  revalidatePath("/admin");
}

type PlanPayload = {
  tier: PlanTier;
  billing_cycle: BillingCycle;
  price_cents: number;
  currency: string;
  features: Record<string, unknown>;
  external_price_id: string | null;
  provider: string | null;
  is_active: boolean;
  sort_order: number;
};

function parseFeatures(
  raw: string,
): { features: Record<string, unknown> } | { error: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { features: {} };
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "O campo features deve ser um objeto JSON." };
    }
    return { features: parsed as Record<string, unknown> };
  } catch {
    return { error: "JSON inválido no campo features." };
  }
}

function parsePlanForm(formData: FormData): PlanPayload | { error: string } {
  const tier = String(formData.get("tier") ?? "").trim();
  const billing_cycle = String(formData.get("billing_cycle") ?? "").trim();
  const priceRaw = String(formData.get("price_cents") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const externalPriceId = String(formData.get("external_price_id") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const is_active = formData.get("is_active") === "on";
  const sortRaw = String(formData.get("sort_order") ?? "0").trim();

  if (!isPlanTier(tier)) return { error: "Tier inválido." };
  if (!isBillingCycle(billing_cycle)) return { error: "Ciclo de cobrança inválido." };
  if (!currency) return { error: "A moeda é obrigatória." };

  const price_cents = Number.parseInt(priceRaw, 10);
  if (!Number.isFinite(price_cents) || price_cents < 0) {
    return { error: "Preço (centavos) deve ser um inteiro não negativo." };
  }

  const sort_order = Number.parseInt(sortRaw, 10);
  if (!Number.isFinite(sort_order)) return { error: "Ordem inválida." };

  const featuresResult = parseFeatures(featuresRaw);
  if ("error" in featuresResult) return { error: featuresResult.error };

  return {
    tier,
    billing_cycle,
    price_cents,
    currency,
    features: featuresResult.features,
    external_price_id: externalPriceId.length > 0 ? externalPriceId : null,
    provider: provider.length > 0 ? provider : null,
    is_active,
    sort_order,
  };
}

type PgError = { code?: string };

function isDuplicateError(error: PgError | null): boolean {
  return error?.code === "23505";
}

export async function createPlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  await requireAdminOrThrow();

  const parsed = parsePlanForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("plans").insert(parsed);
  if (error) {
    if (isDuplicateError(error as PgError)) {
      return { error: "Já existe um plano com este tier e ciclo de cobrança." };
    }
    console.warn("[admin/plans] create failed", error);
    return { error: "Falha ao criar o plano." };
  }

  revalidatePlansViews();
  redirect("/admin/plans");
}

export async function updatePlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "ID inválido." };

  const parsed = parsePlanForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("plans").update(parsed).eq("id", id);
  if (error) {
    if (isDuplicateError(error as PgError)) {
      return { error: "Já existe um plano com este tier e ciclo de cobrança." };
    }
    console.warn("[admin/plans] update failed", error);
    return { error: "Falha ao atualizar o plano." };
  }

  revalidatePlansViews();
  redirect("/admin/plans");
}

export async function togglePlanStatus(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("current") ?? "");
  if (!isUuid(id)) return;
  if (current !== "true" && current !== "false") return;

  const next = current !== "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ is_active: next })
    .eq("id", id);
  if (error) {
    console.warn("[admin/plans] toggle failed", error);
    return;
  }
  revalidatePlansViews();
}

export async function deletePlan(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) {
    console.warn("[admin/plans] delete failed", error);
    return;
  }
  revalidatePlansViews();
}
