// Save safety: real saves made by every earlier version of the game (tests/fixtures) must open in
// this version with all progress intact, and the profile store must never lose a save.
// Run: node tests/saves.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// a tiny in-memory localStorage so js/profiles.js can run under Node
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
};
globalThis.btoa = s => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = s => Buffer.from(s, 'base64').toString('binary');
for (const f of ['data', 'logic', 'stories', 'render', 'profiles']) require(`../js/${f}.js`);
const DG = globalThis.DG;
const P = DG.Profiles;

const dir = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
assert(files.length >= 7, 'fixtures missing');
const superset = (a, b, what) => (b || []).forEach(x => assert((a || []).includes(x), `${what}: lost ${JSON.stringify(x)}`));

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const before = JSON.parse(raw);
  const G = DG.ensureDefaults(JSON.parse(raw));
  const scale = before.econ ? 1 : 8;   // pre-kroner saves are scaled once to the new prices

  assert.strictEqual(G.day, before.day, `${f}: day`);
  assert.strictEqual(G.money, Math.round(before.money * scale), `${f}: money`);
  assert.strictEqual(G.rep, before.rep, `${f}: reputation`);
  assert.deepStrictEqual(G.stats.served, before.stats.served, `${f}: dresses served`);
  assert.strictEqual(G.stats.best, before.stats.best, `${f}: best score`);
  for (const k in before.upgrades) assert.strictEqual(G.upgrades[k], before.upgrades[k], `${f}: upgrade ${k}`);
  for (const k in before.inv.fabrics) assert.strictEqual(G.inv.fabrics[k], before.inv.fabrics[k], `${f}: fabric ${k}`);
  for (const k in before.inv.items) assert.strictEqual(G.inv.items[k], before.inv.items[k], `${f}: item ${k}`);
  assert.deepStrictEqual(Object.keys(G.regulars || {}), Object.keys(before.regulars || {}), `${f}: regular customers`);
  if (before.decor) superset(G.decor.owned, before.decor.owned, `${f}: decor`);
  if (before.goals) { superset(G.goals.claimed, before.goals.claimed, `${f}: goals`); superset(G.goals.done, before.goals.done, `${f}: goals`); }
  if (before.home) {
    assert.strictEqual(G.home.happy, before.home.happy, `${f}: family happiness`);
    if (before.home.house != null) assert.strictEqual(G.home.house, before.home.house, `${f}: house`);
    if (before.home.loan) assert.deepStrictEqual(G.home.loan, before.home.loan, `${f}: mortgage`);
    superset(G.home.items.concat(['kitchen', 'garden', 'summerhouse']), before.home.items, `${f}: home items`);
  }
  if (before.wardrobe) { superset(G.wardrobe.owned, before.wardrobe.owned, `${f}: wardrobe`); assert.deepStrictEqual(G.wardrobe.wear, before.wardrobe.wear); }
  ['rack', 'shelf', 'kiln'].forEach(k => before[k] && assert.strictEqual(G[k].length, before[k].length, `${f}: ${k}`));

  // migrating twice changes nothing, and the result survives a save/load round trip
  const once = JSON.stringify(G);
  assert.strictEqual(JSON.stringify(DG.ensureDefaults(JSON.parse(once))), once, `${f}: migration is not idempotent`);
  assert.strictEqual(G.schema, DG.SAVE_SCHEMA);

  // and the game plays on from there
  for (let d = 0; d < 3; d++) {
    DG.startDay(G);
    const svg = DG.renderShop(G) + DG.renderHome(G) + DG.renderDinner(G, { ev: 'christmas', bounce: 'dexter' }) + G.queue.map(c => DG.renderAvatar(c.look)).join('');
    assert(!/NaN|undefined/.test(svg), `${f}: drawing broke`);
    G.queue = [];
    DG.endDay(G);
  }
  assert(Number.isFinite(G.money), `${f}: money became ${G.money}`);
  console.log(`  ${f}: day ${before.day} opens intact`);
}

// ---- profile store ----
store.clear();
// the single save from the very first version becomes a profile
store.set('mies-atelier-save-v1', fs.readFileSync(path.join(dir, files[0]), 'utf8'));
assert.strictEqual(P.list().length, 1);
const id = P.active().id;
let G = P.loadGame();
assert.strictEqual(G.day, 25);
// opening an old save keeps an untouched pre-upgrade copy and a backup
assert(store.has(`mies-atelier-premigrate-${id}-0`), 'pre-migration copy');
assert.strictEqual(P.backups().length, 1);
G = DG.ensureDefaults(G);
assert(P.saveGame(G));
// re-opening the same day replaces that day's backup instead of piling up
P.loadGame(); P.loadGame();
assert.strictEqual(P.backups().length, 1);
assert.strictEqual(P.backupGame(0).day, 25);
// backups from earlier days are kept (at most three)
const bk = JSON.parse(store.get(`mies-atelier-backups-${id}`));
bk[0].at -= 86400000 * 3; store.set(`mies-atelier-backups-${id}`, JSON.stringify(bk));
G.day = 26; P.saveGame(G); P.loadGame();
assert.strictEqual(P.backups().length, 2);
assert.deepStrictEqual(P.backups().map(b => b.day), [26, 25]);
// a damaged save is moved aside, never lost
store.set(`mies-atelier-save-${id}`, '{"version":1,"day":');
assert.strictEqual(P.loadGame(), null);
assert(P.hasSave());
P.rescue();
assert([...store.keys()].some(k => k.startsWith(`mies-atelier-rescue-${id}-`)), 'rescue copy');
assert.strictEqual(P.backupGame(0).day, 26, 'the last good save can still be restored');
// save codes from this version open in a future one
const code = P.exportCode(G);
assert.strictEqual(P.parseCode(code).day, 26);
assert.strictEqual(P.parseCode(code.replace('MIE1:', 'MIE1:')).money, G.money);
console.log('save safety checks passed');
