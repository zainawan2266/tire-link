import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { resolveShortLink } from "@/lib/short-links.functions";
import { buildLinkPreview } from "@/lib/short-links";

export const Route = createFileRoute("/$code")({
  loader: async ({ params }) => {
    const { link, isCrawler, siteUrl } = await resolveShortLink({
      data: { code: params.code },
    });

    // Humans go straight through; link-preview crawlers get the OG page.
    if (link && !isCrawler) {
      throw redirect({ href: link.destination_url, reloadDocument: true });
    }

    return { code: params.code, link, siteUrl };
  },
  head: ({ params, loaderData }) => {
    const shortUrl = `${loaderData?.siteUrl ?? ""}/${params.code}`;

    if (!loaderData?.link) {
      return {
        meta: [
          { title: "Link not found — Quick Links" },
          {
            name: "description",
            content: `No short link exists for /${params.code}.`,
          },
          { name: "robots", content: "noindex" },
          { property: "og:title", content: "Link not found — Quick Links" },
          {
            property: "og:description",
            content: `No short link exists for /${params.code}.`,
          },
          { property: "og:type", content: "website" },
          { property: "og:url", content: shortUrl },
          { name: "twitter:card", content: "summary" },
          { name: "twitter:title", content: "Link not found — Quick Links" },
          {
            name: "twitter:description",
            content: `No short link exists for /${params.code}.`,
          },
        ],
      };
    }

    const { title, description, host } = buildLinkPreview(loaderData.link);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, follow" },
        { property: "og:site_name", content: "Quick Links" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: shortUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: loaderData.link.destination_url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: shortUrl,
            mainEntityOfPage: loaderData.link.destination_url,
            publisher: { "@type": "Organization", name: host },
          }),
        },
      ],
    };
  },
  component: CodePage,
});

function CodePage() {
  const { code, link } = Route.useLoaderData();

  if (link) {
    const { title, description } = buildLinkPreview(link);
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <a
            href={link.destination_url}
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Continue
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Link not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No short link exists for “{code}”.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create a short link
        </Link>
      </div>
    </main>
  );
}
