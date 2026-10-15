---
name: port-to-template
description: Port shared-code changes made in this client repo back into the universal template, generalise them, release a new template version, and pull it back. Use whenever a client repo has edits in src/components, src/lib, src/layouts, src/pages, src/styles, scripts, docs or config that belong in the template.
argument-hint: "[files or a description of the change] [--template ../universal-template]"
disable-model-invocation: true
---

# Port a client change back to the template

Rule: a change to shared code in a client repo is a template change. It goes
back to the template, or it gets reverted. Model: `docs/SYNC.md` §4d.

Template location: `--template <path>` in $ARGUMENTS, else `../universal-template`.
If this session cannot read it, tell Jordan to start Claude Code with
`claude --add-dir ../universal-template` (or add the absolute path to
`permissions.additionalDirectories` in `.claude/settings.local.json`) and stop.

## 1. Identify (client repo)
- `npm run template:status` (or the template's script if this repo predates it).
- Candidates = "changed only here", "new here", and 3-way items. Narrow to
  $ARGUMENTS if given.
- For each candidate, show the diff against the template:
  `git diff --no-index -- <template>/<path> <path>`.
- Classify each: **generic** (every client benefits) / **needs generalising**
  (client-specific values baked in) / **client-only** (should not be shared →
  propose moving it to the intake or reverting it). Stop for Jordan's decision
  on anything not clearly generic.

## 2. Import (template repo)
- Template tree must be clean and on `main` up to date (`git pull`).
- `git switch -c port/<client>-<short-name>`.
- `npm run template:import -- <client path>` (dry run), then
  `--only <agreed files> --apply`. `--include-new` only for agreed new files.
- Generalise: client names, colours, copy, photo paths → intake fields with a
  neutral default that leaves every other client's output unchanged. Update
  the skeleton, INTAKE-SPEC.txt, check-intake coverage, VARIANTS/docs as needed.
- Show the full `git diff` for review before continuing.

## 3. Verify and release (template repo)
- Temporarily copy the client's `client-intake.json` (and any assets the change
  needs) in, `npm run build`, `npm run qa`; then restore the skeleton intake and
  delete the copied assets. Never commit a client's intake to the template.
- Version: patch = fix/docs, minor = new capability/flag/variant, major =
  intake schema break. `npm run template:release -- <x.y.z>`.
- TEMPLATE-CHANGES.md entry at the top: what, why (which client exposed it),
  what a client must do after pulling.
- Commit (`v<x.y.z>: <summary>`), `git tag v<x.y.z>`. Ask before pushing; then
  `git push -u origin <branch> --follow-tags` and open a PR (`gh pr create`) if
  the GitHub CLI is available, else give Jordan the compare URL.

## 4. Close the loop (client repo)
- After the PR is merged: run the `sync-template` skill here. The ported files
  now match the template and drop out of the drift list.
- Tell Jordan which other client repos should pull this release.
