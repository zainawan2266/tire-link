export interface TirePage {
  id: string;
  slug: string;
  brand: string;
  model: string;
  size: string | null;
  season: string | null;
  vehicle_type: string | null;
  description: string | null;
  price: number | null;
  affiliate_link: string | null;
  meta_title: string | null;
  meta_description: string | null;
  indexed: boolean;
  created_at: string;
  updated_at: string;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

export function buildTireMeta(page: Pick<TirePage, "brand" | "model" | "size" | "description">) {
  const title = `${page.brand} ${page.model}${page.size ? ` ${page.size}` : ""} Tires`.trim();
  const description =
    page.description ||
    `Find the best deals on ${page.brand} ${page.model} tires${page.size ? ` in size ${page.size}` : ""}.`;
  return { title, description };
}
