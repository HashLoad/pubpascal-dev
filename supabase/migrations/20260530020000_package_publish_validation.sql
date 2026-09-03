-- package_publish_validation table — stores the publish-time validation report.
-- Epic 1 / Demand 1/2 — Extensible validation core fired on publish (ESP-002).
--
-- ADR-041: a 1:1 satellite table (NOT a new column on `packages`) so an
-- operator-deferred migration degrades gracefully — `PACKAGE_SELECT`, the publish
-- insert, and every existing query stay untouched, mirroring package_likes /
-- package_tab_content. It also decouples the publish-time verdict from the
-- Esteira-owned `packages.validation_report`, which the scheduled sync clobbers
-- on every pulse (BR2). One row per package (package_id PK). `report` holds the
-- `{schema_version, verdict, rules, generated_at}` shape aligned with validate.mjs.

CREATE TABLE public.package_publish_validation (
    package_id      UUID PRIMARY KEY REFERENCES public.packages(id) ON DELETE CASCADE,
    report          JSONB NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.package_publish_validation ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_package_publish_validation_updated
    BEFORE UPDATE ON public.package_publish_validation
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: public can read the report for active packages or for packages they own.
CREATE POLICY "Public can view active or owned publish validation"
    ON public.package_publish_validation FOR SELECT
    USING (
        package_id IN (
            SELECT id FROM public.packages
            WHERE status = 'active' OR publisher_id = auth.uid()
        )
    );

-- RLS: package owners can insert the report for their own packages.
CREATE POLICY "Owners can insert own publish validation"
    ON public.package_publish_validation FOR INSERT
    WITH CHECK (
        package_id IN (
            SELECT id FROM public.packages WHERE publisher_id = auth.uid()
        )
    );

-- RLS: package owners can update the report for their own packages.
CREATE POLICY "Owners can update own publish validation"
    ON public.package_publish_validation FOR UPDATE
    USING (
        package_id IN (
            SELECT id FROM public.packages WHERE publisher_id = auth.uid()
        )
    );

-- RLS: admins have full access (consistent with package_tab_content moderation).
CREATE POLICY "Admins have full access to publish validation"
    ON public.package_publish_validation FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- No DELETE policy: rows are cleaned up by the ON DELETE CASCADE from packages.
