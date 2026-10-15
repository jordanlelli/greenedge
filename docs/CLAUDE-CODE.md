# Claude Code setup — Jordan's machine, repos and sessions

How the pieces fit so that any Claude Code session, in any repo, starts with
the same knowledge. Shared with every client repo via template sync, so it
contains nothing private: agency context lives in the user-level file (§3).

## 1. One-time install (Windows, PowerShell)

```powershell
winget install Git.Git                 # Git for Windows (Claude Code uses Git Bash for its shell; without it, PowerShell)
winget install OpenJS.NodeJS.LTS       # Node ≥ 22.18 (impeccable's floor; the site itself needs 22.12)
winget install GitHub.cli              # optional: lets Claude open PRs and create repos (`gh auth login` once)
irm https://claude.ai/install.ps1 | iex   # Claude Code
node -v; git --version; claude --version
```

GitHub access for **cloud** sessions (claude.ai/code, scheduled tasks): GitHub →
Settings → Applications → Claude → Configure → Repository access → **All
repositories**. Local `claude` in a terminal uses your own git credentials and
needs nothing extra.

## 2. Folder layout

All repos are siblings, so every client can reach the template at
`../universal-template`:

```
C:\Users\lelli\Desktop\Cursor\
  universal-template\     ← github.com/jordanlelli/universal-template (the template)
  AandJ-v2\               ← client repo, remotes: origin (its own), template
  GreenEdge\              ← client repo …
  Kova\                   ← agency site (not a template client)
```

Retire old template folders (`universal-template-v3.17` etc.) once the git
clone exists — two copies of the template on disk is how edits land in the
wrong one.

```powershell
cd C:\Users\lelli\Desktop\Cursor
git clone https://github.com/jordanlelli/universal-template.git
```

Connect each existing client: docs/SYNC.md §4a.

## 3. What Claude Code loads, and from where

| file | scope | in git? | holds |
|---|---|---|---|
| `~/.claude/CLAUDE.md` (`C:\Users\lelli\.claude\CLAUDE.md`) | every session on this PC | no | Jordan's working preferences + Kova agency context (business rules, client registry, stack). **Private — never commit it into a site repo** (client repos may be handed over). |
| `CLAUDE.md` (repo root) | this repo | yes, shared | how to work in the template/client; imports the next two |
| `CURSOR-CONTEXT.txt` | this repo | yes, shared | the binding build rules (also read by Cursor) |
| `CLIENT.md` | this repo | yes, client-owned | who the client is, scope, decisions, open items |
| `CLAUDE.local.md` | this repo, this PC | no (gitignored) | scratch notes for you only |
| auto memory (machine-local, under `~/.claude`) | this repo, this PC | no | what Claude learns across sessions; not shared with claude.ai |
| `.claude/settings.json` | this repo | yes, shared | permissions: routine build/git commands allowed; push, merge, `npm install` ask; force-push and `npm audit fix` denied |
| `.claude/settings.local.json` | this repo, this PC | no | your overrides, e.g. `"permissions": {"additionalDirectories": ["C:\\Users\\lelli\\Desktop\\Cursor\\universal-template"]}` |
| `.claude/skills/*` | this repo | yes, shared | `/verify`, `/sync-template`, `/port-to-template`, `/new-client`, `/backlog-run` |
| `.claude/skills/impeccable/` | this repo, this PC | no | installed by `npx impeccable skills install` (pick Claude) in each repo |

claude.ai Projects (this "WebDev" project, its memory and docs) are **not**
visible to Claude Code. Anything Claude Code must know has to be in one of the
files above. When a decision is made in a claude.ai chat, put it in the right
file (rule → CURSOR-CONTEXT/CLAUDE.md via a template release; client fact →
CLIENT.md; business context → `~/.claude/CLAUDE.md`).

## 4. Everyday use

```powershell
cd C:\Users\lelli\Desktop\Cursor\AandJ-v2
claude                                   # or: claude --add-dir ..\universal-template  (when porting back)
```

- Start of a client session that touches code: "run template:status".
- Content/intake edits: just ask; `/verify` before committing.
- Shared-code change needed for a client: Claude should say "template change"
  first. Do it in the template (or port it with `/port-to-template`), release,
  then `/sync-template` in each client that wants it.
- Template work: open `universal-template`, work on a branch, release with a tag.

## 5. Weekly backlog run (Tuesdays)

Usage resets Tuesday ~18:00 KL time, so the run must START by ~13:00–14:00
KL to burn the old week's allowance (an evening start spends the new week's).

The template's `BACKLOG.md` is worked by `/backlog-run` — one branch per item,
verified, never pushing to `main`, never touching client repos. Add items with
a "Done when" line (the acceptance test) and a size (S/M/L). Anything needing
your judgement goes under "Needs a decision", which runs never start.

**Local run (your PC):**
1. Give the run permission to work without prompts for routine actions. Put
   this in `universal-template\.claude\settings.local.json` (gitignored,
   yours only; the shared settings still make push/merge/tag ask and block
   force-push):
   ```json
   {
     "permissions": {
       "allow": [
         "Edit", "Write", "WebFetch", "WebSearch",
         "Bash(node *)", "Bash(npx *)", "Bash(npm ci)", "Bash(npm run *)",
         "Bash(git switch *)", "Bash(git checkout *)", "Bash(git add *)",
         "Bash(git commit *)", "Bash(git stash *)", "Bash(git restore *)",
         "Bash(cp *)", "Bash(mv *)", "Bash(mkdir *)", "Bash(rm -rf dist*)",
         "Bash(rm -rf .astro*)", "Bash(ls *)", "Bash(diff *)"
       ]
     }
   }
   ```
2. Start it and leave it:
   ```powershell
   cd C:\Users\lelli\Desktop\Cursor\universal-template
   claude --permission-mode acceptEdits "/backlog-run 3"
   ```
   Anything outside the allow list still stops and asks, so glance at the
   window once early on; add the command to the list next time if it was
   routine.
3. When you're back: read the final message, review each `backlog/<slug>`
   branch (`git log main..backlog/<slug>`, `git diff main...backlog/<slug>`),
   push the ones you want (`git push -u origin backlog/<slug>`), open PRs, merge,
   then release (`npm run template:release -- <x.y.z>`, move `## Unreleased`
   under that version, tag, push) and `/sync-template` in clients.

**Cloud run (scheduled task from claude.ai):** same skill with `--push`, in a
cloud session on the template repo. Needs the GitHub app access in §1. Branches
arrive as PRs.

## 6. Cursor

Everything here works in Cursor too: `CURSOR-CONTEXT.txt` is still the single
rule source, the npm scripts are editor-agnostic, and `.cursor/skills/impeccable/`
is gitignored the same way. Claude Code adds the skills, permissions and
`CLAUDE.md` layering; nothing requires Cursor.
