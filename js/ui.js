// UI controller: renders views/overlays, handles input, runs the sewing mini-game.
(function () {
  const DG = window.DG;
  const { byId, clamp, round1, pick } = DG;
  let G = null;
  const UI = { homeTab: 'family', view: 'shop', tab: 'fabric', upTab: 'equipment', menuTab: 'settings', overlay: null, sew: null, raf: 0, confirm: null, dexter: null, exportCode: '', importErr: '' };

  const kr = n => `${Math.round(n).toLocaleString('da-DK')} kr`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // stat effects as actually applied (scaled by the balance knob)
  const fx = d => Object.entries(d).map(([k, raw]) => {
    const v = round1(raw * DG.BAL.delta);
    return `<span class="fx ${v > 0 ? 'up' : 'down'}">${DG.ATTR_META[k].icon}${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`;
  }).join('');

  let saveWarned = false;
  function save() {
    if (!G) return;
    if (DG.Profiles.saveGame(G)) saveWarned = false;
    else if (!saveWarned) { saveWarned = true; setTimeout(() => toast('Could not save on this device. Copy a save code from the menu to be safe.'), 50); }
  }
  // Opens the active player's save. A save that cannot be opened is moved aside rather than replaced,
  // so an update of the game can never wipe anyone's progress.
  function load() {
    let x = null;
    try {
      x = DG.Profiles.loadGame();
      if (x && x.version >= 1 && typeof x.day === 'number') return DG.ensureDefaults(x);
    } catch (e) { console.error('Could not open save', e); }
    if (DG.Profiles.hasSave()) { DG.Profiles.rescue(); UI.rescued = true; }
    return null;
  }

  let S = DG.Profiles.settings();
  function applySettings() {
    const r = document.documentElement;
    if (S.theme === 'auto') delete r.dataset.mieTheme; else r.dataset.mieTheme = S.theme;
    r.classList.toggle('no-anim', !S.anim);
    DG.setLang(S.lang);
    document.title = S.lang === 'da' ? 'Mies liv' : 'Life of Mie';
    DG.Audio.setVolumes(S.music, S.sfx, S.ambient);
  }
  const sfx = n => DG.Audio.play(n);
  // the game's name: "Life of Mie" / "Mies liv"
  const brandHtml = () => (S.lang === 'da' ? '<span class="brand-script">Mies</span> <span class="brand-word">liv</span>' : '<span class="brand-script">Life of</span> <span class="brand-word">Mie</span>');

  function toast(msg) {
    document.querySelectorAll('.toast').forEach(x => x.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    // placed once the screen has updated: below the top bar, or at the bottom while a window is open
    // so it never covers that window's title
    requestAnimationFrame(() => {
      const bar = document.querySelector('.topbar');
      if (document.body.classList.contains('modal-open')) t.classList.add('bottom');
      else if (bar) t.style.top = `${Math.max(10, bar.getBoundingClientRect().bottom + 8)}px`;
    });
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
  }

  // ---------------- shared bits ----------------
  function prioChips(c) {
    return Object.entries(c.weights).sort((a, b) => b[1] - a[1]).map(([k, w]) =>
      `<span class="pchip" title="${DG.ATTR_META[k].label}">${DG.ATTR_META[k].icon} ${DG.ATTR_META[k].label}<i>${'♥'.repeat(w)}</i></span>`).join('');
  }

  function briefHtml(c, design) {
    const reqs = c.reqs.map(r => {
      const ok = design ? DG.REQS[r].check(design) : null;
      return `<li class="${ok === null ? '' : ok ? 'ok' : 'no'}">${ok === null ? '•' : ok ? '✓' : '✗'} ${DG.REQS[r].short}</li>`;
    }).join('');
    const styles = c.styles.map(id => byId(DG.SILHOUETTES, id).name).join(', ');
    return `<div class="brief">
      <div class="brief-row"><span class="lbl">Wishes</span><div class="pchips">${prioChips(c)}</div></div>
      ${c.reqs.length ? `<div class="brief-row"><span class="lbl">Must have</span><ul class="reqs">${reqs}</ul></div>` : ''}
      <div class="brief-row"><span class="lbl">Colours</span><div class="colrow">${c.liked.map(id => DG.colorDot(id, 22)).join('')}<span class="muted small">loves</span>${c.disliked.map(id => DG.colorDot(id, 22)).join('')}<span class="muted small">dislikes</span></div></div>
      <div class="brief-row"><span class="lbl">Fancies</span><span>${styles}</span></div>
      ${c.family ? '<div class="brief-row"><span class="lbl">Payment</span><b>Hugs 💗</b></div>' : `<div class="brief-row"><span class="lbl">Budget</span><b>${kr(c.budget)}</b></div>`}
    </div>`;
  }

  function custCard(c, arg) {
    if (c.rack) {
      return `<div class="cust rackcard"><span class="rack-ic">👗</span><span class="cust-info"><span class="cust-name">Ready-to-wear dress</span>
        <span class="muted">For the rack. Walk-in shoppers buy in the evening.</span></span></div>`;
    }
    return `<button class="cust" data-act="openreq" data-arg="${arg}">
      ${DG.renderAvatar(c.look, 'neutral', 64)}
      <span class="cust-info"><span class="cust-name"><span translate="no">${esc(c.name)}</span> ${c.story ? '<span class="tag story">📖 Her story</span>' : c.visits ? '<span class="tag">Regular</span>' : ''}</span>
      <span class="muted">${esc(c.title)}</span><span class="pchips small">${prioChips(c)}</span></span>
      <span class="cust-budget">${c.family ? '💗' : kr(c.budget)}</span>
    </button>`;
  }

  const eligibleTitles = () => DG.ARCHETYPES.filter(a => a.minRep <= G.rep).map(a => a.title);

  // ---------------- cozy helpers: words and stars instead of numbers ----------------
  const yearOf = () => Math.floor(Math.max(0, G.day - 1) / (DG.SEASON_LENGTH * 4)) + 1;
  const dayOfSeason = () => (Math.max(0, G.day - 1) % DG.SEASON_LENGTH) + 1;
  // n of 5 stars (halves show as a partly filled star)
  const starsHtml = n => `<span class="stars5" aria-label="${Math.round(n * 2) / 2} of 5 stars"><i style="width:${clamp(Math.round(n * 2) / 2, 0, 5) * 20}%">★★★★★</i>☆☆☆☆☆</span>`;
  const moodWord = S => S >= 92 ? 'Over the moon' : S >= 80 ? 'Delighted' : S >= 65 ? 'Happy' : S >= 45 ? 'Pleased enough' : 'A polite smile';

  // On a landscape iPad the scenes fill the left of the screen, so they are drawn taller.
  const landscapeMQ = window.matchMedia('(orientation: landscape) and (min-width: 960px)');
  // the scene's real shape in the landscape layout, measured after each render (so the camera never crops its sides)
  let sceneAspect = 1;
  const tallScene = () => (landscapeMQ.matches ? sceneAspect : false);
  function measureScene() {
    const el = document.querySelector('.view > .scene-wrap');
    if (!el || !el.clientHeight || !landscapeMQ.matches) return false;
    const a = Math.max(0.9, Math.min(1.8, el.clientWidth / el.clientHeight));
    if (Math.abs(a - sceneAspect) < 0.02) return false;
    sceneAspect = a; return true;
  }
  window.addEventListener('resize', () => { clearTimeout(UI.fitT); UI.fitT = setTimeout(() => { if (measureScene()) render(); }, 150); });
  try { landscapeMQ.addEventListener('change', () => render()); } catch (e) { /* older Safari */ }

  // ---------------- top bar ----------------
  function topbar() {
    const navs = [['shop', '🏪', 'Shop'], ['market', '🧺', 'Market'], ['workshop', '✂️', 'Workshop'], ['studio', '🏺', 'Pottery'], ['home', '🏡', 'Home'], ['upgrades', '⭐', 'Upgrades'], ['album', '📖', 'Album']];
    const se = DG.season(G);
    const claimable = DG.claimableGoals(G).length;
    return `<header class="topbar">
      <div class="brand" translate="no">${DG.logoSVG(34)}${brandHtml()}</div>
      <div class="hud">
        <div class="hud-item" title="${DG.daysLeftInSeason(G)} days left of ${se.name.toLowerCase()}"><span class="lbl">Year ${yearOf()}</span><b>${se.icon} <span class="sname">${se.name}</span> ${dayOfSeason()}</b></div>
        <div class="hud-item"><span class="lbl">Purse</span><b>${kr(G.money)}</b></div>
        <div class="hud-item rep" title="Reputation ${Math.round(G.rep)} of 100"><span class="lbl">Reputation</span><b>${starsHtml(1 + G.rep / 25)}</b></div>
      </div>
      <nav class="nav">${navs.map(([id, ic, l]) => `<button class="navbtn ${UI.view === id ? 'on' : ''}" data-act="view" data-arg="${id}"><span class="ic">${ic}</span><span>${l}</span>${(id === 'workshop' && G.active) || (id === 'album' && (claimable || DG.mailToday(G).length)) ? '<i class="dot"></i>' : ''}</button>`).join('')}
        <button class="navbtn" data-act="menu" aria-label="Menu"><span class="ic">☰</span><span>Menu</span></button></nav>
    </header>`;
  }

  // ---------------- views ----------------
  function mieLine() {
    if (G.active && G.active.rack) return 'A dress for the rack is on the cutting table. Let\'s finish it!';
    if (G.active) return `${G.active.name}'s dress won't sew itself! Off to the workshop.`;
    if (G.queue.length === 1) return 'One customer is waiting. Tap her to hear what she wants.';
    if (G.queue.length > 1) return `${G.queue.length} customers are waiting. Who should I help first?`;
    return 'Everyone has been helped. Time to close up and put the kettle on.';
  }

  function viewShop() {
    const ev = G.market.event;
    const evText = !ev ? '' : ev.type === 'sale' ? `Market news: ${byId(DG.FABRICS, ev.fabric).name} is 30% off today.`
      : ev.type === 'buzz' ? 'Fashion Week buzz: customers bring 20% bigger budgets today.'
        : 'Rainy day in Copenhagen. Fewer customers are out shopping.';
    const queue = G.queue.map((c, i) => custCard(c, i)).join('');
    const eventBanner = G.event ? `<div class="event festive"><b>${G.event.icon} ${G.event.name}</b> ${esc(G.event.text)}</div>` : '';
    const seasonBanner = G.newSeason ? `<div class="event season">${DG.season(G).icon} ${esc(DG.season(G).hello)} In season: ${DG.season(G).in.map(id => byId(DG.FABRICS, id).name.toLowerCase()).join(', ')}.</div>` : '';
    const post = DG.mailToday(G);
    const mailBanner = post.length ? `<button class="event mail" data-act="readmail">📬 ${post.length === 1 ? `A letter from <span translate="no">${esc(post[0].from)}</span>` : `${post.length} letters in the post`}</button>` : '';
    const goalBanner = DG.claimableGoals(G).length ? `<button class="event goal" data-act="claimall">🏆 ${DG.claimableGoals(G).length} goal${DG.claimableGoals(G).length > 1 ? 's' : ''} complete. Tap to collect your reward!</button>` : '';
    const camp = G.boost && G.boost.campaigns && G.boost.campaigns.length
      ? `<div class="event teal">Today's marketing: ${G.boost.campaigns.map(id => byId(DG.MARKETING, id).name).join(', ')}.</div>` : '';
    const booked = G.marketing.length ? `<div class="event soft">Booked for tomorrow: ${G.marketing.map(id => byId(DG.MARKETING, id).name).join(', ')}.</div>` : '';
    const cap = DG.rackCapacity(G);
    const rack = `<section class="panel rack-panel">
        <div class="sec-head"><h2>Ready-to-wear rack</h2><span class="muted">${G.rack.length} of ${cap} hangers · each dress has a ${Math.round(DG.rackSaleChance(G) * 100)}% chance to sell every evening</span></div>
        ${G.rack.length ? `<div class="rack">${G.rack.map((it, i) => `<div class="rack-item"><span class="thumb">${DG.renderDress(it.design, 'rk' + i)}</span><b>${kr(it.price)}</b>
          <button class="btn small ghost" data-act="markdown" data-arg="${i}" ${it.price <= 300 ? 'disabled' : ''}>Mark down 20%</button></div>`).join('')}</div>`
          : '<p class="muted">Nothing on the rack yet. Sew a dress without an order to use up leftover fabric and earn money while you sleep.</p>'}
        <button class="btn wide" data-act="rackorder" ${G.active || G.rack.length >= cap ? 'disabled' : ''}>✂️ Sew a dress for the rack</button>
        ${G.active && !G.active.rack ? '<p class="muted small">Finish the current order first.</p>' : ''}
      </section>`;
    const walkIn = UI.walkIn; UI.walkIn = false;   // the morning's customers come in through the door
    const movable = Object.keys(DG.DECOR_MOVE).some(id => G.decor.owned.includes(id));
    const arrangeUi = !movable ? '' : UI.arrange
      ? '<div class="arrange-bar paper"><span>Drag the furniture where you like it</span><button class="btn small ghost" data-act="arrangereset">↺ Usual spots</button><button class="btn small primary" data-act="arrange">✓ Done</button></div>'
      : '<button class="arrange-btn" data-act="arrange" aria-label="Arrange the shop">🖌️ Arrange</button>';
    return `<div class="scene-wrap${UI.arrange ? ' arranging' : ''}">${DG.renderShop(G, { tall: tallScene(), walkIn, arrange: UI.arrange })}${arrangeUi}</div>
    <div class="shop-grid">
      <section class="panel mie-panel">
        <div class="mie-row">${DG.renderAvatar(DG.mieLook(G), 'happy', 96)}<div class="bubble">${esc(mieLine())}</div></div>
        ${mailBanner}${eventBanner}${goalBanner}${seasonBanner}${ev ? `<div class="event">${esc(evText)}</div>` : ''}${camp}${booked}
        <dl class="stats">
          <div><dt>Dresses made</dt><dd>${G.stats.served}</dd></div>
          <div><dt>Happy customers</dt><dd>${G.stats.served ? starsHtml(G.stats.totalS / G.stats.served / 20) : '–'}</dd></div>
          <div><dt>Shop charm</dt><dd>✨ ${DG.charm(G)}</dd></div>
          <div><dt>Regulars</dt><dd>${G.known.length}</dd></div>
          <div><dt>Mie's mood</dt><dd>${G.home.happy >= 75 ? '😊' : G.home.happy < 30 ? '😔' : '🙂'} ${Math.round(G.home.happy)}</dd></div>
        </dl>
        <button class="btn ghost wide" data-act="endday">${UI.confirm === 'endday' ? `Tap again: ${G.queue.length === 1 ? 'she pops' : 'they pop'} back tomorrow` : 'Close shop for today 🌙'}</button>
      </section>
      <section class="panel">
        ${G.active ? `<h2>Current order</h2>${custCard(G.active, 'active')}<button class="btn primary wide" data-act="view" data-arg="workshop">Go to the workshop ✂️</button>` : ''}
        <h2>${G.queue.length ? 'Waiting in the shop' : 'Nobody waiting'}</h2>
        <div class="queue">${queue || `<p class="muted">${G.active ? 'Finish the current order, then close the shop for the day.' : 'All customers have been served. Close the shop to start a new day.'}</p>`}</div>
      </section>
      ${rack}
    </div>`;
  }

  function viewMarket() {
    const h = DG.upgradeLevel(G, 'haggle');
    const fabricCard = f => {
      const locked = !DG.isUnlocked(G, f);
      const p = DG.fabricPrice(G, f.id);
      const ch = (G.market.mult[f.id] || 1) / (G.market.prev[f.id] || 1) - 1;
      const sale = G.market.event && G.market.event.type === 'sale' && G.market.event.fabric === f.id;
      const sf = DG.seasonFabric(G, f.id);
      const stag = sf === 'in' ? `<span class="stag in">${DG.season(G).icon} in season +12%</span>` : sf === 'out' ? '<span class="stag out">off-season −15%</span>' : '';
      const arrow = sale ? '<span class="trend sale">SALE −30%</span>'
        : ch > 0.02 ? `<span class="trend up">▲ ${Math.round(ch * 100)}%</span>`
          : ch < -0.02 ? `<span class="trend down">▼ ${Math.round(-ch * 100)}%</span>` : '<span class="trend flat">●</span>';
      return `<article class="card fabric ${locked ? 'locked' : ''}">
        <div class="card-top">${DG.swatchSVG(f.id, null, 'mk' + f.id, 56)}<div class="card-title"><b>${f.name}</b><span class="muted small">${f.desc}</span>${stag}</div></div>
        <div class="mini-stats">${DG.ATTRS.map(k => `<div title="${DG.ATTR_META[k].label}"><span>${DG.ATTR_META[k].icon}</span><i><b style="width:${f.s[k] * 10}%"></b></i></div>`).join('')}</div>
        <div class="price-row"><span class="price">${kr(p)}<small>/m</small></span>${arrow}<span class="own">Own ${round1(G.inv.fabrics[f.id] || 0)} m</span></div>
        ${locked ? `<div class="lock">🔒 Supplier network level ${f.tier}</div>`
          : `<div class="buy-row"><button class="btn small" data-act="buyf" data-arg="${f.id}:1">+1 m</button><button class="btn small" data-act="buyf" data-arg="${f.id}:3">+3 m</button><button class="btn small" data-act="buyf" data-arg="${f.id}:5">+5 m</button></div>`}
      </article>`;
    };
    const itemCard = it => {
      const locked = !DG.isUnlocked(G, it);
      const lockText = it.needs ? `🔒 Embroidery machine level ${it.needs.embroidery}` : `🔒 Supplier network level ${it.tier}`;
      return `<article class="card item ${locked ? 'locked' : ''}">
        <div class="card-top"><span class="item-ic">${it.icon}</span><div class="card-title"><b>${it.name}</b><span class="muted small">Own ${G.inv.items[it.id] || 0}</span></div></div>
        <div class="price-row"><span class="price">${kr(DG.itemPrice(G, it.id))}</span></div>
        ${locked ? `<div class="lock">${lockText}</div>` : `<div class="buy-row"><button class="btn small" data-act="buyi" data-arg="${it.id}:1">+1</button><button class="btn small" data-act="buyi" data-arg="${it.id}:3">+3</button></div>`}
      </article>`;
    };
    return `<div class="market">
      <section class="panel">
        ${UI.lastBuy && UI.lastBuy.day === G.day ? `<button class="btn small ghost undo-buy" data-act="undobuy">↶ Undo: ${UI.lastBuy.qty}${UI.lastBuy.kind === 'fabric' ? ' m' : '×'} ${UI.lastBuy.name}</button>` : ''}
        ${G.today && !G.today.haggleDone ? '<button class="btn haggle-btn" data-act="haggle">🤝 Haggle with the stallholder</button>' : G.today && G.today.haggle ? `<span class="tag haggled">🤝 −${Math.round(G.today.haggle * 100)}% today</span>` : ''}
        <div class="sec-head"><h2>Fabric stalls</h2><span class="muted">Price per metre today${h ? ` · haggling −${8 * h}%` : ''}. Prices move every morning.</span></div>
        <div class="grid">${DG.FABRICS.map(fabricCard).join('')}</div>
      </section>
      <section class="panel">
        <div class="sec-head"><h2>Notions</h2><span class="muted">Each dress uses one of each notion you add.</span></div>
        <div class="grid items">${DG.ITEMS.map(itemCard).join('')}</div>
      </section>
      <section class="panel">
        <div class="sec-head"><h2>Clay and glazes</h2><span class="muted">${DG.upgradeLevel(G, 'pottery') ? 'For the pottery studio.' : 'Open the pottery studio (Upgrades → Expansion) to start throwing pots.'}</span></div>
        <div class="grid items">${DG.CLAYS.map(c => {
          const locked = !DG.isUnlocked(G, c);
          return `<article class="card item ${locked ? 'locked' : ''}"><div class="card-top"><span class="clay-dot" style="--c:${c.hex}"></span><div class="card-title"><b>${c.name}</b><span class="muted small">${c.desc} Own ${round1(G.inv.clay[c.id] || 0)} kg</span></div></div>
            <div class="price-row"><span class="price">${kr(DG.clayPrice(G, c.id))}<small>/kg</small></span></div>
            ${locked ? `<div class="lock">🔒 Supplier network level ${c.tier}</div>` : `<div class="buy-row"><button class="btn small" data-act="buyclay" data-arg="${c.id}:1">+1 kg</button><button class="btn small" data-act="buyclay" data-arg="${c.id}:5">+5 kg</button></div>`}</article>`;
        }).join('')}${DG.GLAZES.filter(gl => gl.price).map(gl => {
          const locked = !DG.isUnlocked(G, gl);
          return `<article class="card item ${locked ? 'locked' : ''}"><div class="card-top"><span class="clay-dot" style="--c:${gl.hex}"></span><div class="card-title"><b>${gl.name} glaze</b><span class="muted small">Own ${G.inv.glazes[gl.id] || 0} · one per pot</span></div></div>
            <div class="price-row"><span class="price">${kr(DG.glazePrice(G, gl.id))}</span></div>
            ${locked ? `<div class="lock">🔒 Supplier network level ${gl.tier}</div>` : `<div class="buy-row"><button class="btn small" data-act="buyglaze" data-arg="${gl.id}:1">+1</button><button class="btn small" data-act="buyglaze" data-arg="${gl.id}:3">+3</button></div>`}</article>`;
        }).join('')}${DG.POT_ITEMS.map(it => `<article class="card item"><div class="card-top"><span class="item-ic">${it.icon}</span><div class="card-title"><b>${it.name}</b><span class="muted small">Own ${G.inv.items[it.id] || 0} · for gold rims</span></div></div>
            <div class="price-row"><span class="price">${kr(DG.potItemPrice(G, it.id))}</span></div>
            <div class="buy-row"><button class="btn small" data-act="buypotitem" data-arg="${it.id}:1">+1</button><button class="btn small" data-act="buypotitem" data-arg="${it.id}:3">+3</button></div></article>`).join('')}</div>
      </section>
    </div>`;
  }

  // Sew straight away, buying whatever is missing on the way; or let Mie sketch an idea.
  function wsActions(an) {
    const onlyMissing = an.issues.every(x => x.startsWith('Need'));
    const sew = !an.issues.length ? '<button class="btn primary big" data-act="sew">Start sewing 🪡</button>'
      : an.missing.length && onlyMissing ? `<button class="btn primary big" data-act="buyandsew" ${G.money < an.missingCost ? 'disabled' : ''}>Buy what's missing and sew (${kr(an.missingCost)}) 🪡</button>`
      : '<button class="btn primary big" data-act="sew" disabled>Start sewing 🪡</button>';
    return `<button class="btn ghost" data-act="idea">✨ Mie's idea</button>${sew}`;
  }

  function attrBars(attrs, c) {
    return DG.ATTRS.map(k => {
      const w = c.weights[k] || 0, t = c.targets[k];
      const v = attrs[k];
      const state = !w ? '' : v >= t ? 'met' : v >= t * 0.8 ? 'close' : 'short';
      return `<div class="abar ${w ? 'wanted' : ''} ${state}">
        <span class="alabel">${DG.ATTR_META[k].icon} ${DG.ATTR_META[k].label}${w ? `<i>${'♥'.repeat(w)}</i>` : ''}</span>
        <span class="atrack"><b style="width:${v * 10}%"></b>${w ? `<em style="left:${t * 10}%" title="Wish: ${t}"></em>` : ''}</span>
      </div>`;
    }).join('');
  }

  function chip(act, arg, on, inner, extra = '') {
    return `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-arg="${arg}" ${extra}>${inner}</button>`;
  }

  function colorRow(key, fabric, current, c) {
    const allowed = fabric && fabric.colors ? DG.COLORS.filter(x => fabric.colors.includes(x.id)) : DG.COLORS;
    return `<div class="colors">${allowed.map(col => {
      const mark = c.liked.includes(col.id) ? '♥' : c.disliked.includes(col.id) ? '✕' : '';
      return `<button class="color ${current === col.id ? 'on' : ''}" style="--c:${col.hex}" data-act="set" data-arg="${key}:${col.id}" aria-label="${col.name}" title="${col.name}"><span>${mark}</span></button>`;
    }).join('')}</div>`;
  }

  function tabFabric(d, c) {
    const fabs = DG.FABRICS.filter(f => DG.isUnlocked(G, f));
    const fm = byId(DG.FABRICS, d.main), fa = byId(DG.FABRICS, d.accent);
    const fabChip = (key, f) => chip('set', `${key}:${f.id}`, d[key] === f.id,
      `${DG.swatchSVG(f.id, d[key] === f.id ? d[key === 'main' ? 'mainColor' : 'accentColor'] : null, `${key}${f.id}`, 34)}<span class="chip-txt"><b>${f.name}</b><small>${round1(G.inv.fabrics[f.id] || 0)} m · ${kr(DG.fabricPrice(G, f.id))}/m</small>${key === 'main' && DG.seasonFabric(G, f.id) ? `<small class="stag ${DG.seasonFabric(G, f.id)}">${DG.seasonFabric(G, f.id) === 'in' ? DG.season(G).icon + ' in season' : 'off-season'}</small>` : ''}</span>`);
    return `<h3>Main fabric</h3><div class="chips">${fabs.map(f => fabChip('main', f)).join('')}</div>
      <h3>Main colour <small>♥ = ${esc(c.name)} loves it, ✕ = dislikes</small></h3>${colorRow('mainColor', fm, d.mainColor, c)}
      <h3>Accent fabric <small>used for sleeves, collar, pockets and ruffles</small></h3>
      <div class="chips">${chip('set', 'accent:', !d.accent, '<span class="chip-txt"><b>No accent</b><small>use main fabric</small></span>')}${fabs.map(f => fabChip('accent', f)).join('')}</div>
      ${d.accent ? `<h3>Accent colour</h3>${colorRow('accentColor', fa, d.accentColor, c)}` : ''}`;
  }

  function thumb(over, uid) {
    return `<span class="thumb">${DG.renderDress(Object.assign({}, G.design, over), uid)}</span>`;
  }

  function tabShape(d) {
    return `<h3>Silhouette</h3><div class="chips thumbs">${DG.SILHOUETTES.map(s => chip('set', `silhouette:${s.id}`, d.silhouette === s.id,
      `${thumb({ silhouette: s.id }, 's' + s.id)}<span class="chip-txt"><b>${s.name}</b><small>${fx(s.d)}</small></span>`)).join('')}</div>
      <h3>Length</h3><div class="chips">${DG.LENGTHS.map(l => chip('set', `length:${l.id}`, d.length === l.id,
        `<span class="chip-txt"><b>${l.name}</b><small>${fx(l.d) || '&nbsp;'}</small></span>`)).join('')}</div>`;
  }

  function tabDetails(d) {
    const sil = byId(DG.SILHOUETTES, d.silhouette);
    return `<h3>Neckline</h3><div class="chips thumbs">${DG.NECKLINES.map(n => chip('set', `neckline:${n.id}`, d.neckline === n.id,
        `${thumb({ neckline: n.id, extras: [] }, 'n' + n.id)}<span class="chip-txt"><b>${n.name}</b><small>${fx(n.d)}</small></span>`)).join('')}</div>
      <h3>Sleeves</h3><div class="chips thumbs">${DG.SLEEVES.map(s => chip('set', `sleeves:${s.id}`, d.sleeves === s.id,
        `${thumb({ sleeves: s.id, extras: [] }, 'v' + s.id)}<span class="chip-txt"><b>${s.name}</b><small>${fx(s.d)}</small></span>`)).join('')}</div>
      <h3>Closure ${sil.noClosure ? '<small>a wrap dress ties itself shut, so a closure is optional</small>' : '<small>every dress except a wrap needs one</small>'}</h3>
      <div class="chips">${DG.CLOSURES.map(cl => {
        const it = cl.item ? byId(DG.ITEMS, cl.item) : null;
        const locked = it && !DG.isUnlocked(G, it);
        const stock = it ? `own ${G.inv.items[it.id] || 0}` : '';
        return chip('set', `closure:${cl.id}`, d.closure === cl.id,
          `${cl.hex ? `<span class="btn-dot" style="--c:${cl.hex}"></span>` : ''}<span class="chip-txt"><b>${cl.name}</b><small>${locked ? '🔒 locked' : stock} ${fx(cl.d)}</small></span>`, locked ? 'disabled' : '');
      }).join('')}</div>`;
  }

  function tabExtras(d) {
    return `<h3>Extras <small>more than three decorations makes a dress look over-done</small></h3>
      <div class="chips">${DG.EXTRAS.map(e => {
        const it = e.item ? byId(DG.ITEMS, e.item) : null;
        const locked = (e.needs && !DG.isUnlocked(G, e)) || (it && !DG.isUnlocked(G, it));
        const use = it ? `own ${G.inv.items[it.id] || 0} ${it.name.toLowerCase()}` : e.m ? `${e.m} m fabric` : 'free';
        return chip('toggle', e.id, d.extras.includes(e.id),
          `<span class="ex-ic">${e.icon}</span><span class="chip-txt"><b>${e.name}</b><small>${locked ? '🔒 needs embroidery machine' : use}</small><small>${fx(e.d)}</small></span>`, locked ? 'disabled' : '');
      }).join('')}</div>`;
  }

  function viewWorkshop() {
    const c = G.active;
    if (!c) {
      return `<div class="empty panel">${DG.renderAvatar(DG.mieLook(G), 'neutral', 110)}<h2>No order on the table</h2>
        <p class="muted">Accept a customer's order in the shop, or sew a dress for the ready-to-wear rack.</p>
        <div class="actions center"><button class="btn primary" data-act="view" data-arg="shop">Back to the shop</button>
        <button class="btn" data-act="rackorder" ${G.rack.length >= DG.rackCapacity(G) ? 'disabled' : ''}>✂️ Sew for the rack</button></div></div>`;
    }
    const d = G.design;
    const an = DG.analyze(d, G);
    const fm = byId(DG.FABRICS, d.main), fa = byId(DG.FABRICS, d.accent);
    const tabs = [['fabric', 'Fabric'], ['shape', 'Shape'], ['details', 'Details'], ['extras', 'Extras']];
    const body = { fabric: tabFabric, shape: tabShape, details: tabDetails, extras: tabExtras }[UI.tab](d, c);
    const margin = c.budget - an.cost;
    return `<div class="ws">
      <section class="panel ws-left">
        ${c.rack ? `<div class="brief-mini"><span class="rack-ic">👗</span><div class="bm-txt"><b>Dress for the rack</b><span class="muted small">No customer: walk-in shoppers pay for a dress whose three best stats are high.</span></div>
          <button class="btn small ghost" data-act="cancelrack">Cancel</button></div>`
        : `<div class="brief-mini">${DG.renderAvatar(c.look, 'neutral', 56)}
          <div class="bm-txt"><b translate="no">${esc(c.name)}</b><span class="muted small">${esc(c.title)}</span></div>
          <button class="btn small ghost" data-act="openreq" data-arg="active">Read request</button></div>
        <div class="pchips">${prioChips(c)}</div>`}
        ${c.reqs.length ? `<ul class="reqs inline">${c.reqs.map(r => { const ok = DG.REQS[r].check(d); return `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${DG.REQS[r].short}</li>`; }).join('')}</ul>` : ''}
        <div class="stage${UI.twirl ? ' twirling' : ''}" data-act="twirl">${DG.renderDress(d, 'ws')}</div>
        <div class="attrs">${attrBars(an.attrs, c)}</div>
        <p class="muted small">${c.rack ? 'Careful stitching raises quality, and with it the price tag.' : `The marks show ${esc(c.name)}'s wishes. Careful stitching raises quality further.`}</p>
        <div class="ws-actions ws-actions-left">${wsActions(an)}</div>
      </section>
      <div class="ws-right">
        <section class="panel">
          <div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" class="tab ${UI.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}">${l}</button>`).join('')}</div>
          <div class="tabbody">${body}</div>
        </section>
        <section class="panel summary">
          <div class="sum-grid">
            <div><span class="lbl">Main fabric</span><b>${an.mainM} m</b><span class="muted small">${fm ? fm.name : 'none chosen'}</span></div>
            ${fa ? `<div><span class="lbl">Accent</span><b>${an.accentM} m</b><span class="muted small">${fa.name}</span></div>` : ''}
            <div><span class="lbl">Materials</span><b>${kr(an.cost)}</b><span class="muted small">at today's prices</span></div>
            ${c.rack ? `<div><span class="lbl">Est. price tag</span><b>${kr(DG.rackItem(d, G, 0.8).price)}</b><span class="muted small">with good stitching</span></div>`
              : c.family ? '<div><span class="lbl">Payment</span><b>Hugs 💗</b><span class="muted small">for your own daughter</span></div>'
              : `<div><span class="lbl">Budget</span><b>${kr(c.budget)}</b><span class="small ${margin < 0 ? 'bad' : 'good'}">${margin < 0 ? 'over budget' : `${kr(margin)} margin`}</span></div>`}
          </div>
          ${an.notes.map(n => `<p class="note">${esc(n)}</p>`).join('')}
          ${an.issues.length ? `<ul class="issues">${an.issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p class="ready">Everything is ready on the cutting table.</p>'}
          <div class="ws-actions ws-actions-sum">${wsActions(an)}</div>
        </section>
      </div>
    </div>`;
  }

  function viewUpgrades() {
    const tabs = [['equipment', 'Equipment'], ['expansion', 'Expansion'], ['decor', 'Decor'], ['staff', 'Staff'], ['marketing', 'Marketing']];
    const body = { equipment: upEquipment, expansion: upExpansion, decor: upDecor, staff: upStaff, marketing: upMarketing }[UI.upTab]();
    return `<div class="scene-wrap small">${DG.renderShop(G)}</div>
      <div class="panel"><div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" class="tab ${UI.upTab === id ? 'on' : ''}" data-act="uptab" data-arg="${id}">${l}</button>`).join('')}</div>
      <div class="tabbody">${body}</div></div>`;
  }

  function upDecor() {
    const charm = DG.charm(G);
    return `<div class="sec-head"><h2>Decorate the shop</h2><span class="muted">Charm ✨ ${charm}: +${(charm * 0.25).toFixed(2)} satisfaction and +${(charm * 0.5).toFixed(1)}% customer budgets. Decor never costs rent.</span></div>
      <div class="grid upg">${DG.DECOR.map(dc => {
        const own = G.decor.owned.includes(dc.id);
        return `<article class="card ${own ? 'owned' : ''}"><div class="card-top"><span class="item-ic">${dc.icon}</span><div class="card-title"><b>${dc.name}</b><span class="muted small">✨ +${dc.charm} charm</span></div></div>
          <p class="small">${dc.desc}</p>
          ${own ? '<div class="lock done">In the shop ✓</div>' : `<button class="btn primary" data-act="buydecor" data-arg="${dc.id}" ${G.money < dc.cost ? 'disabled' : ''}>Buy: ${kr(dc.cost)}</button>`}</article>`;
      }).join('')}</div>
      <h3>Wallpaper <small>only the wallpaper on the wall counts towards charm</small></h3>
      <div class="chips">${DG.WALLPAPERS.map(w => {
        const own = G.decor.walls.includes(w.id), on = G.decor.wallpaper === w.id;
        return `<button class="chip ${on ? 'on' : ''}" data-act="wallpaper" data-arg="${w.id}" ${!own && G.money < w.cost ? 'disabled' : ''}><span class="chip-txt"><b>${w.name}</b><small>${on ? 'on the wall' : own ? 'owned: tap to hang' : kr(w.cost)} · ✨ +${w.charm}</small></span></button>`;
      }).join('')}</div>`;
  }

  function upStaff() {
    return `<div class="sec-head"><h2>Hire help</h2><span class="muted">A one-off hiring fee, then wages every evening with the rent. You can let staff go at any time.</span></div>
      <div class="grid upg">${DG.STAFF.map(st => {
        const hired = G.staff[st.id];
        return `<article class="card ${hired ? 'owned' : ''}"><div class="card-top">${DG.renderAvatar(st.look, hired ? 'happy' : 'neutral', 56)}<div class="card-title"><b>${st.name}</b><span class="muted small">Wage ${kr(st.wage)} / day</span></div></div>
          <p class="small">${st.desc}</p>
          ${hired ? `<button class="btn ghost" data-act="fire" data-arg="${st.id}">${UI.confirm === 'fire-' + st.id ? 'Tap again to let them go' : 'Let go'}</button>`
            : `<button class="btn primary" data-act="hire" data-arg="${st.id}" ${G.money < st.fee ? 'disabled' : ''}>Hire: ${kr(st.fee)}</button>`}</article>`;
      }).join('')}</div>`;
  }

  function upMarketing() {
    return `<div class="sec-head"><h2>Marketing</h2><span class="muted">Campaigns are paid today and work tomorrow. Book as many as you like.</span></div>
      <div class="grid upg">${DG.MARKETING.map(m => {
        const booked = G.marketing.includes(m.id), locked = G.rep < m.minRep;
        return `<article class="card ${booked ? 'owned' : ''} ${locked ? 'locked' : ''}"><div class="card-top"><span class="item-ic">${m.icon}</span><div class="card-title"><b>${m.name}</b><span class="muted small">${kr(m.cost)}</span></div></div>
          <p class="small">${m.desc}</p>
          ${booked ? '<div class="lock done">Booked for tomorrow ✓</div>' : locked ? `<div class="lock">🔒 Reputation ${m.minRep}</div>`
            : `<button class="btn primary" data-act="campaign" data-arg="${m.id}" ${G.money < m.cost ? 'disabled' : ''}>Book: ${kr(m.cost)}</button>`}</article>`;
      }).join('')}</div>`;
  }

  function upEquipment() {
    return `<div class="sec-head"><h2>Equipment and shop</h2><span class="muted">Each upgrade level adds 100 kr to the daily rent.</span></div>
      <div class="grid upg">${DG.UPGRADES.filter(u => u.group !== 'expansion').map(upgradeCard).join('')}</div>
      <h3>Who visits the shop</h3>
      <ul class="arche-list">${DG.ARCHETYPES.map(a => `<li class="${a.minRep <= G.rep ? 'on' : ''}"><b>${a.title}</b><span class="muted small">${a.minRep <= G.rep ? 'visiting' : `from reputation ${a.minRep}`} · ${kr(a.budget[0])} to ${kr(a.budget[1])}</span></li>`).join('')}</ul>`;
  }

  function upExpansion() {
    return `<div class="sec-head"><h2>Grow the atelier</h2><span class="muted">Big steps. The upstairs floor adds 700 kr to the daily rent, the pottery studio 100 kr per level.</span></div>
      <div class="grid upg">${DG.UPGRADES.filter(u => u.group === 'expansion').map(upgradeCard).join('')}</div>`;
  }

  function upgradeCard(u) {
    const lvl = DG.upgradeLevel(G, u.id), max = u.costs.length;
    const cost = u.costs[lvl];
    return `<article class="card upgrade">
      <div class="card-top"><span class="item-ic">${u.icon}</span><div class="card-title"><b>${u.name}</b><span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span></div></div>
      <p class="small">${u.desc}</p>
      ${lvl >= max ? '<div class="lock done">Fully upgraded ✓</div>'
        : `<button class="btn primary" data-act="upgrade" data-arg="${u.id}" ${G.money < cost ? 'disabled' : ''}>Buy level ${lvl + 1}: ${kr(cost)}</button>`}
    </article>`;
  }

  // ---------------- overlays ----------------
  function ovIntro() {
    return `<div class="overlay"><div class="sheet intro">
      <div class="mie-row">${DG.renderAvatar(DG.mieLook(G), 'ecstatic', 120)}<div>
        <h1 translate="no">${brandHtml()}</h1>
        <p>Mie has just opened a tiny dress shop on a cobbled street in Copenhagen. She has a sewing machine, a dress form, 8.000 kr in the bank and big dreams.</p></div></div>
      <ol class="howto">
        <li><b>Meet customers.</b> Each one has wishes: quality, workwear, creativity, exclusivity, elegance or comfort, plus favourite colours, must-haves and a budget.</li>
        <li><b>Shop the market.</b> Buy fabric by the metre and notions like buttons, zippers and lace. Prices change every day.</li>
        <li><b>Design the dress.</b> Pick fabrics, colours, silhouette, length, neckline, sleeves, closure and extras. The bars show how close you are.</li>
        <li><b>Sew it.</b> Tap in time with the needle. Neat stitches mean better quality.</li>
        <li><b>Get paid and grow.</b> Happy customers pay in full, tip and come back. Spend the money on upgrades and unlock fancier clients.</li>
      </ol>
      <button class="btn primary big wide" data-act="closeov">Open the shop</button>
    </div></div>`;
  }

  function ovReq(arg) {
    const isActive = arg === 'active';
    const c = isActive ? G.active : G.queue[+arg];
    if (!c) return '';
    return `<div class="overlay dismissable"><div class="sheet req">
      <div class="req-head">${DG.renderAvatar(c.look, 'happy', 104)}<div><h2 translate="no">${esc(c.name)}</h2><span class="muted">${c.story ? `📖 Chapter ${c.ch + 1}: ${esc(c.title)}` : `${esc(c.title)}${c.visits ? ` · visit no. ${c.visits + 1}` : ''}`}</span></div></div>
      <div class="bubble big">${(c.parts || [c.text]).slice(0, c.introN || 2).map(x => `<span>${esc(x)}</span>`).join(' ')}</div>
      ${briefHtml(c, isActive ? G.design : null)}
      <div class="actions">
        ${isActive ? '<button class="btn primary" data-act="closeov">Back to work</button>'
          : `<button class="btn ghost" data-act="decline" data-arg="${arg}">Kindly decline</button>
             <button class="btn" data-act="closeov">Not yet</button>
             <button class="btn primary" data-act="accept" data-arg="${arg}" ${G.active ? 'disabled' : ''}>Accept order</button>`}
      </div>
      ${G.active && !isActive ? '<p class="muted small center">Finish your current order before taking a new one.</p>' : ''}
    </div></div>`;
  }

  const STEP_LABEL = { cut: '✂️ Cut', stitch: '🪡 Stitch', iron: '♨️ Iron', wedge: '👐 Knead', wheel: '🏺 Wheel', paint: '🎨 Paint' };
  function stepsBar(steps, cur) {
    const ci = steps.indexOf(cur);
    return `<div class="steps">${steps.map((st, i) => `<span class="step ${i === ci ? 'on' : i < ci ? 'done' : ''}">${STEP_LABEL[st]}</span>`).join('')}</div>`;
  }
  function ovSew() {
    const ph = UI.sew.phase;
    const title = G.active.rack ? 'Sewing a dress for the rack' : `Sewing ${esc(G.active.name)}'s dress`;
    if (ph !== 'stitch') return `<div class="overlay"><div class="sheet sew mg-sheet">${stepsBar(UI.sew.steps, ph)}<p class="muted small">${title}</p><div id="mg" class="mg"></div></div></div>`;
    return `<div class="overlay"><div class="sheet sew">${UI.sew.steps.length > 1 ? stepsBar(UI.sew.steps, ph) : ''}
      <h2>${title}</h2>
      <p class="muted">Tap <b>Stitch</b> when the needle is over the green. The gold centre is a perfect stitch.</p>
      <div class="sew-stage">${DG.renderDress(G.design, 'sew')}</div>
      <div class="track"><div class="zone" id="zone"><div class="sweet"></div></div><div class="needle" id="needle"></div></div>
      <div class="sdots" id="sdots">${'<i></i>'.repeat(5)}</div>
      <div class="sfb" id="sfb">Five stitches. Steady hands!</div>
      <button class="btn primary huge" data-act="stitch">Stitch!</button>
    </div></div>`;
  }

  function ovResult(o) {
    const { ev, cust, design } = o;
    const mood = ['sad', 'sad', 'neutral', 'happy', 'happy', 'ecstatic'][ev.stars];
    const colorWord = id => cust.liked.includes(id) ? 'a favourite' : cust.disliked.includes(id) ? 'disliked' : 'neutral';
    const profit = ev.pay + ev.tip - ev.cost;
    const after = ev.S >= 88 ? `${esc(cust.name)} is going to tell all her friends about Mie's.` : ev.S >= 65 ? `${esc(cust.name)} will be back.` : `${esc(cust.name)} might pop by again another day.`;
    return `<div class="overlay"><div class="sheet result">
      <div class="res-top">
        <div class="res-dress wearing">${DG.renderDress(design, 'res', { wearer: cust.look, mood: ev.stars >= 4 ? 'ecstatic' : ev.stars >= 3 ? 'happy' : 'neutral' })}</div>
        <div class="res-say">
          <div class="mie-row">${DG.renderAvatar(cust.look, mood, 96)}<div class="bubble"><span>${esc(o.quote)}</span> <span>${esc(o.line)}</span></div></div>
          <div class="score"><span class="stars">${'★'.repeat(ev.stars)}${'☆'.repeat(5 - ev.stars)}</span><span class="mood-word">${moodWord(ev.S)}</span></div>
          <p class="paid">${cust.family ? '💗 Paid in hugs' : `💰 ${ev.tip ? `Paid ${kr(ev.pay)} and a ${kr(ev.tip)} tip` : `Paid ${kr(ev.pay)}`}`}</p>
          <p class="muted small">${after}</p>
        </div>
      </div>
      <button class="link-btn" data-act="toggle-ui" data-arg="resDetails">${UI.resDetails ? 'Hide the details' : 'How did she judge it?'}</button>
      ${UI.resDetails ? `
      <div class="res-grid">
        <div>
          <h3>What ${esc(cust.name)} judged</h3>
          <table class="rtable"><tbody>
            ${ev.rows.sort((a, b) => b.w - a.w).map(r => `<tr><td>${DG.ATTR_META[r.k].icon} ${DG.ATTR_META[r.k].label} <i class="hearts">${'♥'.repeat(r.w)}</i></td><td class="num">${r.v.toFixed(1)} / ${r.t}</td><td>${r.v >= r.t ? '✓' : r.fit > 0.7 ? '~' : '✗'}</td></tr>`).join('')}
            <tr><td>🎨 Colour</td><td class="num">${byId(DG.COLORS, design.mainColor).name}</td><td>${colorWord(design.mainColor) === 'a favourite' ? '♥' : colorWord(design.mainColor) === 'disliked' ? '✗' : '~'}</td></tr>
            ${ev.seasonAdj ? `<tr><td>${DG.season(G).icon} Season</td><td class="num">${byId(DG.FABRICS, design.main).name}</td><td>${ev.seasonAdj > 0 ? '♥ +3' : '✗ −4'}</td></tr>` : ''}
            ${ev.moodAdj ? `<tr><td>🏡 Mie's mood</td><td class="num">${ev.moodAdj > 0 ? 'happy home' : 'misses family'}</td><td>${ev.moodAdj > 0 ? '+2' : '−3'}</td></tr>` : ''}
            <tr><td>👗 Silhouette</td><td class="num">${byId(DG.SILHOUETTES, design.silhouette).name}</td><td>${ev.St === 1 ? '♥' : '~'}</td></tr>
            ${cust.reqs.map(r => `<tr><td>📌 ${DG.REQS[r].short}</td><td></td><td>${ev.failed.includes(r) ? '✗ −15' : '✓'}</td></tr>`).join('')}
            <tr><td>🪡 Stitching</td><td class="num">${Math.round(ev.craft * 100)}%</td><td>${ev.craft >= 0.8 ? '✓' : ev.craft >= 0.5 ? '~' : '✗'}</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>The books</h3>
          <table class="rtable money"><tbody>
            <tr><td>Payment</td><td class="num">${kr(ev.pay)}</td></tr>
            <tr><td>Tip</td><td class="num">${kr(ev.tip)}</td></tr>
            <tr><td>Materials used</td><td class="num">−${kr(ev.cost)}</td></tr>
            <tr class="tot"><td>Profit</td><td class="num ${profit < 0 ? 'bad' : 'good'}">${kr(profit)}</td></tr>
            <tr><td>Satisfaction</td><td class="num">${ev.S}%</td></tr>
            <tr><td>Reputation</td><td class="num">${ev.repDelta > 0 ? '+' : ''}${ev.repDelta}</td></tr>
          </tbody></table>
        </div>
      </div>` : ''}
      <div class="actions">${G.queue.length ? `<button class="btn big" data-act="resultdone">Back to the shop</button><button class="btn primary big" data-act="nextcust">Next customer: <span translate="no">${esc(G.queue[0].name)}</span></button>`
        : '<button class="btn primary big wide" data-act="resultdone">Back to the shop</button>'}</div>
    </div></div>`;
  }

  function ovRackDone(o) {
    const it = o.item;
    return `<div class="overlay"><div class="sheet center">
      <div class="res-dress small-dress">${DG.renderDress(it.design, 'rackres')}</div>
      <h2>On the rack for ${kr(it.price)}</h2>
      <p>Stitching ${Math.round(o.craft * 100)}% · appeal ${it.appeal.toFixed(1)} / 10 · materials ${kr(it.cost)}</p>
      <p class="muted small">Walk-in shoppers browse the rack every evening. Each dress has a ${Math.round(DG.rackSaleChance(G) * 100)}% chance to sell per night. Charm and a better shop window raise the odds.</p>
      <button class="btn primary big wide" data-act="resultdone">Back to the shop</button>
    </div></div>`;
  }

  // opening the app: the street outside the shop, then the door opens with a ring of the bell
  function ovMorning() {
    const waiting = G.queue.length, mail = DG.mailToday(G).length;
    const evening = G.today && !G.queue.length && !G.active && G.stats.served > 0;
    const hints = [];
    if (waiting) hints.push(waiting > 1 ? `${waiting} customers are already at the door.` : 'A customer is already at the door.');
    if (mail) hints.push('There is a letter in the post.');
    return `<div class="overlay morning-ov"><div class="morning-scene">${DG.renderStorefront(G, { open: UI.doorOpen })}</div>
      <div class="morning-card panel">
        <h2>${evening ? 'Welcome back' : `Good morning, ${esc((DG.Profiles.active() || {}).name || 'Mie')}`}</h2>
        <p class="muted morning-sub"><span>${DG.season(G).icon}</span> <span>${DG.season(G).name}</span> <span>${dayOfSeason()}</span>${hints.map(h => `<span class="hint">${h}</span>`).join('')}</p>
        <button class="btn primary big" data-act="opendoor">Open the shop</button>
      </div></div>`;
  }

  function ovDayEnd(o) {
    const r = o.res, t = r.today || { income: 0, spent: 0, served: 0, startMoney: G.money };
    const net = Math.round(G.money - (t.startMoney == null ? G.money : t.startMoney));
    const lines = [];
    if (t.served) lines.push(['👗', t.served > 1 ? `${t.served} dresses went home with their new owners.` : 'A dress went home with its new owner.']);
    if (r.sold && r.sold.length) lines.push(['🧺', `Walk-in shoppers took ${r.sold.length} dress${r.sold.length > 1 ? 'es' : ''} from the rack.`]);
    if (r.pottery && r.pottery.sold.length) lines.push(['🏺', `${r.pottery.sold.length} pot${r.pottery.sold.length > 1 ? 's' : ''} found a new home.`]);
    if (r.pottery && r.pottery.fired.length) lines.push(['🔥', `The kiln is warm: ${r.pottery.fired.length} new pot${r.pottery.fired.length > 1 ? 's' : ''} for the shelf tomorrow.`]);
    if (r.pottery && r.pottery.cracked.length) lines.push(['💔', `${r.pottery.cracked.length} pot${r.pottery.cracked.length > 1 ? 's' : ''} cracked in the kiln. It happens to every potter.`]);
    if (r.missed) lines.push(['☕', `${r.missed} customer${r.missed > 1 ? 's' : ''} will pop back tomorrow${r.assistant ? ', after a cup of Lise\'s tea' : ''}.`]);
    if (r.taxSaved) lines.push(['🧮', `Your accountant kept ${kr(r.taxSaved)} away from SKAT.`]);
    if (r.evHome) lines.push([r.evHome.icon, r.evHome.home.text]);
    if (r.stickers && r.stickers.length) lines.push(['✨', r.stickers.length === 1 ? `New sticker in the album: ${byId(DG.STICKERS, r.stickers[0]).name}` : `${r.stickers.length} new stickers in the album.`]);
    if (r.help) lines.push(['💌', `Mie's mum and dad popped by with an envelope: "For the shop, skat. We're so proud of you."`]);
    if (!lines.length) lines.push(['🌙', 'A quiet day. The shop smells of fresh linen and tea.']);
    return `<div class="overlay"><div class="sheet dayend">
      <h2>Evening, ${DG.season(G).name.toLowerCase()} ${dayOfSeason()} 🌙</h2>
      <div class="dayend-grid">
      ${r.home ? `<div class="dinner"><div class="scene-wrap dinner-wrap">${DG.renderDinner(G, { ev: r.evHome ? r.evHome.id : null, bounce: UI.bounce })}</div>
        <p class="dinner-cap">${esc(r.home.event)}${r.home.hungry ? '<br><b>Dexter is hungry. Buy cat food on the Home screen!</b>' : ''}</p></div>` : ''}
      <div class="dayend-side">
      <ul class="diary">${lines.map(([ic, txt]) => `<li><span class="ic">${ic}</span><span>${esc(txt)}</span></li>`).join('')}</ul>
      <p class="purse-line">👛 ${kr(G.money)} in the purse <span class="${net >= 0 ? 'good' : 'muted'}">(${net >= 0 ? '+' : '−'}${kr(Math.abs(net))} today)</span></p>
      <button class="link-btn" data-act="toggle-ui" data-arg="showBooks">${UI.showBooks ? 'Close the accounts' : '📒 Today\'s accounts'}</button>
      ${UI.showBooks ? `
      <table class="rtable money"><tbody>
        <tr><td>Dresses delivered</td><td class="num">${t.served}</td></tr>
        <tr><td>Income</td><td class="num good">${kr(t.income)}</td></tr>
        <tr><td>Shop purchases</td><td class="num">−${kr(t.spent)}</td></tr>
        ${t.private ? `<tr><td>Family and private spending</td><td class="num">−${kr(t.private)}</td></tr>` : ''}
        ${o.res.sold && o.res.sold.length ? `<tr><td>Rack sales (${o.res.sold.length} dress${o.res.sold.length > 1 ? 'es' : ''}, included in income)</td><td class="num good">${kr(o.res.rackIncome)}</td></tr>` : ''}
        ${o.res.pottery && o.res.pottery.sold.length ? `<tr><td>Pottery sold (${o.res.pottery.sold.length}, included in income)</td><td class="num good">${kr(o.res.pottery.income)}</td></tr>` : ''}
        ${o.res.pottery && (o.res.pottery.fired.length || o.res.pottery.cracked.length) ? `<tr><td>Kiln: ${o.res.pottery.fired.length} fired${o.res.pottery.cracked.length ? `, ${o.res.pottery.cracked.length} cracked 💔` : ' perfectly'}</td><td class="num">${kr(o.res.pottery.fired.reduce((a, it) => a + it.price, 0))} to shelf</td></tr>` : ''}
        <tr><td>Rent and upkeep</td><td class="num">−${kr(o.res.rent)}</td></tr>
        ${o.res.wages ? `<tr><td>Staff wages</td><td class="num">−${kr(o.res.wages)}</td></tr>` : ''}
        ${o.res.salary ? `<tr><td>👔 Adam's salary</td><td class="num good">+${kr(o.res.salary)}</td></tr>` : ''}
        ${o.res.housing ? `<tr><td>🏡 ${G.home.house ? 'Mortgage payment (realkreditlån)' : 'Rent for the flat'}</td><td class="num">−${kr(o.res.housing.pay)}</td></tr>` : ''}
        ${o.res.tax ? `<tr><td>SKAT on the shop's profit of ${kr(o.res.profit)}</td><td class="num">−${kr(o.res.tax)}</td></tr>` : ''}
        ${o.res.taxSaved ? `<tr><td>🧮 Saved by your accountant</td><td class="num good">${kr(o.res.taxSaved)}</td></tr>` : ''}
        ${o.res.help ? `<tr><td>💌 From Mie's parents</td><td class="num good">+${kr(o.res.help)}</td></tr>` : ''}
        <tr class="tot"><td>Bank balance</td><td class="num">${kr(G.money)}</td></tr>
      </tbody></table>` : ''}
      <button class="btn primary big wide" data-act="nextday">Good night</button>
      </div></div>
    </div></div>`;
  }

  // who wrote it: a customer or the family drawn as themselves, anyone else as an envelope
  function letterFace(m) {
    const fam = { Adam: DG.FAMILY.adam.look, Elizabeth: DG.FAMILY.elizabeth.look, Mie: DG.mieLook(G) }[m.from];
    if (m.look || fam) return DG.renderAvatar(Object.assign({}, m.look || fam, { bg: '#f5ead8' }), 'happy', 64);
    return `<span class="avatar-q letter-ic">${m.from === 'Dexter' ? '🐈' : '✉️'}</span>`;
  }
  function ovLetter(o) {
    const m = o.m, gf = m.gift || {};
    const gifts = [];
    if (gf.money) gifts.push(`💰 ${kr(gf.money)} in the envelope.`);
    if (gf.fabric) gifts.push(`🧵 ${gf.m} m ${byId(DG.FABRICS, gf.fabric).name.toLowerCase()} for the shelf.`);
    if (gf.items) gifts.push(`🪡 ${gf.n} × ${byId(DG.ITEMS, gf.items).name.toLowerCase()}.`);
    if (gf.charm) gifts.push('🖼️ A keepsake for the shop wall (+1 charm).');
    if (gf.happy) gifts.push('🏡 It made the whole family smile.');
    return `<div class="overlay"><div class="sheet letter-sheet">
      <div class="paper">
        <div class="letter-head">${letterFace(m)}<div><span class="muted small">${m.story || /^[A-Z][a-zæøå]+$/.test(m.from) ? 'A letter from' : 'In the post'}</span><h2 ${m.story || m.look || /^[A-Z][a-zæøå]+$/.test(m.from) ? 'translate="no"' : ''}>${esc(m.from)}</h2>${m.title ? `<span class="muted small">${esc(m.title)}</span>` : ''}</div></div>
        <p class="letter-text">${esc(m.text)}</p>
        ${gifts.map(x => `<p class="letter-gift">${x}</p>`).join('')}
      </div>
      <button class="btn primary big wide" data-act="keepmail" data-arg="${m.id}">Keep it in the album</button>
    </div></div>`;
  }

  function ovMenu() {
    const tabs = [['settings', '⚙️ Settings'], ['players', '👤 Players'], ['save', '💾 Save'], ['help', '❓ Help']];
    const t = UI.menuTab;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="chip ${String(S[key]) === String(v) ? 'on' : ''}" data-act="setting" data-arg="${key}:${v}">${l}</button>`).join('')}</div>`;
    const slider = (key, label) => `<div class="set-row"><label class="lbl" for="vol-${key}">${label}</label><input type="range" id="vol-${key}" min="0" max="100" step="5" value="${Math.round(S[key] * 100)}" data-setting="${key}"><span class="vol" id="vol-${key}-v">${Math.round(S[key] * 100)}%</span></div>`;
    let body = '';
    if (t === 'settings') {
      body = `<div class="set-row"><span class="lbl">Language / Sprog</span>${seg('lang', [['en', 'English'], ['da', 'Dansk']])}</div>
        <div class="set-row"><span class="lbl">Theme</span>${seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        ${slider('music', 'Music')}${slider('sfx', 'Sound effects')}${slider('ambient', 'Ambience')}
        <div class="set-row"><span class="lbl">Animations</span>${seg('anim', [[true, 'On'], [false, 'Off']])}</div>
        <div class="set-row"><span class="lbl">Tips</span>${seg('tips', [[true, 'On'], [false, 'Off']])}</div>
        <div class="set-row"><span class="lbl">Mini-games</span>${seg('minigames', [['full', 'Full'], ['quick', 'Quick']])}</div>
        <p class="muted small">Full: cut, stitch and iron each dress; knead clay before the wheel. Quick: only the stitching and the wheel. Painting pots is always included.</p>`;
    } else if (t === 'players') {
      const act = DG.Profiles.active();
      body = `<p class="muted small">Every player has their own shop on this device.</p>
        <ul class="players">${DG.Profiles.list().map(p => `<li class="${act && p.id === act.id ? 'on' : ''}">
          <div class="pl-main"><b translate="no">${esc(p.name)}</b><span class="muted small">Day ${p.day || 0} · ${kr(p.money || 0)}</span></div>
          <div class="pl-act">${act && p.id === act.id ? '<span class="tag">Playing</span>' : `<button class="btn small primary" data-act="switchplayer" data-arg="${p.id}">Play</button>
            <button class="btn small ghost" data-act="deleteplayer" data-arg="${p.id}">${UI.confirm === 'del-' + p.id ? 'Tap again to delete' : 'Delete'}</button>`}</div>
          <div class="pl-rename"><input class="text-in small" id="rn-${p.id}" value="${esc(p.name)}" maxlength="24" aria-label="Rename ${esc(p.name)}"><button class="btn small" data-act="renameplayer" data-arg="${p.id}">Rename</button></div>
        </li>`).join('')}</ul>
        <h3>New player</h3>
        <div class="inline-form"><input class="text-in" id="newname" maxlength="24" value="Mie" autocomplete="off"><button class="btn primary" data-act="newplayer">Create</button></div>`;
    } else if (t === 'save') {
      body = `<p>Your game saves automatically on this device after every move. There is no account and no server, so nothing leaves the device unless you copy a save code.</p>
        <button class="btn primary wide" data-act="savenow">💾 Save now</button>
        <h3>Move your game to another device</h3>
        <p class="muted small">Copy the save code, send it to yourself, and import it on the other device.</p>
        ${UI.exportCode ? `<textarea class="code" id="exportcode" readonly rows="3">${UI.exportCode}</textarea><button class="btn wide" data-act="copycode">📋 Copy save code</button>` : '<button class="btn wide" data-act="exportcode">Show save code</button>'}
        <h3>Import a save code</h3>
        <textarea class="code" id="importcode" rows="3" placeholder="Paste a code starting with MIE1:"></textarea>
        ${UI.importErr ? `<p class="bad small">${esc(UI.importErr)}</p>` : ''}
        <button class="btn wide" data-act="importcode">Import as a new player</button>
        ${(() => {
          const bs = DG.Profiles.backups();
          return bs.length ? `<h3>Earlier saves</h3><p class="muted small">A copy is kept automatically on each day you play.</p>
            <ul class="backup-list">${bs.map((b, i) => `<li><span>Day ${b.day}</span> <span class="muted small" translate="no">${new Date(b.at).toLocaleDateString(S.lang === 'da' ? 'da-DK' : 'en-GB')}</span>
              <button class="btn small ghost" data-act="restorebackup" data-arg="${i}">${UI.confirm === 'rb-' + i ? 'Tap again to restore' : 'Restore'}</button></li>`).join('')}</ul>` : '';
        })()}
        <h3>Start over</h3>
        <button class="btn ghost wide" data-act="newgame">${UI.confirm === 'newgame' ? 'Tap again to erase this player\'s shop and start over' : 'Start a new game for this player'}</button>`;
    } else {
      body = helpHtml();
    }
    return `<div class="overlay dismissable"><div class="sheet menu-sheet">
      <div class="menu-head"><h2>Menu</h2><button class="btn small" data-act="closeov" aria-label="Close menu">✕</button></div>
      <div class="tabs">${tabs.map(([id, l]) => `<button class="tab ${t === id ? 'on' : ''}" data-act="menutab" data-arg="${id}">${l}</button>`).join('')}</div>
      <div class="menu-body">${body}</div>
    </div></div>`;
  }

  function overlay() {
    const o = UI.overlay;
    if (!o) return '';
    switch (o.type) {
      case 'intro': return ovIntro();
      case 'morning': return ovMorning();
      case 'kidsew': return ovKidSew(o);
      case 'train': return ovTrain(o);
      case 'req': return ovReq(o.arg);
      case 'sew': return ovSew();
      case 'result': return ovResult(o);
      case 'rackdone': return ovRackDone(o);
      case 'dayend': return ovDayEnd(o);
      case 'menu': return ovMenu();
      case 'letter': return ovLetter(o);
      case 'throw': return ovThrow();
      case 'thrown': return ovThrown(o);
      case 'wedge': return ovPotStep('wedge');
      case 'paint': return ovPotStep('paint');
      case 'haggle': return '<div class="overlay"><div class="sheet sew mg-sheet"><div id="mg" class="mg"></div></div></div>';
      default: return '';
    }
  }

  // ---------------- pottery studio ----------------
  function viewStudio() {
    const lvl = DG.upgradeLevel(G, 'pottery');
    if (!lvl) {
      const demo = { clay: 'stoneware', shape: 'vase', glaze: 'celadon', deco: 'painted' };
      return `<div class="empty panel"><div class="pot-hero">${DG.renderPot(demo, 'demo')}</div><h2>A pottery corner for Mie?</h2>
        <p class="muted">Throw cups, bowls, vases and teapots on the wheel, fire them overnight in the kiln and sell them from a shelf. Pots on display also add charm to the shop.</p>
        <button class="btn primary" data-act="goexpansion">See the pottery studio upgrade</button></div>`;
    }
    if (!G.pot) G.pot = DG.newPot(G);
    const pot = G.pot;
    const an = DG.analyzePot(pot, G);
    const opt = (key, list, label) => `<h3>${label}</h3><div class="chips">${list.map(x => {
      const locked = !DG.isUnlocked(G, x);
      let sub = '';
      if (key === 'clay') sub = `${round1(G.inv.clay[x.id] || 0)} kg · ${kr(DG.clayPrice(G, x.id))}/kg`;
      if (key === 'shape') sub = `${x.kg} kg · ${'●'.repeat(Math.round(x.diff * 2 - 1))} difficulty`;
      if (key === 'glaze') sub = x.price ? `own ${G.inv.glazes[x.id] || 0} · ${kr(DG.glazePrice(G, x.id))}` : 'raw clay';
      if (key === 'deco') sub = x.paint ? 'paint it yourself: up to ×1.4' : `value ×${x.mult}${x.item ? ` · own ${G.inv.items[x.item] || 0} gold leaf` : ''}`;
      const sw = key === 'clay' || key === 'glaze' ? `<span class="clay-dot small" style="--c:${x.hex || byId(DG.CLAYS, pot.clay).hex}"></span>` : '';
      return chip('setpot', `${key}:${x.id}`, pot[key] === x.id, `${sw}<span class="chip-txt"><b>${x.name}</b><small>${locked ? '🔒 locked' : sub}</small></span>`, locked ? 'disabled' : '');
    }).join('')}</div>`;
    return `<div class="ws">
      <section class="panel ws-left">
        <h2>The pottery corner</h2>
        <div class="stage pot-stage">${DG.renderPot(pot, 'studio')}</div>
        <div class="sum-grid">
          <div><span class="lbl">Clay</span><b>${an.kg} kg</b></div>
          <div><span class="lbl">Materials</span><b>${kr(an.cost)}</b></div>
          <div><span class="lbl">Est. price</span><b>${kr(an.estimate)}</b><span class="muted small">with a steady hand</span></div>
        </div>
        ${an.issues.length ? `<ul class="issues">${an.issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p class="ready">Clay is wedged and the wheel is ready.</p>'}
        <div class="actions">
          ${an.missing.length ? `<button class="btn" data-act="buypotmissing" ${G.money < an.missingCost ? 'disabled' : ''}>🧺 Buy what's missing (${kr(an.missingCost)})</button>` : ''}
          <button class="btn primary big" data-act="throw" ${an.issues.length ? 'disabled' : ''}>Throw on the wheel 🏺</button>
        </div>
      </section>
      <div class="ws-right">
        <section class="panel">${opt('shape', DG.POT_SHAPES, 'Shape')}${opt('clay', DG.CLAYS, 'Clay')}${opt('glaze', DG.GLAZES, 'Glaze')}${opt('deco', DG.POT_DECOS, 'Decoration')}</section>
        <section class="panel">
          <div class="sec-head"><h2>Kiln</h2><span class="muted">${G.kiln.length} of ${DG.kilnCapacity(G)} spaces · fired tonight when you close the shop</span></div>
          ${G.kiln.length ? `<div class="rack">${G.kiln.map((it, i) => `<div class="rack-item"><span class="thumb">${DG.renderPot(it.pot, 'k' + i, { raw: true })}</span><span class="small">${Math.round(it.crack * 100)}% crack risk</span></div>`).join('')}</div>` : '<p class="muted">Empty. Throw a pot to fill it.</p>'}
        </section>
        <section class="panel">
          <div class="sec-head"><h2>Shelf</h2><span class="muted">${G.shelf.length} of ${DG.shelfCapacity(G)} · each pot has a ${Math.round(DG.shelfSaleChance(G) * 100)}% chance to sell every evening · up to 3 pots add charm</span></div>
          ${G.shelf.length ? `<div class="rack">${G.shelf.map((it, i) => `<div class="rack-item"><span class="thumb">${DG.renderPot(it.pot, 'st' + i)}</span><b>${kr(it.price)}</b>
            <button class="btn small ghost" data-act="potmarkdown" data-arg="${i}" ${it.price <= 100 ? 'disabled' : ''}>Mark down 20%</button></div>`).join('')}</div>` : '<p class="muted">Nothing for sale yet.</p>'}
        </section>
      </div>
    </div>`;
  }

  function ovThrow() {
    const shape = byId(DG.POT_SHAPES, G.pot.shape);
    return `<div class="overlay"><div class="sheet sew">${potSteps().length > 1 ? stepsBar(potSteps(), 'wheel') : ''}
      <h2>Throwing a ${shape.name.toLowerCase()}</h2>
      <p class="muted"><b>Hold</b> the button to press on the clay, let go to ease off. Keep the marker inside the green band until the pot is done.</p>
      <div class="sew-stage throw-stage" id="throwpot">${DG.renderPot(G.pot, 'throw', { raw: true, grow: 0, wheel: true })}</div>
      <div class="track"><div class="zone" id="tzone"></div><div class="needle" id="tmark"></div></div>
      <div class="tprog"><i id="tprog"></i></div>
      <div class="sfb" id="tfb">Centre the clay...</div>
      <button class="btn primary huge" data-act="press" id="pressbtn">Hold to press ✋</button>
    </div></div>`;
  }

  function ovThrown(o) {
    const it = o.item;
    return `<div class="overlay"><div class="sheet center">
      <div class="pot-hero">${DG.renderPot(it.pot, 'thrown')}</div>
      <h2>${o.score >= 0.85 ? 'Beautifully centred!' : o.score >= 0.6 ? 'A nice, even pot.' : o.score >= 0.35 ? 'A bit lopsided...' : 'Wobbly, but it holds together.'}</h2>
      <p>${o.wedge != null && S.minigames === 'full' ? `Kneading ${Math.round(o.wedge * 100)}% · ` : ''}Centring ${Math.round(o.score * 100)}% · price tag ${kr(it.price)} · crack risk ${Math.round(it.crack * 100)}%</p>
      <p class="muted small">It goes into the kiln and is fired tonight. If it survives, it appears on the shelf tomorrow morning.</p>
      <button class="btn primary big wide" data-act="closeov">Back to the studio</button>
    </div></div>`;
  }

  function startThrowLoop() {
    cancelAnimationFrame(UI.raf);
    const t = UI.throwSt;
    let wob = 0;
    const step = now => {
      if (!UI.overlay || UI.overlay.type !== 'throw') return;
      const dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 0;
      t.last = now;
      if (!t.done) {
        t.t += dt;
        t.p = clamp(t.p + (t.holding ? 0.85 : -0.65) * dt + (Math.random() - 0.5) * 0.04, 0, 1);
        t.center = 0.5 + 0.24 * Math.sin(t.t * 0.95 * t.diff + t.phase);
        const inBand = Math.abs(t.p - t.center) <= t.w / 2;
        if (inBand) t.good += dt;
        const z = document.getElementById('tzone'), m = document.getElementById('tmark'), pr = document.getElementById('tprog'), fb = document.getElementById('tfb');
        if (z) { z.style.left = `${(t.center - t.w / 2) * 100}%`; z.style.width = `${t.w * 100}%`; }
        if (m) m.style.left = `${t.p * 100}%`;
        if (pr) pr.style.width = `${Math.min(100, (t.t / t.dur) * 100)}%`;
        if (fb) fb.textContent = inBand ? 'Nicely centred ✨' : t.p < t.center ? 'Press harder!' : 'Too much pressure!';
        // the clay rises as you throw, and wobbles when it is off centre
        const pg = document.querySelector('#throwpot .pot-grow');
        if (pg) {
          const gr = 0.25 + 0.75 * Math.min(1, t.t / t.dur);
          const off = inBand ? 0 : Math.min(1, Math.abs(t.p - t.center) * 3);
          wob += ((off * Math.sin(t.t * 14) * 2.2) - wob) * 0.25;
          pg.setAttribute('transform', `translate(${(60 + wob).toFixed(2)} 100) skewX(${(wob * 1.5).toFixed(2)}) scale(1 ${gr.toFixed(3)}) translate(-60 -100)`);
        }
        if (t.t >= t.dur) { t.done = true; setTimeout(() => finishThrow(t.good / t.dur), 400); }
      }
      UI.raf = requestAnimationFrame(step);
    };
    UI.raf = requestAnimationFrame(step);
  }

  function potSteps() {
    return (S.minigames === 'full' ? ['wedge', 'wheel'] : ['wheel']).concat(G.pot.deco === 'handpainted' ? ['paint'] : []);
  }
  function startThrowing() {
    const an = DG.analyzePot(G.pot, G);
    if (an.issues.length) return;
    UI.potRun = { wedge: 0.6, score: 0 };
    if (S.minigames === 'full') { UI.overlay = { type: 'wedge' }; render(); return; }
    startWheel();
  }
  function startWheel() {
    const shape = byId(DG.POT_SHAPES, G.pot.shape);
    const lvl = DG.upgradeLevel(G, 'pottery');
    UI.throwSt = { t: 0, dur: 6, p: 0.2, holding: false, good: 0, last: 0, phase: Math.random() * 6, diff: shape.diff,
      center: 0.5, w: clamp(0.3 - 0.07 * (shape.diff - 1) + (lvl >= 2 ? 0.04 : 0) + (G.staff.apprentice ? 0.02 : 0), 0.14, 0.36), done: false };
    UI.overlay = { type: 'throw' };
    render();
  }

  function finishThrow(score) {
    score = clamp(score, 0, 1);
    UI.potRun.score = score;
    if (G.pot.deco === 'handpainted') { UI.overlay = { type: 'paint' }; render(); return; }
    completePot(score, null);
  }
  function completePot(score, strokes) {
    const pot = Object.assign({}, G.pot, strokes ? { paint: strokes } : {});
    const item = DG.throwPot(G, pot, score, UI.potRun.wedge);
    DG.updateGoals(G);
    sfx('good');
    UI.overlay = { type: 'thrown', item, score, wedge: UI.potRun.wedge };
    save();
    render();
  }
  function ovPotStep(type) {
    return `<div class="overlay"><div class="sheet sew mg-sheet ${type === 'paint' ? 'paint-sheet' : ''}">${stepsBar(potSteps(), type)}<div id="mg" class="mg"></div></div></div>`;
  }

  // ---------------- Mie's home ----------------
  // All the money details live here, so the rest of the game can stay calm.
  function ledgerHtml() {
    const L = G.ledger.slice().reverse();
    const inn = e => e.income + e.salary + e.help, out = e => e.spent + e.private + e.rent + e.wages + e.housing + e.tax;
    const week = L.slice(0, 7), sum = f => week.reduce((a, e) => a + f(e), 0);
    const rows = [['Shop takings', e => e.income], ['Adam\'s salary', e => e.salary], ['Fabric and supplies', e => -e.spent], ['Family and private', e => -e.private],
      ['Shop rent and upkeep', e => -e.rent], ['Staff wages', e => -e.wages], [G.home.house ? 'Mortgage' : 'Flat rent', e => -e.housing], ['SKAT', e => -e.tax], ['From Mie\'s parents', e => e.help]]
      .filter(([, f]) => week.some(e => f(e)));
    return `<section class="panel ledger">
      <div class="sec-head"><h2>📒 Accounts</h2><span class="muted">Everything that came in and went out, for when you feel like doing the books.</span></div>
      ${!L.length ? '<p class="muted">The book is still empty. Each evening is written down here.</p>' : `
      <h3>The last ${week.length === 1 ? 'day' : `${week.length} days`}</h3>
      <table class="rtable money"><tbody>
        ${rows.map(([l, f]) => { const v = sum(f); return `<tr><td>${l}</td><td class="num ${v < 0 ? '' : 'good'}">${v < 0 ? '−' : '+'}${kr(Math.abs(v))}</td></tr>`; }).join('')}
        <tr class="tot"><td>Together</td><td class="num">${sum(e => inn(e) - out(e)) < 0 ? '−' : '+'}${kr(Math.abs(sum(e => inn(e) - out(e))))}</td></tr>
      </tbody></table>
      <h3>Day by day</h3>
      <div class="table-scroll"><table class="rtable money ledger-days"><thead><tr><th>Day</th><th class="num">In</th><th class="num">Out</th><th class="num">Purse</th></tr></thead><tbody>
        ${L.slice(0, 28).map(e => `<tr><td>${e.day}</td><td class="num good">+${kr(inn(e))}</td><td class="num">−${kr(out(e))}</td><td class="num">${kr(e.money)}</td></tr>`).join('')}
      </tbody></table></div>`}
      <h3>Every day</h3>
      <table class="rtable money"><tbody>
        <tr><td>Shop rent and upkeep</td><td class="num">${kr(DG.rent(G))}</td></tr>
        ${DG.wages(G) ? `<tr><td>Staff wages</td><td class="num">${kr(DG.wages(G))}</td></tr>` : ''}
        <tr><td>Adam's salary</td><td class="num good">+${kr(DG.adamSalary(G))}</td></tr>
      </tbody></table>
    </section>`;
  }

  function viewHome() {
    const h = G.home, mood = DG.homeMood(G);
    const acts = DG.ACTIVITIES.map(a => {
      const done = a.free ? h.did[a.id] === G.day : h.did.outing === G.day;
      const can = DG.canDoActivity(G, a.id);
      const offSeason = a.seasons && !a.seasons.includes(DG.season(G).id);
      const when = offSeason ? `${a.seasons.map(id => byId(DG.SEASONS, id).name.toLowerCase()).join('/')} only` : done ? 'done today ✓' : a.free ? 'free · once a day' : `${kr(a.cost)} · one outing a day`;
      return `<button class="chip" data-act="activity" data-arg="${a.id}" ${can ? '' : 'disabled'}><span class="ex-ic">${a.icon}</span><span class="chip-txt"><b>${a.name}</b><small>${when} · ❤️ +${a.joy}</small></span></button>`;
    }).join('');
    const items = who => DG.HOME_ITEMS.filter(i => i.who === who).map(it => {
      const own = h.items.includes(it.id);
      return `<article class="card ${own ? 'owned' : ''}"><div class="card-top"><span class="item-ic">${it.icon}</span><div class="card-title"><b>${it.name}</b><span class="muted small">❤️ +${it.joy} now, and a slower daily drop</span></div></div>
        <p class="small">${it.desc}</p>${own ? '<div class="lock done">At home ✓</div>' : `<button class="btn primary" data-act="buyhome" data-arg="${it.id}" ${G.money < it.cost ? 'disabled' : ''}>Buy: ${kr(it.cost)}</button>`}</article>`;
    }).join('');
    const htabs = `<div class="tabs home-tabs">${[['family', '🏡 Family'], ['garden', '🌷 Garden'], ['wardrobe', '👗 Wardrobe'], ['ledger', '📒 Accounts']].map(([id, l]) => `<button class="tab ${UI.homeTab === id ? 'on' : ''}" data-act="hometab" data-arg="${id}">${l}</button>`).join('')}</div>`;
    if (UI.homeTab === 'garden') return `<div class="scene-wrap">${DG.renderGarden(G, { tall: tallScene(), bounce: UI.bounce })}</div>${htabs}${gardenHtml()}`;
    if (UI.homeTab === 'wardrobe') return `<div class="scene-wrap">${DG.renderHome(G, { dexter: UI.dexter, tall: tallScene(), bounce: UI.bounce })}</div>${htabs}${wardrobeHtml()}`;
    if (UI.homeTab === 'ledger') return `<div class="scene-wrap">${DG.renderHome(G, { dexter: UI.dexter, tall: tallScene(), bounce: UI.bounce })}</div>${htabs}${ledgerHtml()}`;
    return `<div class="scene-wrap">${DG.renderHome(G, { dexter: UI.dexter, tall: tallScene(), bounce: UI.bounce })}</div>${htabs}
    <div class="shop-grid">
      <section class="panel">
        <h2>Mie's home <button class="icon-btn" data-act="adamjob" aria-label="Adam's work" title="Adam's work">💼</button></h2>
        <p class="muted">Mie lives with her husband Adam, their daughter Elizabeth (${DG.elizabethAge(G)}) and Dexter the cat. Home right now: <b>${esc(DG.house(G).name)}</b>. Tap Dexter to pet him.</p>
        <div class="happy"><span class="lbl">Family happiness</span><span class="hbar"><i style="width:${h.happy}%"></i></span><b>${Math.round(h.happy)}</b></div>
        <p class="small"><b>Mie: ${mood.label}.</b> ${mood.sat > 0 ? '+2 satisfaction on every dress, and steadier stitching.' : mood.sat < 0 ? '−3 satisfaction on every dress. Spend some time with the family!' : 'Above 75 Mie works better. Below 30 she gets distracted.'}</p>
        <h3>Today</h3><div class="chips">${acts}</div>
        <h3>Dexter's food</h3>
        <div class="food-row"><span>${h.catFood > 0 ? `🐟 ${h.catFood} day${h.catFood > 1 ? 's' : ''} of food left` : '<b class="bad">Dexter is hungry! Mjav!</b>'}</span>
          <button class="btn" data-act="catfood" ${G.money < DG.CAT_FOOD.cost ? 'disabled' : ''}>${DG.CAT_FOOD.icon} Buy ${DG.CAT_FOOD.name}: ${kr(DG.CAT_FOOD.cost)}</button></div>
        <div class="food-row"><span class="tricks-known">${h.tricks.known.length ? h.tricks.known.map(id => `<span class="trick-ic" title="${byId(DG.TRICKS, id).name}">${byId(DG.TRICKS, id).icon}</span>`).join('') : '🐾'}</span>
          <button class="btn" data-act="train" ${DG.canTrain(G) ? '' : 'disabled'}>🐾 ${h.tricks.day === G.day ? 'Training done for today' : 'Teach Dexter a trick'}</button></div>
        ${h.event ? `<p class="event soft">Last night: ${esc(h.event)}</p>` : ''}
      </section>
      <section class="panel">
        <h2>Where we live</h2>
        ${housingHtml()}
        <div class="houses">${DG.HOUSES.map((hs, i) => {
          const cur = (G.home.house || 0), state = i < cur ? 'past' : i === cur ? 'now' : i === cur + 1 ? 'next' : 'later';
          return `<article class="house ${state}"><span class="house-step">${i === 0 ? 'Start' : `Step ${i}`}</span><b>${hs.name}</b><span class="small muted">${hs.desc}</span>
            <span class="small">${i ? `❤️ +${hs.joy} · happiness never below ${hs.floor}` : 'Where the story begins'}</span>
            ${i ? `<span class="small">Price ${kr(hs.cost)}</span>` : `<span class="small">Rent ${kr(hs.rent)} per day</span>`}
            ${state === 'now' ? '<span class="tag">Home sweet home</span>' : state === 'past' ? '<span class="muted small">Moved on ✓</span>'
              : state === 'next' ? `<button class="btn primary" data-act="movehouse" ${G.money < DG.moveCash(G) ? 'disabled' : ''}>Move here: ${kr(DG.moveCash(G))} in cash</button>` : ''}</article>`;
        }).join('')}</div>
        <h2>Toys for Elizabeth</h2><div class="grid upg">${items('elizabeth')}</div>
        <h2>Things for Dexter</h2><div class="grid upg">${items('dexter')}</div>
      </section>
    </div>`;
  }

  function gardenHtml() {
    const se = DG.season(G).id, sel = UI.bulb || 'red';
    const hint = se === 'autumn' ? 'Autumn is tulip time: plant bulbs now and they bloom in spring.'
      : se === 'winter' ? 'The garden sleeps under the snow. The bulbs are dreaming of spring.'
      : se === 'spring' ? 'Tap a tulip to pick a bouquet for the dinner table.' : 'Bulbs planted now rest until next spring.';
    return `<section class="panel garden-panel"><p class="garden-hint">${hint}</p>
      ${DG.canPlant(G) ? `<div class="bulbs">${DG.TULIPS.map(t => `<button class="bulb ${sel === t.id ? 'on' : ''}" data-act="bulbcol" data-arg="${t.id}" aria-label="${t.name}"><svg viewBox="-10 -14 20 22" width="34" height="38"><path d="M0 8 V-2" stroke="#4d7a3e" stroke-width="1.6"/><path d="M-7 -12 q0 12 7 12 q7 0 7 -12 l-3.5 4 l-3.5 -5 l-3.5 5Z" fill="${t.hex}" stroke="#7a6a5a" stroke-width=".6"/></svg></button>`).join('')}</div>
      <p class="muted small">Pick a colour, then tap an empty bed. Bulbs cost ${kr(DG.BULB_COST)}</p>` : ''}
    </section>`;
  }

  // Elizabeth's sewing corner: a scrap, a decoration, and the doll dress goes on the line
  function ovKidSew(o) {
    return `<div class="overlay"><div class="sheet kidsew">
      <h2>Elizabeth's sewing corner</h2>
      <div class="kid-stage">${DG.renderAvatar(DG.FAMILY.elizabeth.look, 'ecstatic', 84)}<svg viewBox="-12 -4 24 22" width="150" height="138">${DG.kidDressSVG(o.c, o.d, 0, 0, 1)}</svg></div>
      <div class="kid-row">${DG.kidScraps(G).map(c => `<button class="kid-pick ${o.c === c ? 'on' : ''}" data-act="kidc" data-arg="${c}">${DG.colorDot(c, 30)}</button>`).join('')}</div>
      <div class="kid-row">${[['heart', '❤️'], ['star', '⭐'], ['flower', '🌸'], ['buttons', '🔘']].map(([d, ic]) => `<button class="kid-pick deco ${o.d === d ? 'on' : ''}" data-act="kidd" data-arg="${d}">${ic}</button>`).join('')}</div>
      <button class="btn primary big wide" data-act="kidsewdone">🧵 Sew it!</button>
    </div></div>`;
  }

  // Dexter's training: give a treat while he is looking at you
  function ovTrain(o) {
    const T = G.home.tricks;
    if (o.step === 'pick') return `<div class="overlay solo"><div class="sheet train">
      <h2>Which trick?</h2>
      <div class="kid-row">${DG.TRICKS.filter(t => DG.trickOpen(G, t)).map(t => `<button class="chip" data-act="trainpick" data-arg="${t.id}"><span class="ex-ic">${t.icon}</span><span class="chip-txt"><b>${t.name}</b><small>${'●'.repeat(T.prog[t.id] || 0)}${'○'.repeat(DG.TRICK_DAYS - (T.prog[t.id] || 0))}</small></span></button>`).join('')}</div>
      <button class="btn ghost" data-act="closeov">Not now</button></div></div>`;
    const t = byId(DG.TRICKS, o.trick);
    const dex = mood => `<svg viewBox="-30 -40 60 56" width="200" height="186">${DG.renderDexter(mood)}</svg>`;
    if (o.step === 'done') return `<div class="overlay solo"><div class="sheet train">
      <h2>${t.icon} ${t.name}</h2>
      <div class="train-dex">${dex(o.res.learnt ? t.id : o.res.ok ? 'purr' : 'sit')}</div>
      <p class="train-paws">${'●'.repeat(o.res.prog)}${'○'.repeat(Math.max(0, DG.TRICK_DAYS - o.res.prog))}</p>
      <p class="garden-hint">${o.res.learnt ? 'Dexter learnt a new trick! Tap him at home to see it.' : o.res.ok ? 'A good lesson. Again tomorrow.' : 'Dexter was more interested in the treats. Again tomorrow.'}</p>
      <button class="btn primary big wide" data-act="closeov">Done</button></div></div>`;
    return `<div class="overlay solo"><div class="sheet train">
      <h2>${t.icon} ${t.name}</h2>
      <p class="garden-hint">Give a treat when he looks at you.</p>
      <div class="train-dex" id="trainDex">${dex(o.look ? 'sit' : 'purr')}</div>
      <p class="train-paws">${'🐟'.repeat(o.good)}${'·'.repeat(Math.max(0, o.treats - o.good))}</p>
      <button class="btn primary big wide" data-act="treat">🐟 Treat</button></div></div>`;
  }
  // he looks at you, then away, at his own cat pace
  function trainTick() {
    clearTimeout(UI.trainT);
    const o = UI.overlay;
    if (!o || o.type !== 'train' || o.step !== 'play') return;
    o.look = !o.look;
    const el = document.getElementById('trainDex');
    if (el) el.innerHTML = `<svg viewBox="-30 -40 60 56" width="200" height="186">${DG.renderDexter(o.look ? 'sit' : 'purr')}</svg>`;
    UI.trainT = setTimeout(trainTick, o.look ? 650 + Math.random() * 500 : 700 + Math.random() * 900);
  }

  function housingHtml() {
    const L = G.home.loan, nx = DG.nextHouse(G);
    const own = G.home.house > 0;
    const loanTxt = own ? (L.principal > 0
      ? `<div class="sum-grid"><div><span class="lbl">Mortgage left</span><b>${kr(L.principal)}</b><span class="muted small">${L.yearsLeft.toFixed(1)} years at ${DG.MORTGAGE.rate * 100}%</span></div>
          <div><span class="lbl">Payment per day</span><b>${kr(L.payment)}</b></div><div><span class="lbl">Equity</span><b>${kr(DG.equity(G))}</b></div></div>
          <div class="actions">${[100000, 1000000].map(a => `<button class="btn small" data-act="repay" data-arg="${a}" ${G.money < a ? 'disabled' : ''}>Pay off ${kr(a)}</button>`).join('')}
          <button class="btn small" data-act="repay" data-arg="all" ${G.money < L.principal ? 'disabled' : ''}>Pay off everything</button></div>`
      : '<p class="good"><b>The home is fully paid off. No more mortgage!</b></p>')
      : `<p class="small">The family rents the flat for ${kr(DG.HOUSES[0].rent)} per day. Adam's salary (${kr(DG.adamSalary(G))} per day) goes into the family budget.</p>`;
    return `<div class="finance">${loanTxt}
      ${nx ? `<p class="muted small">Next home: ${esc(nx.name)} for ${kr(nx.cost)}. Buying takes a ${DG.MORTGAGE.down * 100}% down payment (minus the equity in your current home); the rest is a ${DG.MORTGAGE.years}-year realkreditlån at ${DG.MORTGAGE.rate * 100}%, about ${kr(DG.annuityPerDay(nx.cost - Math.max(DG.equity(G), DG.MORTGAGE.down * nx.cost), DG.MORTGAGE.years))} per day.</p>` : ''}</div>`;
  }

  function wardrobeHtml() {
    const wear = G.wardrobe.wear, se = DG.season(G).id;
    const card = w => {
      const own = G.wardrobe.owned.includes(w.id), on = wear[w.slot] === w.id;
      const preview = DG.renderAvatar(DG.mieLook({ wardrobe: { wear: Object.assign({}, wear, { [w.slot]: w.id }) } }), on ? 'ecstatic' : 'happy', 64);
      const bonus = w.season ? ` · +1 in ${byId(DG.SEASONS, w.season).name.toLowerCase()}${w.season === se ? ' ✓' : ''}` : '';
      return `<article class="card wear ${on ? 'owned' : ''}"><div class="card-top">${preview}<div class="card-title"><b>${w.name}</b><span class="muted small">✨ +${w.charm} style${bonus}</span></div></div>
        <p class="small">${w.desc}</p>
        ${on ? '<div class="lock done">Wearing it ✓</div>' : own ? `<button class="btn" data-act="wear" data-arg="${w.id}">Put it on</button>`
          : `<button class="btn primary" data-act="buywear" data-arg="${w.id}" ${G.money < w.cost ? 'disabled' : ''}>Buy: ${kr(w.cost)}</button>`}</article>`;
    };
    return `<div class="shop-grid">
      <section class="panel wardrobe-me">
        <h2>Mie's wardrobe</h2>
        <div class="mirror">${DG.renderAvatar(DG.mieLook(G), 'ecstatic', 150)}</div>
        <p>What Mie wears is the best advert for the atelier. Worn clothes add <b>style charm</b>: right now ✨ ${DG.styleCharm(G)}, part of the shop's total charm of ${DG.charm(G)}.</p>
        <p class="muted small">Charm raises satisfaction on every dress, customer budgets and rack sales. Seasonal pieces give +1 extra in their season. Buying something new also makes Mie a little happier.</p>
      </section>
      <section class="panel">${DG.WARDROBE_SLOTS.map(([slot, label]) => `<h2>${label}</h2><div class="grid upg">${DG.WARDROBE.filter(w => w.slot === slot).map(card).join('')}</div>`).join('')}</section>
    </div>`;
  }

  // ---------------- goals ----------------
  // ---------------- album: life stories, the lookbook, letters and goals ----------------
  function viewAlbum() {
    const t = UI.albumTab || 'stories';
    const tabs = [['stories', '📖 Stories'], ['lookbook', '👗 Lookbook'], ['collections', '🧵 Collections'], ['letters', '💌 Letters'], ['goals', '🏆 Goals']];
    const body = t === 'lookbook' ? lookbookHtml() : t === 'collections' ? stickersHtml() + collectionsHtml() : t === 'letters' ? lettersHtml() : t === 'goals' ? viewGoals() : storiesHtml();
    return `<div class="tabs album-tabs">${tabs.map(([id, l]) => `<button class="tab ${t === id ? 'on' : ''}" data-act="albumtab" data-arg="${id}">${l}${(id === 'goals' && DG.claimableGoals(G).length) || (id === 'letters' && DG.mailToday(G).length) ? '<i class="tab-dot"></i>' : ''}</button>`).join('')}</div>${body}`;
  }
  function storiesHtml() {
    const cards = DG.STORIES.map(st => {
      const s = DG.storyState(G, st.id);
      const met = s.done.length > 0;
      const chapters = st.ch.map((c, i) => {
        const d = s.done.find(x => x.ch === i);
        if (d) return `<li class="chap done"><span class="thumb">${DG.renderDress(d.design, `st-${st.id}-${i}`)}</span><span><b>${c.title}</b><span class="stars small-stars">${'★'.repeat(starsOf(d.S))}${'☆'.repeat(5 - starsOf(d.S))}</span></span></li>`;
        if (i === s.ch && met) return `<li class="chap next"><span class="thumb q">✉️</span><span><b>Next chapter</b><span class="muted small">${G.rep < c.minRep ? 'When the shop is better known' : 'She will drop by one of these days'}</span></span></li>`;
        return `<li class="chap locked"><span class="thumb q">…</span><span class="muted small">A chapter still to come</span></li>`;
      }).join('');
      return `<article class="story ${met ? '' : 'unmet'}">
        <div class="story-head">${met ? DG.renderAvatar(st.look || Object.assign({}, DG.FAMILY.elizabeth.look, { bg: '#f5dfe4' }), 'happy', 64) : '<span class="avatar-q">?</span>'}<div><h3 translate="${met ? 'no' : 'yes'}">${met ? st.name : 'Someone you have not met yet'}</h3>
          <span class="muted small">${met ? `${st.job} · ${s.done.length} of ${st.ch.length} chapters` : 'Every life has a story. Keep the shop open.'}</span></div></div>
        ${met ? `<ol class="chapters">${chapters}</ol>` : ''}
      </article>`;
    }).join('');
    return `<section class="panel"><div class="sec-head"><h2>Life stories</h2><span class="muted">Some customers come back as their lives move on: first dates, weddings, babies, big moments. Their dresses and letters are kept here.</span></div><div class="stories">${cards}</div></section>`;
  }
  const starsOf = S => (S >= 92 ? 5 : S >= 80 ? 4 : S >= 65 ? 3 : S >= 45 ? 2 : 1);
  function lookbookHtml() {
    const L = G.lookbook;
    return `<section class="panel"><div class="sec-head"><h2>Lookbook</h2><span class="muted">Every dress with four stars or more, and every dress from a life story.</span></div>
      ${L.length ? `<div class="lookbook">${L.map((e, i) => `<figure class="look"><span class="thumb">${DG.renderDress(e.design, 'lb' + i)}</span>
        <figcaption><b translate="no">${esc(e.name)}</b><span class="muted small">${esc(e.title)}${e.story ? ' 📖' : ''}</span><span class="stars small-stars">${'★'.repeat(starsOf(e.S))}${'☆'.repeat(5 - starsOf(e.S))}</span></figcaption></figure>`).join('')}</div>`
        : '<p class="muted">Your first four-star dress will be the first page.</p>'}
    </section>`;
  }
  function stickersHtml() {
    const got = G.stickers || [];
    const shown = DG.STICKERS.filter(k => !k.secret || got.includes(k.id));   // a secret sticker shows only once it is earned
    return `<section class="panel"><div class="sec-head"><h2>Stickers</h2><span class="muted">${shown.filter(k => got.includes(k.id)).length} of ${shown.length}</span></div>
      <div class="stickers">${shown.map(k => `<figure class="sticker ${got.includes(k.id) ? 'have' : ''}"><span class="sticker-face">${got.includes(k.id) ? k.icon : '?'}</span><figcaption>${k.name}</figcaption></figure>`).join('')}</div></section>`;
  }
  function collectionsHtml() {
    const C = G.collections;
    const chip = (set, id) => {
      const have = C[set].includes(id);
      if (set === 'fabrics') return `<span class="coll-item ${have ? 'have' : ''}" title="${byId(DG.FABRICS, id).name}">${DG.swatchSVG(id, null, 'co' + id, 34)}</span>`;
      if (set === 'colours') return `<span class="coll-item ${have ? 'have' : ''}" title="${byId(DG.COLORS, id).name}">${DG.colorDot(id, 26)}</span>`;
      if (set === 'silhouettes') return `<span class="coll-item word ${have ? 'have' : ''}">${byId(DG.SILHOUETTES, id).name}</span>`;
      if (set === 'shapes') return `<span class="coll-item word ${have ? 'have' : ''}">${byId(DG.POT_SHAPES, id).name}</span>`;
      if (set === 'tulips') { const t = byId(DG.TULIPS, id); return `<span class="coll-item ${have ? 'have' : ''}" title="${t.name}"><svg viewBox="-8 -13 16 15" width="26" height="24"><path d="M-7 -12 q0 12 7 12 q7 0 7 -12 l-3.5 4 l-3.5 -5 l-3.5 5Z" fill="${t.hex}" stroke="#7a6a5a" stroke-width=".6"/></svg></span>`; }
      const se = byId(DG.SEASONS, id);
      return `<span class="coll-item word ${have ? 'have' : ''}">${se.icon} ${se.name}</span>`;
    };
    return `<section class="panel"><div class="sec-head"><h2>Collections</h2><span class="muted">Little sets to complete at your own pace. Each finished set hangs a framed keepsake on the shop wall.</span></div>
      <div class="collections">${DG.COLLECTIONS.map(col => {
        const all = col.all(), n = all.filter(x => C[col.id].includes(x)).length, done = C.done.includes(col.id);
        return `<article class="coll ${done ? 'done' : ''}"><div class="coll-head"><span class="coll-ic">${col.icon}</span><div><b>${col.title}</b><span class="muted small">${col.desc}</span></div><span class="coll-n">${done ? '🖼️' : `${n}/${all.length}`}</span></div>
          <div class="coll-items">${all.map(id => chip(col.id, id)).join('')}</div></article>`;
      }).join('')}</div></section>`;
  }
  function lettersHtml() {
    const waiting = DG.mailToday(G);
    return `<section class="panel"><div class="sec-head"><h2>Letters</h2><span class="muted">Thank-you notes and postcards from customers.</span></div>
      ${waiting.length ? `<button class="event goal" data-act="readmail">📬 ${waiting.length === 1 ? 'A new letter is waiting' : `${waiting.length} new letters are waiting`}</button>` : ''}
      ${G.letters.length ? `<ul class="letters">${G.letters.map(l => `<li class="letter-row"><b translate="no">${esc(l.from)}</b>${l.title ? ` <span class="muted small">· ${esc(l.title)}</span>` : ''}<p>${esc(l.text)}</p></li>`).join('')}</ul>`
        : '<p class="muted">No letters yet.</p>'}
    </section>`;
  }

  function viewGoals() {
    DG.updateGoals(G);
    const done = G.goals.claimed.length;
    return `<div class="panel"><div class="sec-head"><h2>Goals</h2><span class="muted">${done} of ${DG.GOALS.length} collected. Complete a goal, then tap to collect the reward.</span></div>
      <div class="goals">${DG.GOALS.map(g => {
        const claimed = G.goals.claimed.includes(g.id), ready = G.goals.done.includes(g.id) && !claimed;
        const pr = Math.min(g.target, Math.max(0, g.prog(G)));
        const shown = ready || claimed ? g.target : pr;
        return `<article class="goal-card ${claimed ? 'claimed' : ready ? 'ready' : ''}">
          <div class="goal-txt"><b>${claimed ? '✅' : ready ? '🏆' : '🎯'} ${g.title}</b><span class="muted small">${g.desc}</span>
            <span class="gbar"><i style="width:${(shown / g.target) * 100}%"></i></span><span class="small muted">${shown.toLocaleString('da-DK')} / ${g.target.toLocaleString('da-DK')}</span></div>
          ${claimed ? `<span class="goal-reward muted">${kr(g.reward)} collected</span>`
            : `<button class="btn ${ready ? 'primary' : ''}" data-act="claim" data-arg="${g.id}" ${ready ? '' : 'disabled'}>${ready ? 'Collect ' : ''}${kr(g.reward)}</button>`}
        </article>`;
      }).join('')}</div></div>`;
  }

  // ---------------- guided tips ----------------
  // Shown once per player, in order, when their condition first holds. The target gets a pulsing highlight.
  const ov = () => UI.overlay && UI.overlay.type;
  const TIPS = [
    { id: 'welcome', when: () => UI.view === 'shop' && !ov() && G.stats.served === 0 && G.queue.length && !G.active, target: '.queue .cust',
      title: 'Welcome to the atelier!', text: 'Mie makes dresses to order. Make customers happy, earn money and grow the shop. Customers wait here. Tap one to hear what she wants.' },
    { id: 'request', when: () => ov() === 'req' && UI.overlay.arg !== 'active', target: '.brief',
      title: 'Read the wishes', text: 'Hearts show what matters most. Missing a must-have costs 15 points. Loved colours and favourite silhouettes count too. Tap Accept order when you are ready.' },
    { id: 'workshop', when: () => UI.view === 'workshop' && G.active && !G.active.rack && !ov(), target: '.attrs',
      title: 'Design the dress', text: 'Use the tabs to pick fabric, colour, shape, details and extras. The bars show the dress; the black marks are the customer\'s wishes. Reach them without spending the whole budget.' },
    { id: 'buy', when: () => UI.view === 'workshop' && G.active && !ov() && DG.analyze(G.design, G).missing.length, target: '[data-act=buymissing]',
      title: 'Missing materials', text: 'Mie doesn\'t have everything yet. Tap here to buy exactly what is missing at today\'s prices, or shop in the Market.' },
    { id: 'sew', when: () => UI.view === 'workshop' && G.active && !ov() && !DG.analyze(G.design, G).issues.length, target: '[data-act=sew]',
      title: 'Ready to sew', text: 'Start sewing. You cut the pattern, stitch it and iron it in three quick mini-games. Neat work raises quality.' },
    { id: 'result', when: () => ov() === 'result', target: '.res-grid',
      title: 'How did it go?', text: 'Satisfaction sets the payment, tip and reputation. Higher reputation brings more customers and fancier ones with bigger budgets.' },
    { id: 'endday', when: () => UI.view === 'shop' && !ov() && !G.active && !G.queue.length && G.stats.served > 0, target: '[data-act=endday]',
      title: 'End of the day', text: 'Everyone has been helped. Close the shop: rent is paid, the night passes and a new day begins with new customers.' },
    { id: 'market', when: () => UI.view === 'market' && !ov(), target: '.grid',
      title: 'The market', text: 'Fabric is sold by the metre. Prices change every morning (the arrows), and the six small bars show what each fabric is good at.' },
    { id: 'home', when: () => G.day >= 2 && UI.view === 'shop' && !ov(), target: '[data-act=view][data-arg=home]',
      title: 'Mie\'s family', text: 'Upstairs live Adam, Elizabeth and Dexter the cat. A happy family makes Mie work better, so visit them every day.' },
    { id: 'homeview', when: () => UI.view === 'home' && !ov(), target: '.happy',
      title: 'Family happiness', text: 'Play with Elizabeth and pet Dexter every day for free. Toys and outings help too. And don\'t forget Dexter\'s cat food!' },
    { id: 'upgrades', when: () => UI.view === 'upgrades' && !ov(), target: '.view-upgrades .tabs',
      title: 'Grow the shop', text: 'Spend money on equipment, expansions, decor (charm makes customers happier), staff and marketing.' },
    { id: 'rack', when: () => G.day >= 3 && UI.view === 'shop' && !ov() && !G.active, target: '.rack-panel',
      title: 'Ready-to-wear rack', text: 'Leftover fabric? Sew a dress without an order and hang it on the rack. Walk-in shoppers buy in the evening.' },
    { id: 'season', when: () => G.day > DG.SEASON_LENGTH && UI.view === 'shop' && !ov(), target: '.hud-item:nth-child(1)',
      title: 'A new season', text: 'Every 7 days the season changes. It changes who visits and which fabrics are in season (+3) or off-season (−4).' },
    { id: 'goals', when: () => DG.claimableGoals(G).length && !ov(), target: '[data-act=view][data-arg=album]',
      title: 'Goal complete!', text: 'You reached a goal. Collect the cash reward on the Goals screen.' },
    { id: 'potteryad', when: () => !DG.upgradeLevel(G, 'pottery') && G.money >= 800 && UI.view === 'shop' && !ov(), target: '[data-act=view][data-arg=studio]',
      title: 'A pottery corner?', text: 'With some savings Mie could start making pottery too. Buy the pottery studio under Upgrades → Expansion.' },
    { id: 'pottery', when: () => UI.view === 'studio' && DG.upgradeLevel(G, 'pottery') && !ov(), target: '.pot-stage',
      title: 'The pottery corner', text: 'Pick shape, clay, glaze and decoration. Then knead, throw on the wheel and paint if you like. The kiln fires pots overnight.' },
    { id: 'wardrobe', when: () => UI.view === 'home' && !ov() && G.money > 600 && UI.homeTab !== 'wardrobe', target: '[data-act=hometab][data-arg=wardrobe]',
      title: 'Something new to wear?', text: 'Mie\'s wardrobe: new clothes make her the best advert for the atelier and add style charm.' },
    { id: 'tax', when: () => UI.view === 'shop' && !ov() && G.money > 4000 && !DG.upgradeLevel(G, 'accountant'), target: '[data-act=view][data-arg=upgrades]',
      title: 'SKAT is taking a bite', text: 'A busy shop pays tax on good days. An accountant (Upgrades → Equipment) lowers it.' },
    { id: 'move', when: () => UI.view === 'home' && !ov() && DG.nextHouse(G) && G.money >= DG.nextHouse(G).cost, target: '[data-act=movehouse]',
      title: 'Time to move?', text: 'You can afford a bigger home. Each move makes the family happier for good.' },
    { id: 'lowhappy', when: () => G.home.happy < 35 && !ov(), target: '[data-act=view][data-arg=home]',
      title: 'Mie misses her family', text: 'Family happiness is low, so Mie is distracted at work. Spend time at home.' },
  ];
  function currentTip() {
    if (!S.tips || !G) return null;
    if (ov() && !['req', 'result'].includes(ov())) return null;
    for (const t of TIPS) {
      if (G.tips.includes(t.id)) continue;
      try { if (t.when()) return t; } catch (e) { /* ignore */ }
    }
    return null;
  }
  function coachHtml(t) {
    return `<aside class="coach" role="status">${DG.renderAvatar(DG.mieLook(G), 'happy', 48)}<div class="coach-txt"><b>${t.title}</b><span>${t.text}</span></div>
      <div class="coach-act"><button class="btn small primary" data-act="tipok" data-arg="${t.id}">Got it</button><button class="btn small ghost" data-act="tipsoff">No more tips</button></div></aside>`;
  }

  function helpHtml() {
    const topics = [
      ['🎯 The goal', 'Run Mie\'s dress atelier in Copenhagen. Make customers happy, earn money, raise your reputation and grow the shop, while keeping the family upstairs happy. There is no end: aim for the Goals and a bride\'s dress.'],
      ['🌿 No rush, no way to lose', 'Take your time: nothing in the shop runs on a clock. Customers you don\'t get to today simply pop back tomorrow, declining an order is fine, and if money ever runs low, Mie\'s mum and dad help out. All the money details are in Home → Accounts.'],
      ['👗 Customers and scoring', 'Each customer has wishes (hearts 1–3) across quality, workwear, creativity, exclusivity, elegance and comfort, plus must-haves, colours and favourite silhouettes. Satisfaction = 65% wishes + 15% colour + 10% silhouette + 10% craft, −15 per missed must-have, plus small bonuses for charm, season and Mie\'s mood. 75%+ pays the full budget; 85%+ adds a tip.'],
      ['🧺 Market and seasons', 'Fabric is sold per metre and prices move every morning. In-season fabric costs 12% more but gives +3 satisfaction; off-season fabric is 15% cheaper but gives −4. Seasons change every 7 days.'],
      ['✂️ Workshop and sewing', 'Pick fabrics, colours, shape, details and extras. The bars show the dress and the black marks the wishes. Sewing is cut → stitch → iron (or only stitch in Quick mode). Better craft means higher quality.'],
      ['👗 Ready-to-wear rack', 'Sew without an order to use leftover fabric. Rack dresses sell to walk-ins in the evening; charm and a bigger shop window help. You can mark them down.'],
      ['🏺 Pottery', 'Buy the studio under Upgrades → Expansion. Knead (fewer cracks), throw on the wheel (holding keeps the pressure in the green), optionally paint, and the kiln fires overnight. Pots sell from the shelf and add charm.'],
      ['🏡 Home and family', 'The family starts in a small flat in Nørrebro and can move up in five steps to a Strandvejsvilla in Klampenborg; each home raises the lowest family happiness can fall to. Family happiness drops every night. Above 75 Mie works better, below 30 worse. Play with Elizabeth and pet Dexter daily, buy toys, go on outings (some only in summer or winter) and keep Dexter fed.'],
      ['👗 Mie\'s wardrobe', 'Home → Mie\'s wardrobe has outfits, accessories and round glasses for Mie. What she wears shows everywhere and adds style charm to the shop; seasonal pieces give +1 extra in their season.'],
      ['🧮 SKAT and the accountant', 'Each evening SKAT is paid on the shop\'s profit: 37% on the first 2.000 kr above a small allowance and 52% top tax above that. Mortgage interest is deductible. An accountant (Upgrades → Equipment) finds more deductions, and at level 2 virksomhedsordningen lowers the top rate to 42%.'],
      ['⭐ Upgrades', 'Equipment improves work, expansions add pottery and an upstairs floor, decor adds charm, staff help every day for a wage, and marketing brings more or richer customers tomorrow.'],
      ['🏆 Goals', 'Milestones with cash rewards. Collect them on the Goals screen.'],
      ['💾 Saving', 'The game saves automatically on this device. Menu → Save can make a save code to move your game to another device. Each player has their own shop.'],
    ];
    return `<button class="btn wide" data-act="howto">📖 Show the introduction</button>
      <button class="btn wide" data-act="replaytips">💡 Replay the tips</button>
      <div class="help">${topics.map(([h, t], i) => `<details ${i ? '' : 'open'}><summary>${h}</summary><p>${t}</p></details>`).join('')}</div>`;
  }

  // ---------------- render ----------------
  const VIEWS = { shop: viewShop, market: viewMarket, workshop: viewWorkshop, studio: viewStudio, home: viewHome, upgrades: viewUpgrades, album: viewAlbum,
    goals: () => { UI.albumTab = 'goals'; UI.view = 'album'; return viewAlbum(); } };
  // ---------------- screen updates ----------------
  // Every action re-describes the whole screen as HTML, but only the parts that changed are touched:
  // the new HTML is built off-screen (and translated there) and then patched into the page. Untouched
  // elements keep their state, so nothing flickers, animations don't replay and scrolling stays put.
  const tpl = document.createElement('template');
  const keyOf = n => n.nodeType === 1 ? n.tagName + '#' + (n.id || '') + '#' + (n.getAttribute('data-key') || '') : n.nodeType;
  function patchNode(a, b) {
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    const aa = a.attributes, ba = b.attributes;
    const keepOpen = a.tagName === 'DETAILS';   // a section the player opened stays open
    for (let i = aa.length - 1; i >= 0; i--) { const n = aa[i].name; if (!b.hasAttribute(n) && !(keepOpen && n === 'open')) a.removeAttribute(n); }
    for (let i = 0; i < ba.length; i++) { const { name, value } = ba[i]; if (a.getAttribute(name) !== value && !(keepOpen && name === 'open')) a.setAttribute(name, value); }
    morphChildren(a, b);
  }
  function morphChildren(live, next) {
    let a = live.firstChild, b = next.firstChild;
    while (b) {
      const nb = b.nextSibling;
      if (!a) live.appendChild(b);
      else if (keyOf(a) === keyOf(b)) { patchNode(a, b); a = a.nextSibling; }
      else { const na = a.nextSibling; live.replaceChild(b, a); a = na; }
      b = nb;
    }
    while (a) { const na = a.nextSibling; live.removeChild(a); a = na; }
  }
  function paint(app, html) {
    UI.lastHtml = html;
    tpl.innerHTML = html;
    DG.translateTree(tpl.content);
    morphChildren(app, tpl.content);
    DG.i18nSkipPending();
  }

  // what you hear in the background: the season's weather, and quiet once the day's work is done
  function ambienceKind() {
    if (!G || !G.day) return null;
    const se = DG.season(G).id;
    if (UI.view === 'home') return se === 'winter' ? 'fire' : 'night';
    if (G.market.event && G.market.event.type === 'rain') return 'rain';
    if (!G.queue.length && !G.active) return se === 'winter' ? 'fire' : 'night';
    return { spring: 'birds', summer: 'birds', autumn: 'wind', winter: 'fire' }[se] || 'birds';
  }

  function render() {
    const app = document.getElementById('app');
    if (UI.mgCleanup) { UI.mgCleanup(); UI.mgCleanup = null; }
    if (!G) { paint(app, welcomeScreen()); return; }
    const ovType = UI.overlay && UI.overlay.type;
    // at the door in the morning nothing is drawn behind the street: anything moving under the painted street would make it repaint
    if (ovType === 'morning' || ovType === 'train') { paint(app, `<div class="ov-host" data-key="morning">${overlay()}</div>`); UI.lastOverlay = ovType; document.body.classList.add('modal-open'); return; }
    const tip = currentTip();
    paint(app, topbar() + `<main class="view view-${UI.view}" data-key="${UI.view}">${VIEWS[UI.view]()}</main>`
      + `<div class="ov-host" data-key="${ovType || ''}">${overlay()}</div>` + (tip ? coachHtml(tip) : ''));
    UI.lastOverlay = ovType;
    document.body.classList.toggle('has-coach', !!tip);
    if (tip) {
      const el = app.querySelector(tip.target);
      if (el) el.classList.add('coach-target');
    }
    document.body.classList.toggle('modal-open', !!UI.overlay);
    DG.Audio.ambience(ambienceKind());
    if (UI.overlay && UI.overlay.type === 'sew' && UI.sew.phase === 'stitch') startSewLoop();
    if (UI.overlay && UI.overlay.type === 'throw') startThrowLoop();
    mountMiniGame();
    // the first render guesses the scene's shape; once it is on screen, measure it and redraw once if it differs
    if (!UI.refitting && measureScene()) { UI.refitting = true; render(); UI.refitting = false; }
  }

  function mountMiniGame() {
    const host = document.getElementById('mg');
    const o = UI.overlay;
    if (!host || !o) return;
    if (o.type === 'sew') {
      const ph = UI.sew.phase;
      UI.mgCleanup = DG.MiniGames[ph](host, { color: DG.colorHex(G.design.mainColor), design: G.design }, r => sewPhaseDone(ph, r));
    } else if (o.type === 'wedge') {
      UI.mgCleanup = DG.MiniGames.wedge(host, { color: byId(DG.CLAYS, G.pot.clay).hex }, r => { UI.potRun.wedge = r; startWheel(); });
    } else if (o.type === 'haggle') {
      const face = DG.renderAvatar({ skin: '#dca47c', hair: '#7b4a2a', style: 2, top: '#c98f6b', bg: '#f3ead6', glasses: false, earrings: true }, 'neutral', 84);
      UI.mgCleanup = DG.MiniGames.haggle(host, { face }, hits => {
        G.today.haggle = [0, 0.04, 0.08, 0.12][hits];
        G.today.haggleDone = true;
        UI.overlay = null;
        toast(hits ? `Haggled: −${[0, 4, 8, 12][hits]}% at the stalls today!` : 'No luck today. Same prices as always.');
        save(); render();
      });
    } else if (o.type === 'paint') {
      UI.mgCleanup = DG.MiniGames.paint(host, { pot: G.pot }, strokes => completePot(UI.potRun.score, strokes));
    }
  }

  function welcomeScreen() {
    return `<div class="welcome"><div class="panel center">
      <div class="welcome-logo">${DG.logoSVG(132)}</div>
      <h1 translate="no">${brandHtml()}</h1>
      <p>Welcome! You play as Mie, a dressmaker with her own little shop in Copenhagen. Keep the name or type your own. Each player gets their own shop, saved on this device.</p>
      <div class="seg lang-pick">${[['en', 'English'], ['da', 'Dansk']].map(([v, l]) => `<button class="chip ${S.lang === v ? 'on' : ''}" data-act="setting" data-arg="lang:${v}">${l}</button>`).join('')}</div>
      <label class="lbl" for="firstname">Your name</label>
      <input id="firstname" class="text-in" maxlength="24" value="Mie" autocomplete="off">
      <button class="btn primary big wide" data-act="firstplayer">Start playing</button>
      <p class="muted small">Have a save code from another device? Start, then open Menu → Save → Import.</p>
    </div></div>`;
  }

  // ---------------- sewing mini-game ----------------
  function placeZone() {
    const s = UI.sew;
    const z = document.getElementById('zone');
    if (z) { z.style.left = `${(s.center - s.zw / 2) * 100}%`; z.style.width = `${s.zw * 100}%`; }
  }
  function startSewLoop() {
    cancelAnimationFrame(UI.raf);
    placeZone();
    const s = UI.sew;
    const machine = DG.upgradeLevel(G, 'machine');
    const step = now => {
      if (!UI.overlay || UI.overlay.type !== 'sew') return;
      const el = document.getElementById('needle');
      if (!el) return;
      const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0;
      s.last = now;
      if (!s.lock) s.ang += dt * (2.1 + 0.45 * s.i) * (1 - 0.12 * machine);
      s.pos = 0.5 + 0.47 * Math.sin(s.ang);
      el.style.left = `${s.pos * 100}%`;
      UI.raf = requestAnimationFrame(step);
    };
    UI.raf = requestAnimationFrame(step);
  }
  function stitch() {
    const s = UI.sew;
    if (!s || s.lock) return;
    const dist = Math.abs(s.pos - s.center);
    let sc, msg;
    if (dist < s.zw * 0.2) { sc = 1; msg = 'Perfect! ✨'; }
    else if (dist < s.zw / 2) { sc = 0.8; msg = 'Nice stitch'; }
    else if (dist < s.zw) { sc = 0.45; msg = 'A bit wobbly'; }
    else { sc = 0.1; msg = 'Oops! 😬'; }
    s.scores.push(sc);
    if (sc >= 0.45) sfx('machine');
    sfx(sc >= 1 ? 'perfect' : sc >= 0.45 ? 'stitch' : 'bad');
    const dots = document.querySelectorAll('#sdots i');
    if (dots[s.i]) dots[s.i].className = sc >= 1 ? 'p' : sc >= 0.8 ? 'g' : sc >= 0.45 ? 'w' : 'x';
    const fb = document.getElementById('sfb');
    if (fb) fb.textContent = msg;
    s.i++;
    if (s.i >= 5) {
      s.lock = true;
      const craft = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
      setTimeout(() => sewPhaseDone('stitch', craft), 750);
    } else {
      s.center = 0.2 + Math.random() * 0.6;
      placeZone();
    }
  }

  function startSewing() {
    const an = DG.analyze(G.design, G);
    if (an.issues.length) return;
    for (const id in an.fabrics) G.inv.fabrics[id] = round1((G.inv.fabrics[id] || 0) - an.fabrics[id]);
    for (const id in an.items) G.inv.items[id] = (G.inv.items[id] || 0) - an.items[id];
    G.design.cost = an.cost; // value of materials consumed, at today's prices
    G.design.sewn = true;
    beginSewGame();
  }

  function beginSewGame() {
    const machine = DG.upgradeLevel(G, 'machine');
    const steps = S.minigames === 'full' ? ['cut', 'stitch', 'iron'] : ['stitch'];
    UI.sew = { i: 0, scores: [], center: 0.2 + Math.random() * 0.6, zw: 0.16 + 0.05 * machine + (G.staff.apprentice ? 0.04 : 0) + DG.homeMood(G).zone,
      ang: 0, pos: 0.5, last: 0, lock: false, steps, res: {} };
    UI.sew.phase = steps[0];
    UI.overlay = { type: 'sew' };
    save();
    render();
  }

  // craft = 30% cutting + 50% stitching + 20% ironing (quick mode: stitching only)
  function sewPhaseDone(phase, score) {
    const sw = UI.sew;
    sw.res[phase] = score;
    const next = sw.steps[sw.steps.indexOf(phase) + 1];
    if (next) {
      sw.phase = next;
      render();
      return;
    }
    const r = sw.res;
    const craft = sw.steps.length > 1 ? 0.3 * r.cut + 0.5 * r.stitch + 0.2 * r.iron : r.stitch;
    finishSewing(clamp(craft, 0, 1));
  }

  function finishSewing(craft) {
    const cust = G.active, design = G.design;
    if (cust.rack) {
      const item = DG.rackItem(design, G, craft);
      delete item.design.sewn;
      G.rack.push(item);
      G.active = null;
      G.design = null;
      UI.overlay = { type: 'rackdone', item, craft };
      save();
      render();
      return;
    }
    const before = eligibleTitles();
    const ev = DG.evaluate(cust, design, G, craft);
    ev.cost = design.cost != null ? design.cost : ev.cost;
    if (cust.family) { ev.repDelta = 0; G.home.happy = clamp(G.home.happy + (ev.S >= 80 ? 6 : 3), 0, 100); }   // a dress for Elizabeth
    G.money += ev.pay + ev.tip;
    G.today.income += ev.pay + ev.tip;
    sfx(ev.S >= 60 ? 'coin' : 'bad');
    G.today.served++;
    G.rep = clamp(round1(G.rep + ev.repDelta), 0, 100);
    G.stats.served++;
    G.stats.totalS += ev.S;
    G.stats.best = Math.max(G.stats.best, ev.S);
    G.stats.earned += ev.pay + ev.tip;
    DG.rememberCustomer(G, cust, ev.S);
    const beforeGoals = DG.claimableGoals(G).length;
    DG.recordDress(G, cust, ev.S, design);
    if (cust.story) DG.storyDelivered(G, cust, ev.S, design);
    if (DG.addToLookbook(G, cust, ev.S, design)) setTimeout(() => toast(cust.story ? '📖 A new page in her story' : '👗 Added to the lookbook'), 900);
    const newGoals = DG.claimableGoals(G).length - beforeGoals;
    G.active = null;
    G.design = null;
    UI.overlay = { type: 'result', ev, cust, design, quote: pick(DG.QUOTES[ev.stars]), line: DG.feedbackLine(cust, ev, design) };
    const fresh = eligibleTitles().filter(t => !before.includes(t));
    save();
    render();
    fresh.forEach((t, i) => setTimeout(() => toast(`New customers unlocked: ${t}!`), 400 + i * 600));
    if (newGoals > 0) setTimeout(() => toast('🏆 Goal complete! Collect your reward on the Goals screen.'), 400 + fresh.length * 600);
  }

  // ---------------- actions ----------------
  function buy(kind, id, qty) {
    const price = kind === 'fabric' ? DG.fabricPrice(G, id) : DG.itemPrice(G, id);
    const cost = price * qty;
    if (G.money < cost) { toast(`Not enough money: that costs ${kr(cost)}.`); return false; }
    G.money -= cost;
    G.today.spent += cost;
    if (kind === 'fabric') G.inv.fabrics[id] = round1((G.inv.fabrics[id] || 0) + qty);
    else G.inv.items[id] = (G.inv.items[id] || 0) + qty;
    return true;
  }

  function buyPottery(kind, id, qty) {
    const price = kind === 'clay' ? DG.clayPrice(G, id) : kind === 'glaze' ? DG.glazePrice(G, id) : DG.potItemPrice(G, id);
    const cost = price * qty;
    if (G.money < cost) { toast(`Not enough money: that costs ${kr(cost)}.`); return false; }
    G.money -= cost;
    G.today.spent += cost;
    if (kind === 'clay') G.inv.clay[id] = round1((G.inv.clay[id] || 0) + qty);
    else if (kind === 'glaze') G.inv.glazes[id] = (G.inv.glazes[id] || 0) + qty;
    else G.inv.items[id] = (G.inv.items[id] || 0) + qty;
    return true;
  }

  function act(name, arg) {
    if (!['endday', 'newgame', 'fire', 'deleteplayer', 'restorebackup'].includes(name)) UI.confirm = null;
    if (name === 'view' && arg !== UI.view) sfx('page');
    else if (!['stitch', 'press', 'pet'].includes(name)) sfx('click');
    switch (name) {
      case 'view': UI.view = arg; UI.arrange = false; window.scrollTo(0, 0); break;
      case 'arrange': UI.arrange = !UI.arrange; break;
      case 'arrangereset': G.decor.pos = {}; sfx('page'); break;
      case 'tab': UI.tab = arg; break;
      case 'howto': UI.overlay = { type: 'intro' }; break;
      case 'menu': UI.overlay = { type: 'menu' }; UI.exportCode = ''; break;
      case 'closeov': UI.overlay = null; clearTimeout(UI.trainT); break;
      case 'albumtab': UI.albumTab = arg; break;
      case 'haggle': if (G.today && !G.today.haggleDone) UI.overlay = { type: 'haggle' }; break;
      case 'twirl': UI.twirl = true; clearTimeout(UI.twirlT); UI.twirlT = setTimeout(() => { UI.twirl = false; render(); }, 1300); sfx('good'); break;
      case 'opendoor': {
        if (UI.doorOpen) break;
        UI.doorOpen = true; sfx('bell');
        setTimeout(() => { UI.doorOpen = false; if (UI.overlay && UI.overlay.type === 'morning') { UI.overlay = null; UI.walkIn = true; render(); } }, 850);
        break;
      }
      case 'tapfamily': {
        // a little moment with the family: hugs and giggles, a bit of happiness the first time each day
        UI.bounce = arg; clearTimeout(UI.bounceT); UI.bounceT = setTimeout(() => { UI.bounce = null; render(); }, 1300);
        const key = 'tap-' + arg;
        if (G.home.did[key] !== G.day) { G.home.did[key] = G.day; G.home.happy = clamp(G.home.happy + 2, 0, 100); }
        sfx(arg === 'pooh' ? 'squish' : arg === 'dexter' ? 'purr' : 'good');
        break;
      }
      case 'readmail': { const m = DG.mailToday(G)[0]; if (m) { UI.overlay = { type: 'letter', m }; sfx('good'); } break; }
      case 'keepmail': {
        DG.openMail(G, arg);
        const next = DG.mailToday(G)[0];
        UI.overlay = next ? { type: 'letter', m: next } : null;
        break;
      }
      case 'toggle-ui': UI[arg] = !UI[arg]; break;
      case 'openreq': UI.overlay = { type: 'req', arg }; break;
      case 'accept': {
        if (G.active) return;
        G.active = G.queue.splice(+arg, 1)[0];
        G.design = DG.newDesign(G);
        UI.overlay = null; UI.view = 'workshop'; UI.tab = 'fabric';
        window.scrollTo(0, 0);
        toast(`Order accepted: a dress for ${G.active.name}.`);
        break;
      }
      case 'decline': {
        const c = G.queue.splice(+arg, 1)[0];
        DG.storyDeclined(G, c);
        UI.overlay = null;
        toast(`${c.name} understands and wishes you a lovely day.`);
        break;
      }
      case 'buyf': case 'buyi': {
        const [id, q] = arg.split(':');
        const it = name === 'buyf' ? byId(DG.FABRICS, id) : byId(DG.ITEMS, id);
        const kind = name === 'buyf' ? 'fabric' : 'item', m0 = G.money;
        if (buy(kind, id, +q)) { toast(`Bought ${q}${name === 'buyf' ? ' m' : '×'} ${it.name}.`); UI.lastBuy = { kind, id, qty: +q, cost: m0 - G.money, day: G.day, name: it.name }; }
        break;
      }
      case 'undobuy': {
        // a mis-tap at the market: the stall takes it back at the price you paid, the same day
        const lb = UI.lastBuy;
        UI.lastBuy = null;
        if (!lb || lb.day !== G.day) break;
        const inv = lb.kind === 'fabric' ? G.inv.fabrics : G.inv.items;
        if ((inv[lb.id] || 0) < lb.qty) { toast('That has already been used.'); break; }
        inv[lb.id] = round1(inv[lb.id] - lb.qty);
        G.money += lb.cost; G.today.spent -= lb.cost;
        toast(`Returned ${lb.name}.`);
        break;
      }
      case 'idea': {
        const idea = DG.suggestDesign(G, G.active);
        if (!idea) { toast('Mie can\'t think of anything we can afford today. Maybe visit the market?'); break; }
        Object.assign(G.design, idea);
        toast(pick(['Mie sketched an idea. Change anything you like!', 'How about this? Tap again for another idea.', 'A little sketch from Mie. Make it your own!']));
        sfx('good');
        break;
      }
      case 'buyandsew': {
        const an = DG.analyze(G.design, G);
        if (G.money < an.missingCost) { toast('Not enough money for everything that is missing.'); break; }
        an.missing.forEach(m => buy(m.kind, m.id, m.qty));
        startSewing(); return;
      }
      case 'buymissing': {
        const an = DG.analyze(G.design, G);
        if (G.money < an.missingCost) { toast('Not enough money for everything that is missing.'); break; }
        an.missing.forEach(m => buy(m.kind, m.id, m.qty));
        toast(`Bought the missing materials for ${kr(an.missingCost)}.`);
        break;
      }
      case 'set': {
        const i = arg.indexOf(':');
        const key = arg.slice(0, i), val = arg.slice(i + 1) || null;
        G.design[key] = val;
        if (key === 'main' || key === 'accent') {
          const f = byId(DG.FABRICS, val);
          const ck = key === 'main' ? 'mainColor' : 'accentColor';
          if (f && f.colors && !f.colors.includes(G.design[ck])) G.design[ck] = f.colors[0];
        }
        break;
      }
      case 'toggle': {
        const ex = G.design.extras;
        G.design.extras = ex.includes(arg) ? ex.filter(x => x !== arg) : ex.concat(arg);
        break;
      }
      case 'sew': startSewing(); return;
      case 'uptab': UI.upTab = arg; break;
      case 'menutab': UI.menuTab = arg; UI.importErr = ''; break;
      case 'tipok': if (!G.tips.includes(arg)) G.tips.push(arg); break;
      case 'tipsoff': S.tips = false; DG.Profiles.saveSettings(S); toast('Tips are off. Turn them on again in Menu → Settings.'); break;
      case 'replaytips': G.tips = []; S.tips = true; DG.Profiles.saveSettings(S); UI.overlay = null; UI.view = 'shop'; toast('Tips will show again as you play.'); break;
      case 'setting': {
        const i = arg.indexOf(':');
        const key = arg.slice(0, i), raw = arg.slice(i + 1);
        S[key] = raw === 'true' ? true : raw === 'false' ? false : raw;
        DG.Profiles.saveSettings(S);
        applySettings();
        break;
      }
      case 'savenow': save(); toast('Saved on this device ✓'); break;
      case 'exportcode': UI.exportCode = DG.Profiles.exportCode(G); break;
      case 'copycode': {
        const ta = document.getElementById('exportcode');
        const fallback = () => { if (ta) { ta.focus(); ta.select(); } toast('Select the code and copy it.'); };
        try { navigator.clipboard.writeText(UI.exportCode).then(() => toast('Save code copied ✓'), fallback); } catch (e) { fallback(); }
        return;
      }
      case 'importcode': {
        const code = (document.getElementById('importcode') || {}).value;
        try {
          const game = DG.ensureDefaults(DG.Profiles.parseCode(code));
          save();
          DG.Profiles.create(`Imported (day ${game.day})`, game);
          G = game; UI.importErr = ''; UI.exportCode = ''; UI.overlay = null; UI.view = 'shop';
          toast('Save imported as a new player ✓ Rename it under Menu → Players.');
        } catch (e) { UI.importErr = e.message; }
        break;
      }
      case 'firstplayer': case 'newplayer': {
        const nm = (document.getElementById(name === 'firstplayer' ? 'firstname' : 'newname') || {}).value || '';
        if (!nm.trim()) { toast('Type a name first.'); return; }
        if (G) save();
        DG.Profiles.create(nm, null);
        G = DG.newGame(); DG.startDay(G);
        UI.view = 'shop'; UI.overlay = { type: 'intro' }; UI.exportCode = '';
        break;
      }
      case 'restorebackup': {
        if (UI.confirm !== 'rb-' + arg) { UI.confirm = 'rb-' + arg; break; }
        UI.confirm = null;
        const b = DG.Profiles.backupGame(+arg);
        if (!b) { toast('That backup could not be opened.'); break; }
        DG.Profiles.backup(DG.Profiles.active().id);   // keep the current game as a backup too
        G = DG.ensureDefaults(b);
        UI.view = 'shop'; UI.overlay = null;
        toast(`Restored day ${G.day}.`);
        break;
      }
      case 'switchplayer': {
        save();
        DG.Profiles.switchTo(arg);
        G = load();
        if (!G) { G = DG.newGame(); DG.startDay(G); }
        UI.view = 'shop'; UI.overlay = null; UI.exportCode = '';
        if (UI.rescued && DG.Profiles.backups().length) { UI.overlay = { type: 'menu' }; UI.menuTab = 'save'; UI.rescued = false; }
        toast(`Welcome back, ${DG.Profiles.active().name}!`);
        break;
      }
      case 'renameplayer': {
        const v = (document.getElementById('rn-' + arg) || {}).value || '';
        DG.Profiles.rename(arg, v);
        toast('Renamed ✓');
        return render();
      }
      case 'deleteplayer': {
        if (UI.confirm !== 'del-' + arg) { UI.confirm = 'del-' + arg; return render(); }
        UI.confirm = null;
        DG.Profiles.remove(arg);
        toast('Player deleted.');
        return render();
      }
      case 'activity': {
        if (arg === 'pet') return act('pet');
        const a = byId(DG.ACTIVITIES, arg);
        if (DG.doActivity(G, arg)) {
          if (!a.free) G.today.private = (G.today.private || 0) + a.cost;
          sfx('fanfare');
          toast(`${a.icon} ${a.name}: family happiness +${a.joy}!`);
        }
        break;
      }
      case 'pet': {
        if (DG.doActivity(G, 'pet')) {
          UI.dexter = 'purr'; sfx('purr');
          toast('Dexter purrs like a little motor. ❤️ +4');
          setTimeout(() => { UI.dexter = null; if (UI.view === 'home' && !UI.overlay) render(); }, 2800);
        } else if (G.home.catFood > 0 && G.home.tricks.known.length) {
          // he shows off one of his tricks
          const k = G.home.tricks.known;
          UI.dexter = k[Math.floor(Math.random() * k.length)]; sfx('good');
          clearTimeout(UI.dexT); UI.dexT = setTimeout(() => { UI.dexter = null; if (UI.view === 'home' && !UI.overlay) render(); }, 2200);
        } else {
          sfx('meow');
          toast(G.home.catFood <= 0 ? 'Dexter would rather have dinner. Mjav!' : 'Dexter has had enough cuddles for today. He is a cat, after all.');
          return;
        }
        break;
      }
      case 'buyhome': {
        const it = byId(DG.HOME_ITEMS, arg);
        if (DG.buyHomeItem(G, arg)) { G.today.private = (G.today.private || 0) + it.cost; sfx('coin'); toast(`${it.icon} ${it.name} for ${it.who === 'dexter' ? 'Dexter' : 'Elizabeth'}!`); }
        break;
      }
      case 'hometab': UI.homeTab = arg; break;
      case 'adamjob': {
        // Adam's very normal office job (the sunglasses in the taskbar know better)
        DG.Audio.stopMusic(); DG.Audio.ambience(null);
        document.getElementById('app').style.display = 'none';
        let bonus = 0;
        DG.Agent.open({
          lang: S.lang, progress: G.agent,
          onResult(r) {
            // the game keeps its own progress in G.agent; the first clear of each mission pays Adam overtime
            if (r.first) { bonus += 2000; G.money += 2000; if (G.today) G.today.income = (G.today.income || 0) + 2000; }
            save();
          },
          onSave() { save(); },
          onClose() {
            document.getElementById('app').style.display = '';
            applySettings(); render();
            if (bonus) setTimeout(() => toast(`💼 Adam got an overtime bonus: ${kr(bonus)}`), 200);
          },
        });
        return;
      }

      case 'bulbcol': UI.bulb = arg; break;
      case 'bed': {
        const i = +arg, b = G.home.garden.beds[i], st = DG.tulipStage(G, b);
        if (!b) {
          if (!DG.canPlant(G)) { toast('The ground is frozen. Plant again when spring comes.'); break; }
          if (G.money < DG.BULB_COST) { toast('Not enough money for a bulb.'); break; }
          if (DG.plantBulb(G, i, UI.bulb || 'red')) { G.today.private = (G.today.private || 0) + DG.BULB_COST; sfx('squish'); }
        } else if (st === 'bloom') {
          if (DG.pickTulip(G, i)) { sfx('good'); toast('🌷 A bouquet for the dinner table.'); }
        } else sfx('click');
        break;
      }
      case 'kidsew': {
        if (!DG.kidCanSew(G)) { toast('Elizabeth has sewn enough for today. 💤'); break; }
        UI.overlay = { type: 'kidsew', c: DG.kidScraps(G)[0], d: 'heart' };
        break;
      }
      case 'kidc': if (UI.overlay && UI.overlay.type === 'kidsew') UI.overlay.c = arg; break;
      case 'kidd': if (UI.overlay && UI.overlay.type === 'kidsew') UI.overlay.d = arg; break;
      case 'kidsewdone': {
        const o = UI.overlay;
        if (o && DG.kidSew(G, o.c, o.d)) { sfx('perfect'); toast('Elizabeth hung her new doll dress on the line.'); }
        UI.overlay = null;
        break;
      }
      case 'train': if (DG.canTrain(G)) UI.overlay = { type: 'train', step: 'pick' }; break;
      case 'trainpick': {
        UI.overlay = { type: 'train', step: 'play', trick: arg, treats: 0, good: 0, look: false };
        UI.trainT = setTimeout(trainTick, 900);
        break;
      }
      case 'treat': {
        const o = UI.overlay;
        if (!o || o.type !== 'train' || o.step !== 'play') break;
        o.treats += 1;
        // a good treat: he munches it and looks away for a moment
        if (o.look) { o.good += 1; o.look = false; sfx('good'); clearTimeout(UI.trainT); UI.trainT = setTimeout(trainTick, 600 + Math.random() * 700); } else sfx('meow');
        if (o.treats >= 5) {
          clearTimeout(UI.trainT);
          const res = DG.trainDexter(G, o.trick, o.good);
          UI.overlay = res ? { type: 'train', step: 'done', trick: o.trick, res } : null;
          if (res && res.learnt) sfx('fanfare');
        }
        break;
      }

      case 'buywear': {
        const w = byId(DG.WARDROBE, arg);
        if (DG.buyClothes(G, arg)) { G.today.private = (G.today.private || 0) + w.cost; sfx('coin'); toast(`👗 Mie is wearing her new ${w.name.toLowerCase()}!`); }
        break;
      }
      case 'wear': if (DG.wearClothes(G, arg)) sfx('click'); break;
      case 'movehouse': {
        const nx = DG.moveHouse(G);
        if (nx) { G.today.private = (G.today.private || 0) + nx.cash; sfx('fanfare'); toast(`🏡 The family moved to: ${nx.name}!`); window.scrollTo(0, 0); }
        break;
      }
      case 'repay': {
        const amt = arg === 'all' ? G.home.loan.principal : +arg;
        const paid = DG.repayLoan(G, amt);
        if (paid) { G.today.private = (G.today.private || 0) + paid; sfx('coin'); toast(G.home.loan.principal ? `Paid ${kr(paid)} off the mortgage.` : '🎉 The mortgage is paid off!'); }
        break;
      }
      case 'catfood': if (DG.buyCatFood(G)) { G.today.private = (G.today.private || 0) + DG.CAT_FOOD.cost; sfx('meow'); toast('Dexter approves. 🐟'); } break;
      case 'goexpansion': UI.view = 'upgrades'; UI.upTab = 'expansion'; window.scrollTo(0, 0); break;
      case 'setpot': {
        const i = arg.indexOf(':');
        G.pot[arg.slice(0, i)] = arg.slice(i + 1);
        break;
      }
      case 'buyclay': case 'buyglaze': case 'buypotitem': {
        const [id, q] = arg.split(':');
        const kind = name === 'buyclay' ? 'clay' : name === 'buyglaze' ? 'glaze' : 'potitem';
        if (buyPottery(kind, id, +q)) toast(`Bought ${q}${kind === 'clay' ? ' kg' : '×'} ${(byId(kind === 'clay' ? DG.CLAYS : kind === 'glaze' ? DG.GLAZES : DG.POT_ITEMS, id)).name}.`);
        break;
      }
      case 'buypotmissing': {
        const an = DG.analyzePot(G.pot, G);
        if (G.money < an.missingCost) { toast('Not enough money for everything that is missing.'); break; }
        an.missing.forEach(m => buyPottery(m.kind, m.id, m.qty));
        toast(`Bought the missing materials for ${kr(an.missingCost)}.`);
        break;
      }
      case 'throw': startThrowing(); return;
      case 'potmarkdown': {
        const it = G.shelf[+arg];
        if (it) { it.price = Math.max(100, Math.round(it.price * 0.8 / 10) * 10); toast(`Marked down to ${kr(it.price)}.`); }
        break;
      }
      case 'claimall': {
        const ids = DG.claimableGoals(G);
        const got = ids.reduce((a, id) => a + DG.claimGoal(G, id), 0);
        if (got) { sfx('fanfare'); toast(ids.length === 1 ? `🏆 ${byId(DG.GOALS, ids[0]).title}: +${kr(got)}!` : `🏆 ${ids.length} goals collected: +${kr(got)}!`); }
        break;
      }
      case 'claim': {
        const got = DG.claimGoal(G, arg);
        if (got) sfx('fanfare');
        if (got) toast(`🏆 ${byId(DG.GOALS, arg).title}: +${kr(got)}!`);
        break;
      }
      case 'rackorder': {
        if (G.active || G.rack.length >= DG.rackCapacity(G)) break;
        G.active = Object.assign({}, DG.RACK_SHOPPER);
        G.design = DG.newDesign(G);
        UI.view = 'workshop'; UI.tab = 'fabric';
        window.scrollTo(0, 0);
        break;
      }
      case 'cancelrack': if (G.active && G.active.rack && !G.design.sewn) { G.active = null; G.design = null; UI.view = 'shop'; } break;
      case 'markdown': {
        const it = G.rack[+arg];
        if (it) { it.price = Math.max(300, Math.round(it.price * 0.8 / 50) * 50); toast(`Marked down to ${kr(it.price)}.`); }
        break;
      }
      case 'buydecor': {
        const dc = byId(DG.DECOR, arg);
        if (G.decor.owned.includes(arg) || G.money < dc.cost) break;
        G.money -= dc.cost; G.today.spent += dc.cost;
        G.decor.owned.push(arg);
        toast(`${dc.name} added to the shop. Charm is now ${DG.charm(G)}.`);
        break;
      }
      case 'wallpaper': {
        const w = byId(DG.WALLPAPERS, arg);
        if (!G.decor.walls.includes(arg)) {
          if (G.money < w.cost) break;
          G.money -= w.cost; G.today.spent += w.cost;
          G.decor.walls.push(arg);
        }
        G.decor.wallpaper = arg;
        break;
      }
      case 'hire': {
        const st = byId(DG.STAFF, arg);
        if (G.staff[arg] || G.money < st.fee) break;
        G.money -= st.fee; G.today.spent += st.fee;
        G.staff[arg] = true;
        toast(`${st.name.split(',')[0]} starts today!`);
        break;
      }
      case 'fire': {
        if (UI.confirm !== 'fire-' + arg) { UI.confirm = 'fire-' + arg; break; }
        UI.confirm = null;
        G.staff[arg] = false;
        toast(`${byId(DG.STAFF, arg).name.split(',')[0]} has left the atelier.`);
        break;
      }
      case 'campaign': {
        const m = byId(DG.MARKETING, arg);
        if (G.marketing.includes(arg) || G.money < m.cost || G.rep < m.minRep) break;
        G.money -= m.cost; G.today.spent += m.cost;
        G.marketing.push(arg);
        if (arg === 'show') G.rep = clamp(G.rep + 4, 0, 100);
        toast(`${m.name} booked for tomorrow.`);
        break;
      }
      case 'resultdone': UI.overlay = null; UI.resDetails = false; UI.view = 'shop'; window.scrollTo(0, 0); break;
      case 'nextcust': UI.resDetails = false; UI.view = 'shop'; UI.overlay = G.queue.length ? { type: 'req', arg: '0' } : null; break;
      case 'upgrade': {
        const u = byId(DG.UPGRADES, arg);
        const lvl = DG.upgradeLevel(G, arg);
        const cost = u.costs[lvl];
        if (cost == null || G.money < cost) break;
        G.money -= cost;
        G.upgrades[arg] = lvl + 1;
        toast(`${u.name} upgraded to level ${lvl + 1}!`);
        break;
      }
      case 'endday': {
        if (G.active) { toast(G.active.rack ? 'Finish the rack dress before closing.' : `Finish ${G.active.name}'s dress before closing.`); break; }
        if (G.queue.length && UI.confirm !== 'endday') { UI.confirm = 'endday'; break; }
        UI.confirm = null;
        const res = DG.endDay(G);
        if (res.pottery && res.pottery.cracked.length) setTimeout(() => sfx('crack'), 300);
        UI.overlay = { type: 'dayend', res }; UI.showBooks = false;
        break;
      }
      case 'nextday': {
        DG.startDay(G); UI.walkIn = true; UI.overlay = null; UI.view = 'shop'; window.scrollTo(0, 0);
        if (G.newSeason && G.day > 1) setTimeout(() => toast(`${DG.season(G).icon} ${DG.season(G).name} has arrived!`), 300);
        break;
      }
      case 'newgame': {
        if (UI.confirm !== 'newgame') { UI.confirm = 'newgame'; break; }
        UI.confirm = null;
        G = DG.newGame(); DG.startDay(G);
        UI.view = 'shop'; UI.overlay = { type: 'intro' };
        break;
      }
      default: return;
    }
    save();
    render();
  }

  document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('dismissable')) { act('closeov'); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || b.dataset.act === 'stitch' || b.dataset.act === 'press') return;
    act(b.dataset.act, b.dataset.arg);
  });
  // arranging the shop: drag a piece of furniture on the upper layer, then it is painted into the room at its new spot
  let drag = null;
  const svgPoint = (svg, e) => { const m = svg.getScreenCTM(); if (!m) return null; const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return [pt.x, pt.y]; };
  document.addEventListener('pointerdown', e => {
    const g = UI.arrange && e.target.closest && e.target.closest('[data-drag]');
    if (!g) return;
    const svg = g.ownerSVGElement, p0 = svg && svgPoint(svg, e);
    if (!p0) return;
    e.preventDefault();
    const id = g.dataset.drag, tall = !!g.dataset.tall, [dx, dy] = DG.decorPos(G, id, tall);
    drag = { g, id, svg, p0, dx, dy, nx: dx, ny: dy, tall };
    g.classList.add('lifted');
    try { g.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = svgPoint(drag.svg, e);
    if (!p) return;
    [drag.nx, drag.ny] = DG.clampDecor(drag.id, drag.dx + p[0] - drag.p0[0], drag.dy + p[1] - drag.p0[1], drag.tall);
    drag.g.setAttribute('transform', `translate(${drag.nx} ${drag.ny})`);
  });
  const drop = () => {
    if (!drag) return;
    const d = drag; drag = null;
    d.g.classList.remove('lifted');
    if (d.nx !== d.dx || d.ny !== d.dy) { DG.moveDecor(G, d.id, d.nx, d.ny); sfx('squish'); save(); }
  };
  document.addEventListener('pointerup', drop);
  document.addEventListener('pointercancel', drop);

  // pointerdown keeps the stitch button snappy on touch screens
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-act="stitch"]');
    if (b) { e.preventDefault(); stitch(); }
    if (e.target.closest('[data-act="press"]') && UI.throwSt) { e.preventDefault(); UI.throwSt.holding = true; e.target.closest('[data-act="press"]').classList.add('held'); }
  });
  const release = () => {
    if (UI.throwSt) UI.throwSt.holding = false;
    const b = document.getElementById('pressbtn');
    if (b) b.classList.remove('held');
  };
  ['pointerup', 'pointercancel', 'blur'].forEach(ev => (ev === 'blur' ? window : document).addEventListener(ev, release));
  document.addEventListener('contextmenu', e => { if (e.target.closest('[data-act="press"]')) e.preventDefault(); });
  document.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
  // first touch unlocks audio on iOS
  document.addEventListener('pointerdown', () => DG.Audio.unlock(), { once: true });
  document.addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.setting;
    if (!k) return;
    S[k] = e.target.value / 100;
    const v = document.getElementById(`vol-${k}-v`);
    if (v) v.textContent = `${e.target.value}%`;
    applySettings();
  });
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.setting) { DG.Profiles.saveSettings(S); if (e.target.dataset.setting === 'sfx') sfx('coin'); } });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'firstname') { act('firstplayer'); return; }
    if (e.key === 'Enter' && e.target.id === 'newname') { act('newplayer'); return; }
    if (UI.overlay && UI.overlay.type === 'sew' && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); stitch(); }
    else if (UI.overlay && UI.overlay.type === 'throw' && e.code === 'Space') { e.preventDefault(); if (UI.throwSt) UI.throwSt.holding = true; }
    else if (e.key === 'Escape' && UI.overlay && ['req', 'menu'].includes(UI.overlay.type)) act('closeov');
  });

  // ---------------- boot ----------------
  applySettings();
  // play offline too (only where the game is served as files, not in the single-file build)
  try {
    if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href) && !document.getElementById('single-file'))
      navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { /* ignore */ }
  // ask the browser not to clear this site's storage (Safari otherwise may after weeks without a visit)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  G = DG.Profiles.active() ? load() : null;
  if (DG.Profiles.active() && !G) {
    G = DG.newGame();
    DG.startDay(G);
    UI.overlay = { type: 'intro' };
    if (UI.rescued && DG.Profiles.backups().length) {
      // the save could not be opened: it is kept aside, and the earlier copies are one tap away
      UI.overlay = { type: 'menu' }; UI.menuTab = 'save';
      setTimeout(() => toast('Your saved game could not be opened, but it is kept safe. Restore an earlier save below.'), 400);
    }
    save();
  } else if (G && G.active && !G.design) {
    G.design = DG.newDesign(G);
  } else if (G && G.active && G.design.sewn) {
    // the page was closed mid-sewing: materials are already cut, so resume
    UI.view = 'workshop';
    beginSewGame();
  }
  // a returning player first sees the street outside the shop; one tap opens the door
  if (G && !UI.overlay && !UI.rescued) UI.overlay = { type: 'morning' };
  render();
  window.__mie = { get state() { return G; }, act, get html() { return UI.lastHtml; } };
})();
