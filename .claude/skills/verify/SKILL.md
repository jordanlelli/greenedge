---
name: verify
description: Run the full verification for this repo (build gates, real-browser impeccable QA and layout check at ten screen widths, visual check at desktop and mobile) and report plainly. Use before calling any change done, before a commit that touches shared code, and after a template sync.
argument-hint: "[pages to eyeball, e.g. / /services]"
allowed-tools: Bash(npm ci), Bash(npm run build), Bash(npm run qa), Bash(npm run qa:src), Bash(npm run check:intake), Bash(node -v), Bash(git status *), Bash(git diff *)
---

# Verify

1. `node -v` — must be ≥ 22.18 (impeccable). If lower, stop and say so.
2. If `package-lock.json` changed since `node_modules` was installed (or
   `node_modules` is missing): `npm ci`. Never `npm install`.
3. `npm run build`. Every gate must pass. On failure: read the gate's message,
   fix the SOURCE (never the gate, never `--force-placeholders` for a real
   deploy), rebuild. If the fix would touch shared code in a client repo, stop
   and say it is a template change first.
4. `npm run qa`. Exit 0 = clean. It runs impeccable, then the layout check
   (`scripts/check-layout.mjs`, every page at ten widths from 360 to 1920).
   For each impeccable finding: real → fix; proven false positive → propose an
   ignore for `.impeccable/config.json` (schema in `.impeccable/README.txt`)
   with a reason, and ask before adding it. Never judge by
   `impeccable detect dist`. For each layout finding (overflow, column-gap,
   table-space, table-cells, adblock): fix the layout or the content: even up
   the copy in side-by-side blocks, choose a variant whose prerequisites the
   content meets, rename an id or class that ad blockers hide. Only a layout
   that is deliberately uneven gets `data-layout-check="ignore"`, and only
   after asking.
5. If shared CSS/components changed, also `npm run qa:src`.
6. Visual check: if a browser tool is available in this session, open the built
   pages ($ARGUMENTS, else `/` plus every page the diff touches) at 1440px and
   390px wide and look for overflow, clipped text, broken images, wrong
   variant. If no browser tool is available, say that the visual check was not
   done — never claim it was.
7. Report in this order: gates (pass/fail), qa (count + what), visual (done or
   not), anything left for Jordan. No recap of steps.
