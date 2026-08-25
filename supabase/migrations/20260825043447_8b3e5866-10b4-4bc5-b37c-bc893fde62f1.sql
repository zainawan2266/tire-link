ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS favicon text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS h1 text,
  ADD COLUMN IF NOT EXISTS content_summary text,
  ADD COLUMN IF NOT EXISTS http_status integer,
  ADD COLUMN IF NOT EXISTS fetch_status text,
  ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS short_links_destination_url_idx ON public.short_links (destination_url);
CREATE INDEX IF NOT EXISTS short_links_indexable_idx ON public.short_links (indexable);
CREATE INDEX IF NOT EXISTS short_links_code_idx ON public.short_links (code);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_short_links_updated_at ON public.short_links;
CREATE TRIGGER update_short_links_updated_at BEFORE UPDATE ON public.short_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();