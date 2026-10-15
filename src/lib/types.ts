/**
 * types.ts — the shapes of the records in src/data/*.ts.
 *
 * WHY THEY LIVE HERE. src/data/ is client-owned: template sync never writes
 * it (template.config.json). While the types sat in those files, a field
 * added in the template never reached a client, and `template:status` could
 * only print the diff to apply by hand. Types are shared code, so they are
 * here; each data file keeps its records and an `import type` from this file.
 * The helpers that read those records are in src/lib/data.ts.
 *
 * Adding a field: make it optional, or every existing client's records stop
 * type-checking on their next pull.
 */
import type { ImageMetadata } from "astro";

/* ---- services (src/data/services.ts) ---------------------------------- */
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

/* ---- gallery (src/data/gallery.ts) ------------------------------------ */
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
  /* Optional H3 for this job. Default: "<service label> in <suburb>". Set it
     when the suburb field is not a suburb (a road, a site name) or when a
     more specific job name is the better search phrase. */
  title?: string;
  monthCompleted: string;
  oneLineDescription: string;
  images: GalleryImage[];
  isPlaceholder: boolean;
};

/* ---- recent jobs (src/data/recent-jobs.ts) ---------------------------- */
export type RecentJob = {
  suburb: string;
  service: GalleryService;
  month: string;
  oneLine: string;
  photo?: ImageMetadata;
  photoAlt?: string;
  isPlaceholder: boolean;
};

/* ---- testimonials (src/data/testimonials.ts) -------------------------- */
export type Testimonial = {
  firstName: string;
  suburb: string;
  service: string;
  quote: string;
  sourceUrl: string;
};
