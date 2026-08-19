import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createTirePage, listTirePages } from "@/lib/tire-pages.functions";
import { submitSitemap } from "@/lib/search-console.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Link2,
  Search,
  Globe,
  CheckCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useState } from "react";

const tireFormSchema = z.object({
  brand: z.string().min(1, "Brand is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  size: z.string().max(50).optional(),
  season: z.string().max(50).optional(),
  vehicleType: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().nonnegative().optional(),
  affiliateLink: z.string().url().max(1000).optional().or(z.literal("")),
});

type TireFormValues = z.infer<typeof tireFormSchema>;

const tirePagesQueryOptions = {
  queryKey: ["tire-pages"],
  queryFn: () => listTirePages(),
};

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tirePagesQueryOptions),
  head: () => ({
    meta: [
      { title: "TireLink Gen — Build Tire Landing Pages for Google" },
      {
        name: "description",
        content:
          "Generate SEO-friendly tire landing pages in seconds. Build a sitemap and submit it to Google Search Console for indexing.",
      },
      {
        property: "og:title",
        content: "TireLink Gen — Build Tire Landing Pages for Google",
      },
      {
        property: "og:description",
        content:
          "Generate SEO-friendly tire landing pages in seconds. Build a sitemap and submit it to Google Search Console for indexing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const { data: tirePages } = useSuspenseQuery(tirePagesQueryOptions);
  const [isSubmittingSitemap, setIsSubmittingSitemap] = useState(false);

  const form = useForm<TireFormValues>({
    resolver: zodResolver(tireFormSchema),
    defaultValues: {
      brand: "",
      model: "",
      size: "",
      season: "",
      vehicleType: "",
      description: "",
      price: undefined,
      affiliateLink: "",
    },
  });

  async function onSubmit(values: TireFormValues) {
    try {
      const page = await createTirePage({ data: values });
      toast.success("Tire page created", {
        description: `/${page.slug} is ready to share with Google.`,
      });
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["tire-pages"] });
    } catch (error) {
      toast.error("Could not create page", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleSubmitSitemap() {
    const sitemapUrl = `${window.location.origin}/sitemap.xml`;
    setIsSubmittingSitemap(true);
    try {
      const result = await submitSitemap({ data: { sitemapUrl } });
      if (result.status === "selection_required") {
        toast.info("Choose a Search Console property", {
          description: `Multiple properties match. Please pick one: ${result.candidates.join(", ")}`,
        });
      } else {
        toast.success("Sitemap submitted", {
          description: `Google Search Console accepted the sitemap for ${result.siteUrl}.`,
        });
      }
    } catch (error) {
      toast.error("Submission failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmittingSitemap(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-card px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            Fast, easy, simple
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            TireLink Gen
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Build SEO-friendly tire landing pages in seconds, generate a
            sitemap, and submit it straight to Google Search Console.
          </p>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent-foreground" />
                Generate a tire page
              </CardTitle>
              <CardDescription>
                Fill in the details. We will build the page, meta tags, and
                sitemap entry automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Michelin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Pilot Sport 4S" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size</FormLabel>
                          <FormControl>
                            <Input placeholder="225/45R17" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="season"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Season</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="All-season">
                                All-season
                              </SelectItem>
                              <SelectItem value="Summer">Summer</SelectItem>
                              <SelectItem value="Winter">Winter</SelectItem>
                              <SelectItem value="Performance">
                                Performance
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Passenger car">
                                Passenger car
                              </SelectItem>
                              <SelectItem value="SUV / Truck">
                                SUV / Truck
                              </SelectItem>
                              <SelectItem value="Motorcycle">
                                Motorcycle
                              </SelectItem>
                              <SelectItem value="Commercial">
                                Commercial
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="High-performance summer tire with excellent wet and dry grip..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (USD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="149.99"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="affiliateLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Affiliate / buy link</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Generate tire page
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-5 w-5" />
                  Index on Google
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Submit your sitemap to Google Search Console so every tire
                  page can be crawled and indexed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleSubmitSitemap}
                  disabled={isSubmittingSitemap}
                >
                  {isSubmittingSitemap ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  Submit sitemap
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How it works</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent-foreground" />
                    Fill the tire details and generate a page.
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent-foreground" />
                    Every page gets SEO meta tags and structured data.
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent-foreground" />
                    Submit /sitemap.xml to Google Search Console.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {tirePages && tirePages.length > 0 && (
        <section className="border-t border-border px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold text-foreground">
              Generated tire pages
            </h2>
            <p className="mt-1 text-muted-foreground">
              {tirePages.length} page{tirePages.length === 1 ? "" : "s"}{" "}
              ready for Google.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tirePages.map((page) => (
                <Card key={page.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      {page.season && (
                        <Badge variant="secondary">{page.season}</Badge>
                      )}
                      {page.vehicle_type && (
                        <Badge variant="secondary">{page.vehicle_type}</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-2 text-lg">
                      {page.brand} {page.model}
                    </CardTitle>
                    <CardDescription>
                      {page.size && <span>{page.size}</span>}
                      {page.price && (
                        <span className="ml-2 font-medium text-foreground">
                          ${Number(page.price).toFixed(2)}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link to="/tires/$slug" params={{ slug: page.slug }}>
                        View page
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
