.impeccable/config.json — standing ignores for confirmed false positives.

SCHEMA (checked against impeccable 3.6, v3.22). Ignores live under
"detector". ignoreValues entries are { rule, value, files?, reason }:
value is the exact extracted value, or "*" with `files` to scope a whole
rule to specific files. The pre-v3.22 file used a flat ignoreRules array of
objects, which impeccable silently discarded — none of the ignores worked.

  1. design-system-radius 33554432 — Tailwind v4 `rounded-full` is
     calc(infinity * 1px), clamped by the browser to 2^25px. Not a real value.
  2. em-dash-overuse on global.css / Layout.astro — the rule counts "--" as
     an em dash, so every `--token` / `var(--x)` is a false match. Verify
     real em dashes before ever "fixing" them:  rg -o '—' <file> | wc -l

HOW TO RUN IT
  npm run build && npm run qa    real browser, every built page (the one
                                 that counts; exit 2 = findings)
  npm run qa:src                 static pass over src/
  npm run qa:static              static pass over dist/ — kept for
                                 comparison only: jsdom cannot resolve
                                 Tailwind v4 spacing, so it reports ~70
                                 false cramped-padding findings per site.

Use ignores, never rule-disables, and always keep the stated reason.
Track the detector exit code, not the critique score.
