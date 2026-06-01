import type { APIRoute } from "astro";
import { site, fullAddress } from "../config";

export const GET: APIRoute = () => {
  const lines: string[] = [];

  lines.push(`# ${site.business?.name || ""}`);
  if (site.business?.tagline) lines.push(`> ${site.business.tagline}`);
  if (site.business?.shortDescription) lines.push(site.business.shortDescription);
  lines.push("");

  if (site.story?.body) {
    lines.push("## About");
    lines.push(site.story.body.replace(/\n\n/g, "\n"));
    lines.push("");
  }

  const services = site.services?.items || [];
  if (services.length > 0) {
    lines.push("## Services");
    services.forEach((s: { title: string; description?: string }) => {
      lines.push(`- **${s.title}**${s.description ? ` — ${s.description}` : ""}`);
    });
    lines.push("");
  }

  const areas = site.usage?.items || [];
  if (areas.length > 0) {
    lines.push("## Service Areas");
    lines.push(areas.join(", "));
    lines.push("");
  }

  const trustMarks = site.hero?.trustMarks || [];
  if (trustMarks.length > 0) {
    lines.push("## Credentials & Trust");
    trustMarks.forEach((p: string) => lines.push(`- ${p}`));
    if (site.business?.licence) lines.push(`- ${site.business.licence}`);
    lines.push("");
  }

  const faqItems = site.faqs?.items || [];
  if (faqItems.length > 0) {
    lines.push("## Frequently Asked Questions");
    faqItems.forEach((f: { question: string; answer: string }) => {
      lines.push(`**Q: ${f.question}**`);
      lines.push(`A: ${f.answer}`);
      lines.push("");
    });
  }

  lines.push("## Contact");
  if (site.contact?.phone) lines.push(`- Phone: ${site.contact.phone}`);
  if (site.contact?.email) lines.push(`- Email: ${site.contact.email}`);
  if (fullAddress()) lines.push(`- Address: ${fullAddress()}`);

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
