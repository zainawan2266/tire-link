import {
  createFileRoute,
  notFound,
  redirect,
  Link,
} from "@tanstack/react-router";
import {
  resolveShortLink,
  trackShortLinkClick,
} from "@/lib/short-links.functions";
import { buildLandingMeta, SITE_NAME } from "@/lib/short-links";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ExternalLink, Globe } from "lucide-react";

export const Route = createFileRoute("/s/$code")({
  loader: async ({ params }) => {
    // One canonical casing per short code — avoids duplicate landing pages.
    const canonicalCode = params.code.toLowerCase();
    if (canonicalCode !== params.code) {
      throw redirect({
        to: "/s/$code",
        params: { code: canonicalCode },
        statusCode: 301,
      });
    }

    const { link, siteUrl } = await resolveShortLink({
      data: { code: canonicalCode },
    });

    // Unknown or private codes must 404 — never an indexable empty page.
    if (!link || link.is_public === false) throw notFound();

    return { code: canonicalCode, link, siteUrl };
  },
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
  }),
  head: ({ params, loaderData }) => {
    if (!loaderData?.link) {
      return {
        meta: [
          { title: `Link not found | ${SITE_NAME}` },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    const link = loaderData.link;
    const pageUrl = `${loaderData.siteUrl}/s/${params.code.toLowerCase()}`;
    const { title, description, host } = buildLandingMeta(link);
    const image = link.og_image || null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "robots",
          content: link.indexable === false ? "noindex, nofollow" : "index, follow",
        },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        ...(image ? [{ property: "og:image", content: image }] : []),
        {
          name: "twitter:card",
          content: image ? "summary_large_image" : "summary",
        },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: pageUrl,
            ...(image ? { image } : {}),
            datePublished: link.created_at,
            isPartOf: {
              "@type": "WebSite",
              name: SITE_NAME,
              url: loaderData.siteUrl,
            },
            ...(link.category ? { about: link.category } : {}),
            mainEntity: {
              "@type": "WebPage",
              name: link.og_title || link.title || host,
              url: link.destination_url,
            },
          }),
        },
      ],
    };
  },
  component: LandingPage,
});

function LandingPage() {
  const { code, link } = Route.useLoaderData();
  const { host, description, heading } = buildLandingMeta(link);
  const created = new Date(link.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function handleVisit() {
    // Fire-and-forget: only real "Visit website" clicks are counted.
    void trackShortLinkClick({ data: { code } }).catch(() => {});
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold text-foreground">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/links" className="hover:underline">
              Directory
            </Link>
            <Link to="/" className="hover:underline">
              Create a link
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <article>
          {link.og_image && (
            <img
              src={link.og_image}
              alt={`Preview image from ${host}`}
              loading="lazy"
              decoding="async"
              className="mb-6 aspect-[1.91/1] w-full rounded-lg border border-border object-cover"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {link.favicon ? (
              <img
                src={link.favicon}
                alt=""
                width={16}
                height={16}
                loading="lazy"
                className="h-4 w-4 rounded-sm"
              />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">{host}</span>
            {link.category && <Badge variant="secondary">{link.category}</Badge>}
            {link.campaign && <Badge variant="outline">{link.campaign}</Badge>}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>

          {link.content_summary && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {link.content_summary}
            </p>
          )}

          <dl className="mt-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Domain
              </dt>
              <dd className="mt-1 break-all font-medium text-foreground">
                {host}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Short link
              </dt>
              <dd className="mt-1 font-medium text-foreground">/s/{code}</dd>
            </div>
            {link.og_title || link.title ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Page title
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {link.og_title || link.title}
                </dd>
              </div>
            ) : null}
            {link.h1 && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Main heading
                </dt>
                <dd className="mt-1 font-medium text-foreground">{link.h1}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Published
              </dt>
              <dd className="mt-1 font-medium text-foreground">{created}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={link.destination_url}
              onClick={handleVisit}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Visit website
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={link.canonical_url || link.destination_url}
              onClick={handleVisit}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              Open original website
            </a>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            You are on a preview page. Nothing is redirected automatically —
            clicking above opens {host}, operated by a third party.
          </p>

          <section className="mt-10 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">
              About this link
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This page provides a preview of the destination website before you
              continue to the original URL. The title, description and image
              shown here come from {host} itself and were last checked
              {link.last_fetched_at
                ? ` on ${new Date(link.last_fetched_at).toLocaleDateString("en-US")}`
                : ""}
              .
            </p>
            <p className="mt-4 text-sm">
              <Link
                to="/links"
                className="inline-flex items-center gap-1 text-foreground hover:underline"
              >
                Browse more preview pages
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">
          {SITE_NAME}
        </Link>{" "}
        · Powered and Secured by{" "}
        <a
          href="https://maps.app.goo.gl/3WzLJnmQWRcF9KUR6"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          MZA Tech Zone
        </a>
      </footer>
    </div>
  );
}
