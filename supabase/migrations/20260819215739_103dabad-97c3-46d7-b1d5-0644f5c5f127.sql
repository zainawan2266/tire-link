CREATE OR REPLACE FUNCTION public.increment_short_link_clicks(_code text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.short_links SET clicks = clicks + 1 WHERE code = _code;
$$;