import type { APIRoute } from "astro";
import { site } from "../config";

export const GET: APIRoute = ({ site: astroSite }) => {
  const siteUrl = site.seo?.siteUrl || astroSite?.href || "https://example.com";
  const body = `User-agent: *
Allow: /

Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap-index.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
};
