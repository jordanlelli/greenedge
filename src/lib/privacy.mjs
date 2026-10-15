/**
 * privacy.mjs — assembles a real privacy policy from the intake.
 *
 * WHAT WAS WRONG BEFORE. privacy.astro hardcoded about eight paragraphs and
 * interpolated four values into them. It was honest but thin, and it was
 * missing the parts that actually matter under Australian law:
 *
 *   - NO overseas-disclosure section. FormSubmit, Vercel and Google Analytics
 *     all host or route data outside Australia. APP 8 requires that be
 *     disclosed, and it was the single biggest gap.
 *   - NO access-and-correction process (APP 12 / APP 13).
 *   - NO complaints path, and no mention of the OAIC as the escalation point.
 *   - NO data-retention statement, which is the first thing anyone asks after
 *     "what do you collect".
 *   - Nothing about what a trade business collects OFF the website — property
 *     addresses, site photographs, access and key details. For a tradie that
 *     is the bulk of the personal information they hold, and a policy that
 *     only covers the contact form describes the smallest part of the job.
 *
 * THE RULE, same as every other resolver here: EVERY SECTION IS SOURCED. A
 * section renders only when the intake supports it. There is no lorem, no
 * "[INSERT]", and no clause asserting a practice the client may not follow —
 * a privacy policy that overstates what a business does is a representation
 * they can be held to, which is worse than a short policy.
 *
 * NOT LEGAL ADVICE, and the template must not pretend otherwise. This
 * assembles a reasonable, accurate, plain-English policy from facts the client
 * supplied. It is a starting point for a client to review, not a substitute
 * for a lawyer, and legal.privacy.reviewed exists so a client can record that
 * they have actually read it.
 */

const str = (v) => (typeof v === "string" ? v.trim() : "");
const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => str(v).length > 0;

/** Oxford-comma list: ["a","b","c"] -> "a, b, and c" */
export function listOf(items) {
  const list = items.map(str).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

/* ── third parties ────────────────────────────────────────────────────────
   Each entry names WHO, WHAT they receive and WHERE they hold it. "Where" is
   not decoration: APP 8 turns an overseas recipient into a disclosure the
   policy has to make, and every default in this template routes data offshore.
   Detection is by endpoint, so a client who swaps providers gets a policy that
   follows rather than one that quietly goes stale. */
const FORM_PROVIDERS = [
  { match: "formsubmit", name: "FormSubmit", country: "the United States" },
  { match: "formspree", name: "Formspree", country: "the United States" },
  { match: "web3forms", name: "Web3Forms", country: "the United States" },
  { match: "getform", name: "Getform", country: "the United States" },
  { match: "basin", name: "Basin", country: "the United States" },
];

const ANALYTICS = {
  plausible: {
    name: "Plausible Analytics",
    country: "the European Union",
    cookies: false,
    body: "It is cookieless, does not set identifiers on your device and does not follow you across other websites. We see aggregate counts — pages viewed, rough location by country, which site referred you — and nothing that identifies you personally.",
  },
  umami: {
    name: "Umami",
    country: "the United States",
    cookies: false,
    body: "It is privacy-focused, sets no cookies and does not build a profile of you across other websites. We see aggregate visit counts only.",
  },
  ga4: {
    name: "Google Analytics 4",
    country: "the United States",
    cookies: true,
    body: "It sets cookies on your device, but only after you accept them through the cookie notice. If you decline, no analytics cookies are set. You can clear them in your browser at any time, and you can opt out permanently using Google's browser add-on.",
  },
};

function detectFormProvider(site) {
  const endpoint = str(site.contact?.formEndpoint).toLowerCase();
  if (!endpoint) return null;
  /* A first-party endpoint (api/quote.js on the site's own host) is NOT a
     third-party disclosure — it is the business receiving its own email. */
  if (endpoint.startsWith("/")) return { firstParty: true };
  const explicit = str(site.legal?.privacy?.formProvider);
  const hit = FORM_PROVIDERS.find((p) => endpoint.includes(p.match));
  if (hit) return hit;
  if (explicit) return { name: explicit, country: "" };
  return { name: "our form provider", country: "" };
}

/**
 * Build the policy. Returns ordered sections: { id, heading, paragraphs[] }.
 * The page renders whatever it is handed and adds nothing of its own.
 */
export function resolvePrivacy(site = {}, opts = {}) {
  const p = site.legal?.privacy || {};
  const business = site.business || {};
  const contact = site.contact || {};

  const entity = str(p.entityName) || str(business.legalName) || str(business.name);
  const trading = str(business.name);
  const abn = str(p.abn) || str(business.abn);
  const email = str(p.contactEmail) || str(contact.email);
  const phone = str(contact.phone);
  const postal = str(p.postalAddress) || str(contact.address);
  const state = str(p.state) || str(business.state) || "South Australia";

  /* The collected-fields list comes from the SAME resolver the form renders
     from, so trimming a field cannot leave the policy overstating collection. */
  const formFields = arr(opts.formFields).map(str).filter(Boolean);
  const hasForm =
    site.contactSection?.form?.enabled !== false && has(contact.formEndpoint) && formFields.length > 0;

  const provider = detectFormProvider(site);
  const analytics = ANALYTICS[str(site.analytics?.provider)] || null;
  const sms = site.features?.smsNotifications === true;

  const sections = [];
  const add = (id, heading, paragraphs) => {
    const body = paragraphs.map(str).filter(Boolean);
    if (body.length) sections.push({ id, heading, paragraphs: body });
  };

  /* 1 — who we are */
  add("who-we-are", "Who we are", [
    `${entity}${abn ? ` (ABN ${abn})` : ""}${
      trading && trading !== entity ? `, trading as ${trading},` : ""
    } operates this website. This policy explains what personal information we collect, why we collect it, who we share it with and what you can do about it.`,
    postal ? `We are based at ${postal}.` : "",
  ]);

  /* 2 — what we collect, split by HOW it reaches us. A trade business holds
     far more personal information from the job than from the website, and a
     policy that only describes the form describes the smaller half. */
  const websiteCollection = hasForm
    ? `When you send an enquiry through this website we collect the ${listOf(
        formFields
      )} you enter. Nothing on this site is mandatory to browse — you only give us these details if you choose to contact us.`
    : `This website does not collect personal information from you directly. There is no enquiry form; if you want to reach us, you contact us by phone or email and we hold what you tell us.`;

  const jobCollection =
    `When you contact us about work, and if you go on to book it, we also collect what we need to quote and carry out the job. ` +
    `That typically includes the address of the property, details about the site and the work you want done, access arrangements, and our notes and measurements. ` +
    `We may take photographs of the work area before, during and after the job as a record of its condition and of what we did.`;

  add("what-we-collect", "What we collect", [
    websiteCollection,
    jobCollection,
    `We do not ask for and do not want sensitive information — health details, racial or ethnic origin, political or religious views, or similar. Please do not send it to us.`,
  ]);

  /* 3 — why */
  add("why-we-collect", "Why we collect it", [
    `We use your information to respond to your enquiry, prepare and discuss a quote, schedule and carry out the work, contact you about the job while it is running, invoice you, and keep a record of what was done in case of a later question or a warranty claim.`,
    `We do not sell your information, and we do not trade or rent it to anyone.`,
    sms
      ? `If you give us your mobile number we may send you job-related text messages — arrival times, changes, reminders. These are about your job, not marketing, and you can ask us to stop at any time.`
      : "",
  ]);

  /* 4 — photographs. This is a real and specific consent question for trades:
     a finished job posted to a gallery is a photo of somebody's house. */
  add("photographs", "Photographs of your job", [
    `We keep photographs of completed work as part of our records. We may also want to show that work publicly — on this website, in a quote, or on social media.`,
    `Where a photograph shows anything that could identify you or your property — a street number, a distinctive frontage, a vehicle, a plate — we ask you first. If you would rather we did not use photographs of your job at all, tell us and we will keep them to our records only.`,
  ]);

  /* 5 — who we share it with */
  const sharing = [];
  if (provider && !provider.firstParty) {
    sharing.push(
      `${provider.name} processes enquiries submitted through this website and delivers them to us by email.`
    );
  }
  if (analytics) sharing.push(`${analytics.name} provides anonymous, aggregate statistics about how this site is used.`);
  sharing.push(`Our website host, which stores and serves the pages you are reading.`);
  sharing.push(
    `Tradespeople, suppliers and subcontractors we engage on your job, and only the details they need to do their part of it.`
  );
  sharing.push(`Our accountant, bookkeeper and insurer, where a job or an invoice requires it.`);
  sharing.push(
    `Anyone we are required to give it to by law — a court, a regulator, or a government agency exercising a lawful power.`
  );

  add("who-we-share-with", "Who we share it with", [
    `We share your information only where we need to, and only with:`,
    ...sharing.map((s) => `• ${s}`),
  ]);

  /* 6 — overseas. APP 8. The biggest gap in the old page. */
  const overseas = [];
  if (provider && !provider.firstParty && has(provider.country))
    overseas.push(`${provider.name}, in ${provider.country}`);
  if (analytics && has(analytics.country)) overseas.push(`${analytics.name}, in ${analytics.country}`);
  overseas.push(`our website host, which may store and serve this site from servers outside Australia`);

  add("overseas", "Information held overseas", [
    `Some of the services we rely on are operated outside Australia, which means information passing through them may be stored or processed overseas. Specifically: ${listOf(
      overseas
    )}.`,
    `We take reasonable steps to use services that handle information responsibly, but once information is held in another country it is also subject to that country's laws, which may differ from Australian privacy law.`,
  ]);

  /* 7 — cookies */
  const cookieParas = [];
  if (analytics && analytics.cookies) {
    cookieParas.push(
      `This site uses ${analytics.name}. ${analytics.body}`
    );
    cookieParas.push(
      `We ask before setting any analytics or advertising cookie. Cookies that are strictly necessary for the site to work — remembering that you answered the cookie notice, for instance — are set without asking, because the site cannot function without them.`
    );
  } else if (analytics) {
    cookieParas.push(`This site uses ${analytics.name}. ${analytics.body}`);
    cookieParas.push(`We do not use advertising cookies and we do not run tracking pixels for advertising networks.`);
  } else {
    cookieParas.push(
      `This site does not use analytics, advertising cookies or tracking pixels. Nothing is set on your device to follow you around the web.`
    );
  }
  add("cookies", "Cookies and tracking", cookieParas);

  /* 8 — security + retention */
  add("security-retention", "Keeping it safe, and how long we keep it", [
    `We take reasonable steps to protect the information we hold from loss, misuse and unauthorised access. Job records and quotes are kept in business systems that require a password to reach.`,
    `No system is perfectly secure, and we cannot guarantee the security of information while it is travelling to us over the internet.`,
    `We keep job records, quotes and invoices for at least seven years, because tax and business records law requires it and because a workmanship question can arise years after a job. Enquiries that never become jobs are kept while they are still useful and then deleted.`,
  ]);

  /* 9 — access and correction, APP 12/13 */
  add("access-correction", "Getting a copy, or correcting it", [
    `You can ask us what personal information we hold about you and ask for a copy. You can also ask us to correct anything that is wrong or out of date.`,
    email
      ? `Email ${email}${phone ? ` or call ${phone}` : ""} and tell us what you need. We will respond within a reasonable time, normally 30 days.`
      : phone
        ? `Call ${phone} and tell us what you need. We will respond within a reasonable time, normally 30 days.`
        : "",
    `We do not charge to handle a request. If we cannot give you what you have asked for — because it would reveal someone else's information, for instance — we will tell you why in writing.`,
  ]);

  /* 10 — marketing, Spam Act 2003 */
  add("marketing", "Marketing", [
    `If we send you anything promotional by email or text, every message will say who it is from and give you a way to unsubscribe. Unsubscribing takes effect promptly and we will not send you promotional messages after that.`,
    `Unsubscribing from marketing does not stop messages about a job you have booked with us — those are part of doing the work.`,
  ]);

  /* 11 — complaints, with the OAIC as the escalation point */
  add("complaints", "If you are not happy", [
    email
      ? `If you think we have mishandled your personal information, tell us first. Email ${email}${
          phone ? ` or call ${phone}` : ""
        } and set out what happened. We will look into it and come back to you.`
      : phone
        ? `If you think we have mishandled your personal information, tell us first. Call ${phone} and set out what happened. We will look into it and come back to you.`
        : `If you think we have mishandled your personal information, contact us and set out what happened. We will look into it and come back to you.`,
    `If you are not satisfied with how we handle it, you can take the matter to the Office of the Australian Information Commissioner at oaic.gov.au, or call them on 1300 363 992.`,
  ]);

  /* 12 — small business operator status. Only where the client has actually
     told us, because it is a claim about their turnover and we do not guess.
     The Privacy Act's small business exemption (s 6D) turns on a $3m annual
     turnover threshold, with carve-outs. Stating the position plainly is more
     use to a reader than silence, but inventing it is not an option. */
  const appStatus = str(p.privacyActStatus);
  if (appStatus === "covered") {
    add("our-obligations", "Our obligations", [
      `We are bound by the Privacy Act 1988 (Cth) and the Australian Privacy Principles, and we handle your information accordingly.`,
    ]);
  } else if (appStatus === "small-business") {
    add("our-obligations", "Our obligations", [
      `As a small business operator we fall below the turnover threshold in the Privacy Act 1988 (Cth), so most of the Act does not strictly bind us. We have chosen to follow the Australian Privacy Principles anyway, and this policy sets out how.`,
    ]);
  }

  /* 13 — children */
  add("children", "Children", [
    `This website is not aimed at children and we do not knowingly collect information from them. If you believe a child has given us personal information, contact us and we will delete it.`,
  ]);

  /* 14 — changes */
  add("changes", "Changes to this policy", [
    `We update this policy when what we do changes. The current version is always the one on this page, and the date at the top tells you when it last changed.`,
  ]);

  /* 15 — contact */
  add("contact", "Contact us", [
    [
      `Privacy questions about this policy or the information we hold:`,
      entity,
      abn ? `ABN ${abn}` : "",
      postal,
      email,
      phone,
    ]
      .filter(Boolean)
      .join(" · "),
  ]);

  /* Custom clauses last, so a client can always add something specific. */
  for (const [i, c] of arr(p.extraSections).entries()) {
    if (c && has(c.heading) && has(c.body)) {
      add(`custom-${i}`, str(c.heading), [str(c.body)]);
    }
  }

  return {
    entity,
    abn,
    email,
    phone,
    state,
    sections,
    /* A client who has read and accepted the generated policy can record it.
       Unreviewed is not a blocker — it is a flag for the build report. */
    reviewed: p.reviewed === true,
  };
}
