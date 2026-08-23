import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { listPublicShortLinks } from "@/lib/short-links.functions";
import { hostOf } from "@/lib/short-links";
import { getServerSiteUrl } from "@/lib/site-url";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

const SITE_URL = "https://tire-link.lovable.app";

export const Route = createFileRoute("/links")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) => listPublicShortLinks({ data: { page: deps.page } }),
  head: ({ loaderData }) => {
    const page = loaderData?.page ?? 1;
    const url = page > 1 ? `${SITE_URL}/links?page=${page}` : `${SITE_URL}/links`;
    const title =
      page > 1
        ? `Link Directory — Page ${page} | Quick Links`
        : "Link Directory | Quick Links";
    const description =
      "Browse every public Quick Links resource page: the title, category and destination website behind each short link.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: LinksDirectory,
});

function LinksDirectory() {
  const { links, page, totalPages, total } = Route.useLoaderData();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold text-foreground">
            Quick Links
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            Create a link
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Link directory
        </h1>
        <p className="mt-2 text-muted-foreground" suppressHydrationWarning>
          {total} public resource page{total === 1 ? "" : "s"}. Each entry has
          its own page describing where the link goes.
        </p>

        <ul className="mt-8 space-y-3">
          {links.map((link) => (
            <li
              key={link.code}
              className="rounded-lg border border-border bg-card p-4"
            >
              <a
                href={`/${link.code}`}
                className="font-semibold text-foreground hover:underline"
              >
                {link.title?.trim() || `Link to ${hostOf(link.destination_url)}`}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">
                {link.description?.trim() ||
                  `External resource on ${hostOf(link.destination_url)}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                /{link.code} · {hostOf(link.destination_url)}
                {link.category ? ` · ${link.category}` : ""}
              </p>
            </li>
          ))}
        </ul>

        {links.length === 0 && (
          <p className="mt-8 text-muted-foreground">No public links yet.</p>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-between text-sm">
            {page > 1 ? (
              <a href={`/links?page=${page - 1}`} className="hover:underline">
                ← Previous
              </a>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <a href={`/links?page=${page + 1}`} className="hover:underline">
                Next →
              </a>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Powered and Secured by{" "}
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
