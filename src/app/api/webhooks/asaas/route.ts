// Server-only — do NOT import from client components.
// Asaas payment webhook handler. ADR-021.
// Validates the incoming token, dispatches on payment events, and updates
// subscriptions + packages on PAYMENT_RECEIVED / PAYMENT_CONFIRMED.

import { NextResponse } from "next/server";
import { validateAsaasToken, computeSponsorshipEnd, tierToHighlightLevel } from "@/lib/webhooks/asaas";
import { getSubscriptionByExternalId, type SubscriptionWithPlan } from "@/utils/queries/subscriptions";
import { createServiceClient } from "@/utils/supabase/service";

export const dynamic = "force-dynamic";

type AsaasWebhookBody = {
  event?: string;
  payment?: {
    id?: string;
    externalReference?: string;
    paymentLink?: { id?: string };
  };
};

const HANDLED_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!validateAsaasToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = (await request.json()) as AsaasWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const event = body.event ?? "";

  if (!HANDLED_EVENTS.has(event)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const externalId =
    body.payment?.paymentLink?.id ?? body.payment?.externalReference ?? null;

  if (!externalId) {
    console.warn("[asaas-webhook] No externalId found in payload");
    return NextResponse.json({ ok: true });
  }

  const subscription = await getSubscriptionByExternalId(externalId);

  if (!subscription) {
    console.warn(`[asaas-webhook] No subscription found for externalId: ${externalId}`);
    return NextResponse.json({ ok: true });
  }

  await processPaymentSuccess(subscription);

  return NextResponse.json({ ok: true });
}

async function processPaymentSuccess(subscription: SubscriptionWithPlan): Promise<void> {
  const supabase = createServiceClient();
  const endsAt = computeSponsorshipEnd(subscription.billing_cycle);
  const level = tierToHighlightLevel(subscription.plan_tier);

  await supabase
    .from("subscriptions")
    .update({ status: "active", sponsorship_ends_at: endsAt.toISOString() })
    .eq("id", subscription.id);

  if (subscription.package_id !== null) {
    await supabase
      .from("packages")
      .update({ highlight_level: level, sponsorship_ends_at: endsAt.toISOString() })
      .eq("id", subscription.package_id);
  } else {
    await supabase
      .from("packages")
      .update({ highlight_level: level, sponsorship_ends_at: endsAt.toISOString() })
      .eq("publisher_id", subscription.publisher_id)
      .eq("status", "active");
  }
}
