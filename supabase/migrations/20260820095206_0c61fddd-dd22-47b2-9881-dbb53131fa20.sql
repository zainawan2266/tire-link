-- short_links: remove public write/read access; server-side (service role) only
DROP POLICY IF EXISTS "Anyone can read short links" ON public.short_links;
DROP POLICY IF EXISTS "Anyone can create short links" ON public.short_links;
DROP POLICY IF EXISTS "Anyone can update short links" ON public.short_links;

REVOKE ALL ON public.short_links FROM anon, authenticated;
GRANT ALL ON public.short_links TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_short_link_clicks(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_short_link_clicks(text) TO service_role;

-- tire_pages: anonymous users may only read
DROP POLICY IF EXISTS "Allow anon to create tire pages" ON public.tire_pages;
DROP POLICY IF EXISTS "Allow authenticated users to manage tire pages" ON public.tire_pages;

REVOKE INSERT, UPDATE, DELETE ON public.tire_pages FROM anon, authenticated;
GRANT SELECT ON public.tire_pages TO anon, authenticated;
GRANT ALL ON public.tire_pages TO service_role;

CREATE POLICY "Authenticated users can read tire pages"
ON public.tire_pages FOR SELECT TO authenticated USING (true);