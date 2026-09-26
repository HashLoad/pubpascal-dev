// Server-only — do NOT import from client components.
// Gateway factory: returns the appropriate adapter by provider name.
// ADR-020: unknown provider → error-returning sentinel, no throw.

import type { GatewayProvider, GatewayCheckoutResult } from "./types";
import { asaasGateway } from "./asaas";

const stripeStub: GatewayProvider = {
  createCheckout: async (): Promise<GatewayCheckoutResult> => ({
    error: "Stripe não configurado.",
  }),
};

function unknownProviderSentinel(provider: string): GatewayProvider {
  return {
    createCheckout: async (): Promise<GatewayCheckoutResult> => ({
      error: `Gateway desconhecido: ${provider}`,
    }),
  };
}

export function getGateway(provider: string): GatewayProvider {
  if (provider === "asaas") return asaasGateway;
  if (provider === "stripe") return stripeStub;
  return unknownProviderSentinel(provider);
}
