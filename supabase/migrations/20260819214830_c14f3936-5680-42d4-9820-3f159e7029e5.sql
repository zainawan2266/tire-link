CREATE TABLE public.tire_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    size text,
    season text,
    vehicle_type text,
    description text,
    price numeric,
    affiliate_link text,
    meta_title text,
    meta_description text,
    indexed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.tire_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tire_pages TO authenticated;
GRANT ALL ON public.tire_pages TO service_role;

ALTER TABLE public.tire_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to read tire pages"
ON public.tire_pages FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon to create tire pages"
ON public.tire_pages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage tire pages"
ON public.tire_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_tire_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tire_pages_updated_at
BEFORE UPDATE ON public.tire_pages
FOR EACH ROW EXECUTE FUNCTION public.update_tire_pages_updated_at();