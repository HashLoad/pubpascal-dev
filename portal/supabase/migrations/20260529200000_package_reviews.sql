-- package_reviews table — stores user ratings and reviews for packages.
-- Epic 5 / Demand 1/3 — Reviews + Reputation: schema + RLS + B-Tree index.
--
-- ADR-023: reviewer_id → auth.users (not profiles) for simple auth.uid() RLS checks.
-- body is nullable (rating-only reviews are valid).
-- is_flagged hides reviews from public SELECT without deleting them.

CREATE TABLE public.package_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id      UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body            TEXT,
    is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_package_reviews_user_package UNIQUE (package_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_package_review_updated
    BEFORE UPDATE ON public.package_reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast per-package review lookups (dominant query pattern).
CREATE INDEX idx_package_reviews_package_id ON public.package_reviews (package_id);

-- RLS: public can read non-flagged reviews only.
CREATE POLICY "Public can view non-flagged reviews"
    ON public.package_reviews FOR SELECT
    USING (NOT is_flagged);

-- RLS: authenticated users can insert their own review.
CREATE POLICY "Authenticated users can insert own review"
    ON public.package_reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

-- RLS: reviewers can update their own review (rating and body).
CREATE POLICY "Reviewers can update own review"
    ON public.package_reviews FOR UPDATE
    USING (auth.uid() = reviewer_id);

-- RLS: reviewers can delete their own review.
CREATE POLICY "Reviewers can delete own review"
    ON public.package_reviews FOR DELETE
    USING (auth.uid() = reviewer_id);

-- RLS: admins have full access (needed for Demand 3/3 moderation UI).
CREATE POLICY "Admins have full access to reviews"
    ON public.package_reviews FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
