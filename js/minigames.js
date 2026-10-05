// Touch mini-games. Each takes a host element, options and a done(result) callback,
// draws itself inside the host and returns a cleanup function.
(function (g) {
  const DG = (g.DG = g.DG || {});
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sfx = n => DG.Audio && DG.Audio.play(n);
  const now = () => (g.performance ? g.performance.now() : Date.now());

  // pointer position in SVG user units
  function svgPoint(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  // every pointer sample since the last event (iPad reports 120 per second, events arrive at 60)
  const samples = e => (e.getCoalescedEvents && e.getCoalescedEvents().length ? e.getCoalescedEvents() : [e]);
  // distance from point p to segment ab
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
    const t = L ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L, 0, 1) : 0;
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  // keep following a finger that slides off the board
  const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
  function timerLoop(dur, onTick, onEnd) {
    const t0 = now();
    let raf = 0, stopped = false;
    const f = () => {
      if (stopped) return;
      const t = (now() - t0) / 1000;
      onTick(t, t / dur);
      if (t >= dur) { stopped = true; onEnd(); return; }
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }
  const head = (title, hint) => `<h2>${title}</h2><p class="muted">${hint}</p>`;

  // ---------------- cutting: trace the dashed pattern line ----------------
  // Real pattern pieces, in a 300×210 board: a skirt panel shaped by the silhouette, a bodice front or a
  // sleeve. Each is a list of segments: [x, y] straight, or [cx, cy, x, y] a curve to (x, y).
  const PIECES = {
    aline: [[110, 28], [190, 28], [252, 176], [150, 194, 48, 176], [110, 28]],
    empire: [[118, 26], [182, 26], [262, 178], [150, 198, 38, 178], [118, 26]],
    wrap: [[96, 26], [176, 26], [256, 168], [160, 196, 40, 182], [70, 120, 96, 26]],
    shirt: [[104, 24], [196, 24], [214, 180], [150, 188, 86, 180], [104, 24]],
    pinafore: [[106, 26], [194, 26], [236, 180], [150, 192, 64, 180], [106, 26]],
    sheath: [[112, 24], [188, 24], [208, 70, 200, 110], [194, 184], [150, 190, 106, 184], [100, 110], [92, 70, 112, 24]],
    mermaid: [[116, 22], [184, 22], [204, 70, 190, 120], [252, 184], [150, 200, 48, 184], [110, 120], [96, 70, 116, 22]],
    ballgown: [[126, 22], [174, 22], [272, 150], [282, 184], [150, 210, 18, 184], [28, 150], [126, 22]],
    bodice: [[100, 30], [124, 26], [150, 52, 176, 26], [200, 30], [220, 70], [206, 110], [212, 178], [150, 186, 88, 178], [94, 110], [80, 70], [100, 30]],
    sleeve: [[70, 120], [110, 40, 150, 34], [190, 40, 230, 120], [216, 180], [150, 190, 84, 180], [70, 120]],
  };
  function samplePiece(design) {
    const sil = design && design.silhouette;
    // most cuts are the skirt panel; now and then the bodice, or a sleeve if the dress has them
    const r = Math.random();
    const key = r < 0.6 || !design ? sil : r < 0.85 || !design.sleeves || design.sleeves === 'none' ? 'bodice' : 'sleeve';
    const segs = PIECES[key] || PIECES.aline;
    const pts = [];
    let [x, y] = segs[0];
    const push = (nx, ny) => { const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / 6)); for (let i = 0; i < n; i++) pts.push([x + (nx - x) * i / n, y + (ny - y) * i / n]); x = nx; y = ny; };
    for (const sg of segs.slice(1)) {
      if (sg.length === 2) push(sg[0], sg[1]);
      else {
        const [cx, cy, ex, ey] = sg, x0 = x, y0 = y, n = 24;
        for (let i = 1; i <= n; i++) { const t = i / n; const nx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * ex, ny = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * ey; pts.push([x, y]); x = nx; y = ny; }
      }
    }
    pts.push([x, y]);
    // dense curves: thin out to roughly even 6-unit steps so tracing feels the same everywhere
    const even = [pts[0]];
    for (const q of pts) { const l = even[even.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= 5.5) even.push(q); }
    even.push(pts[pts.length - 1]);
    return { pts: even, key };
  }
  DG.MiniGames = {};
  DG.MiniGames.cut = function (host, opts, done) {
    const piece = samplePiece(opts.design), P = piece.pts;
    const color = opts.color || '#e8d7be';
    const what = { bodice: 'the bodice', sleeve: 'a sleeve' }[piece.key] || 'the skirt panel';
    host.innerHTML = `${head(`Cut ${what} ✂️`, 'Trace the dashed line with your finger, all the way round. Start at the gold dot.')}
      <div class="mg-board"><svg class="mg-svg" viewBox="0 0 300 210">
        <rect x="6" y="6" width="288" height="198" rx="8" fill="${color}"/><rect x="6" y="6" width="288" height="198" rx="8" fill="url(#mgweave)" opacity=".25"/>
        <defs><pattern id="mgweave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6M3 0V6" stroke="#000" stroke-width=".5"/></pattern></defs>
        <polyline points="${P.map(p => p.join(',')).join(' ')}" fill="none" stroke="#2f1d2b" stroke-width="2" stroke-dasharray="6 5" opacity=".7"/>
        <polyline id="mgtrail" points="" fill="none" stroke="#c44d6c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${P[0][0]}" cy="${P[0][1]}" r="7" fill="#e3b53b" class="mg-pulse"/>
        <g id="mgsc" transform="translate(-50 -50)"><text font-size="22" text-anchor="middle" dominant-baseline="middle">✂️</text></g>
      </svg></div>
      <div class="tprog"><i id="mgt"></i></div><div class="sfb" id="mgfb">Ready, steady, snip!</div>`;
    const svg = host.querySelector('svg'), trail = host.querySelector('#mgtrail'), sc = host.querySelector('#mgsc');
    let k = 0, shownK = 0, errSum = 0, errN = 0, down = false, finished = false, ang = 0, last = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      stop();
      if (k >= P.length - 1) host.querySelector('.mg-board').classList.add('cut-done');
      const progress = k / (P.length - 1);
      const acc = errN ? clamp(1 - errSum / errN / 16, 0, 1) : 0;
      const score = clamp(progress * (0.4 + 0.6 * acc), 0, 1);
      host.querySelector('#mgfb').textContent = score > 0.8 ? 'Clean cut! ✨' : score > 0.5 ? 'Not bad at all.' : 'A bit jagged...';
      setTimeout(() => done(score), 600);
    };
    const step = p => {
      let best = k, bestD = Infinity;
      for (let i = k; i < Math.min(P.length, k + 9); i++) {
        const d = Math.hypot(p.x - P[i][0], p.y - P[i][1]);
        if (d < bestD) { bestD = d; best = i; }
      }
      errSum += Math.min(bestD, 30); errN++;
      if (bestD < 15 && best > k) {
        if (Math.floor(best / 6) > Math.floor(k / 6)) sfx('snip');
        k = best;
        if (k >= P.length - 1) finish();
      }
    };
    const move = e => {
      let p = null;
      for (const ev of samples(e)) {
        p = svgPoint(svg, ev);
        if (down && !finished) step(p);
      }
      if (!p) return;
      // the scissors turn to follow the line
      if (last && Math.hypot(p.x - last.x, p.y - last.y) > 2) {
        const a = Math.atan2(p.y - last.y, p.x - last.x) * 180 / Math.PI;
        ang += ((a - ang + 540) % 360 - 180) * 0.35;
        last = p;
      } else if (!last) last = p;
      sc.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(0)})`);
      if (k !== shownK) { shownK = k; trail.setAttribute('points', P.slice(0, k + 1).map(q => q.join(',')).join(' ')); }
    };
    const pd = e => { e.preventDefault(); capture(svg, e); down = true; last = null; move(e); };
    const pu = () => { down = false; };
    svg.addEventListener('pointerdown', pd);
    svg.addEventListener('pointermove', move);
    g.addEventListener('pointerup', pu);
    g.addEventListener('pointercancel', pu);
    const stop = timerLoop(opts.time || 20, (t, f) => { const b = host.querySelector('#mgt'); if (b) b.style.width = `${f * 100}%`; }, finish);
    return () => { stop(); g.removeEventListener('pointerup', pu); g.removeEventListener('pointercancel', pu); };
  };

  // ---------------- ironing: swipe away the wrinkles ----------------
  DG.MiniGames.iron = function (host, opts, done) {
    const color = opts.color || '#e8d7be';
    const W = [];
    for (let i = 0; i < 11; i++) W.push({ x: 30 + Math.random() * 240, y: 30 + Math.random() * 150, r: Math.random() * 180, ok: false });
    host.innerHTML = `${head('Iron the dress ♨️', 'Hold and swipe the iron over every wrinkle before time runs out.')}
      <div class="mg-board"><svg class="mg-svg" viewBox="0 0 300 210">
        <rect x="6" y="6" width="288" height="198" rx="8" fill="${color}"/>
        ${W.map((w, i) => `<path id="wr${i}" class="wrinkle" d="M-14 0 q3.5 -5 7 0 t7 0 t7 0 t7 0" transform="translate(${w.x.toFixed(0)} ${w.y.toFixed(0)}) rotate(${w.r.toFixed(0)})" stroke="${DG.darken ? DG.darken(color, 0.35) : '#555'}" stroke-width="2" fill="none"/>`).join('')}
        <polyline id="sheen" points="" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
        <g id="puffs"></g>
        <g id="mgiron" transform="translate(-60 -60)"><path d="M-16 8 L16 8 L12 -6 Q0 -12 -12 -4 Z" fill="#c44d6c" stroke="#7a2a3e"/><path d="M-6 -6 q6 -10 14 -2" stroke="#2f1d2b" stroke-width="3" fill="none"/><g id="steam" opacity="0"><circle cx="-8" cy="14" r="3" fill="#fff"/><circle cx="2" cy="16" r="4" fill="#fff"/><circle cx="10" cy="13" r="3" fill="#fff"/></g></g>
      </svg></div>
      <div class="tprog"><i id="mgt"></i></div><div class="sfb" id="mgfb">${W.length} wrinkles to go</div>`;
    const svg = host.querySelector('svg'), iron = host.querySelector('#mgiron'), steam = host.querySelector('#steam');
    const sheen = host.querySelector('#sheen'), puffs = host.querySelector('#puffs');
    let down = false, finished = false, prev = null, tilt = 0;
    const trail = [];
    const left = () => W.filter(w => !w.ok).length;
    const finish = () => {
      if (finished) return;
      finished = true; stop();
      const score = 1 - left() / W.length;
      host.querySelector('#mgfb').textContent = score >= 1 ? 'Crisp as a fresh baguette! ✨' : score > 0.6 ? 'Nicely pressed.' : 'Still a little crumpled...';
      setTimeout(() => done(score), 600);
    };
    const puff = (x, y) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      el.setAttribute('class', 'puff');
      el.setAttribute('transform', `translate(${x.toFixed(0)} ${y.toFixed(0)})`);
      el.innerHTML = '<circle r="6" cx="-6" fill="#fff"/><circle r="8" cy="-4" fill="#fff"/><circle r="5" cx="8" fill="#fff"/>';
      puffs.appendChild(el);
      setTimeout(() => el.remove(), 800);
    };
    const press = p => {
      // sweep the whole stretch since the last sample, so a quick swipe can't jump over a wrinkle
      const a = prev || p;
      W.forEach((w, i) => {
        if (!w.ok && segDist(w, a, p) < 22) {
          w.ok = true; sfx('steam'); puff(w.x, w.y);
          host.querySelector('#wr' + i).classList.add('gone');
          host.querySelector('#mgfb').textContent = left() ? `${left()} wrinkles to go` : 'All smooth!';
          if (!left()) finish();
        }
      });
      trail.push(p.x.toFixed(0) + ',' + p.y.toFixed(0));
      if (trail.length > 24) trail.shift();
    };
    const move = e => {
      let p = null;
      for (const ev of samples(e)) {
        p = svgPoint(svg, ev);
        if (down && !finished) press(p);
        if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > 1.5) tilt += (clamp((p.x - prev.x) * 2, -18, 18) - tilt) * 0.3;
        prev = p;
      }
      if (!p) return;
      iron.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
      steam.setAttribute('opacity', down ? '0.8' : '0');
      sheen.setAttribute('points', down ? trail.join(' ') : '');
    };
    const pd = e => { e.preventDefault(); capture(svg, e); down = true; prev = null; trail.length = 0; move(e); };
    const pu = () => { down = false; prev = null; steam.setAttribute('opacity', '0'); sheen.setAttribute('points', ''); };
    svg.addEventListener('pointerdown', pd);
    svg.addEventListener('pointermove', move);
    g.addEventListener('pointerup', pu);
    g.addEventListener('pointercancel', pu);
    const stop = timerLoop(opts.time || 12, (t, f) => { const b = host.querySelector('#mgt'); if (b) b.style.width = `${f * 100}%`; }, finish);
    return () => { stop(); g.removeEventListener('pointerup', pu); g.removeEventListener('pointercancel', pu); };
  };

  // ---------------- wedging clay: tap fast to knead out air bubbles ----------------
  DG.MiniGames.wedge = function (host, opts, done) {
    const target = opts.target || 18;
    const hex = opts.color || '#b9a68e';
    host.innerHTML = `${head('Knead the clay 👐', `Tap as fast as you can to push the air bubbles out. ${target} kneads is perfect.`)}
      <div class="mg-board clay-board"><svg class="mg-svg" viewBox="0 0 300 160"><g id="clayball" transform="translate(150 95)">
        <ellipse cx="0" cy="0" rx="58" ry="42" fill="${hex}" stroke="${DG.darken ? DG.darken(hex, 0.3) : '#555'}" stroke-width="2"/>
        <g id="bubbles">${Array.from({ length: 8 }, (_, i) => `<circle cx="${(Math.cos(i) * 34).toFixed(0)}" cy="${(Math.sin(i * 1.7) * 20).toFixed(0)}" r="4" fill="#fff" opacity=".55"/>`).join('')}</g></g></svg></div>
      <div class="tprog"><i id="mgt"></i></div><div class="sfb" id="mgfb">0 / ${target}</div>
      <button class="btn primary huge" id="kneadbtn">Knead! 👐</button>`;
    const ball = host.querySelector('#clayball'), bubbles = host.querySelectorAll('#bubbles circle');
    let taps = 0, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true; stop();
      const score = clamp(taps / target, 0, 1);
      host.querySelector('#mgfb').textContent = score >= 1 ? 'Perfectly wedged! ✨' : score > 0.6 ? 'Good enough.' : 'There may be a bubble or two...';
      setTimeout(() => done(score), 600);
    };
    const btn = host.querySelector('#kneadbtn');
    const tap = e => {
      e.preventDefault();
      if (finished) return;
      taps++; sfx('squish');
      const s = taps % 2 ? 'scale(1.18 .82)' : 'scale(.9 1.1)';
      ball.setAttribute('transform', `translate(150 95) ${s}`);
      setTimeout(() => ball.setAttribute('transform', 'translate(150 95)'), 90);
      bubbles.forEach((b, i) => { if (i < Math.floor(taps / target * bubbles.length)) b.setAttribute('opacity', '0'); });
      host.querySelector('#mgfb').textContent = `${taps} / ${target}`;
      if (taps >= target) finish();
    };
    btn.addEventListener('pointerdown', tap);
    const stop = timerLoop(opts.time || 7, (t, f) => { const b = host.querySelector('#mgt'); if (b) b.style.width = `${f * 100}%`; }, finish);
    return () => stop();
  };

  // ---------------- brush: a smoothed stroke whose width follows pressure or speed ----------------
  const f1 = x => (Math.round(x * 10) / 10).toString();
  // Turns raw pointer samples into a brush stroke: light smoothing, width from Pencil pressure
  // (or, for a finger, from speed: quick flicks are thinner), and a soft tapered start.
  DG.Brush = function (width) {
    const R = width / 2, pts = [];
    let sx = 0, sy = 0, sr = R, len = 0, lastT = 0;
    return {
      pts,
      add(x, y, t, pressure, isPen) {
        if (!pts.length) { sx = x; sy = y; lastT = t; }
        else {
          sx += (x - sx) * 0.6; sy += (y - sy) * 0.6;   // streamline
          const lp = pts[pts.length - 1], d = Math.hypot(sx - lp.x, sy - lp.y);
          if (d < 0.9) return false;
          len += d;
        }
        let target;
        if (isPen && pressure > 0) target = R * (0.35 + 0.95 * pressure);
        else { const v = pts.length ? Math.hypot(x - pts[pts.length - 1].x, y - pts[pts.length - 1].y) / Math.max(4, t - lastT) : 0; target = R * clamp(1.15 - v * 0.9, 0.6, 1.15); }
        lastT = t;
        sr += (target - sr) * 0.35;
        const taper = Math.min(1, 0.45 + len / 8);
        pts.push({ x: sx, y: sy, r: Math.max(0.4, sr * taper) });
        return true;
      },
      end(x, y) {
        if (!pts.length) return;
        const lp = pts[pts.length - 1];
        if (Math.hypot(x - lp.x, y - lp.y) > 0.6) pts.push({ x, y, r: lp.r * 0.85 });
        // a tap leaves a round dot of the full brush size
        if (pts.every(q => Math.hypot(q.x - pts[0].x, q.y - pts[0].y) < 0.5)) pts[0].r = Math.max(pts[0].r, R * 0.9);
      },
      path() { return DG.brushOutline(pts); },
      // compact form kept in the save: "x y r,x y r,..."
      packed() { return pts.map(q => `${f1(q.x)} ${f1(q.y)} ${f1(q.r)}`).join(','); },
    };
  };

  // ---------------- painting a pot: free drawing clipped to the pot ----------------
  DG.MiniGames.paint = function (host, opts, done) {
    const pot = Object.assign({}, opts.pot, { paint: [] });
    const strokes = [];
    let color = DG.PAINT_COLORS[0], width = 2.5, cur = null, raf = 0, penSeen = false;
    const draw = () => {
      host.querySelector('#paintpot').innerHTML = DG.renderPot(Object.assign({}, pot, { paint: strokes }), 'paint', { noPlant: true });
    };
    host.innerHTML = `${head('Paint your pot 🎨', 'Draw on the pot with your finger or Apple Pencil. More colours and more paint make it worth more.')}
      <div class="paint-wrap"><div id="paintpot" class="paint-pot"></div>
      <div class="paint-tools">
        <div class="colors">${DG.PAINT_COLORS.map((c, i) => `<button class="color ${i ? '' : 'on'}" style="--c:${c}" data-pc="${c}" aria-label="Colour ${i + 1}"><span></span></button>`).join('')}</div>
        <div class="chips paint-chips"><button class="chip" data-pw="1.5"><span class="chip-txt"><b>Fine</b></span></button><button class="chip on" data-pw="2.5"><span class="chip-txt"><b>Medium</b></span></button><button class="chip" data-pw="4.5"><span class="chip-txt"><b>Thick</b></span></button></div>
        <div class="actions"><button class="btn" id="pundo">↶ Undo</button><button class="btn ghost" id="pclear">Clear</button><button class="btn primary big" id="pdone">Done painting ✓</button></div>
        <div class="sfb small" id="pval"></div>
      </div></div>`;
    const showVal = () => { host.querySelector('#pval').textContent = strokes.length ? `Painting value ×${DG.paintMult({ paint: strokes })}` : 'Plain pot: value ×1'; };
    draw(); showVal();
    const wrap = host.querySelector('#paintpot');
    const flush = () => { raf = 0; if (cur && cur.el) cur.el.setAttribute('d', cur.brush.path()); };
    const onDown = e => {
      const svg = wrap.querySelector('svg'); if (!svg || cur) return;
      // with a Pencil in use, a resting palm or finger does not paint
      if (e.pointerType === 'pen') penSeen = true; else if (penSeen && e.pointerType === 'touch') return;
      e.preventDefault();
      capture(wrap, e);
      const p = svgPoint(svg, e);
      const brush = DG.Brush(width);
      brush.add(p.x, p.y, e.timeStamp, e.pressure, e.pointerType === 'pen');
      // paint inside the pot's clipped layer, under its shading, exactly where finished strokes go
      const layer = svg.querySelector('g[clip-path]');
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('fill', color);
      layer.insertBefore(el, layer.lastElementChild);
      cur = { id: e.pointerId, c: color, w: width, brush, el, svg };
      flush();
    };
    const onMove = e => {
      if (!cur || e.pointerId !== cur.id) return;
      for (const ev of samples(e)) { const p = svgPoint(cur.svg, ev); cur.brush.add(p.x, p.y, ev.timeStamp, ev.pressure, e.pointerType === 'pen'); }
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onUp = e => {
      if (!cur || (e && e.pointerId !== cur.id)) return;
      if (e && e.clientX != null) { const p = svgPoint(cur.svg, e); cur.brush.end(p.x, p.y); }
      cancelAnimationFrame(raf); flush();
      if (strokes.length < 80) { strokes.push({ c: cur.c, w: cur.w, n: cur.brush.pts.length, p: cur.brush.packed(), f: 1 }); sfx('click'); }
      else cur.el.remove();
      cur = null; showVal();
    };
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    g.addEventListener('pointerup', onUp);
    g.addEventListener('pointercancel', onUp);
    host.querySelectorAll('[data-pc]').forEach(b => b.addEventListener('click', () => { color = b.dataset.pc; host.querySelectorAll('[data-pc]').forEach(x => x.classList.toggle('on', x === b)); }));
    host.querySelectorAll('[data-pw]').forEach(b => b.addEventListener('click', () => { width = +b.dataset.pw; host.querySelectorAll('[data-pw]').forEach(x => x.classList.toggle('on', x === b)); }));
    host.querySelector('#pundo').addEventListener('click', () => { strokes.pop(); draw(); showVal(); });
    host.querySelector('#pclear').addEventListener('click', () => { strokes.length = 0; draw(); showVal(); });
    host.querySelector('#pdone').addEventListener('click', () => done(strokes.slice()));
    return () => { cancelAnimationFrame(raf); g.removeEventListener('pointerup', onUp); g.removeEventListener('pointercancel', onUp); };
  };
})(typeof window !== 'undefined' ? window : globalThis);
