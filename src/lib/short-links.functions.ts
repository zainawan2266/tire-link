import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCode, randomCode, RESERVED_CODES } from "./short-links";

const createSchema = z.object({
  destinationUrl: z.string().url().max(2000),
  title: z.string().max(200).optional(),
  campaign: z.string().max(120).optional(),
  customCode: z.string().max(60).optional(),
});

const codeSchema = z.object({ code: z.string().min(1).max(60) });

export const createShortLink = createServerFn({ method: "POST" })
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data }) => {
    let code = data.customCode ? normalizeCode(data.customCode) : randomCode();
    if (!code || RESERVED_CODES.has(code)) {
      throw new Error("That short code is not available. Try another one.");
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: row, error } = await supabase
        .from("short_links")
        .insert({
          code,
          destination_url: data.destinationUrl,
          title: data.title || null,
          campaign: data.campaign || null,
        })
        .select()
        .single();

      if (!error) return row;
      if (error.code !== "23505") throw new Error(error.message);
      if (data.customCode) {
        throw new Error("That short code is already taken.");
      }
      code = randomCode(attempt >= 2 ? 7 : 6);
    }

    throw new Error("Could not generate a unique short code. Please retry.");
  });

export const listShortLinks = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabase
      .from("short_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return data;
  },
);

export const resolveShortLink = createServerFn({ method: "GET" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabase
      .from("short_links")
      .select("code, destination_url, title")
      .eq("code", data.code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;

    await supabase.rpc("increment_short_link_clicks", { _code: data.code });

    return row;
  });

export const deleteShortLink = createServerFn({ method: "POST" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("short_links")
      .delete()
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
