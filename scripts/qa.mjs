/**
 * qa.mjs — impeccable against the BUILT site in a real browser (v3.22).
 *
 *   npm run build && npm run qa
 *
 * WHY NOT `impeccable detect dist` ANY MORE. The static engine reads dist/ with
 * jsdom, which cannot resolve Tailwind v4's spacing — every p-*, px-*, py-*
 * compiles to calc(var(--spacing) * n) and reads as 0px. On A&J that produced
 * 68 `cramped-padding` findings; in a real browser there were 2. A report that
 * is 95% false positives trains you to stop reading it. The URL engine renders
 * each page in headless Chrome, so padding, line length, contrast and
 * viewport-relative sizes are measured as a visitor sees them.
 *
 * What it does: serves dist/ on a local port, scans every built page (redirect
 * stubs skipped), prints findings grouped by page, and exits 2 if anything is
 * left — same exit contract as impeccable itself. .impeccable/config.json
 * ignores apply.
 *
 * First run: npx fetches impeccable + puppeteer (and puppeteer's Chrome, ~150
 * MB, unless a system Chrome is used — impeccable prefers system Chrome on
 * Windows). Nothing is added to package.json.
 *
 * STALE BUILDS ARE REFUSED. qa scans whatever is in dist/. When a build fails
 * before `astro build` runs (a gate, or a broken install), dist/ still holds
 * the PREVIOUS build, and qa used to scan it and print "0 findings": a pass
 * for code that was never built. So qa exits 1, before starting Chrome, when
 * dist/index.html is missing or older than anything it was built from: src/,
 * the intake (client-intake.json, the demo intake, and INTAKE if set),
 * package-lock.json or astro.config.mjs. Rebuild, then run it again.
 *
 *   npm run qa -- --keep-going     never fail the process (report only)
 *   npm run qa:layout              the layout check on its own (qa runs it
 *                                  after impeccable; see check-layout.mjs)
 *   npm run qa:src                 static pass over src/ (catches CSS-level
 *                                  patterns the rendered page can't show)
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname, relative, sep, isAbsolute } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const dist = join(root, "dist");
const keepGoing = process.argv.includes("--keep-going");
if (!existsSync(join(dist, "index.html"))) {
  console.error("✗ qa: no dist/index.html — run `npm run build` first. (If a build just failed, there is nothing to scan.)");
  process.exit(1);
}

/* Refuse a stale build (see the header). The newest input is compared with
   dist/index.html, which every successful build rewrites. Not overridable:
   --keep-going is about findings, and a scan of the wrong build has none
   worth reading. */
{
  const built = statSync(join(dist, "index.html")).mtimeMs;
  let newest = { path: "", time: 0 };
  const consider = (p) => {
    if (!existsSync(p)) return;
    const s = statSync(p);
    if (s.isDirectory()) return readdirSync(p).forEach((name) => consider(join(p, name)));
    if (s.mtimeMs > newest.time) newest = { path: p, time: s.mtimeMs };
  };
  const envIntake = (process.env.INTAKE || "").trim();
  for (const input of ["src", "client-intake.json", "client-intake.demo.json", "package-lock.json", "astro.config.mjs"]) consider(join(root, input));
  if (envIntake) consider(isAbsolute(envIntake) ? envIntake : join(root, envIntake));
  if (newest.time > built) {
    const when = (t) => new Date(t).toLocaleString();
    console.error(
      `✗ qa: dist/ is older than the source, so it is not a build of this code.\n` +
        `    changed: ${relative(root, newest.path).split(sep).join("/")}  (${when(newest.time)})\n` +
        `    built:   dist/index.html  (${when(built)})\n` +
        `  Run the build again (npm run build, or npm run demo in the template) and check it finished:\n` +
        `  if it stopped at a gate or an install error, dist/ is still the previous build.`
    );
    process.exit(1);
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    return res.end(existsSync(join(dist, "404.html")) ? readFileSync(join(dist, "404.html")) : "not found");
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(file));
});

const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "_astro") walk(p); continue; }
    if (!name.endsWith(".html")) continue;
    const html = readFileSync(p, "utf8");
    if (/http-equiv=["']refresh["']/i.test(html)) continue; // redirect stubs
    const rel = relative(dist, p).split(sep).join("/");
    pages.push("/" + rel.replace(/(^|\/)index\.html$/, "$1"));
  }
})(dist);
pages.sort();

/* Then the layout check (v3.33) over the same dist/: every page at ten screen
   widths, for side scrolling, a short column beside a long one, mostly empty
   table columns, table cells out of line, and ids ad blockers hide. qa fails
   if either part does. See scripts/check-layout.mjs. */
function finish(code) {
  const layout = spawn(process.execPath, [join(root, "scripts", "check-layout.mjs"), ...(keepGoing ? ["--keep-going"] : [])], {
    cwd: root, stdio: "inherit",
  });
  layout.on("close", (c) => process.exit(keepGoing ? 0 : Math.max(code, c ?? 1)));
}

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  const urls = pages.map((p) => `http://127.0.0.1:${port}${p}`);
  console.log(`qa: scanning ${urls.length} page(s) in headless Chrome…`);
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(npx, ["--yes", "-p", "impeccable@3", "-p", "puppeteer", "impeccable", "detect", "--json", ...urls], {
    cwd: root, shell: process.platform === "win32", stdio: ["ignore", "pipe", "inherit"],
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.on("close", () => {
    server.close();
    let findings;
    try { findings = JSON.parse(out); } catch {
      console.error("✗ qa: could not read impeccable output:\n" + out.slice(0, 2000));
      process.exit(1);
    }
    if (!Array.isArray(findings)) findings = findings.findings || [];
    if (!findings.length) {
      console.log(`✓ qa: 0 findings across ${urls.length} page(s).`);
      return finish(0);
    }
    const byPage = new Map();
    for (const f of findings) {
      const page = String(f.file || "").replace(/^https?:\/\/[^/]+/, "") || "(site)";
      if (!byPage.has(page)) byPage.set(page, []);
      byPage.get(page).push(f);
    }
    for (const [page, list] of byPage) {
      console.log(`\n${page}`);
      for (const f of list) console.log(`  [${f.antipattern}] ${f.snippet || f.name}`);
    }
    console.log(`\n✗ qa: ${findings.length} finding(s) across ${byPage.size} page(s).`);
    finish(2);
  });
});
