-- Adds sponsor_partner_id to subscriptions for third-party sponsorships.
-- RN-013: a partner (e.g. Embarcadero) can pay for highlight on a community package.
-- Nullable: NULL = publisher self-sponsors (existing behaviour).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS sponsor_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_sponsor_partner
  ON public.subscriptions (sponsor_partner_id)
  WHERE sponsor_partner_id IS NOT NULL;
