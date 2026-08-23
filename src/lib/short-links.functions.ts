import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  normalizeCode,
  randomCode,
  RESERVED_CODES,
  isSocialCrawler,
  isSafeDestination,
} from "./short-links";
import { getServerSiteUrl } from "./site-url";

const destinationSchema = z
  .string()
  .url()
  .max(2000)
  .refine(isSafeDestination, "Only http:// and https:// destinations are allowed");

const createSchema = z.object({
  destinationUrl: destinationSchema,
  title: z.string().max(200).optional(),
  description: z.string().max(600).optional(),
  category: z.string().max(80).optional(),
  campaign: z.string().max(120).optional(),
  customCode: z.string().max(60).optional(),
});

const codeSchema = z.object({ code: z.string().min(1).max(60) });

export const createShortLink = createServerFn({ method: "POST" })
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let code = data.customCode ? normalizeCode(data.customCode) : randomCode();
    if (!code || RESERVED_CODES.has(code)) {
      throw new Error("That short code is not available. Try another one.");
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data: row, error } = await supabaseAdmin
        .from("short_links")
        .insert({
          code,
          destination_url: data.destinationUrl,
          title: data.title || null,
          description: data.description || null,
          category: data.category || null,
          campaign: data.campaign || null,
        })
        .select()
        .single();

      if (!error) return row;
      if (error.code !== "23505") throw new Error(error.message);
      if (data.customCode) {
        throw new Error("That short code is already taken.");
      }
      // grow the code length only after repeated collisions at the short length
      code = randomCode(4 + Math.floor((attempt + 1) / 3));
    }

    throw new Error("Could not generate a unique short code. Please retry.");
  });

export const listShortLinks = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("short_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return data;
  },
);

const directorySchema = z.object({ page: z.number().int().min(1).max(500) });

/** Public, paginated directory of indexable landing pages. */
export const listPublicShortLinks = createServerFn({ method: "GET" })
  .inputValidator((data) => directorySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const perPage = 50;
    const from = (data.page - 1) * perPage;

    const { data: rows, error, count } = await supabaseAdmin
      .from("short_links")
      .select("code, title, description, category, destination_url, created_at", {
        count: "exact",
      })
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);

    if (error) throw new Error(error.message);
    return {
      links: rows ?? [],
      page: data.page,
      perPage,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / perPage)),
    };
  });

export const resolveShortLink = createServerFn({ method: "GET" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { getRequest } = await import("@tanstack/react-start/server");

    const request = getRequest();
    const siteUrl = getServerSiteUrl(request);
    const isCrawler = isSocialCrawler(request?.headers.get("user-agent"));

    const { data: row, error } = await supabaseAdmin
      .from("short_links")
      .select(
        "code, destination_url, title, description, category, campaign, clicks, created_at, is_public",
      )
      .eq("code", data.code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    // Clicks are only recorded when a visitor presses "Visit website".
    return { link: row ?? null, isCrawler, siteUrl };
  });

/** Records a real destination click, then the client navigates onward. */
export const trackShortLinkClick = createServerFn({ method: "POST" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.rpc("increment_short_link_clicks", {
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShortLink = createServerFn({ method: "POST" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("short_links")
      .delete()
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
