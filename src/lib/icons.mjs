/**
 * icons.mjs — a small set of line icons for service cards (v3.27).
 *
 * `services.items[].icon` names one of these. Each is one path on a 24x24
 * grid, drawn with a 1.75 stroke in currentColor, so it takes the client's
 * colour and needs no image file. An unknown or empty name renders the card's
 * number instead, as before.
 *
 * Add an icon by adding a key here; check-intake reads this list, so a typo
 * in an intake is caught before the build. Plain JS for the Node checks.
 */
export const ICONS = {
  fence: "M4 21V7l2-2 2 2v14M10 21V7l2-2 2 2v14M16 21V7l2-2 2 2v14M2 11h20M2 17h20",
  gate: "M3 21V5M21 21V5M3 8h18M3 19h18M7.5 8v11M12 8v11M16.5 8v11",
  "sliding-gate": "M2 20h20M4 20V7h13v13M8.5 7v13M12.5 7v13M19 12h3M20.5 10.5 22 12l-1.5 1.5",
  letterbox: "M3 17v-7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7zM11 17v-7a4 4 0 0 0-4-4M15 12V9h2.5M12 17v4",
  bolt: "M13 2 5 13h6l-1 9 8-11h-6z",
  droplet: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  roller: "M4 4h13v5H4zM17 6.5h3V12h-8v3M10.5 15h3v6h-3z",
  leaf: "M5 19c0-8 5-13 15-14-1 10-6 15-14 14zM5 19l7-7",
  tree: "M12 3 6 11h3l-4 6h14l-4-6h3zM12 17v4",
  spade: "M12 3v9M9 3h6M7 12h10v3a5 5 0 0 1-10 0z",
  hammer: "M14 4l6 6-2.5 2.5-6-6zM12.5 8.5 4 17l3 3 8.5-8.5",
  wrench: "M14.5 6a4.5 4.5 0 0 0-5.9 5.6L3 17.2 6.8 21l5.6-5.6A4.5 4.5 0 0 0 18 9.5l-3 3-2.5-2.5z",
  home: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6",
  truck: "M2 7h11v9H2zM13 10h4l4 3v3h-8zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  shield: "M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z",
  ruler: "M3 16 16 3l5 5L8 21zM7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8",
  snowflake: "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5",
  tiles: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  layers: "M12 3 2 8l10 5 10-5zM2 12l10 5 10-5M2 16l10 5 10-5",
  window: "M4 3h16v18H4zM12 3v18M4 12h16",
  key: "M14.5 9.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM13.5 12.5 21 20M17 16l2-2",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  check: "M5 12.5l4.5 4.5L19 7.5",
};
export const ICON_NAMES = Object.keys(ICONS);
export const iconPath = (name) => ICONS[String(name || "").trim().toLowerCase()] || "";
