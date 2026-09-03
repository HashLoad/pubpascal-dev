"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type ReviewActionState = { error?: string } | null;

const BANNED_MESSAGE = "Você está impedido de publicar ou alterar avaliações.";

async function isBannedFromReviews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_banned_from_reviews")
    .eq("id", userId)
    .single();
  return data?.is_banned_from_reviews === true;
}

function isValidRating(value: unknown): value is number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

type ParsedSubmit =
  | { ok: true; packageId: string; reviewId: string; rating: number; body: string | null }
  | { ok: false; error: string };

function parseSubmitFormData(formData: FormData): ParsedSubmit {
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();

  if (!isValidRating(rating)) return { ok: false, error: "Avaliação inválida. Selecione de 1 a 5 estrelas." };
  if (body.length > 2000) return { ok: false, error: "Comentário deve ter no máximo 2000 caracteres." };

  return { ok: true, packageId, reviewId, rating, body: body || null };
}

export async function submitReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Login necessário." };
  if (await isBannedFromReviews(supabase, user.id)) return { error: BANNED_MESSAGE };

  const parsed = parseSubmitFormData(formData);
  if (!parsed.ok) return { error: parsed.error };

  if (parsed.reviewId) {
    return updateReview(supabase, parsed.reviewId, user.id, parsed.packageId, parsed.rating, parsed.body);
  }

  return insertReview(supabase, parsed.packageId, user.id, parsed.rating, parsed.body);
}

async function updateReview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reviewId: string,
  userId: string,
  packageId: string,
  rating: number,
  body: string | null,
): Promise<ReviewActionState> {
  const { error, count } = await supabase
    .from("package_reviews")
    .update({ rating, body, updated_at: new Date().toISOString() })
    .eq("id", reviewId)
    .eq("reviewer_id", userId);

  if (error) return { error: "Erro ao atualizar avaliação. Tente novamente." };
  if (count === 0) return { error: "Avaliação não encontrada." };

  revalidatePath(`/packages`);
  revalidatePath(`/`);
  return null;
}

async function insertReview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  userId: string,
  rating: number,
  body: string | null,
): Promise<ReviewActionState> {
  const { error } = await supabase.from("package_reviews").insert({
    package_id: packageId,
    reviewer_id: userId,
    rating,
    body,
  });

  if (error) {
    if (error.code === "23505") return { error: "Você já avaliou este pacote." };
    return { error: "Erro ao enviar avaliação. Tente novamente." };
  }

  revalidatePath(`/packages`);
  revalidatePath(`/`);
  return null;
}

export async function deleteReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Login necessário." };
  if (await isBannedFromReviews(supabase, user.id)) return { error: BANNED_MESSAGE };

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!reviewId) return { error: "ID da avaliação inválido." };

  const { error } = await supabase
    .from("package_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("reviewer_id", user.id);

  if (error) return { error: "Erro ao excluir avaliação. Tente novamente." };

  revalidatePath(`/packages`);
  revalidatePath(`/`);
  return null;
}
