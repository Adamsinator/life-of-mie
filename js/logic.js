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
  // Balance knobs. Cozy, not kids-easy: there is no failure, but four and five stars are earned.
  //   ramp: wishes grow with reputation (+ramp at rep 100) and with each visit of a regular (+visitStep, up to +visitMax)
  //   craftW: weight of the sewing mini-games in satisfaction; bonusCap: most that charm, fitting, season etc. can add
  DG.BAL = { delta: 0.6, fitExp: 3.5, ramp: 0.6, visitStep: 0.3, visitMax: 1, craftW: 0.22, bonusCap: 6 };

  DG.colorHex = id => (byId(DG.COLORS, id) || DG.COLORS[0]).hex;
  DG.upgradeLevel = (G, id) => (G.upgrades && G.upgrades[id]) || 0;

  // ---------- new game ----------
  DG.newGame = function () {
    const G = {
      version: 1,
      day: 0,
      money: 8000,
      econ: 2,
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
  DG.SAVE_SCHEMA = 4;   // bump when ensureDefaults learns a new migration
  // Rule for every update: only ADD fields here, never remove or reset progress.
  // tests/fixtures holds frozen saves from earlier versions; they must keep loading intact.
  DG.ensureDefaults = function (G) {
    G.upgrades = G.upgrades || {};
    G.inv = G.inv || {};
    G.stats = G.stats || { served: 0, totalS: 0, best: 0, earned: 0 };
    G.decor = G.decor || { owned: [], wallpaper: 'stripes', walls: ['stripes'] };
    if (!G.decor.pos) G.decor.pos = {};   // where the player has moved her furniture (offsets from the usual spot)
    G.staff = G.staff || { apprentice: false, assistant: false };
    G.marketing = G.marketing || [];   // campaigns booked today, effective tomorrow
    G.boost = G.boost || null;         // today's effects from yesterday's campaigns
    G.rack = G.rack || [];
    G.lastRackSales = G.lastRackSales || [];
    G.upgrades.pottery = G.upgrades.pottery || 0;
    G.upgrades.floor = G.upgrades.floor || 0;
    G.inv.clay = G.inv.clay || {};
    G.inv.glazes = G.inv.glazes || {};
    G.pot = G.pot || null;          // pot being designed in the studio
    G.kiln = G.kiln || [];          // thrown pots waiting for tonight's firing
    G.shelf = G.shelf || [];        // fired pots for sale
    G.goals = G.goals || { done: [], claimed: [] };
    const st = G.stats;
    st.byArche = st.byArche || {};
    for (const k of ['happy', 'rackSold', 'potsMade', 'potsSold', 'potsCracked', 'teapots', 'brideBest']) st[k] = st[k] || 0;
    st.seasons = st.seasons || [];
    st.painted = st.painted || 0;
    G.home = G.home || { happy: 70, items: [], catFood: 7, did: {}, event: null };
    G.tips = G.tips || [];
    if (G.home.house == null) {
      // older saves: family dreams become houses
      const it = G.home.items;
      G.home.house = it.includes('summerhouse') ? 3 : it.includes('garden') ? 2 : it.includes('kitchen') ? 1 : 0;
      G.home.items = it.filter(id => !['kitchen', 'garden', 'summerhouse'].includes(id));
    }
    G.upgrades.accountant = G.upgrades.accountant || 0;
    if (!G.econ) {
      // saves from before realistic prices: scale money and price tags up once
      G.money = Math.round(G.money * 8);
      (G.rack || []).forEach(it => { it.price *= 8; it.cost *= 8; });
      (G.shelf || []).forEach(it => { it.price *= 8; it.cost *= 8; });
      (G.kiln || []).forEach(it => { it.price *= 8; it.cost *= 8; });
      G.econ = 2;
    }
    G.home.loan = G.home.loan || { principal: 0, payment: 0, yearsLeft: 0 };
    G.wardrobe = G.wardrobe || { owned: ['worktop', 'measure', 'noacc', 'rdark'], wear: { outfit: 'worktop', acc: 'measure', glasses: 'rdark' } };
    // cozy update: there is no game over any more, and the day's accounts are kept in a ledger
    G.ledger = G.ledger || [];
    G.stories = G.stories || {};
    G.mail = G.mail || [];
    G.letters = G.letters || [];
    G.lookbook = G.lookbook || [];
    G.keepsakes = G.keepsakes || 0;
    G.collections = G.collections || { fabrics: [], colours: [], silhouettes: [], shapes: [], seasons: [], done: [] };
    G.returning = G.returning || [];
    if (G.gameOver) { G.gameOver = false; if (G.money < DG.HELP_FLOOR) G.money = DG.HELP_FLOOR; }
    G.schema = Math.max(G.schema || 0, DG.SAVE_SCHEMA);
    return G;
  };

  // ---------- Mie's wardrobe ----------
  DG.styleCharm = function (G) {
    if (!G.wardrobe || !G.day) return 0;
    const se = DG.season(G).id;
    return Object.values(G.wardrobe.wear).reduce((a, id) => {
      const w = byId(DG.WARDROBE, id);
      return a + (w ? w.charm + (w.season === se ? 1 : 0) : 0);
    }, 0);
  };
  DG.buyClothes = function (G, id) {
    const w = byId(DG.WARDROBE, id);
    if (!w || G.wardrobe.owned.includes(id) || G.money < w.cost) return false;
    G.money -= w.cost;
    G.wardrobe.owned.push(id);
    G.wardrobe.wear[w.slot] = id;   // put it on straight away
    G.home.happy = clamp(G.home.happy + 3, 0, 100);
    DG.updateGoals(G);
    return true;
  };
  DG.wearClothes = function (G, id) {
    const w = byId(DG.WARDROBE, id);
    if (!w || !G.wardrobe.owned.includes(id)) return false;
    G.wardrobe.wear[w.slot] = id;
    DG.updateGoals(G);
    return true;
  };
  // Mie's portrait look, dressed in what she is wearing (G optional)
  DG.mieLook = function (G) {
    const look = Object.assign({}, DG.MIE_LOOK);
    if (!G || !G.wardrobe) return look;
    const wear = G.wardrobe.wear;
    const o = byId(DG.WARDROBE, wear.outfit), a = byId(DG.WARDROBE, wear.acc), gl = byId(DG.WARDROBE, wear.glasses);
    if (o) { look.top = o.top; look.kind = o.kind; }
    look.measure = wear.acc === 'measure';
    look.acc = a && !['measure', 'noacc'].includes(a.id) ? a.id : null;
    look.accColor = a && a.color;
    if (gl) look.glassColor = gl.color;
    return look;
  };

  // ---------- Mie's home ----------
  // Happiness drops 10/day, 1 less per toy owned (min 3), plus 8 more if Dexter has no food.
  DG.homeDecay = G => Math.max(3, 10 - G.home.items.length - (G.home.house || 0));
  DG.house = G => DG.HOUSES[G.home.house || 0];
  DG.nextHouse = G => DG.HOUSES[(G.home.house || 0) + 1] || null;
  DG.homeFloor = G => DG.house(G).floor;
  // ---------- housing & realkreditlån ----------
  // annuity: yearly payment = L·r / (1 − (1+r)^−n), paid daily as 1/365 of it
  DG.annuityPerDay = (L, years) => {
    if (L <= 0 || years <= 0) return 0;
    const r = DG.MORTGAGE.rate;
    return L * r / (1 - Math.pow(1 + r, -years)) / 365;
  };
  DG.equity = G => (G.home.house ? DG.house(G).cost - G.home.loan.principal : 0);
  // cash needed to move: 5% down payment, minus the equity in the current home
  DG.moveCash = G => {
    const nx = DG.nextHouse(G);
    return nx ? Math.max(0, Math.round(DG.MORTGAGE.down * nx.cost - DG.equity(G))) : 0;
  };
  DG.housingCostPerDay = G => (G.home.house ? Math.round(G.home.loan.payment) : DG.HOUSES[0].rent);
  DG.moveHouse = function (G) {
    const nx = DG.nextHouse(G);
    if (!nx) return false;
    const cash = DG.moveCash(G);
    if (G.money < cash) return false;
    const principal = Math.max(0, nx.cost - DG.equity(G) - cash);
    G.money -= cash;
    G.home.house += 1;
    G.home.loan = { principal, payment: DG.annuityPerDay(principal, DG.MORTGAGE.years), yearsLeft: DG.MORTGAGE.years };
    G.home.happy = clamp(Math.max(G.home.happy + nx.joy, nx.floor), 0, 100);
    DG.updateGoals(G);
    return Object.assign({ cash, principal }, nx);
  };
  // extra repayment: lowers the debt and the daily payment over the remaining term
  DG.repayLoan = function (G, amount) {
    const L = G.home.loan;
    amount = Math.min(Math.round(amount), Math.round(L.principal), Math.floor(G.money));
    if (amount <= 0) return 0;
    G.money -= amount;
    L.principal -= amount;
    L.payment = L.principal < 1 ? 0 : DG.annuityPerDay(L.principal, L.yearsLeft);
    if (L.principal < 1) L.principal = 0;
    return amount;
  };
  // one day of the mortgage: interest accrues, the payment covers interest + repayment
  DG.mortgageDay = function (G) {
    const L = G.home.loan;
    if (!G.home.house || L.principal <= 0) return { pay: G.home.house ? 0 : DG.HOUSES[0].rent, interest: 0 };
    const interest = L.principal * DG.MORTGAGE.rate / 365;
    const pay = Math.min(L.payment, L.principal + interest);
    L.principal = Math.max(0, L.principal + interest - pay);
    L.yearsLeft = Math.max(0, L.yearsLeft - 1 / 365);
    if (L.principal < 1) { L.principal = 0; L.payment = 0; }
    return { pay: Math.round(pay), interest: Math.round(interest) };
  };
  DG.homeMood = function (G) {
    const h = G.home.happy;
    if (h >= 75) return { id: 'happy', label: 'Happy and rested', sat: 2, zone: 0.02 };
    if (h < 30) return { id: 'low', label: 'Misses her family', sat: -3, zone: -0.02 };
    return { id: 'ok', label: 'Doing fine', sat: 0, zone: 0 };
  };
  DG.canDoActivity = function (G, id) {
    const a = byId(DG.ACTIVITIES, id);
    if (a.seasons && !a.seasons.includes(DG.season(G).id)) return false;
    if (a.free) return G.home.did[id] !== G.day;
    return G.home.did.outing !== G.day && G.money >= a.cost;
  };
  DG.doActivity = function (G, id) {
    const a = byId(DG.ACTIVITIES, id);
    if (!DG.canDoActivity(G, id)) return false;
    if (a.free) G.home.did[id] = G.day; else { G.home.did.outing = G.day; G.money -= a.cost; }
    G.home.happy = clamp(G.home.happy + a.joy, 0, 100);
    DG.updateGoals(G);
    return true;
  };
  // Arranging the shop by hand: how far each piece may move from its usual spot, and its outline (x, y, w, h)
  // so it stays on the wall or on the floor. The taller landscape view has a deeper floor (tallY); a spot chosen
  // there is kept, and simply drawn nearer the wall in the shorter view.
  DG.DECOR_MOVE = {
    rug:        { x: [-170, 105], y: [-12, 22], tallY: [-12, 120], box: [180, 165, 112, 26] },
    plant:      { x: [-150, 175], y: [0, 40],   tallY: [0, 130],   box: [170, 94, 42, 60] },
    armchair:   { x: [-210, 100], y: [0, 40],   tallY: [0, 130],   box: [236, 128, 56, 36] },
    mirror:     { x: [-240, 105], y: [-30, 40], box: [257, 46, 30, 52] },
    gallery:    { x: [-280, 12],  y: [-14, 70], box: [298, 20, 86, 46] },
    chandelier: { x: [-170, 110], y: [0, 0],    box: [186, 14, 100, 40] },
  };
  DG.clampDecor = function (id, dx, dy, tall) {
    const m = DG.DECOR_MOVE[id];
    if (!m) return [0, 0];
    const c = (v, [a, b]) => Math.round(Math.min(b, Math.max(a, Number(v) || 0)));
    return [c(dx, m.x), c(dy, (tall && m.tallY) || m.y)];
  };
  DG.moveDecor = function (G, id, dx, dy) {
    if (!DG.DECOR_MOVE[id] || !G.decor.owned.includes(id)) return false;
    const [x, y] = DG.clampDecor(id, dx, dy, true);
    if (x || y) G.decor.pos[id] = [x, y]; else delete G.decor.pos[id];
    return true;
  };
  DG.decorPos = (G, id, tall) => (G.decor.pos && G.decor.pos[id] ? DG.clampDecor(id, G.decor.pos[id][0], G.decor.pos[id][1], tall) : [0, 0]);
  DG.buyHomeItem = function (G, id) {
    const it = byId(DG.HOME_ITEMS, id);
    if (G.home.items.includes(id) || G.money < it.cost) return false;
    G.money -= it.cost;
    G.home.items.push(id);
    G.home.happy = clamp(G.home.happy + it.joy, 0, 100);
    DG.updateGoals(G);
    return true;
  };
  DG.buyCatFood = function (G) {
    if (G.money < DG.CAT_FOOD.cost) return false;
    G.money -= DG.CAT_FOOD.cost;
    G.home.catFood += DG.CAT_FOOD.days;
    return true;
  };
  DG.endDayHome = function (G) {
    const h = G.home;
    const hungry = h.catFood <= 0;
    if (!hungry) h.catFood -= 1;
    const drop = DG.homeDecay(G) + (hungry ? 8 : 0);
    h.happy = clamp(h.happy - drop, DG.homeFloor(G), 100);
    h.event = pick(DG.HOME_EVENTS);
    return { drop, hungry, event: h.event, happy: h.happy };
  };

  // ---------- seasons ----------
  DG.seasonIndex = G => Math.floor(Math.max(0, G.day - 1) / DG.SEASON_LENGTH) % 4;
  DG.season = G => DG.SEASONS[DG.seasonIndex(G)];
  DG.daysLeftInSeason = G => DG.SEASON_LENGTH - (Math.max(0, G.day - 1) % DG.SEASON_LENGTH);
  DG.seasonFabric = (G, id) => {
    const se = DG.season(G);
    return se.in.includes(id) ? 'in' : se.out.includes(id) ? 'out' : null;
  };

  DG.charm = function (G) {
    const d = G.decor;
    const items = d.owned.reduce((a, id) => a + (byId(DG.DECOR, id) || { charm: 0 }).charm, 0);
    const pots = Math.min(3, (G.shelf || []).length);   // pottery on display
    // keepsakes: photos and paintings from the story customers
    return items + (byId(DG.WALLPAPERS, d.wallpaper) || { charm: 0 }).charm + pots + DG.styleCharm(G) + (G.keepsakes || 0);
  };
  DG.wages = G => DG.STAFF.reduce((a, st) => a + (G.staff[st.id] ? st.wage : 0), 0);
  DG.rackCapacity = G => 2 + DG.upgradeLevel(G, 'display') + 2 * DG.upgradeLevel(G, 'floor');

  // ---------- unlocks & prices ----------
  DG.isUnlocked = function (G, thing) {
    if (!thing) return false;
    if ((thing.tier || 0) > DG.upgradeLevel(G, 'supplier')) return false;
    if (thing.needs) {
      for (const k in thing.needs) if (DG.upgradeLevel(G, k) < thing.needs[k]) return false;
    }
    return true;
  };

  // the haggling upgrade, and whatever was won by haggling at the stalls today
  DG.discount = G => (1 - 0.08 * DG.upgradeLevel(G, 'haggle')) * (1 - ((G.today && G.today.haggle) || 0));

  DG.fabricPrice = function (G, id) {
    const f = byId(DG.FABRICS, id);
    const ev = G.market.event;
    const sale = ev && ev.type === 'sale' && ev.fabric === id ? 0.7 : 1;
    const se = G.day > 0 ? DG.seasonFabric(G, id) : null;
    const seasonal = se === 'in' ? 1.12 : se === 'out' ? 0.85 : 1;
    return Math.round(f.price * (G.market.mult[id] || 1) * DG.discount(G) * sale * seasonal);
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
      tights: Math.random() < 0.35 ? pick(['#2b2b33', '#5a4a52', '#c9a08a']) : null,
      shoes: pick(['#3b2a2f', '#7a4a2e', '#c44d6c', '#2f3b55', '#e8e0d6']),
    };
  };

  function buildText(c, arche) {
    const parts = [];
    if (c.storyLines) parts.push(...c.storyLines);
    else if (c.visits > 0) {
      if (c.lastS >= 85) parts.push('Mie! Your last dress was a hit. Everyone asked where I got it!');
      else if (c.lastS >= 70) parts.push("Hi again! I'm back for another one.");
      else parts.push("I'm giving you another chance. Let's do better this time, okay?");
    } else {
      parts.push(`Hi! I'm ${c.name}, ${/^[aeiou]/i.test(c.job) ? 'an' : 'a'} ${c.job}.`);
    }
    if (!c.storyLines) parts.push(pick(arche.lines));
    c.introN = parts.length;   // what she says in her own words; the rest is shown as wishes
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
    return parts;   // one sentence each, so each can be translated
  }

  DG.genCustomer = function (G, opts = {}) {
    const display = DG.upgradeLevel(G, 'display');
    let eligible = DG.ARCHETYPES.filter(a => a.minRep <= G.rep);
    if (opts.topTier) eligible = eligible.slice(-3);
    if (opts.arche) eligible = [byId(DG.ARCHETYPES, opts.arche)];
    // Higher-tier archetypes get more likely as the shop window improves.
    const se = DG.season(G);
    const evt = G.event || null;
    const weights = eligible.map(a => (1 + display * 0.35 * (a.minRep / 20) + (a.minRep > 0 ? 0.3 : 0)) * (se.arche[a.id] || 1) * ((evt && evt.arche && evt.arche[a.id]) || 1));
    let r = Math.random() * weights.reduce((x, y) => x + y, 0);
    let arche = eligible[0];
    for (let i = 0; i < eligible.length; i++) { r -= weights[i]; if (r <= 0) { arche = eligible[i]; break; } }

    // Returning customer?
    const busy = new Set(G.queue.map(q => q.cid).concat(G.active ? [G.active.cid] : []));
    const back = G.known.filter(k => k.lastS >= 40 && !busy.has(k.cid) && !(G.today && G.today.seen.includes(k.cid)));
    let base;
    if (opts.base) base = opts.base;
    else if (back.length && Math.random() < Math.min(0.45, 0.08 * back.length)) {
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
    let budget = randInt(arche.budget[0], arche.budget[1]) * (1 + 0.05 * display) * (loyal ? 1.1 : 1) * (ev && ev.type === 'buzz' ? 1.2 : 1)
      * (1 + 0.005 * DG.charm(G)) * ((G.boost && G.boost.budget) || 1) * ((evt && evt.budget) || 1);
    budget = opts.budget != null ? opts.budget : Math.round(budget / 10) * 10;

    const targets = {};
    // seasoned shops get more demanding customers, and regulars expect a little more each visit
    const lift = 1 + DG.BAL.ramp * clamp(G.rep, 0, 100) / 100, extra = Math.min(DG.BAL.visitMax, DG.BAL.visitStep * (base.visits || 0));
    for (const k in arche.t) targets[k] = clamp(Math.round((arche.t[k] * lift + extra + (Math.random() - 0.5)) * 2) / 2, 3, 9.5);
    const reqs = opts.reqs ? opts.reqs.slice() : arche.reqs.filter(([, p]) => Math.random() < p).map(([id]) => id);
    if (!opts.reqs && evt && evt.reqs && evt.reqs[arche.id]) evt.reqs[arche.id].forEach(r => { if (!reqs.includes(r)) reqs.push(r); });

    const c = Object.assign(base, {
      oid: 'o' + G.nextId++,
      arche: arche.id,
      title: arche.title,
      weights: Object.assign({}, opts.w || arche.w),
      targets,
      styles: arche.styles.slice(),
      reqs,
      budget,
      loyal,
    });
    if (opts.w) for (const k in opts.w) if (c.targets[k] == null) c.targets[k] = clamp(Math.round(6 * lift * 2) / 2, 3, 9.5);
    for (const k in c.targets) if (!c.weights[k]) delete c.targets[k];
    if (arche.colors && !opts.base) { c.liked = arche.colors.liked.slice(0, 2); c.disliked = arche.colors.disliked.slice(); }
    if (opts.storyLines) c.storyLines = opts.storyLines;
    c.parts = buildText(c, arche);
    c.text = c.parts.join(' ');
    return c;
  };

  // ---------- days ----------
  // shop rent per day: 1.000 kr + 100 kr per upgrade level + 600 kr for the upstairs floor
  DG.rent = G => 1000 + 100 * Object.values(G.upgrades).reduce((a, b) => a + b, 0) + 600 * DG.upgradeLevel(G, 'floor');
  DG.dailyCosts = G => DG.rent(G) + DG.wages(G);

  DG.startDay = function (G) {
    const prevSeason = G.day > 0 ? DG.seasonIndex(G) : -1;
    G.day += 1;
    G.newSeason = DG.seasonIndex(G) !== prevSeason;
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

    const cap = 2 + DG.upgradeLevel(G, 'display') + (G.staff.assistant ? 1 : 0) + DG.upgradeLevel(G, 'floor');
    let n = 1 + Math.floor(G.rep / 25) + (Math.random() < 0.3 ? 1 : 0) + DG.upgradeLevel(G, 'floor');
    if (G.market.event && G.market.event.type === 'rain') n -= 1;
    n = clamp(n, 1, cap) + extra;   // campaigns may exceed the usual cap
    G.today = { income: 0, spent: 0, served: 0, seen: [], startMoney: G.money };
    // a day in the Danish year, and news from the family
    G.event = DG.todaysEvent ? DG.todaysEvent(G) : null;
    if (DG.familyMorning) DG.familyMorning(G);
    G.queue = (G.returning || []).slice(0, n);
    G.returning = [];
    G.queue.forEach(c => G.today.seen.push(c.cid));
    for (let i = G.queue.length; i < n; i++) G.queue.push(DG.genCustomer(G, { topTier: i === 0 && booked.includes('influencer') }));
    // someone from the stories may drop by for the next chapter of her life
    const sc = DG.storyArrival && DG.storyArrival(G);
    if (sc) { if (G.queue.length >= n && G.queue.length > 1) G.queue.pop(); G.queue.unshift(sc); }
    if (DG.dailySurprise) DG.dailySurprise(G);
  };

  // SKAT on daily profit; an accountant raises the tax-free amount and lowers the rate.
  // SKAT on the shop's daily profit: bottom rate 37%, top rate 52% on the part above 2.000 kr.
  // Accountant level 1 finds 1.000 kr/day more deductions; level 2 (virksomhedsordningen) also cuts the top rate to 42%.
  DG.skatRule = G => {
    const lvl = G ? DG.upgradeLevel(G, 'accountant') : 0;
    return [{ free: 150, low: 0.37, top: 0.52, topFrom: 2000 }, { free: 1150, low: 0.37, top: 0.52, topFrom: 2000 }, { free: 2650, low: 0.37, top: 0.42, topFrom: 2000 }][lvl];
  };
  DG.skat = (profit, G) => {
    const r = DG.skatRule(G), x = Math.max(0, profit - r.free);
    return Math.round(Math.min(x, r.topFrom) * r.low + Math.max(0, x - r.topFrom) * r.top);
  };
  DG.HELP_FLOOR = 1500;   // the family never lets the shop run dry: below 375 kr they top it up to 1.500 kr
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
    G.stats.rackSold += sold.length;
    const pottery = DG.endDayPottery(G);
    G.money += pottery.income;
    if (G.today) G.today.income += pottery.income;
    const home = DG.endDayHome(G);
    G.money -= rent + wages;
    // family economy: Adam's salary in, rent or mortgage out
    const housing = DG.mortgageDay(G);
    const salary = DG.adamSalary ? DG.adamSalary(G) : DG.ADAM_SALARY;
    G.money += salary - housing.pay;
    // an evening at home for the day's event (Sankthans, Christmas Eve...)
    const evHome = G.event && G.event.home ? G.event : null;
    if (evHome) G.home.happy = clamp(G.home.happy + evHome.home.joy, 0, 100);
    // SKAT on the shop's profit; mortgage interest is deductible (rentefradrag)
    const t = G.today || { income: 0, spent: 0 };
    const profit = t.income - t.spent - rent - wages - housing.interest;
    const tax = DG.skat(profit, G);
    const taxWithout = DG.skat(profit);   // what it would have been without an accountant
    G.money -= tax;
    // nobody is turned away: whoever was still waiting simply pops back tomorrow
    G.returning = G.queue.slice(0, 3).map(c => Object.assign(c, { back: true }));
    G.queue = [];
    // there is no game over: when money runs out, Mie's parents help with a little envelope
    let help = 0;
    if (G.money < DG.HELP_FLOOR / 4) { help = DG.HELP_FLOOR - Math.round(G.money); G.money = DG.HELP_FLOOR; G.stats.helped = (G.stats.helped || 0) + 1; }
    const t2 = G.today || { income: 0, spent: 0, private: 0 };
    G.ledger.push({ day: G.day, income: t2.income, spent: t2.spent, private: t2.private || 0, rack: rackIncome, pots: pottery.income,
      rent, wages, salary, housing: housing.pay, interest: housing.interest, tax, help, money: Math.round(G.money) });
    if (G.ledger.length > 60) G.ledger.shift();
    DG.updateGoals(G);
    return { rent, wages, tax, taxSaved: taxWithout - tax, profit, housing, salary, evHome, missed, help, today: G.today, sold, rackIncome, assistant: G.staff.assistant, pottery, home };
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
    if (fa && accentM > 0) fabrics[fa.id] = round1((fabrics[fa.id] || 0) + accentM);

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
    const sf = fm && G.day > 0 ? DG.seasonFabric(G, fm.id) : null;
    if (sf === 'in') notes.push(`${fm.name} is perfect for ${DG.season(G).name.toLowerCase()}: +3 satisfaction.`);
    if (sf === 'out') notes.push(`${fm.name} feels wrong in ${DG.season(G).name.toLowerCase()}: −4 satisfaction.`);
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
    const sf = G.day > 0 ? DG.seasonFabric(G, design.main) : null;
    const seasonAdj = sf === 'in' ? 3 : sf === 'out' ? -4 : 0;

    // the bonuses (fitting room, loyalty, charm, in-season fabric, a happy home, Lise's tea) help, but only so far
    const mood = DG.homeMood(G).sat;
    const bonus = Math.min(DG.BAL.bonusCap, 3 * fitting + (cust.loyal ? 2 : 0) + 0.25 * DG.charm(G) + Math.max(0, seasonAdj) + Math.max(0, mood) + (cust.back && G.staff.assistant ? 3 : 0));
    const cw = DG.BAL.craftW;
    let S = 100 * ((0.75 - cw) * A + 0.15 * C + 0.10 * St + cw * craft) - 15 * failed.length + bonus + Math.min(0, seasonAdj) + Math.min(0, mood);
    S = Math.round(clamp(S, 0, 100));

    // full payment from four stars; tips only for something special
    const base = S >= 80 ? 1 : S >= 45 ? 0.5 + 0.5 * (S - 45) / 35 : 0.5;
    const pay = Math.round(cust.budget * base);
    const tip = S >= 88 ? Math.round(cust.budget * (S - 88) / 100 * 1.5 * (1 + 0.5 * fitting)) : 0;
    // a less successful dress costs a little reputation (at most 1.2), never more
    const repDelta = round1(S >= 70 ? (S - 70) / 12 : Math.max(-1.2, (S - 70) / 20));
    const stars = S >= 92 ? 5 : S >= 80 ? 4 : S >= 65 ? 3 : S >= 45 ? 2 : 1;

    return { S, A, C, St, craft, rows, failed, pay, tip, repDelta, stars, attrs, cost: an.cost, seasonAdj, moodAdj: DG.homeMood(G).sat };
  };

  // ---------- Mie's idea: a suggested design for when you'd rather not choose everything ----------
  // A handful of tries (a good sketch, not a perfect one: there is still room to make it shine), leaning on what the customer loves, keeps those she can afford today,
  // and prefers using fabric already on the shelf. Returns design fields, or null if nothing fits.
  DG.suggestDesign = function (G, cust, tries = 16, rnd = Math.random) {
    const pk = a => a[Math.floor(rnd() * a.length)];
    const fabs = DG.FABRICS.filter(f => DG.isUnlocked(G, f));
    const closures = DG.CLOSURES.filter(c => c.id !== 'none' && (!c.item || DG.isUnlocked(G, byId(DG.ITEMS, c.item))));
    const extras = DG.EXTRAS.filter(e => DG.isUnlocked(G, e) && (!e.item || DG.isUnlocked(G, byId(DG.ITEMS, e.item))));
    const liked = (cust.liked || []).filter(Boolean);
    const colourFor = f => (f.colors ? (f.colors.find(c => liked.includes(c)) || pk(f.colors)) : liked.length && rnd() < 0.75 ? pk(liked) : pk(DG.COLORS.filter(c => !(cust.disliked || []).includes(c.id))).id);
    const random = () => {
      const main = pk(fabs), styles = DG.SILHOUETTES.filter(x => (cust.styles || []).includes(x.id));
      const sil = styles.length && rnd() < 0.7 ? pk(styles) : pk(DG.SILHOUETTES);
      const accent = rnd() < 0.25 ? pk(fabs) : null;
      return { main: main.id, mainColor: colourFor(main), accent: accent && accent.id, accentColor: accent ? colourFor(accent) : pk(DG.COLORS).id,
        silhouette: sil.id, length: pk(DG.LENGTHS).id, neckline: pk(DG.NECKLINES).id, sleeves: pk(DG.SLEEVES).id,
        closure: sil.noClosure && rnd() < 0.5 ? 'none' : pk(closures).id, extras: extras.filter(() => rnd() < 0.2).map(e => e.id) };
    };
    const value = d => {
      const an = DG.analyze(d, G);
      if (an.issues.some(x => !x.startsWith('Need')) || an.missingCost > G.money) return null;
      const S = cust.rack ? DG.rackItem(d, G, 0.8).price / 5 : DG.evaluate(cust, d, G, 0.8).S;
      return S - an.missingCost / Math.max(300, cust.budget || 800) * 20;
    };
    let best = null, bestV = -Infinity;
    for (let i = 0; i < tries; i++) {
      // the second half refines the best so far by changing one thing at a time
      let d = random();
      if (best && i > tries / 2) { d = Object.assign({}, best, { extras: best.extras.slice() }); const k = pk(['main', 'silhouette', 'length', 'neckline', 'sleeves', 'closure', 'extras', 'accent']); const r = random(); d[k] = r[k]; if (k === 'main') d.mainColor = r.mainColor; if (k === 'accent') d.accentColor = r.accentColor; }
      const v = value(d);
      if (v != null && v > bestV) { best = d; bestV = v; }
    }
    return best;
  };

  // ---------- ready-to-wear rack ----------
  // Walk-in shoppers want a generally appealing dress: price = 0.9·materials + 150·appeal,
  // appeal = mean of the dress's three best stats (after stitching).
  DG.RACK_SHOPPER = {
    rack: true, name: 'the rack', title: 'Ready-to-wear', cid: 'rack', oid: 'rack',
    weights: {}, targets: {}, styles: [], reqs: [], liked: [], disliked: [], budget: 0, visits: 0,
  };
  DG.rackItem = function (design, G, craft) {   // price = 0.9·materials + 150·appeal, rounded to 50 kr
    const an = DG.analyze(design, G);
    const attrs = Object.assign({}, an.attrs);
    attrs.quality = clamp(round1(attrs.quality * (0.85 + 0.25 * craft)), 0, 10);
    const top3 = DG.ATTRS.map(k => attrs[k]).sort((a, b) => b - a).slice(0, 3);
    const appeal = round1(top3.reduce((a, b) => a + b, 0) / 3);
    const cost = design.cost != null ? design.cost : an.cost;
    const price = Math.round((0.9 * cost + 150 * appeal) / 50) * 50;
    return { design: Object.assign({}, design), appeal, cost, price, attrs };
  };

  // Complaint/praise line from the result.
  DG.feedbackLine = function (cust, ev, design) {
    if (ev.seasonAdj < 0) return `${byId(DG.FABRICS, design.main).name} in this weather... I'll save it for another season.`;
    if (ev.failed.length) return `Next time I'd love it with: ${DG.REQS[ev.failed[0]].short.toLowerCase()}.`;
    if (cust.disliked.includes(design.mainColor)) return `${byId(DG.COLORS, design.mainColor).name} isn't really my colour, but the work is lovely.`;
    const worst = ev.rows.slice().sort((a, b) => b.w * (1 - b.fit) - a.w * (1 - a.fit))[0];
    if (worst && worst.fit < 0.8) return `I wish it was more ${DG.ATTR_META[worst.k].adj}.`;
    if (ev.craft < 0.5) return 'A seam or two has a little personality.';
    if (cust.liked.includes(design.mainColor)) return `And the ${byId(DG.COLORS, design.mainColor).name.toLowerCase()}! My favourite colour!`;
    return '';
  };

  // ---------- collections: little sets to complete, each with a keepsake for the shop ----------
  DG.COLLECTIONS = [
    { id: 'fabrics', icon: '🧵', title: 'Fabric library', desc: 'Sew a dress in every fabric.', all: () => DG.FABRICS.map(f => f.id), reward: 6000 },
    { id: 'colours', icon: '🌈', title: 'Every colour of the rainbow', desc: 'Sew a dress in every colour.', all: () => DG.COLORS.map(c => c.id), reward: 5000 },
    { id: 'silhouettes', icon: '👗', title: 'The silhouette book', desc: 'Four stars or more in every silhouette.', all: () => DG.SILHOUETTES.map(x => x.id), reward: 8000 },
    { id: 'shapes', icon: '🏺', title: 'The potter\'s shelf', desc: 'Fire every pot shape in the kiln.', all: () => DG.POT_SHAPES.map(x => x.id), reward: 5000 },
    { id: 'seasons', icon: '🍂', title: 'Four seasons of five stars', desc: 'A five-star dress in every season.', all: () => DG.SEASONS.map(x => x.id), reward: 8000 },
  ];
  DG.collect = function (G, set, id) {
    const c = G.collections;
    if (!c || !id || !c[set] || c[set].includes(id)) return false;
    c[set].push(id);
    const col = byId(DG.COLLECTIONS, set);
    if (col && !c.done.includes(set) && col.all().every(x => c[set].includes(x))) {
      c.done.push(set);
      // a finished collection: a framed keepsake for the shop and a little reward, in tomorrow's post
      G.mail.push({ id: 'm' + G.nextId++, from: 'Mie', day: G.day + 1, title: col.title, text: `Collection complete: ${col.title}! A framed keepsake goes up on the shop wall.`, gift: { charm: 1, money: col.reward } });
    }
    return true;
  };

  // ---------- lookbook: the dresses worth remembering ----------
  DG.addToLookbook = function (G, cust, S, design) {
    if (S < 80 && !cust.story) return false;
    G.lookbook.unshift({ design: JSON.parse(JSON.stringify(design)), name: cust.name, title: cust.title, story: cust.story || null, S, day: G.day });
    // keep it light: at most 60, and story dresses are never the ones to go
    while (G.lookbook.length > 60) { const i = G.lookbook.map(e => !e.story).lastIndexOf(true); G.lookbook.splice(i < 0 ? G.lookbook.length - 1 : i, 1); }
    return true;
  };

  // ---------- stats & goals ----------
  DG.recordDress = function (G, cust, S, design) {
    const st = G.stats;
    if (design) {
      DG.collect(G, 'fabrics', design.main);
      DG.collect(G, 'colours', design.mainColor);
      if (S >= 80) DG.collect(G, 'silhouettes', design.silhouette);
      if (S >= 92) DG.collect(G, 'seasons', DG.season(G).id);
    }
    st.byArche[cust.arche] = (st.byArche[cust.arche] || 0) + 1;
    if (S >= 75) st.happy++;
    if (cust.arche === 'bride') st.brideBest = Math.max(st.brideBest, S);
    const se = DG.season(G).id;
    if (!st.seasons.includes(se)) st.seasons.push(se);
    DG.updateGoals(G);
  };

  // Goals stay complete once reached, even if e.g. reputation dips later.
  DG.updateGoals = function (G) {
    const fresh = [];
    DG.GOALS.forEach(g => {
      if (!G.goals.done.includes(g.id) && g.prog(G) >= g.target) { G.goals.done.push(g.id); fresh.push(g); }
    });
    return fresh;
  };
  DG.claimableGoals = G => G.goals.done.filter(id => !G.goals.claimed.includes(id));
  DG.claimGoal = function (G, id) {
    const g = byId(DG.GOALS, id);
    if (!g || !G.goals.done.includes(id) || G.goals.claimed.includes(id)) return 0;
    G.goals.claimed.push(id);
    G.money += g.reward;
    return g.reward;
  };

  // ---------- pottery ----------
  DG.kilnCapacity = G => (DG.upgradeLevel(G, 'pottery') >= 2 ? 5 : 3);
  DG.shelfCapacity = G => (DG.upgradeLevel(G, 'pottery') >= 2 ? 6 : 4);
  DG.shelfSaleChance = G => clamp(0.3 + 0.02 * DG.charm(G), 0, 0.8);
  DG.clayPrice = (G, id) => Math.round(byId(DG.CLAYS, id).price * DG.discount(G));
  DG.glazePrice = (G, id) => Math.round(byId(DG.GLAZES, id).price * DG.discount(G));
  DG.potItemPrice = (G, id) => Math.round(byId(DG.POT_ITEMS, id).price * DG.discount(G));

  DG.newPot = G => ({ clay: Object.keys(G.inv.clay).find(k => G.inv.clay[k] > 0) || 'stoneware', shape: 'cup', glaze: 'none', deco: 'none' });

  DG.analyzePot = function (pot, G) {
    const clay = byId(DG.CLAYS, pot.clay), shape = byId(DG.POT_SHAPES, pot.shape);
    const glaze = byId(DG.GLAZES, pot.glaze), deco = byId(DG.POT_DECOS, pot.deco);
    const kg = shape.kg;
    let cost = kg * DG.clayPrice(G, clay.id) + (glaze.price ? DG.glazePrice(G, glaze.id) : 0) + (deco.item ? DG.potItemPrice(G, deco.item) : 0);
    cost = Math.round(cost);
    const issues = [], missing = [];
    if (!DG.isUnlocked(G, clay)) issues.push(`${clay.name} needs supplier network level ${clay.tier}.`);
    if (!DG.isUnlocked(G, glaze)) issues.push(`${glaze.name} needs supplier network level ${glaze.tier}.`);
    if (G.kiln.length >= DG.kilnCapacity(G)) issues.push('The kiln is full. Pots are fired overnight, so close the shop to empty it.');
    const haveClay = round1(G.inv.clay[clay.id] || 0);
    if (haveClay < kg) { missing.push({ kind: 'clay', id: clay.id, qty: Math.ceil(round1(kg - haveClay)) }); issues.push(`Need ${kg} kg ${clay.name}, you have ${haveClay} kg.`); }
    if (glaze.price && !(G.inv.glazes[glaze.id] > 0)) { missing.push({ kind: 'glaze', id: glaze.id, qty: 1 }); issues.push(`Need a pot of ${glaze.name} glaze.`); }
    if (deco.item && !(G.inv.items[deco.item] > 0)) { missing.push({ kind: 'potitem', id: deco.item, qty: 1 }); issues.push('Need a sheet of gold leaf.'); }
    const missingCost = missing.reduce((a, m) => a + m.qty * (m.kind === 'clay' ? DG.clayPrice(G, m.id) : m.kind === 'glaze' ? DG.glazePrice(G, m.id) : DG.potItemPrice(G, m.id)), 0);
    return { kg, cost, issues, missing, missingCost, estimate: DG.potPrice(pot, 0.8) };
  };

  // price = base · clay · glaze · decoration · (0.6 + 0.8·throwing score), rounded to 5 kr
  // Hand-painting: 1.1 + 0.05 per colour used (max 4) + up to 0.1 for how much of the pot is covered.
  DG.paintMult = function (pot) {
    const strokes = pot.paint || [];
    if (!strokes.length) return 1;
    const colors = new Set(strokes.map(st => st.c)).size;
    const ink = strokes.reduce((a, st) => a + (st.n || 0) * st.w, 0);
    return Math.round((1.1 + 0.05 * Math.min(4, colors) + Math.min(0.1, ink / 6000)) * 100) / 100;
  };
  DG.potPrice = function (pot, score) {
    const deco = byId(DG.POT_DECOS, pot.deco);
    const v = byId(DG.POT_SHAPES, pot.shape).base * byId(DG.CLAYS, pot.clay).mult * byId(DG.GLAZES, pot.glaze).mult
      * (deco.paint ? DG.paintMult(pot) : deco.mult) * (0.6 + 0.8 * score);
    return Math.round(v / 5) * 5;
  };
  // wedge ∈ [0,1]: well-kneaded clay has no air bubbles (1 → ×0.8 risk, 0 → ×1.3)
  DG.crackChance = function (pot, score, G, wedge = 0.6) {
    const diff = byId(DG.POT_SHAPES, pot.shape).diff;
    return clamp(0.32 * (1 - score) * diff * (DG.upgradeLevel(G, 'pottery') >= 2 ? 0.5 : 1) * (1.3 - 0.5 * wedge), 0.03, 0.6);
  };

  // Consumes materials and puts the thrown pot in the kiln.
  DG.throwPot = function (G, pot, score, wedge = 0.6) {
    const an = DG.analyzePot(pot, G);
    G.inv.clay[pot.clay] = round1((G.inv.clay[pot.clay] || 0) - an.kg);
    if (byId(DG.GLAZES, pot.glaze).price) G.inv.glazes[pot.glaze] -= 1;
    const deco = byId(DG.POT_DECOS, pot.deco);
    if (deco.item) G.inv.items[deco.item] -= 1;
    const item = { pot: Object.assign({}, pot), score, cost: an.cost, price: DG.potPrice(pot, score), crack: DG.crackChance(pot, score, G, wedge) };
    G.kiln.push(item);
    G.stats.potsMade++;
    return item;
  };

  // Overnight: walk-ins buy from the shelf, then the kiln is fired and unloaded onto the shelf.
  DG.endDayPottery = function (G) {
    const p = DG.shelfSaleChance(G);
    const sold = [];
    G.shelf = G.shelf.filter(it => (Math.random() < p ? (sold.push(it), false) : true));
    const income = sold.reduce((a, it) => a + it.price, 0);
    G.stats.potsSold += sold.length;
    const fired = [], cracked = [];
    const keep = [];
    G.kiln.forEach(it => {
      if (Math.random() < it.crack) { cracked.push(it); G.stats.potsCracked++; return; }
      if (G.shelf.length < DG.shelfCapacity(G)) {
        G.shelf.push(it); fired.push(it);
        if (it.pot.shape === 'teapot') G.stats.teapots++;
        DG.collect(G, 'shapes', it.pot.shape);
        if (it.pot.paint && it.pot.paint.length) G.stats.painted++;
      } else keep.push(Object.assign(it, { crack: 0 }));  // fired fine, waits for shelf space
    });
    G.kiln = keep;
    return { sold, income, fired, cracked };
  };

  // Remember a customer after their visit; very unhappy customers never return.
  DG.rememberCustomer = function (G, cust, S) {
    if (cust.story) return;
    G.known = G.known.filter(k => k.cid !== cust.cid);
    {
      G.known.push({ cid: cust.cid, name: cust.name, look: cust.look, job: cust.job, liked: cust.liked,
        disliked: cust.disliked, visits: (cust.visits || 0) + 1, lastS: S });
      if (G.known.length > 15) G.known.shift();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
