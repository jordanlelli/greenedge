# CLIENT.md — GreenEdge Property Care

## Who
- GreenEdge Property Care, ABN 87 823 119 154. Owner: Harrison.
- Lawn mowing, garden maintenance, pressure washing, gutter cleaning. Based in Newton SA 5074, working Adelaide's eastern suburbs.
- Contact on site: 0402 154 283, greenedgepc@gmail.com.

## Scope
- Live at greenedgepc.com.au (Vercel, deploys from `main`).
- Pages: home, /services, /services/lawn-mowing-adelaide, /gallery, /faq, /areas, privacy, terms.

## Decisions already made
- Kit coast, fullbleed hero, split-scroll services, ruled-rows why-us, areas as the dark band (`_brief`).
- 2026-10-15: synced from a v3.16 zip copy to template v3.34.0, then locked (site is live).
- Lawn care page: two before/after sliders (front paving, side path), chosen by Jordan. Other photo pairs and after photos are on /gallery.

## Open items
- TODO (Harrison): suburb and month for each job photo; none are shown until supplied.
- TODO (Jordan): the front verge pair on /gallery assumes the photo without the parked car is the "before". Confirm.
- TODO (Harrison): prices are still the 2026 market estimates from the placeholder pass (`_brief.notesForCursor`).
- TODO: service cards and the hero still use stock photos (`imageIsStock`). Real job photos now exist and could replace them.
- `business.schemaType` is empty; `faqs` has content but is not a homepage section (the /faq page still builds).

## Local changes to shared code
- Commit 44a99cd "Template change: service detail pages from the intake, portrait sliders" (content.mjs, BeforeAfter.astro, services/[slug].astro, Contact.astro, check-intake.mjs). Ported into the template as v3.35.0 (branch `port/greenedge-service-detail`, 2026-10-15), which adds more on top: "More on ..." links from /services and the footer, docs, and the qa:src comment fix. GreenEdge stays on its own copy until Jordan asks for a GreenEdge update to v3.35 by name (site is locked). On that pull, the five files above take the template's version.
