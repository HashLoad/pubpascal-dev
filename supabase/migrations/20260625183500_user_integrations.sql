-- Create user_integrations table to store VCS provider tokens securely (Phase 1 Dev-Flow)
CREATE TABLE IF NOT EXISTS public.user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab')),
    access_token TEXT NOT NULL,
    provider_user TEXT, -- e.g., VCS username
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, provider)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see, insert, update or delete their own integrations
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;
CREATE POLICY "Users can manage their own integrations"
    ON public.user_integrations
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant privileges for Supabase roles
GRANT ALL ON public.user_integrations TO authenticated;
GRANT ALL ON public.user_integrations TO service_role;
