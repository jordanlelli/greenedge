---
name: new-client
description: Create a new client site repo from the universal template, wired for template sync. Use when starting a build for a new business.
argument-hint: "\"Business Name\" --trade \"Trade\" [--slug folder-name] [--domain example.com.au]"
disable-model-invocation: true
---

# New client repo

Run from the TEMPLATE repo or the folder that contains it
(`C:\Users\lelli\Desktop\Cursor` on Jordan's PC). Arguments: $ARGUMENTS

1. Parse the business name, `--trade`, optional `--slug` (default: kebab-case of
   the name) and `--domain`. Confirm them with Jordan in one line.
2. Target folder `../<slug>` (sibling of universal-template). Stop if it exists.
3. `git clone https://github.com/jordanlelli/universal-template.git ../<slug>`
   then in it: `git remote rename origin template`, `git rm -q BACKLOG.md`.
4. `node scripts/new-client.mjs "<Name>" --trade "<Trade>" [--domain <d>] --force`.
5. Fill `CLIENT.md` from what Jordan has given (who, contacts, scope, pages,
   open questions). Never invent facts; unknowns are `TODO:` lines.
6. Build the intake with Jordan: follow BUILD-PLAYBOOK.txt and INTAKE-SPEC.txt;
   paste the trade preset from brief-presets.txt into `_brief`. Real content
   only; TODO markers for anything unknown.
7. `npm run template:init` (records the base), `npm ci`, `npm run build`,
   `npm run qa`.
8. Commit: "New client: <Name> (template v<ver>)".
9. Remote: if `gh` is available and authenticated,
   `gh repo create jordanlelli/<slug> --private --source . --remote origin --push`.
   Otherwise tell Jordan to create an empty private repo named `<slug>` on
   GitHub and run `git remote add origin <url>` then `git push -u origin main`.
10. Remind Jordan: grant the Claude GitHub app access if it is set to "Only
    select repositories"; import the repo in Vercel with Install Command
    `npm ci`; set `seo.noindex` true until launch.
