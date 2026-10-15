import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { intakePath } from "./scripts/intake-path.mjs";
import { resolveSite, KIT_FONT_FACES } from "./src/lib/variants.mjs";
import { PAGE_META, pageHasContent, PAGE_DEFAULTS } from "./src/lib/pages.mjs";

/* The intake is read by path, not imported, so the INTAKE env var can point the
   whole build at another file (the template's demo: `npm run demo`). The same
   path backs the `@intake` alias below, which is what src/config.ts imports. */
const intakeFile = intakePath();
const intake = JSON.parse(readFileSync(intakeFile, "utf8"));

const distDir = fileURLToPath(new URL("./dist/", import.meta.url));
const domain = intake._meta?.domain;
const siteUrl = intake.seo?.siteUrl || (domain ? `https://${domain}` : "https://example.com");

/* ---- KIT-DRIVEN FONTS ------------------------------------------------------
   Resolve THIS client's kit from the intake, then load exactly that kit's two
   typefaces via the Astro Fonts API. The API exposes them as --font-display /
   --font-body, which global.css reads — so the rendered type always matches the
   active design kit. (Previously the font families were hardcoded here, so any
   kit other than `coast` rendered the wrong typeface.) Override the kit with
   _brief.designKit; leave it empty to let the seeded engine choose.
   Fonts are vendored (see fontEntry) — no network needed at build. */
const { kit, type } = resolveSite(intake);
const faces = KIT_FONT_FACES[kit] || KIT_FONT_FACES.coast;

/* v3.20: fonts are VENDORED from the @fontsource/* npm packages and loaded
   with the local provider — nothing is fetched at build time. With the
   fontsource provider a blocked or flaky fetch did NOT fail the build: Astro
   warned, fell back to system-ui and shipped the site in the wrong typeface.
   Now a missing weight is a missing file (build error), and check-fonts.mjs
   verifies the output after every build. Latin subset, static weights — the
   same files the fontsource provider used to download. Every weight listed in
   KIT_FONT_FACES must exist in the package (they all do for the 8 families). */
const fontPkg = (name) => name.toLowerCase().replace(/\s+/g, "-");
const fontEntry = (cssVariable, face) => ({
  name: face.name,
  cssVariable,
  provider: fontProviders.local(),
  options: {
    variants: face.weights.map((weight) => ({
      weight,
      style: "normal",
      src: [`@fontsource/${fontPkg(face.name)}/files/${fontPkg(face.name)}-latin-${weight}-normal.woff2`],
    })),
  },
  fallbacks: ["system-ui", "sans-serif"],
});

/* STYLE PICKER FONTS (src/lib/stylepicks.mjs). When the intake carries
   _brief.stylePicks the client chose their own type, so those faces load
   instead of the kit's: heading, body and, when the headline font differs
   from the heading font, a third --font-hero. Same vendoring rule: every
   file comes from an installed @fontsource package. */
const pickEntry = (cssVariable, face) => ({
  name: face.name,
  cssVariable,
  provider: fontProviders.local(),
  options: { variants: face.variants.map(({ src, ...rest }) => ({ ...rest, src: [src] })) },
  fallbacks: face.generic === "serif" ? ["Georgia", "serif"] : ["system-ui", "sans-serif"],
});

export default defineConfig({
  site: siteUrl,
  /* v3.21: every internal link's HTML is fetched as soon as the page has
     loaded, so moving between pages is served from cache. The site is a
     handful of static pages at 20-120 KB each; the cost is trivial. */
  prefetch: { prefetchAll: true, defaultStrategy: "load" },
  integrations: [
    sitemap({
      /* The sitemap lists the pages this build ACTUALLY shipped.
         v3.20: the filter reads the built file. Before, it re-derived "does
         this page have content?" from the intake alone, which cannot see
         src/data/gallery.ts or services.ts — so every client whose gallery
         lived in gallery.ts had /gallery built, linked and missing from the
         sitemap. Now a page is left out only if its built HTML is a redirect
         stub (meta refresh) or is marked noindex (/privacy, /terms). If the
         file cannot be read, the old intake check decides. */
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, "");
        if (["/about", "/contact", "/privacy", "/terms"].includes(path)) return false;
        try {
          const html = readFileSync(join(distDir, path, "index.html"), "utf8");
          if (/http-equiv=["']refresh["']/i.test(html)) return false;
          if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) return false;
          return true;
        } catch {
          for (const [key, meta] of Object.entries(PAGE_META)) {
            if (path !== meta.path) continue;
            const on = intake.pages?.[key] === undefined ? PAGE_DEFAULTS[key] : intake.pages[key] === true;
            return on && pageHasContent(key, intake);
          }
          return true;
        }
      },
    }),
  ],
  fonts: type
    ? [
        pickEntry("--font-display", type.display),
        pickEntry("--font-body", type.body),
        ...(type.hero ? [pickEntry("--font-hero", type.hero)] : []),
      ]
    : [
        fontEntry("--font-display", faces.display),
        fontEntry("--font-body", faces.body),
      ],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { "@intake": intakeFile } },
    /* Vite/Rolldown defaults to a very modern CSS baseline and emits Media
       Queries Level 4 range syntax — @media (width>=40rem) — which older
       Safari/Chrome do not understand, silently dropping EVERY breakpoint.
       Pinning cssTarget restores min-width syntax. Do not remove. */
    build: { cssTarget: ["safari16", "chrome100", "firefox100", "edge100"] },
  },
  output: "static",
});
