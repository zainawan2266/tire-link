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
import { buildLandingMeta } from "@/lib/short-links";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/$code")({
  loader: async ({ params }) => {
    // One canonical casing per short code — avoids duplicate landing pages.
    const canonicalCode = params.code.toLowerCase();
    if (canonicalCode !== params.code) {
      throw redirect({
        to: "/$code",
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
          { title: "Link not found | Quick Links" },
          { name: "robots", content: "noindex" },
        ],
      };
    }

    const pageUrl = `${loaderData.siteUrl}/${params.code.toLowerCase()}`;
    const { title, description, host } = buildLandingMeta(loaderData.link);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Quick Links" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
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
            datePublished: loaderData.link.created_at,
            ...(loaderData.link.category
              ? { about: loaderData.link.category }
              : {}),
            mainEntity: {
              "@type": "WebPage",
              name: loaderData.link.title || host,
              url: loaderData.link.destination_url,
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
  const { host, description } = buildLandingMeta(link);
  const heading = link.title?.trim() || `Link to ${host}`;
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
            Quick Links
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
          <div className="flex flex-wrap items-center gap-2">
            {link.category && <Badge variant="secondary">{link.category}</Badge>}
            {link.campaign && <Badge variant="outline">{link.campaign}</Badge>}
            <span className="text-xs text-muted-foreground">
              Published {created}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>

          <dl className="mt-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Destination website
              </dt>
              <dd className="mt-1 break-all font-medium text-foreground">
                {host}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Short link
              </dt>
              <dd className="mt-1 font-medium text-foreground">/{code}</dd>
            </div>
            {link.category && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Category
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {link.category}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Created
              </dt>
              <dd className="mt-1 font-medium text-foreground">{created}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <a
              href={link.destination_url}
              onClick={handleVisit}
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Visit website
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              This page describes an external resource. Clicking the button
              above takes you to {host}, which is operated by a third party.
            </p>
          </div>

          <section className="mt-10 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">
              About this resource page
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Quick Links creates a permanent, human-readable page for every
              short link so visitors can see where a link goes before opening
              it. Nothing is redirected automatically — you choose whether to
              continue to {host}.
            </p>
            <p className="mt-4 text-sm">
              <Link
                to="/links"
                className="inline-flex items-center gap-1 text-foreground hover:underline"
              >
                Browse more resource pages
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">
          Quick Links
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
