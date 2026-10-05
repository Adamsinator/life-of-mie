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
  DG.renderDress = function (d, uid = 'dress') {
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
    // dress form + stand
    out.push(`<ellipse cx="100" cy="310" rx="34" ry="6" fill="var(--form-dark, #8c7357)"/><rect x="97.5" y="150" width="5" height="160" fill="var(--form-dark, #8c7357)"/>`);
    out.push(`<path d="M91 40 h18 v14 C126 56 133 60 133 66 L129 120 C126 138 131 150 133 160 L67 160 C69 150 74 138 71 120 L67 66 C67 60 74 56 91 54 Z" fill="#e8d7be" stroke="#bda585" stroke-width=".8"/><ellipse cx="100" cy="40" rx="11" ry="5" fill="#d9c3a3" stroke="#bda585" stroke-width=".8"/><ellipse cx="100" cy="36" rx="5" ry="3" fill="#8c7357"/>`);

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
    if (fm && fm.tex === 'sheen') out.push(`<rect x="0" y="40" width="200" height="270" fill="url(#${P}hl)"/>`);
    if (fm && fm.tex === 'velvet') out.push(`<rect x="0" y="40" width="200" height="270" fill="url(#${P}vv)"/>`);
    out.push('</g>');
    out.push(`<path d="M78 ${W} L122 ${W}" stroke="${line}" stroke-width=".8"/>`);

    // ---- details ----
    const has = id => d.extras.includes(id);
    const ribbonHex = fa ? accHex : darken(mainHex, 0.35);

    if (sil === 'wrap') {
      out.push(`<path d="M88 58 L121 ${W} Q${112} ${W + span * 0.55} ${hemR - 12} ${hemY(hemR - 12)}" fill="none" stroke="${line}" stroke-width="1"/>`);
      out.push(`<path d="M121 ${W} q8 6 6 22 M121 ${W} q3 8 -2 20" stroke="${mainFill}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    }
    if (sil === 'shirt') out.push(`<path d="M100 ${neckBottom} V${H - 2}" stroke="${line}" stroke-width=".8" fill="none"/><path d="M103 ${neckBottom} V${H - 2}" stroke="${line}" stroke-width=".5" opacity=".6" fill="none"/>`);

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

    return `<svg class="dress-svg" viewBox="0 20 200 300" role="img" aria-label="Dress preview"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
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
    }[look.style];
    const hairFront = {
      0: `<path d="M32 46 Q31 25 50 24 Q69 25 68 46 Q62 33 50 32 Q40 32 36 40 Q34 44 32 46Z" fill="${hair}"/>`,
      1: `<path d="M32 44 Q32 25 50 24 Q68 25 68 44 Q60 30 46 32 Q38 34 32 44Z" fill="${hair}"/>`,
      2: `<path d="M33 42 Q33 26 50 25 Q67 26 67 42 Q60 31 50 31 Q40 31 33 42Z" fill="${hair}"/>`,
      3: `<path d="M33 40 Q36 26 50 26 Q64 26 67 40 Q58 33 50 34 Q42 33 33 40Z" fill="${hair}"/>`,
      4: `<path d="M32 44 Q30 24 50 23 Q70 24 68 42 Q66 34 56 32 Q44 34 38 32 Q33 36 32 44Z" fill="${hair}"/>`,
    }[look.style];
    const mouth = {
      ecstatic: `<path d="M42 55 Q50 66 58 55 Z" fill="#7a2a33"/><path d="M44 56 Q50 59 56 56" fill="#fff"/>`,
      happy: `<path d="M43 56 Q50 63 57 56" stroke="#7a2a33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      neutral: `<path d="M45 58 Q50 60 55 58" stroke="#7a2a33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      sad: `<path d="M44 60 Q50 54 56 60" stroke="#7a2a33" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      angry: `<path d="M44 60 Q50 55 56 60" stroke="#7a2a33" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    }[mood];
    const brows = mood === 'sad'
      ? '<path d="M39 39 L46 37 M54 37 L61 39" stroke="#3a2a22" stroke-width="1.6" stroke-linecap="round"/>'
      : mood === 'angry'
        ? '<path d="M39 37 L46 40 M54 40 L61 37" stroke="#3a2a22" stroke-width="1.8" stroke-linecap="round"/>'
        : '<path d="M39 39 Q42.5 37 46 39 M54 39 Q57.5 37 61 39" stroke="#3a2a22" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    const eyes = mood === 'ecstatic'
      ? '<path d="M40 46 Q43 43 46 46 M54 46 Q57 43 60 46" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      : '<circle cx="43" cy="46" r="2" fill="#2b2b2b"/><circle cx="57" cy="46" r="2" fill="#2b2b2b"/>';
    const glasses = look.glasses ? '<g fill="none" stroke="#3a2a22" stroke-width="1.3"><circle cx="43" cy="46" r="5.5"/><circle cx="57" cy="46" r="5.5"/><path d="M48.5 46 H51.5"/></g>' : '';
    const ear = look.earrings ? '<circle cx="33" cy="54" r="2" fill="#e9c35a"/><circle cx="67" cy="54" r="2" fill="#e9c35a"/>' : '';
    const extra = look.measure ? '<path d="M24 100 Q30 78 44 74 L48 82 Q36 86 32 100 Z" fill="#f2d54b"/><path d="M30 92 l3 1 M33 86 l3 1.4 M37 81 l3 1.6" stroke="#5a4a12" stroke-width=".8"/>' : '';
    return `<svg class="avatar" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="${look.bg}"/>${hairBack}<path d="M16 100 Q19 76 50 73 Q81 76 84 100 Z" fill="${look.top}"/><rect x="44" y="58" width="12" height="17" rx="5" fill="${sk2}"/><ellipse cx="50" cy="46" rx="17" ry="20" fill="${skin}"/>${hairFront}${brows}${eyes}<circle cx="38" cy="53" r="3.5" fill="#e88" opacity=".25"/><circle cx="62" cy="53" r="3.5" fill="#e88" opacity=".25"/>${mouth}${glasses}${ear}${extra}</svg>`;
  };

  DG.MIE_LOOK = { skin: '#f3cdb0', hair: '#9a3b1c', style: 2, top: '#2f6f73', bg: '#f6e3d6', glasses: true, earrings: true, measure: true };
})(typeof window !== 'undefined' ? window : globalThis);
