// UI controller: renders views/overlays, handles input, runs the sewing mini-game.
(function () {
  const DG = window.DG;
  const { byId, clamp, round1, pick } = DG;
  let G = null;
  const UI = { view: 'shop', tab: 'fabric', upTab: 'equipment', menuTab: 'settings', overlay: null, sew: null, raf: 0, confirm: null, dexter: null, exportCode: '', importErr: '' };

  const kr = n => `${Math.round(n).toLocaleString('da-DK')} kr`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // stat effects as actually applied (scaled by the balance knob)
  const fx = d => Object.entries(d).map(([k, raw]) => {
    const v = round1(raw * DG.BAL.delta);
    return `<span class="fx ${v > 0 ? 'up' : 'down'}">${DG.ATTR_META[k].icon}${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`;
  }).join('');

  function save() { if (G) DG.Profiles.saveGame(G); }
  function load() {
    const x = DG.Profiles.loadGame();
    return x && x.version === 1 ? DG.ensureDefaults(x) : null;
  }

  let S = DG.Profiles.settings();
  function applySettings() {
    const r = document.documentElement;
    if (S.theme === 'auto') delete r.dataset.mieTheme; else r.dataset.mieTheme = S.theme;
    r.classList.toggle('no-anim', !S.anim);
    DG.Audio.setVolumes(S.music, S.sfx);
  }
  const sfx = n => DG.Audio.play(n);

  function toast(msg) {
    document.querySelectorAll('.toast').forEach(x => x.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    const bar = document.querySelector('.topbar');   // sit just below the top bar so money stays visible
    if (bar) t.style.top = `${Math.max(10, bar.getBoundingClientRect().bottom + 8)}px`;
    document.body.appendChild(t);
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
      <div class="brief-row"><span class="lbl">Budget</span><b>${kr(c.budget)}</b></div>
    </div>`;
  }

  function custCard(c, arg) {
    if (c.rack) {
      return `<div class="cust rackcard"><span class="rack-ic">👗</span><span class="cust-info"><span class="cust-name">Ready-to-wear dress</span>
        <span class="muted">For the rack. Walk-in shoppers buy in the evening.</span></span></div>`;
    }
    return `<button class="cust" data-act="openreq" data-arg="${arg}">
      ${DG.renderAvatar(c.look, 'neutral', 64)}
      <span class="cust-info"><span class="cust-name">${esc(c.name)} ${c.visits ? '<span class="tag">Regular</span>' : ''}</span>
      <span class="muted">${esc(c.title)}</span><span class="pchips small">${prioChips(c)}</span></span>
      <span class="cust-budget">${kr(c.budget)}</span>
    </button>`;
  }

  const eligibleTitles = () => DG.ARCHETYPES.filter(a => a.minRep <= G.rep).map(a => a.title);

  // ---------------- top bar ----------------
  function topbar() {
    const navs = [['shop', '🏪', 'Shop'], ['market', '🧺', 'Market'], ['workshop', '✂️', 'Workshop'], ['studio', '🏺', 'Pottery'], ['home', '🏡', 'Home'], ['upgrades', '⭐', 'Upgrades'], ['goals', '🏆', 'Goals']];
    const se = DG.season(G);
    const claimable = DG.claimableGoals(G).length;
    return `<header class="topbar">
      <div class="brand"><span class="brand-script">Mie's</span><span class="brand-word">Atelier</span></div>
      <div class="hud">
        <div class="hud-item"><span class="lbl">Day</span><b>${G.day}</b></div>
        <div class="hud-item" title="${DG.daysLeftInSeason(G)} days left of ${se.name.toLowerCase()}"><span class="lbl">Season</span><b>${se.icon} <span class="sname">${se.name}</span></b></div>
        <div class="hud-item"><span class="lbl">Bank</span><b class="${G.money < 100 ? 'low' : ''}">${kr(G.money)}</b></div>
        <div class="hud-item rep"><span class="lbl">Reputation</span><b>${Math.round(G.rep)}</b><span class="repbar"><i style="width:${clamp(G.rep, 0, 100)}%"></i></span></div>
      </div>
      <nav class="nav">${navs.map(([id, ic, l]) => `<button class="navbtn ${UI.view === id ? 'on' : ''}" data-act="view" data-arg="${id}"><span class="ic">${ic}</span><span>${l}</span>${(id === 'workshop' && G.active) || (id === 'goals' && claimable) ? '<i class="dot"></i>' : ''}</button>`).join('')}
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
    const seasonBanner = G.newSeason ? `<div class="event season">${DG.season(G).icon} ${esc(DG.season(G).hello)} In season: ${DG.season(G).in.map(id => byId(DG.FABRICS, id).name.toLowerCase()).join(', ')}.</div>` : '';
    const goalBanner = DG.claimableGoals(G).length ? `<button class="event goal" data-act="view" data-arg="goals">🏆 ${DG.claimableGoals(G).length} goal${DG.claimableGoals(G).length > 1 ? 's' : ''} complete. Tap to collect your reward!</button>` : '';
    const camp = G.boost && G.boost.campaigns && G.boost.campaigns.length
      ? `<div class="event teal">Today's marketing: ${G.boost.campaigns.map(id => byId(DG.MARKETING, id).name).join(', ')}.</div>` : '';
    const booked = G.marketing.length ? `<div class="event soft">Booked for tomorrow: ${G.marketing.map(id => byId(DG.MARKETING, id).name).join(', ')}.</div>` : '';
    const cap = DG.rackCapacity(G);
    const rack = `<section class="panel rack-panel">
        <div class="sec-head"><h2>Ready-to-wear rack</h2><span class="muted">${G.rack.length} of ${cap} hangers · each dress has a ${Math.round(DG.rackSaleChance(G) * 100)}% chance to sell every evening</span></div>
        ${G.rack.length ? `<div class="rack">${G.rack.map((it, i) => `<div class="rack-item"><span class="thumb">${DG.renderDress(it.design, 'rk' + i)}</span><b>${kr(it.price)}</b>
          <button class="btn small ghost" data-act="markdown" data-arg="${i}" ${it.price <= 50 ? 'disabled' : ''}>Mark down 20%</button></div>`).join('')}</div>`
          : '<p class="muted">Nothing on the rack yet. Sew a dress without an order to use up leftover fabric and earn money while you sleep.</p>'}
        <button class="btn wide" data-act="rackorder" ${G.active || G.rack.length >= cap ? 'disabled' : ''}>✂️ Sew a dress for the rack</button>
        ${G.active && !G.active.rack ? '<p class="muted small">Finish the current order first.</p>' : ''}
      </section>`;
    return `<div class="scene-wrap">${DG.renderShop(G)}</div>
    <div class="shop-grid">
      <section class="panel mie-panel">
        <div class="mie-row">${DG.renderAvatar(DG.MIE_LOOK, 'happy', 96)}<div class="bubble">${esc(mieLine())}</div></div>
        ${goalBanner}${seasonBanner}${ev ? `<div class="event">${esc(evText)}</div>` : ''}${camp}${booked}
        <dl class="stats">
          <div><dt>Dresses made</dt><dd>${G.stats.served}</dd></div>
          <div><dt>Avg. satisfaction</dt><dd>${G.stats.served ? Math.round(G.stats.totalS / G.stats.served) + '%' : '–'}</dd></div>
          <div><dt>Rent${DG.wages(G) ? ' + wages' : ''} tonight</dt><dd>${kr(DG.dailyCosts(G))}</dd></div>
          <div><dt>Shop charm</dt><dd>✨ ${DG.charm(G)}</dd></div>
          <div><dt>Regulars</dt><dd>${G.known.length}</dd></div>
          <div><dt>Mie's mood</dt><dd>${G.home.happy >= 75 ? '😊' : G.home.happy < 30 ? '😔' : '🙂'} ${Math.round(G.home.happy)}</dd></div>
        </dl>
        <button class="btn ghost wide" data-act="endday">${UI.confirm === 'endday' ? `Tap again: ${G.queue.length} will leave (−rep)` : 'Close shop for today 🌙'}</button>
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

  function attrBars(attrs, c) {
    return DG.ATTRS.map(k => {
      const w = c.weights[k] || 0, t = c.targets[k];
      const v = attrs[k];
      const state = !w ? '' : v >= t ? 'met' : v >= t * 0.8 ? 'close' : 'short';
      return `<div class="abar ${w ? 'wanted' : ''} ${state}">
        <span class="alabel">${DG.ATTR_META[k].icon} ${DG.ATTR_META[k].label}${w ? `<i>${'♥'.repeat(w)}</i>` : ''}</span>
        <span class="atrack"><b style="width:${v * 10}%"></b>${w ? `<em style="left:${t * 10}%" title="Wish: ${t}"></em>` : ''}</span>
        <span class="aval">${v.toFixed(1)}</span>
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
      return `<div class="empty panel">${DG.renderAvatar(DG.MIE_LOOK, 'neutral', 110)}<h2>No order on the table</h2>
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
          <div class="bm-txt"><b>${esc(c.name)}</b><span class="muted small">${esc(c.title)}</span></div>
          <button class="btn small ghost" data-act="openreq" data-arg="active">Read request</button></div>
        <div class="pchips">${prioChips(c)}</div>`}
        ${c.reqs.length ? `<ul class="reqs inline">${c.reqs.map(r => { const ok = DG.REQS[r].check(d); return `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${DG.REQS[r].short}</li>`; }).join('')}</ul>` : ''}
        <div class="stage">${DG.renderDress(d, 'ws')}</div>
        <div class="attrs">${attrBars(an.attrs, c)}</div>
        <p class="muted small">${c.rack ? 'Careful stitching raises quality, and with it the price tag.' : `The marks show ${esc(c.name)}'s wishes. Careful stitching raises quality further.`}</p>
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
              : `<div><span class="lbl">Budget</span><b>${kr(c.budget)}</b><span class="small ${margin < 0 ? 'bad' : 'good'}">${margin < 0 ? 'over budget' : `${kr(margin)} margin`}</span></div>`}
          </div>
          ${an.notes.map(n => `<p class="note">${esc(n)}</p>`).join('')}
          ${an.issues.length ? `<ul class="issues">${an.issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p class="ready">Everything is ready on the cutting table.</p>'}
          <div class="actions">
            ${an.missing.length ? `<button class="btn" data-act="buymissing" ${G.money < an.missingCost ? 'disabled' : ''}>🧺 Buy what's missing (${kr(an.missingCost)})</button>` : ''}
            <button class="btn primary big" data-act="sew" ${an.issues.length ? 'disabled' : ''}>Start sewing 🪡</button>
          </div>
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
    return `<div class="sec-head"><h2>Equipment and shop</h2><span class="muted">Each upgrade level adds 10 kr to the daily rent.</span></div>
      <div class="grid upg">${DG.UPGRADES.filter(u => u.group !== 'expansion').map(upgradeCard).join('')}</div>
      <h3>Who visits the shop</h3>
      <ul class="arche-list">${DG.ARCHETYPES.map(a => `<li class="${a.minRep <= G.rep ? 'on' : ''}"><b>${a.title}</b><span class="muted small">${a.minRep <= G.rep ? 'visiting' : `from reputation ${a.minRep}`} · ${kr(a.budget[0])} to ${kr(a.budget[1])}</span></li>`).join('')}</ul>`;
  }

  function upExpansion() {
    return `<div class="sec-head"><h2>Grow the atelier</h2><span class="muted">Big steps. The upstairs floor adds 40 kr to the daily rent, the pottery studio 10 kr per level.</span></div>
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
      <div class="mie-row">${DG.renderAvatar(DG.MIE_LOOK, 'ecstatic', 120)}<div>
        <h1><span class="brand-script">Mie's</span> Atelier</h1>
        <p>Mie has just opened a tiny dress shop on a cobbled street in Copenhagen. She has a sewing machine, a dress form, 400 kr in the bank and big dreams.</p></div></div>
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
      <div class="req-head">${DG.renderAvatar(c.look, 'happy', 104)}<div><h2>${esc(c.name)}</h2><span class="muted">${esc(c.title)}${c.visits ? ` · visit no. ${c.visits + 1}` : ''}</span></div></div>
      <div class="bubble big">${esc(c.text)}</div>
      ${briefHtml(c, isActive ? G.design : null)}
      <div class="actions">
        ${isActive ? '<button class="btn primary" data-act="closeov">Back to work</button>'
          : `<button class="btn ghost" data-act="decline" data-arg="${arg}">Decline (−1 rep)</button>
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
    const mood = ['angry', 'angry', 'sad', 'neutral', 'happy', 'ecstatic'][ev.stars];
    const colorWord = id => cust.liked.includes(id) ? 'a favourite' : cust.disliked.includes(id) ? 'disliked' : 'neutral';
    const profit = ev.pay + ev.tip - ev.cost;
    return `<div class="overlay"><div class="sheet result">
      <div class="res-top">
        <div class="res-dress">${DG.renderDress(design, 'res')}</div>
        <div class="res-say">
          <div class="mie-row">${DG.renderAvatar(cust.look, mood, 96)}<div class="bubble">${esc(o.quote)} ${esc(o.line)}</div></div>
          <div class="score"><span class="pct">${ev.S}%</span><span class="stars">${'★'.repeat(ev.stars)}${'☆'.repeat(5 - ev.stars)}</span><span class="muted">satisfaction</span></div>
        </div>
      </div>
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
            <tr><td>Reputation</td><td class="num ${ev.repDelta < 0 ? 'bad' : 'good'}">${ev.repDelta > 0 ? '+' : ''}${ev.repDelta}</td></tr>
          </tbody></table>
          <p class="muted small">${ev.S >= 55 ? `${esc(cust.name)} will probably come back.` : ev.S >= 40 ? `${esc(cust.name)} is unlikely to come back.` : `${esc(cust.name)} will never set foot in the shop again.`}</p>
        </div>
      </div>
      <button class="btn primary big wide" data-act="resultdone">Back to the shop</button>
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

  function ovDayEnd(o) {
    const t = o.res.today || { income: 0, spent: 0, served: 0, startMoney: G.money };
    return `<div class="overlay"><div class="sheet dayend">
      <h2>Day ${G.day} is done 🌙</h2>
      <table class="rtable money"><tbody>
        <tr><td>Dresses delivered</td><td class="num">${t.served}</td></tr>
        <tr><td>Income</td><td class="num good">${kr(t.income)}</td></tr>
        <tr><td>Purchases</td><td class="num">−${kr(t.spent)}</td></tr>
        ${o.res.sold && o.res.sold.length ? `<tr><td>Rack sales (${o.res.sold.length} dress${o.res.sold.length > 1 ? 'es' : ''}, included in income)</td><td class="num good">${kr(o.res.rackIncome)}</td></tr>` : ''}
        ${o.res.pottery && o.res.pottery.sold.length ? `<tr><td>Pottery sold (${o.res.pottery.sold.length}, included in income)</td><td class="num good">${kr(o.res.pottery.income)}</td></tr>` : ''}
        ${o.res.pottery && (o.res.pottery.fired.length || o.res.pottery.cracked.length) ? `<tr><td>Kiln: ${o.res.pottery.fired.length} fired${o.res.pottery.cracked.length ? `, ${o.res.pottery.cracked.length} cracked 💔` : ' perfectly'}</td><td class="num">${kr(o.res.pottery.fired.reduce((a, it) => a + it.price, 0))} to shelf</td></tr>` : ''}
        <tr><td>Rent and upkeep</td><td class="num">−${kr(o.res.rent)}</td></tr>
        ${o.res.wages ? `<tr><td>Staff wages</td><td class="num">−${kr(o.res.wages)}</td></tr>` : ''}
        ${o.res.tax ? `<tr><td>SKAT (${Math.round(DG.skatRule(G).rate * 100)}% of profit above ${kr(DG.skatRule(G).free)})</td><td class="num">−${kr(o.res.tax)}</td></tr>` : ''}
        ${o.res.taxSaved ? `<tr><td>🧮 Saved by your accountant</td><td class="num good">${kr(o.res.taxSaved)}</td></tr>` : ''}
        ${o.res.missed ? `<tr><td>Customers who left unserved</td><td class="num ${o.res.assistant ? '' : 'bad'}">${o.res.missed} ${o.res.assistant ? '(Lise gave them vouchers)' : `(−${o.res.missed * 0.5} rep)`}</td></tr>` : ''}
        <tr class="tot"><td>Bank balance</td><td class="num">${kr(G.money)}</td></tr>
      </tbody></table>
      ${o.res.home ? `<div class="home-night">${DG.renderAvatar(DG.FAMILY.elizabeth.look, o.res.home.happy >= 30 ? 'happy' : 'sad', 44)}<p><b>At home:</b> ${esc(o.res.home.event)}<br><span class="muted small">Family happiness ${Math.round(o.res.home.happy)} (−${o.res.home.drop}).${o.res.home.hungry ? ' <b class="bad">Dexter is hungry. Buy cat food on the Home screen!</b>' : ''}</span></p></div>` : ''}
      ${o.res.mom ? '<p class="event">Mie couldn\'t make rent, so her mum sent 300 kr. "Just this once, skat!" Next time the bank will close the shop.</p>' : ''}
      <button class="btn primary big wide" data-act="nextday">Open the shop: day ${G.day + 1}</button>
    </div></div>`;
  }

  function ovGameOver() {
    return `<div class="overlay"><div class="sheet center">
      ${DG.renderAvatar(DG.MIE_LOOK, 'sad', 120)}
      <h2>The bank has closed the atelier</h2>
      <p>Mie ran out of money on day ${G.day} after making ${G.stats.served} dresses. Her best one scored ${G.stats.best}%.</p>
      <button class="btn primary big" data-act="newgame">Start over</button>
    </div></div>`;
  }

  function ovMenu() {
    const tabs = [['settings', '⚙️ Settings'], ['players', '👤 Players'], ['save', '💾 Save'], ['help', '❓ Help']];
    const t = UI.menuTab;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="chip ${String(S[key]) === String(v) ? 'on' : ''}" data-act="setting" data-arg="${key}:${v}">${l}</button>`).join('')}</div>`;
    const slider = (key, label) => `<div class="set-row"><label class="lbl" for="vol-${key}">${label}</label><input type="range" id="vol-${key}" min="0" max="100" step="5" value="${Math.round(S[key] * 100)}" data-setting="${key}"><span class="vol" id="vol-${key}-v">${Math.round(S[key] * 100)}%</span></div>`;
    let body = '';
    if (t === 'settings') {
      body = `<div class="set-row"><span class="lbl">Theme</span>${seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        ${slider('music', 'Music')}${slider('sfx', 'Sound effects')}
        <div class="set-row"><span class="lbl">Animations</span>${seg('anim', [[true, 'On'], [false, 'Off']])}</div>
        <div class="set-row"><span class="lbl">Tips</span>${seg('tips', [[true, 'On'], [false, 'Off']])}</div>
        <div class="set-row"><span class="lbl">Mini-games</span>${seg('minigames', [['full', 'Full'], ['quick', 'Quick']])}</div>
        <p class="muted small">Full: cut, stitch and iron each dress; knead clay before the wheel. Quick: only the stitching and the wheel. Painting pots is always included.</p>`;
    } else if (t === 'players') {
      const act = DG.Profiles.active();
      body = `<p class="muted small">Every player has their own shop on this device.</p>
        <ul class="players">${DG.Profiles.list().map(p => `<li class="${act && p.id === act.id ? 'on' : ''}">
          <div class="pl-main"><b>${esc(p.name)}</b><span class="muted small">Day ${p.day || 0} · ${kr(p.money || 0)}</span></div>
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
    if (G.gameOver) return ovGameOver();
    if (!o) return '';
    switch (o.type) {
      case 'intro': return ovIntro();
      case 'req': return ovReq(o.arg);
      case 'sew': return ovSew();
      case 'result': return ovResult(o);
      case 'rackdone': return ovRackDone(o);
      case 'dayend': return ovDayEnd(o);
      case 'menu': return ovMenu();
      case 'throw': return ovThrow();
      case 'thrown': return ovThrown(o);
      case 'wedge': return ovPotStep('wedge');
      case 'paint': return ovPotStep('paint');
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
            <button class="btn small ghost" data-act="potmarkdown" data-arg="${i}" ${it.price <= 20 ? 'disabled' : ''}>Mark down 20%</button></div>`).join('')}</div>` : '<p class="muted">Nothing for sale yet.</p>'}
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
    let lastPot = 0;
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
        if (now - lastPot > 120) {
          lastPot = now;
          const el = document.getElementById('throwpot');
          if (el) el.innerHTML = DG.renderPot(G.pot, 'throw', { raw: true, grow: Math.min(1, t.t / t.dur), wheel: true });
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
    return `<div class="scene-wrap">${DG.renderHome(G, { dexter: UI.dexter })}</div>
    <div class="shop-grid">
      <section class="panel">
        <h2>Mie's home</h2>
        <p class="muted">Mie lives with her husband Adam, their daughter Elizabeth (3) and Dexter the cat. Home right now: <b>${esc(DG.house(G).name)}</b>. Tap Dexter to pet him.</p>
        <div class="happy"><span class="lbl">Family happiness</span><span class="hbar"><i style="width:${h.happy}%"></i></span><b>${Math.round(h.happy)}</b></div>
        <p class="small"><b>Mie: ${mood.label}.</b> ${mood.sat > 0 ? '+2 satisfaction on every dress, and steadier stitching.' : mood.sat < 0 ? '−3 satisfaction on every dress. Spend some time with the family!' : 'Above 75 Mie works better. Below 30 she gets distracted.'}</p>
        <p class="muted small">Happiness drops by ${DG.homeDecay(G)} every night (each toy slows it by 1)${h.catFood <= 0 ? ', plus 8 while Dexter is hungry' : ''}.</p>
        <h3>Today</h3><div class="chips">${acts}</div>
        <h3>Dexter's food</h3>
        <div class="food-row"><span>${h.catFood > 0 ? `🐟 ${h.catFood} day${h.catFood > 1 ? 's' : ''} of food left` : '<b class="bad">Dexter is hungry! Mjav!</b>'}</span>
          <button class="btn" data-act="catfood" ${G.money < DG.CAT_FOOD.cost ? 'disabled' : ''}>${DG.CAT_FOOD.icon} Buy ${DG.CAT_FOOD.name}: ${kr(DG.CAT_FOOD.cost)}</button></div>
        ${h.event ? `<p class="event soft">Last night: ${esc(h.event)}</p>` : ''}
      </section>
      <section class="panel">
        <h2>Where we live</h2>
        <div class="houses">${DG.HOUSES.map((hs, i) => {
          const cur = (G.home.house || 0), state = i < cur ? 'past' : i === cur ? 'now' : i === cur + 1 ? 'next' : 'later';
          return `<article class="house ${state}"><span class="house-step">${i === 0 ? 'Start' : `Step ${i}`}</span><b>${hs.name}</b><span class="small muted">${hs.desc}</span>
            <span class="small">${i ? `❤️ +${hs.joy} · happiness never below ${hs.floor}` : 'Where the story begins'}</span>
            ${state === 'now' ? '<span class="tag">Home sweet home</span>' : state === 'past' ? '<span class="muted small">Moved on ✓</span>'
              : state === 'next' ? `<button class="btn primary" data-act="movehouse" ${G.money < hs.cost ? 'disabled' : ''}>Move here: ${kr(hs.cost)}</button>` : `<span class="muted small">${kr(hs.cost)}</span>`}</article>`;
        }).join('')}</div>
        <h2>Toys for Elizabeth</h2><div class="grid upg">${items('elizabeth')}</div>
        <h2>Things for Dexter</h2><div class="grid upg">${items('dexter')}</div>
      </section>
    </div>`;
  }

  // ---------------- goals ----------------
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
      title: 'Mie\'s family', text: 'Upstairs live Adam, Elizabeth (3) and Dexter the cat. A happy family makes Mie work better, so visit them every day.' },
    { id: 'homeview', when: () => UI.view === 'home' && !ov(), target: '.happy',
      title: 'Family happiness', text: 'Play with Elizabeth and pet Dexter every day for free. Toys and outings help too. And don\'t forget Dexter\'s cat food!' },
    { id: 'upgrades', when: () => UI.view === 'upgrades' && !ov(), target: '.view-upgrades .tabs',
      title: 'Grow the shop', text: 'Spend money on equipment, expansions, decor (charm makes customers happier), staff and marketing.' },
    { id: 'rack', when: () => G.day >= 3 && UI.view === 'shop' && !ov() && !G.active, target: '.rack-panel',
      title: 'Ready-to-wear rack', text: 'Leftover fabric? Sew a dress without an order and hang it on the rack. Walk-in shoppers buy in the evening.' },
    { id: 'season', when: () => G.day > DG.SEASON_LENGTH && UI.view === 'shop' && !ov(), target: '.hud-item:nth-child(2)',
      title: 'A new season', text: 'Every 7 days the season changes. It changes who visits and which fabrics are in season (+3) or off-season (−4).' },
    { id: 'goals', when: () => DG.claimableGoals(G).length && !ov(), target: '[data-act=view][data-arg=goals]',
      title: 'Goal complete!', text: 'You reached a goal. Collect the cash reward on the Goals screen.' },
    { id: 'potteryad', when: () => !DG.upgradeLevel(G, 'pottery') && G.money >= 800 && UI.view === 'shop' && !ov(), target: '[data-act=view][data-arg=studio]',
      title: 'A pottery corner?', text: 'With some savings Mie could start making pottery too. Buy the pottery studio under Upgrades → Expansion.' },
    { id: 'pottery', when: () => UI.view === 'studio' && DG.upgradeLevel(G, 'pottery') && !ov(), target: '.pot-stage',
      title: 'The pottery corner', text: 'Pick shape, clay, glaze and decoration. Then knead, throw on the wheel and paint if you like. The kiln fires pots overnight.' },
    { id: 'tax', when: () => UI.view === 'shop' && !ov() && G.money > 4000 && !DG.upgradeLevel(G, 'accountant'), target: '[data-act=view][data-arg=upgrades]',
      title: 'SKAT is taking a bite', text: 'A busy shop pays tax on good days. An accountant (Upgrades → Equipment) lowers it.' },
    { id: 'move', when: () => UI.view === 'home' && !ov() && DG.nextHouse(G) && G.money >= DG.nextHouse(G).cost, target: '[data-act=movehouse]',
      title: 'Time to move?', text: 'You can afford a bigger home. Each move makes the family happier for good.' },
    { id: 'lowhappy', when: () => G.home.happy < 35 && !ov(), target: '[data-act=view][data-arg=home]',
      title: 'Mie misses her family', text: 'Family happiness is low, so Mie is distracted at work. Spend time at home.' },
  ];
  function currentTip() {
    if (!S.tips || !G || G.gameOver) return null;
    if (ov() && !['req', 'result'].includes(ov())) return null;
    for (const t of TIPS) {
      if (G.tips.includes(t.id)) continue;
      try { if (t.when()) return t; } catch (e) { /* ignore */ }
    }
    return null;
  }
  function coachHtml(t) {
    return `<aside class="coach" role="status">${DG.renderAvatar(DG.MIE_LOOK, 'happy', 48)}<div class="coach-txt"><b>${t.title}</b><span>${t.text}</span></div>
      <div class="coach-act"><button class="btn small primary" data-act="tipok" data-arg="${t.id}">Got it</button><button class="btn small ghost" data-act="tipsoff">No more tips</button></div></aside>`;
  }

  function helpHtml() {
    const topics = [
      ['🎯 The goal', 'Run Mie\'s dress atelier in Copenhagen. Make customers happy, earn money, raise your reputation and grow the shop, while keeping the family upstairs happy. There is no end: aim for the Goals and a bride\'s dress.'],
      ['👗 Customers and scoring', 'Each customer has wishes (hearts 1–3) across quality, workwear, creativity, exclusivity, elegance and comfort, plus must-haves, colours and favourite silhouettes. Satisfaction = 65% wishes + 15% colour + 10% silhouette + 10% craft, −15 per missed must-have, plus small bonuses for charm, season and Mie\'s mood. 75%+ pays the full budget; 85%+ adds a tip.'],
      ['🧺 Market and seasons', 'Fabric is sold per metre and prices move every morning. In-season fabric costs 12% more but gives +3 satisfaction; off-season fabric is 15% cheaper but gives −4. Seasons change every 7 days.'],
      ['✂️ Workshop and sewing', 'Pick fabrics, colours, shape, details and extras. The bars show the dress and the black marks the wishes. Sewing is cut → stitch → iron (or only stitch in Quick mode). Better craft means higher quality.'],
      ['👗 Ready-to-wear rack', 'Sew without an order to use leftover fabric. Rack dresses sell to walk-ins in the evening; charm and a bigger shop window help. You can mark them down.'],
      ['🏺 Pottery', 'Buy the studio under Upgrades → Expansion. Knead (fewer cracks), throw on the wheel (holding keeps the pressure in the green), optionally paint, and the kiln fires overnight. Pots sell from the shelf and add charm.'],
      ['🏡 Home and family', 'The family starts in a small flat in Nørrebro and can move up in five steps to a Strandvejsvilla in Klampenborg; each home raises the lowest family happiness can fall to. Family happiness drops every night. Above 75 Mie works better, below 30 worse. Play with Elizabeth and pet Dexter daily, buy toys, go on outings (some only in summer or winter) and keep Dexter fed.'],
      ['🧮 SKAT and the accountant', 'Each evening SKAT takes 40% of the day\'s profit above 2.000 kr. An accountant (Upgrades → Equipment) raises the tax-free amount and lowers the rate to 32% and then 25%.'],
      ['⭐ Upgrades', 'Equipment improves work, expansions add pottery and an upstairs floor, decor adds charm, staff help every day for a wage, and marketing brings more or richer customers tomorrow.'],
      ['🏆 Goals', '18 milestones with cash rewards. Collect them on the Goals screen.'],
      ['💾 Saving', 'The game saves automatically on this device. Menu → Save can make a save code to move your game to another device. Each player has their own shop.'],
    ];
    return `<button class="btn wide" data-act="howto">📖 Show the introduction</button>
      <button class="btn wide" data-act="replaytips">💡 Replay the tips</button>
      <div class="help">${topics.map(([h, t], i) => `<details ${i ? '' : 'open'}><summary>${h}</summary><p>${t}</p></details>`).join('')}</div>`;
  }

  // ---------------- render ----------------
  const VIEWS = { shop: viewShop, market: viewMarket, workshop: viewWorkshop, studio: viewStudio, home: viewHome, upgrades: viewUpgrades, goals: viewGoals };
  function render() {
    const app = document.getElementById('app');
    if (UI.mgCleanup) { UI.mgCleanup(); UI.mgCleanup = null; }
    if (!G) { app.innerHTML = welcomeScreen(); return; }
    app.innerHTML = topbar() + `<main class="view view-${UI.view}">${VIEWS[UI.view]()}</main>` + overlay();
    // re-rendering the same overlay (e.g. changing a setting) should not replay its entry animation
    const ovType = G.gameOver ? 'gameover' : UI.overlay && UI.overlay.type;
    if (ovType && ovType === UI.lastOverlay) app.querySelectorAll('.overlay, .sheet').forEach(el => el.classList.add('still'));
    UI.lastOverlay = ovType;
    const tip = currentTip();
    document.body.classList.toggle('has-coach', !!tip);
    if (tip) {
      app.insertAdjacentHTML('beforeend', coachHtml(tip));
      const el = app.querySelector(tip.target);
      if (el) el.classList.add('coach-target');
    }
    document.body.classList.toggle('modal-open', !!(UI.overlay || G.gameOver));
    if (UI.overlay && UI.overlay.type === 'sew' && UI.sew.phase === 'stitch') startSewLoop();
    if (UI.overlay && UI.overlay.type === 'throw') startThrowLoop();
    mountMiniGame();
  }

  function mountMiniGame() {
    const host = document.getElementById('mg');
    const o = UI.overlay;
    if (!host || !o) return;
    if (o.type === 'sew') {
      const ph = UI.sew.phase;
      UI.mgCleanup = DG.MiniGames[ph](host, { color: DG.colorHex(G.design.mainColor) }, r => sewPhaseDone(ph, r));
    } else if (o.type === 'wedge') {
      UI.mgCleanup = DG.MiniGames.wedge(host, { color: byId(DG.CLAYS, G.pot.clay).hex }, r => { UI.potRun.wedge = r; startWheel(); });
    } else if (o.type === 'paint') {
      UI.mgCleanup = DG.MiniGames.paint(host, { pot: G.pot }, strokes => completePot(UI.potRun.score, strokes));
    }
  }

  function welcomeScreen() {
    return `<div class="welcome"><div class="panel center">
      ${DG.renderAvatar(DG.MIE_LOOK, 'ecstatic', 120)}
      <h1><span class="brand-script">Mie's</span> Atelier</h1>
      <p>Welcome! You play as Mie, a dressmaker with her own little shop in Copenhagen. Keep the name or type your own. Each player gets their own shop, saved on this device.</p>
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
    sfx(sc >= 1 ? 'perfect' : sc >= 0.8 ? 'stitch' : sc >= 0.45 ? 'stitch' : 'bad');
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
    DG.recordDress(G, cust, ev.S);
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
    if (!['endday', 'newgame', 'fire', 'deleteplayer'].includes(name)) UI.confirm = null;
    if (!['stitch', 'press', 'pet'].includes(name)) sfx('click');
    switch (name) {
      case 'view': UI.view = arg; window.scrollTo(0, 0); break;
      case 'tab': UI.tab = arg; break;
      case 'howto': UI.overlay = { type: 'intro' }; break;
      case 'menu': UI.overlay = { type: 'menu' }; UI.exportCode = ''; break;
      case 'closeov': UI.overlay = null; break;
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
        G.rep = clamp(G.rep - 1, 0, 100);
        UI.overlay = null;
        toast(`${c.name} leaves a little disappointed.`);
        break;
      }
      case 'buyf': case 'buyi': {
        const [id, q] = arg.split(':');
        const it = name === 'buyf' ? byId(DG.FABRICS, id) : byId(DG.ITEMS, id);
        if (buy(name === 'buyf' ? 'fabric' : 'item', id, +q)) toast(`Bought ${q}${name === 'buyf' ? ' m' : '×'} ${it.name}.`);
        break;
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
      case 'switchplayer': {
        save();
        DG.Profiles.switchTo(arg);
        G = load();
        if (!G) { G = DG.newGame(); DG.startDay(G); }
        UI.view = 'shop'; UI.overlay = null; UI.exportCode = '';
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
          if (!a.free) G.today.spent += a.cost;
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
        } else {
          sfx('meow');
          toast(G.home.catFood <= 0 ? 'Dexter would rather have dinner. Mjav!' : 'Dexter has had enough cuddles for today. He is a cat, after all.');
          return;
        }
        break;
      }
      case 'buyhome': {
        const it = byId(DG.HOME_ITEMS, arg);
        if (DG.buyHomeItem(G, arg)) { G.today.spent += it.cost; sfx('coin'); toast(`${it.icon} ${it.name} for ${it.who === 'dexter' ? 'Dexter' : 'Elizabeth'}!`); }
        break;
      }
      case 'movehouse': {
        const nx = DG.moveHouse(G);
        if (nx) { G.today.spent += nx.cost; sfx('fanfare'); toast(`🏡 The family moved to: ${nx.name}!`); window.scrollTo(0, 0); }
        break;
      }
      case 'catfood': if (DG.buyCatFood(G)) { G.today.spent += DG.CAT_FOOD.cost; sfx('meow'); toast('Dexter approves. 🐟'); } break;
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
        if (it) { it.price = Math.max(20, Math.round(it.price * 0.8 / 5) * 5); toast(`Marked down to ${kr(it.price)}.`); }
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
        if (it) { it.price = Math.max(50, Math.round(it.price * 0.8 / 10) * 10); toast(`Marked down to ${kr(it.price)}.`); }
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
      case 'resultdone': UI.overlay = null; UI.view = 'shop'; window.scrollTo(0, 0); break;
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
        UI.overlay = G.gameOver ? null : { type: 'dayend', res };
        break;
      }
      case 'nextday': {
        DG.startDay(G); UI.overlay = null; UI.view = 'shop'; window.scrollTo(0, 0);
        if (G.newSeason && G.day > 1) setTimeout(() => toast(`${DG.season(G).icon} ${DG.season(G).name} has arrived!`), 300);
        break;
      }
      case 'newgame': {
        if (!G.gameOver && UI.confirm !== 'newgame') { UI.confirm = 'newgame'; break; }
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
  G = DG.Profiles.active() ? load() : null;
  if (DG.Profiles.active() && !G) {
    G = DG.newGame();
    DG.startDay(G);
    UI.overlay = { type: 'intro' };
    save();
  } else if (G && G.active && !G.design) {
    G.design = DG.newDesign(G);
  } else if (G && G.active && G.design.sewn) {
    // the page was closed mid-sewing: materials are already cut, so resume
    UI.view = 'workshop';
    beginSewGame();
  }
  render();
  window.__mie = { get state() { return G; }, act };
})();
