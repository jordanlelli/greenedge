import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import intake from "./client-intake.json";

const domain = intake._meta?.domain || intake.seo?.siteUrl?.replace(/^https?:\/\//, "") || "example.com";
const siteUrl = intake.seo?.siteUrl || `https://${domain}`;

export default defineConfig({
  site: siteUrl,
  integrations: [tailwind(), sitemap()],
  output: "static",
});
