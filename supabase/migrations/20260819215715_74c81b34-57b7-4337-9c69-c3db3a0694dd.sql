CREATE TABLE public.short_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    destination_url text NOT NULL,
    title text,
    campaign text,
    clicks integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX short_links_code_idx ON public.short_links (code);

GRANT SELECT, INSERT, UPDATE ON public.short_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short links"
ON public.short_links FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create short links"
ON public.short_links FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update short links"
ON public.short_links FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_short_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_short_links_updated_at
BEFORE UPDATE ON public.short_links
FOR EACH ROW EXECUTE FUNCTION public.update_short_links_updated_at();

CREATE OR REPLACE FUNCTION public.increment_short_link_clicks(_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.short_links SET clicks = clicks + 1 WHERE code = _code;
$$;

GRANT EXECUTE ON FUNCTION public.increment_short_link_clicks(text) TO anon, authenticated;