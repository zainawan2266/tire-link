import { describe, expect, it } from "vitest";
import { buildLinkPreview, isSocialCrawler, normalizeCode } from "./short-links";

describe("isSocialCrawler", () => {
  it("detects common link-preview bots", () => {
    for (const ua of [
      "facebookexternalhit/1.1",
      "Twitterbot/1.0",
      "LinkedInBot/1.0",
      "Slackbot-LinkExpanding 1.0",
      "Mozilla/5.0 (compatible; Discordbot/2.0)",
      "WhatsApp/2.19",
      "TelegramBot (like TwitterBot)",
    ]) {
      expect(isSocialCrawler(ua), ua).toBe(true);
    }
  });

  it("treats real browsers and empty agents as humans", () => {
    expect(isSocialCrawler("Mozilla/5.0 (Macintosh) Chrome/120")).toBe(false);
    expect(isSocialCrawler(undefined)).toBe(false);
    expect(isSocialCrawler("")).toBe(false);
  });
});

describe("buildLinkPreview", () => {
  it("uses the link title and campaign when present", () => {
    const preview = buildLinkPreview({
      code: "ab12",
      title: "Winter tire guide",
      campaign: "guest-posts",
      destination_url: "https://www.example.com/winter-tires",
    });

    expect(preview.title).toBe("Winter tire guide");
    expect(preview.host).toBe("example.com");
    expect(preview.description).toContain("guest-posts");
    expect(preview.description).toContain("example.com");
  });

  it("falls back to a branded title when no label exists", () => {
    const preview = buildLinkPreview({
      code: "ab12",
      title: null,
      campaign: null,
      destination_url: "https://blog.example.org/post",
    });

    expect(preview.title).toBe("Quick Links — /ab12");
    expect(preview.host).toBe("blog.example.org");
    expect(preview.description).toContain("/ab12");
  });

  it("keeps descriptions within the 160 character meta limit", () => {
    const preview = buildLinkPreview({
      code: "ab12",
      title: "T".repeat(200),
      campaign: "C".repeat(100),
      destination_url: "https://example.com/x",
    });

    expect(preview.description.length).toBeLessThanOrEqual(160);
  });

  it("tolerates unparsable destinations", () => {
    const preview = buildLinkPreview({
      code: "ab12",
      title: null,
      campaign: null,
      destination_url: "not-a-url",
    });

    expect(preview.host).toBe("not-a-url");
  });
});

describe("normalizeCode", () => {
  it("lowercases and slugifies custom codes", () => {
    expect(normalizeCode("  My Anchor Text! ")).toBe("my-anchor-text");
  });
});
