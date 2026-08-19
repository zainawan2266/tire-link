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
