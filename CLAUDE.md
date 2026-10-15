# Kova universal template — Claude Code instructions

Astro 7 + Tailwind v4 static sites for Australian trades, built by Kova Digital
(Jordan). One template repo is the source of truth for all shared code; every
client site is its own repo that differs only by `client-intake.json` (content
+ `_brief` direction), `src/data/*.ts`, its images, and `CLIENT.md`. The
standing rules and this repo's client (if any) are imported below. Both are
binding.

@CURSOR-CONTEXT.txt
@CLIENT.md

## First, work out which repo this is
- **Template repo** (`client-intake.json` is the blank skeleton, `CLIENT.md` says
  "no client", no `template` git remote): shared code is the job. Every change
  ships as a release: `npm run template:release -- <x.y.z>` (bumps package.json
  and both package-lock.json fields) + a `TEMPLATE-CHANGES.md` entry + a
  `v<x.y.z>` tag. Never commit a client's intake, data or photos here.
- **Client repo** (real `business.name`, a `template` remote,
  `.template-sync.json`): per-client work happens ONLY in `client-intake.json`,
  `src/data/*.ts`, `src/assets/**`, `public/**` and `CLIENT.md`. Anything else is
  shared (the exact list is `template.config.json`). Editing shared code here is
  a TEMPLATE change: say so before making it, keep it in its own commit, and
  port it back with `/port-to-template` (or revert it). A client repo must
  never drift silently.
- In a client repo, read `CLIENT.md`, then `_todo` and `_brief` in
  `client-intake.json`, before anything else.

## Launched sites are frozen (v3.29)
- A site that is live for a client NEVER takes a template update on its own.
  It stays on the template version it launched with until Jordan asks, in
  that session, for that site to be updated. "Sync the template", "update
  everything" or a new template release is not that request.
- Do not run `template:pull`, `/sync-template` or `npm ci` in a launched site,
  and do not offer to, unless he has asked for that site by name.
- At launch, lock it: `npm run template:lock` (or
  `node ../universal-template/scripts/template-sync.mjs lock` in a repo older
  than v3.29), commit `.template-sync.json`, and note it in `CLIENT.md`.
  A locked site refuses `pull`. Never unlock one to get a task done.
- A recon demo that has not been sold is not launched and can be synced.

## Keeping template and clients in step (docs/SYNC.md)
- `npm run template:status` — what the template changed, what drifted here.
  Run it at the start of any client session that touches code.
- `/sync-template` — pull the latest release into a client (3-way, own branch).
  Pre-launch sites only; a launched site is locked (see above).
- `/port-to-template` — move a client's shared-code change into the template,
  generalise it, release, pull back.
- `/new-client` — new client repo from the template, sync-ready.
- `/backlog-run` — template only: work BACKLOG.md, one PR per item.
- `/verify` — build gates + real-browser qa + visual check.
- Folder layout on Jordan's PC: repos are siblings under
  `C:\Users\lelli\Desktop\Cursor\` (`universal-template`, `AandJ-v2`, …), so the
  template is always `../universal-template` from a client. To let a client
  session read it: `claude --add-dir ../universal-template`.

## How to work
- Decide before building. For anything touching shared code, state the plan and
  show the diff before writing. One change at a time, then stop for review.
- Keep scope tight. Don't touch section variants, palette or copy unless asked.
  Before finishing, list every file changed; if the list is longer than the
  task warrants, say so and explain each.
- Content rules: never invent testimonials, stats, licences, ABNs, suburbs or
  prices; use explicit TODOs. `features.hasPhotos` is true only when the files
  exist. Nothing in `_brief` ever renders. Every heading carries a real keyword;
  slugs carry the target keyword (INTAKE-SPEC §10).
- Dependencies: `npm ci` only. Never `npm install`, `npm update` or
  `npm audit fix` in a client repo; dependency updates happen in the template
  (README "Dependencies") and arrive via `template:pull`. Never add a package
  without Jordan's explicit OK.
- Line endings are LF (`.gitattributes`). Don't reformat files you didn't change.
- Git: branch per change; never push to `main` or force-push without being
  asked (a push to a client's `main` deploys on Vercel). Commit messages say
  what and why.
- Communication: direct, concise, no filler or flattery. Lead with the
  strongest objection to Jordan's plan if there is one; give confidence levels
  (high/moderate/low) on judgement calls. Don't claim a tool behaves a certain
  way unless you've tested it or can cite the docs.

## Verify before calling anything done
- `npm run build` — all gates must pass. Fix the source, never the gate.
- `npm run qa` — impeccable in a real browser over every built page, then the
  layout check (`scripts/check-layout.mjs`) at ten widths from 360 to 1920
  (exit 0). Do not use `impeccable detect dist` as the verdict (see §15 above).
  A layout finding is fixed in the layout or the content, never by loosening
  the check (docs/LESSONS.md, "Layout faults no gate measured").
- Look at the result at 1440px and 390px wide if a browser tool is available;
  if not, say the visual check wasn't done.
- Report what changed in plain terms, and anything left for Jordan to do.

## Images
- Intake paths stay public-style (`/images/services/x.webp`). The file goes at
  the same path under `src/assets/` to get the resized WebP srcset (v3.21).
- Before committing a photo: rotate it upright (bake EXIF orientation), strip
  all metadata including GPS, cap the master at ~2400px, encode from the
  original (never re-encode a lossy WebP), check the crop keeps the subject,
  lowercase-hyphenated keyword filename. Real client work only in
  gallery/services/before-after.

## Reference docs (read when relevant, not every session)
- `docs/ARCHITECTURE.md` — pipeline, engine, file map, "adding a variant/field/section" checklists
- `docs/SYNC.md` — template ↔ client sync: ownership, commands, workflows
- `docs/LESSONS.md` — past failures and the rule each produced (read before big changes)
- `docs/CLAUDE-CODE.md` — how Jordan's machine, repos and Claude Code are set up
- `VARIANTS.txt` / `VARIANT-CHEAT-SHEET.txt` — every layout variant and its prerequisites
- `DESIGN-LIBRARY.txt` — trade presets, palettes, doctrine (check-design enforces §1)
- `INTAKE-SPEC.txt` — every intake field; `client-intake.skeleton.json` — the blank
- `BUILD-PLAYBOOK.txt` — new-client order of work
- `TEMPLATE-CHANGES.md` — what changed and why, newest first
- `BACKLOG.md` (template only) — queued improvements for unattended runs
