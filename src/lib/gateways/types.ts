// Server-only — do NOT import from client components.
// ADR-020: gateway adapter pattern with discriminated result type.

export type GatewayCheckoutInput = {
  planId: string;
  priceId: string;
  priceCents: number;
  currency: string;
  provider: string;
  publisherId: string;
  successUrl: string;
  failureUrl: string;
  description: string;
};

export type GatewayCheckoutResult =
  | { checkoutUrl: string; externalId: string }
  | { error: string };

export interface GatewayProvider {
  createCheckout(input: GatewayCheckoutInput): Promise<GatewayCheckoutResult>;
}
