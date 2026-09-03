-- subscriptions table — records publisher checkout intent and gateway references.
-- Epic 4 / Demand 1/3 — Gateway-agnostic checkout integration.
--
-- A row is inserted ONLY after the gateway call succeeds (validate-first, ADR-020).
-- status='draft' is the initial state; Demand 2/3 (webhook) flips it to 'active'.

CREATE TABLE public.subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id              UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    plan_id                 UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    provider                TEXT NOT NULL,
    external_subscription_id TEXT,
    external_checkout_url   TEXT,
    status                  TEXT NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('pending', 'draft', 'active', 'cancelled', 'expired')),
    sponsorship_ends_at     TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_subscription_updated
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for the publisher's own subscription lookup path.
CREATE INDEX idx_subscriptions_publisher_id ON public.subscriptions (publisher_id);

-- RLS: publishers can only read their own subscriptions.
CREATE POLICY "Publishers can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (publisher_id = auth.uid());

-- RLS: admins have full access.
CREATE POLICY "Admins have full access to subscriptions"
    ON public.subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
