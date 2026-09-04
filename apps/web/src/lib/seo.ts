import type { Metadata } from "next";

export const SITE_NAME = "Качественные двери";
export const DEFAULT_OG_IMAGE = "/beutyDoor/1.jpg";
export const PRODUCTION_ORIGIN = "https://elite-doors.shop";

export function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const isLocal = !raw || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(raw);
  if (isLocal && process.env.NODE_ENV === "production") {
    return PRODUCTION_ORIGIN;
  }
  return raw || "http://localhost";
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${normalized}`;
}

export function shareImageUrl(path?: string | null): string {
  if (!path || path.endsWith(".svg")) return absoluteUrl(DEFAULT_OG_IMAGE);
  return absoluteUrl(path);
}

export function shareMeta(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const url = absoluteUrl(input.path);
  const image = shareImageUrl(input.image);
  const description = clip(input.description, 180);
  return {
    title: input.title,
    description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ru_RU",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [image],
    },
  };
}

export function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
