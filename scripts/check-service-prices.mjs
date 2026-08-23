/**
 * check-service-prices.mjs — BLOCKING on production builds.
 *
 * It was downgraded to advisory for a demo and left that way, but it kept
 * printing the original string: "Refusing production build due to ..." followed
 * by process.exit(0). It announced a refusal and then permitted the build. Fake
 * prices, placeholder gallery entries, invented recent jobs and unsourced
 * testimonials all shipped while the log claimed they had been blocked — the
 * worst kind of guard, because reading the output made you MORE confident.
 *
 * Worse, isProductionBuild() was computed and then never consulted by the
 * placeholder branch, so even the intended dev/prod split was never wired.
 *
 * Behaviour now:
 *   production build   placeholders -> print them, exit 1. Nothing ships.
 *   dev / explicit opt-out         -> print them, exit 0, clearly labelled advisory.
 *
 * The opt-out is deliberate and narrow: `npm run build:force-placeholders`
 * (or ALLOW_PLACEHOLDER_PRICES=1) for demo builds on a throwaway URL. Using it
 * on a client's real domain puts invented pricing on a site carrying their ABN,
 * which is an ACCC problem and theirs, not yours.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function isProductionBuild() {
  if (process.argv.includes("--allow-placeholders")) return false;
  if (process.env.ALLOW_PLACEHOLDER_PRICES === "1") return false;
  if (process.env.ASTRO_MODE === "production") return true;
  if (process.env.NODE_ENV === "production") return true;
  if (process.env.npm_lifecycle_event === "build") return true;
  return false;
}

function loadPlaceholderSlugs() {
  const tsPath = join(root, "src", "data", "services.ts");
  if (!existsSync(tsPath)) {
    console.error(`[check-service-prices] Missing ${tsPath}`);
    process.exit(1);
  }
  const source = readFileSync(tsPath, "utf8");
  const placeholders = [];
  const chunks = source.split(/slug:\s*"/).slice(1);
  for (const chunk of chunks) {
    const slug = chunk.slice(0, chunk.indexOf('"'));
    const flagMatch = chunk.match(/priceIsPlaceholder:\s*(true|false)/);
    if (!flagMatch) {
      console.error(`[check-service-prices] No priceIsPlaceholder on service "${slug}"`);
      process.exit(1);
    }
    if (flagMatch[1] === "true") placeholders.push(slug);
  }
  return placeholders;
}

function loadGalleryPlaceholderIds() {
  const tsPath = join(root, "src", "data", "gallery.ts");
  if (!existsSync(tsPath)) {
    console.error(`[check-service-prices] Missing ${tsPath}`);
    process.exit(1);
  }

  const source = readFileSync(tsPath, "utf8");
  const placeholders = [];
  const chunks = source.split(/id:\s*"/).slice(1);
  for (const chunk of chunks) {
    const id = chunk.slice(0, chunk.indexOf('"'));
    const flagMatch = chunk.match(/isPlaceholder:\s*(true|false)/);
    if (!flagMatch) {
      console.error(`[check-service-prices] No isPlaceholder on gallery entry "${id}"`);
      process.exit(1);
    }
    if (flagMatch[1] === "true") placeholders.push(id);
  }
  return placeholders;
}

function loadRecentJobPlaceholders() {
  const tsPath = join(root, "src", "data", "recent-jobs.ts");
  if (!existsSync(tsPath)) {
    console.error(`[check-service-prices] Missing ${tsPath}`);
    process.exit(1);
  }

  const source = readFileSync(tsPath, "utf8");
  const placeholders = [];
  const chunks = source.split(/suburb:\s*"/).slice(1);
  for (const [index, chunk] of chunks.entries()) {
    const flagMatch = chunk.match(/isPlaceholder:\s*(true|false)/);
    if (!flagMatch) {
      console.error(`[check-service-prices] No isPlaceholder on recent job ${index + 1}`);
      process.exit(1);
    }
    if (flagMatch[1] === "true") placeholders.push(`recent-job-${index + 1}`);
  }
  return placeholders;
}

function loadUnsourcedTestimonials() {
  const tsPath = join(root, "src", "data", "testimonials.ts");
  if (!existsSync(tsPath)) {
    console.error(`[check-service-prices] Missing ${tsPath}`);
    process.exit(1);
  }

  const source = readFileSync(tsPath, "utf8");
  const arrayMatch = source.match(/export const testimonials[^=]*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    console.error("[check-service-prices] Could not parse testimonials array");
    process.exit(1);
  }

  const body = arrayMatch[1].trim();
  if (!body) return [];

  const entries = body.split(/firstName:\s*"/).slice(1);
  if (!entries.length) {
    console.error("[check-service-prices] Non-empty testimonials array could not be validated");
    process.exit(1);
  }

  return entries.flatMap((entry, index) => {
    const firstName = entry.slice(0, entry.indexOf('"')) || `testimonial-${index + 1}`;
    const sourceUrl = entry.match(/sourceUrl:\s*"([^"]*)"/)?.[1]?.trim();
    return sourceUrl ? [] : [firstName];
  });
}

const pricePlaceholders = loadPlaceholderSlugs();
const galleryPlaceholders = loadGalleryPlaceholderIds();
const recentJobPlaceholders = loadRecentJobPlaceholders();
const unsourcedTestimonials = loadUnsourcedTestimonials();

if (
  pricePlaceholders.length ||
  galleryPlaceholders.length ||
  recentJobPlaceholders.length ||
  unsourcedTestimonials.length
) {
  const failures = [];
  if (pricePlaceholders.length) {
    failures.push(`placeholder prices: ${pricePlaceholders.join(", ")}`);
  }
  if (galleryPlaceholders.length) {
    failures.push(`placeholder gallery entries: ${galleryPlaceholders.join(", ")}`);
  }
  if (recentJobPlaceholders.length) {
    failures.push(`placeholder recent jobs: ${recentJobPlaceholders.join(", ")}`);
  }
  if (unsourcedTestimonials.length) {
    failures.push(`testimonials missing sourceUrl: ${unsourcedTestimonials.join(", ")}`);
  }
  const detail = failures.join("; ");

  /* The distinction the original code computed and then ignored. */
  if (isProductionBuild()) {
    console.error(`[check-service-prices] Refusing production build due to ${detail}.`);
    console.error(
      "  Replace the placeholder content, or run `npm run build:force-placeholders` " +
        "if this is a throwaway demo URL. Do not use that flag on a client domain."
    );
    process.exit(1);
  }

  console.warn(`[check-service-prices] ADVISORY (not a production build): ${detail}.`);
  console.warn("  This WILL block `npm run build`.");
  process.exit(0);
}

if (!isProductionBuild()) {
  console.log("[check-service-prices] All guarded content is ready for production.");
} else {
  console.log("[check-service-prices] Production OK: all guarded content is complete.");
}
process.exit(0);
