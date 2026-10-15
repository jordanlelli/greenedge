#!/usr/bin/env node
/**
 * template-sync.mjs — keep every client repo and the universal template in step.
 *
 * WHY THIS EXISTS
 * A&J's first repo drifted: one Cursor session asked to add an image touched ~34
 * shared files, including the variant engine, and none of it reached the
 * template. Client repos were never created from the template's git history
 * (they started as zip copies), so plain `git merge` cannot relate them. This
 * script syncs by FILE instead of by history, using the ownership manifest in
 * template.config.json and a recorded base commit for true three-way merges.
 * Full workflow: docs/SYNC.md.
 *
 * CLIENT REPO (has a `template` remote):
 *   node scripts/template-sync.mjs init [--base <ref>]   record which template commit this repo matches
 *   node scripts/template-sync.mjs status                what changed on each side since that base
 *   node scripts/template-sync.mjs pull [--theirs] [--no-branch] [--dry-run]
 *   node scripts/template-sync.mjs lock [--note "…"]     LAUNCHED SITE: refuse every future pull
 *   node scripts/template-sync.mjs unlock                remove that lock
 *
 * TEMPLATE REPO:
 *   node scripts/template-sync.mjs import <clientDir> [--only a,b] [--include-new] [--apply]
 *   node scripts/template-sync.mjs release <x.y.z>       bump package.json + package-lock.json
 *
 * Exit codes: 0 ok · 1 action needed (conflicts, unrecorded base, dirty tree) · 2 usage/git error.
 * No dependencies — Node ≥ 22 and git on PATH.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

/* ---------------------------------------------------------------- utils */
const argv = process.argv.slice(2);
const cmd = argv[0];
const has = (f) => argv.includes(f);
const opt = (f) => {
  const i = argv.indexOf(f);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith("--") && !(i > 0 && ["--base", "--only", "--ref", "--note"].includes(all[i - 1])));

const die = (msg, code = 2) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(code);
};

function git(args, cwd, { input, allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd, input, maxBuffer: 1 << 30 });
  if (r.error) die(`git not found on PATH (${r.error.message}). Install Git for Windows / git.`);
  if (r.status !== 0 && !allowFail) die(`git ${args.join(" ")} failed:\n${r.stderr.toString().trim()}`);
  return r;
}
const gitOut = (args, cwd, o) => git(args, cwd, o).stdout.toString().trim();

/* Read many blobs in one process: `git cat-file --batch`. Returns Map path → Buffer|null. */
function readBlobs(ref, paths, cwd) {
  const out = new Map();
  if (!ref || !paths.length) return out;
  const input = paths.map((p) => `${ref}:${p}`).join("\n") + "\n";
  const buf = git(["cat-file", "--batch"], cwd, { input }).stdout;
  let pos = 0;
  for (const p of paths) {
    const nl = buf.indexOf(10, pos);
    const header = buf.subarray(pos, nl).toString();
    pos = nl + 1;
    if (header.endsWith(" missing") || header.endsWith(" ambiguous")) {
      out.set(p, null);
      continue;
    }
    const [, type, size] = header.split(" ");
    const n = Number(size);
    out.set(p, type === "blob" ? buf.subarray(pos, pos + n) : null);
    pos += n + 1; // content + trailing LF
  }
  return out;
}

const isBinary = (b) => b && b.subarray(0, 8000).includes(0);
/* Compare ignoring CR, so a Windows checkout without .gitattributes still matches. */
const norm = (b) => (b === null || b === undefined ? b : isBinary(b) ? b : Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n")));
const same = (a, b) => {
  if (a === null || b === null) return a === b;
  return norm(a).equals(norm(b));
};

const esc = (s) => s.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
const globRe = (g) => new RegExp("^" + g.split("**").map((s) => s.split("*").map(esc).join("[^/]*")).join(".*") + "$");

function loadConfig(text, where) {
  try {
    const c = JSON.parse(text);
    c._client = (c.client || []).map(globRe);
    c._templateOnly = (c.templateOnly || []).map(globRe);
    return c;
  } catch (e) {
    die(`Could not parse template.config.json (${where}): ${e.message}`);
  }
}
const isClient = (c, p) => c._client.some((re) => re.test(p));
const isTemplateOnly = (c, p) => c._templateOnly.some((re) => re.test(p));
const isShared = (c, p) => !isClient(c, p) && !isTemplateOnly(c, p);

function listRef(ref, cwd) {
  const out = git(["ls-tree", "-r", "-z", "--name-only", ref], cwd).stdout.toString();
  return out.split("\0").filter(Boolean);
}
function listWorktree(cwd) {
  const tracked = git(["ls-files", "-z"], cwd).stdout.toString().split("\0");
  const untracked = git(["ls-files", "-z", "--others", "--exclude-standard"], cwd).stdout.toString().split("\0");
  return [...new Set([...tracked, ...untracked].filter(Boolean))].filter((p) => existsSync(join(cwd, p)));
}
const readWork = (cwd, p) => (existsSync(join(cwd, p)) ? readFileSync(join(cwd, p)) : null);

function writeWork(cwd, p, buf) {
  mkdirSync(dirname(join(cwd, p)), { recursive: true });
  writeFileSync(join(cwd, p), buf);
}

/* Three-way text merge with git merge-file. ours/theirs keep their labels in conflict markers. */
function merge3(ours, base, theirs, labels) {
  base = base ?? Buffer.alloc(0); // added on both sides → whole-file conflict
  if ([ours, base, theirs].some((b) => b === null || isBinary(b))) return { ok: false, text: null };
  const dir = mkdtempSync(join(tmpdir(), "tsync-"));
  const [o, b, t] = ["ours", "base", "theirs"].map((n) => join(dir, n));
  writeFileSync(o, norm(ours));
  writeFileSync(b, norm(base));
  writeFileSync(t, norm(theirs));
  const r = spawnSync("git", ["merge-file", "-p", "-L", labels[0], "-L", "base", "-L", labels[1], o, b, t]);
  rmSync(dir, { recursive: true, force: true });
  if (r.status < 0 || r.status === null) return { ok: false, text: null };
  return { ok: r.status === 0, text: r.stdout };
}

function pkgVersion(buf) {
  try {
    return JSON.parse(buf.toString()).version || "?";
  } catch {
    return "?";
  }
}

/* ---------------------------------------------------------- client side */
const ROOT = process.cwd();
const STATE = ".template-sync.json";

function clientContext({ fetch = true } = {}) {
  if (!existsSync(join(ROOT, ".git"))) die("Run this from the root of a git repo.");
  const localCfgText = existsSync(join(ROOT, "template.config.json")) ? readFileSync(join(ROOT, "template.config.json"), "utf8") : null;
  let cfg = localCfgText ? loadConfig(localCfgText, "local") : null;
  const remote = cfg?.remote || "template";
  const url = cfg?.url;
  const remotes = gitOut(["remote"], ROOT).split(/\s+/);
  if (!remotes.includes(remote)) {
    if (!url) die(`No "${remote}" remote and no url in template.config.json.`);
    git(["remote", "add", remote, url], ROOT);
    console.log(`+ added remote ${remote} → ${url}`);
  }
  if (fetch && !has("--offline")) git(["fetch", remote, "--tags", "--quiet"], ROOT);
  const ref = opt("--ref") || `${remote}/${cfg?.branch || "main"}`;
  const head = gitOut(["rev-parse", ref], ROOT);
  /* The TEMPLATE's manifest wins, so ownership rules added upstream apply on this pull. */
  const upstreamCfg = readBlobs(head, ["template.config.json"], ROOT).get("template.config.json");
  if (upstreamCfg) cfg = loadConfig(upstreamCfg.toString(), ref);
  if (!cfg) die("No template.config.json locally or upstream.");
  const state = existsSync(join(ROOT, STATE)) ? JSON.parse(readFileSync(join(ROOT, STATE), "utf8")) : null;
  let base = state?.commit || null;
  if (base && git(["cat-file", "-e", `${base}^{commit}`], ROOT, { allowFail: true }).status !== 0) {
    console.warn(`! recorded base ${base.slice(0, 9)} is not in the template history — treating as unknown.`);
    base = null;
  }
  return { cfg, remote, ref, head, base, state };
}

function classifyClient({ cfg, head, base }) {
  const tFiles = listRef(head, ROOT);
  const bFiles = base ? listRef(base, ROOT) : [];
  const cFiles = listWorktree(ROOT);
  const all = [...new Set([...tFiles, ...bFiles, ...cFiles])].sort();
  const shared = all.filter((p) => isShared(cfg, p));
  const T = readBlobs(head, shared, ROOT);
  const B = base ? readBlobs(base, shared, ROOT) : new Map();
  const tSet = new Set(tFiles);
  const bSet = new Set(bFiles);
  const rows = [];
  for (const p of shared) {
    const t = tSet.has(p) ? T.get(p) : null;
    const c = readWork(ROOT, p);
    if (same(c, t)) continue;
    if (base) {
      const b = bSet.has(p) ? B.get(p) : null;
      if (same(c, b)) rows.push({ p, kind: t === null ? "delete" : "update", t, b, c });
      else if (same(t, b)) rows.push({ p, kind: c === null ? "local-deleted" : b === null ? "local-new" : "local", t, b, c });
      else rows.push({ p, kind: "conflict", t, b, c });
    } else {
      if (t === null) rows.push({ p, kind: "local-new", t, c });
      else if (c === null) rows.push({ p, kind: "update", t, c });
      else rows.push({ p, kind: "differs", t, c });
    }
  }
  /* Client-owned files the template changed since the base (e.g. a type added in src/data/*.ts). */
  const notices = [];
  if (base) {
    const owned = [...new Set([...tFiles, ...bFiles])].filter((p) => isClient(cfg, p) && p !== STATE);
    const T2 = readBlobs(head, owned, ROOT);
    const B2 = readBlobs(base, owned, ROOT);
    for (const p of owned) if (!same(T2.get(p) ?? null, B2.get(p) ?? null)) notices.push(p);
  }
  return { rows, notices };
}

const LABEL = {
  update: "template updated — will take",
  delete: "template deleted — will delete",
  conflict: "changed on BOTH sides — 3-way merge",
  local: "changed only here — port back or revert",
  "local-new": "new here, not in template — port back or move to a client-owned path",
  "local-deleted": "missing here — will restore (shared files must exist in every client)",
  differs: "differs (no base recorded — direction unknown)",
};

function printRows(rows) {
  const groups = {};
  for (const r of rows) (groups[r.kind] ||= []).push(r.p);
  for (const k of Object.keys(LABEL)) {
    if (!groups[k]) continue;
    console.log(`\n  ${LABEL[k]} (${groups[k].length})`);
    for (const p of groups[k]) console.log(`    ${p}`);
  }
}

function cmdStatus() {
  const ctx = clientContext();
  const localV = pkgVersion(readWork(ROOT, "package.json") || Buffer.from("{}"));
  const tV = pkgVersion(readBlobs(ctx.head, ["package.json"], ROOT).get("package.json") || Buffer.from("{}"));
  console.log(`\nTemplate sync status`);
  console.log(`  this repo : v${localV}   base ${ctx.base ? ctx.base.slice(0, 9) : "NOT RECORDED"}`);
  console.log(`  template  : v${tV}   ${ctx.ref} ${ctx.head.slice(0, 9)}`);
  if (ctx.state?.locked === true) {
    console.log(`\n  LOCKED${ctx.state.lockedAt ? ` since ${ctx.state.lockedAt}` : ""}: this site is launched and stays on v${localV}. "pull" will refuse.`);
    console.log(`  Everything below is information only; nothing here should be applied to a launched site.`);
  }
  const { rows, notices } = classifyClient(ctx);
  if (!rows.length) console.log(`\n  ✓ shared files identical to the template.`);
  printRows(rows);
  if (notices.length) {
    console.log(`\n  template changed client-owned files since your base — review by hand (never auto-applied):`);
    for (const p of notices) console.log(`    ${p}    git diff ${ctx.base.slice(0, 9)} ${ctx.head.slice(0, 9)} -- ${p}`);
  }
  const markers = rows.filter((r) => r.c && !isBinary(r.c) && /^<{7} /m.test(r.c.toString())).map((r) => r.p);
  if (markers.length) console.log(`\n  ✗ unresolved conflict markers in: ${markers.join(", ")}`);
  if (!ctx.base) console.log(`\n  ! No base recorded. Run: node scripts/template-sync.mjs init   (see docs/SYNC.md §First sync)`);
  const drift = rows.filter((r) => ["local", "local-new", "conflict", "differs"].includes(r.kind));
  if (drift.length) console.log(`\n  → ${drift.length} local change(s) to shared code. Port them back (/port-to-template) or revert them — a client repo must not drift.`);
  console.log("");
  process.exit(!ctx.base || markers.length ? 1 : 0);
}

function cmdInit() {
  const ctx = clientContext();
  let base = opt("--base");
  if (base) base = gitOut(["rev-parse", `${base}^{commit}`], ROOT);
  else {
    /* Find the template commit whose package.json version equals ours. */
    const v = pkgVersion(readWork(ROOT, "package.json") || Buffer.from("{}"));
    const tag = git(["rev-parse", "--verify", "--quiet", `refs/tags/v${v}^{commit}`], ROOT, { allowFail: true });
    if (tag.status === 0) base = tag.stdout.toString().trim();
    else {
      const commits = gitOut(["log", "--format=%H", ctx.head, "--", "package.json"], ROOT).split("\n").filter(Boolean);
      for (const c of commits) {
        const pj = readBlobs(c, ["package.json"], ROOT).get("package.json");
        if (pj && pkgVersion(pj) === v) {
          base = c;
          break;
        }
      }
    }
    if (!base) die(`No template commit found with version ${v}. Pass --base <commit|tag> explicitly (docs/SYNC.md §First sync).`);
  }
  const state = { template: ctx.cfg.url, ref: ctx.ref, commit: base, version: pkgVersion(readBlobs(base, ["package.json"], ROOT).get("package.json") || Buffer.from("{}")), syncedAt: new Date().toISOString().slice(0, 10) };
  /* Re-recording the base must not unlock a launched site. */
  for (const k of ["locked", "lockedAt", "lockNote"]) if (ctx.state?.[k] !== undefined) state[k] = ctx.state[k];
  writeFileSync(join(ROOT, STATE), JSON.stringify(state, null, 2) + "\n");
  console.log(`\n✓ Recorded base ${base.slice(0, 9)} (template v${state.version}) in ${STATE}. Commit it.`);
  const { rows } = classifyClient({ ...ctx, base });
  const local = rows.filter((r) => ["local", "local-new", "conflict"].includes(r.kind));
  if (local.length) {
    console.log(`\n  ${local.length} shared file(s) differ from that base — local drift to port back or revert:`);
    for (const r of local) console.log(`    ${r.p}`);
  } else console.log(`  Shared code matches the base exactly.`);
  console.log("");
}

function cmdPull() {
  const dry = has("--dry-run");
  const ctx = clientContext();
  /* LAUNCH LOCK (v3.29). A site that is live for a paying client is frozen on
     the template version it launched with: a template release is allowed to
     change how sites look (v3.28 changed fonts, motion and four sections), and
     that must never arrive on a live site as a side effect of "sync the
     template". The lock is a field in the client-owned state file, so it
     travels with the repo and no template release can clear it. There is no
     flag that pulls through it: unlocking is its own command, on purpose. */
  if (ctx.state?.locked === true && !dry) {
    die(
      `This site is LOCKED${ctx.state.lockedAt ? ` (since ${ctx.state.lockedAt})` : ""}: it is launched and does not take template updates.\n` +
        (ctx.state.lockNote ? `  Note: ${ctx.state.lockNote}\n` : "") +
        `  Nothing was changed. "pull --dry-run" still shows what a pull would do.\n` +
        `  Only if Jordan has asked for this site to be updated: "template-sync.mjs unlock", pull, verify, then "lock" again.`,
      1
    );
  }
  const dirty = gitOut(["status", "--porcelain", "--untracked-files=no"], ROOT);
  if (dirty && !dry) die("Working tree has uncommitted changes. Commit or stash them first — a sync must be reviewable on its own.", 1);
  const { rows, notices } = classifyClient(ctx);
  const undecided = rows.filter((r) => r.kind === "differs");
  if (undecided.length && !has("--theirs")) {
    printRows(undecided);
    die(`${undecided.length} file(s) differ and no base is recorded, so the direction is unknown.\n  Either run \`init\` first (preferred), or port anything you need back, then re-run with --theirs to take the template's versions.`, 1);
  }
  const tV = pkgVersion(readBlobs(ctx.head, ["package.json"], ROOT).get("package.json") || Buffer.from("{}"));
  if (!rows.some((r) => ["update", "delete", "conflict", "differs", "local-deleted"].includes(r.kind))) {
    console.log(`\n✓ Already up to date with template v${tV}.`);
    printRows(rows);
    if (!dry && ctx.base !== ctx.head) writeState(ctx, tV);
    return;
  }
  if (dry) {
    console.log(`\nDry run — pull of template v${tV} would do:`);
    printRows(rows);
    return;
  }
  if (!has("--no-branch")) {
    let name = `template-sync/v${tV}`;
    for (let i = 2; git(["rev-parse", "--verify", "--quiet", name], ROOT, { allowFail: true }).status === 0; i++) name = `template-sync/v${tV}-${i}`;
    git(["switch", "-c", name], ROOT);
    console.log(`+ branch ${name}`);
  }
  const conflicts = [];
  let lockChanged = false;
  for (const r of rows) {
    if (r.kind === "update" || r.kind === "local-deleted" || (r.kind === "differs" && has("--theirs"))) writeWork(ROOT, r.p, r.t);
    else if (r.kind === "delete") unlinkSync(join(ROOT, r.p));
    else if (r.kind === "conflict") {
      if (r.t === null || r.c === null) {
        conflicts.push(`${r.p} (deleted on one side, changed on the other — decide by hand)`);
        continue;
      }
      const m = merge3(r.c, r.b, r.t, ["client", "template"]);
      if (m.text === null) conflicts.push(`${r.p} (binary — kept this repo's copy)`);
      else {
        writeWork(ROOT, r.p, m.text);
        if (!m.ok) conflicts.push(r.p);
      }
    } else continue;
    if (r.p === "package-lock.json" || r.p === "package.json") lockChanged = true;
  }
  writeState(ctx, tV);
  printRows(rows);
  if (notices.length) {
    console.log(`\n  template changed client-owned files — apply by hand if relevant:`);
    for (const p of notices) console.log(`    ${p}    git diff ${ctx.base.slice(0, 9)} ${ctx.head.slice(0, 9)} -- ${p}`);
  }
  console.log(`\nNext:`);
  if (conflicts.length) console.log(`  ✗ resolve conflict markers in:\n      ${conflicts.join("\n      ")}`);
  if (lockChanged) console.log(`  npm ci                       # dependencies changed`);
  console.log(`  npm run build && npm run qa`);
  console.log(`  git add -A && git commit -m "Template sync v${tV}"\n`);
  process.exit(conflicts.length ? 1 : 0);
}

function writeState(ctx, version) {
  const state = { template: ctx.cfg.url, ref: ctx.ref, commit: ctx.head, version, syncedAt: new Date().toISOString().slice(0, 10) };
  /* A lock outlives every rewrite of this file. */
  for (const k of ["locked", "lockedAt", "lockNote"]) if (ctx.state?.[k] !== undefined) state[k] = ctx.state[k];
  writeFileSync(join(ROOT, STATE), JSON.stringify(state, null, 2) + "\n");
}

/* LOCK / UNLOCK. Work offline and need no base: the whole point is that a
   launched site can be locked even if it was never connected to the template. */
function readStateFile() {
  if (!existsSync(join(ROOT, ".git"))) die("Run this from the root of a git repo.");
  if (existsSync(join(ROOT, "BACKLOG.md")) && !existsSync(join(ROOT, STATE))) die("This looks like the TEMPLATE repo. Lock a client site, not the template.");
  return existsSync(join(ROOT, STATE)) ? JSON.parse(readFileSync(join(ROOT, STATE), "utf8")) : {};
}
function cmdLock() {
  const state = readStateFile();
  const note = opt("--note");
  state.locked = true;
  state.lockedAt = state.lockedAt || new Date().toISOString().slice(0, 10);
  if (note) state.lockNote = note;
  writeFileSync(join(ROOT, STATE), JSON.stringify(state, null, 2) + "\n");
  console.log(`\n✓ Locked. This site stays on its current template version; "pull" will refuse.`);
  console.log(`  Commit ${STATE} so the lock travels with the repo.\n`);
}
function cmdUnlock() {
  const state = readStateFile();
  if (state.locked !== true) return console.log(`\n  Not locked. Nothing changed.\n`);
  for (const k of ["locked", "lockedAt", "lockNote"]) delete state[k];
  writeFileSync(join(ROOT, STATE), JSON.stringify(state, null, 2) + "\n");
  console.log(`\n✓ Unlocked. "pull" works again. Lock it again once the site is verified and redeployed.\n`);
}

/* -------------------------------------------------------- template side */
function cmdImport() {
  const clientDir = positional[0] ? resolve(positional[0]) : null;
  if (!clientDir || !existsSync(join(clientDir, ".git"))) die("Usage: template-sync.mjs import <path-to-client-repo> [--only a,b] [--include-new] [--apply]");
  if (!existsSync(join(ROOT, "template.config.json"))) die("Run import from the TEMPLATE repo root.");
  const cfg = loadConfig(readFileSync(join(ROOT, "template.config.json"), "utf8"), "template");
  const apply = has("--apply");
  const only = opt("--only") ? new Set(opt("--only").split(",").map((s) => s.trim())) : null;
  if (apply && gitOut(["status", "--porcelain", "--untracked-files=no"], ROOT)) die("Template working tree is dirty. Commit or stash first.", 1);

  /* Base = the template commit the client last synced to. */
  let base = null;
  const statePath = join(clientDir, STATE);
  if (existsSync(statePath)) base = JSON.parse(readFileSync(statePath, "utf8")).commit;
  if (!base) {
    const v = pkgVersion(readWork(clientDir, "package.json") || Buffer.from("{}"));
    const tag = git(["rev-parse", "--verify", "--quiet", `refs/tags/v${v}^{commit}`], ROOT, { allowFail: true });
    if (tag.status === 0) base = tag.stdout.toString().trim();
  }
  if (base && git(["cat-file", "-e", `${base}^{commit}`], ROOT, { allowFail: true }).status !== 0) base = null;

  const tFiles = listWorktree(ROOT);
  const cFiles = listWorktree(clientDir);
  const bFiles = base ? listRef(base, ROOT) : [];
  const all = [...new Set([...tFiles, ...cFiles, ...bFiles])].filter((p) => isShared(cfg, p)).sort();
  const B = base ? readBlobs(base, all, ROOT) : new Map();
  const bSet = new Set(bFiles);
  const rows = [];
  for (const p of all) {
    const t = readWork(ROOT, p);
    const c = readWork(clientDir, p);
    if (same(c, t)) continue;
    if (base) {
      const b = bSet.has(p) ? B.get(p) : null;
      if (same(c, b)) continue; // client untouched; template simply newer
      if (same(t, b)) rows.push({ p, kind: c === null ? "client-deleted" : b === null ? "new" : "port", t, b, c });
      else rows.push({ p, kind: "conflict", t, b, c });
    } else rows.push({ p, kind: t === null ? "new" : c === null ? "client-deleted" : "differs", t, c });
  }
  const L = {
    port: "changed in client only — safe to import",
    conflict: "changed in both — 3-way merge (template = ours)",
    new: "new in client — import only if it is genuinely shared (--include-new or --only)",
    "client-deleted": "deleted in client — never auto-applied; delete by hand if intended",
    differs: "differs, no base known — import only with --only (takes the client's copy verbatim)",
  };
  console.log(`\nImport from ${clientDir}`);
  console.log(`  base: ${base ? base.slice(0, 9) : "UNKNOWN (client has no .template-sync.json and no matching tag)"}`);
  if (!rows.length) {
    console.log("  ✓ nothing to import — client shared code matches the template.\n");
    return;
  }
  for (const k of Object.keys(L)) {
    const g = rows.filter((r) => r.kind === k);
    if (!g.length) continue;
    console.log(`\n  ${L[k]} (${g.length})`);
    for (const r of g) console.log(`    ${r.p}${only && !only.has(r.p) ? "   (skipped: not in --only)" : ""}`);
  }
  console.log(`\n  Review any file:  git diff --no-index -- ${ROOT.replace(/\\/g, "/")}/<path> ${clientDir.replace(/\\/g, "/")}/<path>`);
  if (!apply) {
    console.log(`  Dry run. Re-run with --apply (optionally --only path1,path2) to write.\n`);
    return;
  }
  const picked = rows.filter((r) => {
    if (only) return only.has(r.p) && r.kind !== "client-deleted";
    if (r.kind === "new") return has("--include-new");
    return r.kind === "port" || r.kind === "conflict";
  });
  const conflicts = [];
  for (const r of picked) {
    if (r.kind === "conflict") {
      const m = merge3(r.t, r.b, r.c, ["template", "client"]);
      if (m.text === null) {
        conflicts.push(`${r.p} (binary, or deleted on one side — copy by hand)`);
        continue;
      }
      writeWork(ROOT, r.p, m.text);
      if (!m.ok) conflicts.push(r.p);
    } else writeWork(ROOT, r.p, norm(r.c));
  }
  console.log(`\n✓ wrote ${picked.length} file(s).`);
  if (conflicts.length) console.log(`  ✗ resolve conflict markers in: ${conflicts.join(", ")}`);
  console.log(`\nNext (template repo): review \`git diff\`, then bump:  node scripts/template-sync.mjs release <x.y.z>`);
  console.log(`  add a TEMPLATE-CHANGES.md entry · npm run build && npm run qa · commit · tag · push\n`);
  process.exit(conflicts.length ? 1 : 0);
}

function cmdRelease() {
  const v = positional[0];
  if (!/^\d+\.\d+\.\d+$/.test(v || "")) die("Usage: template-sync.mjs release <x.y.z>");
  const pjPath = join(ROOT, "package.json");
  const lockPath = join(ROOT, "package-lock.json");
  const pj = JSON.parse(readFileSync(pjPath, "utf8"));
  const old = pj.version;
  pj.version = v;
  writeFileSync(pjPath, JSON.stringify(pj, null, 2) + "\n");
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.version = v;
    if (lock.packages?.[""]) lock.packages[""].version = v;
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  }
  const changes = existsSync(join(ROOT, "TEMPLATE-CHANGES.md")) ? readFileSync(join(ROOT, "TEMPLATE-CHANGES.md"), "utf8") : "";
  console.log(`\n✓ ${old} → ${v} in package.json and package-lock.json.`);
  if (!changes.includes(`v${v}`)) console.log(`  ! TEMPLATE-CHANGES.md has no "v${v}" entry yet — add one (newest first) before committing.`);
  console.log(`\n  npm run build && npm run qa`);
  console.log(`  git add -A && git commit -m "v${v}: <summary>" && git tag v${v} && git push --follow-tags\n`);
}

/* ----------------------------------------------------------------- main */
const COMMANDS = { status: cmdStatus, init: cmdInit, pull: cmdPull, lock: cmdLock, unlock: cmdUnlock, import: cmdImport, release: cmdRelease };
if (!COMMANDS[cmd]) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("*/")[0].replace(/^#!.*\n\/\*\*\n?/, "").replace(/^ \* ?/gm, ""));
  process.exit(cmd ? 2 : 0);
}
COMMANDS[cmd]();
