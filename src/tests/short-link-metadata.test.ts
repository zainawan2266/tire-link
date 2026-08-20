import { beforeAll, describe, expect, it } from "vitest";
import { buildLinkPreview } from "@/lib/short-links";

const BASE_URL = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const CRAWLER_UA = "facebookexternalhit/1.1";

async function getHtml(path: string, userAgent = CRAWLER_UA) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "user-agent": userAgent },
    redirect: "manual",
  });
  const html = (await res.text()).replace(/\0/g, "");
  return { res, html };
}

function meta(html: string, key: string) {
  const attr = key.startsWith("og:") ? "property" : "name";
  const pattern = new RegExp(
    `<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"|<meta[^>]*content="([^"]*)"[^>]*${attr}="${key}"`,
  );
  const match = html.match(pattern);
  return match ? (match[1] ?? match[2]) : undefined;
}

function jsonLd(html: string) {
  const match = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  );
  return match ? JSON.parse(match[1]!) : undefined;
}

let codes: string[] = [];

beforeAll(async () => {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  const xml = (await res.text()).replace(/\0/g, "");
  codes = [...xml.matchAll(/<loc>[^<]*?\/([^/<]+)<\/loc>/g)]
    .map((m) => m[1]!)
    .filter((code) => code && !code.startsWith("http"))
    .slice(0, 5);
}, 30_000);

describe("short link social metadata", () => {
  it("has at least one short code to verify", () => {
    expect(codes.length).toBeGreaterThan(0);
  });

  it("serves Open Graph, Twitter Card and JSON-LD tags to crawlers", async () => {
    for (const code of codes) {
      const { res, html } = await getHtml(`/${code}`);
      expect(res.status, code).toBe(200);

      const title = meta(html, "og:title");
      const description = meta(html, "og:description");

      expect(title, code).toBeTruthy();
      expect(description, code).toBeTruthy();
      expect(description!.length, code).toBeLessThanOrEqual(160);

      expect(meta(html, "og:type"), code).toBe("website");
      expect(meta(html, "og:site_name"), code).toBe("Quick Links");
      expect(meta(html, "og:url"), code).toContain(`/${code}`);
      expect(meta(html, "description"), code).toBe(description);

      expect(meta(html, "twitter:card"), code).toBe("summary_large_image");
      expect(meta(html, "twitter:title"), code).toBe(title);
      expect(meta(html, "twitter:description"), code).toBe(description);

      const schema = jsonLd(html);
      expect(schema?.["@type"], code).toBe("WebPage");
      expect(schema?.name, code).toBe(title);
      expect(schema?.url, code).toContain(`/${code}`);
      expect(schema?.mainEntityOfPage, code).toMatch(/^https?:\/\//);
    }
  }, 30_000);

  it("sets crawler-friendly cache headers that vary by user agent", async () => {
    const { res } = await getHtml(`/${codes[0]}`);
    expect(res.headers.get("vary")?.toLowerCase()).toContain("user-agent");
    const cacheControl = res.headers.get("cache-control") ?? "";
    expect(cacheControl).toContain("s-maxage=300");
    expect(cacheControl).toContain("stale-while-revalidate");
  });

  it("returns identical metadata on repeat crawls", async () => {
    const first = await getHtml(`/${codes[0]}`);
    const second = await getHtml(`/${codes[0]}`);
    expect(meta(second.html, "og:title")).toBe(meta(first.html, "og:title"));
    expect(meta(second.html, "og:description")).toBe(
      meta(first.html, "og:description"),
    );
  });

  it("redirects real browsers instead of rendering the preview", async () => {
    const { res } = await getHtml(
      `/${codes[0]}`,
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36",
    );
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toMatch(/^https?:\/\//);
  });

  it("serves noindex preview metadata for unknown codes", async () => {
    const { res, html } = await getHtml("/zzz-does-not-exist");
    expect(res.status).toBe(200);
    expect(meta(html, "robots")).toContain("noindex");
    expect(meta(html, "og:title")).toContain("Link not found");
    expect(meta(html, "twitter:card")).toBe("summary");
  });
});

describe("preview copy matches what the route renders", () => {
  it("derives titles from the shared builder", () => {
    const preview = buildLinkPreview({
      code: "abcd",
      title: null,
      campaign: null,
      destination_url: "https://example.com/page",
    });
    expect(preview.title).toBe("Quick Links — /abcd");
  });
});
