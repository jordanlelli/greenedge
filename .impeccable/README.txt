.impeccable/config.json — standing ignores for confirmed false positives.

These three entries come from IMPECCABLE-RETRO (the GreenEdge working
retrospective). They are the false positives that recurred every build:

  1. design-system-radius 33554432 — Tailwind v4 `rounded-full` is
     calc(infinity * 1px), clamped by the browser to 2^25px. Not a real value.
  2/3. em-dash-overuse on token-heavy files — the rule counts "--" as an em
     dash, so every `--token` / `var(--x)` is a false match. Verify real em
     dashes before ever "fixing" them:  rg -o '—' <file> | wc -l

CONFIRM THE SCHEMA against your installed impeccable version before relying on
this. The field names here (rule / value / path / reason) follow the shape
described in the project notes; if `npx impeccable@3` expects different keys
(e.g. id / match / glob), adjust accordingly. Use ignores, never rule-disables,
and always keep the stated reason.

Do NOT track the critique score as a KPI (27/40 is the median, not a grade).
Track: detector exit code (0 = clean), P0 count, and the AI-slop pass/fail.
Run the browser pass against the CORRECT dev-server port (read it off the first
screenshot) AND the src/ pass — neither substitutes for the other.
