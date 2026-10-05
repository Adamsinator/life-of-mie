// Pure game logic: market, customers, dress analysis and scoring. No DOM access.
(function (g) {
  const DG = g.DG;

  const byId = (arr, id) => arr.find(x => x.id === id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round1 = x => Math.round(x * 10) / 10;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  Object.assign(DG, { byId, clamp, round1, pick, randInt });

  // Balance knobs: how strongly dress parts shift stats, and how harshly misses are punished.
  DG.BAL = { delta: 0.6, fitExp: 2.5 };

  DG.colorHex = id => (byId(DG.COLORS, id) || DG.COLORS[0]).hex;
  DG.upgradeLevel = (G, id) => (G.upgrades && G.upgrades[id]) || 0;

  // ---------- new game ----------
  DG.newGame = function () {
    const G = {
      version: 1,
      day: 0,
      money: 400,
      rep: 5,
      upgrades: { machine: 0, display: 0, supplier: 0, embroidery: 0, haggle: 0, fitting: 0 },
      inv: { fabrics: { cotton: 3 }, items: { zipper: 1 } },
      market: { mult: {}, prev: {}, event: null },
      queue: [],
      active: null,
      design: null,
      known: [],
      momUsed: false,
      gameOver: false,
      stats: { served: 0, totalS: 0, best: 0, earned: 0 },
      today: null,
      nextId: 1,
    };
    DG.FABRICS.forEach(f => { G.market.mult[f.id] = 1; G.market.prev[f.id] = 1; });
    return DG.ensureDefaults(G);
  };

  // Fills in fields added after the first release, so older saves keep working.
  DG.ensureDefaults = function (G) {
    G.decor = G.decor || { owned: [], wallpaper: 'stripes', walls: ['stripes'] };
    G.staff = G.staff || { apprentice: false, assistant: false };
    G.marketing = G.marketing || [];   // campaigns booked today, effective tomorrow
    G.boost = G.boost || null;         // today's effects from yesterday's campaigns
    G.rack = G.rack || [];
    G.lastRackSales = G.lastRackSales || [];
    return G;
  };

  DG.charm = function (G) {
    const d = G.decor;
    const items = d.owned.reduce((a, id) => a + (byId(DG.DECOR, id) || { charm: 0 }).charm, 0);
    return items + (byId(DG.WALLPAPERS, d.wallpaper) || { charm: 0 }).charm;
  };
  DG.wages = G => DG.STAFF.reduce((a, st) => a + (G.staff[st.id] ? st.wage : 0), 0);
  DG.rackCapacity = G => 2 + DG.upgradeLevel(G, 'display');

  // ---------- unlocks & prices ----------
  DG.isUnlocked = function (G, thing) {
    if (!thing) return false;
    if ((thing.tier || 0) > DG.upgradeLevel(G, 'supplier')) return false;
    if (thing.needs) {
      for (const k in thing.needs) if (DG.upgradeLevel(G, k) < thing.needs[k]) return false;
    }
    return true;
  };

  DG.discount = G => 1 - 0.08 * DG.upgradeLevel(G, 'haggle');

  DG.fabricPrice = function (G, id) {
    const f = byId(DG.FABRICS, id);
    const ev = G.market.event;
    const sale = ev && ev.type === 'sale' && ev.fabric === id ? 0.7 : 1;
    return Math.round(f.price * (G.market.mult[id] || 1) * DG.discount(G) * sale);
  };
  DG.itemPrice = (G, id) => Math.round(byId(DG.ITEMS, id).price * DG.discount(G));

  // Prices follow a mean-reverting AR(1) in log space: ln m' = 0.65 ln m + 0.1 ε
  DG.moveMarket = function (G) {
    DG.FABRICS.forEach(f => {
      const m = G.market.mult[f.id] || 1;
      G.market.prev[f.id] = m;
      G.market.mult[f.id] = clamp(Math.exp(0.65 * Math.log(m) + 0.1 * gauss()), 0.7, 1.45);
    });
  };

  // ---------- customers ----------
  DG.randomLook = function () {
    return {
      skin: pick(DG.SKINS),
      hair: pick(DG.HAIRS),
      style: randInt(0, 4),
      top: pick(DG.COLORS.slice(2)).hex,
      bg: pick(['#f5dfe4', '#e2ecdf', '#dfe8f3', '#f3ead6', '#ebe2f3', '#f6e3d6']),
      glasses: Math.random() < 0.25,
      earrings: Math.random() < 0.5,
    };
  };

  function buildText(c, arche) {
    const parts = [];
    if (c.visits > 0) {
      if (c.lastS >= 85) parts.push('Mie! Your last dress was a hit. Everyone asked where I got it!');
      else if (c.lastS >= 70) parts.push("Hi again! I'm back for another one.");
      else parts.push("I'm giving you another chance. Let's do better this time, okay?");
    } else {
      parts.push(`Hi! I'm ${c.name}, ${/^[aeiou]/i.test(c.job) ? 'an' : 'a'} ${c.job}.`);
    }
    parts.push(pick(arche.lines));
    const ws = Object.entries(c.weights).sort((a, b) => b[1] - a[1]);
    ws.forEach(([k, w]) => {
      const adj = DG.ATTR_META[k].adj;
      if (w >= 3) parts.push(`It absolutely has to be ${adj}.`);
      else if (w === 2) parts.push(`I'd love it to be ${adj}.`);
      else parts.push(`A little bit ${adj} would be nice.`);
    });
    c.reqs.forEach(r => parts.push(DG.REQS[r].text));
    const lk = c.liked.map(id => byId(DG.COLORS, id).name.toLowerCase());
    const dk = c.disliked.map(id => byId(DG.COLORS, id).name.toLowerCase());
    parts.push(`I adore ${lk.join(' and ')}${dk.length ? `, but please no ${dk.join(' or ')}` : ''}.`);
    parts.push(`My budget is ${c.budget.toLocaleString('da-DK')} kr.`);
    return parts.join(' ');
  }

  DG.genCustomer = function (G, opts = {}) {
    const display = DG.upgradeLevel(G, 'display');
    let eligible = DG.ARCHETYPES.filter(a => a.minRep <= G.rep);
    if (opts.topTier) eligible = eligible.slice(-3);
    // Higher-tier archetypes get more likely as the shop window improves.
    const weights = eligible.map(a => 1 + display * 0.35 * (a.minRep / 20) + (a.minRep > 0 ? 0.3 : 0));
    let r = Math.random() * weights.reduce((x, y) => x + y, 0);
    let arche = eligible[0];
    for (let i = 0; i < eligible.length; i++) { r -= weights[i]; if (r <= 0) { arche = eligible[i]; break; } }

    // Returning customer?
    const busy = new Set(G.queue.map(q => q.cid).concat(G.active ? [G.active.cid] : []));
    const back = G.known.filter(k => k.lastS >= 55 && !busy.has(k.cid) && !(G.today && G.today.seen.includes(k.cid)));
    let base;
    if (back.length && Math.random() < Math.min(0.45, 0.08 * back.length)) {
      base = JSON.parse(JSON.stringify(pick(back)));
    } else {
      const used = new Set(G.known.map(k => k.name).concat(G.queue.map(q => q.name)));
      const free = DG.NAMES.filter(n => !used.has(n));
      const liked = [];
      while (liked.length < 2) { const c = pick(DG.COLORS).id; if (!liked.includes(c)) liked.push(c); }
      let dis;
      do { dis = pick(DG.COLORS).id; } while (liked.includes(dis));
      base = { cid: 'c' + G.nextId++, name: pick(free.length ? free : DG.NAMES), look: DG.randomLook(),
        job: pick(arche.jobs), liked, disliked: [dis], visits: 0, lastS: 0 };
    }
    if (G.today) G.today.seen.push(base.cid);

    const loyal = base.visits > 0 && base.lastS >= 85;
    const ev = G.market.event;
    let budget = randInt(arche.budget[0], arche.budget[1]) * (1 + 0.08 * display) * (loyal ? 1.1 : 1) * (ev && ev.type === 'buzz' ? 1.2 : 1)
      * (1 + 0.01 * DG.charm(G)) * ((G.boost && G.boost.budget) || 1);
    budget = Math.round(budget / 10) * 10;

    const targets = {};
    for (const k in arche.t) targets[k] = clamp(Math.round((arche.t[k] + (Math.random() - 0.5)) * 2) / 2, 3, 10);
    const reqs = arche.reqs.filter(([, p]) => Math.random() < p).map(([id]) => id);

    const c = Object.assign(base, {
      oid: 'o' + G.nextId++,
      arche: arche.id,
      title: arche.title,
      weights: Object.assign({}, arche.w),
      targets,
      styles: arche.styles.slice(),
      reqs,
      budget,
      loyal,
    });
    if (arche.colors) { c.liked = arche.colors.liked.slice(0, 2); c.disliked = arche.colors.disliked.slice(); }
    c.text = buildText(c, arche);
    return c;
  };

  // ---------- days ----------
  DG.rent = G => 35 + 10 * Object.values(G.upgrades).reduce((a, b) => a + b, 0);
  DG.dailyCosts = G => DG.rent(G) + DG.wages(G);

  DG.startDay = function (G) {
    G.day += 1;
    if (G.day > 1) DG.moveMarket(G);
    const r = Math.random();
    const unlocked = DG.FABRICS.filter(f => DG.isUnlocked(G, f));
    if (G.day === 1) G.market.event = null;
    else if (r < 0.15) G.market.event = { type: 'sale', fabric: pick(unlocked).id };
    else if (r < 0.25) G.market.event = { type: 'buzz' };
    else if (r < 0.33) G.market.event = { type: 'rain' };
    else G.market.event = null;

    // yesterday's marketing campaigns take effect today
    const booked = G.marketing || [];
    G.boost = { campaigns: booked.slice(), budget: booked.includes('newspaper') ? 1.15 : 1 };
    G.marketing = [];
    const extra = (booked.includes('flyers') ? 1 : 0) + (booked.includes('newspaper') ? 1 : 0) + (booked.includes('show') ? 2 : 0);

    const cap = 2 + DG.upgradeLevel(G, 'display') + (G.staff.assistant ? 1 : 0);
    let n = 1 + Math.floor(G.rep / 20) + (Math.random() < 0.3 ? 1 : 0);
    if (G.market.event && G.market.event.type === 'rain') n -= 1;
    n = clamp(n, 1, cap) + extra;   // campaigns may exceed the usual cap
    G.today = { income: 0, spent: 0, served: 0, seen: [], startMoney: G.money };
    G.queue = [];
    for (let i = 0; i < n; i++) G.queue.push(DG.genCustomer(G, { topTier: i === 0 && booked.includes('influencer') }));
  };

  DG.rackSaleChance = G => clamp(0.25 + 0.03 * DG.charm(G) + 0.05 * DG.upgradeLevel(G, 'display'), 0, 0.85);

  DG.endDay = function (G) {
    const rent = DG.rent(G);
    const wages = DG.wages(G);
    const missed = G.queue.length;
    // walk-in shoppers browse the ready-to-wear rack
    const p = DG.rackSaleChance(G);
    const sold = [];
    G.rack = G.rack.filter(item => {
      if (Math.random() < p) { sold.push(item); return false; }
      return true;
    });
    const rackIncome = sold.reduce((a, it) => a + it.price, 0);
    G.money += rackIncome;
    if (G.today) G.today.income += rackIncome;
    G.lastRackSales = sold;
    G.money -= rent + wages;
    if (!G.staff.assistant) G.rep = clamp(G.rep - 0.5 * missed, 0, 100);
    G.queue = [];
    let mom = false;
    if (G.money < 0) {
      if (!G.momUsed) { G.money += 300; G.momUsed = true; mom = true; }
      else G.gameOver = true;
    }
    return { rent, wages, missed, mom, today: G.today, sold, rackIncome, assistant: G.staff.assistant };
  };

  // ---------- design ----------
  DG.newDesign = function (G) {
    const owned = Object.keys(G.inv.fabrics).filter(id => G.inv.fabrics[id] > 0);
    return {
      main: owned[0] || null, mainColor: 'white',
      accent: null, accentColor: 'white',
      silhouette: 'aline', length: 'knee', neckline: 'round', sleeves: 'short',
      closure: 'zipper', extras: [],
    };
  };

  DG.analyze = function (design, G) {
    const sil = byId(DG.SILHOUETTES, design.silhouette);
    const len = byId(DG.LENGTHS, design.length);
    const neck = byId(DG.NECKLINES, design.neckline);
    const slv = byId(DG.SLEEVES, design.sleeves);
    const clo = byId(DG.CLOSURES, design.closure);
    const exs = design.extras.map(id => byId(DG.EXTRAS, id));
    const fm = byId(DG.FABRICS, design.main);
    const fa = design.accent ? byId(DG.FABRICS, design.accent) : null;

    const trimM = slv.m + (neck.m || 0) + exs.reduce((a, e) => a + (e.m || 0), 0);
    const save = G.staff && G.staff.apprentice ? 0.9 : 1;   // careful pattern cutting
    const mainM = round1((sil.m * len.mult + (fa ? 0 : trimM)) * save);
    const accentM = fa ? round1(trimM * save) : 0;

    const wAcc = fa && accentM > 0 ? 0.25 : 0;
    const attrs = {};
    DG.ATTRS.forEach(k => {
      const bm = fm ? fm.s[k] : 2;
      const ba = fa ? fa.s[k] : bm;
      attrs[k] = bm * (1 - wAcc) + ba * wAcc;
    });
    [sil, len, neck, slv, clo, ...exs].forEach(p => { for (const k in p.d) attrs[k] += DG.BAL.delta * p.d[k]; });

    const notes = [];
    if (wAcc > 0) {
      const bonus = (fa.id !== fm?.id ? 0.75 : 0) + (design.accentColor !== design.mainColor ? 0.75 : 0);
      attrs.creativity += bonus;
    }
    const decoCount = exs.filter(e => e.deco).length;
    if (decoCount > 3) {
      attrs.elegance -= decoCount - 3;
      notes.push(`Over-decorated: −${decoCount - 3} elegance`);
    }
    attrs.quality += 0.5 * DG.upgradeLevel(G, 'machine');
    DG.ATTRS.forEach(k => { attrs[k] = clamp(round1(attrs[k]), 0, 10); });

    // items needed
    const items = {};
    if (clo.item) items[clo.item] = 1;
    exs.forEach(e => { if (e.item) items[e.item] = (items[e.item] || 0) + 1; });

    // fabric needed per id (main and accent may be the same fabric)
    const fabrics = {};
    if (fm) fabrics[fm.id] = mainM;
    if (fa) fabrics[fa.id] = round1((fabrics[fa.id] || 0) + accentM);

    let cost = 0;
    for (const id in fabrics) cost += fabrics[id] * DG.fabricPrice(G, id);
    for (const id in items) cost += items[id] * DG.itemPrice(G, id);
    cost = Math.round(cost);

    const issues = [];
    const missing = [];
    if (!fm) issues.push('Choose a main fabric.');
    if (clo.id === 'none' && !sil.noClosure) issues.push('This dress needs a closure: a zipper or buttons.');
    if (fm && fm.colors && !fm.colors.includes(design.mainColor)) issues.push(`${fm.name} doesn't come in that colour.`);
    if (fa && fa.colors && !fa.colors.includes(design.accentColor)) issues.push(`${fa.name} doesn't come in that colour.`);
    for (const id in fabrics) {
      const have = round1(G.inv.fabrics[id] || 0);
      if (have < fabrics[id]) {
        const need = Math.ceil(round1(fabrics[id] - have));
        missing.push({ kind: 'fabric', id, qty: need });
        issues.push(`Need ${fabrics[id]} m ${byId(DG.FABRICS, id).name}, you have ${have} m.`);
      }
    }
    for (const id in items) {
      const have = G.inv.items[id] || 0;
      if (have < items[id]) {
        missing.push({ kind: 'item', id, qty: items[id] - have });
        issues.push(`Need ${items[id]}× ${byId(DG.ITEMS, id).name}, you have ${have}.`);
      }
    }
    if (design.accent && accentM === 0) notes.push('The accent fabric is only used for sleeves, collar, pockets and ruffles.');
    const missingCost = missing.reduce((a, m) => a + m.qty * (m.kind === 'fabric' ? DG.fabricPrice(G, m.id) : DG.itemPrice(G, m.id)), 0);

    return { attrs, mainM, accentM, fabrics, items, cost, issues, missing, missingCost, notes, decoCount };
  };

  // ---------- scoring ----------
  // S = 100(0.65·A + 0.15·C + 0.10·St + 0.10·k) − 15·(failed reqs) + 3·fitting + loyalty + charm/4
  // A = Σ w_i (min(a_i/t_i, 1))^p / Σ w_i, p = DG.BAL.fitExp
  DG.evaluate = function (cust, design, G, craft) {
    const an = DG.analyze(design, G);
    const attrs = Object.assign({}, an.attrs);
    attrs.quality = clamp(round1(attrs.quality * (0.85 + 0.25 * craft)), 0, 10);

    let wSum = 0, aSum = 0;
    const rows = [];
    for (const k in cust.weights) {
      const w = cust.weights[k], t = cust.targets[k];
      const fit = Math.pow(clamp(attrs[k] / t, 0, 1), DG.BAL.fitExp);
      wSum += w; aSum += w * fit;
      rows.push({ k, w, t, v: attrs[k], fit });
    }
    const A = aSum / wSum;

    const colorScore = id => (cust.liked.includes(id) ? 1 : cust.disliked.includes(id) ? 0 : 0.55);
    const accentUsed = design.accent && an.accentM > 0;
    const C = accentUsed ? 0.7 * colorScore(design.mainColor) + 0.3 * colorScore(design.accentColor) : colorScore(design.mainColor);
    const St = cust.styles.includes(design.silhouette) ? 1 : 0.5;
    const failed = cust.reqs.filter(r => !DG.REQS[r].check(design));
    const fitting = DG.upgradeLevel(G, 'fitting');

    let S = 100 * (0.65 * A + 0.15 * C + 0.10 * St + 0.10 * craft) - 15 * failed.length + 3 * fitting + (cust.loyal ? 2 : 0)
      + 0.25 * DG.charm(G);
    S = Math.round(clamp(S, 0, 100));

    const base = S >= 75 ? 1 : S >= 40 ? 0.4 + 0.6 * (S - 40) / 35 : 0.4;
    const pay = Math.round(cust.budget * base);
    const tip = S >= 85 ? Math.round(cust.budget * (S - 85) / 100 * (1 + 0.5 * fitting)) : 0;
    const repDelta = round1((S - 65) / 8);
    const stars = S >= 90 ? 5 : S >= 75 ? 4 : S >= 60 ? 3 : S >= 40 ? 2 : 1;

    return { S, A, C, St, craft, rows, failed, pay, tip, repDelta, stars, attrs, cost: an.cost };
  };

  // ---------- ready-to-wear rack ----------
  // Walk-in shoppers want a generally appealing dress: price = 0.9·materials + 18·appeal,
  // appeal = mean of the dress's three best stats (after stitching).
  DG.RACK_SHOPPER = {
    rack: true, name: 'the rack', title: 'Ready-to-wear', cid: 'rack', oid: 'rack',
    weights: {}, targets: {}, styles: [], reqs: [], liked: [], disliked: [], budget: 0, visits: 0,
  };
  DG.rackItem = function (design, G, craft) {
    const an = DG.analyze(design, G);
    const attrs = Object.assign({}, an.attrs);
    attrs.quality = clamp(round1(attrs.quality * (0.85 + 0.25 * craft)), 0, 10);
    const top3 = DG.ATTRS.map(k => attrs[k]).sort((a, b) => b - a).slice(0, 3);
    const appeal = round1(top3.reduce((a, b) => a + b, 0) / 3);
    const cost = design.cost != null ? design.cost : an.cost;
    const price = Math.round((0.9 * cost + 18 * appeal) / 10) * 10;
    return { design: Object.assign({}, design), appeal, cost, price, attrs };
  };

  // Complaint/praise line from the result.
  DG.feedbackLine = function (cust, ev, design) {
    if (ev.failed.length) return `And you forgot: ${DG.REQS[ev.failed[0]].short.toLowerCase()}!`;
    if (cust.disliked.includes(design.mainColor)) return `I told you I don't like ${byId(DG.COLORS, design.mainColor).name.toLowerCase()}...`;
    const worst = ev.rows.slice().sort((a, b) => b.w * (1 - b.fit) - a.w * (1 - a.fit))[0];
    if (worst && worst.fit < 0.8) return `I wish it was more ${DG.ATTR_META[worst.k].adj}.`;
    if (ev.craft < 0.5) return 'Some of the seams look a little wobbly.';
    if (cust.liked.includes(design.mainColor)) return `And the ${byId(DG.COLORS, design.mainColor).name.toLowerCase()}! My favourite colour!`;
    return '';
  };

  // Remember a customer after their visit; very unhappy customers never return.
  DG.rememberCustomer = function (G, cust, S) {
    G.known = G.known.filter(k => k.cid !== cust.cid);
    if (S >= 40) {
      G.known.push({ cid: cust.cid, name: cust.name, look: cust.look, job: cust.job, liked: cust.liked,
        disliked: cust.disliked, visits: (cust.visits || 0) + 1, lastS: S });
      if (G.known.length > 15) G.known.shift();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
