/**
 * Services — single source of truth for the /services detail pages and the
 * /services/[slug] routes. TEMPLATE DEFAULT: empty. Add one record per service
 * when the client wants rich, per-service pages with process/inclusions/photos.
 *
 * For the homepage hero card row you do NOT need this file — that reads the
 * simpler `services.items[]` block in client-intake.json. Use this file only
 * when a client warrants full detail pages.
 *
 * Images: import from src/assets/images/services/ (astro:assets pipeline) and
 * attach to `images[]`. Never point at /public paths here.
 */
import type { ImageMetadata } from "astro";

export type PriceUnit = "per visit" | "per m²" | "per hour" | "per job";

export type ServiceImage = {
  src: ImageMetadata;
  alt: string;
};

export type Service = {
  slug: string;
  name: string;
  shortLine: string;
  longDescription: string;
  process: string[];
  inclusions: string[];
  exclusions: string[];
  priceFrom: number;
  priceUnit: PriceUnit;
  priceIsPlaceholder: boolean;
  typicalDuration: string;
  whatCustomerNeedsToPrepare: string[];
  images: ServiceImage[];
};

/* Empty by default. Populate per client for detailed service pages. */
export const services: Service[] = [];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function formatServicePrice(service: Service): string {
  const amount = Number.isInteger(service.priceFrom)
    ? service.priceFrom.toFixed(0)
    : service.priceFrom.toFixed(2);
  return `From $${amount} ${service.priceUnit}`;
}
