-- package_version_sbom table — stores the per-version Software Bill of Materials.
-- SBOM/CRA Front B — the portal as registry "requires/accepts/distributes" the
-- SBOM the PubDelphi CLI generates (it does NOT generate SBOM itself).
--
-- A 1:1 satellite table keyed by package_version_id (NOT a column on
-- package_versions) so this migration degrades gracefully — every existing
-- query stays untouched, mirroring package_publish_validation / package_likes.
-- One row per package version. `document` holds the full CycloneDX (ECMA-424) or
-- SPDX (ISO/IEC 5962:2021) JSON the CLI emitted. `format`/`spec_version`/`author`
-- surface the headline fields without parsing the document (NTIA Author-of-SBOM).

CREATE TABLE public.package_version_sbom (
    package_version_id  UUID PRIMARY KEY REFERENCES public.package_versions(id) ON DELETE CASCADE,
    format              TEXT NOT NULL CHECK (format IN ('cyclonedx', 'spdx')),
    spec_version        TEXT,
    author              TEXT,
    document            JSONB NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.package_version_sbom ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on modification (reuses the shared trigger function).
CREATE OR REPLACE TRIGGER on_package_version_sbom_updated
    BEFORE UPDATE ON public.package_version_sbom
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: public can read the SBOM of any version whose package is active, or any
-- version of a package they own. The SBOM is meant to be distributed (CRA
-- "Distribution and Delivery"), so active packages expose it to everyone.
CREATE POLICY "Public can view SBOM of active or owned versions"
    ON public.package_version_sbom FOR SELECT
    USING (
        package_version_id IN (
            SELECT v.id FROM public.package_versions v
            JOIN public.packages p ON p.id = v.package_id
            WHERE p.status = 'active' OR p.publisher_id = auth.uid()
        )
    );

-- RLS: package owners can insert the SBOM for versions of their own packages.
CREATE POLICY "Owners can insert SBOM for own versions"
    ON public.package_version_sbom FOR INSERT
    WITH CHECK (
        package_version_id IN (
            SELECT v.id FROM public.package_versions v
            JOIN public.packages p ON p.id = v.package_id
            WHERE p.publisher_id = auth.uid()
        )
    );

-- RLS: package owners can update (re-upload) the SBOM for their own versions.
-- CRA "Frequency": a new build → a new SBOM; re-publishing a version replaces it.
CREATE POLICY "Owners can update SBOM for own versions"
    ON public.package_version_sbom FOR UPDATE
    USING (
        package_version_id IN (
            SELECT v.id FROM public.package_versions v
            JOIN public.packages p ON p.id = v.package_id
            WHERE p.publisher_id = auth.uid()
        )
    );

-- RLS: admins have full access (consistent with the other satellite tables).
CREATE POLICY "Admins have full access to package SBOM"
    ON public.package_version_sbom FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- No DELETE policy: rows are cleaned up by the ON DELETE CASCADE from
-- package_versions (which itself cascades from packages).
