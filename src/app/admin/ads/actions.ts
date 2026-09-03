"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireAdminOrThrow, isUuid } from "@/utils/queries/admin-submissions";
import { isAdStatus, type AdStatus } from "@/utils/queries/admin-ads-types";

export type AdFormState = { error?: string };

function revalidateAdsViews() {
  revalidatePath("/admin/ads");
  revalidatePath("/admin");
}

type AdPayload = {
  title: string;
  description: string | null;
  banner_url: string;
  target_url: string;
  start_date: string;
  end_date: string;
  status: AdStatus;
};

function parseAdForm(formData: FormData): AdPayload | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const banner_url = String(formData.get("banner_url") ?? "").trim();
  const target_url = String(formData.get("target_url") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "").trim();
  const end_date = String(formData.get("end_date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!title) return { error: "O título é obrigatório." };
  if (!banner_url) return { error: "A URL do banner é obrigatória." };
  if (!target_url) return { error: "A URL de destino é obrigatória." };
  if (!start_date || !end_date) return { error: "Datas de início e fim são obrigatórias." };
  if (start_date > end_date) return { error: "A data de início deve ser anterior ou igual à data de fim." };
  if (!isAdStatus(status)) return { error: "Status inválido." };

  return {
    title,
    description: description.length > 0 ? description : null,
    banner_url,
    target_url,
    start_date,
    end_date,
    status,
  };
}

export async function createAd(
  _prev: AdFormState,
  formData: FormData,
): Promise<AdFormState> {
  await requireAdminOrThrow();

  const parsed = parseAdForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("ads").insert(parsed);
  if (error) {
    console.warn("[admin/ads] create failed", error);
    return { error: "Falha ao criar o anúncio." };
  }

  revalidateAdsViews();
  redirect("/admin/ads");
}

export async function updateAd(
  _prev: AdFormState,
  formData: FormData,
): Promise<AdFormState> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "ID inválido." };

  const parsed = parseAdForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("ads").update(parsed).eq("id", id);
  if (error) {
    console.warn("[admin/ads] update failed", error);
    return { error: "Falha ao atualizar o anúncio." };
  }

  revalidateAdsViews();
  redirect("/admin/ads");
}

export async function toggleAdStatus(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("current") ?? "");
  if (!isUuid(id)) return;
  if (current !== "active" && current !== "paused") return;

  const next: AdStatus = current === "active" ? "paused" : "active";
  const supabase = await createClient();
  const { error } = await supabase.from("ads").update({ status: next }).eq("id", id);
  if (error) {
    console.warn("[admin/ads] toggle failed", error);
    return;
  }
  revalidateAdsViews();
}

export async function deleteAd(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("ads").delete().eq("id", id);
  if (error) {
    console.warn("[admin/ads] delete failed", error);
    return;
  }
  revalidateAdsViews();
}
