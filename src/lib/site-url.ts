/**
 * Public site URL helper.
 *
 * Set `VITE_SITE_URL=https://your-domain.com` in your hosting dashboard
 * (Vercel, Lovable, etc.) so generated short links and the sitemap always
 * point at your custom domain. When unset, the current request origin is used —
 * except on editor/preview/sandbox hosts, which require a Lovable login and
 * therefore must never be baked into a shared short link.
 */

// Public, login-free production host used when the app is being viewed from a
// preview/sandbox origin.
export const PUBLIC_SITE_URL = "https://tire-link.lovable.app";

export function isNonPublicHost(host: string): boolean {
  return (
    host.includes("id-preview--") ||
    host.includes("-dev.lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.dev") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
  );
}

export function getBrowserSiteUrl(): string {
  if (typeof window === "undefined") return "";
  const envUrl = (import.meta.env["VITE_SITE_URL"] as string | undefined) ?? "";
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (isNonPublicHost(window.location.host)) return PUBLIC_SITE_URL;
  return window.location.origin;
}

export function getServerSiteUrl(request?: Request): string {
  const envUrl = process.env["VITE_SITE_URL"] ?? "";
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host && !isNonPublicHost(host)) return `${proto}://${host}`;
    if (host) return PUBLIC_SITE_URL;
  }

  return PUBLIC_SITE_URL;
}
