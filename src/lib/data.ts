/**
 * data.ts — lookups over the client's records in src/data/*.ts.
 *
 * These used to be exported from the data files themselves, which are
 * client-owned and never synced, so a fix to one never reached a client.
 * Record shapes: src/lib/types.ts.
 */
import { services } from "../data/services";
import { galleryEntries } from "../data/gallery";
import { recentJobs } from "../data/recent-jobs";
import type { GalleryEntry, GalleryService, RecentJob, Service } from "./types";

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function formatServicePrice(service: Service): string {
  const amount = Number.isInteger(service.priceFrom)
    ? service.priceFrom.toFixed(0)
    : service.priceFrom.toFixed(2);
  return `From $${amount} ${service.priceUnit}`;
}

export function getRecentGalleryEntries(limit = 6): GalleryEntry[] {
  return galleryEntries.slice(0, limit);
}

export function getGalleryByService(service: GalleryService): GalleryEntry[] {
  return galleryEntries.filter((entry) => entry.service === service);
}

export function getRecentJobs(limit = 6): RecentJob[] {
  return recentJobs.slice(0, limit);
}
