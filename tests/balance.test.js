// Balance + sanity checks for the scoring model. Run: node tests/balance.test.js
for (const f of ['data', 'logic', 'render']) require(`../js/${f}.js`);
const DG = globalThis.DG;
const assert = require('assert');
const pick = a => a[Math.floor(Math.random() * a.length)];

function stateWith(upg) {
  const G = DG.newGame();
  Object.assign(G.upgrades, upg);
  G.rep = 100;
  return G;
}
function randomDesign(G, liked) {
  const fabs = DG.FABRICS.filter(f => DG.isUnlocked(G, f));
  const main = pick(fabs);
  const sil = pick(DG.SILHOUETTES);
  const extras = DG.EXTRAS.filter(e => DG.isUnlocked(G, e) && Math.random() < 0.3).map(e => e.id);
  const closures = DG.CLOSURES.filter(c => !c.item || DG.isUnlocked(G, DG.byId(DG.ITEMS, c.item)));
  const accent = Math.random() < 0.4 ? pick(fabs) : null;
  return {
    main: main.id, mainColor: main.colors ? main.colors[0] : liked,
    accent: accent && accent.id, accentColor: accent && accent.colors ? accent.colors[0] : pick(DG.COLORS).id,
    silhouette: sil.id, length: pick(DG.LENGTHS).id, neckline: pick(DG.NECKLINES).id,
    sleeves: pick(DG.SLEEVES).id, closure: sil.noClosure ? 'none' : pick(closures.filter(c => c.id !== 'none')).id, extras,
  };
}

const early = stateWith({});
const late = stateWith({ supplier: 2, embroidery: 2 });
console.log('archetype    | budget | best S (tier0) cost | best S (all) cost | median random S');
for (const a of DG.ARCHETYPES) {
  const cust = { weights: a.w, targets: a.t, styles: a.styles, reqs: a.reqs.map(r => r[0]),
    liked: a.colors ? a.colors.liked : ['sage', 'rose'], disliked: ['black'], budget: Math.round((a.budget[0] + a.budget[1]) / 2), loyal: false };
  const run = G => {
    let best = { S: -1 }, all = [];
    for (let i = 0; i < 15000; i++) {
      const d = randomDesign(G, cust.liked[0]);
      const an = DG.analyze(d, G);
      if (an.issues.some(x => !x.startsWith('Need'))) continue;
      const ev = DG.evaluate(cust, d, G, 0.8);
      all.push(ev.S);
      // prefer higher score, then cheaper
      if (ev.S > best.S || (ev.S === best.S && an.cost < best.cost)) best = { S: ev.S, cost: an.cost, d };
    }
    all.sort((x, y) => x - y);
    return { best, median: all[all.length >> 1] };
  };
  const e = run(early), l = run(late);
  console.log(`${a.id.padEnd(12)} | ${String(cust.budget).padStart(6)} | ${String(e.best.S).padStart(6)} ${String(e.best.cost).padStart(8)} | ${String(l.best.S).padStart(6)} ${String(l.best.cost).padStart(8)} | ${l.median}`);
  assert(l.best.S >= 85, `${a.id}: a great dress must be possible`);
  if (a.minRep <= 10) assert(e.best.S >= 80, `${a.id}: early customers must be satisfiable with starter fabrics`);
  assert(l.best.cost < cust.budget, `${a.id}: best dress should be profitable`);
}

// render sanity: no NaN / undefined in any combination
const G = late;
let n = 0;
for (const sil of DG.SILHOUETTES) for (const len of DG.LENGTHS) for (const neck of DG.NECKLINES) for (const sl of DG.SLEEVES) {
  const d = { main: 'silk', mainColor: 'rose', accent: 'lace', accentColor: 'white', silhouette: sil.id, length: len.id,
    neckline: neck.id, sleeves: sl.id, closure: 'pearl', extras: DG.EXTRAS.map(e => e.id) };
  const svg = DG.renderDress(d, 't');
  assert(!/NaN|undefined/.test(svg), `bad svg for ${sil.id}/${len.id}/${neck.id}/${sl.id}`);
  n++;
}
const svg0 = DG.renderDress({ main: null, mainColor: 'white', accent: null, accentColor: 'white', silhouette: 'aline', length: 'knee', neckline: 'round', sleeves: 'none', closure: 'zipper', extras: [] }, 'x');
assert(!/NaN|undefined/.test(svg0));
console.log(`rendered ${n} dress combinations cleanly`);

// customer generation & a full simulated week
const S = DG.newGame();
for (let day = 0; day < 7; day++) {
  DG.startDay(S);
  assert(S.queue.length >= 1);
  for (const c of S.queue) { assert(c.text.length > 20 && c.budget > 0); assert(!/undefined|NaN/.test(c.text), c.text); }
  DG.endDay(S);
}
console.log('sample request:', DG.genCustomer(S).text);
console.log('all checks passed');

// ---- v1.1: decor, staff, marketing, rack ----
{
  const old = DG.newGame();
  delete old.decor; delete old.staff; delete old.marketing; delete old.rack; delete old.boost;
  DG.ensureDefaults(old);
  assert.deepStrictEqual(old.rack, []);
  assert.strictEqual(DG.charm(old), 0);

  const G2 = DG.newGame();
  DG.startDay(G2);
  G2.decor.owned = ['plant', 'mirror'];
  G2.decor.wallpaper = 'midnight';
  assert.strictEqual(DG.charm(G2), 1 + 2 + 2);

  // apprentice cuts 10% less fabric
  const d = DG.newDesign(G2); d.main = 'cotton';
  const before = DG.analyze(d, G2).mainM;
  G2.staff.apprentice = true;
  assert(Math.abs(DG.analyze(d, G2).mainM - DG.round1(before * 0.9)) <= 0.1, 'apprentice saves fabric');

  // marketing adds customers the next day
  const base = DG.newGame(); base.rep = 0;
  let n0 = 0, n1 = 0;
  for (let i = 0; i < 200; i++) {
    const a = DG.newGame(); DG.startDay(a); DG.startDay(a); n0 += a.queue.length;
    const b = DG.newGame(); DG.startDay(b); b.marketing = ['flyers', 'show']; DG.startDay(b); n1 += b.queue.length;
  }
  assert(Math.abs((n1 - n0) / 200 - 3) < 0.4, `campaigns add ~3 customers (got ${(n1 - n0) / 200})`);

  // wages and rack sales at day end; assistant prevents rep loss
  G2.staff.assistant = true;
  G2.rack = [DG.rackItem(d, G2, 1)];
  const repBefore = G2.rep, moneyBefore = G2.money;
  const res = DG.endDay(G2);
  assert.strictEqual(res.wages, 1500);
  assert.strictEqual(G2.rep, repBefore, 'assistant keeps reputation');
  assert.strictEqual(G2.money, moneyBefore + res.rackIncome - res.rent - res.wages + res.salary - res.housing.pay - res.tax + res.help);

  // a rack dress should earn less than serving a real customer of similar spend
  const it = DG.rackItem(d, G2, 0.8);
  console.log(`rack: cotton A-line costs ${it.cost} kr, tagged ${it.price} kr, sells with p=${DG.rackSaleChance(G2).toFixed(2)}/night`);
  assert(it.price > it.cost && it.price < it.cost + 1500);
  assert(!/NaN|undefined/.test(DG.renderShop(G2)));
  console.log('v1.1 checks passed');
}

// ---- v1.2: seasons, pottery, goals, upstairs floor ----
{
  const G = DG.newGame();
  const seen = [];
  for (let d = 0; d < 29; d++) { DG.startDay(G); seen.push(DG.season(G).id); DG.endDay(G); G.gameOver = false; G.money = 1e5; }
  assert.deepStrictEqual([seen[0], seen[7], seen[14], seen[21], seen[28]], ['spring', 'summer', 'autumn', 'winter', 'spring']);

  // seasonal prices: wool cheaper in summer than in winter
  const S = DG.newGame(); S.day = 8; DG.FABRICS.forEach(f => { S.market.mult[f.id] = 1; });
  const summerWool = DG.fabricPrice(S, 'wool'); S.day = 22; const winterWool = DG.fabricPrice(S, 'wool');
  assert(summerWool < winterWool, 'wool cheaper off-season');

  // summer brings more picnic customers than winter
  const count = (day, id) => { const X = DG.newGame(); X.rep = 100; X.day = day; let n = 0; for (let i = 0; i < 2000; i++) if (DG.genCustomer(X).arche === id) n++; return n; };
  assert(count(8, 'summer') > 3 * count(22, 'summer'), 'summer picnics in summer');

  // season adjusts satisfaction
  const cust = { weights: { comfort: 1 }, targets: { comfort: 5 }, styles: ['aline'], reqs: [], liked: [], disliked: [], budget: 500 };
  const d = DG.newDesign(S); d.main = 'wool';
  S.day = 22; const w = DG.evaluate(cust, d, S, 0.8);
  S.day = 8; const su = DG.evaluate(cust, d, S, 0.8);
  assert.strictEqual(w.seasonAdj, 3); assert.strictEqual(su.seasonAdj, -4);

  // pottery: consume, fire, crack odds, shelf capacity
  const P = DG.newGame(); DG.startDay(P); P.upgrades.pottery = 1;
  P.inv.clay.stoneware = 20; P.inv.glazes.celadon = 5;
  const pot = { clay: 'stoneware', shape: 'vase', glaze: 'celadon', deco: 'carved' };
  assert.deepStrictEqual(DG.analyzePot(pot, P).issues, []);
  for (let i = 0; i < 3; i++) DG.throwPot(P, pot, 0.8);
  assert.strictEqual(P.inv.clay.stoneware, 15.5); assert.strictEqual(P.inv.glazes.celadon, 2);
  assert(DG.analyzePot(pot, P).issues.some(x => x.includes('kiln is full')));
  let cracks = 0, trials = 4000;
  const c = DG.crackChance(pot, 0.5, P);
  for (let i = 0; i < trials; i++) { const Q = DG.newGame(); Q.upgrades.pottery = 1; Q.kiln = [{ pot, price: 100, crack: c }]; cracks += DG.endDayPottery(Q).cracked.length; }
  assert(Math.abs(cracks / trials - c) < 0.03, `crack rate ${cracks / trials} vs ${c}`);
  P.upgrades.pottery = 2; assert.strictEqual(DG.crackChance(pot, 0.5, P), c / 2);
  const cost = DG.analyzePot(pot, P).cost, price = DG.potPrice(pot, 0.8);
  console.log(`pottery: stoneware celadon carved vase costs ${cost} kr, sells for ${price} kr (crack risk ${(DG.crackChance(pot, 0.8, P) * 100).toFixed(0)}% with electric kiln)`);
  assert(price > cost && price < 8 * cost, 'pottery pays for the work, not a jackpot');

  // goals: progress, stays complete, claim once
  const Gg = DG.newGame(); DG.startDay(Gg);
  Gg.rep = 31; DG.updateGoals(Gg); Gg.rep = 10;
  assert(DG.claimableGoals(Gg).includes('rep30'));
  const m0 = Gg.money; assert.strictEqual(DG.claimGoal(Gg, 'rep30'), 3000); assert.strictEqual(DG.claimGoal(Gg, 'rep30'), 0);
  assert.strictEqual(Gg.money, m0 + 3000);

  // floor: more customers and hangers, more rent
  const F = DG.newGame(); const r0 = DG.rent(F), h0 = DG.rackCapacity(F); F.upgrades.floor = 1;
  assert.strictEqual(DG.rent(F) - r0, 700); assert.strictEqual(DG.rackCapacity(F) - h0, 2);

  // v1.1 save without pottery fields migrates
  const old = DG.newGame(); delete old.kiln; delete old.shelf; delete old.goals; delete old.inv.clay; delete old.upgrades.pottery; delete old.stats.byArche;
  DG.ensureDefaults(old); assert.deepStrictEqual(old.kiln, []); assert.strictEqual(old.upgrades.pottery, 0);
  for (const sh of DG.POT_SHAPES) for (const gl of DG.GLAZES) assert(!/NaN|undefined/.test(DG.renderPot({ clay: 'porcelain', shape: sh.id, glaze: gl.id, deco: 'goldrim' }, 'x', { wheel: true, grow: 0.3 })));
  console.log('v1.2 checks passed');
}

// ---- v1.3: home, painting, kneading, profiles ----
{
  const H = DG.newGame(); DG.startDay(H);
  assert.strictEqual(H.home.happy, 70);
  assert(DG.doActivity(H, 'play')); assert(!DG.doActivity(H, 'play'), 'free activity once per day');
  assert(DG.doActivity(H, 'icecream')); assert(!DG.canDoActivity(H, 'zoo'), 'one outing per day');
  assert.strictEqual(H.home.happy, 88);
  assert.strictEqual(DG.homeMood(H).sat, 2);
  const m0 = H.money; assert(DG.buyHomeItem(H, 'teddy')); assert.strictEqual(H.money, m0 - 250); assert(!DG.buyHomeItem(H, 'teddy'));
  assert.strictEqual(DG.homeDecay(H), 9);
  H.home.catFood = 0; H.home.happy = 50;
  const r = DG.endDayHome(H); assert.strictEqual(r.drop, 9 + 8); assert(r.hungry); assert.strictEqual(H.home.happy, 33);
  H.home.happy = 20; assert.strictEqual(DG.homeMood(H).sat, -3);

  // painting value: more colours/ink -> more value, capped at 1.4
  assert.strictEqual(DG.paintMult({ paint: [] }), 1);
  const one = DG.paintMult({ paint: [{ c: '#000', w: 2.5, n: 20 }] });
  const four = DG.paintMult({ paint: ['#1', '#2', '#3', '#4', '#5'].map(c => ({ c, w: 4.5, n: 400 })) });
  assert(one > 1 && four > one && four <= 1.4, `paint mult ${one} ${four}`);
  const pot = { clay: 'stoneware', shape: 'jug', glaze: 'cream', deco: 'handpainted', paint: [{ c: '#a3262e', w: 2.5, n: 30, d: 'M50 70L70 80' }] };
  assert(DG.potPrice(pot, 0.8) > DG.potPrice(Object.assign({}, pot, { paint: [] }), 0.8));
  assert(DG.renderPot(pot, 'z').includes('#a3262e'), 'strokes rendered');
  // kneading lowers crack risk
  const P = DG.newGame(); P.upgrades.pottery = 1;
  assert(DG.crackChance(pot, 0.5, P, 1) < DG.crackChance(pot, 0.5, P, 0));

  // profiles + save codes (node polyfills)
  const store = {};
  globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  globalThis.btoa = s => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = s => Buffer.from(s, 'base64').toString('binary');
  require('../js/profiles.js');
  // legacy single save becomes "Player 1"
  store['mies-atelier-save-v1'] = JSON.stringify(Object.assign(DG.newGame(), { day: 4 }));
  assert.strictEqual(DG.Profiles.list()[0].name, 'Player 1');
  assert.strictEqual(DG.Profiles.loadGame().day, 4);
  assert(!('mies-atelier-save-v1' in store));
  const g2 = DG.newGame(); g2.day = 12; g2.known.push({ name: 'Lærke Ø' });
  DG.Profiles.create('Elizabeth', g2);
  assert.strictEqual(DG.Profiles.active().name, 'Elizabeth');
  const code = DG.Profiles.exportCode(g2);
  const back = DG.Profiles.parseCode(code);
  assert.strictEqual(back.day, 12); assert.strictEqual(back.known[0].name, 'Lærke Ø', 'unicode survives the code');
  assert.throws(() => DG.Profiles.parseCode('hello'), /MIE1/);
  assert.throws(() => DG.Profiles.parseCode('MIE1:abc'), /damaged|valid/);
  DG.Profiles.remove(DG.Profiles.active().id);
  assert.strictEqual(DG.Profiles.list().length, 1);
  assert.strictEqual(DG.Profiles.settings().minigames, 'full');
  console.log('v1.3 checks passed');
}

// ---- v1.4: seasonal outings, SKAT, family dreams ----
{
  const G = DG.newGame(); G.money = 5000;
  G.day = 3;  // spring
  assert(!DG.canDoActivity(G, 'beach'), 'no beach in spring');
  assert(DG.canDoActivity(G, 'badminton'));
  G.day = 10; assert(DG.canDoActivity(G, 'beach'), 'beach in summer');
  G.day = 24; assert(DG.canDoActivity(G, 'movie') && !DG.canDoActivity(G, 'beach'), 'movie night in winter only');
  assert.strictEqual(DG.skat(100), 0); assert.strictEqual(DG.skat(1500), 500); assert.strictEqual(DG.skat(4000), 1702);
  const T = DG.newGame(); DG.startDay(T); T.money = 10000; T.today.income = 5000; T.today.spent = 0;
  const m0 = T.money, res = DG.endDay(T);
  assert.strictEqual(res.tax, DG.skat(5000 - res.rent - res.wages));
  assert.strictEqual(T.money, m0 - res.rent - res.wages - res.tax + res.salary - res.housing.pay);
  // housing ladder: 5 moves to the Strandvejsvilla, each raising the happiness floor
  const H = DG.newGame(); DG.startDay(H);
  assert.strictEqual(DG.house(H).id, 'flat');
  assert.strictEqual(DG.moveCash(H), 225000, '5% down on 4.5m');
  H.money = 300000; assert(DG.moveHouse(H)); assert.strictEqual(DG.house(H).id, 'frb');
  assert.strictEqual(H.home.loan.principal, 4275000); assert.strictEqual(H.money, 75000);
  const yearly = H.home.loan.payment * 365, annuity = 4275000 * 0.04 / (1 - Math.pow(1.04, -30));
  assert(Math.abs(yearly - annuity) < 1, `annuity ${yearly} vs ${annuity}`);
  assert.strictEqual(DG.moveCash(H), 100000, 'Valby down payment minus equity');
  assert(!DG.moveHouse(H), 'cannot afford Valby');
  // one day of the mortgage: interest deductible, principal goes down
  const p0 = H.home.loan.principal, md = DG.mortgageDay(H);
  assert(md.interest > 0 && H.home.loan.principal < p0 && Math.abs(p0 + md.interest - md.pay - H.home.loan.principal) < 1);
  // equity carries over when moving up
  H.money = 1e8; while (DG.nextHouse(H)) assert(DG.moveHouse(H));
  assert.strictEqual(DG.house(H).id, 'strandvej');
  assert(H.home.loan.principal <= 0.95 * 75e6 + 1 && H.home.loan.principal > 0.9 * 75e6, `villa loan ${H.home.loan.principal}`);
  const paid = DG.repayLoan(H, 1e6); assert.strictEqual(paid, 1e6);
  DG.repayLoan(H, Infinity); assert.strictEqual(H.home.loan.principal, 0); assert.strictEqual(DG.housingCostPerDay(H), 0);
  H.home.happy = 52; H.home.catFood = 0; DG.endDayHome(H); assert.strictEqual(H.home.happy, 50, 'villa happiness floor');
  assert(DG.claimableGoals(H).includes('dream') && DG.claimableGoals(H).includes('move1'));
  // accountant lowers SKAT
  const A = DG.newGame(); assert.strictEqual(DG.skat(5000, A), 2222); A.upgrades.accountant = 1; assert.strictEqual(DG.skat(5000, A), 1702);
  A.upgrades.accountant = 2; assert.strictEqual(DG.skat(5000, A), 887);
  // old saves: dreams become houses
  const O = DG.newGame(); delete O.home.house; O.home.items = ['teddy', 'garden']; DG.ensureDefaults(O);
  assert.strictEqual(O.home.house, 2); assert.deepStrictEqual(O.home.items, ['teddy']);
  console.log('v1.4 checks passed');
}

// ---- v1.6: wardrobe ----
{
  const G = DG.newGame(); DG.startDay(G);   // day 1, spring
  assert.strictEqual(DG.styleCharm(G), 0);
  const c0 = DG.charm(G);
  G.money = 5000;
  assert(DG.buyClothes(G, 'blazer')); assert.strictEqual(G.wardrobe.wear.outfit, 'blazer'); assert.strictEqual(G.money, 2000);
  assert(!DG.buyClothes(G, 'blazer'), 'cannot buy twice');
  assert.strictEqual(DG.styleCharm(G), 3); assert.strictEqual(DG.charm(G), c0 + 3);
  assert(DG.buyClothes(G, 'clip'));                     // spring piece: 1 + 1 seasonal
  assert.strictEqual(DG.styleCharm(G), 3 + 2);
  assert(DG.claimableGoals(G).includes('style'));
  assert(DG.wearClothes(G, 'worktop')); assert.strictEqual(DG.styleCharm(G), 2);
  assert(!DG.wearClothes(G, 'gown'), 'cannot wear what she does not own');
  const look = DG.mieLook(G);
  assert.strictEqual(look.acc, 'clip'); assert.strictEqual(look.measure, false); assert.strictEqual(look.hair, '#3b2418');
  const old = DG.newGame(); delete old.wardrobe; DG.ensureDefaults(old); assert.strictEqual(old.wardrobe.wear.glasses, 'rdark');
  console.log('v1.6 checks passed');
}

// ---- v1.8: cozy rules ----
{
  // no game over: the family tops the money up instead
  const G = DG.newGame(); DG.startDay(G);
  G.money = -50000;
  const res = DG.endDay(G);
  assert.strictEqual(G.gameOver, false);
  assert.strictEqual(G.money, DG.HELP_FLOOR);
  assert(res.help > 0 && G.stats.helped === 1);
  // nobody is turned away: waiting customers come back the next morning, no reputation lost
  const H = DG.newGame(); H.rep = 50; DG.startDay(H);
  while (H.queue.length < 2) H.queue.push(DG.genCustomer(H));
  const names = H.queue.slice(0, 3).map(c => c.name), rep0 = H.rep;
  DG.endDay(H);
  assert.strictEqual(H.rep, rep0);
  DG.startDay(H);
  assert.deepStrictEqual(H.queue.slice(0, names.length).map(c => c.name), names.slice(0, H.queue.length));
  assert(H.queue[0].back);
  // a weak dress costs at most a little reputation
  const cust = DG.genCustomer(H);
  const bad = DG.evaluate(cust, DG.newDesign(H), H, 0);
  assert(bad.repDelta >= -0.6, `repDelta ${bad.repDelta}`);
  // every day is written in the ledger
  assert.strictEqual(H.ledger.length, 1); assert.strictEqual(H.ledger[0].day, 1);
  // an old save that had ended is opened again, with money to carry on
  const O = DG.newGame(); O.gameOver = true; O.money = -300; delete O.ledger;
  DG.ensureDefaults(O);
  assert.strictEqual(O.gameOver, false); assert.strictEqual(O.money, DG.HELP_FLOOR); assert.deepStrictEqual(O.ledger, []);
  console.log('v1.8 cozy checks passed');
}
