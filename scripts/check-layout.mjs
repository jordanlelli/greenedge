/**
 * check-layout.mjs — catches layout faults in the BUILT site that the other
 * checks cannot see, at the screen sizes people actually use.
 *
 *   npm run build && npm run qa:layout
 *   npm run qa                    runs it after the impeccable scan
 *   node scripts/check-layout.mjs --pages=/,/services/ --widths=1280,1440
 *   node scripts/check-layout.mjs --keep-going        report, never fail
 *
 * Added in v3.33 after the Kova site shipped a short card beside a long one,
 * a two-column block with one side mostly empty, and a pricing row whose name
 * cell vanished for anyone with an ad blocker (it had id="google-ads"). No
 * existing gate measured any of that. See docs/LESSONS.md.
 *
 * It serves dist/ on a local port, opens every built page in headless Edge or
 * Chrome (whichever is installed; CHROME_PATH overrides) at each width below,
 * and measures the rendered page. Nothing is installed: the browser is driven
 * over its own debugging protocol.
 *
 * What it fails on:
 *
 *   overflow       The page is wider than the window, so it scrolls sideways.
 *   column-gap     Two blocks sit side by side and one leaves a large empty
 *                  area beside the other: a short card with its button pushed
 *                  to the bottom, or a short column next to a long one. The
 *                  fix is in the layout or the copy, not in the threshold.
 *   table-space    A table column is far wider than anything in it, so the
 *                  table is mostly empty space and its rows run tall.
 *   table-cells    A table row has a different number of visible cells from
 *                  the header row, so its cells sit under the wrong headings.
 *   adblock        An id or class that the common ad-block lists hide
 *                  (EasyList cosmetic rules), such as id="google-ads". The
 *                  element disappears for anyone running an ad blocker and the
 *                  layout around it breaks. Checked in the HTML, at no width.
 *
 * Widths cover phones (360, 390), a tablet (768), small and common laptops
 * (1024 to 1536), a 1536 laptop at 90% zoom (1707), and a desktop (1920).
 * Windows display scaling changes the CSS width a page is laid out at, which
 * is why the laptop widths are spread out.
 *
 * Things that are meant to sit unbalanced are skipped: photos beside text,
 * sticky rails, the header, the footer and any nav. Mark anything else that is
 * deliberate with data-layout-check="ignore" on the element.
 */
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const root = process.cwd();
const dist = join(root, typeof args.dist === 'string' ? args.dist : 'dist');
const keepGoing = Boolean(args['keep-going']);
const WIDTHS = (typeof args.widths === 'string' ? args.widths : '360,390,768,1024,1280,1366,1440,1536,1707,1920')
  .split(',')
  .map(Number);

/* Thresholds. A void is empty vertical space inside a column that a sibling column fills. */
const LIMITS = {
  gapTolerance: 56, // spacing between items below this is ordinary rhythm, not a void
  voidMin: 160, // px of void before a column is reported
  voidShare: 0.2, // and at least this share of the row's height
  tableSpareMin: 200, // px of unused width in a table column
  tableSpareShare: 0.5, // and at least this share of the column
};

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`✗ check-layout: no ${relative(root, dist)}/index.html. Run the build first.`);
  process.exit(1);
}

/* ── pages ───────────────────────────────────────────────────────────────── */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}
const toUrlPath = (file) => {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
};
const isRedirect = (html) => /<meta[^>]+http-equiv=["']?refresh/i.test(html);
const allPages = walk(dist)
  .filter((f) => !isRedirect(readFileSync(f, 'utf8')))
  .map((f) => ({ file: f, path: toUrlPath(f) }))
  .sort((a, b) => a.path.localeCompare(b.path));
const pages =
  typeof args.pages === 'string'
    ? allPages.filter((p) => args.pages.split(',').includes(p.path))
    : allPages;

/* ── ad-block traps, from the HTML ───────────────────────────────────────── */
/* Generic EasyList hiding rules that real sites trip over. Not the whole list:
   the names a person might plausibly give a section about advertising. */
const ADBLOCK_EXACT = new Set([
  'ad', 'ads', 'adv', 'advert', 'adverts', 'advertising', 'advertisement', 'advertisements',
  'adbox', 'adbanner', 'ad-banner', 'banner-ad', 'banner-ads', 'ad-box', 'ad-container', 'ads-container',
  'ad-wrapper', 'ad-slot', 'ad-unit', 'ad-space', 'ad-zone', 'ad-block', 'ad-area', 'adarea', 'adspace',
  'top-ad', 'side-ad', 'sidebar-ad', 'sidebar-ads', 'footer-ad', 'header-ad', 'text-ad', 'textad', 'textads',
  'sponsor', 'sponsors', 'sponsored', 'sponsored-content', 'sponsored-links', 'sponsorship',
  'adsense', 'adsbygoogle', 'googleads', 'google-ads', 'google_ads', 'google-ad', 'googlead', 'adwords',
  'promoted', 'paid-content',
]);
const ADBLOCK_PATTERN = /^(google[-_]?ads?([-_]|$)|div-gpt-ad|ad[-_](banner|container|wrapper|slot|unit|space|zone|box|block|area|label|leaderboard|placeholder|sidebar|top|bottom|header|footer)\b|ads[-_](container|wrapper|area|box|banner|block)\b|adsense|sponsored[-_])/i;
function adblockFindings(html) {
  const out = [];
  for (const m of html.matchAll(/\s(id|class)=("([^"]*)"|'([^']*)')/g)) {
    const kind = m[1];
    const value = m[3] ?? m[4] ?? '';
    for (const token of kind === 'id' ? [value] : value.split(/\s+/)) {
      if (!token) continue;
      if (ADBLOCK_EXACT.has(token.toLowerCase()) || ADBLOCK_PATTERN.test(token))
        out.push(`${kind}="${token}" is hidden by common ad blockers. Rename it.`);
    }
  }
  return [...new Set(out)];
}

/* ── static server ───────────────────────────────────────────────────────── */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json',
};
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(dist, p);
  if (p.endsWith('/')) file = join(file, 'index.html');
  else if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  else if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ── browser ─────────────────────────────────────────────────────────────── */
function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      return execSync(`command -v ${name}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {}
  }
  return null;
}
const browserPath = findBrowser();
if (!browserPath) {
  console.error('✗ check-layout: no Edge or Chrome found. Set CHROME_PATH to one.');
  server.close();
  process.exit(1);
}
const profile = mkdtempSync(join(tmpdir(), 'check-layout-'));
const browser = spawn(browserPath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
]);
/* The browser writes the port it chose to DevToolsActivePort in the profile folder. */
let port;
for (let i = 0; i < 100 && !port; i++) {
  const file = join(profile, 'DevToolsActivePort');
  if (existsSync(file)) port = readFileSync(file, 'utf8').split('\n')[0].trim();
  else await new Promise((r) => setTimeout(r, 200));
}
if (!port) {
  console.error(`✗ check-layout: ${browserPath} did not start.`);
  browser.kill();
  server.close();
  process.exit(1);
}
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method) for (const l of listeners) l(m);
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const id = ++seq;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const once = (method, ms) =>
  new Promise((r) => {
    const l = (m) => {
      if (m.method === method) {
        listeners.delete(l);
        r(true);
      }
    };
    listeners.add(l);
    setTimeout(() => {
      listeners.delete(l);
      r(false);
    }, ms);
  });
await send('Page.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

/* ── the in-page measurement ─────────────────────────────────────────────── */
/* Runs inside the page. Returns findings as { type, msg, where }. */
function measure(LIMITS) {
  const VW = document.documentElement.clientWidth;
  const findings = [];
  const SKIP = 'header, footer, nav, [data-layout-check="ignore"], [aria-hidden="true"]';
  const MEDIA = /^(IMG|PICTURE|VIDEO|IFRAME|CANVAS|svg)$/;
  const cs = (el) => getComputedStyle(el);
  const shown = (el) => {
    const s = cs(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0;
  };
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const cls = [...el.classList].filter((c) => !/^astro-|^data-astro/.test(c)).slice(0, 2);
    if (cls.length) s += `.${cls.join('.')}`;
    return s;
  };
  const where = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) parts.unshift(label(e));
    return parts.join(' > ');
  };
  const snippet = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);

  /* overflow */
  const sw = document.documentElement.scrollWidth;
  if (sw > VW + 1) {
    const wide = [...document.body.querySelectorAll('*')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > VW + 1 && shown(e);
    });
    const outer = wide.filter((e) => !wide.includes(e.parentElement)).slice(0, 3);
    findings.push({ type: 'overflow', msg: `page is ${sw}px wide in a ${VW}px window`, where: outer.map(where).join(' | ') });
  }

  /* Content boxes inside an element: text, media, controls, and small boxes with a fill or a rule. */
  function content(root) {
    const rootH = root.getBoundingClientRect().height;
    const boxes = [];
    let media = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 1) {
          const s = cs(n);
          if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === 3) {
        if (!n.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) boxes.push(r);
        continue;
      }
      const r = n.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      if (MEDIA.test(n.tagName) || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(n.tagName)) {
        boxes.push(r);
        if (MEDIA.test(n.tagName)) media += r.height;
        continue;
      }
      const s = cs(n);
      const filled = (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none';
      const ruled = ['Top', 'Bottom', 'Left', 'Right'].some((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none');
      /* A visible panel is content unless it stretches to the full row, where it could hide a gap inside it. */
      if ((filled || ruled) && r.height < 0.9 * rootH) boxes.push(r);
    }
    return { boxes, media };
  }
  /* A box drawn as a panel: a fill, or an outline on at least two sides. One rule is a divider, not a panel. */
  function panel(el) {
    const s = cs(el);
    const filled = (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none';
    const sides = ['Top', 'Bottom', 'Left', 'Right'].filter((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none');
    return filled || sides.length >= 2;
  }
  function intervals(boxes) {
    const iv = boxes.map((r) => [r.top, r.bottom]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [t, b] of iv) {
      const last = merged[merged.length - 1];
      if (last && t <= last[1] + LIMITS.gapTolerance) last[1] = Math.max(last[1], b);
      else merged.push([t, b]);
    }
    return merged;
  }

  /* column-gap: blocks laid out side by side in a grid or a flex row */
  const containers = [...document.body.querySelectorAll('*')].filter((el) => {
    if (el.closest(SKIP)) return false;
    const s = cs(el);
    const row = /flex/.test(s.display) && !/column/.test(s.flexDirection);
    return (/grid/.test(s.display) || row) && el.children.length >= 2;
  });
  const reported = new Set();
  const span = (iv) => iv.reduce((s, [t, b]) => s + b - t, 0);
  const sticky = (el) => cs(el).position === 'sticky' || [...el.querySelectorAll('*')].some((d) => cs(d).position === 'sticky');
  /* Join items into groups wherever `touch` holds between any two of them. */
  function cluster(items, touch) {
    const groups = [];
    for (const item of items) {
      const hits = groups.filter((g) => g.some((o) => touch(o, item)));
      const merged = hits.flat().concat(item);
      for (const h of hits) groups.splice(groups.indexOf(h), 1);
      groups.push(merged);
    }
    return groups;
  }
  for (const box of containers) {
    const kids = [...box.children]
      .filter((k) => {
        const s = cs(k);
        return shown(k) && s.position !== 'absolute' && s.position !== 'fixed' && !k.matches(SKIP);
      })
      .map((k) => ({ el: k, r: k.getBoundingClientRect() }))
      .filter((k) => k.r.width > 0 && k.r.height > 0);
    /* A row is every item that shares some height with another. Inside it, items that share some
       width are one column, so a stack of blocks beside one long block is measured as a stack. */
    const rows = cluster(kids, (a, b) => Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > 1);
    for (const row of rows) {
      const columns = cluster(row, (a, b) => Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) > 1);
      if (columns.length < 2) continue;
      const top = Math.min(...row.map((k) => k.r.top));
      const bottom = Math.max(...row.map((k) => k.r.bottom));
      const height = bottom - top;
      if (height < LIMITS.voidMin * 1.25) continue;
      const measured = columns
        .filter((col) => !col.some((k) => sticky(k.el)))
        .map((col) => {
          const boxes = [];
          let media = 0;
          for (const k of col) {
            /* A block drawn with a background image stands in for a photo. */
            if (cs(k.el).backgroundImage !== 'none') {
              boxes.push(k.r);
              media += k.r.height;
              continue;
            }
            /* A column that is itself a panel, short of the full row, is content all through. */
            if (panel(k.el) && k.r.height < 0.9 * height) boxes.push(k.r);
            const c = content(k.el);
            boxes.push(...c.boxes);
            media += c.media;
          }
          const iv = intervals(boxes);
          return { col, el: col[0].el, iv, covered: span(iv), media };
        })
        .filter((m) => m.iv.length);
      if (measured.length < 2) continue;
      const fullest = measured.reduce((a, b) => (b.covered > a.covered ? b : a));
      /* A photo beside text is meant to be taller or shorter than the text. */
      if (fullest.media > 0.5 * fullest.covered) continue;
      for (const m of measured) {
        if (m === fullest || reported.has(m.el)) continue;
        if (m.media > 0.5 * m.covered) continue;
        const iv = m.iv;
        const big = (g) => (g > LIMITS.gapTolerance ? g : 0);
        const lead = big(iv[0][0] - top);
        const trail = big(bottom - iv.at(-1)[1]);
        /* A block centred against a taller one has a gap above and below it. It reads as placed, so only the larger gap counts. */
        const centred = lead && trail && Math.abs(lead - trail) <= 0.2 * (lead + trail);
        const inner = iv.slice(1).reduce((s, v, n) => s + big(v[0] - iv[n][1]), 0);
        const empty = inner + (centred ? Math.max(lead, trail) : lead + trail);
        if (empty > LIMITS.voidMin && empty > LIMITS.voidShare * height) {
          reported.add(m.el);
          findings.push({
            type: 'column-gap',
            msg: `${Math.round(empty)}px of a ${Math.round(height)}px row is empty in "${snippet(m.el)}" beside "${snippet(fullest.el)}"`,
            where: where(m.el),
          });
        }
      }
    }
  }

  /* tables */
  for (const table of document.querySelectorAll('table')) {
    if (!shown(table) || cs(table).display !== 'table' || table.closest(SKIP)) continue;
    const headRow = table.tHead && [...table.tHead.rows].at(-1);
    const columns = headRow ? [...headRow.cells].reduce((n, c) => n + c.colSpan, 0) : 0;
    const bodyRows = [...table.tBodies].flatMap((b) => [...b.rows]).filter(shown);
    for (const row of bodyRows) {
      const cells = [...row.cells].filter((c) => shown(c) && c.getBoundingClientRect().width > 0);
      const n = cells.reduce((s, c) => s + c.colSpan, 0);
      if (columns && n !== columns)
        findings.push({ type: 'table-cells', msg: `row "${snippet(row)}" shows ${n} cells under ${columns} headings`, where: where(row) });
    }
    if (!headRow) continue;
    let x = 0;
    [...headRow.cells].forEach((head, i) => {
      if (head.colSpan !== 1) return;
      const colW = head.getBoundingClientRect().width;
      const cells = [head, ...bodyRows.map((r) => r.cells[i]).filter(Boolean)];
      let widest = 0;
      for (const c of cells) {
        const range = document.createRange();
        range.selectNodeContents(c);
        const rs = [...range.getClientRects()].filter((r) => r.width > 0);
        if (rs.length) widest = Math.max(widest, Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.left)));
      }
      const s = cs(head);
      const spare = colW - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - widest;
      if (spare > LIMITS.tableSpareMin && spare > LIMITS.tableSpareShare * colW)
        findings.push({
          type: 'table-space',
          msg: `column "${snippet(head)}" is ${Math.round(colW)}px wide for ${Math.round(widest)}px of content`,
          where: where(table),
        });
    });
  }
  return findings;
}

/* ── run ─────────────────────────────────────────────────────────────────── */
const results = [];
for (const page of pages) {
  for (const msg of adblockFindings(readFileSync(page.file, 'utf8'))) results.push({ page: page.path, width: 'html', type: 'adblock', msg, where: '' });
  for (const width of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 800 : 900, deviceScaleFactor: 1, mobile: width < 768 });
    const loaded = once('Page.loadEventFired', 15000);
    await send('Page.navigate', { url: origin + page.path });
    await loaded;
    await send('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))',
      awaitPromise: true,
    });
    const out = await send('Runtime.evaluate', {
      expression: `(${measure.toString()})(${JSON.stringify(LIMITS)})`,
      returnByValue: true,
    });
    if (out.result?.exceptionDetails) {
      results.push({ page: page.path, width, type: 'error', msg: out.result.exceptionDetails.exception?.description || 'measure failed', where: '' });
      continue;
    }
    for (const f of out.result.result.value) results.push({ page: page.path, width, ...f });
  }
}

ws.close();
browser.kill();
server.close();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}

/* One line per fault, with every width it shows at. */
const grouped = new Map();
for (const r of results) {
  const key = `${r.page}\u0000${r.type}\u0000${r.where}\u0000${r.msg.replace(/\d+px/g, '#')}`;
  if (!grouped.has(key)) grouped.set(key, { ...r, widths: [] });
  grouped.get(key).widths.push(r.width);
}
const byPage = new Map();
for (const g of grouped.values()) {
  if (!byPage.has(g.page)) byPage.set(g.page, []);
  byPage.get(g.page).push(g);
}
console.log(`check-layout: ${pages.length} page(s) at ${WIDTHS.join(', ')}px`);
for (const [page, list] of byPage) {
  console.log(`\n${page}`);
  for (const g of list)
    console.log(`  ✗ ${g.type} at ${g.widths.join(', ')}${g.widths[0] === 'html' ? '' : 'px'}: ${g.msg}${g.where ? `\n      ${g.where}` : ''}`);
}
const count = grouped.size;
console.log(count ? `\n✗ check-layout: ${count} layout fault(s).` : '\n✓ check-layout: no layout faults.');
process.exit(count && !keepGoing ? 1 : 0);
