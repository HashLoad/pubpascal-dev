"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireAdminOrThrow, isUuid } from "@/utils/queries/admin-submissions";
import { isPartnerStatus, type PartnerStatus, PARTNER_TIERS, type PartnerTier } from "@/utils/queries/admin-partners-types";

export type PartnerFormState = { error?: string };

function revalidatePartnersViews() {
  revalidatePath("/admin/partners");
  revalidatePath("/admin");
  revalidatePath("/partners");
}

type PartnerPayload = {
  name: string;
  logo_url: string;
  website_url: string;
  description: string | null;
  status: PartnerStatus;
  tier: PartnerTier | null;
  sort_order: number;
};

function parsePartnerForm(formData: FormData): PartnerPayload | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const logo_url = String(formData.get("logo_url") ?? "").trim();
  const website_url = String(formData.get("website_url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const tierRaw = String(formData.get("tier") ?? "").trim();
  const sortRaw = String(formData.get("sort_order") ?? "0").trim();

  if (!name) return { error: "O nome é obrigatório." };
  if (!logo_url) return { error: "A URL do logo é obrigatória." };
  if (!website_url) return { error: "A URL do site é obrigatória." };
  if (!isPartnerStatus(status)) return { error: "Status inválido." };

  const tier: PartnerTier | null = (PARTNER_TIERS as readonly string[]).includes(tierRaw)
    ? (tierRaw as PartnerTier)
    : null;

  const sort_order = Number.parseInt(sortRaw, 10);
  if (!Number.isFinite(sort_order)) return { error: "Ordem inválida." };

  return {
    name,
    logo_url,
    website_url,
    description: description.length > 0 ? description : null,
    status,
    tier,
    sort_order,
  };
}

type PgError = { code?: string; message?: string };

function isDuplicateNameError(error: PgError | null): boolean {
  return error?.code === "23505";
}

export async function createPartner(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  await requireAdminOrThrow();

  const parsed = parsePartnerForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("partners").insert(parsed);
  if (error) {
    if (isDuplicateNameError(error as PgError)) {
      return { error: "Já existe um parceiro com este nome." };
    }
    console.warn("[admin/partners] create failed", error);
    return { error: "Falha ao criar o parceiro." };
  }

  revalidatePartnersViews();
  redirect("/admin/partners");
}

export async function updatePartner(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "ID inválido." };

  const parsed = parsePartnerForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("partners").update(parsed).eq("id", id);
  if (error) {
    if (isDuplicateNameError(error as PgError)) {
      return { error: "Já existe um parceiro com este nome." };
    }
    console.warn("[admin/partners] update failed", error);
    return { error: "Falha ao atualizar o parceiro." };
  }

  revalidatePartnersViews();
  redirect("/admin/partners");
}

export async function togglePartnerStatus(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("current") ?? "");
  if (!isUuid(id)) return;
  if (current !== "active" && current !== "inactive") return;

  const next: PartnerStatus = current === "active" ? "inactive" : "active";
  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({ status: next })
    .eq("id", id);
  if (error) {
    console.warn("[admin/partners] toggle failed", error);
    return;
  }
  revalidatePartnersViews();
}

export async function deletePartner(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) {
    console.warn("[admin/partners] delete failed", error);
    return;
  }
  revalidatePartnersViews();
}
