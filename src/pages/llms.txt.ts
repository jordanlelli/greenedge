import type { APIRoute } from "astro";
import { site, fullAddress } from "../config";
import { services as serviceCatalog } from "../data/services";

export const GET: APIRoute = () => {
  const lines: string[] = [];
  const b = site.business || {};

  lines.push(`# ${b.name || ""}`);
  if (b.tagline) lines.push(`> ${b.tagline}`);
  lines.push("");

  const story = site.story?.body || b.shortDescription;
  if (story) {
    lines.push("## About");
    lines.push(story);
    if (b.established) lines.push(`Established ${b.established}.`);
    lines.push("");
  }

  /* src/data/services.ts is EMPTY by default and only populated for clients who
     warrant full per-service detail pages. Reading it alone meant llms.txt
     omitted the Services section for every ordinary client — the single most
     important fact about the business, missing from the file models treat as
     ground truth. Fall back to the intake, which /services already reads. */
  const intakeServices = (site.services?.items || [])
    .filter((s: any) => s && String(s.title || "").trim())
    .map((s: any) => ({ name: String(s.title).trim(), shortLine: String(s.description || "").trim() }));
  const svc = serviceCatalog.length
    ? serviceCatalog.map((s) => ({ name: s.name, shortLine: s.shortLine }))
    : intakeServices;

  if (svc.length) {
    lines.push("## Services");
    svc.forEach((s) => {
      lines.push(s.shortLine ? `- **${s.name}**: ${s.shortLine}` : `- **${s.name}**`);
    });
    lines.push("");
  }

  const areas = site.usage?.items || [];
  if (areas.length) {
    lines.push("## Service Areas");
    lines.push(areas.join(", "));
    lines.push("");
  }

  const faqs = site.faqs?.items || [];
  if (faqs.length && faqs[0]?.question) {
    lines.push("## Frequently Asked Questions");
    faqs.forEach((f: any) => {
      if (!f.question) return;
      lines.push(`**Q: ${f.question}**`);
      lines.push(`A: ${f.answer}`);
      lines.push("");
    });
  }

  lines.push("## Contact");
  if (site.contact?.phone) lines.push(`- Phone: ${site.contact.phone}`);
  if (site.contact?.email) lines.push(`- Email: ${site.contact.email}`);
  if (fullAddress()) lines.push(`- Address: ${fullAddress()}`);
  /* Licence lives at business.licence in every intake and skeleton; the old
     contact.licence path was never populated, so the licence number never
     appeared here. contact is kept as a fallback for hand-edited intakes. */
  const licence = site.business?.licence || site.contact?.licence;
  if (licence) lines.push(`- Licence: ${licence}`);
  if (site.business?.abn) lines.push(`- ABN: ${site.business.abn}`);

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
