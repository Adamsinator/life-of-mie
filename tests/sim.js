// Bot smoke test: plays many full games through the game logic and checks invariants after every step.
// Run: node tests/sim.js [games] [days]
for (const f of ['data', 'logic', 'stories', 'render']) require(`../js/${f}.js`);
const DG = globalThis.DG;
const GAMES = +process.argv[2] || 60, DAYS = +process.argv[3] || 60;
const HUMAN = process.argv[4] === 'human';   // few design attempts, ignores colours half the time
const pick = a => a[Math.floor(Math.random() * a.length)];
const problems = new Map();
const flag = (msg, G) => { if (!problems.has(msg)) problems.set(msg, { n: 0, day: G && G.day }); problems.get(msg).n++; };

function walk(o, path, G) {
  if (typeof o === 'number' && !Number.isFinite(o)) flag(`non-finite number at ${path}`, G);
  else if (o && typeof o === 'object') for (const k in o) walk(o[k], `${path}.${k}`, G);
}
function check(G, where) {
  walk(G, 'G', G);
  for (const [k, v] of Object.entries(G.inv.fabrics)) if (v < -1e-9) flag(`negative fabric ${k} (${where})`, G);
  for (const [k, v] of Object.entries(G.inv.items)) if (v < 0) flag(`negative item ${k} (${where})`, G);
  for (const [k, v] of Object.entries(G.inv.clay)) if (v < -1e-9) flag(`negative clay ${k} (${where})`, G);
  for (const [k, v] of Object.entries(G.inv.glazes)) if (v < 0) flag(`negative glaze ${k} (${where})`, G);
  if (G.rep < 0 || G.rep > 100) flag('rep out of range', G);
  if (G.home.happy < 0 || G.home.happy > 100) flag('happiness out of range', G);
  if (G.rack.length > DG.rackCapacity(G)) flag('rack over capacity', G);
  if (G.kiln.length > DG.kilnCapacity(G)) flag('kiln over capacity', G);
  if (G.shelf.length > DG.shelfCapacity(G)) flag('shelf over capacity', G);
  if (G.money < 0 && where !== 'endday') flag(`negative money after ${where}`, G);
  if (G.queue.some(c => !c.text || /undefined|NaN/.test(c.text))) flag('bad customer text', G);
}

function randomDesign(G) {
  const fabs = DG.FABRICS.filter(f => DG.isUnlocked(G, f));
  const main = pick(fabs), sil = pick(DG.SILHOUETTES);
  const closures = DG.CLOSURES.filter(c => c.id !== 'none' && (!c.item || DG.isUnlocked(G, DG.byId(DG.ITEMS, c.item))));
  const accent = Math.random() < 0.3 ? pick(fabs) : null;
  const col = (f, fallback) => (f && f.colors ? f.colors[0] : fallback);
  return {
    main: main.id, mainColor: col(main, pick(DG.COLORS).id), accent: accent && accent.id, accentColor: col(accent, pick(DG.COLORS).id),
    silhouette: sil.id, length: pick(DG.LENGTHS).id, neckline: pick(DG.NECKLINES).id, sleeves: pick(DG.SLEEVES).id,
    closure: sil.noClosure && Math.random() < 0.5 ? 'none' : pick(closures).id,
    extras: DG.EXTRAS.filter(e => DG.isUnlocked(G, e) && (!e.item || DG.isUnlocked(G, DG.byId(DG.ITEMS, e.item))) && Math.random() < 0.25).map(e => e.id),
  };
}
function bestDesign(G, cust, tries) {
  let best = null;
  for (let i = 0; i < tries; i++) {
    const d = randomDesign(G);
    if (Math.random() < (HUMAN ? 0.25 : 0.5) && cust.liked.length) d.mainColor = DG.byId(DG.FABRICS, d.main).colors ? d.mainColor : cust.liked[0];
    const an = DG.analyze(d, G);
    if (an.issues.some(x => !x.startsWith('Need'))) continue;
    const ev = cust.rack ? { S: DG.rackItem(d, G, 0.8).price / 5 } : DG.evaluate(cust, d, G, 0.75);
    const value = ev.S - an.cost / Math.max(200, cust.budget || 600) * 25;
    if (!best || value > best.value) best = { d, an, value };
  }
  return best;
}
function buy(G, kind, id, qty) {
  const price = { fabric: DG.fabricPrice, item: DG.itemPrice, clay: DG.clayPrice, glaze: DG.glazePrice, potitem: DG.potItemPrice }[kind](G, id);
  if (G.money < price * qty) return false;
  G.money -= price * qty;
  G.today.spent += price * qty;
  const inv = { fabric: G.inv.fabrics, item: G.inv.items, clay: G.inv.clay, glaze: G.inv.glazes, potitem: G.inv.items }[kind];
  inv[id] = DG.round1((inv[id] || 0) + qty);
  return true;
}
function sew(G, cust, design, skill) {
  const an = DG.analyze(design, G);
  if (an.issues.some(x => !x.startsWith('Need'))) return null;
  if (an.missingCost > G.money) return null;
  an.missing.forEach(m => buy(G, m.kind, m.id, m.qty));
  const an2 = DG.analyze(design, G);
  if (an2.issues.length) { flag(`issues after buying missing: ${an2.issues[0]}`, G); return null; }
  for (const id in an2.fabrics) G.inv.fabrics[id] = DG.round1((G.inv.fabrics[id] || 0) - an2.fabrics[id]);
  for (const id in an2.items) G.inv.items[id] = (G.inv.items[id] || 0) - an2.items[id];
  design.cost = an2.cost;
  const craft = Math.min(1, Math.max(0, skill + (Math.random() - 0.5) * 0.3));
  if (cust.rack) { G.rack.push(DG.rackItem(design, G, craft)); return { rack: true }; }
  const ev = DG.evaluate(cust, design, G, craft);
  G.money += ev.pay + ev.tip;
  G.today.income += ev.pay + ev.tip;
  G.rep = DG.clamp(DG.round1(G.rep + ev.repDelta), 0, 100);
  G.stats.served++; G.stats.totalS += ev.S; G.stats.best = Math.max(G.stats.best, ev.S);
  DG.rememberCustomer(G, cust, ev.S);
  DG.recordDress(G, cust, ev.S, design);
  if (cust.story) DG.storyDelivered(G, cust, ev.S, design);
  DG.addToLookbook(G, cust, ev.S, design);
  return ev;
}

const storyDone = [];
const results = [];
let shownBankrupt = 0;
for (let gi = 0; gi < GAMES; gi++) {
  const skill = HUMAN ? 0.4 + Math.random() * 0.4 : 0.45 + Math.random() * 0.5;   // mini-game skill
  const tries = HUMAN ? pick([4, 8, 15]) : pick([40, 150, 400]);                  // design effort
  const G = DG.newGame();
  let firstBride = null, Ssum = 0, Sn = 0, bankrupt = null, dream = null;
  const hist = [];
  try {
    for (let day = 0; day < DAYS && !G.gameOver; day++) {
      DG.startDay(G); check(G, 'startday');
      // render everything once in a while to catch drawing bugs
      if (day % 10 === 0) {
        const svg = DG.renderShop(G) + DG.renderHome(G) + G.queue.map(c => DG.renderAvatar(c.look)).join('');
        if (/NaN|undefined/.test(svg)) flag('render produced NaN/undefined', G);
      }
      DG.mailToday(G).forEach(m => DG.openMail(G, m.id));
      // home routine
      DG.doActivity(G, 'play'); DG.doActivity(G, 'pet');
      if (G.home.catFood < 2) DG.buyCatFood(G);
      { const nx = DG.nextHouse(G); if (nx && G.money > DG.moveCash(G) * 1.3 + 60000) DG.moveHouse(G); }
      if (G.home.house && G.home.loan.principal > 0 && G.money > 400000) DG.repayLoan(G, G.money - 300000);
      if (G.money > 12000 && G.home.happy < 70) DG.doActivity(G, pick(DG.ACTIVITIES.filter(a => !a.free)).id);
      { const t = DG.HOME_ITEMS.find(i => !G.home.items.includes(i.id)); if (t && G.money > t.cost * 2 + 12000) DG.buyHomeItem(G, t.id); }
      { const w = DG.WARDROBE.find(i => !G.wardrobe.owned.includes(i.id)); if (w && G.money > w.cost * 3 + 20000) DG.buyClothes(G, w.id); }
      check(G, 'home');
      // customers
      while (G.queue.length) {
        const cust = G.queue.shift();
        if (cust.arche === 'bride' && firstBride === null) firstBride = G.day;
        const b = bestDesign(G, cust, tries);
        if (!b) { flag('no valid design found', G); continue; }
        const ev = sew(G, cust, b.d, skill);
        if (ev) { Ssum += ev.S; Sn++; }
        check(G, 'dress');
      }
      // rack, sometimes
      if (G.money > 5000 && G.rack.length < DG.rackCapacity(G) && Math.random() < 0.4) {
        const b = bestDesign(G, Object.assign({}, DG.RACK_SHOPPER), 40);
        if (b) sew(G, DG.RACK_SHOPPER, b.d, skill);
        check(G, 'rack');
      }
      // pottery
      if (DG.upgradeLevel(G, 'pottery')) {
        for (let k = 0; k < 2 && G.kiln.length < DG.kilnCapacity(G); k++) {
          const pot = { clay: pick(DG.CLAYS.filter(c => DG.isUnlocked(G, c))).id, shape: pick(DG.POT_SHAPES).id,
            glaze: pick(DG.GLAZES.filter(x => DG.isUnlocked(G, x))).id, deco: pick(DG.POT_DECOS).id };
          if (pot.deco === 'handpainted') pot.paint = [{ c: '#2f4f9e', w: 2.5, n: 40, d: 'M40 70L80 72' }, { c: '#a3262e', w: 4.5, n: 60, d: 'M40 80L80 82' }];
          const an = DG.analyzePot(pot, G);
          if (an.issues.some(x => !x.startsWith('Need'))) break;
          if (an.missingCost > G.money) break;
          an.missing.forEach(m => buy(G, m.kind, m.id, m.qty));
          if (DG.analyzePot(pot, G).issues.length) { flag('pot issues after buying', G); break; }
          DG.throwPot(G, pot, Math.min(1, skill + Math.random() * 0.2), Math.random());
          check(G, 'pottery');
        }
      }
      // spending
      for (const u of DG.UPGRADES) {
        const lvl = DG.upgradeLevel(G, u.id), cost = u.costs[lvl];
        if (cost != null && G.money > cost * 1.8 + DG.dailyCosts(G) * 3 && Math.random() < 0.5) { G.money -= cost; G.today.spent += cost; G.upgrades[u.id] = lvl + 1; }
      }
      const dc = DG.DECOR.find(d => !G.decor.owned.includes(d.id));
      if (dc && G.money > dc.cost * 3 + 10000) { G.money -= dc.cost; G.today.spent += dc.cost; G.decor.owned.push(dc.id); }
      if (!G.staff.apprentice && G.money > 40000) { G.money -= 3000; G.today.spent += 3000; G.staff.apprentice = true; }
      if (Math.random() < 0.2 && G.money > 10000) { G.money -= 800; G.today.spent += 800; G.marketing.push('flyers'); }
      DG.updateGoals(G);
      DG.claimableGoals(G).forEach(id => DG.claimGoal(G, id));
      check(G, 'spend');
      if (dream === null && G.home.house === 5) dream = G.day;
      const res = DG.endDay(G);
      check(G, 'endday');
      hist.push(Math.round(G.money));
      if (G.gameOver && bankrupt === null) { bankrupt = G.day; if (!shownBankrupt++) console.log(`bankrupt game: skill ${skill.toFixed(2)}, tries ${tries}, money by day: ${hist.join(' ')}, rep ${G.rep}, upgrades ${JSON.stringify(G.upgrades)}, staff ${JSON.stringify(G.staff)}`); }
      if (!res || !res.home || !res.home.event) flag('missing day-end summary', G);
    }
  } catch (e) {
    flag(`EXCEPTION: ${e.message} @ ${(e.stack || '').split('\n')[1]}`, G);
  }
  storyDone.push(DG.STORIES.map(st => DG.storyState(G, st.id).ch));
  results.push({ house: G.home.house, dream, skill, tries, money: G.money, rep: G.rep, day: G.day, bankrupt, firstBride, avgS: Sn ? Ssum / Sn : 0,
    goals: G.goals.claimed.length, happy: G.home.happy, upgrades: Object.values(G.upgrades).reduce((a, b) => a + b, 0), pots: G.stats.potsSold, rack: G.stats.rackSold });
}

const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
const col = k => results.map(r => r[k]);
console.log(`Simulated ${GAMES} games × up to ${DAYS} days (${HUMAN ? 'human-like' : 'optimising'} bots)`);
console.log(`bankrupt: ${results.filter(r => r.bankrupt !== null).length}/${GAMES} (days: ${results.filter(r => r.bankrupt !== null).map(r => r.bankrupt).join(', ') || '-'})`);
for (const k of ['house', 'money', 'rep', 'avgS', 'goals', 'upgrades', 'happy', 'pots', 'rack']) console.log(`${k.padEnd(9)} p10 ${q(col(k), 0.1).toFixed(0).padStart(7)}  median ${q(col(k), 0.5).toFixed(0).padStart(7)}  p90 ${q(col(k), 0.9).toFixed(0).padStart(7)}`);
const dream = results.filter(r => r.dream !== null).map(r => r.dream);
console.log(`Strandvejsvilla reached in ${dream.length}/${GAMES} games, median day ${dream.length ? q(dream, 0.5) : '-'}`);
const brides = results.filter(r => r.firstBride !== null).map(r => r.firstBride);
{ const avg = DG.STORIES.map((st, i) => (storyDone.reduce((a, r) => a + r[i], 0) / storyDone.length).toFixed(1) + '/' + st.ch.length); console.log(`story chapters reached (avg): ${DG.STORIES.map((st, i) => st.id + ' ' + avg[i]).join(', ')}`); }
console.log(`first bride seen in ${brides.length}/${GAMES} games, median day ${brides.length ? q(brides, 0.5) : '-'}`);
const bySkill = [[0, 0.65], [0.65, 1]].map(([a, b]) => { const r = results.filter(x => x.skill >= a && x.skill < b); return `${a}-${b}: avgS ${q(r.map(x => x.avgS), 0.5).toFixed(0)}, money ${q(r.map(x => x.money), 0.5).toFixed(0)}`; });
console.log('by skill:', bySkill.join(' | '));
console.log(problems.size ? 'PROBLEMS:' : 'No invariant violations.');
for (const [m, v] of problems) console.log(`  ${m}  ×${v.n} (first on day ${v.day})`);
process.exitCode = [...problems.keys()].some(k => k.startsWith('EXCEPTION') || k.startsWith('non-finite') || k.startsWith('negative')) ? 1 : 0;
