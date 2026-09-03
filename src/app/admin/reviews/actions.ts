"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrThrow, isUuid } from "@/utils/queries/admin-submissions";
import {
  flagReview,
  unflagReview,
  deleteAdminReview,
  banUserFromReviews,
  unbanUserFromReviews,
} from "@/utils/queries/admin-reviews";

function revalidateReviewsViews() {
  revalidatePath("/admin/reviews");
  revalidatePath("/packages");
  revalidatePath("/");
}

export async function flagReviewAction(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  await flagReview(id);
  revalidateReviewsViews();
}

export async function unflagReviewAction(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  await unflagReview(id);
  revalidateReviewsViews();
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  await deleteAdminReview(id);
  revalidateReviewsViews();
}

export async function banUserAction(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const userId = String(formData.get("userId") ?? "");
  if (!isUuid(userId)) return;
  await banUserFromReviews(userId);
  revalidateReviewsViews();
}

export async function unbanUserAction(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const userId = String(formData.get("userId") ?? "");
  if (!isUuid(userId)) return;
  await unbanUserFromReviews(userId);
  revalidateReviewsViews();
}
