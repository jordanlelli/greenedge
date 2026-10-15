---
name: sync-template
description: Pull the latest universal-template release into this CLIENT repo (three-way, on its own branch), verify it, and report drift. Use when asked to update, sync or upgrade a client site to the latest template.
argument-hint: "[--dry-run]"
disable-model-invocation: true
allowed-tools: Bash(git status *), Bash(git fetch *), Bash(git diff *), Bash(git log *), Bash(git switch *), Bash(git add *), Bash(git commit *), Bash(npm run template*), Bash(node scripts/template-sync.mjs *), Bash(npm ci), Bash(npm run build), Bash(npm run qa)
---

# Sync this client repo with the template

Full model: `docs/SYNC.md`. This repo must be a CLIENT repo (real
`business.name` in `client-intake.json`). If it is the template itself, stop.

## Before touching anything
0. **Is this site launched?** Read `.template-sync.json` and `CLIENT.md`. If
   `"locked": true`, or CLIENT.md says the site is live for the client, STOP:
   a launched site does not take template updates. Report that it is locked
   and on which version. Continue only if Jordan has asked, in this session,
   for THIS site to be updated, and then say plainly that it is live before
   unlocking (`npm run template:unlock`). Lock it again at the end.
1. `git status` — must be clean. If not, list what is uncommitted and stop.
2. If `scripts/template-sync.mjs` is missing (repo predates v3.23), run the
   template's copy with this repo as cwd:
   `node ../universal-template/scripts/template-sync.mjs <cmd>`. If
   `../universal-template` does not exist, ask Jordan where it is.
3. `npm run template:status`. If it says **No base recorded**, run
   `npm run template:init`, show the result, and commit `.template-sync.json`
   ("Record template base") before continuing.
4. Show Jordan the status summary in plain terms:
   - what the template will change (count + notable files),
   - any 3-way merges,
   - **drift**: files changed only here or new here. These must be ported back
     (`/port-to-template`) or accepted as overwritten. Ask which, per file, if
     there are any — do not decide silently.
   - client-owned files the template changed (e.g. types in `src/data/*.ts`):
     show the printed `git diff` and propose the hand edit.
   If $ARGUMENTS contains `--dry-run`, stop here.

## Pull
5. `npm run template:pull` (creates `template-sync/v<ver>`).
6. Conflict markers: resolve each file keeping both intents; explain each
   resolution in one line. Re-run `npm run template:status` until no markers.
7. If package.json / package-lock.json changed: `npm ci`.
8. Run the `verify` skill steps (build, qa, visual).
9. Read the TEMPLATE-CHANGES.md entries between the old and new version and
   list any "after pulling" steps (new intake keys, manual moves). Do them only
   if they are intake-only; otherwise list them for Jordan.
10. `git add -A && git commit -m "Template sync v<ver>"`.
11. Report: version from → to, what changed for this site, verify result,
    drift still outstanding. Ask before merging to `main` or pushing (a push to
    `main` deploys on Vercel).
