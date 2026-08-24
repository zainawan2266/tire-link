import { createFileRoute } from "@tanstack/react-router";
import { getServerSiteUrl } from "@/lib/site-url";

// Override with VITE_SITE_URL=https://your-domain.com for a custom domain.

interface SitemapEntry {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const BASE_URL = getServerSiteUrl(request);
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/links", changefreq: "daily", priority: "0.9" },
        ];

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        // Only existing, public landing pages — each returns HTTP 200.
        const { data: links, error } = await supabaseAdmin
          .from("short_links")
          .select("code")
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        if (!error && links) {
          const perPage = 50;
          const pages = Math.ceil(links.length / perPage);
          for (let page = 2; page <= pages; page += 1) {
            entries.push({
              path: `/links?page=${page}`,
              changefreq: "weekly",
              priority: "0.5",
            });
          }
          for (const link of links) {
            entries.push({
              path: `/${link.code.toLowerCase()}`,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
