import type { APIRoute } from "astro";
import { site } from "../config";

/* Mirrors seo.noindex. A meta tag alone still lets crawlers fetch and queue the
   page; a Disallow keeps a demo build out of the index properly. Flip
   seo.noindex to false on the day the client's real domain goes live. */
export const GET: APIRoute = ({ site: astroSite }) => {
  const base = (astroSite?.href || "https://example.com").replace(/\/$/, "");
  const noindex = (site as any).seo?.noindex === true;

  const body = noindex
    ? `# Demo build — not for indexing. Set seo.noindex to false before go-live.\nUser-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap-index.xml\n`;

  return new Response(body, { headers: { "Content-Type": "text/plain" } });
};
