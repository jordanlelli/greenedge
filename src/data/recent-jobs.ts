/**
 * Recent jobs — a short "latest work" strip for the homepage. TEMPLATE
 * DEFAULT: empty (the section self-hides when empty). Add entries only for
 * real, completed jobs; never stock/demo imagery presented as your own work.
 *
 * Photos: import from src/assets/images/ (astro:assets pipeline).
 *
 * Data only. The record shape is `RecentJob` in src/lib/types.ts (shared, synced).
 */
import type { RecentJob } from "../lib/types";

/* Newest first. Empty by default. */
export const recentJobs: RecentJob[] = [];
