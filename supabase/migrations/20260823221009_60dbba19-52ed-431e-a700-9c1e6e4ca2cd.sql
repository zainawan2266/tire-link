ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;