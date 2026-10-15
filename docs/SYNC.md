# Template ↔ client sync

One template repo (`jordanlelli/universal-template`) is the source of truth for
all shared code. Every client site is its own repo. Changes flow both ways:

```
             template:pull  (template → client)
  universal-template  ───────────────────────────►  client repo (A&J, GreenEdge, …)
                      ◄───────────────────────────
             template:import (client → template), then release + pull everywhere
```

Tooling: `scripts/template-sync.mjs` (no dependencies; Node ≥ 22 + git).
Ownership rules: `template.config.json`. Per-client sync state: `.template-sync.json`.

---

## 1. Why file-based and not `git merge`

Client repos started as zip copies, so they share **no git history** with the
template. `git merge template/main` would either refuse ("unrelated histories")
or, forced, treat every file as a conflict. Rewriting each client's history to
fake a common ancestor is destructive and buys nothing.

Instead the script compares files three ways:

| name | what it is |
|---|---|
| **base** | the template commit this client last synced to (recorded in `.template-sync.json`) |
| **template** | `template/main` now |
| **client** | this repo's working tree |

Per shared file:

| base → template | base → client | result on `pull` |
|---|---|---|
| unchanged | unchanged | nothing |
| changed | unchanged | take template's version |
| unchanged | changed | keep client's — reported as **drift to port back** |
| changed | changed | `git merge-file` 3-way; clean merges apply, overlaps get `<<<<<<<` markers |
| deleted | unchanged | delete |
| exists | missing in client | restore (shared files must exist everywhere) |

This is exactly what git does internally for a merge, just per file, with the
base recorded explicitly instead of discovered from history. No history rewrite,
no restructure, works on every existing repo today.

---

## 2. Who owns which file

`template.config.json`:

- **client** globs: each client owns its copy. Sync never reads, writes or
  deletes these: `client-intake.json`, `CLIENT.md`, `CLAUDE.local.md`,
  `.template-sync.json`, `src/data/**`, `src/assets/**`, `public/**`,
  `.vercelignore`, `.vercel/**`.
- **templateOnly** globs: live in the template only (`BACKLOG.md`, `.github/**`).
- **everything else tracked in the template is shared**: `src/components`,
  `src/lib`, `src/layouts`, `src/pages`, `src/styles`, `src/config.ts`,
  `scripts/`, `astro.config.mjs`, `package.json`, `package-lock.json`,
  `tsconfig.json`, all docs, `.claude/`, `.impeccable/`, `CLAUDE.md`,
  `.gitattributes`, `.gitignore`, `client-intake.skeleton.json`.

Consequences to design around:

- **Anything a client needs to differ goes in the intake**, never in a
  component. If a client genuinely needs a new behaviour, it is a new intake
  flag in the template (default off), not a fork of the component.
- **Nothing shared goes in `public/` or `src/assets/`** — clients own those.
  Shared static assets belong in `src/lib` / `src/styles` or are generated.
- **`src/data/*.ts` holds data only.** The record types are in
  `src/lib/types.ts` and the lookups (`getServiceBySlug`, `formatServicePrice`,
  `getRecentJobs`, …) in `src/lib/data.ts`, both shared, so a type or helper
  change syncs like any other code. A client repo created before that split
  still has types and helpers in its data files; they are ignored and can be
  deleted (TEMPLATE-CHANGES, split-data-types). If the template ever changes
  the default data files themselves, `status` and `pull` print them under
  "template changed client-owned files" with the `git diff` to apply by hand.
- The manifest itself is shared, and `pull` reads the **template's** copy, so
  an ownership change upstream applies on the next pull.

---

## 3. Commands

All run from the repo root. In a client repo `template-sync.mjs` itself arrives
with the first pull; before that, run it from the template folder beside it:
`node ../universal-template/scripts/template-sync.mjs <cmd>` (cwd = client).

| command | where | what |
|---|---|---|
| `npm run template:status` | client | fetch, then list: template updates, 3-way items, local drift, new local files, conflict markers left behind. Exit 1 if no base recorded or markers remain. |
| `npm run template:init [-- --base <ref>]` | client | record the base. Without `--base` it finds the template commit whose `package.json` version equals this repo's (tag `v<x.y.z>` first, then history). |
| `npm run template:pull [-- --dry-run] [-- --no-branch] [-- --theirs]` | client | requires a clean tree; creates branch `template-sync/v<ver>`; applies the table in §1; updates `.template-sync.json`. Never commits. |
| `npm run template:lock [-- --note "…"]` / `npm run template:unlock` | client | mark a LAUNCHED site so `pull` refuses, or remove that mark (§4c-0). |
| `npm run template:import -- <clientDir> [--only a,b] [--include-new] [--apply]` | template | the reverse: port a client's shared-code changes into the template. Dry run by default. |
| `npm run template:release -- <x.y.z>` | template | bump `version` in package.json **and** both fields in package-lock.json; warns if TEMPLATE-CHANGES.md has no entry. |

`--theirs` only matters when no base is recorded: it takes the template's
version of every differing file. Use it only after anything worth keeping has
been ported back.

---

## 4. Workflows

### 4a. One-time: connect an existing client repo (A&J, GreenEdge, …)

```powershell
cd C:\Users\lelli\Desktop\Cursor\<client>
git remote add template https://github.com/jordanlelli/universal-template.git
git fetch template --tags
node ..\universal-template\scripts\template-sync.mjs init          # finds the base from package.json version
node ..\universal-template\scripts\template-sync.mjs status        # what drifted
```

- If the client's version predates the template's git history (anything below
  the first pushed tag), there is no base to find. Pick the closest: `init --base v3.22.1`
  and expect `status` to show real drift as "changed only here".
- Everything under "changed only here" / "new here" is **drift**: either port it
  back (§4d) or accept that the template wins and let `pull` overwrite it.
- Then `npm run template:pull` → `npm ci` → `npm run build` → `npm run qa` →
  commit → merge the branch → push.
- If `.gitattributes` was just added: `git add --renormalize .` and commit
  that separately ("Normalise line endings") so it does not hide real diffs.

### 4b. New client

`/new-client "Business Name" --trade "Concreting"` (Claude Code skill), or by hand:

```powershell
cd C:\Users\lelli\Desktop\Cursor
git clone https://github.com/jordanlelli/universal-template.git <slug>
cd <slug>
git remote rename origin template
git rm -q BACKLOG.md                       # template-only
gh repo create jordanlelli/<slug> --private --source . --remote origin
#   (no GitHub CLI? `winget install GitHub.cli`, `gh auth login` — or create the
#    empty private repo on github.com and `git remote add origin <url>`)
node scripts/new-client.mjs "Business Name" --trade "Concreting" --force
npm run template:init
#   then fill CLIENT.md (who they are, scope, open items) — Claude reads it every session
npm ci
git add -A; git commit -m "New client: Business Name"; git push -u origin main
```

A clone *does* share history with the template, which is fine — the file-based
sync works identically either way.

### 4c-0. Launched sites do not take releases (v3.29)

A template release is allowed to change how sites look. v3.28 changed fonts,
motion and four sections. That must never reach a live client site as a side
effect of syncing, so a launched site is frozen on the version it launched
with.

```powershell
npm run template:lock -- --note "Live at example.com.au since 2026-10"
#   repo older than v3.29:  node ..\universal-template\scripts\template-sync.mjs lock
git add .template-sync.json; git commit -m "Lock template version (site is live)"
```

- `lock` writes `"locked": true` into `.template-sync.json`. That file is
  client-owned, so the lock travels with the repo and no release can clear it.
  It works offline and on a repo that was never connected to the template.
- `pull` then stops before touching anything (exit 1). `pull --dry-run` and
  `status` still work and say LOCKED at the top.
- There is no flag that pulls through a lock. To update a launched site on
  purpose: `npm run template:unlock`, pull on the sync branch, build, qa, look
  at it, deploy, then `lock` again.
- Rollout below (4c) applies to sites that are NOT launched: demos, and
  builds still in progress.

### 4c. Roll a template release out to a client

```powershell
npm run template:status          # read it before touching anything
npm run template:pull
npm ci                           # if package.json / lock changed
npm run build; npm run qa
git add -A; git commit -m "Template sync v3.23.0"
git switch main; git merge template-sync/v3.23.0; git push
```

Conflict markers: open the file, keep both intents, remove markers, rebuild.
`status` refuses to call the repo clean while markers remain.

### 4d. Port a change made in a client back to the template

This is the rule that stops drift: **a change to shared code in a client repo
is a template change.** Either it goes back to the template, or it is reverted.

1. In the client: commit the change (on its own commit, message says what and why).
2. In the template (clean tree, on a branch):
   ```powershell
   cd ..\universal-template
   git switch -c port/<client>-<what>
   npm run template:import -- ..\<client>                      # dry run: lists candidates
   git diff --no-index -- src/components/X.astro ..\<client>\src/components/X.astro
   npm run template:import -- ..\<client> --only src/components/X.astro --apply
   ```
3. Generalise before releasing: anything client-specific in the change becomes
   an intake flag with a neutral default. Run `npm run qa:demo` (the template's
   own demo intake), and for anything that changes rendering also build one
   real client intake: `node scripts/with-intake.mjs <path-to-intake> npm run build`.
   `client-intake.json` stays the skeleton throughout.
4. `npm run template:release -- 3.23.0`, add the TEMPLATE-CHANGES.md entry,
   `npm run build && npm run qa`, commit, `git tag v3.23.0`, push (PR if on a branch).
5. Back in the client: `npm run template:pull`. The ported files now match the
   template, so drift for them disappears.

`/port-to-template` (Claude Code skill) runs this whole loop with review gates.

### 4e. Release checklist (template)

- [ ] if `scripts/template-sync.mjs` changed: `npm run test:sync -- --mutants` passes (about 10 minutes; plain `npm run test:sync` takes under a minute)
- [ ] change generalised (no client names, colours, copy, or photo paths in shared code — `check-universal` enforces colours)
- [ ] `npm run qa:demo` passes; for rendering changes, a real intake also builds and passes qa (`scripts/with-intake.mjs`); `client-intake.json` is still the skeleton
- [ ] `template:release <x.y.z>` (patch = fix/docs, minor = new feature/variant/flag, major = intake schema break)
- [ ] TEMPLATE-CHANGES.md entry: what, why, what a client must do after pulling (new intake keys, manual steps)
- [ ] commit, tag `v<x.y.z>`, push tags
- [ ] pull into each client that is NOT launched, build, qa. Launched sites are
      locked and stay where they are (§4c-0)

---

## 5. Rules that keep this working

- **Tag every release.** `init` and `import` find bases by tag; untagged
  versions make the next sync guess.
- **Commit `.template-sync.json`** in the client. It is how the next sync knows
  where you were.
- **Never hand-copy shared files between repos** (the zip era). Copying skips the
  base bookkeeping, so the next sync reports the copy as drift or conflict.
- **Never edit shared files in more than one client for the same change.** Make
  it once, port it, release, pull.
- **`npm ci` only in clients.** Dependencies change in the template and arrive via
  `pull` as package.json + package-lock.json.
- **One sync per branch, one concern per commit.** A sync commit contains only
  the sync; client edits go in their own commits.

---

## 6. Troubleshooting

| symptom | cause / fix |
|---|---|
| `No "template" remote` | `git remote add template https://github.com/jordanlelli/universal-template.git` |
| `recorded base … is not in the template history` | the template history was rewritten or the remote is wrong. Re-run `init --base <tag>`. |
| every file shows as "differs" | no base and CRLF checkout without `.gitattributes`. The script ignores CR when comparing; if it still differs, the content really differs. Record a base. |
| `pull` says tree is dirty | commit or stash first. Untracked files are ignored by the check. |
| binary file in "BOTH sides" | not mergeable; the client's copy is kept — decide by hand. |
| `git: not found` (Windows) | install Git for Windows and reopen the terminal. |
