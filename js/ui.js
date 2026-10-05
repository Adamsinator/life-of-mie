// UI controller: renders views/overlays, handles input, runs the sewing mini-game.
(function () {
  const DG = window.DG;
  const { byId, clamp, round1, pick } = DG;
  const KEY = 'mies-atelier-save-v1';
  let G = null;
  const UI = { view: 'shop', tab: 'fabric', upTab: 'equipment', overlay: null, sew: null, raf: 0, confirm: null };

  const kr = n => `${Math.round(n).toLocaleString('da-DK')} kr`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // stat effects as actually applied (scaled by the balance knob)
  const fx = d => Object.entries(d).map(([k, raw]) => {
    const v = round1(raw * DG.BAL.delta);
    return `<span class="fx ${v > 0 ? 'up' : 'down'}">${DG.ATTR_META[k].icon}${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`;
  }).join('');

  function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* storage unavailable */ } }
  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) { const x = JSON.parse(s); if (x && x.version === 1) return DG.ensureDefaults(x); }
    } catch (e) { /* ignore */ }
    return null;
  }

  function toast(msg) {
    document.querySelectorAll('.toast').forEach(x => x.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
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
    const navs = [['shop', '🏪', 'Shop'], ['market', '🧺', 'Market'], ['workshop', '✂️', 'Workshop'], ['studio', '🏺', 'Pottery'], ['upgrades', '⭐', 'Upgrades'], ['goals', '🏆', 'Goals']];
    const se = DG.season(G);
    const claimable = DG.claimableGoals(G).length;
    return `<header class="topbar">
      <div class="brand"><span class="brand-script">Mie's</span><span class="brand-word">Atelier</span></div>
      <div class="hud">
        <div class="hud-item"><span class="lbl">Day</span><b>${G.day}</b></div>
        <div class="hud-item" title="${DG.daysLeftInSeason(G)} days left of ${se.name.toLowerCase()}"><span class="lbl">Season</span><b>${se.icon} ${se.name}</b></div>
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
          <div><dt>Reputation</dt><dd>${Math.round(G.rep)}</dd></div>
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
    return `<div class="sec-head"><h2>Decorate the shop</h2><span class="muted">Charm ✨ ${charm}: +${(charm * 0.25).toFixed(2)} satisfaction and +${charm}% customer budgets. Decor never costs rent.</span></div>
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

  function ovSew() {
    return `<div class="overlay"><div class="sheet sew">
      <h2>${G.active.rack ? 'Sewing a dress for the rack' : `Sewing ${esc(G.active.name)}'s dress`}</h2>
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
        ${o.res.missed ? `<tr><td>Customers who left unserved</td><td class="num ${o.res.assistant ? '' : 'bad'}">${o.res.missed} ${o.res.assistant ? '(Lise gave them vouchers)' : `(−${o.res.missed * 0.5} rep)`}</td></tr>` : ''}
        <tr class="tot"><td>Bank balance</td><td class="num">${kr(G.money)}</td></tr>
      </tbody></table>
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
    return `<div class="overlay dismissable"><div class="sheet menu">
      <h2>Menu</h2>
      <p class="muted small">Your progress is saved automatically on this device.</p>
      <button class="btn wide" data-act="howto">How to play</button>
      <button class="btn ghost wide" data-act="newgame">${UI.confirm === 'newgame' ? 'Tap again to erase this shop and start over' : 'Start a new game'}</button>
      <button class="btn primary wide" data-act="closeov">Close</button>
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
      if (key === 'deco') sub = `value ×${x.mult}${x.item ? ` · own ${G.inv.items[x.item] || 0} gold leaf` : ''}`;
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
    return `<div class="overlay"><div class="sheet sew">
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
      <p>Centring ${Math.round(o.score * 100)}% · price tag ${kr(it.price)} · crack risk ${Math.round(it.crack * 100)}%</p>
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

  function startThrowing() {
    const an = DG.analyzePot(G.pot, G);
    if (an.issues.length) return;
    const shape = byId(DG.POT_SHAPES, G.pot.shape);
    const lvl = DG.upgradeLevel(G, 'pottery');
    UI.throwSt = { t: 0, dur: 6, p: 0.2, holding: false, good: 0, last: 0, phase: Math.random() * 6, diff: shape.diff,
      center: 0.5, w: clamp(0.3 - 0.07 * (shape.diff - 1) + (lvl >= 2 ? 0.04 : 0) + (G.staff.apprentice ? 0.02 : 0), 0.14, 0.36), done: false };
    UI.overlay = { type: 'throw' };
    render();
  }

  function finishThrow(score) {
    score = clamp(score, 0, 1);
    const item = DG.throwPot(G, G.pot, score);
    DG.updateGoals(G);
    UI.overlay = { type: 'thrown', item, score };
    save();
    render();
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

  // ---------------- render ----------------
  const VIEWS = { shop: viewShop, market: viewMarket, workshop: viewWorkshop, studio: viewStudio, upgrades: viewUpgrades, goals: viewGoals };
  function render() {
    const app = document.getElementById('app');
    app.innerHTML = topbar() + `<main class="view view-${UI.view}">${VIEWS[UI.view]()}</main>` + overlay();
    document.body.classList.toggle('modal-open', !!(UI.overlay || G.gameOver));
    if (UI.overlay && UI.overlay.type === 'sew') startSewLoop();
    if (UI.overlay && UI.overlay.type === 'throw') startThrowLoop();
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
      if (!s.lock) s.phase += dt * (2.1 + 0.45 * s.i) * (1 - 0.12 * machine);
      s.pos = 0.5 + 0.47 * Math.sin(s.phase);
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
    const dots = document.querySelectorAll('#sdots i');
    if (dots[s.i]) dots[s.i].className = sc >= 1 ? 'p' : sc >= 0.8 ? 'g' : sc >= 0.45 ? 'w' : 'x';
    const fb = document.getElementById('sfb');
    if (fb) fb.textContent = msg;
    s.i++;
    if (s.i >= 5) {
      s.lock = true;
      const craft = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
      setTimeout(() => finishSewing(craft), 750);
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
    UI.sew = { i: 0, scores: [], center: 0.2 + Math.random() * 0.6, zw: 0.16 + 0.05 * machine + (G.staff.apprentice ? 0.04 : 0), phase: 0, pos: 0.5, last: 0, lock: false };
    UI.overlay = { type: 'sew' };
    save();
    render();
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
    if (name !== 'endday' && name !== 'newgame' && name !== 'fire') UI.confirm = null;
    switch (name) {
      case 'view': UI.view = arg; window.scrollTo(0, 0); break;
      case 'tab': UI.tab = arg; break;
      case 'menu': UI.overlay = { type: 'menu' }; break;
      case 'howto': UI.overlay = { type: 'intro' }; break;
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
  document.addEventListener('keydown', e => {
    if (UI.overlay && UI.overlay.type === 'sew' && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); stitch(); }
    else if (UI.overlay && UI.overlay.type === 'throw' && e.code === 'Space') { e.preventDefault(); if (UI.throwSt) UI.throwSt.holding = true; }
    else if (e.key === 'Escape' && UI.overlay && ['req', 'menu'].includes(UI.overlay.type)) act('closeov');
  });

  // ---------------- boot ----------------
  G = load();
  if (!G) {
    G = DG.newGame();
    DG.startDay(G);
    UI.overlay = { type: 'intro' };
    save();
  } else if (G.active && !G.design) {
    G.design = DG.newDesign(G);
  } else if (G.active && G.design.sewn) {
    // the page was closed mid-sewing: materials are already cut, so resume the stitching
    UI.view = 'workshop';
    beginSewGame();
  }
  render();
  window.__mie = { get state() { return G; }, act };
})();
