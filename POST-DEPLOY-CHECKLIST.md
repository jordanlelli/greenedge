# Post-Deployment Checklist

Run through this every time you deploy a new client site. These are the manual steps that can't be automated.

---

## Immediately After Going Live

### 1. Verify the site loads
- [ ] Open the live URL in mobile Chrome and desktop Chrome
- [ ] Test all navigation links work
- [ ] Test the contact form (send a test message — confirm client receives it)
- [ ] Tap the phone number on mobile (should open dialer)
- [ ] Check there's no yellow TODO banner showing

### 2. SEO foundations
- [ ] Visit `yoursite.com/robots.txt` — confirm it loads
- [ ] Visit `yoursite.com/sitemap-index.xml` — confirm it loads
- [ ] Visit `yoursite.com/llms.txt` — confirm business info is correct
- [ ] Run Lighthouse audit in Chrome DevTools — should score 90+ on Performance, 100 on Accessibility & SEO
- [ ] Test with Google's Rich Results test: https://search.google.com/test/rich-results
  - LocalBusiness schema should be detected
  - FAQPage schema should be detected (if FAQs present)

### 3. Google Search Console
- [ ] Add the site to search.google.com/search-console
- [ ] Verify ownership (use HTML meta tag method — paste it into Layout.astro head)
- [ ] Submit sitemap: `https://yoursite.com/sitemap-index.xml`
- [ ] Check "Coverage" tab over the next 7 days — confirm pages get indexed

### 4. Google Business Profile
- [ ] Claim or create the GBP at business.google.com
- [ ] Add the website URL to GBP
- [ ] Add the same NAP (Name, Address, Phone) as on the site — must match exactly
- [ ] Upload at least 10 photos
- [ ] Add services that match the site
- [ ] Set service areas matching the site
- [ ] Request first 5 reviews from existing customers

### 5. Analytics
- [ ] If using Plausible: confirm domain is configured and tracking
- [ ] If using GA4: visit site, check Realtime tab shows your visit
- [ ] Set up conversion goals (phone clicks, form submits)

---

## Within First Week

### Local SEO Citations
Get the business listed on these (free, takes 1–2 hours total):
- [ ] TrueLocal (truelocal.com.au)
- [ ] Yellow Pages AU (yellowpages.com.au)
- [ ] Yelp Australia (yelp.com.au)
- [ ] White Pages (whitepages.com.au)
- [ ] Hotfrog (hotfrog.com.au)
- [ ] Industry-specific directories (e.g., hipages for tradies, TripAdvisor for hospitality)

NAP (Name, Address, Phone) must match the site exactly across all citations. This is the single biggest local SEO win.

### Bing Webmaster Tools
- [ ] Submit site to bing.com/webmasters (5 mins, often forgotten, drives ~10% of search traffic in AU)

### Performance Check
- [ ] Run https://pagespeed.web.dev/ — should score 90+ mobile, 95+ desktop
- [ ] Test on actual 4G connection if possible (not just dev machine)

---

## Within First Month

### Content additions
- [ ] Add 2–3 real photos of the team/work to the gallery (replace any placeholders)
- [ ] Get 5+ Google reviews from recent customers
- [ ] Update meta description with actual targeted keywords
- [ ] If trade business: ensure all service area pages are visible in Search Console

### Tracking
- [ ] Confirm conversion tracking is working (test by submitting form)
- [ ] Add UTM parameters to any external links (social profiles, GBP)
- [ ] Set up monthly performance email (Search Console sends these automatically)

---

## Ongoing Monthly

### For clients on a maintenance plan
- [ ] Review Search Console — fix any indexing issues
- [ ] Check analytics — note traffic trends, top pages
- [ ] Add 1 new piece of content if blog enabled (or update existing pages)
- [ ] Encourage client to add 2–5 new reviews to GBP
- [ ] Update GBP with photos of recent work
- [ ] Quick QA — load site, test forms, check phone number

### Send client a monthly report covering:
- Site uptime (should be 100%)
- Number of visitors
- Number of form submissions and phone clicks
- New Google reviews added
- Any SEO improvements

This is what makes the monthly fee feel justified. Without a report, clients churn within 6 months.

---

## When a Client Cancels

- [ ] Confirm cancellation in writing (email is fine)
- [ ] Set cancellation date (30 days notice typical)
- [ ] On the cancellation date:
  - [ ] Take site offline (delete the Vercel project or disable)
  - [ ] Send final invoice
  - [ ] Keep their domain DNS pointed to a "site coming soon" page or release the domain
  - [ ] Archive the GitHub repo (don't delete — useful reference)
- [ ] If they want the code: offer a one-off handover fee ($200–300) and transfer the GitHub repo
