import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { buildTireMeta, slugify } from "./tire-pages";

const createTirePageSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  size: z.string().max(50).optional(),
  season: z.string().max(50).optional(),
  vehicleType: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative().optional(),
  affiliateLink: z.string().url().max(1000).optional().or(z.literal("")),
});

const slugSchema = z.object({ slug: z.string().min(1) });

export const createTirePage = createServerFn({ method: "POST" })
  .inputValidator((data) => createTirePageSchema.parse(data))
  .handler(async ({ data }) => {
    const baseSlug = slugify(`${data.brand}-${data.model}-${data.size || ""}`);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
    const meta = buildTireMeta({
      brand: data.brand,
      model: data.model,
      size: data.size || null,
      description: data.description || null,
    });

    const { data: page, error } = await supabase
      .from("tire_pages")
      .insert({
        slug: uniqueSlug,
        brand: data.brand,
        model: data.model,
        size: data.size || null,
        season: data.season || null,
        vehicle_type: data.vehicleType || null,
        description: data.description || null,
        price: data.price ?? null,
        affiliate_link: data.affiliateLink || null,
        meta_title: meta.title,
        meta_description: meta.description,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return page;
  });

export const listTirePages = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("tire_pages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

export const getTirePage = createServerFn({ method: "GET" })
  .inputValidator((data) => slugSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: page, error } = await supabase
      .from("tire_pages")
      .select("*")
      .eq("slug", data.slug)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return page;
  });
