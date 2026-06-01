/* ================================================================
 *  📋  CONFIG — Reads from client-intake.json
 *
 *  This file does NOT need editing per client.
 *  Edit client-intake.json instead.
 *
 *  This loader validates fields and warns about missing data
 *  via TODO banners in dev mode.
 * ================================================================ */

import intake from "../client-intake.json";

/* Pull out comment fields so they don't appear on the site */
const stripComments = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (key.startsWith("_")) continue;
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripComments(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const cleaned = stripComments(intake);

/* Detect placeholder/missing fields and collect TODOs */
const todos: string[] = [];

const checkRequired = (path: string, value: any) => {
  if (!value || (typeof value === "string" && (value.includes("REQUIRED") || value === ""))) {
    todos.push(path);
  }
};

checkRequired("business.name", cleaned.business?.name);
checkRequired("contact.phone", cleaned.contact?.phone);
checkRequired("contact.email", cleaned.contact?.email);

if (todos.length > 0 && import.meta.env.DEV) {
  console.warn("⚠️  MISSING FIELDS IN client-intake.json:");
  todos.forEach((t) => console.warn(`   → ${t}`));
}

export const site = cleaned;
export const missingFields = todos;

/* ── Helpers ───────────────────────────────────────────────── */

export const hasContent = (arr: any[]): boolean =>
  Array.isArray(arr) && arr.length > 0 && arr.some((item) => {
    if (typeof item === "string") return item.trim() !== "";
    if (typeof item === "object") {
      return Object.values(item).some((v) => v && v !== "");
    }
    return false;
  });

export const formatPhone = (phone: string): string =>
  phone ? phone.replace(/\s/g, "") : "";

export const fullAddress = (): string => {
  const a = site.contact?.address;
  if (!a) return "";
  if (typeof a === "string") return a;
  return [a.street, a.suburb, a.state, a.postcode].filter(Boolean).join(", ");
};

export const sectionNav: Record<string, { id: string; label: string; path?: string }> = {
  services: { id: "services", label: "Services", path: "/services" },
  tiers: { id: "tiers", label: "Maintenance" },
  usage: { id: "usage", label: "Areas" },
  whyUs: { id: "why-us", label: "Why us" },
  story: { id: "story", label: "Our story" },
  testimonials: { id: "testimonials", label: "Reviews" },
  faqs: { id: "faqs", label: "FAQ", path: "/faq" },
  contact: { id: "contact", label: "Contact" },
};

const navOrder = ["services", "tiers", "usage", "whyUs", "story", "testimonials", "faqs", "contact"];

export const navHref = (key: string): string => {
  const nav = sectionNav[key];
  if (!nav) return "/";
  if (nav.path) return nav.path;
  return `/#${nav.id}`;
};

export const resolveLinkHref = (href: string): string => {
  if (href.startsWith("#")) return `/${href}`;
  return href;
};

export const headerNavLinks = (): { id: string; label: string; href: string }[] => {
  const sections = site.sections || [];
  return navOrder
    .filter((key) => sectionNav[key] && (sections.includes(key) || key === "services" || key === "faqs"))
    .map((key) => ({
      id: sectionNav[key].id,
      label: sectionNav[key].label,
      href: navHref(key),
    }));
};
