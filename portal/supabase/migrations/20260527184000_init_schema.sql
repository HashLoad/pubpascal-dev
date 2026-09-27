-- Create custom extension for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create profiles table (synced with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'publisher', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create packages table
CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publisher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    repository_url TEXT UNIQUE,
    license_type TEXT NOT NULL CHECK (license_type IN ('open_source', 'commercial')),
    license_name TEXT NOT NULL,
    website_url TEXT,
    highlight_level TEXT NOT NULL DEFAULT 'none' CHECK (highlight_level IN ('none', 'bronze', 'silver', 'gold')),
    platforms TEXT[] NOT NULL DEFAULT '{}',
    languages TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'active', 'rejected')),
    validation_report JSONB DEFAULT '{}'::jsonb,
    stars INTEGER DEFAULT 0 NOT NULL CHECK (stars >= 0),
    downloads INTEGER DEFAULT 0 NOT NULL CHECK (downloads >= 0),
    score INTEGER DEFAULT 0 NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT packages_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100)
);

-- Enable RLS on packages
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- 3. Create package_versions table
CREATE TABLE public.package_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    release_notes TEXT,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (package_id, version)
);

-- Enable RLS on package_versions
ALTER TABLE public.package_versions ENABLE ROW LEVEL SECURITY;

-- 4. Create ads table (commercial spots)
CREATE TABLE public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'expired')),
    impressions INTEGER DEFAULT 0 NOT NULL CHECK (impressions >= 0),
    clicks INTEGER DEFAULT 0 NOT NULL CHECK (clicks >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ads_date_range CHECK (end_date >= start_date)
);

-- Enable RLS on ads
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- 5. Create partners table (parcerias section)
CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT NOT NULL,
    website_url TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- 6. Setup automatic profile creation on user signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', substring(NEW.email from '^[^@]+')),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Setup updated_at auto-updates on modifications
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_package_updated
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_ad_updated
    BEFORE UPDATE ON public.ads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_partner_updated
    BEFORE UPDATE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Indexes for performance optimizations
CREATE INDEX idx_packages_slug ON public.packages (slug);
CREATE INDEX idx_packages_status ON public.packages (status);
CREATE INDEX idx_packages_publisher_id ON public.packages (publisher_id);
-- GIN Indexes on arrays for fast multiplatform/language filtering
CREATE INDEX idx_packages_platforms ON public.packages USING gin (platforms);
CREATE INDEX idx_packages_languages ON public.packages USING gin (languages);

CREATE INDEX idx_package_versions_package_id ON public.package_versions (package_id);
CREATE INDEX idx_ads_status_dates ON public.ads (status, start_date, end_date);
CREATE INDEX idx_partners_status_order ON public.partners (status, sort_order);

-- 9. Row-Level Security (RLS) Policies

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Packages Policies
CREATE POLICY "Active packages are viewable by everyone" 
    ON public.packages FOR SELECT 
    USING (status = 'active' OR auth.uid() = publisher_id);

CREATE POLICY "Authenticated users can create packages" 
    ON public.packages FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = publisher_id);

CREATE POLICY "Publishers can update their own packages" 
    ON public.packages FOR UPDATE 
    USING (auth.uid() = publisher_id)
    WITH CHECK (auth.uid() = publisher_id);

CREATE POLICY "Publishers can delete their own packages" 
    ON public.packages FOR DELETE 
    USING (auth.uid() = publisher_id);

-- Package Versions Policies
CREATE POLICY "Package versions are viewable by everyone" 
    ON public.package_versions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.packages 
            WHERE packages.id = package_versions.package_id 
              AND (packages.status = 'active' OR auth.uid() = packages.publisher_id)
        )
    );

CREATE POLICY "Publishers can insert versions for their packages" 
    ON public.package_versions FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.packages 
            WHERE packages.id = package_versions.package_id 
              AND auth.uid() = packages.publisher_id
        )
    );

CREATE POLICY "Publishers can update versions for their packages" 
    ON public.package_versions FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.packages 
            WHERE packages.id = package_versions.package_id 
              AND auth.uid() = packages.publisher_id
        )
    );

-- Publishers can delete versions for their packages
CREATE POLICY "Publishers can delete versions for their packages" 
    ON public.package_versions FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.packages 
            WHERE packages.id = package_versions.package_id 
              AND auth.uid() = packages.publisher_id
        )
    );

-- Ads Policies
CREATE POLICY "Active ads are viewable by everyone" 
    ON public.ads FOR SELECT 
    USING (status = 'active' AND start_date <= now() AND end_date >= now());

CREATE POLICY "Admins have full access to ads" 
    ON public.ads FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Partners Policies
CREATE POLICY "Active partners are viewable by everyone" 
    ON public.partners FOR SELECT 
    USING (status = 'active');

CREATE POLICY "Admins have full access to partners" 
    ON public.partners FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
