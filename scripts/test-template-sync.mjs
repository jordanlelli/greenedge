#!/usr/bin/env node
/**
 * test-template-sync.mjs — tests for scripts/template-sync.mjs.
 *
 *   npm run test:sync                 run every case
 *   npm run test:sync -- --mutants    also prove the cases can fail (below)
 *
 * WHY THIS EXISTS. template-sync decides, per file, whether a client keeps its
 * copy, takes the template's, gets a merge or loses the file. A wrong branch
 * there overwrites client work or silently skips an update, and the first
 * place it would show is a real client repo. These cases pin every row of the
 * table in docs/SYNC.md §1, plus init, lock, import and release.
 *
 * HOW. Nothing here touches this repo or the network. It builds a throwaway
 * "template" repo (v1.0.0, then v1.1.0), a bare remote of it, and a client
 * repo with NO shared git history (the way real clients started: a copy of the
 * files), all under the OS temp dir, and runs the real script against them.
 * Git's system and global config are ignored so a developer's settings
 * (autocrlf, signing, hooks) cannot change the result.
 *
 * --mutants breaks the script on purpose, one branch at a time (in a temp
 * copy), and checks that at least one case fails each time. A mutant that
 * survives means a branch nothing tests. A mutant that no longer applies means
 * the script changed: update the MUTANTS list beside the code it names.
 *
 * Zero dependencies: Node >= 22 and git on PATH. Exit 0 = all pass.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = process.env.SYNC_SCRIPT ? resolve(process.env.SYNC_SCRIPT) : join(HERE, "template-sync.mjs");
const TMP = mkdtempSync(join(tmpdir(), "sync-test-"));
const fwd = (p) => p.replace(/\\/g, "/");

/* ------------------------------------------------------------- plumbing */
writeFileSync(
  join(TMP, "gitconfig"),
  "[user]\n\tname = Sync Test\n\temail = sync-test@example.com\n[core]\n\tautocrlf = false\n\tsafecrlf = false\n[init]\n\tdefaultBranch = main\n[commit]\n\tgpgsign = false\n[tag]\n\tgpgsign = false\n[advice]\n\tdetachedHead = false\n"
);
const ENV = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(TMP, "gitconfig"), GIT_TERMINAL_PROMPT: "0" };
delete ENV.SYNC_SCRIPT;

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, env: ENV, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} (in ${cwd}) failed:\n${r.stderr}`);
  return r.stdout.trim();
}
/** Run template-sync.mjs. Returns { code, out } (stdout + stderr). */
function sync(cwd, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: ENV, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}
const read = (dir, p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : null);
function write(dir, files) {
  for (const [p, text] of Object.entries(files)) {
    if (text === null) {
      rmSync(join(dir, p), { force: true });
      continue;
    }
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
}
const commit = (dir, msg) => {
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", msg);
  return git(dir, "rev-parse", "HEAD");
};

/* Which group each path was printed under, keyed by a distinctive part of the
   label so a reworded label does not silently pass. */
const GROUPS = {
  update: "will take",
  delete: "will delete",
  conflict: "changed on BOTH sides",
  local: "changed only here",
  "local-new": "new here, not in template",
  "local-deleted": "will restore",
  differs: "direction unknown",
  notice: "template changed client-owned files",
  port: "safe to import",
  "import-conflict": "changed in both",
  new: "new in client",
  "client-deleted": "deleted in client",
  "import-differs": "differs, no base known",
};
function grouped(out) {
  const map = {};
  let current = null;
  for (const line of out.split(/\r?\n/)) {
    if (/^ {4}\S/.test(line) && current) {
      map[line.trim().split(/\s+/)[0]] = current;
      continue;
    }
    const hit = Object.entries(GROUPS).find(([, text]) => line.includes(text));
    current = hit ? hit[0] : /^\s*$/.test(line) ? current : null;
  }
  return map;
}

/* ------------------------------------------------------------- fixtures */
const lines = (n, edit = {}) => Array.from({ length: n }, (_, i) => edit[i + 1] || `line ${i + 1}`).join("\n") + "\n";
const pkg = (v) => JSON.stringify({ name: "fixture", version: v }, null, 2) + "\n";
const lock = (v) =>
  JSON.stringify({ name: "fixture", version: v, lockfileVersion: 3, packages: { "": { name: "fixture", version: v }, "node_modules/x": { version: "9.9.9" } } }, null, 2) + "\n";

const V1 = (remote) => ({
  "template.config.json":
    JSON.stringify(
      { remote: "template", url: remote, branch: "main", client: ["client-intake.json", ".template-sync.json", "src/data/**"], templateOnly: ["BACKLOG.md"] },
      null,
      2
    ) + "\n",
  "package.json": pkg("1.0.0"),
  "package-lock.json": lock("1.0.0"),
  "client-intake.json": '{ "business": "skeleton" }\n',
  "src/data/owned.ts": "export const data = 1;\n",
  "BACKLOG.md": "# backlog v1\n",
  "lib/take.txt": "take v1\n",
  "lib/drift.txt": "drift v1\n",
  "lib/merge.txt": lines(9),
  "lib/overlap.txt": "alpha\nbeta\ngamma\n",
  "lib/deleted.txt": "to be deleted\n",
  "lib/edited-then-deleted.txt": "v1\n",
  "lib/restore.txt": "restore me\n",
  "lib/crlf.txt": "one\ntwo\n",
  "lib/untouched.txt": "untouched\n",
});
const V11 = {
  "package.json": pkg("1.1.0"),
  "package-lock.json": lock("1.1.0"),
  "src/data/owned.ts": "export const data = 1;\nexport type Added = string;\n",
  "BACKLOG.md": "# backlog v1.1\n",
  "lib/take.txt": "take v1.1\n",
  "lib/merge.txt": lines(9, { 1: "line 1 (template)" }),
  "lib/overlap.txt": "alpha\nbeta (template)\ngamma\n",
  "lib/deleted.txt": null,
  "lib/edited-then-deleted.txt": null,
  "lib/added.txt": "added in v1.1\n",
};
/* What a client changed since it was copied from v1.0.0. */
const CLIENT_EDITS = {
  "client-intake.json": '{ "business": "A real client" }\n',
  "src/data/owned.ts": "export const data = 42;\n",
  "lib/drift.txt": "drift (client)\n",
  "lib/merge.txt": lines(9, { 9: "line 9 (client)" }),
  "lib/overlap.txt": "alpha\nbeta (client)\ngamma\n",
  "lib/edited-then-deleted.txt": "v1 (client)\n",
  "lib/restore.txt": null,
  "lib/crlf.txt": "one\r\ntwo\r\n",
  "lib/local-new.txt": "new in client\n",
};

/* A world = template work repo (at v1.1.0), its bare remote, and a client
   copied from the v1.0.0 files. Built once per option set, then copied per
   case; the remote is shared and never written to. */
const seeds = new Map();
function seed({ tags }) {
  const key = `tags-${tags}`;
  if (seeds.has(key)) return seeds.get(key);
  const dir = join(TMP, `seed-${key}`);
  const tpl = join(dir, "tpl");
  const client = join(dir, "client");
  const remote = fwd(join(dir, "remote.git"));
  mkdirSync(tpl, { recursive: true });
  mkdirSync(client, { recursive: true });
  const v1 = V1(remote);
  git(tpl, "init", "-q", "-b", "main");
  write(tpl, v1);
  const c1 = commit(tpl, "v1.0.0");
  if (tags) git(tpl, "tag", "v1.0.0");
  git(client, "init", "-q", "-b", "main");
  write(client, Object.fromEntries(Object.entries(v1).filter(([p]) => p !== "BACKLOG.md")));
  commit(client, "copied from the template zip");
  write(tpl, V11);
  const c11 = commit(tpl, "v1.1.0");
  if (tags) git(tpl, "tag", "v1.1.0");
  git(dir, "clone", "-q", "--bare", tpl, remote);
  git(client, "remote", "add", "template", remote);
  const s = { tpl, client, c1, c11, v1 };
  seeds.set(key, s);
  return s;
}
let n = 0;
function world({ tags = true, edits = CLIENT_EDITS, state = "init" } = {}) {
  const s = seed({ tags });
  const dir = join(TMP, `case-${++n}`);
  const tpl = join(dir, "tpl");
  const client = join(dir, "client");
  cpSync(s.tpl, tpl, { recursive: true });
  cpSync(s.client, client, { recursive: true });
  if (state === "init") writeFileSync(join(client, ".template-sync.json"), JSON.stringify({ commit: s.c1, version: "1.0.0" }, null, 2) + "\n");
  write(client, edits);
  commit(client, "client work");
  return { tpl, client, c1: s.c1, c11: s.c11, v1: s.v1 };
}
const state = (client) => JSON.parse(read(client, ".template-sync.json"));

/* -------------------------------------------------------------- harness */
const cases = [];
const test = (name, fn) => cases.push({ name, fn });
function eq(actual, expected, what) {
  if (actual !== expected) throw new Error(`${what}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
function ok(cond, what) {
  if (!cond) throw new Error(what);
}

/* ------------------------------------------------- SYNC.md §1: status */
test("status: every row of the §1 table is classified", () => {
  const w = world();
  const r = sync(w.client, "status");
  eq(r.code, 0, `status exit code\n${r.out}`);
  const g = grouped(r.out);
  eq(g["lib/take.txt"], "update", "template changed, client did not");
  eq(g["lib/added.txt"], "update", "file added by the template");
  eq(g["package.json"], "update", "package.json follows the template");
  eq(g["lib/deleted.txt"], "delete", "template deleted, client did not touch");
  eq(g["lib/drift.txt"], "local", "client changed, template did not");
  eq(g["lib/local-new.txt"], "local-new", "shared-path file that exists only in the client");
  eq(g["lib/restore.txt"], "local-deleted", "shared file missing in the client");
  eq(g["lib/merge.txt"], "conflict", "changed on both sides (different lines)");
  eq(g["lib/overlap.txt"], "conflict", "changed on both sides (same line)");
  eq(g["lib/edited-then-deleted.txt"], "conflict", "template deleted a file the client edited");
  eq(g["src/data/owned.ts"], "notice", "template changed a client-owned file");
  for (const p of ["lib/untouched.txt", "lib/crlf.txt", "client-intake.json", "BACKLOG.md", "template.config.json"]) eq(g[p], undefined, `${p} must not be listed`);
  ok(/5 local change\(s\) to shared code/.test(r.out), `drift count should be 5 (1 local, 1 local-new, 3 both-sides)\n${r.out}`);
});

test("status: exit 1 and a pointer to init when no base is recorded", () => {
  const w = world({ state: "none" });
  const r = sync(w.client, "status");
  eq(r.code, 1, "status exit code without a base");
  ok(r.out.includes("No base recorded"), "says no base is recorded");
  const g = grouped(r.out);
  eq(g["lib/take.txt"], "differs", "without a base a changed file is 'differs'");
  eq(g["lib/restore.txt"], "update", "without a base a missing shared file is still restored");
  eq(g["lib/local-new.txt"], "local-new", "without a base a client-only file is local-new");
  eq(g["lib/crlf.txt"], undefined, "CRLF-only difference is not a difference");
});

/* --------------------------------------------------- SYNC.md §1: pull */
test("pull: take, keep, merge, conflict, delete, restore in one run", () => {
  const w = world();
  const r = sync(w.client, "pull");
  eq(r.code, 1, `pull exits 1 when conflicts need a decision\n${r.out}`);
  eq(git(w.client, "branch", "--show-current"), "template-sync/v1.1.0", "pull works on its own branch");
  eq(read(w.client, "lib/take.txt"), "take v1.1\n", "take: template's version");
  eq(read(w.client, "lib/added.txt"), "added in v1.1\n", "take: file new in the template");
  eq(read(w.client, "package.json"), pkg("1.1.0"), "take: package.json");
  eq(read(w.client, "package-lock.json"), lock("1.1.0"), "take: package-lock.json");
  ok(/npm ci\s+# dependencies changed/.test(r.out), "says to run npm ci when the lockfile changed");
  eq(read(w.client, "lib/drift.txt"), "drift (client)\n", "keep: client-only change survives");
  eq(read(w.client, "lib/merge.txt"), lines(9, { 1: "line 1 (template)", 9: "line 9 (client)" }), "clean 3-way merge keeps both changes");
  const overlap = read(w.client, "lib/overlap.txt");
  ok(/^<<<<<<< client\nbeta \(client\)\n/m.test(overlap), `overlap: client side under '<<<<<<< client'\n${overlap}`);
  ok(/\nbeta \(template\)\n>>>>>>> template\n/.test(overlap), `overlap: template side above '>>>>>>> template'\n${overlap}`);
  eq(read(w.client, "lib/deleted.txt"), null, "delete: template deleted, client untouched");
  eq(read(w.client, "lib/restore.txt"), "restore me\n", "restore: missing shared file comes back");
  eq(read(w.client, "lib/edited-then-deleted.txt"), "v1 (client)\n", "deleted upstream but edited here: kept for a decision");
  ok(/lib\/edited-then-deleted\.txt \(deleted on one side/.test(r.out), "…and reported as needing a decision");
  eq(read(w.client, "lib/crlf.txt"), "one\r\ntwo\r\n", "CRLF-only file is left byte for byte");
  eq(read(w.client, "lib/local-new.txt"), "new in client\n", "client-only file is left alone");
  eq(read(w.client, "client-intake.json"), CLIENT_EDITS["client-intake.json"], "client-owned intake is never written");
  eq(read(w.client, "src/data/owned.ts"), CLIENT_EDITS["src/data/owned.ts"], "client-owned data is never written");
  eq(grouped(r.out)["src/data/owned.ts"], "notice", "template change to a client-owned file is reported, not applied");
  eq(read(w.client, "BACKLOG.md"), null, "template-only file never reaches the client");
  eq(state(w.client).commit, w.c11, "base moves to the template head");
  eq(state(w.client).version, "1.1.0", "state records the new version");
  const after = sync(w.client, "status");
  eq(after.code, 1, "status exits 1 while conflict markers remain");
  ok(/unresolved conflict markers in: .*lib\/overlap\.txt/.test(after.out), "status names the file with markers");
});

test("pull: refuses a dirty tree and changes nothing", () => {
  const w = world();
  writeFileSync(join(w.client, "lib/untouched.txt"), "uncommitted\n");
  const r = sync(w.client, "pull");
  eq(r.code, 1, "exit code");
  eq(read(w.client, "lib/take.txt"), "take v1\n", "nothing taken");
  eq(git(w.client, "branch", "--show-current"), "main", "no branch created");
});

test("pull --dry-run writes nothing", () => {
  const w = world();
  const r = sync(w.client, "pull", "--dry-run");
  eq(r.code, 0, "exit code");
  eq(grouped(r.out)["lib/take.txt"], "update", "still lists what it would do");
  eq(git(w.client, "status", "--porcelain"), "", "working tree untouched");
  eq(state(w.client).commit, w.c1, "base not moved");
});

test("pull: clean client takes everything, exit 0, no drift left", () => {
  const w = world({ edits: {} });
  const r = sync(w.client, "pull", "--no-branch");
  eq(r.code, 0, `exit code\n${r.out}`);
  eq(git(w.client, "branch", "--show-current"), "main", "--no-branch stays on the current branch");
  eq(read(w.client, "lib/take.txt"), "take v1.1\n", "updated");
  eq(read(w.client, "lib/deleted.txt"), null, "deleted");
  const again = sync(w.client, "status");
  ok(again.out.includes("shared files identical to the template"), `second status is clean\n${again.out}`);
});

test("pull without a base: stops on 'differs', --theirs takes the template's", () => {
  const w = world({ state: "none" });
  const stop = sync(w.client, "pull");
  eq(stop.code, 1, "exit code without --theirs");
  eq(read(w.client, "lib/take.txt"), "take v1\n", "nothing written without a direction");
  eq(git(w.client, "branch", "--show-current"), "main", "no branch created");
  const r = sync(w.client, "pull", "--theirs", "--no-branch");
  eq(r.code, 0, `exit code with --theirs\n${r.out}`);
  eq(read(w.client, "lib/take.txt"), "take v1.1\n", "--theirs: template's version");
  eq(read(w.client, "lib/drift.txt"), "drift v1\n", "--theirs: client change overwritten (that is what it is for)");
  eq(read(w.client, "lib/restore.txt"), "restore me\n", "missing file restored");
  eq(read(w.client, "lib/local-new.txt"), "new in client\n", "client-only file left alone");
  eq(read(w.client, "lib/crlf.txt"), "one\r\ntwo\r\n", "CRLF-only file left alone");
  eq(read(w.client, "client-intake.json"), CLIENT_EDITS["client-intake.json"], "client-owned file never written");
  eq(state(w.client).commit, w.c11, "base recorded");
});

test("pull without a base: a file that is only missing is restored without --theirs", () => {
  const edits = { ...Object.fromEntries(Object.entries(V11).filter(([p]) => !["BACKLOG.md", "src/data/owned.ts"].includes(p))), "lib/restore.txt": null };
  const w = world({ state: "none", edits });
  const r = sync(w.client, "pull", "--no-branch");
  eq(r.code, 0, `exit code\n${r.out}`);
  eq(read(w.client, "lib/restore.txt"), "restore me\n", "restored");
});

/* ------------------------------------------------------------ lock */
test("lock: pull refuses, dry run still works, init keeps the lock, unlock clears it", () => {
  const w = world();
  eq(sync(w.client, "lock", "--note", "launched").code, 0, "lock exit code");
  commit(w.client, "lock");
  const r = sync(w.client, "pull");
  eq(r.code, 1, "locked pull exit code");
  ok(r.out.includes("LOCKED"), "says it is locked");
  eq(read(w.client, "lib/take.txt"), "take v1\n", "locked pull writes nothing");
  eq(git(w.client, "branch", "--show-current"), "main", "locked pull creates no branch");
  eq(sync(w.client, "pull", "--dry-run").code, 0, "dry run allowed on a locked site");
  sync(w.client, "init");
  eq(state(w.client).locked, true, "init keeps the lock");
  eq(state(w.client).lockNote, "launched", "init keeps the note");
  sync(w.client, "unlock");
  eq(state(w.client).locked, undefined, "unlock removes it");
});

/* ------------------------------------------------------------ init */
test("init: finds the base by tag v<version>", () => {
  const w = world({ state: "none" });
  const r = sync(w.client, "init");
  eq(r.code, 0, `exit code\n${r.out}`);
  eq(state(w.client).commit, w.c1, "base is the tagged v1.0.0 commit");
  eq(state(w.client).version, "1.0.0", "version recorded");
  ok(r.out.includes("lib/drift.txt") && !r.out.includes("lib/take.txt"), `lists local drift only\n${r.out}`);
});

test("init: finds the base from package.json history when there is no tag", () => {
  const w = world({ state: "none", tags: false });
  const r = sync(w.client, "init");
  eq(r.code, 0, `exit code\n${r.out}`);
  eq(state(w.client).commit, w.c1, "base is the commit whose package.json says 1.0.0");
});

test("init --base <ref> records that commit; an unknown version fails", () => {
  const w = world({ state: "none" });
  eq(sync(w.client, "init", "--base", "v1.1.0").code, 0, "exit code with --base");
  eq(state(w.client).commit, w.c11, "explicit base recorded");
  const x = world({ state: "none", edits: { "package.json": pkg("0.4.0") } });
  eq(sync(x.client, "init").code, 2, "no template commit has that version");
  eq(read(x.client, ".template-sync.json"), null, "nothing recorded");
});

/* ---------------------------------------------------------- import */
test("import: dry run lists by kind and writes nothing", () => {
  const w = world();
  const r = sync(w.tpl, "import", w.client);
  eq(r.code, 0, `exit code\n${r.out}`);
  const g = grouped(r.out);
  eq(g["lib/drift.txt"], "port", "client-only change is safe to import");
  eq(g["lib/merge.txt"], "import-conflict", "changed in both");
  eq(g["lib/overlap.txt"], "import-conflict", "changed in both (same line)");
  eq(g["lib/local-new.txt"], "new", "new in client");
  eq(g["lib/restore.txt"], "client-deleted", "deleted in client");
  for (const p of ["lib/take.txt", "lib/added.txt", "lib/crlf.txt", "package.json", "client-intake.json", "src/data/owned.ts", ".template-sync.json", "BACKLOG.md"])
    eq(g[p], undefined, `${p} must not be offered for import`);
  eq(git(w.tpl, "status", "--porcelain"), "", "template untouched");
});

test("import --apply: ports and merges, skips new and deleted", () => {
  const w = world();
  const r = sync(w.tpl, "import", w.client, "--apply");
  eq(r.code, 1, `exit 1 because one merge has markers\n${r.out}`);
  eq(read(w.tpl, "lib/drift.txt"), "drift (client)\n", "port: client's version");
  eq(read(w.tpl, "lib/merge.txt"), lines(9, { 1: "line 1 (template)", 9: "line 9 (client)" }), "clean merge keeps both changes");
  const overlap = read(w.tpl, "lib/overlap.txt");
  ok(/^<<<<<<< template\nbeta \(template\)\n/m.test(overlap), `template is 'ours'\n${overlap}`);
  ok(/\nbeta \(client\)\n>>>>>>> client\n/.test(overlap), `client is 'theirs'\n${overlap}`);
  eq(read(w.tpl, "lib/local-new.txt"), null, "new file not imported without --include-new");
  eq(read(w.tpl, "lib/restore.txt"), "restore me\n", "a client deletion is never applied");
  eq(read(w.tpl, "lib/take.txt"), "take v1.1\n", "template's newer file is not rolled back");
  eq(read(w.tpl, "client-intake.json"), w.v1["client-intake.json"], "client-owned file never imported");
  eq(read(w.tpl, "src/data/owned.ts"), V11["src/data/owned.ts"], "client-owned data never imported");
});

test("import --apply --only: writes only the named files", () => {
  const w = world();
  const r = sync(w.tpl, "import", w.client, "--only", "lib/drift.txt,lib/restore.txt", "--apply");
  eq(r.code, 0, `exit code\n${r.out}`);
  eq(git(w.tpl, "status", "--porcelain"), "M lib/drift.txt", "only lib/drift.txt changed (the deletion is never applied)");
  eq(read(w.tpl, "lib/drift.txt"), "drift (client)\n", "content");
});

test("import --apply --include-new: also takes files new in the client", () => {
  const w = world();
  sync(w.tpl, "import", w.client, "--include-new", "--apply");
  eq(read(w.tpl, "lib/local-new.txt"), "new in client\n", "new file imported");
  eq(read(w.tpl, "lib/drift.txt"), "drift (client)\n", "ports still applied");
});

test("import: base from the client's version tag when it has no state file", () => {
  const w = world({ state: "none" });
  const r = sync(w.tpl, "import", w.client);
  eq(grouped(r.out)["lib/drift.txt"], "port", `classified against the v1.0.0 tag\n${r.out}`);
  eq(grouped(r.out)["lib/take.txt"], undefined, "template-only change not offered");
});

test("import with no base: nothing applies without --only", () => {
  const w = world({ state: "none", tags: false });
  const dry = sync(w.tpl, "import", w.client);
  ok(dry.out.includes("base: UNKNOWN"), `says the base is unknown\n${dry.out}`);
  eq(grouped(dry.out)["lib/drift.txt"], "import-differs", "direction unknown");
  eq(grouped(dry.out)["lib/untouched.txt"], undefined, "identical file is not listed");
  eq(grouped(dry.out)["lib/crlf.txt"], undefined, "CRLF-only difference is not listed");
  eq(sync(w.tpl, "import", w.client, "--apply").code, 0, "exit code");
  eq(git(w.tpl, "status", "--porcelain"), "", "nothing written without --only");
  sync(w.tpl, "import", w.client, "--only", "lib/drift.txt", "--apply");
  eq(read(w.tpl, "lib/drift.txt"), "drift (client)\n", "--only takes the client's copy verbatim");
});

test("import --apply refuses a dirty template", () => {
  const w = world();
  writeFileSync(join(w.tpl, "lib/untouched.txt"), "uncommitted\n");
  const r = sync(w.tpl, "import", w.client, "--apply");
  eq(r.code, 1, "exit code");
  eq(read(w.tpl, "lib/drift.txt"), "drift v1\n", "nothing imported");
});

/* --------------------------------------------------------- release */
test("release: bumps package.json and both package-lock.json fields", () => {
  const w = world({ edits: {} });
  const r = sync(w.tpl, "release", "2.3.4");
  eq(r.code, 0, `exit code\n${r.out}`);
  eq(JSON.parse(read(w.tpl, "package.json")).version, "2.3.4", "package.json version");
  const l = JSON.parse(read(w.tpl, "package-lock.json"));
  eq(l.version, "2.3.4", "package-lock.json version");
  eq(l.packages[""].version, "2.3.4", 'package-lock.json packages[""].version');
  eq(l.packages["node_modules/x"].version, "9.9.9", "dependency entries untouched");
  ok(r.out.includes('TEMPLATE-CHANGES.md has no "v2.3.4" entry'), "warns when the changelog has no entry");
  eq(sync(w.tpl, "release", "2.3").code, 2, "rejects a version that is not x.y.z");
});

/* -------------------------------------------------------- mutants */
/* [what breaks, text in template-sync.mjs, replacement, which occurrence]. */
const MUTANTS = [
  ["CRLF no longer ignored", '.replace(/\\r\\n/g, "\\n")', '.replace(/\\r\\n/g, "\\r\\n")', 1],
  ["template-only files treated as shared", "!isClient(c, p) && !isTemplateOnly(c, p)", "!isClient(c, p)", 1],
  ["classifyClient: identical files not skipped", "if (same(c, t)) continue;", "", 1],
  ["classifyClient: template-side change not recognised", "if (same(c, b)) rows.push({ p, kind: t === null", "if (false) rows.push({ p, kind: t === null", 1],
  ["classifyClient: template delete becomes update", 'kind: t === null ? "delete" : "update"', 'kind: "update"', 1],
  ["classifyClient: client-side change not recognised", "else if (same(t, b)) rows.push({ p, kind: c === null", "else if (false) rows.push({ p, kind: c === null", 1],
  ["classifyClient: missing file not restored", 'c === null ? "local-deleted" : b === null ? "local-new" : "local"', 'b === null ? "local-new" : "local"', 1],
  ["classifyClient: client-only file reported as drift", 'b === null ? "local-new" : "local", t, b, c', '"local", t, b, c', 1],
  ["classifyClient: both-sides change taken from the template", 'else rows.push({ p, kind: "conflict", t, b, c });', 'else rows.push({ p, kind: "update", t, b, c });', 1],
  ["classifyClient (no base): client-only file is 'differs'", 'if (t === null) rows.push({ p, kind: "local-new", t, c });', 'if (false) rows.push({ p, kind: "local-new", t, c });', 1],
  ["classifyClient (no base): missing file is 'differs'", 'else if (c === null) rows.push({ p, kind: "update", t, c });', "", 1],
  ["classifyClient: no notice for client-owned files", "if (!same(T2.get(p) ?? null, B2.get(p) ?? null)) notices.push(p);", "", 1],
  ["pull: lock ignored", "if (ctx.state?.locked === true && !dry) {", "if (false) {", 1],
  ["cmdImport: identical files not skipped", "if (same(c, t)) continue;", "", 2],
  ["cmdImport: untouched client file offered", "if (same(c, b)) continue; // client untouched; template simply newer", "", 1],
  ["cmdImport: client deletion treated as a port", 'kind: c === null ? "client-deleted" : b === null ? "new" : "port"', 'kind: b === null ? "new" : "port"', 1],
  ["cmdImport: new client file treated as a port", 'b === null ? "new" : "port", t, b, c', '"port", t, b, c', 1],
  ["cmdImport: both-sides change overwrites the template", 'else rows.push({ p, kind: "conflict", t, b, c });', 'else rows.push({ p, kind: "port", t, b, c });', 2],
  ["cmdImport (no base): 'differs' applied without --only", 'c === null ? "client-deleted" : "differs", t, c', 'c === null ? "client-deleted" : "port", t, c', 1],
  ["cmdImport: --only ignored", 'if (only) return only.has(r.p) && r.kind !== "client-deleted";', "", 1],
  ["cmdImport: --only applies a client deletion", 'return only.has(r.p) && r.kind !== "client-deleted";', "return only.has(r.p);", 1],
  ["cmdImport: new files imported without --include-new", 'if (r.kind === "new") return has("--include-new");', 'if (r.kind === "new") return true;', 1],
  ["cmdImport: --include-new ignored", 'if (r.kind === "new") return has("--include-new");', 'if (r.kind === "new") return false;', 1],
  ["cmdImport: merge sides swapped", 'merge3(r.t, r.b, r.c, ["template", "client"])', 'merge3(r.c, r.b, r.t, ["template", "client"])', 1],
  ["release: packages[\"\"] not bumped", 'if (lock.packages?.[""]) lock.packages[""].version = v;', "", 1],
  ["release: lockfile version not bumped", "lock.version = v;", "", 1],
];

function runMutants() {
  const source = readFileSync(SCRIPT, "utf8").replace(/\r\n/g, "\n");
  let bad = 0;
  console.log(`\nMutants (${MUTANTS.length}): each must make at least one case fail.\n`);
  MUTANTS.forEach(([what, find, replace, nth], i) => {
    const parts = source.split(find);
    if (parts.length - 1 < nth) {
      bad++;
      return console.log(`  ✗ STALE     ${what}\n              template-sync.mjs no longer contains occurrence ${nth} of: ${find}`);
    }
    const mutated = parts.slice(0, nth).join(find) + replace + parts.slice(nth).join(find);
    const file = join(TMP, `mutant-${i}.mjs`);
    writeFileSync(file, mutated);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, SYNC_SCRIPT: file }, encoding: "utf8" });
    const failed = (r.stdout.match(/^  ✗ /gm) || []).length;
    if (r.status === 0 || !failed) {
      bad++;
      console.log(`  ✗ SURVIVED  ${what}`);
    } else console.log(`  ✓ caught    ${what}  (${failed} case(s) failed)`);
  });
  return bad;
}

/* ------------------------------------------------------------ main */
let failed = 0;
try {
  console.log(`test:sync — ${fwd(SCRIPT)}\n`);
  for (const c of cases) {
    try {
      c.fn();
      console.log(`  ✓ ${c.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${c.name}\n      ${e.message}`);
    }
  }
  console.log(failed ? `\n✗ test:sync: ${failed} of ${cases.length} case(s) failed.` : `\n✓ test:sync: ${cases.length} case(s) passed.`);
  if (!failed && process.argv.includes("--mutants")) {
    const bad = runMutants();
    console.log(bad ? `\n✗ ${bad} mutant(s) survived or went stale.` : `\n✓ every mutant was caught.`);
    failed += bad;
  }
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
