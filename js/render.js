// SVG rendering: the dress on Mie's dress form, fabric swatches and character portraits.
(function (g) {
  const DG = g.DG;
  const { byId } = DG;

  const hexToRgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const mix = (h1, h2, t) => {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const lighten = (h, t) => mix(h, '#ffffff', t);
  const darken = (h, t) => mix(h, '#000000', t);
  const lum = h => { const [r, g2, b] = hexToRgb(h); return (0.299 * r + 0.587 * g2 + 0.114 * b) / 255; };
  Object.assign(DG, { mix, lighten, darken, lum });

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function patternDef(id, tex, c) {
    const dk = darken(c, 0.25), lt = lighten(c, 0.3);
    const P = (w, h, body) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="${c}"/>${body}</pattern>`;
    switch (tex) {
      case 'weave': return P(6, 6, `<path d="M0 3H6M3 0V6" stroke="${dk}" stroke-width=".6" opacity=".35"/>`);
      case 'knit': return P(6, 6, `<path d="M0 1L1.5 4L3 1L4.5 4L6 1" fill="none" stroke="${dk}" stroke-width=".6" opacity=".4"/>`);
      case 'slub': return P(14, 8, `<path d="M1 2H7M9 5H13M3 7H6" stroke="${lt}" stroke-width=".8" opacity=".7"/>`);
      case 'twill': return P(6, 6, `<path d="M0 6L6 0M-3 3L3 -3M3 9L9 3" stroke="${dk}" stroke-width=".9" opacity=".45"/><path d="M0 3L3 0M3 6L6 3" stroke="${lt}" stroke-width=".4" opacity=".5"/>`);
      case 'sheer': return P(8, 8, `<path d="M0 2H8M0 6H8" stroke="${lt}" stroke-width=".7" opacity=".4"/>`);
      case 'lace': return P(10, 10, `<circle cx="5" cy="5" r="2.2" fill="${dk}" fill-opacity=".18" stroke="${lt}" stroke-width=".8"/><circle cx="0" cy="0" r="1" fill="${lt}"/><circle cx="10" cy="0" r="1" fill="${lt}"/><circle cx="0" cy="10" r="1" fill="${lt}"/><circle cx="10" cy="10" r="1" fill="${lt}"/><path d="M0 5H2.5M7.5 5H10M5 0V2.5M5 7.5V10" stroke="${lt}" stroke-width=".5"/>`);
      case 'tweed': return P(8, 8, `<rect x="1" y="1" width="2" height="1" fill="${dk}"/><rect x="5" y="3" width="2" height="1" fill="${lt}"/><rect x="2" y="5" width="1" height="2" fill="${mix(c, '#d6a22a', 0.55)}"/><rect x="6" y="6" width="1" height="1" fill="${dk}"/><rect x="4" y="0" width="1" height="1" fill="${mix(c, '#bf2630', 0.5)}"/>`);
      case 'brocade': {
        const gold = mix(c, '#efc659', 0.65);
        return P(16, 16, `<path d="M8 2L14 8L8 14L2 8Z" fill="none" stroke="${gold}" stroke-width="1"/><circle cx="8" cy="8" r="1.8" fill="${gold}"/><circle cx="0" cy="0" r="1.2" fill="${gold}"/><circle cx="16" cy="16" r="1.2" fill="${gold}"/><circle cx="16" cy="0" r="1.2" fill="${gold}"/><circle cx="0" cy="16" r="1.2" fill="${gold}"/>`);
      }
      case 'velvet': return P(4, 4, `<rect width="4" height="4" fill="${darken(c, 0.08)}"/>`);
      default: return P(4, 4, '');
    }
  }

  DG.swatchSVG = function (fabricId, colorId, uid, size = 56) {
    const f = byId(DG.FABRICS, fabricId);
    const c = DG.colorHex(colorId || f.show);
    const id = `sw-${uid}`;
    const sheen = f.tex === 'sheen' || f.tex === 'velvet';
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><defs>${patternDef(id, f.tex, c)}<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${sheen ? 0.45 : 0}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${sheen ? 0.25 : 0.08}"/></linearGradient></defs><path d="M3 5 Q20 1 37 5 L35 36 Q20 39 5 36 Z" fill="url(#${id})" opacity="${f.tex === 'sheer' ? 0.8 : 1}"/><path d="M3 5 Q20 1 37 5 L35 36 Q20 39 5 36 Z" fill="url(#${id}g)" stroke="${darken(c, 0.3)}" stroke-width=".6"/></svg>`;
  };

  DG.colorDot = (id, size = 18) => `<span class="cdot" style="--c:${DG.colorHex(id)};width:${size}px;height:${size}px" title="${byId(DG.COLORS, id).name}"></span>`;

  // ---------------- dress ----------------
  // opts.wearer: a customer's look — she wears the dress instead of the dress form
  DG.renderDress = function (d, uid = 'dress', opts = {}) {
    const fm = d.main ? byId(DG.FABRICS, d.main) : null;
    const fa = d.accent ? byId(DG.FABRICS, d.accent) : null;
    const mainHex = fm ? DG.colorHex(d.mainColor) : '#efe8dc';
    const accHex = fa ? DG.colorHex(d.accentColor) : mainHex;
    const P = `p${uid}`;
    const defs = [];
    if (fm) defs.push(patternDef(`${P}m`, fm.tex, mainHex));
    if (fa) defs.push(patternDef(`${P}a`, fa.tex, accHex));
    const mainFill = fm ? `url(#${P}m)` : '#efe8dc';
    const accFill = fa ? `url(#${P}a)` : mainFill;
    const line = darken(mainHex, 0.38);
    const accLine = darken(accHex, 0.38);
    const toile = fm ? '' : ' stroke-dasharray="3 2"';

    const sil = d.silhouette, neck = d.neckline;
    const W = sil === 'empire' ? 98 : 120;
    const H = { mini: 178, knee: 220, midi: 258, maxi: 298 }[d.length];
    const span = H - W;

    // ---- skirt ----
    let skirt, hw, hemCurve = 5;
    const simple = (base, k) => {
      hw = base + span * k;
      return `M78 ${W} Q73 ${W + span * 0.25} ${100 - hw} ${H} Q100 ${H + hemCurve * 2} ${100 + hw} ${H} Q127 ${W + span * 0.25} 122 ${W} Z`;
    };
    switch (sil) {
      case 'sheath': {
        hw = 26;
        const hip = W + Math.min(48, span * 0.45);
        hemCurve = 1.5;
        skirt = `M78 ${W} C70 ${W + (hip - W) * 0.45} 70 ${W + (hip - W) * 0.8} 72 ${hip} L74 ${H} Q100 ${H + 3} 126 ${H} L128 ${hip} C130 ${W + (hip - W) * 0.8} 130 ${W + (hip - W) * 0.45} 122 ${W} Z`;
        break;
      }
      case 'mermaid': {
        const hip = W + Math.min(52, span * 0.45);
        const K = Math.max(hip + 6, W + span * 0.68);
        hw = 22 + span * 0.17;
        hemCurve = 3;
        skirt = `M78 ${W} C70 ${W + (hip - W) * 0.45} 70 ${W + (hip - W) * 0.8} 74 ${hip} L80 ${K} Q${100 - hw + 6} ${H - 8} ${100 - hw} ${H} Q100 ${H + 6} ${100 + hw} ${H} Q${100 + hw - 6} ${H - 8} 120 ${K} L126 ${hip} C130 ${W + (hip - W) * 0.8} 130 ${W + (hip - W) * 0.45} 122 ${W} Z`;
        break;
      }
      case 'ballgown': {
        hw = 30 + 40 * span / 178;
        hemCurve = 5;
        skirt = `M78 ${W} C56 ${W + 8} ${100 - hw - 4} ${H - span * 0.45} ${100 - hw} ${H} Q100 ${H + 10} ${100 + hw} ${H} C${100 + hw + 4} ${H - span * 0.45} 144 ${W + 8} 122 ${W} Z`;
        break;
      }
      case 'shirt': skirt = simple(26, 0.14); break;
      case 'empire': skirt = simple(24, 0.26); break;
      case 'pinafore': skirt = simple(25, 0.22); break;
      default: skirt = simple(24, 0.3);
    }
    const hemL = 100 - hw, hemR = 100 + hw;
    const hemY = x => H + hemCurve * (1 - Math.pow((x - 100) / hw, 2));

    // ---- bodice ----
    const strapless = ['sweetheart', 'offshoulder', 'halter'].includes(neck);
    const tops = {
      round: 'M72 62 L88 58 Q100 80 112 58 L128 62',
      vneck: 'M72 62 L88 58 L100 95 L112 58 L128 62',
      square: 'M72 62 L86 59 L86 78 L114 78 L114 59 L128 62',
      collar: 'M72 62 L90 56 Q100 70 110 56 L128 62',
      sweetheart: 'M72 84 C74 74 84 72 92 76 Q100 81 100 86 Q100 81 108 76 C116 72 126 74 128 84',
      offshoulder: 'M66 72 Q100 80 134 72',
      halter: 'M76 84 L94 50 L106 50 L124 84',
    };
    const neckBottom = { round: 80, vneck: 95, square: 78, collar: 70, sweetheart: 86, offshoulder: 78, halter: 70 }[neck];
    const bodiceFrom = top => `${top} L128 84 L122 ${W} L78 ${W} L72 84 Z`;
    const isPina = sil === 'pinafore';
    const bodice = isPina ? bodiceFrom('M76 84 L80 78 L120 78 L124 84') : bodiceFrom(tops[neck]);
    const blouseFill = fa ? accFill : '#fbfaf6';
    const blouseLine = fa ? accLine : '#cfc6b8';

    // ---- sleeves (left shape, mirrored for right) ----
    const sleeveShapes = {
      cap: 'M72 62 Q60 64 58 78 Q64 82 72 84 Z',
      short: 'M72 62 Q60 62 55 70 L50 98 Q60 102 70 98 L72 84 Z',
      long: 'M72 62 Q60 62 55 70 L46 170 Q53 174 61 170 L68 95 L72 84 Z',
      puff: 'M72 62 C50 54 42 82 54 94 Q63 100 72 88 Z',
      bell: 'M72 62 Q60 62 56 72 L50 130 Q44 160 34 172 Q52 180 66 168 Q64 140 68 100 L72 84 Z',
    };
    const sleevePath = sleeveShapes[d.sleeves];
    const sleeveShift = strapless && !isPina ? 'translate(-2 10)' : '';
    const sleeveFill = isPina ? blouseFill : accFill;
    const sleeveLine = isPina ? blouseLine : (fa ? accLine : line);
    const sleeves = sleevePath
      ? `<g transform="${sleeveShift}"><path d="${sleevePath}" fill="${sleeveFill}" stroke="${sleeveLine}" stroke-width=".8"${toile}/></g><g transform="translate(200 0) scale(-1 1) ${sleeveShift}"><path d="${sleevePath}" fill="${sleeveFill}" stroke="${sleeveLine}" stroke-width=".8"${toile}/></g>`
      : '';

    // ---- clip + shading ----
    defs.push(`<clipPath id="${P}c"><path d="${skirt}"/><path d="${bodice}"/></clipPath>`);
    defs.push(`<linearGradient id="${P}sh" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".32" stop-color="#000" stop-opacity="0"/><stop offset=".68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>`);
    defs.push(`<linearGradient id="${P}hl" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#fff" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".18"/><stop offset=".72" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    defs.push(`<radialGradient id="${P}vv" cx=".5" cy=".45" r=".6"><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>`);

    const out = [];
    const wear = opts.wearer;
    if (wear) {
      // the customer herself: legs and shoes, arms and shoulders, then her head above the neckline
      const sk = wear.skin, legC = wear.tights || sk, shoeC = wear.shoes || '#3b2a2f';
      out.push(`<ellipse cx="100" cy="318" rx="40" ry="6" fill="#000" opacity=".12"/>`);
      out.push(`<path d="M86 ${W + 10} Q85 260 88 312 L96 312 Q97 260 98 ${W + 10} Z M102 ${W + 10} Q103 260 104 312 L112 312 Q115 260 114 ${W + 10} Z" fill="${legC}"/>`);
      out.push(`<path d="M80 314 q8 -9 18 0 q-9 4 -18 0Z M102 314 q10 -9 18 0 q-9 4 -18 0Z" fill="${shoeC}"/>`);
      out.push(`<path d="M74 66 Q60 116 54 172 M126 66 Q140 116 146 172" stroke="${sk}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="53" cy="177" r="6" fill="${sk}"/><circle cx="147" cy="177" r="6" fill="${sk}"/>`);
      out.push(`<path d="M88 50 L112 50 Q122 56 128 63 L124 92 L76 92 L72 63 Q78 56 88 50 Z" fill="${sk}"/>`);
      out.push(DG.renderAvatar(Object.assign({}, wear, { bg: 'transparent', headOnly: true }), opts.mood || 'happy', 100).replace(/^<svg[^>]*>/, '<svg x="50" y="-17" width="100" height="100" viewBox="0 0 100 100" overflow="visible">'));
    } else {
      // dress form on a turned wooden stand
      out.push(`<ellipse cx="100" cy="314" rx="40" ry="6" fill="#000" opacity=".1"/><ellipse cx="100" cy="311" rx="34" ry="6.5" fill="#6e563d"/><ellipse cx="100" cy="308.5" rx="28" ry="4.6" fill="var(--form-dark, #8c7357)"/>`
        + `<rect x="97.4" y="150" width="5.2" height="158" fill="var(--form-dark, #8c7357)"/><rect x="98.2" y="150" width="1.4" height="158" fill="#fff" opacity=".18"/><rect x="95" y="158" width="10" height="6" rx="1.5" fill="#c9a54a"/>`);
      out.push(`<path d="M91 40 h18 v14 C118 55 124 58 126 63 L123 84 C121 96 120 108 120 ${W} C120 ${W + 15} 123 148 124 160 L76 160 C77 148 80 ${W + 15} 80 ${W} C80 108 79 96 77 84 L74 63 C76 58 82 55 91 54 Z" fill="#e8d7be" stroke="#bda585" stroke-width=".8"/><ellipse cx="100" cy="40" rx="11" ry="5" fill="#d9c3a3" stroke="#bda585" stroke-width=".8"/><ellipse cx="100" cy="36" rx="5" ry="3" fill="#c9a54a"/>`);
    }

    const op = fm && fm.tex === 'sheer' ? ' opacity=".9"' : '';
    if (isPina) {
      // blouse underneath the pinafore
      out.push(`<path d="${bodiceFrom(tops[neck])}" fill="${blouseFill}" stroke="${blouseLine}" stroke-width=".8"/>`);
      out.push(sleeves);
    } else {
      out.push(sleeves);
    }
    out.push(`<g${op}>`);
    out.push(`<path d="${skirt}" fill="${mainFill}" stroke="${line}" stroke-width=".9"${toile}/>`);
    out.push(`<path d="${bodice}" fill="${mainFill}" stroke="${line}" stroke-width=".9"${toile}/>`);
    if (isPina) out.push(`<path d="M84 79 L82 58 M116 79 L118 58" stroke="${mainFill}" stroke-width="5" stroke-linecap="round"/><path d="M84 79 L82 58 M116 79 L118 58" stroke="${line}" stroke-width=".6" stroke-dasharray="2 1.5" fill="none"/>`);
    out.push('</g>');

    // shading overlays
    out.push(`<g clip-path="url(#${P}c)"><rect x="0" y="40" width="200" height="270" fill="url(#${P}sh)"/>`);
    // soft folds give the skirt volume, more of them the fuller it is
    const folds = { aline: 4, wrap: 3, empire: 5, ballgown: 7, pinafore: 3, shirt: 2, mermaid: 0, sheath: 0 }[sil] || 0;
    for (let i = 1; i <= folds; i++) {
      const f = i / (folds + 1) * 2 - 1, x0 = 100 + f * 18, x1 = 100 + f * (hw - 4);
      out.push(`<path d="M${x0.toFixed(1)} ${W + 4} Q${((x0 + x1) / 2 + f * 3).toFixed(1)} ${(W + span * 0.55).toFixed(1)} ${x1.toFixed(1)} ${(hemY(x1) - 1).toFixed(1)}" stroke="${darken(mainHex, 0.3)}" stroke-width="${(1.6 - Math.abs(f) * 0.6).toFixed(2)}" fill="none" opacity=".22" stroke-linecap="round"/>`);
      out.push(`<path d="M${(x0 + 2).toFixed(1)} ${W + 6} Q${((x0 + x1) / 2 + f * 3 + 2).toFixed(1)} ${(W + span * 0.55).toFixed(1)} ${(x1 + 2.5).toFixed(1)} ${(hemY(x1) - 2).toFixed(1)}" stroke="#fff" stroke-width=".9" fill="none" opacity=".18" stroke-linecap="round"/>`);
    }
    if (fm && fm.tex === 'sheen') out.push(`<rect x="0" y="40" width="200" height="270" fill="url(#${P}hl)"/>`);
    if (fm && fm.tex === 'velvet') out.push(`<rect x="0" y="40" width="200" height="270" fill="url(#${P}vv)"/>`);
    out.push('</g>');
    out.push(`<path d="M78 ${W} L122 ${W}" stroke="${line}" stroke-width=".8"/>`);
    // tailoring: princess seams, topstitching at the waist and hem, a facing along the neckline
    const stitch = lighten(mainHex, 0.45);
    const det = [];
    if (!isPina) det.push(`<path d="M87 ${neckBottom + 3} Q84.5 ${(neckBottom + W) / 2} 86.5 ${W} M113 ${neckBottom + 3} Q115.5 ${(neckBottom + W) / 2} 113.5 ${W}" stroke="${line}" stroke-width=".7" fill="none" opacity=".45"/>`);
    det.push(`<path d="M79 ${W + 2.6} H121" stroke="${stitch}" stroke-width=".7" stroke-dasharray="1.8 1.4" opacity=".9"/>`);
    let hs = '';
    for (let x = hemL + 3; x <= hemR - 3; x += 3) hs += `${hs ? 'L' : 'M'}${x.toFixed(1)} ${(hemY(x) - 3.2).toFixed(1)}`;
    det.push(`<path d="${hs}" stroke="${stitch}" stroke-width=".7" stroke-dasharray="1.8 1.4" fill="none" opacity=".9"/>`);
    if (!isPina && tops[neck]) det.push(`<path d="${tops[neck]}" transform="translate(0 2.6)" stroke="${stitch}" stroke-width=".6" stroke-dasharray="1.5 1.3" fill="none" opacity=".8"/>`);
    out.push(`<g clip-path="url(#${P}c)">${det.join('')}</g>`);
    // sleeve finishes: cuffs on long sleeves, a band on short ones, gathers on puffs
    if (sleevePath && !isPina) {
      const sl = d.sleeves === 'long' ? 'M47 160 Q54 166 61 162' : d.sleeves === 'short' ? 'M51 92 Q60 98 69 94' : d.sleeves === 'puff' ? 'M50 70 Q54 80 56 92 M58 64 Q60 76 62 90' : d.sleeves === 'bell' ? 'M38 166 Q52 174 64 164' : '';
      if (sl) out.push(`<g transform="${sleeveShift}"><path d="${sl}" stroke="${darken(fa ? accHex : mainHex, 0.3)}" stroke-width="1.2" fill="none" opacity=".7"/></g><g transform="translate(200 0) scale(-1 1) ${sleeveShift}"><path d="${sl}" stroke="${darken(fa ? accHex : mainHex, 0.3)}" stroke-width="1.2" fill="none" opacity=".7"/></g>`);
    }

    // ---- details ----
    const has = id => d.extras.includes(id);
    const ribbonHex = fa ? accHex : darken(mainHex, 0.35);

    if (sil === 'wrap') {
      out.push(`<path d="M88 58 L121 ${W} Q${112} ${W + span * 0.55} ${hemR - 12} ${hemY(hemR - 12)}" fill="none" stroke="${line}" stroke-width="1"/>`);
      // the tie: a bow at the waist with two hanging ends
      out.push(`<path d="M121 ${W} q8 6 6 24 M121 ${W} q2 9 -3 22" stroke="${line}" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M121 ${W} q8 6 6 24 M121 ${W} q2 9 -3 22" stroke="${mainFill}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M121 ${W} q-8 -8 -12 -1 q5 6 12 1 q9 -6 11 2 q-5 5 -11 -2" fill="${mainFill}" stroke="${line}" stroke-width=".7"/>`);
    }
    if (sil === 'shirt') {
      // button placket, a pointed collar and a belt
      out.push(`<path d="M97 ${neckBottom} V${H - 2} M103 ${neckBottom} V${H - 2}" stroke="${line}" stroke-width=".7" fill="none"/>`);
      if (!strapless && neck !== 'collar') out.push(`<path d="M89 57 L99 72 L86 71 Z M111 57 L101 72 L114 71 Z" fill="${mainFill}" stroke="${line}" stroke-width=".8"/>`);
      if (!d.closure || !byId(DG.CLOSURES, d.closure).hex) for (let y = neckBottom + 6; y <= H - 10; y += 13) out.push(`<circle cx="100" cy="${y}" r="1.8" fill="#f6efe2" stroke="${line}" stroke-width=".4"/>`);
      out.push(`<rect x="78" y="${W - 4}" width="44" height="8" fill="${ribbonHex}" stroke="${darken(ribbonHex, 0.3)}" stroke-width=".5"/><rect x="95" y="${W - 5}" width="10" height="10" rx="1.5" fill="none" stroke="#c9a54a" stroke-width="1.6"/>`);
    }
    if (sil === 'empire') {
      // ribbon under the bust with a small bow
      out.push(`<path d="M76 ${W - 3} Q100 ${W + 1} 124 ${W - 3} L124 ${W + 3} Q100 ${W + 7} 76 ${W + 3} Z" fill="${ribbonHex}" stroke="${darken(ribbonHex, 0.3)}" stroke-width=".4"/><path d="M100 ${W + 2} q-9 -7 -10 1 q1 7 10 -1 q9 -7 10 1 q-1 7 -10 -1 M99 ${W + 3} l-4 12 M101 ${W + 3} l4 12" fill="${ribbonHex}" stroke="${darken(ribbonHex, 0.35)}" stroke-width=".5"/>`);
    }

    if (has('ruffles')) {
      const top = x => hemY(x) - 11;
      let p = `M${hemL + 1} ${top(hemL + 1)}`;
      for (let x = hemL + 1; x <= hemR - 1; x += 4) p += ` L${x.toFixed(1)} ${top(x).toFixed(1)}`;
      const n = Math.max(4, Math.round((hemR - hemL) / 9));
      const step = (hemR - hemL - 2) / n;
      for (let i = n; i > 0; i--) {
        const x1 = hemL + 1 + i * step, x0 = x1 - step;
        p += ` L${x1.toFixed(1)} ${(hemY(x1) + 1).toFixed(1)} Q${((x0 + x1) / 2).toFixed(1)} ${(hemY((x0 + x1) / 2) + 6).toFixed(1)} ${x0.toFixed(1)} ${(hemY(x0) + 1).toFixed(1)}`;
      }
      out.push(`<path d="${p} Z" fill="${accFill}" stroke="${fa ? accLine : line}" stroke-width=".7"/>`);
    }
    if (has('lacetrim')) {
      let lace = '';
      for (let x = hemL + 3; x <= hemR - 3; x += 5.5) lace += `<circle cx="${x.toFixed(1)}" cy="${(hemY(x) + (has('ruffles') ? 6 : 1)).toFixed(1)}" r="3" fill="#fffaf0" stroke="#d9cdb8" stroke-width=".5"/><circle cx="${x.toFixed(1)}" cy="${(hemY(x) + (has('ruffles') ? 6 : 1)).toFixed(1)}" r="1" fill="#d9cdb8"/>`;
      out.push(lace);
    }
    if (has('pockets')) {
      const py = W + Math.min(18, span * 0.2) + (sil === 'empire' ? 22 : 0);
      [80, 106].forEach(x => out.push(`<rect x="${x}" y="${py}" width="14" height="15" rx="2" fill="${accFill}" stroke="${fa ? accLine : line}" stroke-width=".7"/><path d="M${x + 1.5} ${py + 2.5} H${x + 12.5}" stroke="${lighten(fa ? accHex : mainHex, 0.5)}" stroke-width=".6" stroke-dasharray="1.5 1"/>`));
    }
    if (has('reinforced')) {
      const st = lighten(mainHex, 0.55);
      let p = `M80 ${W + 2.5} H120 M${hemL + 4} ${(hemY(hemL + 4) - 4).toFixed(1)}`;
      for (let x = hemL + 8; x <= hemR - 4; x += 4) p += ` L${x.toFixed(1)} ${(hemY(x) - 4).toFixed(1)}`;
      p += ` M75 84 L80 ${W - 2} M125 84 L120 ${W - 2}`;
      out.push(`<path d="${p}" stroke="${st}" stroke-width=".7" stroke-dasharray="2 1.5" fill="none"/>`);
    }
    if (neck === 'collar' && !strapless) {
      const cf = isPina ? blouseFill : accFill, cl = isPina ? blouseLine : (fa ? accLine : line);
      out.push(`<path d="M90 56 L100 71 L84 72 Z M110 56 L100 71 L116 72 Z" fill="${cf}" stroke="${cl}" stroke-width=".8"/>`);
    }
    const clo = byId(DG.CLOSURES, d.closure);
    if (clo.hex) {
      let b = '';
      const start = (isPina ? 82 : neckBottom) + 6;
      for (let y = start; y <= W - 4; y += 10) b += `<circle cx="100" cy="${y}" r="2.6" fill="${clo.hex}" stroke="${darken(clo.hex, 0.4)}" stroke-width=".5"/><circle cx="99.3" cy="${y - 0.7}" r=".7" fill="#fff" opacity=".6"/>`;
      if (sil === 'shirt') for (let y = W + 12; y <= H - 14; y += 14) b += `<circle cx="100" cy="${y}" r="2.6" fill="${clo.hex}" stroke="${darken(clo.hex, 0.4)}" stroke-width=".5"/>`;
      out.push(b);
    }
    if (has('belt')) out.push(`<rect x="77" y="${W - 4}" width="46" height="7.5" rx="1.5" fill="${ribbonHex}" stroke="${darken(ribbonHex, 0.35)}" stroke-width=".6"/><rect x="95.5" y="${W - 5.5}" width="9" height="10.5" rx="1.5" fill="none" stroke="#d9b54a" stroke-width="1.6"/>`);
    if (has('bow')) {
      const bx = sil === 'wrap' ? 84 : 112, by = W;
      out.push(`<g fill="${ribbonHex}" stroke="${darken(ribbonHex, 0.35)}" stroke-width=".6"><path d="M${bx} ${by} q-9 -8 -11 0 q2 8 11 0Z"/><path d="M${bx} ${by} q9 -8 11 0 q-2 8 -11 0Z"/><path d="M${bx} ${by} l-5 14 l3 -1 l3 2Z"/><path d="M${bx} ${by} l5 13 l-3 0 l-3 2Z"/><circle cx="${bx}" cy="${by}" r="2.4"/></g>`);
    }
    const r = rng(1234 + d.silhouette.length * 7 + d.length.length);
    if (has('sequins')) {
      let sq = '';
      for (let i = 0; i < 90; i++) {
        const x = 30 + r() * 140, y = 60 + r() * (H - 55);
        sq += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + r() * 0.9).toFixed(2)}" fill="${i % 3 ? '#fff' : '#ffe08a'}" opacity="${(0.55 + r() * 0.4).toFixed(2)}"/>`;
      }
      out.push(`<g clip-path="url(#${P}c)">${sq}</g>`);
    }
    if (has('embroidery')) {
      const ec = lum(mainHex) < 0.45 ? '#f3cf6a' : mix(mainHex, '#7a1f4b', 0.65);
      const flower = (x, y, s = 1) => {
        let f = '';
        for (let k = 0; k < 5; k++) {
          const a = k * 2 * Math.PI / 5;
          f += `<circle cx="${(x + Math.cos(a) * 2.6 * s).toFixed(1)}" cy="${(y + Math.sin(a) * 2.6 * s).toFixed(1)}" r="${(1.7 * s).toFixed(2)}" fill="${ec}"/>`;
        }
        return f + `<circle cx="${x}" cy="${y}" r="${1.2 * s}" fill="${lighten(ec, 0.6)}"/>`;
      };
      let fl = flower(88, W - 14) + flower(112, W - 14);
      for (let x = hemL + 12; x <= hemR - 12; x += 16) fl += flower(x, hemY(x) - 20, 1.1);
      out.push(`<g clip-path="url(#${P}c)">${fl}</g>`);
    }
    if (has('beading')) {
      let bd = '';
      for (let x = 79; x <= 121; x += 3.5) bd += `<circle cx="${x}" cy="${W - 1}" r="1" fill="#fff" stroke="#bfe0ff" stroke-width=".4"/>`;
      for (let y = 68; y < W - 6; y += 7) for (let x = 74 + (y % 2) * 3.5; x < 128; x += 7) bd += `<circle cx="${x}" cy="${y}" r=".8" fill="#fff" opacity=".9"/>`;
      out.push(`<g clip-path="url(#${P}c)">${bd}</g>`);
    }

    return `<svg class="dress-svg${wear ? ' worn' : ''}" viewBox="${wear ? '0 -2 200 327' : '0 20 200 300'}" role="img" aria-label="Dress preview"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
  };

  // ---------------- portraits ----------------
  DG.renderAvatar = function (look, mood = 'neutral', size = 72) {
    const { skin, hair } = look;
    const sk2 = darken(skin, 0.12);
    const hairBack = {
      0: `<path d="M30 46 Q28 22 50 21 Q72 22 70 46 L70 62 L30 62 Z" fill="${hair}"/>`,
      1: `<path d="M29 42 Q27 20 50 19 Q73 20 71 42 L73 86 Q50 92 27 86 Z" fill="${hair}"/>`,
      2: `<circle cx="50" cy="17" r="10" fill="${hair}"/>`,
      3: [[32, 34], [36, 24], [46, 18], [57, 19], [66, 26], [69, 38], [31, 48], [70, 50], [33, 60], [68, 61]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${hair}"/>`).join(''),
      4: '',
      5: `<circle cx="27" cy="44" r="8" fill="${hair}"/><circle cx="73" cy="44" r="8" fill="${hair}"/><circle cx="31" cy="38" r="2.4" fill="#d6577b"/><circle cx="69" cy="38" r="2.4" fill="#d6577b"/>`,
    }[look.style];
    const hairFront = {
      0: `<path d="M32 46 Q31 25 50 24 Q69 25 68 46 Q62 33 50 32 Q40 32 36 40 Q34 44 32 46Z" fill="${hair}"/>`,
      1: `<path d="M32 44 Q32 25 50 24 Q68 25 68 44 Q60 30 46 32 Q38 34 32 44Z" fill="${hair}"/>`,
      2: `<path d="M33 42 Q33 26 50 25 Q67 26 67 42 Q60 31 50 31 Q40 31 33 42Z" fill="${hair}"/>`,
      3: `<path d="M33 40 Q36 26 50 26 Q64 26 67 40 Q58 33 50 34 Q42 33 33 40Z" fill="${hair}"/>`,
      4: `<path d="M32 44 Q30 24 50 23 Q70 24 68 42 Q66 34 56 32 Q44 34 38 32 Q33 36 32 44Z" fill="${hair}"/>`,
      5: `<path d="M33 42 Q33 25 50 25 Q67 25 67 42 Q62 32 50 34 Q38 32 33 42Z" fill="${hair}"/>`,
    }[look.style];
    const mouth = {
      ecstatic: `<path d="M42.5 55.5 Q50 66 57.5 55.5 Z" fill="#8a2f3c"/><path d="M44.5 56.2 Q50 58.8 55.5 56.2 L55 57.4 Q50 59.6 45 57.4Z" fill="#fff"/><path d="M46 62 Q50 64.5 54 62" stroke="#d9707f" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
      happy: `<path d="M43.5 56 Q50 62.8 56.5 56 Q50 58.6 43.5 56Z" fill="#b8475c"/><path d="M43.2 55.8 Q50 62.6 56.8 55.8" stroke="#8a2f3c" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
      neutral: `<path d="M45.5 58 Q50 60.6 54.5 58 Q50 58.8 45.5 58Z" fill="#b8475c" stroke="#8a2f3c" stroke-width="1" stroke-linejoin="round"/>`,
      sad: `<path d="M44 60 Q50 54 56 60" stroke="#7a2a33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      angry: `<path d="M44 60 Q50 55 56 60" stroke="#7a2a33" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    }[mood];
    const brows = mood === 'sad'
      ? '<path d="M39 39 L46 37 M54 37 L61 39" stroke="#3a2a22" stroke-width="1.6" stroke-linecap="round"/>'
      : mood === 'angry'
        ? '<path d="M39 37 L46 40 M54 40 L61 37" stroke="#3a2a22" stroke-width="1.8" stroke-linecap="round"/>'
        : '<path d="M39 39 Q42.5 37 46 39 M54 39 Q57.5 37 61 39" stroke="#3a2a22" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    // storybook eyes: big, with a coloured iris, a shine and lashes (a little flick for the women)
    const masc = look.shirt || look.beard || look.masc;
    const iris = look.eyes || ['#5b3a1f', '#3d6e8f', '#55804a', '#7a5230', '#4a3b6b'][((look.hair || '#0').charCodeAt(3) + (look.skin || '#0').charCodeAt(4)) % 5];
    const lash = '#2b1d18';
    const eye = (cx, side) => `<ellipse cx="${cx}" cy="46.6" rx="3.7" ry="4.3" fill="#fff"/><circle cx="${cx}" cy="47.2" r="2.9" fill="${iris}"/><circle cx="${cx}" cy="47.4" r="1.5" fill="#1d1410"/><circle cx="${cx + 1}" cy="45.9" r="1" fill="#fff"/><circle cx="${cx - 1.1}" cy="48.6" r=".45" fill="#fff" opacity=".8"/>`
      + `<path d="M${cx - 4.1} 45.6 Q${cx} 41.4 ${cx + 4.1} 45.6" stroke="${lash}" stroke-width="${masc ? 1.1 : 1.6}" fill="none" stroke-linecap="round"/>`
      + (masc ? '' : `<path d="M${cx + side * 4} 45.4 l${side * 1.7} -1.5" stroke="${lash}" stroke-width="1.2" stroke-linecap="round"/>`);
    const eyes = mood === 'ecstatic'
      ? `<path d="M39.5 46.5 Q43 42.5 46.5 46.5 M53.5 46.5 Q57 42.5 60.5 46.5" stroke="${lash}" stroke-width="1.9" fill="none" stroke-linecap="round"/>${masc ? '' : `<path d="M39.6 46.3 l-1.6 -1.2 M60.4 46.3 l1.6 -1.2" stroke="${lash}" stroke-width="1.2" stroke-linecap="round"/>`}`
      : eye(43, -1) + eye(57, 1);
    const nose = `<path d="M50.2 48.5 Q48.6 52.4 50.8 52.8" stroke="${darken(skin, 0.28)}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    const glasses = look.glasses ? `<g fill="none" stroke="${look.glassColor || '#3a2a22'}" stroke-width="${look.glassColor && look.glassColor !== '#3a2a22' ? 1.6 : 1.3}"><circle cx="43" cy="46" r="5.5"/><circle cx="57" cy="46" r="5.5"/><path d="M48.5 46 H51.5"/></g>` : '';
    const shirt = look.shirt ? `<path d="M41 75 L50 86 L59 75 L55 72 L50 79 L45 72 Z" fill="#fff" stroke="${darken(look.top, 0.35)}" stroke-width=".8"/><path d="M50 86 V100" stroke="${darken(look.top, 0.35)}" stroke-width="1"/><circle cx="50" cy="91" r="1" fill="${darken(look.top, 0.4)}"/><circle cx="50" cy="97" r="1" fill="${darken(look.top, 0.4)}"/>` : '';
    const beard = look.beard ? `<path d="M34 50 Q36 68 50 68 Q64 68 66 50 Q62 60 50 60 Q38 60 34 50Z" fill="${hair}"/>` : '';
    const ear = look.earrings ? '<circle cx="33" cy="54" r="2" fill="#e9c35a"/><circle cx="67" cy="54" r="2" fill="#e9c35a"/>' : '';
    // outfit details drawn over the plain top
    const t = look.top, td = darken(t, 0.25);
    let outfit = `<path d="M16 100 Q19 76 50 73 Q81 76 84 100 Z" fill="${t}"/>`;
    let overNeck = '';
    switch (look.kind) {
      case 'stripes':
        outfit += [80, 86, 92, 98].map(y => `<path d="M${16 + (100 - y) * 0.2} ${y} Q50 ${y - 3} ${84 - (100 - y) * 0.2} ${y}" stroke="#f7f5ef" stroke-width="2.4" fill="none"/>`).join('');
        break;
      case 'knit':
        overNeck = `<rect x="41" y="68" width="18" height="9" rx="4" fill="${td}"/><path d="M44 69 v7 M48 69 v8 M52 69 v8 M56 69 v7" stroke="${darken(t, 0.4)}" stroke-width=".7"/>`;
        outfit += [26, 34, 42, 58, 66, 74].map(x => `<path d="M${x} 90 v8" stroke="${td}" stroke-width="1.2"/>`).join('');
        break;
      case 'dress':
        overNeck = `<path d="M43 74 L50 86 L57 74 Z" fill="${darken(look.skin, 0.12)}"/><path d="M38 76 L36 70 M62 76 L64 70" stroke="${t}" stroke-width="3"/>`;
        break;
      case 'blouse':
        overNeck = `<path d="M50 77 q-8 -6 -9 2 q2 5 9 -2Z M50 77 q8 -6 9 2 q-2 5 -9 -2Z" fill="${td}"/><path d="M50 77 l-4 12 M50 77 l4 12" stroke="${td}" stroke-width="2"/><circle cx="50" cy="77" r="2" fill="${darken(t, 0.4)}"/>`;
        break;
      case 'blazer':
        overNeck = `<path d="M42 75 L50 92 L58 75 Z" fill="#fbfaf6"/><path d="M42 75 L48 93 L36 100 L30 100 Q32 82 42 75Z M58 75 L52 93 L64 100 L70 100 Q68 82 58 75Z" fill="${td}"/>`;
        break;
      case 'gown':
        outfit = `<path d="M16 100 Q19 76 50 73 Q81 76 84 100 Z" fill="${darken(look.skin, 0.06)}"/><path d="M20 100 Q24 86 50 85 Q76 86 80 100 Z" fill="${t}"/><path d="M24 92 Q50 84 76 92" stroke="${lighten(t, 0.25)}" stroke-width="1" fill="none"/>`;
        break;
      default: break;
    }
    let acc = '';
    if (look.acc === 'scarf') acc = `<path d="M41 71 Q50 78 59 71 L60 76 Q50 83 40 76 Z" fill="${look.accColor}"/><path d="M55 77 l5 11 l-5 -2 l-3 2 Z" fill="${look.accColor}"/>`;
    if (look.acc === 'pearls') acc = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.15 + 0.7 * i / 8); return `<circle cx="${(50 - Math.cos(a) * 10).toFixed(1)}" cy="${(73 + Math.sin(a) * 7).toFixed(1)}" r="1.5" fill="#f6f1e6" stroke="#cfc6b8" stroke-width=".4"/>`; }).join('');
    const hat = look.acc === 'beret' ? `<ellipse cx="54" cy="26" rx="17" ry="6.5" transform="rotate(-12 54 26)" fill="${look.accColor}"/><circle cx="56" cy="19" r="1.6" fill="${look.accColor}"/>` : '';
    const clip = look.acc === 'clip' ? `<g transform="translate(35 32)">${[0, 1, 2, 3, 4].map(k => `<circle cx="${(Math.cos(k * 1.2566) * 2.6).toFixed(1)}" cy="${(Math.sin(k * 1.2566) * 2.6).toFixed(1)}" r="2" fill="${look.accColor}"/>`).join('')}<circle r="1.3" fill="#f0c443"/></g>` : '';
    const extra = look.measure ? '<path d="M24 100 Q30 78 44 74 L48 82 Q36 86 32 100 Z" fill="#f2d54b"/><path d="M30 92 l3 1 M33 86 l3 1.4 M37 81 l3 1.6" stroke="#5a4a12" stroke-width=".8"/>' : '';
    return `<svg class="avatar" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="${look.bg}"/>${hairBack}${look.headOnly ? '' : outfit}<rect x="44" y="58" width="12" height="17" rx="5" fill="${sk2}"/>${look.headOnly ? '' : overNeck}${acc}<ellipse cx="50" cy="46" rx="17" ry="20" fill="${skin}"/>${hairFront}${look.style !== 4 && look.style !== 2 ? `<path d="M37 31 Q44 26 52 27" stroke="#fff" stroke-width="2.2" fill="none" opacity=".22" stroke-linecap="round"/>` : ''}${hat}${clip}${brows}${eyes}<circle cx="38" cy="53" r="3.5" fill="#e88" opacity=".25"/><circle cx="62" cy="53" r="3.5" fill="#e88" opacity=".25"/>${look.headOnly ? '' : shirt}${beard}${nose}${mouth}${glasses}${ear}${look.headOnly ? '' : extra}</svg>`;
  };

  // ---------------- shop interior ----------------
  function wallpaperDef(id) {
    switch (id) {
      case 'botanical': return `<pattern id="wp" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#e7efe3"/><path d="M10 30 Q14 18 22 14 Q18 24 10 30Z M28 12 Q34 6 38 8 Q34 14 28 12Z" fill="#9db69a"/><path d="M10 30 Q16 22 22 14" stroke="#6f8f6c" stroke-width=".8" fill="none"/><circle cx="32" cy="30" r="2" fill="#f1b9c2"/></pattern>`;
      case 'damask': return `<pattern id="wp" width="30" height="40" patternUnits="userSpaceOnUse"><rect width="30" height="40" fill="#f3e3e6"/><path d="M15 6 Q22 14 15 20 Q8 14 15 6Z M15 20 Q24 28 15 36 Q6 28 15 20Z" fill="#e2c4cb"/><circle cx="0" cy="20" r="2.5" fill="#e2c4cb"/><circle cx="30" cy="20" r="2.5" fill="#e2c4cb"/></pattern>`;
      case 'midnight': return `<pattern id="wp" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#26304d"/><path d="M12 4 L14 12 L12 20 L10 12Z" fill="#c99a2e" opacity=".55"/><circle cx="0" cy="0" r="1.2" fill="#e8c15a"/><circle cx="24" cy="24" r="1.2" fill="#e8c15a"/></pattern>`;
      default: return `<pattern id="wp" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fbe9ec"/><rect width="8" height="20" fill="#f6d6dd"/></pattern>`;
    }
  }

  function miniDress(x, y, hex, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-0.8" y="0" width="1.6" height="34" fill="#8c7357"/><ellipse cx="0" cy="34" rx="6" ry="1.6" fill="#8c7357"/><path d="M-5 2 L5 2 L4 10 L9 26 Q0 28 -9 26 L-4 10Z" fill="${hex}" stroke="${darken(hex, 0.35)}" stroke-width=".6"/></g>`;
  }

  // Winnie the Pooh: a round honey-coloured bear in a little red shirt, with his honey pot
  DG.poohSVG = (x, y, s = 1) => `<g class="pooh" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="14" rx="11" ry="12" fill="#e9a93a"/><ellipse cx="0" cy="17" rx="7" ry="8" fill="#f6cf74"/>
    <path d="M-10 6 Q0 1 10 6 L11 13 Q0 16 -11 13 Z" fill="#d23b3b"/>
    <ellipse cx="-11" cy="10" rx="3.4" ry="5" fill="#e9a93a" transform="rotate(25 -11 10)"/><ellipse cx="11" cy="10" rx="3.4" ry="5" fill="#e9a93a" transform="rotate(-25 11 10)"/>
    <ellipse cx="-6" cy="25" rx="4.4" ry="3.2" fill="#e9a93a"/><ellipse cx="6" cy="25" rx="4.4" ry="3.2" fill="#e9a93a"/>
    <circle cx="0" cy="-4" r="9.5" fill="#e9a93a"/><circle cx="-7.5" cy="-11" r="3.4" fill="#e9a93a"/><circle cx="7.5" cy="-11" r="3.4" fill="#e9a93a"/><circle cx="-7.5" cy="-11" r="1.7" fill="#c98a24"/><circle cx="7.5" cy="-11" r="1.7" fill="#c98a24"/>
    <ellipse cx="0" cy="-1" rx="5" ry="3.6" fill="#f6cf74"/><ellipse cx="0" cy="-2.6" rx="1.8" ry="1.2" fill="#3b2a1f"/><path d="M-2 0.6 Q0 2.2 2 0.6" stroke="#3b2a1f" stroke-width=".8" fill="none" stroke-linecap="round"/>
    <circle cx="-3.4" cy="-6" r="1.1" fill="#3b2a1f"/><circle cx="3.4" cy="-6" r="1.1" fill="#3b2a1f"/>
    <g transform="translate(15 18)"><path d="M-5 -6 Q-6 6 0 6 Q6 6 5 -6 Z" fill="#c98a4a"/><ellipse cx="0" cy="-6" rx="5.4" ry="1.8" fill="#a8703a"/><path d="M-4 -6 q1 4 2 1 q1 3 2 0" fill="#f2b632"/><rect x="-4.2" y="-2" width="8.4" height="3.4" fill="#f7efd8"/><text x="0" y=".6" font-size="2.6" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" fill="#7a4a1f">HUNNY</text></g>
  </g>`;

  // ---------------- whole people ----------------
  // A person for the scenes: the portrait head on a slim body with long legs (about 4.5 heads tall,
  // storybook proportions), arms, a dress or trousers and shoes. Placed by the centre x and the feet.
  //   opts: { seated, child, trousers, legs: tights colour, shoes }
  DG.renderFigure = function (look, mood, cx, footY, height, opts = {}) {
    const top = look.top || '#d6577b', td = darken(top, 0.22), tl = lighten(top, 0.25), skin = look.skin;
    const trousers = opts.trousers || look.shirt || look.trousers;
    const legsCol = opts.legs || skin, shoe = opts.shoes || '#3b2a2f', pants = '#3d4a5c';
    const H = opts.child ? 176 : opts.seated ? 196 : 248;
    const b = [];
    const arm = (sx, hx, hy) => `<path d="M${sx} 62 Q${(sx + hx) / 2 + (hx < 50 ? -4 : 4)} ${(62 + hy) / 2} ${hx} ${hy}" stroke="${top}" stroke-width="9.5" stroke-linecap="round" fill="none"/><path d="M${sx} 62 Q${(sx + hx) / 2 + (hx < 50 ? -4 : 4)} ${(62 + hy) / 2} ${hx} ${hy}" stroke="${td}" stroke-width=".8" fill="none" opacity=".4"/><circle cx="${hx}" cy="${hy + 4.5}" r="4.8" fill="${skin}"/>`;
    const leg = (x, y0, y1, col) => `<path d="M${x - 4.8} ${y0} Q${x - 5.2} ${(y0 + y1) / 2} ${x - 3.4} ${y1} L${x + 3.4} ${y1} Q${x + 5.2} ${(y0 + y1) / 2} ${x + 4.8} ${y0} Z" fill="${col}"/>`;
    const shoes = y => `<path d="M35 ${y} q8 -7 16 0 q-8 3 -16 0Z M49 ${y} q8 -7 16 0 q-8 3 -16 0Z" fill="${shoe}"/>`;
    if (opts.child) {
      b.push(leg(44, 112, 168, legsCol) + leg(56, 112, 168, legsCol) + `<ellipse cx="43" cy="170" rx="6.5" ry="3.6" fill="#d6577b"/><ellipse cx="57" cy="170" rx="6.5" ry="3.6" fill="#d6577b"/>`);
      b.push(`<path d="M28 58 Q30 76 36 88 L64 88 Q70 76 72 58 Z" fill="${top}"/><path d="M36 86 L64 86 Q74 102 78 120 Q50 127 22 120 Q26 102 36 86 Z" fill="${top}" stroke="${td}" stroke-width=".8"/><path d="M40 92 Q38 106 34 120 M60 92 Q62 106 66 120" stroke="${td}" stroke-width=".8" opacity=".4" fill="none"/>`);
      b.push(arm(30, 25, 104) + arm(70, 75, 104));
    } else if (opts.seated) {
      const lc = trousers ? pants : legsCol;
      b.push(leg(40, 132, 186, lc) + leg(60, 132, 186, lc) + `<g transform="translate(-4 0)">${shoes(189)}</g>`);
      b.push(`<path d="M27 60 Q29 84 35 106 L65 106 Q71 84 73 60 Z" fill="${top}"/>`);
      // the lap: thighs coming towards us, with two knees
      b.push(`<path d="M30 102 L70 102 Q78 118 74 134 Q62 140 51 134 Q50 131 49 134 Q38 140 26 134 Q22 118 30 102 Z" fill="${trousers ? pants : top}" stroke="${trousers ? '#2b3442' : td}" stroke-width=".8"/>`);
      b.push(arm(30, 38, 116) + arm(70, 62, 116));
    } else {
      if (trousers) b.push(leg(43, 106, 238, pants) + leg(57, 106, 238, pants) + `<path d="M35 104 L65 104 L64 124 L36 124 Z" fill="${pants}"/>` + shoes(242));
      else b.push(leg(43.5, 150, 238, legsCol) + leg(56.5, 150, 238, legsCol) + shoes(242));
      b.push(`<path d="M27 60 Q29 84 35 ${trousers ? 110 : 106} L65 ${trousers ? 110 : 106} Q71 84 73 60 Z" fill="${top}"/>`);
      if (trousers) b.push(`<rect x="35" y="106" width="30" height="4.5" fill="#2b2b30"/>`);
      else b.push(`<path d="M35 104 L65 104 Q76 128 84 160 Q50 170 16 160 Q24 128 35 104 Z" fill="${top}" stroke="${td}" stroke-width=".8"/><path d="M43 110 Q38 134 33 164 M57 110 Q62 134 67 164" stroke="${td}" stroke-width=".9" opacity=".45" fill="none"/><path d="M39 108 Q42 134 44 166" stroke="${tl}" stroke-width="1.6" opacity=".35" fill="none"/>`);
      b.push(arm(30, 23, 138) + arm(70, 77, 138));
    }
    const head = DG.renderAvatar(Object.assign({}, look, { bg: 'transparent' }), mood, 64).replace(/^<svg[^>]*>/, '<svg x="18" y="0" width="64" height="64" viewBox="0 0 100 100" overflow="visible">');
    const w = height * 100 / H;
    const shadow = `<ellipse cx="${cx}" cy="${footY}" rx="${(w * 0.34).toFixed(1)}" ry="${(w * 0.07).toFixed(1)}" fill="#3b2418" opacity=".16"/>`;
    return shadow + `<svg class="figure" x="${(cx - w / 2).toFixed(1)}" y="${(footY - height).toFixed(1)}" width="${w.toFixed(1)}" height="${height.toFixed(1)}" viewBox="0 0 100 ${H}" overflow="visible">${b.join('')}${head}</svg>`;
  };

  const inScene = look => Object.assign({}, look, { bg: 'transparent' });

  // tall: a taller view for a landscape iPad (more wall above, more floor in front, people in the foreground)
  DG.renderShop = function (G, opts = {}) {
    const owned = id => G.decor.owned.includes(id);
    const display = DG.upgradeLevel(G, 'display');
    const se = DG.season(G);
    const out = [];
    out.push(`<defs>${wallpaperDef(G.decor.wallpaper)}
      <pattern id="planks" width="60" height="12" patternUnits="userSpaceOnUse"><rect width="60" height="12" fill="#c49466"/><path d="M0 11.5H60M22 0V12" stroke="#a87a50" stroke-width="1"/></pattern>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${se.sky}"/><stop offset="1" stop-color="${darken(se.sky, 0.12)}"/></linearGradient>
      <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>
      <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d3a6e"/><stop offset=".6" stop-color="#b26a8a"/><stop offset="1" stop-color="#f3a56e"/></linearGradient>
      <linearGradient id="duskRoom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3060" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a4a" stop-opacity=".25"/></linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8dc" stop-opacity=".38"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/></linearGradient>
      <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#5a2a3a" stop-opacity="0"/><stop offset="1" stop-color="#5a2a3a" stop-opacity=".22"/></radialGradient>
      <radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>`);
    if (opts.tall) out.push('<rect x="-300" y="-200" width="1000" height="360" fill="url(#wp)"/><rect x="-300" y="146" width="1000" height="6" fill="#fffaf5"/><rect x="-300" y="152" width="1000" height="300" fill="url(#planks)"/>');
    // wall, skirting, floor
    out.push('<rect width="400" height="150" fill="url(#wp)"/><rect y="146" width="400" height="6" fill="#fffaf5"/><rect y="152" width="400" height="58" fill="url(#planks)"/>');
    // window with awning and display dresses
    out.push('<rect x="14" y="34" width="112" height="98" rx="3" fill="#fffaf5"/><rect x="20" y="40" width="100" height="86" fill="url(#glass)"/>'
      // evening sky fades in once everyone has been helped
      + '<g class="dusk-sky"><rect x="20" y="40" width="100" height="86" fill="url(#duskSky)"/><circle cx="96" cy="54" r="5" fill="#fff4cf"/><circle cx="40" cy="50" r=".8" fill="#fff"/><circle cx="60" cy="58" r=".7" fill="#fff"/><circle cx="76" cy="46" r=".8" fill="#fff"/></g>');
    const winCols = ['#d6577b', '#1e7a58', '#34437f', '#d6a22a'];
    for (let i = 0; i <= display; i++) out.push(miniDress(36 + i * (68 / Math.max(1, display)), 84, winCols[i], 1.05));
    // weather outside the window
    const r = rng(G.day * 31 + 7);
    let wx = '';
    for (let i = 0; i < 14; i++) {
      const x = 22 + r() * 96, y = 42 + r() * 80;
      if (se.id === 'winter') wx += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + r()).toFixed(1)}" fill="#fff"/>`;
      else if (se.id === 'autumn') wx += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.6" ry="1.4" transform="rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${['#d9822b', '#b5481f', '#e2b13c'][i % 3]}"/>`;
      else if (se.id === 'spring' && i < 9) wx += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#f6c6d2"/>`;
    }
    if (se.id === 'summer') wx = '<circle cx="104" cy="54" r="9" fill="#ffd75e"/><circle cx="104" cy="54" r="13" fill="#ffd75e" opacity=".25"/>';
    if (se.id === 'winter') wx += '<rect x="20" y="118" width="100" height="8" fill="#fff"/>';
    out.push(wx);
    out.push('<path d="M20 83H120M70 40V126" stroke="#fffaf5" stroke-width="3"/>');
    let awn = '<path d="M8 22 H132 V34 H8Z" fill="#c44d6c"/>';
    for (let x = 8; x < 132; x += 15.5) awn += `<rect x="${x + 7.7}" y="22" width="7.7" height="12" fill="#fff"/><path d="M${x} 34 q3.9 7 7.75 0 q3.9 7 7.75 0" fill="#c44d6c"/>`;
    out.push(awn);
    if (owned('windowbox')) out.push('<rect x="16" y="130" width="108" height="10" rx="2" fill="#7a5236"/>' + [24, 36, 48, 60, 72, 84, 96, 108, 118].map((x, i) => `<path d="M${x} 130 V122" stroke="#4d7a3e" stroke-width="1.4"/><ellipse cx="${x}" cy="120" rx="3.2" ry="4.2" fill="${['#d6577b', '#f0c443', '#bf2630', '#f1b9c2'][i % 4]}"/>`).join(''));
    // door with sign
    out.push('<rect x="134" y="52" width="44" height="100" rx="2" fill="#2f6f73"/><rect x="140" y="60" width="32" height="40" fill="url(#glass)" opacity=".85"/><rect class="dusk-sky" x="140" y="60" width="32" height="40" fill="url(#duskSky)" opacity=".85"/><circle cx="170" cy="108" r="2.4" fill="#e9c35a"/><rect x="143" y="70" width="26" height="11" rx="2" fill="#fff"/><text x="156" y="78.5" font-size="7" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" fill="#c44d6c">ÅBEN</text>');
    if (owned('neon')) out.push('<rect x="122" y="8" width="68" height="34" rx="6" fill="#2f1d2b"/><text x="156" y="32" font-size="17" text-anchor="middle" font-family="Pacifico, cursive" fill="#ff8fb4" style="filter:drop-shadow(0 0 3px #ff5c9a)">Mie\'s</text>');
    if (owned('plant')) out.push('<path d="M186 152 l4 -18 h16 l4 18Z" fill="#c26a45"/><g fill="#3f7a4a"><path d="M198 134 Q180 120 184 104 Q196 112 198 134Z"/><path d="M198 134 Q214 118 212 100 Q200 110 198 134Z"/><path d="M198 134 Q198 112 204 96 Q190 104 198 134Z"/><path d="M198 134 Q176 132 172 118 Q188 120 198 134Z"/></g>');
    if (owned('gallery')) out.push([[300, 28, 22, 28], [328, 22, 26, 34], [360, 30, 22, 24]].map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffaf5" stroke="#c99a2e" stroke-width="2.5"/>${miniDress(x + w / 2, y + 4, ['#d6577b', '#34437f', '#1e7a58'][i], h / 46)}`).join(''));
    if (owned('mirror')) out.push('<ellipse cx="272" cy="72" rx="15" ry="26" fill="#c99a2e"/><ellipse cx="272" cy="72" rx="11.5" ry="22" fill="url(#glass)"/><path d="M265 60 L270 52 M266 72 L276 58" stroke="#fff" stroke-width="1.6" opacity=".7"/>');
    if (DG.upgradeLevel(G, 'floor')) {
      let st = '';
      for (let i = 0; i < 8; i++) st += `<rect x="${296 + i * 5}" y="${146 - i * 12}" width="${44 - i * 5}" height="6" fill="#9a6b47" stroke="#7a5236" stroke-width=".6"/>`;
      out.push(`${st}<path d="M296 150 L336 56" stroke="#5a3a2a" stroke-width="1.6"/><rect x="306" y="44" width="34" height="11" rx="2" fill="#fffaf5" stroke="#c99a2e"/><text x="323" y="52.5" font-size="7" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" fill="#2f1d2b">1. sal ↑</text>`);
    }
    if (DG.upgradeLevel(G, 'pottery')) {
      out.push('<rect x="184" y="58" width="44" height="3.5" rx="1" fill="#7a5236"/><path d="M188 61.5 l3 6 M224 61.5 l-3 6" stroke="#7a5236" stroke-width="1.5"/>');
      (G.shelf || []).slice(0, 3).forEach((it, i) => {
        out.push(`<svg x="${184 + i * 14}" y="40" width="18" height="18" viewBox="0 20 120 90">${DG.potShapeSVG(it.pot, 'sh' + i)}</svg>`);
      });
    }
    if (owned('rug')) out.push('<ellipse cx="236" cy="178" rx="56" ry="13" fill="#9c2f3c"/><ellipse cx="236" cy="178" rx="47" ry="9.5" fill="none" stroke="#e8c15a" stroke-width="1.6" stroke-dasharray="4 3"/>');
    // dress form with the current order (or a toile)
    const df = G.design && G.active ? DG.renderDress(G.design, 'shopform') : DG.renderDress({ main: null, mainColor: 'white', accent: null, accentColor: 'white', silhouette: 'aline', length: 'knee', neckline: 'round', sleeves: 'none', closure: 'none', extras: [] }, 'shopform');
    out.push(`<svg x="206" y="66" width="60" height="96" viewBox="0 20 200 300">${df.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`);
    if (owned('armchair')) out.push('<path d="M244 162 v-8 h40 v8" stroke="#5a3a2a" stroke-width="2.5" fill="none"/><path d="M242 156 q0 -26 22 -26 q22 0 22 26Z" fill="#6b2a5e"/><rect x="238" y="140" width="10" height="20" rx="4" fill="#5a2050"/><rect x="280" y="140" width="10" height="20" rx="4" fill="#5a2050"/><rect x="246" y="146" width="36" height="10" rx="3" fill="#7d3870"/>');
    // ready-to-wear rack
    if (G.rack.length) {
      out.push('<path d="M296 104 H340 M300 104 V156 M336 104 V156" stroke="#7a5236" stroke-width="2.2"/>');
      G.rack.slice(0, 4).forEach((it, i) => {
        const hex = DG.colorHex(it.design.mainColor);
        out.push(`<path d="M${306 + i * 9} 104 v3" stroke="#555" stroke-width=".8"/><path d="M${302 + i * 9} 108 h8 l3 30 q-7 3 -14 0Z" fill="${hex}" stroke="${darken(hex, 0.35)}" stroke-width=".6"/>`);
      });
    }
    // counter with Mie and the register
    out.push(DG.renderAvatar(inScene(DG.mieLook(G)), 'happy', 44).replace('<svg', '<svg x="348" y="80"'));
    out.push('<rect x="338" y="118" width="62" height="36" rx="2" fill="#7a5236"/><rect x="338" y="114" width="62" height="6" rx="2" fill="#9a6b47"/><rect x="384" y="102" width="14" height="12" rx="2" fill="#2f1d2b"/><rect x="386" y="104" width="10" height="4" fill="#9db69a"/>');
    if (owned('espresso')) out.push('<rect x="342" y="100" width="14" height="14" rx="2" fill="#b9bcc2"/><rect x="345" y="96" width="8" height="5" rx="1" fill="#2f1d2b"/><rect x="346" y="108" width="5" height="5" fill="#fff"/><path d="M349 106 q2 -3 0 -6" stroke="#ccc" stroke-width=".8" fill="none"/>');
    // staff
    const staffSlots = { apprentice: [205, 194], assistant: [311, 198] };
    DG.STAFF.forEach(st => { if (G.staff[st.id]) out.push(DG.renderFigure(st.look, 'happy', staffSlots[st.id][0], staffSlots[st.id][1], 80, { trousers: st.id === 'apprentice' })); });
    if (opts.tall) out.push('<ellipse cx="170" cy="318" rx="190" ry="18" fill="#000" opacity=".06"/>');
    // waiting customers
    // waiting customers: along the window, or in the foreground of the taller view
    G.queue.slice(0, 5).forEach((c, i) => out.push(`<g class="tap idle" style="animation-delay:-${(i * 0.9).toFixed(1)}s" data-act="openreq" data-arg="${i}">` + (opts.tall
      ? DG.renderFigure(c.look, 'neutral', 38 + i * 62, 312 + (i % 2) * 12, 122, { legs: c.look.tights, shoes: c.look.shoes })
      : DG.renderFigure(c.look, 'neutral', 31 + i * 30, 197 + (i % 2) * 8, 80, { legs: c.look.tights, shoes: c.look.shoes })) + '</g>'));
    if (owned('chandelier')) out.push('<ellipse cx="236" cy="40" rx="50" ry="26" fill="url(#glow)"/><path d="M236 -60 V18" stroke="#c99a2e" stroke-width="1.5"/><path d="M216 26 Q236 40 256 26 M222 22 H250" stroke="#c99a2e" stroke-width="2" fill="none"/>' + [216, 226, 236, 246, 256].map(x => `<path d="M${x} 26 l-2 6 l2 4 l2 -4Z" fill="#dff0fa" stroke="#9fc7de" stroke-width=".5"/>`).join(''));
    // daylight falling in through the window, and a soft warm vignette
    out.push('<g class="sunbeam" pointer-events="none"><path d="M24 44 L118 44 L190 210 L60 210 Z" fill="url(#beam)"/></g>');
    out.push('<rect class="vignette" x="-300" y="-200" width="1000" height="700" fill="url(#vig)" pointer-events="none"/>');
    // evening: warm light over the room and lamps glowing (CSS fades it in and out)
    out.push('<rect class="dusk" x="-300" y="-200" width="1000" height="700" fill="url(#duskRoom)" pointer-events="none"/><g class="lamp-glow" pointer-events="none"><ellipse cx="236" cy="60" rx="90" ry="60" fill="url(#lamp)"/><ellipse cx="360" cy="150" rx="70" ry="40" fill="url(#lamp)"/></g>');
    const evening = G.day > 0 && G.today && !G.queue.length && !G.active;
    return `<svg class="shop-scene${evening ? ' evening' : ''}" viewBox="${opts.tall ? '0 -60 400 400' : '0 0 400 210'}"${opts.tall ? ' preserveAspectRatio="xMidYMax slice"' : ''} role="img" aria-label="Mie's shop">${out.join('')}</svg>`;
  };

  // ---------------- pottery ----------------
  const POT_BODY = {
    cup: 'M40 60 L80 60 L77 98 Q60 102 43 98 Z',
    bowl: 'M24 66 L96 66 Q92 97 60 99 Q28 97 24 66 Z',
    plate: 'M14 88 Q60 70 106 88 Q60 106 14 88 Z',
    vase: 'M50 30 L70 30 L68 42 Q94 60 85 86 Q78 100 60 100 Q42 100 35 86 Q26 60 52 42 Z',
    teapot: 'M30 78 Q30 54 60 54 Q90 54 90 78 Q90 100 60 100 Q30 100 30 78 Z',
    mug: 'M38 56 L82 56 L82 98 Q60 102 38 98 Z',
    planter: 'M30 62 L90 62 L82 98 Q60 102 38 98 Z',
    jug: 'M48 40 L72 40 L70 50 Q90 64 86 86 Q80 100 60 100 Q40 100 34 86 Q30 64 50 50 Z',
    amphora: 'M52 28 L68 28 L66 40 Q92 52 84 80 Q76 100 60 102 Q44 100 36 80 Q28 52 54 40 Z',
  };
  const POT_RIM = { cup: [60, 60, 20, 4], bowl: [60, 66, 36, 6], plate: [60, 87, 30, 6], vase: [60, 30, 10, 3], teapot: [60, 55, 17, 4],
    mug: [60, 56, 22, 4], planter: [60, 56, 32, 5], jug: [60, 40, 12, 3], amphora: [60, 28, 9, 2.5] };
  DG.POT_BODY = POT_BODY;

  // ---- brush strokes on pots ----
  const f1 = x => (Math.round(x * 10) / 10).toString();
  // pts: [{x, y, r}] centre line with radius. Returns a filled outline path (round ends).
  DG.brushOutline = function (pts) {
    if (!pts.length) return '';
    if (pts.length === 1 || pts.every(q => Math.hypot(q.x - pts[0].x, q.y - pts[0].y) < 0.5)) {
      const { x, y, r } = pts[0];
      return `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
    }
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const { x, y, r } = pts[i];
      L.push([x - dy * r, y + dx * r]); R.push([x + dy * r, y - dx * r]);
    }
    // quadratic curves through the midpoints keep the edge smooth
    const curve = Q => {
      let out = '';
      for (let i = 1; i < Q.length - 1; i++) out += `Q${f1(Q[i][0])} ${f1(Q[i][1])} ${f1((Q[i][0] + Q[i + 1][0]) / 2)} ${f1((Q[i][1] + Q[i + 1][1]) / 2)}`;
      const z = Q[Q.length - 1];
      return out + `L${f1(z[0])} ${f1(z[1])}`;
    };
    const Rr = R.slice().reverse();
    const re = pts[pts.length - 1].r, rs = pts[0].r;
    return `M${f1(L[0][0])} ${f1(L[0][1])}` + curve(L)
      + `A${f1(re)} ${f1(re)} 0 0 0 ${f1(Rr[0][0])} ${f1(Rr[0][1])}` + curve(Rr)
      + `A${f1(rs)} ${f1(rs)} 0 0 0 ${f1(L[0][0])} ${f1(L[0][1])}Z`;
  };
  // brush strokes are saved as their centre line; the outline is worked out once per stroke
  const outlines = new WeakMap();
  DG.strokePath = function (st) {
    let d = outlines.get(st);
    if (d == null) {
      d = DG.brushOutline(String(st.p || '').split(',').filter(Boolean).map(t => { const [x, y, r] = t.split(' ').map(Number); return { x, y, r }; }));
      outlines.set(st, d);
    }
    return d;
  };

  // Inner SVG content (no wrapper) for a pot. opts.raw = unglazed wet clay, opts.grow = 0..1 throwing progress.
  DG.potShapeSVG = function (pot, uid, opts = {}) {
    const clay = byId(DG.CLAYS, pot.clay), glaze = byId(DG.GLAZES, pot.glaze), deco = byId(DG.POT_DECOS, pot.deco);
    const base = opts.raw ? darken(clay.hex, 0.12) : glaze.hex || clay.hex;
    const P = `pot${uid}`;
    const body = POT_BODY[pot.shape];
    const [rx, ry, rw, rh] = POT_RIM[pot.shape];
    const defs = `<defs><clipPath id="${P}c"><path d="${body}"/></clipPath>
      <linearGradient id="${P}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".3" stop-color="#fff" stop-opacity="${opts.raw ? 0.1 : 0.35}"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient></defs>`;
    const parts = [];
    const line = darken(base, 0.35);
    if (pot.shape === 'cup') parts.push(`<path d="M79 68 q16 4 1 22" stroke="${base}" stroke-width="5" fill="none"/><path d="M79 68 q16 4 1 22" stroke="${line}" stroke-width=".8" fill="none"/>`);
    if (pot.shape === 'teapot') parts.push(`<path d="M30 70 Q12 78 30 92" stroke="${base}" stroke-width="5" fill="none"/><path d="M88 74 Q100 70 106 56 L110 58 Q106 78 90 88 Z" fill="${base}" stroke="${line}" stroke-width=".8"/>`);
    const handle = d => `<path d="${d}" stroke="${line}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${base}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    if (pot.shape === 'mug') parts.push(handle('M81 64 Q102 64 101 78 Q100 92 81 92'));
    if (pot.shape === 'jug') parts.push(handle('M71 46 Q94 50 84 78') + `<path d="M48 40 L36 34 L50 46 Z" fill="${base}" stroke="${line}" stroke-width=".8"/>`);
    if (pot.shape === 'amphora') parts.push(handle('M54 36 Q36 38 41 58') + handle('M66 36 Q84 38 79 58'));
    parts.push(`<path d="${body}" fill="${base}" stroke="${line}" stroke-width=".9"/>`);
    const det = [];
    if (!opts.raw) {
      if (glaze.speckle) { const r = rng(5); for (let i = 0; i < 40; i++) det.push(`<circle cx="${(15 + r() * 90).toFixed(1)}" cy="${(28 + r() * 75).toFixed(1)}" r=".7" fill="#6b5a45" opacity=".6"/>`); }
      if (pot.glaze === 'lustre') det.push('<rect x="0" y="0" width="120" height="120" fill="#fff3b0" opacity=".15"/>');
      if (pot.deco === 'carved') for (let y = 62; y < 100; y += 8) det.push(`<path d="M10 ${y} Q60 ${y + 4} 110 ${y}" stroke="${darken(base, 0.3)}" stroke-width="1.2" fill="none"/>`);
      if (pot.deco === 'painted') {
        const fc = lum(base) < 0.5 ? '#f6e7c8' : '#2f4f9e';
        [[48, 80], [62, 74], [74, 84], [56, 90]].forEach(([x, y]) => {
          for (let k = 0; k < 5; k++) { const a = k * 1.2566; det.push(`<circle cx="${(x + Math.cos(a) * 2.6).toFixed(1)}" cy="${(y + Math.sin(a) * 2.6).toFixed(1)}" r="1.7" fill="${fc}"/>`); }
          det.push(`<circle cx="${x}" cy="${y}" r="1.1" fill="#e9c35a"/>`);
        });
      }
    }
    // brush strokes (f) are filled outlines; pots painted before brushes have plain lines
    if (!opts.raw && pot.paint) pot.paint.forEach(st => det.push(st.f ? `<path d="${DG.strokePath(st)}" fill="${st.c}"/>` : `<path d="${st.d}" stroke="${st.c}" stroke-width="${st.w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`));
    if (opts.raw) for (let y = 40; y < 100; y += 5) det.push(`<path d="M10 ${y} Q60 ${y + 2} 110 ${y}" stroke="${darken(base, 0.18)}" stroke-width=".6" fill="none" opacity=".7"/>`);
    parts.push(`<g clip-path="url(#${P}c)">${det.join('')}<rect x="0" y="0" width="120" height="120" fill="url(#${P}g)"/></g>`);
    if (pot.shape !== 'plate') parts.push(`<ellipse cx="${rx}" cy="${ry}" rx="${rw}" ry="${rh}" fill="${darken(base, 0.25)}" stroke="${line}" stroke-width=".8"/>`);
    else parts.push(`<ellipse cx="60" cy="88" rx="30" ry="6" fill="${darken(base, 0.08)}" stroke="${line}" stroke-width=".5"/>`);
    if (pot.shape === 'planter') {
      parts.push(`<path d="M27 56 H93 V64 H27 Z" fill="${base}" stroke="${line}" stroke-width=".8"/>`);
      if (!opts.raw && !opts.noPlant) parts.push('<g fill="#4d8a4e"><path d="M60 54 Q44 36 48 22 Q58 34 60 54Z"/><path d="M60 54 Q76 34 74 20 Q62 32 60 54Z"/><path d="M60 54 Q60 30 66 16 Q54 26 60 54Z"/></g>');
    }
    if (pot.shape === 'teapot') parts.push(`<ellipse cx="60" cy="55" rx="15" ry="3.5" fill="${base}" stroke="${line}" stroke-width=".8"/><circle cx="60" cy="49" r="4" fill="${base}" stroke="${line}" stroke-width=".8"/>`);
    if (!opts.raw && pot.deco === 'goldrim') parts.push(`<ellipse cx="${rx}" cy="${ry}" rx="${pot.shape === 'plate' ? 44 : rw}" ry="${pot.shape === 'plate' ? 11 : rh}" fill="none" stroke="#e3b53b" stroke-width="2.2"/>`);
    const g = opts.grow == null ? 1 : 0.25 + 0.75 * opts.grow;
    return `${defs}<g class="pot-grow" transform="translate(0 100) scale(1 ${g.toFixed(3)}) translate(0 -100)">${parts.join('')}</g>`;
  };

  DG.renderPot = function (pot, uid = 'pot', opts = {}) {
    const wheel = opts.wheel ? '<ellipse cx="60" cy="104" rx="48" ry="8" fill="#8f8a84"/><ellipse class="wheel-spin" cx="60" cy="102" rx="44" ry="6.5" fill="#b4aea6" stroke="#6f6a63" stroke-width="1" stroke-dasharray="6 5"/>' : '<ellipse cx="60" cy="103" rx="40" ry="5" fill="#000" opacity=".12"/>';
    return `<svg class="pot-svg" viewBox="0 20 120 92" role="img" aria-label="${byId(DG.POT_SHAPES, pot.shape).name}">${wheel}${DG.potShapeSVG(pot, uid, opts)}</svg>`;
  };

  // ---------------- Dexter the cat ----------------
  // mood: 'sit' | 'sleep' | 'purr' | 'hungry'
  DG.renderDexter = function (mood = 'sit') {
    const fur = '#8d8f96', dark = '#5d6068', belly = '#e9e6e1';
    const stripes = `<path d="M-6 -2 q4 2 0 6 M0 -4 q4 3 0 7 M6 -2 q4 2 0 6" stroke="${dark}" stroke-width="1.6" fill="none"/>`;
    if (mood === 'sleep') {
      return `<g class="dexter sleep"><ellipse cx="0" cy="0" rx="18" ry="9" fill="${fur}"/>${stripes}<circle cx="-14" cy="-3" r="7" fill="${fur}"/><path d="M-19 -8 l2 -6 l3 5Z M-12 -9 l3 -5 l1 6Z" fill="${fur}"/><path d="M-17 -3 q2 1 4 0 M-12 -3 q2 1 3 0" stroke="#333" stroke-width=".8" fill="none"/><path d="M16 2 q8 4 0 8" stroke="${fur}" stroke-width="4" fill="none" stroke-linecap="round"/><text x="2" y="-12" font-size="7" fill="#7b6573" class="zzz">z z</text></g>`;
    }
    const eyes = mood === 'purr' ? '<path d="M-5 -19 q2 -2 4 0 M2 -19 q2 -2 4 0" stroke="#333" stroke-width="1" fill="none"/>'
      : `<ellipse cx="-3.5" cy="-19" rx="1.6" ry="${mood === 'hungry' ? 2.4 : 2}" fill="#7bbf5a"/><ellipse cx="3.5" cy="-19" rx="1.6" ry="${mood === 'hungry' ? 2.4 : 2}" fill="#7bbf5a"/><path d="M-3.5 -20.5 v3 M3.5 -20.5 v3" stroke="#222" stroke-width=".8"/>`;
    const hearts = mood === 'purr' ? '<g class="hearts-up"><text x="10" y="-30" font-size="8">💗</text><text x="-16" y="-34" font-size="6">💗</text></g>' : '';
    const bubble = mood === 'hungry' ? '<g><rect x="8" y="-44" width="30" height="14" rx="6" fill="#fff" stroke="#bbb"/><text x="23" y="-34" font-size="8" text-anchor="middle" fill="#333">Mjav!</text></g>' : '';
    return `<g class="dexter ${mood}"><path d="M10 6 q14 -2 10 -16" stroke="${fur}" stroke-width="4" fill="none" stroke-linecap="round" class="tail"/>
      <ellipse cx="0" cy="0" rx="11" ry="10" fill="${fur}"/><ellipse cx="0" cy="3" rx="6" ry="6" fill="${belly}"/>${stripes}
      <circle cx="0" cy="-17" r="8.5" fill="${fur}"/><path d="M-8 -21 l1 -9 l6 5Z M8 -21 l-1 -9 l-6 5Z" fill="${fur}"/><path d="M-6.5 -24 l.8 -4 l3 2.6Z M6.5 -24 l-.8 -4 l-3 2.6Z" fill="#e9b5bd"/>
      <path d="M-2 -21 l2 -3 l2 3" stroke="${dark}" stroke-width="1" fill="none"/>${eyes}<path d="M-1 -15.5 h2 l-1 1.2Z" fill="#e88"/>
      <path d="M-3 -14 q3 2 6 0" stroke="#333" stroke-width=".6" fill="none"/><path d="M-9 -16 h-6 M-9 -14.5 l-6 1 M9 -16 h6 M9 -14.5 l6 1" stroke="#ddd" stroke-width=".5"/>
      <ellipse cx="-5" cy="9" rx="3" ry="2" fill="${belly}"/><ellipse cx="5" cy="9" rx="3" ry="2" fill="${belly}"/>${hearts}${bubble}</g>`;
  };

  // ---------------- Mie's home ----------------
  const hearts = (x, y) => `<g class="hearts-pop" pointer-events="none"><text x="${x - 8}" y="${y}" font-size="10">💗</text><text x="${x + 6}" y="${y - 6}" font-size="8">💕</text></g>`;
  DG.renderHome = function (G, opts = {}) {
    const has = id => G.home.items.includes(id);
    const se = DG.season(G);
    const out = [];
    const H = DG.house(G);
    const STYLE = {
      flat:      { wall: '#f4ead9', dot: '#e3d2b5', floor: '#b48b62', line: '#a37c55', win: [22, 22, 92, 84] },
      frb:       { wall: '#e6edf2', dot: '#d3dee6', floor: '#a8805a', line: '#946d48', win: [20, 20, 100, 88] },
      valby:     { wall: '#f3e6d6', dot: '#e8d6bf', floor: '#c49a6c', line: '#ad855a', win: [18, 18, 104, 92] },
      lyngby:    { wall: '#e9efe2', dot: '#d8e3cd', floor: '#c9a27a', line: '#b18a62', win: [16, 16, 112, 96] },
      hellerup:  { wall: '#f6f1ea', dot: '#ece3d6', floor: '#c79a68', line: '#a87c4f', win: [14, 14, 118, 100], herring: true, panels: true },
      strandvej: { wall: '#fbfaf7', dot: '#f0ede6', floor: '#dcc29a', line: '#c4a77a', win: [10, 12, 126, 104], panels: true },
    }[H.id];
    const [wx, wy, ww, wh] = STYLE.win;
    out.push(`<defs><pattern id="homewall" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${STYLE.wall}"/><circle cx="12" cy="12" r="1.6" fill="${STYLE.dot}"/></pattern>
      <pattern id="herring" width="20" height="10" patternUnits="userSpaceOnUse"><rect width="20" height="10" fill="${STYLE.floor}"/><path d="M0 10 L10 0 M10 10 L20 0" stroke="${STYLE.line}" stroke-width="1.2"/><path d="M0 0 L10 10 M10 0 L20 10" stroke="${STYLE.line}" stroke-width=".5" opacity=".6"/></pattern>
      <linearGradient id="homesky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.sky}"/><stop offset="1" stop-color="${darken(se.sky, 0.1)}"/></linearGradient>
      <clipPath id="homewin"><rect x="${wx + 6}" y="${wy + 6}" width="${ww - 12}" height="${wh - 12}"/></clipPath></defs>`);
    if (opts.tall) out.push(`<rect x="-300" y="-200" width="1000" height="350" fill="url(#homewall)"/><rect x="-300" y="150" width="1000" height="300" fill="${STYLE.herring ? 'url(#herring)' : STYLE.floor}"/><path d="M-300 150 H700" stroke="${darken(STYLE.floor, 0.25)}" stroke-width="3"/>`);
    out.push(`<rect width="400" height="150" fill="url(#homewall)"/>${STYLE.panels ? `<rect y="112" width="400" height="38" fill="${darken(STYLE.wall, 0.04)}"/><path d="M0 112 H400" stroke="${darken(STYLE.wall, 0.15)}" stroke-width="2"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${8 + i * 50}" y="118" width="40" height="26" fill="none" stroke="${darken(STYLE.wall, 0.12)}"/>`).join('') : ''}`);
    out.push(`<rect y="150" width="400" height="60" fill="${STYLE.herring ? 'url(#herring)' : STYLE.floor}"/><path d="M0 150 H400" stroke="${darken(STYLE.floor, 0.25)}" stroke-width="3"/>`);
    if (!STYLE.herring) for (let x = 0; x < 400; x += 50) out.push(`<path d="M${x} 152 V210" stroke="${STYLE.line}" stroke-width="1"/>`);
    // the view outside depends on where the family lives
    const ix = wx + 6, iy = wy + 6, iw = ww - 12, ih = wh - 12, gy = iy + ih * 0.68;
    const snow = se.id === 'winter';
    const grass = snow ? '#f4f6f8' : se.id === 'autumn' ? '#a9a253' : '#7fb069';
    const v = [`<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#homesky)"/>`];
    if (se.id === 'summer') v.push(`<circle cx="${ix + iw - 16}" cy="${iy + 14}" r="8" fill="#ffd75e"/>`);
    if (H.view === 'city') {
      [[0, 30, '#b9b2a6'], [16, 18, '#c98f6b'], [34, 36, '#a9a39a'], [56, 24, '#d0b48a'], [72, 40, '#b7aca0']].forEach(([dx, hgt, c]) => {
        v.push(`<rect x="${ix + dx}" y="${iy + ih - hgt}" width="18" height="${hgt}" fill="${c}"/>`);
        for (let yy = iy + ih - hgt + 5; yy < iy + ih - 4; yy += 8) v.push(`<rect x="${ix + dx + 4}" y="${yy}" width="3" height="4" fill="#fdf3c9"/><rect x="${ix + dx + 11}" y="${yy}" width="3" height="4" fill="#fdf3c9"/>`);
        if (snow) v.push(`<rect x="${ix + dx}" y="${iy + ih - hgt - 2}" width="18" height="3" fill="#fff"/>`);
      });
      v.push(`<path d="M${ix + 52} ${iy + ih - 40} l3 -16 l3 16 Z" fill="#6aa58f"/>`);   // copper spire
    } else if (H.view === 'trees') {
      [[14, 30, 16], [44, 24, 20], [74, 32, 15]].forEach(([dx, dy, r]) => v.push(`<rect x="${ix + dx - 2}" y="${iy + dy}" width="4" height="${ih}" fill="#7a5236"/><circle cx="${ix + dx}" cy="${iy + dy}" r="${r}" fill="${snow ? '#e8eef2' : se.id === 'autumn' ? '#d9822b' : '#5f9a5a'}"/>`));
      v.push(`<rect x="${ix}" y="${iy + ih - 18}" width="${iw}" height="3" fill="#444"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${ix + i * iw / 12}" y="${iy + ih - 18}" width="1.6" height="18" fill="#444"/>`).join(''));
    } else {
      v.push(`<rect x="${ix}" y="${gy}" width="${iw}" height="${ih}" fill="${H.view === 'sea' ? '#3f7fae' : grass}"/>`);
      if (H.view === 'garden') {
        v.push(`<path d="M${ix} ${gy - 8} H${ix + iw}" stroke="#a0805a" stroke-width="2"/>` + Array.from({ length: 10 }, (_, i) => `<rect x="${ix + i * iw / 10}" y="${gy - 12}" width="3" height="12" fill="#a0805a"/>`).join(''));
        v.push(`<rect x="${ix + iw * 0.7}" y="${gy - 26}" width="3" height="26" fill="#7a5236"/><circle cx="${ix + iw * 0.7 + 1.5}" cy="${gy - 28}" r="11" fill="${snow ? '#eef2f4' : '#5f9a5a'}"/>`);
      } else if (H.view === 'swing') {
        v.push(`<rect x="${ix + 20}" y="${gy - 34}" width="4" height="34" fill="#7a5236"/><circle cx="${ix + 22}" cy="${gy - 38}" r="16" fill="${snow ? '#eef2f4' : '#5f9a5a'}"/>`);
        if (!snow) [[-6, -40], [4, -34], [10, -44], [-2, -30]].forEach(([dx, dy]) => v.push(`<circle cx="${ix + 22 + dx}" cy="${gy + dy}" r="2" fill="#c0392b"/>`));
        v.push(`<path d="M${ix + iw - 40} ${gy} L${ix + iw - 30} ${gy - 30} L${ix + iw - 20} ${gy} M${ix + iw - 30} ${gy - 30} H${ix + iw - 8}" stroke="#5a3a2a" stroke-width="2" fill="none"/><path d="M${ix + iw - 22} ${gy - 30} V${gy - 10} M${ix + iw - 14} ${gy - 30} V${gy - 10}" stroke="#666"/><rect x="${ix + iw - 24}" y="${gy - 10}" width="12" height="3" fill="#c44d6c"/>`);
      } else if (H.view === 'hedge') {
        v.push(`<rect x="${ix}" y="${gy - 18}" width="${iw}" height="18" rx="6" fill="${snow ? '#dfe7e2' : '#3f7a4a'}"/>`);
        if (!snow) for (let k = 0; k < 9; k++) v.push(`<circle cx="${ix + 6 + k * iw / 9}" cy="${gy + 8}" r="2" fill="${['#f1b9c2', '#f0c443', '#fff'][k % 3]}"/>`);
      } else if (H.view === 'sea') {
        v.push(`<path d="M${ix} ${gy - 1} q${iw / 4} -6 ${iw / 2} -2 t${iw / 2} 0 V${gy} H${ix}Z" fill="#8fa89a"/>`);   // the Swedish coast
        for (let k = 0; k < 6; k++) v.push(`<path d="M${ix + 8 + k * 20} ${gy + 10 + (k % 3) * 8} q4 -2 8 0" stroke="#bfe0f5" stroke-width="1" fill="none"/>`);
        [[0.25, 6], [0.62, 14]].forEach(([fx, dy]) => v.push(`<path d="M${ix + iw * fx} ${gy + dy} l8 0 l-3 4 h-3 Z" fill="#fff"/><path d="M${ix + iw * fx + 4} ${gy + dy} V${gy + dy - 12} L${ix + iw * fx + 11} ${gy + dy - 2}Z" fill="#fff"/>`));
        v.push(`<rect x="${ix}" y="${iy + ih - 8}" width="${iw}" height="8" fill="${snow ? '#fff' : '#e9d9b5'}"/>`);
      }
      if (snow && H.view !== 'sea') v.push(`<rect x="${ix}" y="${iy + ih - 6}" width="${iw}" height="6" fill="#fff"/>`);
    }
    const r2 = rng(G.day * 13 + 3);
    for (let k = 0; k < 8; k++) {
      const x = ix + r2() * iw, y = iy + r2() * ih * 0.6;
      if (snow) v.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" fill="#fff"/>`);
      else if (se.id === 'autumn' && k < 4) v.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.4" ry="1.3" fill="#d9822b"/>`);
      else if (se.id === 'spring' && k < 4) v.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#f6c6d2"/>`);
    }
    out.push(`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="3" fill="#fffaf5"/><g clip-path="url(#homewin)">${v.join('')}</g>`);
    out.push(`<path d="M${wx + ww / 2} ${wy + 6} V${wy + wh - 6} M${wx + 6} ${wy + wh / 2} H${wx + ww - 6}" stroke="#fffaf5" stroke-width="3"/><path d="M${wx - 4} ${wy - 4} Q${wx + 8} ${wy + 38} ${wx} ${wy + wh + 4} M${wx + ww + 4} ${wy - 4} Q${wx + ww - 8} ${wy + 38} ${wx + ww} ${wy + wh + 4}" stroke="#c44d6c" stroke-width="6" fill="none"/>`);
    out.push(`<rect x="160" y="6" width="${Math.min(170, 12 + H.name.length * 4.6)}" height="14" rx="3" fill="#fffaf5" opacity=".85"/><text x="166" y="16" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#2f1d2b">${H.name}</text>`);
    // lamp + bookshelf
    out.push('<path d="M150 -60 V22" stroke="#555"/><path d="M138 34 L162 34 L156 22 L144 22 Z" fill="#e9c35a"/><ellipse cx="150" cy="38" rx="26" ry="10" fill="#fff6c8" opacity=".5"/>');
    out.push('<rect x="330" y="40" width="58" height="110" fill="#8a6a48"/><path d="M330 76 H388 M330 112 H388" stroke="#6e5238" stroke-width="3"/>' +
      [[336, 50, '#c44d6c'], [344, 54, '#1d6b6b'], [352, 48, '#e9c35a'], [362, 52, '#34437f'], [338, 86, '#9db69a'], [348, 90, '#ee7d61'], [370, 88, '#6b2a5e']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="7" height="${y < 70 ? 74 - y : 110 - y}" fill="${c}"/>`).join(''));
    // Elizabeth's drawings
    if (has('crayons')) out.push('<rect x="128" y="56" width="26" height="20" fill="#fff" transform="rotate(-4 141 66)"/><path d="M134 72 l6 -10 l6 10Z" fill="#d6577b" transform="rotate(-4 141 66)"/><circle cx="137" cy="62" r="2" fill="#e9c35a"/><rect x="160" y="60" width="22" height="18" fill="#fff" transform="rotate(5 171 69)"/><path d="M164 74 q6 -10 12 0" stroke="#34437f" stroke-width="2" fill="none"/>');
    // sofa
    out.push('<rect x="170" y="104" width="130" height="34" rx="10" fill="#1d6b6b"/><rect x="160" y="112" width="20" height="36" rx="8" fill="#17595a"/><rect x="290" y="112" width="20" height="36" rx="8" fill="#17595a"/><rect x="176" y="126" width="118" height="20" rx="6" fill="#23807f"/><path d="M178 148 v6 M292 148 v6" stroke="#5a3a2a" stroke-width="3"/>');
    out.push('<ellipse cx="230" cy="186" rx="80" ry="14" fill="#d6a22a" opacity=".55"/>');
    // family
    out.push(`<g class="tap${opts.bounce === 'adam' ? ' bounce' : ''}" data-act="tapfamily" data-arg="adam">${DG.renderFigure(DG.FAMILY.adam.look, opts.bounce === 'adam' ? 'ecstatic' : 'happy', 267, 184, 92, { seated: true })}${opts.bounce === 'adam' ? hearts(267, 96) : ''}</g>`);
    out.push(DG.renderFigure(Object.assign({}, DG.mieLook(G), { measure: false }), G.home.happy >= 30 ? 'happy' : 'sad', 217, 184, 92, { seated: true, legs: '#3b3040' }));
    const eMood = G.home.happy >= 60 ? 'ecstatic' : G.home.happy >= 30 ? 'happy' : 'sad';
    // toys
    if (has('teddy')) out.push('<g transform="translate(188 172)"><circle cx="0" cy="0" r="7" fill="#a8743f"/><circle cx="0" cy="-10" r="5.5" fill="#a8743f"/><circle cx="-4" cy="-14" r="2.2" fill="#a8743f"/><circle cx="4" cy="-14" r="2.2" fill="#a8743f"/><circle cx="-1.8" cy="-11" r=".8" fill="#222"/><circle cx="1.8" cy="-11" r=".8" fill="#222"/></g>');
    if (has('train')) out.push('<g transform="translate(236 184)"><rect x="0" y="-8" width="14" height="8" fill="#c44d6c"/><rect x="2" y="-14" width="6" height="6" fill="#c44d6c"/><rect x="16" y="-7" width="11" height="7" fill="#1d6b6b"/><rect x="29" y="-7" width="11" height="7" fill="#e9c35a"/>' + [3, 11, 19, 25, 32, 38].map(x => `<circle cx="${x}" cy="1" r="2" fill="#333"/>`).join('') + '</g>');
    if (has('dollhouse')) out.push('<g transform="translate(286 150)"><rect x="0" y="0" width="34" height="28" fill="#f1b9c2"/><path d="M-3 0 L17 -16 L37 0Z" fill="#c44d6c"/><rect x="5" y="6" width="8" height="8" fill="#dff0fa"/><rect x="21" y="6" width="8" height="8" fill="#dff0fa"/><rect x="13" y="16" width="8" height="12" fill="#7a5236"/></g>');
    if (has('tricycle')) out.push('<g transform="translate(150 186)"><circle cx="0" cy="0" r="7" fill="none" stroke="#333" stroke-width="2"/><circle cx="22" cy="2" r="5" fill="none" stroke="#333" stroke-width="2"/><path d="M0 0 L12 -8 L22 2 M12 -8 L10 -14" stroke="#c44d6c" stroke-width="2.5" fill="none"/></g>');
    if (has('puppets')) out.push('<g transform="translate(118 112)"><rect x="0" y="0" width="34" height="34" fill="#6b2a5e"/><rect x="5" y="5" width="24" height="16" fill="#2f1d2b"/><path d="M5 5 q6 8 0 16 M29 5 q-6 8 0 16" fill="#bf2630"/><circle cx="17" cy="14" r="3" fill="#e9c35a"/></g>');
    // Dexter's things
    if (has('cattower')) out.push('<g transform="translate(70 104)"><rect x="8" y="0" width="5" height="46" fill="#c9b08a"/><rect x="0" y="-4" width="24" height="6" rx="2" fill="#9a6b47"/><rect x="-2" y="20" width="28" height="6" rx="2" fill="#9a6b47"/><rect x="-4" y="44" width="34" height="6" rx="2" fill="#9a6b47"/></g>');
    if (has('scratch')) out.push('<g transform="translate(320 150)"><rect x="4" y="0" width="8" height="34" fill="#c9b08a"/><path d="M4 6 h8 M4 12 h8 M4 18 h8 M4 24 h8" stroke="#a88a5f"/><rect x="0" y="32" width="16" height="4" fill="#9a6b47"/></g>');
    if (has('catbed')) out.push('<ellipse cx="360" cy="190" rx="22" ry="8" fill="#c44d6c"/><ellipse cx="360" cy="187" rx="16" ry="5" fill="#f1b9c2"/>');
    if (has('feather')) out.push('<path d="M100 196 L120 170" stroke="#7a5236" stroke-width="1.5"/><path d="M120 170 q6 -10 2 -16 q-6 6 -2 16" fill="#9db69a"/>');
    // food bowl
    out.push(`<ellipse cx="44" cy="196" rx="10" ry="4" fill="#34437f"/>${G.home.catFood > 0 ? '<ellipse cx="44" cy="194" rx="7" ry="2" fill="#a8743f"/>' : ''}`);
    // Dexter: where he is depends on what he owns and how he feels
    const dmood = opts.dexter || (G.home.catFood <= 0 ? 'hungry' : has('catbed') ? 'sleep' : 'sit');
    const dpos = dmood === 'sleep' && has('catbed') ? [360, 184] : has('cattower') && dmood === 'sit' ? [82, 98] : [70, 184];
    out.push(`<g transform="translate(${dpos[0]} ${dpos[1]})" class="dexter-hit" data-act="pet" role="button" aria-label="Pet Dexter">${DG.renderDexter(dmood)}</g>`);
    // the taller view has room for a soft rug and a big plant in front
    if (opts.tall) out.splice(out.length, 0, '<ellipse cx="160" cy="300" rx="120" ry="22" fill="#e7c9b0"/><ellipse cx="160" cy="300" rx="108" ry="18" fill="none" stroke="#c98f6b" stroke-width="3" stroke-dasharray="6 5"/>'
      + '<g transform="translate(352 238)"><path d="M-14 66 l4 -24 h20 l4 24Z" fill="#c26a45"/><g fill="#4d8a4e"><path d="M0 42 Q-26 20 -20 -8 Q-4 10 0 42Z"/><path d="M0 42 Q24 16 22 -12 Q6 8 0 42Z"/><path d="M0 42 Q-2 6 8 -22 Q-10 0 0 42Z"/><path d="M0 42 Q-30 34 -34 14 Q-14 20 0 42Z"/></g></g>');
    // Elizabeth last, so she is in front of the furniture
    // she grows a little every year (3 years old at the start)
    const grow = Math.min(1.5, 1 + 0.07 * ((DG.elizabethAge ? DG.elizabethAge(G) : 3) - 3));
    const eh = (opts.tall ? 92 : 62) * grow, footY = opts.tall ? 306 : 190;
    const ex = opts.tall ? 143 : has('tricycle') ? 127 : 165;
    out.push(`<g class="tap${opts.bounce === 'elizabeth' ? ' bounce' : ''}" data-act="tapfamily" data-arg="elizabeth">${DG.renderFigure(DG.FAMILY.elizabeth.look, eMood, ex, footY, eh, { child: true })}${opts.bounce === 'elizabeth' ? hearts(ex, footY - eh) : ''}</g>`);
    // Pooh sits next to her, or is hugged when she is tapped
    if (has('pooh')) out.push(`<g class="tap${opts.bounce === 'pooh' ? ' bounce' : ''}" data-act="tapfamily" data-arg="pooh">${DG.poohSVG(ex + eh * 0.38, footY - eh * 0.22, eh / 100)}</g>`);
    return `<svg class="shop-scene home-scene" viewBox="${opts.tall ? '0 -60 400 400' : '0 0 400 210'}"${opts.tall ? ' preserveAspectRatio="xMidYMax slice"' : ''} role="img" aria-label="Mie's home">${out.join('')}</svg>`;
  };

  // Mie: loose dark-brown hair and round glasses
  // ---------------- logo: a tulip with a sewing needle and a golden thread ----------------
  // opts.bg = false draws it without the rounded tile (for inline use next to text).
  DG.logoSVG = function (size = 64, opts = {}) {
    const bg = opts.bg !== false;
    return `<svg class="logo" viewBox="0 0 512 512" width="${size}" height="${size}" aria-hidden="true">
      <defs>
        <linearGradient id="lgbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf0f2"/><stop offset="1" stop-color="#f6d3db"/></linearGradient>
        <linearGradient id="lgpetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f27a9b"/><stop offset="1" stop-color="#c43d63"/></linearGradient>
        <linearGradient id="lgneedle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef1f5"/><stop offset=".5" stop-color="#b9c0ca"/><stop offset="1" stop-color="#8a929e"/></linearGradient>
      </defs>
      ${bg ? '<rect width="512" height="512" rx="' + (opts.square ? 0 : 112) + '" fill="url(#lgbg)"/><circle cx="256" cy="250" r="176" fill="#fff" opacity=".55"/>' : ''}
      <path d="M256 330 C259 372 250 408 256 452" stroke="#4d8a4e" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M254 418 C206 412 176 378 170 334 C218 340 248 372 254 418 Z" fill="#6aa564"/>
      <path d="M258 392 C300 384 326 356 332 318 C292 324 264 350 258 392 Z" fill="#5a9556"/>
      <path d="M170 168 L214 214 L256 132 L298 214 L342 168 C354 256 322 324 256 334 C190 324 158 256 170 168 Z" fill="url(#lgpetal)"/>
      <path d="M256 132 L298 214 C294 270 278 312 256 330 C234 312 218 270 214 214 Z" fill="#f59bb3"/>
      <path d="M232 196 C236 232 244 270 256 300" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
      <path d="M362 100 C440 132 420 220 344 226 C270 232 236 292 298 330 C352 362 372 414 316 444" stroke="#e3b53b" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g transform="rotate(25 300 270)">
        <rect x="292" y="70" width="16" height="330" rx="8" fill="url(#lgneedle)" stroke="#7d8591" stroke-width="2"/>
        <path d="M292 392 L300 452 L308 392 Z" fill="url(#lgneedle)" stroke="#7d8591" stroke-width="2" stroke-linejoin="round"/>
        <rect x="297" y="84" width="6" height="30" rx="3" fill="${bg ? '#fbe3e8' : '#fff'}"/>
      </g>
      <circle cx="398" cy="320" r="7" fill="#e3b53b"/><path d="M398 300 V340 M378 320 H418" stroke="#e3b53b" stroke-width="4" stroke-linecap="round"/>
      <circle cx="132" cy="140" r="5" fill="#f27a9b"/><path d="M132 124 V156 M116 140 H148" stroke="#f27a9b" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  };

  DG.MIE_LOOK = { skin: '#f3cdb0', hair: '#3b2418', style: 1, top: '#2f6f73', bg: '#f6e3d6', glasses: true, earrings: true, measure: true };
})(typeof window !== 'undefined' ? window : globalThis);
