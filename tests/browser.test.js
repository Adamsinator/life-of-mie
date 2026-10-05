// Browser checks in a real Chromium (needs Playwright): npm run test:browser
// Danish text, old saves in the page, damaged-save rescue, screen patching and the touch mini-games.
// Set PLAYWRIGHT=/path/to/node_modules/playwright and CHROMIUM=/path/to/chromium if they are not found.
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  // no fonts or other outside requests in tests
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const fresh = async (settings, save) => {
    await p.goto(URL);
    await p.evaluate(([s, g]) => {
      localStorage.clear();
      localStorage.setItem('mies-atelier-settings', JSON.stringify(Object.assign({ tips: false }, s)));
      if (g) {
        localStorage.setItem('mies-atelier-profiles', JSON.stringify({ active: 'pT', list: [{ id: 'pT', name: 'Test', day: 1 }] }));
        localStorage.setItem('mies-atelier-save-pT', g);
      }
    }, [settings, save]);
    await p.reload();
    await p.waitForFunction(() => window.__mie);
  };
  const fixtures = fs.readdirSync(path.join(__dirname, 'fixtures')).sort();
  const oldest = fs.readFileSync(path.join(__dirname, 'fixtures', fixtures[0]), 'utf8');
  const newest = fs.readFileSync(path.join(__dirname, 'fixtures', fixtures[fixtures.length - 1]), 'utf8');

  // 1. Danish everywhere
  await fresh({ lang: 'da' }, newest);
  for (const v of ['shop', 'market', 'workshop', 'studio', 'home', 'upgrades', 'goals']) {
    await p.evaluate(v => window.__mie.act('view', v), v);
    const txt = await p.evaluate(() => document.getElementById('app').innerText);
    assert(/Butik/.test(txt) && /Marked/.test(txt), `${v}: navigation is not in Danish`);
    const english = (txt.match(/\b(the|and|with|your|customers?|today|price)\b/gi) || []);
    assert(english.length < 3, `${v}: English words in Danish mode: ${english.join(', ')}`);
  }
  console.log('  Danish screens ok');

  // 2. a save from the very first version opens in the page
  await fresh({ lang: 'en' }, oldest);
  assert.strictEqual(await p.evaluate(() => window.__mie.state.day), JSON.parse(oldest).day);
  assert(await p.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('mies-atelier-premigrate-pT'))), 'pre-upgrade copy');
  console.log('  first-version save opens');

  // 3. a damaged save is kept and can be restored from the backups
  await p.evaluate(() => localStorage.setItem('mies-atelier-save-pT', '{"version":1,"day":'));
  await p.reload(); await p.waitForFunction(() => window.__mie);
  assert(await p.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('mies-atelier-rescue-pT'))), 'rescue copy');
  assert(await p.isVisible('[data-act=restorebackup]'), 'backups offered');
  await p.click('[data-act=restorebackup]'); await p.click('[data-act=restorebackup]');
  assert.strictEqual(await p.evaluate(() => window.__mie.state.day), JSON.parse(oldest).day);
  console.log('  damaged save rescued and restored');

  // 4. patched screens equal freshly built ones, in both languages
  for (const lang of ['da', 'en']) {
    await fresh({ lang }, newest);
    const acts = [['view', 'market'], ['buyf', 'cotton'], ['buyf', 'silk'], ['view', 'home'], ['hometab', 'wardrobe'], ['hometab', 'family'],
      ['view', 'shop'], ['openreq', '0'], ['closeov'], ['view', 'upgrades'], ['menu'], ['menutab', 'save'], ['menutab', 'settings'], ['closeov'], ['view', 'studio']];
    for (const [a, arg] of acts) {
      await p.evaluate(([a, arg]) => window.__mie.act(a, arg), [a, arg]);
      const diff = await p.evaluate(() => {
        const t = document.createElement('template'); t.innerHTML = window.__mie.html; DG.translateTree(t.content);
        const ref = document.createElement('div'); ref.id = 'app'; ref.appendChild(t.content);
        const clean = el => { el.querySelectorAll('.coach-target, .still').forEach(x => x.classList.remove('coach-target', 'still')); el.querySelectorAll('[class=""]').forEach(x => x.removeAttribute('class')); return el; };
        const live = clean(document.getElementById('app').cloneNode(true));
        clean(ref);
        return live.isEqualNode(ref) ? null : 'differs';
      });
      assert(!diff, `${lang}: screen after ${a} ${arg || ''} differs from a fresh render`);
    }
  }
  console.log('  screen patching matches fresh renders');

  // 5. mini-games respond to touch-like input
  const mount = (kind, opts) => p.evaluate(([k, o]) => {
    const h = document.createElement('div'); h.id = 'mgtest'; h.style.cssText = 'position:fixed;inset:0;z-index:999;background:#fff;width:700px;padding:20px';
    document.body.appendChild(h);
    window.__res = undefined;
    if (o.pot) o.pot = { clay: DG.CLAYS[0].id, shape: 'vase', glaze: DG.GLAZES[0].id, deco: 'handpainted' };
    window.__stop = DG.MiniGames[k](h, o, r => { window.__res = r; });
  }, [kind, opts]);
  const unmount = () => p.evaluate(() => { window.__stop(); document.getElementById('mgtest').remove(); });
  await mount('iron', { time: 30 });
  let bb = await p.locator('#mgtest svg').boundingBox();
  await p.mouse.move(bb.x + 5, bb.y + 5); await p.mouse.down();
  for (let row = 0; row < 8; row++) {
    const y = bb.y + bb.height * (0.08 + row * 0.12);
    await p.mouse.move(bb.x + bb.width * 0.97, y, { steps: 3 });   // fast: few samples per sweep
    await p.mouse.move(bb.x + bb.width * 0.03, y + bb.height * 0.06, { steps: 3 });
  }
  await p.mouse.up();
  await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 3000 });
  assert(await p.evaluate(() => window.__res) >= 0.9, 'fast ironing sweeps should catch the wrinkles');
  await unmount();
  await mount('paint', { pot: 1 });
  bb = await p.locator('#paintpot svg').boundingBox();
  await p.mouse.move(bb.x + bb.width * 0.35, bb.y + bb.height * 0.6); await p.mouse.down();
  await p.mouse.move(bb.x + bb.width * 0.65, bb.y + bb.height * 0.65, { steps: 20 }); await p.mouse.up();
  await p.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height * 0.45);
  await p.click('#pdone');
  const strokes = await p.evaluate(() => window.__res);
  assert.strictEqual(strokes.length, 2);
  assert(strokes.every(s => s.f === 1 && s.p.length > 0 && s.n > 0));
  await unmount();
  console.log('  mini-games ok');

  assert.deepStrictEqual(errors, [], 'page errors');
  await browser.close();
  server.close();
  console.log('browser checks passed');
})().catch(e => { console.error(e); process.exit(1); });
