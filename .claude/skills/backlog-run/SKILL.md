---
name: backlog-run
description: Work through BACKLOG.md in the universal template repo unattended, one branch per item, verified, stopping at a limit. Use for the weekly Tuesday usage burn or when asked to work the backlog.
argument-hint: "[max items, default 3] [--push]"
disable-model-invocation: true
---

# Backlog run (template repo only)

Arguments: $ARGUMENTS — first number = max items (default 3). `--push` =
push each finished branch and open a PR (use in cloud runs, or when Jordan
asked). Without it, branches stay local for Jordan to review and push.

Jordan is not watching. Never stop to ask a question: take the most reasonable
reading, write the assumption into the commit message and the run log, and
carry on. The only reasons to stop an item are the BLOCKED rule and the rules
in BACKLOG.md.

## Preflight (once)
1. Confirm this is the template repo (`CLIENT.md` says "no client"). If not, stop.
2. `git status` must be clean; `git switch main`; `git pull` if a remote is
   reachable (skip silently if offline).
3. `node -v` ≥ 22.18, else stop and log why. `npm ci`.
4. Read BACKLOG.md rules, CLAUDE.md, docs/ARCHITECTURE.md, docs/LESSONS.md.
5. Pick up to N unticked items from **Ready**, top to bottom. Skip items whose
   stated dependency is not yet ticked on `main` (an item finished earlier in
   THIS run counts — branch the dependent item off that branch and say so in
   its commit/PR). Never start anything under "Needs a decision".

## Per item
1. `git switch -c backlog/<slug>` from `main` (or from the dependency branch).
2. The item's "Done when" is the acceptance test. Read every file it names
   before editing. Prefer the smallest change that meets it.
3. Implement in small commits with clear messages.
4. Verify:
   - the item's own acceptance commands;
   - build + qa on the fixture named in BACKLOG.md rules (demo intake once it
     exists; before that, a copied-in intake that is restored before commit);
   - for tooling-only items, prove built HTML is unchanged (build before and
     after, compare `dist/`).
   Fix the source, never a gate. Never weaken a check to make it pass.
5. Two failed verification attempts → mark the item `BLOCKED: <reason>` in
   BACKLOG.md on the branch, commit, move on.
6. Passing → tick `[x]` on the branch, add notes under `## Unreleased` at the
   top of TEMPLATE-CHANGES.md (what, why, what a client must do after
   pulling), commit.
7. With `--push`: `git push -u origin backlog/<slug>`, then `gh pr create`
   (title = item name; body = what changed, how verified, anything Jordan must
   decide). Without `--push`: leave it local.
8. `git switch main` before the next item.

## Budget
Stop before starting an item you cannot finish: a half-done branch is worth
less than a finished smaller one. Rough sizes are in BACKLOG.md (S/M/L).

## Finish
Append to BACKLOG.md "Run log" on the LAST branch (or a `backlog/run-log-<date>`
branch): date, items attempted, result per item, branch names, assumptions made.
Final message: one line per item (done / blocked + why), the branches, and —
if not pushed — the exact commands for Jordan:
`git push -u origin backlog/<slug>` per branch (then open PRs on GitHub).
