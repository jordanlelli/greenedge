/**
 * Recent jobs — a short "latest work" strip for the homepage. TEMPLATE
 * DEFAULT: empty (the section self-hides when empty). Add entries only for
 * real, completed jobs; never stock/demo imagery presented as your own work.
 *
 * Photos: import from src/assets/images/ (astro:assets pipeline).
 */
import type { ImageMetadata } from "astro";
import type { GalleryService } from "./gallery";

export type RecentJob = {
  suburb: string;
  service: GalleryService;
  month: string;
  oneLine: string;
  photo?: ImageMetadata;
  photoAlt?: string;
  isPlaceholder: boolean;
};

/* Newest first. Empty by default. */
export const recentJobs: RecentJob[] = [];

export function getRecentJobs(limit = 6): RecentJob[] {
  return recentJobs.slice(0, limit);
}
