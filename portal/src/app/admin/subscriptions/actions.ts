"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireAdminOrThrow, isUuid } from "@/utils/queries/admin-submissions";

export type SubscriptionFormState = { error?: string };

function revalidate() {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin");
}

// Duration in months from billing_cycle
function monthsFromCycle(cycle: string): number {
  return cycle === "annual" ? 12 : 1;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function createAdminSubscription(
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  await requireAdminOrThrow();

  const packageId = String(formData.get("package_id") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim();
  const partnerIdRaw = String(formData.get("sponsor_partner_id") ?? "").trim();

  if (!isUuid(packageId)) return { error: "Pacote inválido." };
  if (!isUuid(planId)) return { error: "Plano inválido." };
  const sponsorPartnerId = partnerIdRaw && isUuid(partnerIdRaw) ? partnerIdRaw : null;

  const supabase = await createClient();

  // Resolve plan details
  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, tier, billing_cycle")
    .eq("id", planId)
    .single();
  if (planErr || !plan) return { error: "Plano não encontrado." };

  // Resolve package publisher
  const { data: pkg, error: pkgErr } = await supabase
    .from("packages")
    .select("id, publisher_id, status")
    .eq("id", packageId)
    .single();
  if (pkgErr || !pkg) return { error: "Pacote não encontrado." };
  if (pkg.status !== "active") return { error: "Só é possível destacar pacotes com status active." };

  const endsAt = addMonths(new Date(), monthsFromCycle(plan.billing_cycle));

  // Create subscription
  const { error: subErr } = await supabase.from("subscriptions").insert({
    publisher_id: pkg.publisher_id,
    package_id: pkg.id,
    plan_id: plan.id,
    provider: "manual",
    status: "active",
    sponsorship_ends_at: endsAt.toISOString(),
    ...(sponsorPartnerId ? { sponsor_partner_id: sponsorPartnerId } : {}),
  });
  if (subErr) {
    console.warn("[admin/subscriptions] create failed", subErr);
    return { error: "Falha ao criar a subscription." };
  }

  // Apply highlight to package
  const { error: pkgUpdateErr } = await supabase
    .from("packages")
    .update({
      highlight_level: plan.tier,
      sponsorship_ends_at: endsAt.toISOString(),
    })
    .eq("id", pkg.id);
  if (pkgUpdateErr) {
    console.warn("[admin/subscriptions] package highlight update failed", pkgUpdateErr);
  }

  revalidate();
  redirect("/admin/subscriptions");
}

export async function cancelSubscription(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const id = String(formData.get("id") ?? "").trim();
  if (!isUuid(id)) return;

  const supabase = await createClient();

  // Set status=cancelled; highlight_level preserved until sponsorship_ends_at (RN-006)
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["active", "grace"]);

  if (error) {
    console.warn("[admin/subscriptions] cancel failed", error);
    return;
  }

  revalidate();
}
