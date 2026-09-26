// Server-only — do NOT import from client components.
// Asaas gateway adapter using native fetch. ADR-020: no new npm dependency.

import type { GatewayCheckoutInput, GatewayCheckoutResult, GatewayProvider } from "./types";

type AsaasPayload = {
  billingType: string;
  value: number;
  description: string;
  externalReference: string;
  successUrl: string;
  notificationUrl: string;
};

type AsaasResponse = {
  id?: string;
  url?: string;
  [key: string]: unknown;
};

function buildAsaasPayload(input: GatewayCheckoutInput): AsaasPayload {
  const notificationUrl =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/asaas`
      : "https://pubpascal.dev/api/webhooks/asaas";

  return {
    billingType: "UNDEFINED",
    value: input.priceCents / 100,
    description: input.description,
    externalReference: input.planId,
    successUrl: input.successUrl,
    notificationUrl,
  };
}

function parseAsaasResponse(data: AsaasResponse): GatewayCheckoutResult {
  if (!data.id || !data.url) {
    return { error: "Falha ao criar link de pagamento Asaas." };
  }
  return { checkoutUrl: data.url as string, externalId: data.id as string };
}

async function createCheckout(input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
  const apiKey = process.env.ASAAS_API_KEY;
  const baseUrl = process.env.ASAAS_BASE_URL;

  if (!apiKey || !baseUrl) {
    return { error: "Gateway Asaas não configurado." };
  }

  const payload = buildAsaasPayload(input);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/paymentLinks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { error: "Falha ao criar link de pagamento Asaas." };
  }

  if (!response.ok) {
    return { error: "Falha ao criar link de pagamento Asaas." };
  }

  const data: AsaasResponse = await response.json();
  return parseAsaasResponse(data);
}

export const asaasGateway: GatewayProvider = { createCheckout };
