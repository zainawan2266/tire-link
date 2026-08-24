import { beforeAll, describe, expect, it } from "vitest";
import { buildLandingMeta, isSafeDestination } from "@/lib/short-links";

const BASE_URL = process.env["TEST_BASE_URL"] ?? "http://localhost:8080";
const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function getHtml(path: string, userAgent = BOT_UA) {
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

function canonical(html: string) {
  const match = html.match(
    /<link[^>]*rel="canonical"[^>]*href="([^"]*)"|<link[^>]*href="([^"]*)"[^>]*rel="canonical"/,
  );
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
    .filter((code) => code && !code.startsWith("http") && !code.startsWith("links"))
    .slice(0, 5);
}, 30_000);

describe("short link landing pages", () => {
  it("has at least one short code to verify", () => {
    expect(codes.length).toBeGreaterThan(0);
  });

  it("returns HTTP 200 with indexable metadata and visible content", async () => {
    for (const code of codes) {
      const { res, html } = await getHtml(`/${code}`);
      expect(res.status, code).toBe(200);

      const title = meta(html, "og:title");
      const description = meta(html, "og:description");

      expect(title, code).toBeTruthy();
      expect(description, code).toBeTruthy();
      expect(description!.length, code).toBeLessThanOrEqual(160);
      expect(meta(html, "robots"), code).toBeUndefined();
      expect(canonical(html), code).toContain(`/${code}`);
      expect(meta(html, "og:url"), code).toContain(`/${code}`);
      expect(meta(html, "twitter:title"), code).toBe(title);
      expect(html, code).toContain("Visit website");
      expect(html, code).toContain("<h1");

      const schema = jsonLd(html);
      expect(schema?.["@type"], code).toBe("WebPage");
      expect(schema?.url, code).toContain(`/${code}`);
    }
  }, 30_000);

  it("does not redirect real browsers", async () => {
    const { res } = await getHtml(
      `/${codes[0]}`,
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36",
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("returns 404 for unknown codes", async () => {
    const { res } = await getHtml("/zzz-does-not-exist");
    expect(res.status).toBe(404);
  });

  it("serves a crawlable directory page", async () => {
    const { res, html } = await getHtml("/links");
    expect(res.status).toBe(200);
    expect(canonical(html)).toContain("/links");
    expect(html).toContain(`href="/${codes[0]}"`);
  });

  it("robots.txt allows crawling and advertises the sitemap", async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const txt = await res.text();
    expect(res.status).toBe(200);
    expect(txt).not.toMatch(/Disallow:\s*\/$/m);
    expect(txt).toContain("Sitemap:");
  });
});

describe("landing metadata helpers", () => {
  it("builds a title and description from the link fields", () => {
    const preview = buildLandingMeta({
      code: "abcd",
      title: "Winter tire guide",
      description: "Everything about winter tires.",
      category: "Tires",
      campaign: null,
      destination_url: "https://example.com/page",
    });
    expect(preview.title).toBe("Winter tire guide | Quick Links");
    expect(preview.description).toBe("Everything about winter tires.");
    expect(preview.host).toBe("example.com");
  });

  it("rejects unsafe destination protocols", () => {
    expect(isSafeDestination("https://example.com")).toBe(true);
    expect(isSafeDestination("http://example.com")).toBe(true);
    expect(isSafeDestination("javascript:alert(1)")).toBe(false);
    expect(isSafeDestination("data:text/html,<script>")).toBe(false);
  });
});
