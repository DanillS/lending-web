import { afterEach, describe, expect, it } from "vitest";
import { PRODUCTION_ORIGIN, absoluteUrl, clip, shareImageUrl, shareMeta, siteOrigin } from "./seo";

describe("seo", () => {
  const prevUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = prevUrl;
    process.env.NODE_ENV = prevEnv;
  });

  it("builds absolute urls from the site origin", () => {
    expect(absoluteUrl("/catalog")).toMatch(/\/catalog$/);
    expect(absoluteUrl("https://cdn.example/a.webp")).toBe("https://cdn.example/a.webp");
  });

  it("does not emit localhost share urls in production", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost";
    process.env.NODE_ENV = "production";
    expect(siteOrigin()).toBe(PRODUCTION_ORIGIN);
    expect(shareImageUrl("/images/14.webp")).toBe(`${PRODUCTION_ORIGIN}/images/14.webp`);
  });

  it("does not use svg as a share image", () => {
    expect(shareImageUrl("/images/accessories/handle.svg")).toContain("beutyDoor/1.jpg");
    expect(shareImageUrl("/images/1.webp")).toContain("/images/1.webp");
  });

  it("fills open graph and twitter fields", () => {
    const meta = shareMeta({
      title: "K-1",
      description: "Дверь в Казани",
      path: "/product/k-1",
      image: "/images/1.webp",
    });
    expect(meta.openGraph?.url).toMatch(/\/product\/k-1$/);
    expect(meta.twitter?.card).toBe("summary_large_image");
  });

  it("clips long descriptions", () => {
    expect(clip("а".repeat(200), 20).endsWith("…")).toBe(true);
  });
});
