/**
 * Gallery — work photos for /gallery and the WorkGallery homepage section.
 * TEMPLATE DEFAULT: empty. Add entries ONLY when real, paired job photos
 * physically exist. Never ship demo/stock images here labelled as real work
 * (DESIGN-LIBRARY G5 / guardrail B7).
 *
 * Images: import from src/assets/images/gallery/ (astro:assets pipeline).
 */
import type { ImageMetadata } from "astro";

/* Trade-agnostic: a service key is any string the client uses. */
export type GalleryService = string;
export type GalleryImageKind = "before" | "after" | "single";

export type GalleryImage = {
  src: ImageMetadata;
  alt: string;
  kind: GalleryImageKind;
};

export type GalleryEntry = {
  id: string;
  service: GalleryService;
  suburb: string;
  monthCompleted: string;
  oneLineDescription: string;
  images: GalleryImage[];
  isPlaceholder: boolean;
};

/* Optional human-readable names per service key. Fill per client if used. */
export const galleryServiceNames: Record<string, string> = {};

/* Empty by default. Real paired photos only. */
export const galleryEntries: GalleryEntry[] = [];

export function getRecentGalleryEntries(limit = 6): GalleryEntry[] {
  return galleryEntries.slice(0, limit);
}

export function getGalleryByService(service: GalleryService): GalleryEntry[] {
  return galleryEntries.filter((entry) => entry.service === service);
}
