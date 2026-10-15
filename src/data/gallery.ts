/**
 * Gallery — work photos for /gallery and the WorkGallery homepage section.
 * Add entries ONLY when real, paired job photos physically exist. Never ship
 * demo/stock images here labelled as real work (DESIGN-LIBRARY G5 / guardrail B7).
 *
 * Images: import from src/assets/images/gallery/ (astro:assets pipeline).
 *
 * Data only. The record shape is `GalleryEntry` in src/lib/types.ts (shared, synced).
 *
 * GreenEdge: real job photos from Harrison, received 2026-10-15. Pairs chosen
 * by Jordan. No suburb or job date was supplied, so each entry sets `title`
 * and leaves suburb and month blank rather than guessing.
 */
import type { GalleryEntry } from "../lib/types";
import pergolaBefore from "../assets/images/gallery/backyard-lawn-pergola-overgrown-before.jpg";
import pergolaAfter from "../assets/images/gallery/backyard-lawn-pergola-mown-after.jpg";
import vergeBefore from "../assets/images/gallery/front-verge-lawn-before.jpg";
import vergeAfter from "../assets/images/gallery/front-verge-lawn-mown-after.jpg";
import rosesBefore from "../assets/images/gallery/rose-garden-bed-before.jpg";
import rosesAfter from "../assets/images/gallery/rose-garden-bed-pruned-mulched-after.jpg";

/* Optional human-readable names per service key. Fill per client if used. */
export const galleryServiceNames: Record<string, string> = {
  "lawn-mowing": "Lawn mowing",
  "garden-maintenance": "Garden maintenance",
};

/* Optional heading + intro per service group on /gallery. The heading is the
   H2 for that group, so write it as the service people search for
   ("Exposed aggregate driveways"), not the internal key. */
export const gallerySectionCopy: Record<string, { heading: string; intro: string }> = {
  "lawn-mowing": { heading: "Lawn mowing before and after", intro: "" },
  "garden-maintenance": { heading: "Garden maintenance before and after", intro: "" },
};

/* Real paired photos only. */
export const galleryEntries: GalleryEntry[] = [
  {
    id: "backyard-lawn-pergola",
    service: "lawn-mowing",
    suburb: "",
    title: "Backyard lawn mown",
    monthCompleted: "",
    oneLineDescription: "Long grass in the back yard mown short, seen from under the pergola.",
    images: [
      { src: pergolaBefore, alt: "Long grass across a back yard, seen from under a pergola.", kind: "before" },
      { src: pergolaAfter, alt: "The same back yard with the lawn mown short.", kind: "after" },
    ],
    isPlaceholder: false,
  },
  {
    id: "front-verge-lawn",
    service: "lawn-mowing",
    suburb: "",
    title: "Front lawn and verge mown",
    monthCompleted: "",
    oneLineDescription: "Front lawn strip beside the kerb and paved driveway mown and tidied.",
    images: [
      { src: vergeBefore, alt: "A front lawn strip with a young tree beside the kerb and a paved driveway.", kind: "before" },
      { src: vergeAfter, alt: "The same front lawn strip after mowing.", kind: "after" },
    ],
    isPlaceholder: false,
  },
  {
    id: "rose-garden-bed",
    service: "garden-maintenance",
    suburb: "",
    title: "Front rose bed tidied",
    monthCompleted: "",
    oneLineDescription: "Rose bed along the front fence trimmed back and tidied.",
    images: [
      { src: rosesBefore, alt: "A rose bed along a black front fence before trimming.", kind: "before" },
      { src: rosesAfter, alt: "The same rose bed along the front fence after trimming and tidying.", kind: "after" },
    ],
    isPlaceholder: false,
  },
];
