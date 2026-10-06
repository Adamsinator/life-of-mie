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
  const fresh = async (settings, save, keepDoor) => {
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
    // step in past the morning street (tested on its own below)
    if (!keepDoor) await p.evaluate(() => { if (document.querySelector('.morning-ov')) window.__mie.act('closeov'); });
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
  // toasts are added outside the app and must be translated too
  await p.evaluate(() => { window.__mie.state.money = 9999; window.__mie.act('view', 'market'); });
  await p.click('[data-act=buyf]');
  const toastTxt = await p.evaluate(() => document.querySelector('.toast').textContent);
  assert(/^Købte /.test(toastTxt), `toast not in Danish: ${toastTxt}`);
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

  // a returning player meets the street outside; one tap opens the door into the shop
  await fresh({ lang: 'en' }, newest, true);
  assert(await p.$('.morning-ov .street-scene'), 'morning scene on opening');
  assert(!(await p.$('.view')), 'nothing is drawn behind the street');
  await p.click('.morning-card [data-act=opendoor]');
  await p.waitForTimeout(1100);
  assert(!(await p.$('.morning-ov')) && await p.$('.view-shop'), 'the door opens into the shop');
  console.log('  morning door opens');
  // while a window is open, what is behind it can't be reached (not even with Tab + Enter on a keyboard)
  await p.evaluate(() => window.__mie.act('menu'));
  assert(await p.evaluate(() => document.querySelector('.overlay') && document.querySelector('main.view').inert && !document.querySelector('.ov-host').inert), 'background inert under a window');
  await p.evaluate(() => window.__mie.act('closeov'));
  assert(await p.evaluate(() => !document.querySelector('main.view').inert), 'background usable again');

  // Adam's secret: three quick taps on Adam open the spreadsheet, the sunglasses open Agent Adam, and every mission runs
  await p.evaluate(() => { window.__mie.act('view', 'home'); window.__mie.act('hometab', 'family'); });
  const adam = '[data-act=tapfamily][data-arg=adam]';
  await p.click(adam); await p.waitForTimeout(500);
  assert(!(await p.$('.agent')), 'one tap is just a hug');
  await p.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { await p.click(adam, { force: true }); await p.waitForTimeout(150); }
  await p.waitForSelector('.agent .w95', { timeout: 2000 });
  assert(await p.$('.agent .w95'), 'the cover story opens');
  await p.click('.w95-shades');
  await p.waitForFunction(() => document.querySelector('.agent canvas'), null, { timeout: 4000 });
  const agentRun = await p.evaluate(() => {
    const A = DG.Agent, out = [];
    for (let i = 0; i < A.LEVELS.length; i++) {
      A._start(i); A._keys.ArrowRight = true; A._keys.KeyX = true;
      for (let k = 0; k < 360; k++) A._step(1 / 120);
      out.push(A.state.p.x > 100 && !Number.isNaN(A.state.p.x));
    }
    A._keys.ArrowRight = false; A._keys.KeyX = false;
    // Dr. Mørk can be beaten and the exit appears
    const S = A.state; S.p.x = 118 * 16; for (let k = 0; k < 240; k++) A._step(1 / 120);
    S.boss.hp = 1; S.bullets.push({ mine: true, x: S.boss.x + 20, y: S.boss.y + 20, w: 5, h: 2, vx: 0, vy: 0, t: 1, dmg: 1 }); A._step(1 / 120);
    return { moved: out.every(Boolean), beaten: !!S.boss.down, exit: S.ents.some(e => e.type === 'exit') };
  });
  assert(agentRun.moved && agentRun.beaten && agentRun.exit, 'Agent Adam: ' + JSON.stringify(agentRun));
  await p.click('.agent-x');
  assert(!(await p.$('.agent')) && await p.isVisible('#app'), 'back to the cosy game');
  // iPad: left half of the screen is a floating stick, right half jumps, Adam fires by himself
  {
    await p.evaluate(() => { DG.Agent.open({ lang: 'en', progress: { best: {}, done: false, coins: 0, owned: ['pistol'], weapon: 'pistol', up: {} } }); DG.Agent.reveal(); });
    await p.waitForTimeout(1200);
    await p.evaluate(() => DG.Agent._start(0));
    const cdp = await ctx.newCDPSession(p);
    const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
    const vp = p.viewportSize(), ly = vp.height - 60;
    const x0 = await p.evaluate(() => DG.Agent.state.p.x);
    await t('touchStart', [[150, ly, 1]]);
    for (let i = 1; i <= 6; i++) { await t('touchMove', [[150 + i * 10, ly, 1]]); await p.waitForTimeout(16); }
    await p.waitForTimeout(400);
    assert(await p.evaluate(() => DG.Agent.state.p.x) > x0 + 20, 'sliding the left thumb runs');
    assert(await p.evaluate(() => document.querySelector('.agent').classList.contains('touch')), 'touch layout');
    await t('touchStart', [[210, ly, 1], [vp.width - 80, ly, 2]]); await p.waitForTimeout(80);
    assert(await p.evaluate(() => DG.Agent.state.p.vy < 0), 'the right thumb jumps while running');
    await t('touchEnd', []); await p.waitForTimeout(150);
    assert.strictEqual(await p.evaluate(() => DG.Agent.state.p.vx), 0, 'lifting the thumb stops Adam');
    await cdp.detach();
    await p.evaluate(() => DG.Agent.close());
  }
  console.log('  agent adam ok');

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
        const clean = el => { el.querySelectorAll('.coach-target, .still').forEach(x => x.classList.remove('coach-target', 'still')); el.querySelectorAll('[class=""]').forEach(x => x.removeAttribute('class')); el.querySelectorAll('[inert]').forEach(x => x.removeAttribute('inert')); return el; };
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
  // ironing takes care: wild sweeps leave creases, steaming each wrinkle clears them, a resting iron scorches
  const wrinkles = () => p.evaluate(() => { const m = document.querySelector('#mgtest svg').getScreenCTM(); return [...document.querySelectorAll('#mgtest .wrinkle')].map(w => { const t = /translate\(([\d.-]+) ([\d.-]+)\)/.exec(w.getAttribute('transform')); return [m.a * +t[1] + m.e, m.d * +t[2] + m.f, m.a]; }); });
  await mount('iron', { time: 4 });
  let bb = await p.locator('#mgtest svg').boundingBox();
  await p.mouse.move(bb.x + 5, bb.y + 5); await p.mouse.down();
  for (let row = 0; row < 8; row++) {
    const y = bb.y + bb.height * (0.08 + row * 0.12);
    await p.mouse.move(bb.x + bb.width * 0.97, y, { steps: 3 });
    await p.mouse.move(bb.x + bb.width * 0.03, y + bb.height * 0.06, { steps: 3 });
  }
  await p.mouse.up();
  await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 6000 });
  assert(await p.evaluate(() => window.__res) < 0.9, 'a few wild sweeps should not iron everything');
  await unmount();
  await mount('iron', { time: 30, design: { main: 'cotton' } });
  const wr = await wrinkles();
  await p.mouse.move(wr[0][0], wr[0][1]); await p.mouse.down();
  for (const [x, y, k] of wr) for (let a = 0; a < 14; a += 0.5) { await p.mouse.move(x + 9 * k * Math.cos(a), y + 9 * k * Math.sin(a)); await p.waitForTimeout(16); }
  await p.mouse.up();
  await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 6000 });
  assert.strictEqual(await p.evaluate(() => window.__res), 1, 'steaming every wrinkle irons the dress');
  await unmount();
  await mount('iron', { time: 30, design: { main: 'silk' } });
  bb = await p.locator('#mgtest svg').boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(1500); await p.mouse.up();
  assert(/scorch/.test(await p.evaluate(() => document.querySelector('#mgfb').textContent)), 'a resting iron scorches silk');
  await unmount();
  // cutting finishes as soon as the line is traced all the way round, and the cut shows where the scissors went
  await mount('cut', { time: 30, color: '#1f1f1f', design: { silhouette: 'aline', sleeves: 'none' } });
  const line = await p.evaluate(() => { const m = document.querySelector('#mgtest svg').getScreenCTM(); return document.querySelector('#mgtest .mg-line').getAttribute('points').split(' ').map(q => { const [x, y] = q.split(',').map(Number); return [m.a * x + m.e, m.d * y + m.f]; }); });
  await p.mouse.move(...line[0]); await p.mouse.down();
  for (const q of line) await p.mouse.move(q[0], q[1], { steps: 2 });
  await p.mouse.up();
  await p.waitForFunction(() => window.__res !== undefined, null, { timeout: 2000 });
  assert(await p.evaluate(() => window.__res) > 0.95, 'a clean cut along the line scores well and ends at once');
  assert(await p.evaluate(() => document.querySelector('#mgtrail').getAttribute('d').length > 100), 'the cut is drawn');
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
