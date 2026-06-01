# Universal Business Website Template

Astro + Tailwind static site template that adapts to any business type. Fill in one JSON file, deploy. Multi-page, mobile-first, SEO-ready, zero backend.

---

## What's Baked In (No Setup Required)

Every site generated from this template automatically includes:

**SEO**
- `sitemap-index.xml` — auto-generated from all pages
- `robots.txt` — generated dynamically, references sitemap
- Canonical URLs on every page (prevents duplicate content issues)
- Open Graph + Twitter Card meta tags
- Per-page title and description from config
- Mobile-friendly viewport tags
- Preconnect hints for font CDN (faster page loads)

**Structured Data (Schema.org)**
- LocalBusiness schema with address, phone, email, areas served
- AggregateRating + Review schemas from testimonials
- FAQPage schema from FAQs (gets you rich snippets in Google)
- Service schemas for each offering

**LLM Optimization**
- `llms.txt` — auto-generated file that tells ChatGPT, Claude, Perplexity etc.
  what the business is about. Critical for being recommended by AI assistants.

**Local SEO**
- Dynamic `/areas/[suburb]` pages — one URL per service area
- Each area page is uniquely titled and optimised for "{trade} in {suburb}"
- Areas index page at `/areas`
- Service area schema markup

**Conversion**
- Sticky mobile phone bar (always visible bottom of screen)
- Click-to-call CTAs throughout
- Honeypot spam protection on contact form
- Multiple CTAs per page

**Analytics**
- Toggle in config for Plausible, GA4, or Umami
- Set `analytics.provider` in `client-intake.json` and the right snippet loads
- No code changes needed per client

## Misc
- Custom 404 page
- Favicon support
- Conditional rendering — empty fields hide automatically
- TODO banner during dev when required fields are missing

---

## How It Works


Everything on the site is driven by `client-intake.json`. You fill that in, the site generates from it. Empty fields auto-hide. Missing required fields show a yellow warning banner in dev mode so you can't accidentally ship a half-finished site.

```
template/
├── client-intake.json       ← ⭐ FILL THIS IN PER CLIENT
├── src/
│   ├── config.ts            ← Reads intake, don't edit
│   ├── layouts/Layout.astro ← SEO, schema, fonts
│   ├── components/          ← Reusable building blocks
│   └── pages/               ← One file = one URL
├── public/
│   ├── images/              ← Drop client images here
│   │   ├── hero/
│   │   ├── gallery/
│   │   ├── products/
│   │   ├── team/
│   │   └── stockists/
│   ├── videos/
│   └── documents/
├── tailwind.config.mjs      ← Auto-reads colors from intake
└── astro.config.mjs
```

---

## New Client Workflow

```bash
# 1. Copy the template
cp -r ~/clients/template ~/clients/new-client
cd ~/clients/new-client

# 2. Fill in client-intake.json (see Google Form workflow below)

# 3. Drop client images in public/images/

# 4. Run locally
npm install
npm run dev

# 5. Deploy
git init
git add .
git commit -m "initial build"
gh repo create your-agency/new-client --private --push

# Then connect to Vercel in browser
```

---

## Customisation via Cursor AI

Once `client-intake.json` is filled in, prompt Cursor for client-specific tweaks:

> "The client is a luxury restaurant. Adjust the hero to use more elegant typography and remove the trust-signal badges. Make sections more spacious."

> "Add a new menu page at /menu that pulls items from a new `menu` array in client-intake.json."

> "Change the overall vibe to feel more premium — increase whitespace, refine typography, use subtler colour."

Cursor reads the existing structure and adapts.

---

## Style Presets

Set `style.vibe` in `client-intake.json` to influence the visual feel. Then ask Cursor to apply the preset throughout:

- **trustworthy** — strong blues, solid CTAs, big phone number
- **premium** — black/cream, refined typography, generous whitespace
- **friendly** — warm colours, rounded corners, casual tone
- **bold** — high contrast, large typography, big imagery
- **modern** — clean grotesks, neutral palette, minimal decoration
- **classic** — serif headings, refined details
- **rugged** — earthy tones, strong contrast, heavy borders
- **clean** — lots of whitespace, fine borders, restrained colour
- **playful** — vibrant palette, organic shapes, expressive type

---

## Pages Available

Toggle pages in `client-intake.json` under `pages`:

- `home` — always on
- `about` — story + team
- `services` — service cards
- `products` — product showcase
- `stockists` — physical locations
- `gallery` — photo gallery
- `team` — team grid
- `faq` — FAQ accordion
- `contact` — form + details
- `blog` — content (requires manual setup)

Nav and footer automatically reflect enabled pages.

---

## Cost Summary

| Item | Cost |
|------|------|
| Cursor Pro | $20/month |
| Hosting (Vercel/Cloudflare Pages) | Free |
| Domain (client buys) | ~$12/year |
| FormSubmit (contact forms) | Free |
| **Your total** | **$20/month** |

Per-client revenue: $500–800 build + $49–99/month recurring.

---

## Image Handling

Drop client images into the appropriate folder in `public/images/`:
- `hero/` — main hero image or video
- `gallery/` — job photos, lifestyle shots
- `products/` — product shots
- `team/` — team headshots
- `stockists/` — store photos
- `icons/` — custom icons

Reference them in `client-intake.json` with paths like `/images/hero/main.jpg`.

---

## Adding New Sections

Cursor handles this. Just describe what you need:

> "Add a Service Areas section to the homepage that shows suburb tags from `location.serviceAreas` and embeds the Google Map from `location.mapEmbedUrl`."

> "Add a pricing tiers section with three plans pulled from a new `pricing` array in client-intake.json."

Cursor creates the component, wires it into the page, and you only review and approve.
