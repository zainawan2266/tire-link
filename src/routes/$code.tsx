import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { resolveShortLink } from "@/lib/short-links.functions";

export const Route = createFileRoute("/$code")({
  loader: async ({ params }) => {
    const link = await resolveShortLink({ data: { code: params.code } });
    if (link) {
      throw redirect({ href: link.destination_url, reloadDocument: true });
    }
    return { code: params.code };
  },
  head: () => ({
    meta: [
      { title: "Redirecting…" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MissingLink,
});

function MissingLink() {
  const { code } = Route.useLoaderData();
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
