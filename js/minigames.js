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
  function samplePiece() {
    const pts = [];
    const seg = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6); for (let i = 0; i < n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); };
    const A = [110, 30], B = [190, 30], C = [240, 172], D = [60, 172];
    seg(A, B); seg(B, C);
    for (let i = 0; i < 30; i++) { const t = i / 30; pts.push([(1 - t) * (1 - t) * C[0] + 2 * (1 - t) * t * 150 + t * t * D[0], (1 - t) * (1 - t) * C[1] + 2 * (1 - t) * t * 196 + t * t * D[1]]); }
    seg(D, A); pts.push(A.slice());
    return pts;
  }
  DG.MiniGames = {};
  DG.MiniGames.cut = function (host, opts, done) {
    const P = samplePiece();
    const color = opts.color || '#e8d7be';
    host.innerHTML = `${head('Cut the pattern ✂️', 'Trace the dashed line with your finger, all the way round. Start at the gold dot.')}
      <div class="mg-board"><svg class="mg-svg" viewBox="0 0 300 210">
        <rect x="6" y="6" width="288" height="198" rx="8" fill="${color}"/><rect x="6" y="6" width="288" height="198" rx="8" fill="url(#mgweave)" opacity=".25"/>
        <defs><pattern id="mgweave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6M3 0V6" stroke="#000" stroke-width=".5"/></pattern></defs>
        <polyline points="${P.map(p => p.join(',')).join(' ')}" fill="none" stroke="#2f1d2b" stroke-width="2" stroke-dasharray="6 5" opacity=".7"/>
        <polyline id="mgtrail" points="" fill="none" stroke="#c44d6c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${P[0][0]}" cy="${P[0][1]}" r="7" fill="#e3b53b" class="mg-pulse"/>
        <text id="mgsc" x="-50" y="-50" font-size="22" text-anchor="middle" dominant-baseline="middle">✂️</text>
      </svg></div>
      <div class="tprog"><i id="mgt"></i></div><div class="sfb" id="mgfb">Ready, steady, snip!</div>`;
    const svg = host.querySelector('svg'), trail = host.querySelector('#mgtrail'), sc = host.querySelector('#mgsc');
    let k = 0, errSum = 0, errN = 0, down = false, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stop();
      const progress = k / (P.length - 1);
      const acc = errN ? clamp(1 - errSum / errN / 16, 0, 1) : 0;
      const score = clamp(progress * (0.4 + 0.6 * acc), 0, 1);
      host.querySelector('#mgfb').textContent = score > 0.8 ? 'Clean cut! ✨' : score > 0.5 ? 'Not bad at all.' : 'A bit jagged...';
      setTimeout(() => done(score), 600);
    };
    const move = e => {
      const p = svgPoint(svg, e);
      sc.setAttribute('x', p.x); sc.setAttribute('y', p.y);
      if (!down || finished) return;
      let best = k, bestD = Infinity;
      for (let i = k; i < Math.min(P.length, k + 9); i++) {
        const d = Math.hypot(p.x - P[i][0], p.y - P[i][1]);
        if (d < bestD) { bestD = d; best = i; }
      }
      errSum += Math.min(bestD, 30); errN++;
      if (bestD < 15 && best > k) {
        if (Math.floor(best / 6) > Math.floor(k / 6)) sfx('snip');
        k = best;
        trail.setAttribute('points', P.slice(0, k + 1).map(q => q.join(',')).join(' '));
        if (k >= P.length - 1) finish();
      }
    };
    const pd = e => { e.preventDefault(); down = true; move(e); };
    const pu = () => { down = false; };
    svg.addEventListener('pointerdown', pd);
    svg.addEventListener('pointermove', move);
    g.addEventListener('pointerup', pu);
    const stop = timerLoop(opts.time || 14, (t, f) => { const b = host.querySelector('#mgt'); if (b) b.style.width = `${f * 100}%`; }, finish);
    return () => { stop(); g.removeEventListener('pointerup', pu); };
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
        <g id="mgiron" transform="translate(-60 -60)"><path d="M-16 8 L16 8 L12 -6 Q0 -12 -12 -4 Z" fill="#c44d6c" stroke="#7a2a3e"/><path d="M-6 -6 q6 -10 14 -2" stroke="#2f1d2b" stroke-width="3" fill="none"/><g id="steam" opacity="0"><circle cx="-8" cy="14" r="3" fill="#fff"/><circle cx="2" cy="16" r="4" fill="#fff"/><circle cx="10" cy="13" r="3" fill="#fff"/></g></g>
      </svg></div>
      <div class="tprog"><i id="mgt"></i></div><div class="sfb" id="mgfb">${W.length} wrinkles to go</div>`;
    const svg = host.querySelector('svg'), iron = host.querySelector('#mgiron'), steam = host.querySelector('#steam');
    let down = false, finished = false;
    const left = () => W.filter(w => !w.ok).length;
    const finish = () => {
      if (finished) return;
      finished = true; stop();
      const score = 1 - left() / W.length;
      host.querySelector('#mgfb').textContent = score >= 1 ? 'Crisp as a fresh baguette! ✨' : score > 0.6 ? 'Nicely pressed.' : 'Still a little crumpled...';
      setTimeout(() => done(score), 600);
    };
    const move = e => {
      const p = svgPoint(svg, e);
      iron.setAttribute('transform', `translate(${p.x} ${p.y})`);
      steam.setAttribute('opacity', down ? '0.8' : '0');
      if (!down || finished) return;
      W.forEach((w, i) => {
        if (!w.ok && Math.hypot(p.x - w.x, p.y - w.y) < 22) {
          w.ok = true; sfx('steam');
          host.querySelector('#wr' + i).classList.add('gone');
          host.querySelector('#mgfb').textContent = left() ? `${left()} wrinkles to go` : 'All smooth!';
          if (!left()) finish();
        }
      });
    };
    const pd = e => { e.preventDefault(); down = true; move(e); };
    const pu = () => { down = false; steam.setAttribute('opacity', '0'); };
    svg.addEventListener('pointerdown', pd);
    svg.addEventListener('pointermove', move);
    g.addEventListener('pointerup', pu);
    const stop = timerLoop(opts.time || 8, (t, f) => { const b = host.querySelector('#mgt'); if (b) b.style.width = `${f * 100}%`; }, finish);
    return () => { stop(); g.removeEventListener('pointerup', pu); };
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
    const stop = timerLoop(opts.time || 5, (t, f) => { const b = host.querySelector('#mgt'); if (b) b.style.width = `${f * 100}%`; }, finish);
    return () => stop();
  };

  // ---------------- painting a pot: free drawing clipped to the pot ----------------
  DG.MiniGames.paint = function (host, opts, done) {
    const pot = Object.assign({}, opts.pot, { paint: [] });
    const strokes = [];
    let color = DG.PAINT_COLORS[0], width = 2.5, cur = null;
    const draw = () => {
      host.querySelector('#paintpot').innerHTML = DG.renderPot(Object.assign({}, pot, { paint: strokes }), 'paint', { noPlant: true });
    };
    host.innerHTML = `${head('Paint your pot 🎨', 'Draw on the pot with your finger. More colours and more paint make it worth more.')}
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
    const toPath = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    const onDown = e => {
      const svg = wrap.querySelector('svg'); if (!svg) return;
      e.preventDefault();
      const p = svgPoint(svg, e);
      cur = { c: color, w: width, pts: [[p.x, p.y], [p.x + 0.1, p.y]] };
      const live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      live.setAttribute('stroke', color); live.setAttribute('stroke-width', width); live.setAttribute('fill', 'none'); live.setAttribute('stroke-linecap', 'round');
      live.setAttribute('clip-path', 'url(#potpaintc)'); live.id = 'livestroke';
      svg.appendChild(live);
      live.setAttribute('d', toPath(cur.pts));
    };
    const onMove = e => {
      if (!cur) return;
      const svg = wrap.querySelector('svg');
      const p = svgPoint(svg, e);
      const last = cur.pts[cur.pts.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) < 1.2) return;
      cur.pts.push([p.x, p.y]);
      const live = svg.querySelector('#livestroke');
      if (live) live.setAttribute('d', toPath(cur.pts));
    };
    const onUp = () => {
      if (!cur) return;
      if (strokes.length < 80) { strokes.push({ c: cur.c, w: cur.w, n: cur.pts.length, d: toPath(cur.pts) }); sfx('click'); }
      cur = null; draw(); showVal();
    };
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    g.addEventListener('pointerup', onUp);
    host.querySelectorAll('[data-pc]').forEach(b => b.addEventListener('click', () => { color = b.dataset.pc; host.querySelectorAll('[data-pc]').forEach(x => x.classList.toggle('on', x === b)); }));
    host.querySelectorAll('[data-pw]').forEach(b => b.addEventListener('click', () => { width = +b.dataset.pw; host.querySelectorAll('[data-pw]').forEach(x => x.classList.toggle('on', x === b)); }));
    host.querySelector('#pundo').addEventListener('click', () => { strokes.pop(); draw(); showVal(); });
    host.querySelector('#pclear').addEventListener('click', () => { strokes.length = 0; draw(); showVal(); });
    host.querySelector('#pdone').addEventListener('click', () => done(strokes.slice()));
    return () => g.removeEventListener('pointerup', onUp);
  };
})(typeof window !== 'undefined' ? window : globalThis);
