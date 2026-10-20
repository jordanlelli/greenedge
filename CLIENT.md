# CLIENT.md — GreenEdge Property Care

## Who
- GreenEdge Property Care, ABN 87 823 119 154. Owner: Harrison.
- Garden maintenance (lawn care, pruning & hedging, garden beds, clean-ups, planting, irrigation), pressure washing, gutter cleaning. Based in Newton SA 5074, working Adelaide's eastern suburbs.
- Contact on site: 0402 154 283, greenedgepc@gmail.com.

## Scope
- Live at greenedgepc.com.au (Vercel, deploys from `main`).
- Pages: home, /services, /services/lawn-mowing-adelaide, /gallery, /faq, /areas, privacy, terms.

## Decisions already made
- Kit coast, fullbleed hero, split-scroll services, ruled-rows why-us, areas as the dark band (`_brief`).
- 2026-10-15: synced from a v3.16 zip copy to template v3.34.0, then locked (site is live).
- Lawn care page: two before/after sliders (front paving, side path), chosen by Jordan. Other photo pairs and after photos are on /gallery.
- 2026-10-17: Harrison's service list added as six garden services (homepage shows the six featured; planting and irrigation are /services only). Pressure washing and gutter cleaning kept (Jordan confirmed they are still offered). /services layout is `featured` (grouped failed qa: six cards in one group ran 152% of the viewport). Regular-visit inclusions live in the tiers section.
- 2026-10-17: no prices anywhere on the site (services, FAQs, travel fee). Every job is quoted on site. Jordan's call, for consistency.
- 2026-10-17: GBP primary category is Lawn care service (BrightLocal advice). Site headings lead with lawn care to match; GBP website link stays on the homepage. GBP copy pack lives in gbp/ (untracked, not part of the site).
- 2026-10-17: new logo. `public/logo.png` is a horizontal lockup built from Harrison's white-on-black logo: leaf moved left, background removed, lettering recoloured dark green for the light header. `favicon.png` is the leaf. Palette retuned to it: forest green brand, leaf-green CTA with dark label.

## Open items
- TODO (Harrison): suburb and month for each job photo; none are shown until supplied.
- TODO (Jordan): the front verge pair on /gallery assumes the photo without the parked car is the "before". Confirm.
- TODO: pressure washing, gutter cleaning and the hero still use stock photos (`imageIsStock`). Lawn care, pruning, garden beds and clean-ups now use GreenEdge job photos from /gallery.
- `business.schemaType` is empty; `faqs` has content but is not a homepage section (the /faq page still builds).

## Local changes to shared code
- Commit 44a99cd "Template change: service detail pages from the intake, portrait sliders" (content.mjs, BeforeAfter.astro, services/[slug].astro, Contact.astro, check-intake.mjs). Ported into the template as v3.35.0 (branch `port/greenedge-service-detail`, 2026-10-15), which adds more on top: "More on ..." links from /services and the footer, docs, and the qa:src comment fix. GreenEdge stays on its own copy until Jordan asks for a GreenEdge update to v3.35 by name (site is locked). On that pull, the five files above take the template's version.
- Commit "Template change: pinned hero goes transparent once covered" (HeroFullbleed.astro): the sticky hero showed through between sections on desktop. Also in template v3.35.0.
- Footer credit wording (20 Oct): `credit.mjs` returns a `suffix` (words after the agency name in `agency.credit.label`) and `Footer.astro` prints it after the link, so the anchor stays "Kova Digital" and the words around it describe Kova. Intake `agency.credit` sets the label and points the link at kovadigital.com.au/work/greenedge-property-care/ (the case study). Not ported to the template.
