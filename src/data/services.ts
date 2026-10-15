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
 *
 * Data only. The record shape is `Service` in src/lib/types.ts (shared, synced).
 */
import type { Service } from "../lib/types";

/* Empty by default. Populate per client for detailed service pages. */
export const services: Service[] = [];
