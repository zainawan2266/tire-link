/**
 * SSRF-safe destination metadata fetcher.
 *
 * Runs only on the server. It fetches the target URL once (at link creation or
 * on a manual refresh), extracts a small set of well-known metadata tags, and
 * never executes any JavaScript from the destination page.
 */

const MAX_BYTES = 512 * 1024; // 512 KB is plenty for <head> + first content
const TIMEOUT_MS = 8000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

/** Blocks loopback, private, link-local, CGNAT and cloud metadata addresses. */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  // IPv6 (URL hostname keeps the brackets off)
  if (host.includes(":")) {
    const v6 = host.replace(/^\[|\]$/g, "");
    if (v6 === "::1" || v6 === "::" ) return true;
    if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true; // unique local
    if (/^fe80:/.test(v6)) return true; // link local
    if (/^::ffff:/.test(v6)) return isBlockedHost(v6.replace(/^::ffff:/, ""));
    return false;
  }

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + AWS/GCP metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // A bare host with no dot is almost always an internal name.
  if (!host.includes(".")) return true;
  return false;
}

export function assertFetchableUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs can be previewed");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("This host is not allowed");
  }
  return url;
}

export interface LinkPreviewData {
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  favicon: string | null;
  domain: string;
  h1: string | null;
  content_summary: string | null;
  http_status: number | null;
  fetch_status: "ok" | "failed" | "blocked";
  last_fetched_at: string;
}

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .trim();
}

/** Strips tags/scripts — fetched HTML is never rendered, only plain text is kept. */
function clean(value: string | null | undefined, max = 600): string | null {
  if (!value) return null;
  const text = decode(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function metaContent(html: string, key: string): string | null {
  const attr = key.startsWith("og:") || key.startsWith("article:") ? "property" : "name";
  const patterns = [
    new RegExp(`<meta[^>]+(?:${attr}|property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:${attr}|property|name)=["']${key}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return clean(m[1], 600);
  }
  return null;
}

function absolute(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function extractBodyText(html: string): string | null {
  const body = html.split(/<body[^>]*>/i)[1] ?? html;
  const stripped = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ");

  const paragraphs = [...stripped.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => clean(m[1], 400))
    .filter((t): t is string => !!t && t.length > 60);

  const text = paragraphs.slice(0, 3).join(" ") || clean(stripped, 500) || "";
  return text ? text.slice(0, 500) : null;
}

export function emptyPreview(rawUrl: string, status: LinkPreviewData["fetch_status"] = "failed"): LinkPreviewData {
  let domain = rawUrl;
  try {
    domain = new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    /* keep the raw string */
  }
  return {
    title: null,
    description: null,
    canonical_url: null,
    og_title: null,
    og_description: null,
    og_image: null,
    favicon: null,
    domain,
    h1: null,
    content_summary: null,
    http_status: null,
    fetch_status: status,
    last_fetched_at: new Date().toISOString(),
  };
}

/** Never throws — a failed fetch degrades to a domain-only preview. */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
  let url: URL;
  try {
    url = assertFetchableUrl(rawUrl);
  } catch {
    return emptyPreview(rawUrl, "blocked");
  }

  const fallback = emptyPreview(url.toString());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "QuickLinksPreviewBot/1.0 (+https://tire-link.lovable.app)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    fallback.http_status = res.status;

    // Any redirect chain must also land on a public host.
    try {
      assertFetchableUrl(res.url || url.toString());
    } catch {
      return { ...fallback, fetch_status: "blocked" };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("html")) {
      return fallback;
    }

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (received >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    } else {
      html = (await res.text()).slice(0, MAX_BYTES);
    }

    const finalUrl = new URL(res.url || url.toString());
    const titleTag = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], 300);
    const h1 = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1], 300);
    const canonicalHref =
      html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] ??
      null;
    const iconHref =
      html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["']/i)?.[1] ??
      null;

    return {
      title: titleTag,
      description: metaContent(html, "description"),
      canonical_url: absolute(canonicalHref, finalUrl),
      og_title: metaContent(html, "og:title") ?? metaContent(html, "twitter:title"),
      og_description:
        metaContent(html, "og:description") ?? metaContent(html, "twitter:description"),
      og_image: absolute(
        metaContent(html, "og:image") ??
          metaContent(html, "og:image:url") ??
          metaContent(html, "twitter:image") ??
          metaContent(html, "twitter:image:src"),
        finalUrl,
      ),
      favicon:
        absolute(iconHref, finalUrl) ?? `${finalUrl.origin}/favicon.ico`,
      domain: finalUrl.hostname.replace(/^www\./, ""),
      h1,
      content_summary: extractBodyText(html),
      http_status: res.status,
      fetch_status: "ok",
      last_fetched_at: new Date().toISOString(),
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
