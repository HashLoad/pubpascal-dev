-- Plans table — sponsorship tiers (Planos de Destaque) for Epic 2 / Demand 4/4.
--
-- Data foundation for Epic 3 (publisher self-service sponsorship selection) and
-- Epic 4 (payment gateway integration). This migration only creates the table,
-- its RLS policies, and the updated_at trigger. No payment wiring.

CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL',
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    external_price_id TEXT,
    provider TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT plans_tier_cycle_unique UNIQUE (tier, billing_cycle)
);

-- Enable RLS on plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_plan_updated
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for the public catalog read path (active plans, ordered).
CREATE INDEX idx_plans_active_order ON public.plans (is_active, sort_order);

-- RLS Policies
CREATE POLICY "Active plans are viewable by everyone"
    ON public.plans FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins have full access to plans"
    ON public.plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
