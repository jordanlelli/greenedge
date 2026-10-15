/**
 * Gallery — work photos for /gallery and the WorkGallery homepage section.
 * TEMPLATE DEFAULT: empty. Add entries ONLY when real, paired job photos
 * physically exist. Never ship demo/stock images here labelled as real work
 * (DESIGN-LIBRARY G5 / guardrail B7).
 *
 * Images: import from src/assets/images/gallery/ (astro:assets pipeline).
 *
 * Data only. The record shape is `GalleryEntry` in src/lib/types.ts (shared, synced).
 */
import type { GalleryEntry } from "../lib/types";

/* Optional human-readable names per service key. Fill per client if used. */
export const galleryServiceNames: Record<string, string> = {};

/* Optional heading + intro per service group on /gallery. The heading is the
   H2 for that group, so write it as the service people search for
   ("Exposed aggregate driveways"), not the internal key. */
export const gallerySectionCopy: Record<string, { heading: string; intro: string }> = {};

/* Empty by default. Real paired photos only. */
export const galleryEntries: GalleryEntry[] = [];
