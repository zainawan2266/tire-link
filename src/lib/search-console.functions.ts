import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function getHeaders() {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const connectionApiKey = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!lovableApiKey || !connectionApiKey) {
    throw new Error(
      "Google Search Console is not connected. Link the Search Console connector in project settings before submitting a sitemap.",
    );
  }
  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
  };
}

function coversTarget(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    const prefix = new URL(siteUrl);
    return target.href.startsWith(prefix.href);
  } catch {
    return false;
  }
}

async function resolveSiteUrl(targetUrl: string) {
  const headers = getHeaders();
  const response = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!response.ok) {
    throw new Error(
      `Could not list Search Console properties [${response.status}]: ${await response.text()}`,
    );
  }
  const { siteEntry = [] } = (await response.json()) as {
    siteEntry?: { siteUrl: string; permissionLevel?: string }[];
  };
  const target = new URL(targetUrl);
  const matches = siteEntry.filter(
    (entry) =>
      entry.permissionLevel !== "siteUnverifiedUser" &&
      coversTarget(entry.siteUrl, target),
  );
  if (matches.length === 0) {
    throw new Error(
      "No verified Search Console property covers this site. Verify the site in Google Search Console first.",
    );
  }
  if (matches.length > 1) {
    return {
      status: "selection_required" as const,
      candidates: matches.map((entry) => entry.siteUrl),
    };
  }
  return { status: "selected" as const, siteUrl: matches[0].siteUrl };
}

const submitSitemapSchema = z.object({
  sitemapUrl: z.string().url(),
});

export const submitSitemap = createServerFn({ method: "POST" })
  .inputValidator((data) => submitSitemapSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getHeaders();
    const resolution = await resolveSiteUrl(data.sitemapUrl);

    if (resolution.status === "selection_required") {
      return {
        status: "selection_required" as const,
        candidates: resolution.candidates,
      };
    }

    const encodedSiteUrl = encodeURIComponent(resolution.siteUrl);
    const encodedSitemapUrl = encodeURIComponent(data.sitemapUrl);
    const response = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedSitemapUrl}`,
      {
        method: "PUT",
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Sitemap submission failed [${response.status}]: ${await response.text()}`,
      );
    }

    return { status: "ok" as const, siteUrl: resolution.siteUrl };
  });
