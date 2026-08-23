import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import intake from "./client-intake.json" with { type: "json" };
import { resolveSite, KIT_FONT_FACES } from "./src/lib/variants.mjs";
import { PAGE_META, pageHasContent, PAGE_DEFAULTS } from "./src/lib/pages.mjs";

const domain = intake._meta?.domain;
const siteUrl = intake.seo?.siteUrl || (domain ? `https://${domain}` : "https://example.com");

/* ---- KIT-DRIVEN FONTS ------------------------------------------------------
   Resolve THIS client's kit from the intake, then load exactly that kit's two
   typefaces via the Astro Fonts API. The API exposes them as --font-display /
   --font-body, which global.css reads — so the rendered type always matches the
   active design kit. (Previously the font families were hardcoded here, so any
   kit other than `coast` rendered the wrong typeface.) Override the kit with
   _brief.designKit; leave it empty to let the seeded engine choose.
   NOTE: changing the kit changes which family Fontsource fetches at build. On a
   network-restricted machine, keep the fonts cache (.astro) or vendor the family. */
const { kit } = resolveSite(intake);
const faces = KIT_FONT_FACES[kit] || KIT_FONT_FACES.coast;

const fontEntry = (cssVariable, face) => ({
  name: face.name,
  cssVariable,
  provider: fontProviders.fontsource(),
  weights: face.weights,
  styles: ["normal"],
  subsets: ["latin"],
  formats: ["woff2"],
  fallbacks: ["system-ui", "sans-serif"],
});

export default defineConfig({
  site: siteUrl,
  integrations: [
    sitemap({
      /* Only pages that exist AND want to be indexed.
         Excluded: /about and /contact (redirects to homepage anchors),
         /privacy and /terms (noindex — submitting them just fills Search
         Console with "Excluded by noindex"), and any secondary page this
         client has no content for.
         NOTE: this evaluates the intake only, so a client with rich records in
         src/data/services.ts should force `pages.services: true`. */
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, "");
        if (["/about", "/contact", "/privacy", "/terms"].includes(path)) return false;
        for (const [key, meta] of Object.entries(PAGE_META)) {
          if (path !== meta.path) continue;
          const on = intake.pages?.[key] === undefined ? PAGE_DEFAULTS[key] : intake.pages[key] === true;
          return on && pageHasContent(key, intake);
        }
        return true;
      },
    }),
  ],
  fonts: [
    fontEntry("--font-display", faces.display),
    fontEntry("--font-body", faces.body),
  ],
  vite: {
    plugins: [tailwindcss()],
    /* Vite/Rolldown defaults to a very modern CSS baseline and emits Media
       Queries Level 4 range syntax — @media (width>=40rem) — which older
       Safari/Chrome do not understand, silently dropping EVERY breakpoint.
       Pinning cssTarget restores min-width syntax. Do not remove. */
    build: { cssTarget: ["safari16", "chrome100", "firefox100", "edge100"] },
  },
  output: "static",
});
