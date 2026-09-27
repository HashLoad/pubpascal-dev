"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  isHighlightLevel,
  isUuid,
  requireAdminOrThrow,
} from "@/utils/queries/admin-submissions";

function revalidateAdminViews() {
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
}

async function mutatePackage(
  packageId: string,
  patch: Record<string, string>,
): Promise<void> {
  await requireAdminOrThrow();

  if (!isUuid(packageId)) {
    console.warn("[admin/submissions] invalid package id rejected");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("packages")
    .update(patch)
    .eq("id", packageId);

  if (error) {
    console.warn("[admin/submissions] update failed", error);
    return;
  }

  revalidateAdminViews();
}

export async function approveSubmission(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await mutatePackage(id, { status: "active" });
}

export async function rejectSubmission(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await mutatePackage(id, { status: "rejected" });
}

export async function setHighlightLevel(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const level = String(formData.get("level") ?? "");
  if (!isHighlightLevel(level)) {
    console.warn("[admin/submissions] invalid highlight level rejected");
    return;
  }
  await mutatePackage(id, { highlight_level: level });
}
