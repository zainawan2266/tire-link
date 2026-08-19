import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getTirePage } from "@/lib/tire-pages.functions";
import type { TirePage } from "@/lib/tire-pages";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Tag, Truck, Gauge } from "lucide-react";

const tireQueryOptions = (slug: string) => ({
  queryKey: ["tire-page", slug],
  queryFn: () => getTirePage({ data: { slug } }),
});

export const Route = createFileRoute("/tires/$slug")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(tireQueryOptions(params.slug)),
  head: ({ loaderData }) => {
    const page = loaderData as TirePage;
    const title = page.meta_title || `${page.brand} ${page.model} Tires`;
    const description =
      page.meta_description ||
      `Find the best deals on ${page.brand} ${page.model} tires.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${page.brand} ${page.model}`,
            brand: { "@type": "Brand", name: page.brand },
            description: page.description || undefined,
            offers: page.price
              ? {
                  "@type": "Offer",
                  price: page.price.toString(),
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                  url: page.affiliate_link || undefined,
                }
              : undefined,
          }),
        },
      ],
    };
  },
  component: TirePageComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-foreground">Tire page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The tire page you are looking for does not exist.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Generate a new page</Link>
      </Button>
    </div>
  ),
});

function TirePageComponent() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(tireQueryOptions(slug));

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to generator
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              {page.season && <Badge variant="secondary">{page.season}</Badge>}
              {page.vehicle_type && (
                <Badge variant="secondary">{page.vehicle_type}</Badge>
              )}
            </div>
            <CardTitle className="mt-3 text-3xl font-bold">
              {page.brand} {page.model}
            </CardTitle>
            <CardDescription className="text-lg">
              {page.size && <span className="mr-3">Size: {page.size}</span>}
              {page.price && (
                <span className="font-semibold text-foreground">
                  ${Number(page.price).toFixed(2)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {page.description && (
              <p className="text-muted-foreground leading-relaxed">
                {page.description}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              {page.brand && (
                <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                  <Tag className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Brand</p>
                    <p className="font-medium">{page.brand}</p>
                  </div>
                </div>
              )}
              {page.vehicle_type && (
                <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                  <Truck className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="font-medium">{page.vehicle_type}</p>
                  </div>
                </div>
              )}
              {page.season && (
                <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                  <Gauge className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Season</p>
                    <p className="font-medium">{page.season}</p>
                  </div>
                </div>
              )}
            </div>

            {page.affiliate_link && (
              <Button asChild size="lg" className="w-full">
                <a
                  href={page.affiliate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check price & availability
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
