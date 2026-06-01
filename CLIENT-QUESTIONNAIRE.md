# Client Questionnaire

Send this to clients as a Google Form. Responses map directly to `client-intake.json` fields.

---

## SECTION 1 — Business Basics

1. **Business name** (exactly as you want it displayed)
   → `business.name`

2. **One-line tagline or description** (what you do in 10 words or less)
   → `business.tagline`

3. **Industry** (Trade, Restaurant, Product, Gym, Professional Services, Retail, Hospitality, Other)
   → `business.industry`

4. **Years in business**
   → `business.yearsInBusiness`

5. **Founder/owner name**
   → `business.founderName`

6. **Your story in 2–4 sentences** (How did the business start? What drives you?)
   → `business.story`

---

## SECTION 2 — Contact Details

7. **Phone number** (the one you want on the website)
   → `contact.phone`

8. **Email address for enquiries**
   → `contact.email`

9. **Physical address (if applicable)**
   - Street: `contact.address.street`
   - Suburb: `contact.address.suburb`
   - State: `contact.address.state`
   - Postcode: `contact.address.postcode`

10. **ABN**
    → `contact.abn`

11. **Licence number (trades only)**
    → `contact.licence`

12. **Business hours by day** (e.g., "9 AM – 5 PM" or "Closed")
    → `contact.hours.{monday-sunday}`

---

## SECTION 3 — Social Media

13. **Facebook URL** (full URL, leave blank if none)
    → `social.facebook`

14. **Instagram URL**
    → `social.instagram`

15. **Google Business Profile URL**
    → `social.google`

16. **TikTok URL**
    → `social.tiktok`

17. **LinkedIn URL**
    → `social.linkedin`

18. **YouTube URL**
    → `social.youtube`

---

## SECTION 4 — Location & Service Area

19. **Business type**
    - I travel to customers (service-area)
    - Customers come to me (physical)
    - Both
    - Online only
    → `location.type`

20. **Suburbs/cities you serve** (one per line)
    → `location.serviceAreas`

---

## SECTION 5 — What You Offer

21. **List your services or products** (one per line, with description and starting price if relevant)

    Example format:
    ```
    Service: Blocked Drains | Description: CCTV inspection + jet blasting | Price: From $150
    ```
    → `offerings` array

22. **For product businesses — list each product:**
    - Name
    - Description
    - Price
    - Image filename (if provided)
    → `products` array

23. **Which 3 services/products should be most prominent?**
    → Mark `featured: true` in offerings

---

## SECTION 6 — Stockists / Physical Locations (if applicable)

24. **Where can people buy your product in person?**
    For each location:
    - Store name
    - Full address
    → `stockists` array

---

## SECTION 7 — Team

25. **Do you want a team page?** (Yes/No)
    → `pages.team`

26. **If yes, for each team member:**
    - Name
    - Role
    - 1–2 sentence bio
    - Photo filename
    → `team` array

---

## SECTION 8 — Social Proof

27. **Paste up to 5 customer reviews** (with first name, suburb, and star rating)
    → `testimonials` array

28. **What sets you apart from competitors?** (3–5 bullet points)
    → `differentiators` array

29. **Trust signals to display** (e.g., "Fully Licensed", "Free Quotes", "100% Guarantee")
    → `trustPoints` array

---

## SECTION 9 — FAQs

30. **List 6–12 common questions customers ask** with answers
    → `faq` array

---

## SECTION 10 — Visual Style

31. **Pick 3 words that describe how you want the brand to feel**
    (trustworthy / premium / friendly / bold / modern / classic / rugged / clean / playful)
    → `style.vibe`

32. **Preferred primary colour** (hex code or "no preference")
    → `style.primaryColor`

33. **Accent/CTA colour**
    → `style.accentColor`

34. **Font feel**
    - Modern Sans (clean, contemporary)
    - Classic Serif (elegant, traditional)
    - Bold Display (impactful, dramatic)
    - Clean Grotesk (minimal, professional)
    → `style.fontStyle`

35. **Density preference**
    - Tight (compact, info-dense)
    - Comfortable (balanced)
    - Spacious (lots of breathing room)
    → `style.density`

36. **Dark mode?** (light or dark background as default)
    → `style.darkMode`

37. **Send me 2–3 websites you like the look of** (any industry — just the vibe)
    → `style.referenceSites`

38. **Any colours you absolutely don't want?**
    → Note in `specialRequests`

---

## SECTION 11 — Pages Needed

39. **Which pages do you need?** (tick all that apply)
    - Home (always)
    - About
    - Services
    - Products/Shop
    - Stockists
    - Gallery
    - Team
    - FAQ
    - Contact (always)
    - Blog
    → `pages.*`

---

## SECTION 12 — Functional Requirements

40. **Contact form on the site?** (Yes/No)
    → `features.contactForm`

41. **Sticky phone button on mobile?** (Yes/No)
    → `features.stickyPhoneBar`

42. **Online booking required?**
    If yes, provide the booking platform URL
    → `features.onlineBooking` + `features.bookingPlatformUrl`

43. **Quote calculator needed?**
    → `features.quoteCalculator`

44. **Take payments online?**
    → `features.paymentLinks`

45. **Newsletter signup?**
    → `features.newsletter`

46. **Show Google Maps embed?**
    → `features.googleMapsEmbed`

---

## SECTION 13 — SEO

47. **Custom meta title** (60 characters max — leave blank to auto-generate)
    → `seo.metaTitle`

48. **Custom meta description** (160 characters max)
    → `seo.metaDescription`

49. **Top 5–10 keywords you want to rank for**
    → `seo.keywords`

---

## SECTION 14 — Assets

50. **Do you have a logo?** (Attach file)
    Save as `public/images/logo.svg` or `logo.png`

51. **Hero image or video?** (Attach)
    Save in `public/images/hero/`

52. **How many gallery/portfolio photos can you provide?**
    Save in `public/images/gallery/`

53. **Profile/team photos?**
    Save in `public/images/team/`

---

## SECTION 15 — Final

54. **Anything specific to highlight?** (awards, certifications, unique selling points)
    → `specialRequests`

55. **Anything to avoid?** (competitor mentions, certain wording, etc.)
    → `specialRequests`

---

## How to Set Up the Google Form

1. Go to forms.google.com → Blank form
2. Title it: "[Your Agency] Website Brief"
3. Add the 55 questions above as form fields
4. For question types:
   - Short answer: name, phone, email, etc.
   - Paragraph: story, descriptions, FAQs
   - Multiple choice: industry, vibe, font style, density
   - Checkboxes: pages needed, features
   - File upload: logo, photos
5. In Form settings → Responses → "Link to Sheets" — creates a Google Sheet
6. Send the form link to clients
7. When they fill it in, you get a row in the Sheet

## Converting Sheet Responses to JSON

**Option A — Manual (fastest for 1-off):**
Copy the row of responses, paste into Cursor's chat with:
> "Here are the client's questionnaire responses. Convert this into a complete client-intake.json file matching the existing structure."

**Option B — Apps Script automation (set up once, runs forever):**
In your Google Sheet → Extensions → Apps Script. Paste this:

```javascript
function exportRowAsJson() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  const row = range.getRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const result = {};
  headers.forEach((h, i) => { result[h] = values[i]; });
  const html = HtmlService.createHtmlOutput(
    `<pre>${JSON.stringify(result, null, 2)}</pre>`
  ).setWidth(600).setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, "JSON Output");
}
```

Then add a menu item to run it. Click any row, run the script, get JSON.
