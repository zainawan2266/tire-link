/**
 * Public site URL helper.
 *
 * Set `VITE_SITE_URL=https://your-domain.com` in your hosting dashboard
 * (Vercel, Lovable, etc.) so generated short links and the sitemap always
 * point at your custom domain. When unset, the current request origin is used.
 */

export function getBrowserSiteUrl(): string {
  if (typeof window === "undefined") return "";
  const envUrl = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "";
  if (envUrl) return envUrl.replace(/\/$/, "");
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
    if (host) return `${proto}://${host}`;
  }

  return "";
}
