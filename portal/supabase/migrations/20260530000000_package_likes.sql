-- package_likes table — stores per-user "likes" for packages.
-- Epic 9 / Demand 4/6 — Likes: schema + RLS + B-Tree index.
--
-- ADR-034: user_id → auth.users (not profiles) for simple auth.uid() RLS checks,
-- mirroring package_reviews (ADR-023). Binary, toggleable (INSERT/DELETE), no rating/body,
-- no moderation. One like per user per package (UNIQUE). Rows are immutable: no UPDATE
-- policy, no updated_at / trigger. Counts are public; liker identity is not exposed here.

CREATE TABLE public.package_likes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id      UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_package_likes_user UNIQUE (package_id, user_id)
);

-- Enable RLS
ALTER TABLE public.package_likes ENABLE ROW LEVEL SECURITY;

-- Index for fast per-package like counting (dominant query pattern).
CREATE INDEX idx_package_likes_package_id ON public.package_likes (package_id);

-- RLS: counts are public — anyone can read like rows.
CREATE POLICY "Public can view likes"
    ON public.package_likes FOR SELECT
    USING (true);

-- RLS: authenticated users can insert their own like.
CREATE POLICY "Authenticated users can insert own like"
    ON public.package_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS: users can delete their own like (the toggle-off path).
CREATE POLICY "Users can delete own like"
    ON public.package_likes FOR DELETE
    USING (auth.uid() = user_id);

-- No UPDATE policy: a like is binary and immutable (toggle = INSERT/DELETE).
-- No admin policy: likes carry no user content to moderate.
