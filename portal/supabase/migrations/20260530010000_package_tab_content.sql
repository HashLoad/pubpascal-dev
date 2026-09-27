-- package_tab_content table — stores publisher-authored markdown for detail-page tabs.
-- Epic 9 / Demand 6/6 — Curated tab content (Example + Installing forms).
--
-- ADR-035: a 1:1 satellite table (NOT new columns on `packages`) so an
-- operator-deferred migration degrades gracefully — `PACKAGE_SELECT`, `getMyPackageById`,
-- and the publish insert stay untouched, mirroring package_reviews / package_likes.
-- Curated content renders first in its tab; the existing git fetch stays as fallback.
-- One row per package (package_id PK). Both fields nullable: a package with neither
-- behaves exactly as today.

CREATE TABLE public.package_tab_content (
    package_id      UUID PRIMARY KEY REFERENCES public.packages(id) ON DELETE CASCADE,
    example         TEXT,
    installing      TEXT,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.package_tab_content ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_package_tab_content_updated
    BEFORE UPDATE ON public.package_tab_content
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: public can read curated content for active packages only.
CREATE POLICY "Public can view active package tab content"
    ON public.package_tab_content FOR SELECT
    USING (
        package_id IN (
            SELECT id FROM public.packages WHERE status = 'active'
        )
    );

-- RLS: package owners can insert curated content for their own packages.
CREATE POLICY "Owners can insert own tab content"
    ON public.package_tab_content FOR INSERT
    WITH CHECK (
        package_id IN (
            SELECT id FROM public.packages WHERE publisher_id = auth.uid()
        )
    );

-- RLS: package owners can update curated content for their own packages.
CREATE POLICY "Owners can update own tab content"
    ON public.package_tab_content FOR UPDATE
    USING (
        package_id IN (
            SELECT id FROM public.packages WHERE publisher_id = auth.uid()
        )
    );

-- RLS: admins have full access (consistent with package_reviews moderation).
CREATE POLICY "Admins have full access to tab content"
    ON public.package_tab_content FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- No DELETE policy: rows are cleaned up by the ON DELETE CASCADE from packages.
