/**
 * images.ts — one lookup that decides whether an intake image path gets the
 * optimised pipeline or is served byte-for-byte.
 *
 * WHY (v3.21). Intake image paths are public-style ("/hero.jpg",
 * "/images/services/x.webp") and every component rendered them as a plain
 * <img>. Astro never touches public/, so whatever file was uploaded is what
 * every visitor downloaded, at one size, on every device. A&J's stock hero was
 * a 5.3 MB JPEG loaded eager + fetchpriority=high on every homepage view —
 * the single largest cost on the site, on phones included.
 *
 * THE RULE. The intake path does not change. If the same path exists under
 * src/assets/ (so "/images/services/x.webp" -> src/assets/images/services/x.webp,
 * "/hero.jpg" -> src/assets/hero.jpg) the component renders it through
 * astro:assets: resized to a srcset, re-encoded to WebP, hashed, cached
 * immutable. If it only exists in public/, it renders exactly as before.
 * Moving a file from public/ to src/assets/ is therefore the whole opt-in.
 *
 * Files that need a stable, unhashed URL stay in public/: seo.ogImage,
 * favicons, anything linked from outside the site.
 */
import type { ImageMetadata } from "astro";

const modules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}",
  { eager: true }
);

/** ImageMetadata for an intake path when the file lives under src/assets, else null. */
export function localImage(path: unknown): ImageMetadata | null {
  const p = String(path ?? "").trim();
  if (!p || /^[a-z]+:\/\//i.test(p) || p.startsWith("data:")) return null;
  const key = `/src/assets/${p.replace(/^\/+/, "")}`;
  return modules[key]?.default ?? null;
}

/** Default srcset widths. Filtered to the source width so nothing is upscaled. */
export const DEFAULT_WIDTHS = [480, 800, 1200, 1600, 2400];

export function widthsFor(meta: ImageMetadata, widths: number[] = DEFAULT_WIDTHS): number[] {
  const out = widths.filter((w) => w < meta.width);
  out.push(Math.min(meta.width, Math.max(...widths)));
  return [...new Set(out)].sort((a, b) => a - b);
}
