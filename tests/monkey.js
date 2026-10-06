// Monkey smoke test: plays the real game by tapping random visible buttons like a player (weighted towards
// serving customers, sewing and ending the day) and reports anything odd: page errors, NaN/undefined on screen,
// non-finite numbers or negative stock in the save, a screen with nothing to tap, English left in Danish mode,
// and a save that does not survive a reload. Mini-games run for real but finish quickly with a random score.
// Run: npm run test:monkey   (env: LANG2=en|da  STEPS=n  SEED=n  START=fresh|save  W,H  OUT=name for screenshots)
const http = require('http');
const fs = require('fs');
const path = require('path');
let pw;
try { pw = require(process.env.PLAYWRIGHT || 'playwright'); } catch (e) {
  console.log('Playwright not found: skipping browser tests (set PLAYWRIGHT=/path/to/node_modules/playwright).');
  process.exit(0);
}
const root = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const OUT = process.env.OUT ? path.join(require('os').tmpdir(), 'monkey-' + process.env.OUT) : null;
let seed = +(process.env.SEED || 1);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const b = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 1180), height: +(process.env.H || 820) }, hasTouch: true });
  const p = await ctx.newPage();
  const issues = new Map();
  const flag = (k, detail) => { if (!issues.has(k)) issues.set(k, { n: 0, first: detail }); issues.get(k).n++; };
  p.on('pageerror', e => flag('PAGE ERROR: ' + e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(m.text())) flag('CONSOLE: ' + m.text().slice(0, 160)); });
  p.on('dialog', d => d.accept());
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const LANG = process.env.LANG2 || 'en';
  await p.goto(URL);
  await p.evaluate(([lang, start, save]) => {
    localStorage.clear();
    localStorage.setItem('mies-atelier-settings', JSON.stringify({ lang, tips: true }));
    if (start === 'save') { localStorage.setItem('mies-atelier-profiles', JSON.stringify({ active: 'pX', list: [{ id: 'pX', name: 'Mie', day: 30 }] })); localStorage.setItem('mies-atelier-save-pX', save); }
  }, [LANG, process.env.START || 'fresh', fs.readFileSync(path.join(__dirname, 'fixtures', fs.readdirSync(path.join(__dirname, 'fixtures')).sort().pop()), 'utf8')]);
  await p.reload(); await p.waitForTimeout(500);
  // mini-games: mount the real one (so its drawing runs), then finish quickly with a random score
  await p.evaluate(() => {
    for (const k of Object.keys(DG.MiniGames)) {
      const real = DG.MiniGames[k];
      DG.MiniGames[k] = (host, opts, done) => {
        const stop = real(host, opts, () => {});
        let live = true;
        setTimeout(() => { if (!live) return; live = false; try { stop && stop(); } catch (e) {} done(k === 'paint' ? [] : k === 'haggle' ? Math.floor(Math.random() * 4) : Math.random()); }, 120);
        return () => { live = false; try { stop && stop(); } catch (e) {} };
      };
    }
    window.__mieDays = new Set();
  });
  const SKIP = new Set(['deleteplayer', 'restorebackup', 'importcode', 'exportcode', 'copycode', 'adamjob', 'switchplayer', 'newplayer', 'renameplayer', 'newgame', 'tipsoff', 'setting', 'movehouse']);
  const EN = /\b(the|and|your|with|today|customers?|please|would|tomorrow|money|price|dress|buy|sell|day)\b/i;
  const STEPS = +(process.env.STEPS || 600);
  let lastDay = 0, stuck = 0, shots = 0; const hist = {}; const trail = []; let tracedNeg = false;
  for (let step = 0; step < STEPS; step++) {
    const cands = await p.evaluate(skip => {
      const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.pointerEvents === 'none' || el.disabled || el.closest('[disabled],.disabled')) return false; const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return 'scroll'; const top = document.elementFromPoint(cx, cy); return !!top && (el === top || el.contains(top) || top.contains(el)); };
      const out = [];
      document.querySelectorAll('[data-act]').forEach((el, i) => { if (skip.includes(el.dataset.act)) return; const v = vis(el); if (v) { el.dataset.mk = i; out.push({ i, act: el.dataset.act, arg: el.dataset.arg || '', scroll: v === 'scroll' }); } });
      return out;
    }, [...SKIP]);
    // three quick taps on Adam open his secret game: leave it again and check the cozy game is back
    if (await p.evaluate(() => !!document.querySelector('.agent'))) {
      await p.evaluate(() => DG.Agent.close()); await p.waitForTimeout(300);
      if (!(await p.evaluate(() => document.getElementById('app').style.display !== 'none' && !document.querySelector('.agent')))) flag('AGENT ADAM did not close back to the game');
      continue;
    }
    if (!cands.length) { if (++stuck > 3) { flag('STUCK: no clickable buttons', await p.evaluate(() => document.body.innerText.slice(0, 200))); break; } await p.waitForTimeout(400); continue; }
    stuck = 0;
    // prefer moving the day along sometimes, otherwise anything
    const PLAY = /^(endday|nextday|opendoor|resultdone|nextcust|accept|openreq|sew|buyandsew|buymissing|idea|rackdone|tipok|result|claim|claimall|keepmail|readmail)$/;
    const w = c => (/^(endday|nextday)$/.test(c.act) ? 14 : PLAY.test(c.act) ? 7 : /^(menu|menutab|albumtab|uptab|bulbcol|toggle|set)$/.test(c.act) ? 0.4 : 1) * (c.scroll ? 0.4 : 1);
    // pick a kind of action first, then one of its buttons (so 90 buy buttons don't drown out "end day")
    const groups = {};
    for (const x of cands) (groups[x.act] = groups[x.act] || []).push(x);
    const kinds = Object.values(groups);
    let tot = kinds.reduce((s, g) => s + w(g[0]), 0), r = rnd() * tot, grp = kinds[0];
    for (const g of kinds) { r -= w(g[0]); if (r <= 0) { grp = g; break; } }
    const c = grp[Math.floor(rnd() * grp.length)];
    // now and then go back to the shop, as a player would
    if (step % 30 === 29) await p.evaluate(() => { if (!document.querySelector('.overlay')) { window.scrollTo(0, 0); window.__mie.act('view', 'shop'); } });
    if (OUT && process.env.SNAP && step === +process.env.SNAP) { await p.screenshot({ path: OUT + '-snap.png' }); console.log('  at snap: overlays', await p.evaluate(() => [...document.querySelectorAll('.overlay')].map(o => o.firstElementChild && o.firstElementChild.className).join(',')), 'cands', [...new Set(cands.map(x => x.act))].join(' ')); }
    hist[c.act] = (hist[c.act] || 0) + 1; trail.push(c.act + ':' + c.arg); if (trail.length > 15) trail.shift();
    try {
      await p.evaluate(i => { const el = document.querySelector(`[data-mk="${i}"]`); if (el) { el.scrollIntoView({ block: 'center' });
        // only what a finger could really reach: after scrolling, the button must be the thing on top
        { const r0 = el.getBoundingClientRect(), t0 = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2); if (!t0 || !(el === t0 || el.contains(t0) || t0.contains(el)) || el.closest('[inert]')) return; } const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch', isPrimary: true }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); el.dispatchEvent(new MouseEvent('click', o)); } }, c.i);
    } catch (e) { flag('CLICK FAIL ' + c.act, e.message); }
    await p.waitForTimeout(c.act === 'sew' || c.act === 'opendoor' ? 400 : 60);
    const st = await p.evaluate(() => {
      const G = window.__mie && window.__mie.state, out = { day: G && G.day };
      const txt = (document.getElementById('app') || document.body).innerText + ' ' + [...document.querySelectorAll('.toast,.overlay,.modal')].map(e => e.innerText).join(' ');
      const m = txt.match(/.{0,40}\b(NaN|undefined|null|\[object Object\]|Infinity)\b.{0,40}/);
      if (m) out.bad = m[0].replace(/\s+/g, ' ');
      if (G) {
        const walk = (o, path, d) => { if (d > 8) return; if (typeof o === 'number' && !Number.isFinite(o)) out.nf = path; else if (o && typeof o === 'object') for (const k in o) { walk(o[k], path + '.' + k, d + 1); if (out.nf) return; } };
        walk(G, 'G', 0);
        out.money = G.money; out.rep = G.rep;
        if (G.inv) for (const kind of ['fabrics', 'items', 'clay', 'glazes']) for (const [k, v] of Object.entries(G.inv[kind] || {})) if (v < -1e-9) out.neg = kind + '.' + k + '=' + v;
      }
      out.txt = txt;
      return out;
    });
    if (st.bad) flag(`SCREEN TEXT "${st.bad.match(/NaN|undefined|null|\[object Object\]|Infinity/)[0]}" after ${c.act}`, st.bad);
    if (st.nf) flag('NON-FINITE NUMBER ' + st.nf + ' after ' + c.act);
    if (st.neg) { flag('NEGATIVE STOCK ' + st.neg + ' after ' + c.act); if (!tracedNeg) { tracedNeg = true; console.log('  NEG TRAIL:', trail.join(' > ')); } }
    if (process.env.WATCH) { const v = await p.evaluate(k => window.__mie.state.inv.glazes[k], process.env.WATCH); if (v !== globalThis.__w) { console.log('  ' + process.env.WATCH + ' = ' + v + ' after ' + c.act + ':' + c.arg + ' | ' + trail.slice(-6).join(' > ')); globalThis.__w = v; } }
    if (st.rep != null && (st.rep < 0 || st.rep > 100)) flag('REP OUT OF RANGE ' + st.rep);
    if (LANG === 'da') {
      for (const line of st.txt.split('\n')) if (EN.test(line) && line.length < 200 && !/Mie|Adam|Elizabeth|Dexter/.test(line.replace(EN, ''))) flag('ENGLISH IN DANISH: ' + line.trim().slice(0, 120));
    }
    if (st.day && st.day !== lastDay) { lastDay = st.day; if (OUT && shots < 3 && st.day % 5 === 0) await p.screenshot({ path: `${OUT}-day${st.day}.png` }).then(() => shots++); }
  }
  // the save must survive a reload
  const before = await p.evaluate(() => window.__mie && window.__mie.state && window.__mie.state.day);
  await p.evaluate(() => window.__mie && window.__mie.act && window.__mie.act('savenow'));
  await p.reload(); await p.waitForTimeout(700);
  const after = await p.evaluate(() => window.__mie && window.__mie.state && window.__mie.state.day);
  if (before !== after) flag(`SAVE/RELOAD day ${before} -> ${after}`);
  if (OUT) await p.screenshot({ path: `${OUT}-end.png` });
  console.log(`[monkey${process.env.OUT ? " " + process.env.OUT : ""}] lang=${LANG} start=${process.env.START || 'fresh'} reached day ${lastDay} in ${STEPS} clicks, ${issues.size} issue kinds`);
  if (process.env.HIST) console.log('  clicks:', JSON.stringify(hist));
  for (const [k, v] of issues) console.log(`  ${v.n}× ${k}${v.first ? '\n       ' + String(v.first).slice(0, 220) : ''}`);
  await b.close();
  server.close();
  process.exit(issues.size ? 1 : 0);
})();
