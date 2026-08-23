const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function randomCode(length = 4) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const RESERVED_CODES = new Set([
  "api",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "lovable",
]);

const SOCIAL_CRAWLERS = [
  "facebookexternalhit",
  "facebookcatalog",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "whatsapp",
  "telegrambot",
  "pinterest",
  "redditbot",
  "skypeuripreview",
  "embedly",
  "quora link preview",
  "vkshare",
  "bitlybot",
  "applebot",
  "opengraph",
  "iframely",
  "mastodon",
  "bluesky",
];

/** Social/link-preview crawlers should see Open Graph metadata, not a redirect. */
export function isSocialCrawler(userAgent?: string | null) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_CRAWLERS.some((bot) => ua.includes(bot));
}

/** Human-friendly preview copy for a short link. */
export function buildLinkPreview(link: {
  code: string;
  title?: string | null;
  campaign?: string | null;
  destination_url: string;
}) {
  let host = link.destination_url;
  try {
    host = new URL(link.destination_url).hostname.replace(/^www\./, "");
  } catch {
    // keep the raw string when the URL cannot be parsed
  }

  const title = link.title?.trim() || `Quick Links — /${link.code}`;
  const description = link.campaign
    ? `${title} · ${link.campaign} campaign. Continue to ${host}.`
    : `Short link /${link.code} pointing to ${host}. Tap to continue.`;

  return { host, title, description: description.slice(0, 160) };
}

/** Only http(s) destinations are allowed — blocks javascript:, data:, etc. */
export function isSafeDestination(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Metadata for the public landing page of a short link. */
export function buildLandingMeta(link: {
  code: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  campaign?: string | null;
  destination_url: string;
}) {
  const host = hostOf(link.destination_url);
  const title = `${link.title?.trim() || `Link to ${host}`} | Quick Links`;
  const description = (
    link.description?.trim() ||
    `${link.title?.trim() || `A shared resource on ${host}`} — an external resource hosted at ${host}. Read the details and visit the original page.`
  ).slice(0, 158);
  return { host, title, description };
}
