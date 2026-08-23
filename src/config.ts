/* ================================================================
 *  CONFIG — reads client-intake.json, exposes `site` + resolved `layout`.
 *
 *  Edit client-intake.json per client, never this file.
 *
 *  `site`   : intake with _-prefixed keys stripped — safe to RENDER.
 *  `layout` : resolveSite(rawIntake) — { kit, kitFonts, layoutVariants,
 *             order, surface, bandSection }. Deterministic per
 *             client; _brief axes always win (verify:lock enforces them).
 * ================================================================ */
import intake from "../client-intake.json";
import { testimonials } from "./data/testimonials";
import { services } from "./data/services";
import { galleryEntries } from "./data/gallery";
import { recentJobs } from "./data/recent-jobs";
// @ts-ignore — plain-JS page resolver shared with the Node check scripts
import { resolvePages } from "./lib/pages.mjs";
// @ts-ignore — plain-JS legal gate shared with the legal pages and check scripts
import { legalNavLinks } from "./lib/legal.mjs";
// @ts-ignore — plain-JS engine shared with the Node persist script
import { resolveSite } from "./lib/variants.mjs";

/* Strip _-prefixed keys (e.g. _brief, _meta, _comment) so they never render. */
const stripComments = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (key.startsWith("_")) continue;
    const value = obj[key];
    cleaned[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? stripComments(value)
        : value;
  }
  return cleaned;
};

const cleaned = stripComments(intake as Record<string, any>);

/* Dev-mode TODO detection (drives TodoBanner). */
const todos: string[] = [];
const checkRequired = (path: string, value: any) => {
  if (!value || (typeof value === "string" && (value.includes("REQUIRED") || value.includes("TODO") || value === ""))) {
    todos.push(path);
  }
};
checkRequired("business.name", cleaned.business?.name);
checkRequired("contact.phone", cleaned.contact?.phone);
checkRequired("contact.email", cleaned.contact?.email);
if (cleaned.legal?.privacy?.enabled) {
  checkRequired("legal.privacy.entityName", cleaned.legal.privacy.entityName);
  checkRequired("legal.privacy.contactEmail", cleaned.legal.privacy.contactEmail);
  checkRequired("legal.privacy.lastUpdated", cleaned.legal.privacy.lastUpdated);
}
if (cleaned.legal?.terms?.enabled) {
  checkRequired("legal.terms.entityName", cleaned.legal.terms.entityName);
  checkRequired("legal.terms.lastUpdated", cleaned.legal.terms.lastUpdated);
}
if (todos.length > 0 && import.meta.env.DEV) {
  console.warn("⚠️  MISSING FIELDS IN client-intake.json:");
  todos.forEach((t) => console.warn(`   → ${t}`));
}

export const site: any = cleaned;
export const missingFields = todos;
export const layout = resolveSite(intake);

/* ── Legal + consent (config-driven; footer + banner read these) ──────────────
   legalLinks powers the footer legal row — a link appears only when that policy
   is enabled, so the footer can never point at a page that doesn't render.
   consentRequired decides whether the cookie-consent banner shows AND whether
   analytics defaults to "denied": true for cookie-based analytics (GA4), false
   for cookieless (Plausible/Umami). legal.consent.enabled overrides:
     "auto" (default) → required only for cookie-based analytics
     true             → always show a banner
     false            → never show a banner                                    */
const COOKIE_ANALYTICS = new Set(["ga4"]);
const analyticsProvider: string = cleaned.analytics?.provider || "";
const consentSetting = cleaned.legal?.consent?.enabled;
export const consentRequired: boolean =
  consentSetting === true
    ? true
    : consentSetting === false
      ? false
      : COOKIE_ANALYTICS.has(analyticsProvider);

/* Delegated to src/lib/legal.mjs so the footer and the pages share ONE gate.
   The truthy check here used to disagree with terms.astro's strict `!== true`
   (enabled: "yes" produced a footer link to a page that redirects home) and with
   privacy.astro's `!== false` (no legal block at all produced a live /privacy
   page with nothing linking to it). */
export const legalLinks: { label: string; href: string }[] = legalNavLinks(cleaned);

/* ── Helpers ─────────────────────────────────────────────────── */
export const hasContent = (arr: any[]): boolean =>
  Array.isArray(arr) &&
  arr.length > 0 &&
  arr.some((item) => {
    if (typeof item === "string") return item.trim() !== "";
    if (typeof item === "object") return Object.values(item).some((v) => v && v !== "");
    return false;
  });

export const formatPhone = (phone: string): string => (phone ? phone.replace(/\s/g, "") : "");

/* Address may be a string ("Suburb ST 0000") or {street,suburb,state,postcode}. */
export const fullAddress = (): string => {
  const a = site.contact?.address;
  if (!a) return "";
  if (typeof a === "string") return a;
  return [a.street, a.suburb, a.state, a.postcode].filter(Boolean).join(", ");
};

export const variantOf = (section: string, fallback: string): string =>
  layout.layoutVariants?.[section] || fallback;

/* ── Navigation (config-driven — never hardcode links in Header/Footer).
 *    A section appears in the nav only if it is in site.sections (or has a
 *    dedicated page), so the nav can never link to a dead anchor.        ── */
export const sectionNav: Record<string, { id: string; label: string; path?: string }> = {
  services: { id: "services", label: "Services", path: "/services" },
  beforeAfter: { id: "before-after", label: "Before & after" },
  tiers: { id: "tiers", label: "Plans" },
  usage: { id: "usage", label: "Service areas", path: "/areas" },
  gallery: { id: "gallery", label: "Our work", path: "/gallery" },
  whyUs: { id: "why-us", label: "Why us" },
  story: { id: "story", label: "About" },
  testimonials: { id: "testimonials", label: "Reviews" },
  faqs: { id: "faqs", label: "FAQ", path: "/faq" },
  contact: { id: "contact", label: "Contact" },
};

/* Header nav order. Page links resolve to real pages; the rest are homepage
   anchors. Kept short on purpose — a trade site converts on phone calls, and a
   nine-item nav is nine chances to leave the page you want them on. */
const navOrder = ["services", "gallery", "story", "usage", "testimonials", "faqs"];

/* nav key -> page key in src/lib/pages.mjs */
const NAV_PAGE: Record<string, string> = {
  services: "services",
  gallery: "gallery",
  faqs: "faq",
  usage: "areas",
};

export const navHref = (key: string): string => {
  const nav = sectionNav[key];
  if (!nav) return "/";
  if (nav.path) return nav.path;
  return `/#${nav.id}`;
};

export const resolveLinkHref = (href: string): string => {
  const sections: string[] = site.sections || [];
  if (href === "#faqs" && !sections.includes("faqs")) return "/faq";
  if (href.startsWith("#")) return `/${href}`;
  return href;
};

/* testimonials only when there is at least one real quote */
const hasTestimonials =
  testimonials.some((testimonial) => testimonial.quote.trim() && testimonial.sourceUrl.trim());

export const headerNavLinks = (): { id: string; label: string; href: string }[] => {
  const sections: string[] = site.sections || [];
  /* Page links appear ONLY when that page actually builds. Previously the nav
     hardcoded "services always has a page" and "usage always has a page", so
     every client shipped links to a blank /services and an unwanted /areas. */
  const { built } = resolvePages(site, {
    serviceRecords: services,
    galleryEntries,
    recentJobs,
  });
  return navOrder
    .filter((key) => {
      if (!sectionNav[key]) return false;
      const pageKey = NAV_PAGE[key];
      if (pageKey) return built.includes(pageKey);
      if (key === "testimonials") return sections.includes(key) && hasTestimonials;
      return sections.includes(key);
    })
    .map((key) => ({ id: sectionNav[key].id, label: sectionNav[key].label, href: navHref(key) }));
};

/** The secondary pages this build ships. Used by the footer and the sitemap. */
export const builtPages = (): string[] =>
  resolvePages(site, { serviceRecords: services, galleryEntries, recentJobs }).built;
