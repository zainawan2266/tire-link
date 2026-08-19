import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createShortLink,
  deleteShortLink,
  listShortLinks,
} from "@/lib/short-links.functions";
import { getBrowserSiteUrl } from "@/lib/site-url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  Link2,
  CheckCircle,
  Copy,
  Loader2,
  Trash2,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";

const formSchema = z.object({
  destinationUrl: z.string().url("Enter a full URL, including https://"),
  title: z.string().max(200).optional(),
  campaign: z.string().max(120).optional(),
  customCode: z.string().max(60).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const linksQueryOptions = {
  queryKey: ["short-links"],
  queryFn: () => listShortLinks(),
};

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(linksQueryOptions),
  head: () => ({
    meta: [
      { title: "TRG Links — Fast Short Links for SEO Backlinks" },
      {
        name: "description",
        content:
          "Create short backlink URLs in one click and track clicks.",
      },
      {
        property: "og:title",
        content: "TRG Links — Fast Short Links for SEO Backlinks",
      },
      {
        property: "og:description",
        content:
          "Create short backlink URLs in one click and track clicks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const { data: links } = useSuspenseQuery(linksQueryOptions);
  const [siteUrl, setSiteUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    setSiteUrl(getBrowserSiteUrl());
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destinationUrl: "",
      title: "",
      campaign: "",
      customCode: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const link = await createShortLink({ data: values });
      const shortUrl = `${siteUrl}/${link.code}`;
      let copied = false;
      try {
        await navigator.clipboard.writeText(shortUrl);
        copied = true;
        setCopiedCode(link.code);
        setTimeout(() => setCopiedCode(null), 1500);
      } catch {
        copied = false;
      }
      toast.success(copied ? "Short link copied" : "Short link ready", {
        description: shortUrl,
      });
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["short-links"] });
    } catch (error) {
      toast.error("Could not create link", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(`${siteUrl}/${code}`);
    setCopiedCode(code);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 1500);
  }

  async function handleDelete(code: string) {
    try {
      await deleteShortLink({ data: { code } });
      await queryClient.invalidateQueries({ queryKey: ["short-links"] });
      toast.success("Link deleted");
    } catch (error) {
      toast.error("Could not delete link", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const totalClicks = links.reduce((sum, link) => sum + (link.clicks ?? 0), 0);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-card px-4 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Fast, easy, simple
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            TRG Links
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Shorten any URL into a clean backlink, track its clicks and push
            your link to Google Search Console for indexing. Track Your Links Every 2 Days
          </p>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-accent-foreground" />
                Create a short link
              </CardTitle>
              <CardDescription>
                Paste a destination URL. We generate the short code instantly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="destinationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/your-page"
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
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Homepage backlink" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="campaign"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="guest-posts" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom short code (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="my-anchor-text" {...field} />
                        </FormControl>
                        <FormDescription>
                          {`${siteUrl.replace(/^https?:\/\//, "") || "your-site.com"}/your-code`} — leave empty for a random code.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Generate short link
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-accent-foreground" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Short links</span>
                  <span className="font-semibold text-foreground">
                    {links.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total clicks</span>
                  <span className="font-semibold text-foreground">
                    {totalClicks}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-accent-foreground" />
                  Every short link redirects instantly and counts clicks.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {links.length > 0 && (
        <section className="border-t border-border px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold text-foreground">
              Your short links
            </h2>
            <div className="mt-6 space-y-3">
              {links.map((link) => (
                <Card key={link.id}>
                  <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/${link.code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-foreground hover:underline"
                        >
                          {(siteUrl || "").replace(/^https?:\/\//, "")}/
                          {link.code}
                        </a>
                        {link.campaign && (
                          <Badge variant="secondary">{link.campaign}</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {link.title ? `${link.title} — ` : ""}
                        {link.destination_url}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{link.clicks ?? 0} clicks</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(link.code)}
                      >
                        {copiedCode === link.code ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(link.code)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>
          Powered and Secured by the{" "}
          <a
            href="http://therankinggeeks.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-foreground"
          >
            The Ranking Geeks
          </a>
        </p>
      </footer>
    </main>
  );
}
