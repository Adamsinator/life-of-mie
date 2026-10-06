// Agent Adam: what Adam really does at work. Behind his "normal office job" (a very boring spreadsheet) he is
// Agent A of D.A.N.E., and in a retro 90s run-and-gun he stops Dr. Mørk from stealing Denmark's hygge.
// Everything is drawn on one small canvas (384x216) scaled up with crisp pixels; its own loop runs only while it is open.
(function (g) {
  const DG = (g.DG = g.DG || {});
  const W = 384, H = 216, TS = 16, ROWS = 13, TOP = 8;   // the level sits under an 8 px HUD band
  const GRAV = 760, RUN = 96, JUMP = 285, MAXFALL = 420;
  let L = 'en';
  const T = (en, da) => (L === 'da' ? da : en);

  // ---------------- levels ----------------
  function build(len, theme, def) {
    const m = Array.from({ length: ROWS }, () => Array(len).fill('.'));
    const ents = [];
    const api = {
      ground(a, b, top = 11) { for (let x = a; x <= b; x++) for (let y = top; y < ROWS; y++) m[y][x] = '#'; },
      water(a, b) { for (let x = a; x <= b; x++) { m[11][x] = '~'; m[12][x] = '~'; } },
      block(x, y, w = 1, h = 1) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) m[y + j][x + i] = 'B'; },
      plat(x, y, n) { for (let i = 0; i < n; i++) m[y][x + i] = '='; },
      zap(a, b) { for (let x = a; x <= b; x++) m[10][x] = '^'; },
      e(type, x, y, o) { ents.push(Object.assign({ type, x, y }, o || {})); },
    };
    def(api);
    return { len, theme, map: m.map(r => r.join('')), ents };
  }
  const LEVELS = [
    { id: 'office', name: () => T('The Office', 'Kontoret'), place: 'Kalvebod Brygge',
      brief: () => T("Dr. Mørk's men have sneaked onto the 7th floor dressed as auditors. Clear the office before the ten o'clock meeting.", 'Dr. Mørks mænd har sneget sig ind på 7. sal forklædt som revisorer. Ryd kontoret før mødet klokken ti.'),
      data: () => build(122, 'office', b => {
        b.ground(0, 121);
        [[10, 10, 2, 1], [18, 10, 2, 1], [30, 9, 1, 2], [44, 10, 2, 1], [52, 9, 1, 2], [66, 10, 2, 1], [80, 9, 1, 2], [86, 10, 2, 1], [104, 9, 1, 2]].forEach(a => b.block(...a));
        b.plat(24, 7, 4); b.plat(36, 6, 4); b.plat(58, 7, 5); b.plat(72, 6, 4); b.plat(92, 7, 5); b.plat(108, 6, 4);
        [14, 26, 40, 48, 63, 76, 90, 100, 112].forEach(x => b.e('man', x, 10));
        b.e('drone', 70, 3); b.e('drone', 97, 3);
        [[25, 6], [37, 5], [45, 9], [60, 6], [73, 5], [94, 6], [109, 5], [116, 10]].forEach(([x, y]) => b.e('file', x, y));
        b.e('heal', 56, 10); b.e('flag', 61, 10); b.e('exit', 119, 10);
      }) },
    { id: 'nyhavn', name: () => 'Nyhavn', place: 'Nyhavn',
      brief: () => T('A boat full of stolen candles is about to leave Nyhavn. Mind the water: Agent A cannot swim in a suit.', 'En båd fuld af stjålne stearinlys er ved at sejle fra Nyhavn. Pas på vandet: Agent A kan ikke svømme i jakkesæt.'),
      data: () => build(150, 'nyhavn', b => {
        b.ground(0, 20); b.water(21, 23); b.ground(24, 44); b.water(45, 55); b.block(47, 10, 6, 1); b.ground(56, 80); b.water(81, 84);
        b.ground(85, 110); b.water(111, 113); b.ground(114, 149);
        [[30, 10, 2, 1], [31, 9, 1, 1], [62, 9, 1, 2], [70, 10, 2, 1], [96, 9, 1, 2], [95, 10, 1, 1], [120, 10, 2, 1], [138, 9, 1, 2]].forEach(a => b.block(...a));
        b.plat(36, 7, 4); b.plat(64, 6, 4); b.plat(88, 7, 4); b.plat(126, 7, 5);
        [12, 28, 40, 59, 68, 76, 92, 104, 118, 134, 142].forEach(x => b.e('man', x, 10));
        b.e('turret', 50, 9); b.e('turret', 96, 8);
        b.e('drone', 54, 3); b.e('drone', 100, 3); b.e('drone', 130, 3);
        [[16, 10], [22, 7], [37, 6], [49, 8], [65, 5], [83, 7], [89, 6], [106, 10], [112, 7], [128, 6]].forEach(([x, y]) => b.e('file', x, y));
        b.e('heal', 58, 10); b.e('heal', 116, 10); b.e('power', 66, 5); b.e('flag', 72, 10); b.e('exit', 147, 10);
      }) },
    { id: 'tivoli', name: () => 'Tivoli', place: 'Tivoli',
      brief: () => T("The henchmen are hiding in Tivoli dressed as clowns. Nobody has noticed anything. Watch out for flying cream pies.", 'Håndlangerne gemmer sig i Tivoli forklædt som klovne. Ingen har bemærket noget. Pas på flyvende flødeskumskager.'),
      data: () => build(160, 'tivoli', b => {
        b.ground(0, 30); b.ground(34, 60); b.ground(66, 95); b.ground(100, 159);
        b.plat(31, 8, 3); b.plat(61, 8, 2); b.plat(63, 6, 2); b.plat(96, 8, 4);
        b.plat(12, 7, 4); b.plat(42, 7, 5); b.plat(48, 4, 4); b.plat(74, 7, 4); b.plat(82, 5, 4); b.plat(108, 7, 5); b.plat(118, 4, 4); b.plat(132, 7, 4); b.plat(142, 6, 4);
        [[22, 10, 1, 1], [52, 9, 2, 2], [88, 10, 1, 1], [126, 9, 1, 2], [150, 10, 2, 1]].forEach(a => b.block(...a));
        [16, 26, 38, 46, 56, 70, 79, 90, 104, 114, 122, 138, 148].forEach(x => b.e('man', x, 10));
        b.e('turret', 53, 8); b.e('turret', 126, 8);
        b.e('drone', 30, 3); b.e('drone', 64, 2); b.e('drone', 98, 3); b.e('drone', 136, 2);
        [[13, 6], [32, 7], [43, 6], [49, 3], [62, 7], [83, 4], [97, 7], [110, 6], [119, 3], [143, 5]].forEach(([x, y]) => b.e('file', x, y));
        b.e('heal', 40, 10); b.e('heal', 118, 3); b.e('power', 50, 3); b.e('flag', 80, 10); b.e('exit', 156, 10);
      }) },
    { id: 'metro', name: () => T('The Metro', 'Metroen'), place: 'Kongens Nytorv',
      brief: () => T('Dr. Mørk is escaping through the Metro. Jump the live rails, and mind the gap.', 'Dr. Mørk flygter gennem Metroen. Spring over de strømførende skinner, og pas på afstanden mellem tog og perron.'),
      data: () => build(170, 'metro', b => {
        b.ground(0, 169); b.zap(20, 22); b.zap(48, 50); b.zap(90, 93); b.zap(130, 132); b.zap(150, 151);
        [[12, 10, 2, 1], [34, 10, 2, 1], [58, 9, 1, 2], [70, 10, 2, 1], [102, 9, 1, 2], [116, 10, 2, 1], [140, 10, 1, 1], [158, 9, 1, 2]].forEach(a => b.block(...a));
        b.plat(26, 7, 4); b.plat(42, 6, 4); b.plat(62, 7, 4); b.plat(84, 6, 5); b.plat(108, 7, 4); b.plat(124, 6, 4); b.plat(144, 7, 4);
        [10, 18, 30, 40, 55, 66, 78, 98, 112, 120, 136, 146, 162].forEach(x => b.e('man', x, 10));
        b.e('turret', 58, 8); b.e('turret', 102, 8); b.e('turret', 158, 8);
        b.e('drone', 46, 3); b.e('drone', 76, 3); b.e('drone', 95, 2); b.e('drone', 128, 3); b.e('drone', 152, 2);
        [[21, 8], [27, 6], [43, 5], [49, 8], [63, 6], [86, 5], [92, 8], [109, 6], [125, 5], [145, 6]].forEach(([x, y]) => b.e('file', x, y));
        b.e('heal', 60, 10); b.e('heal', 118, 10); b.e('power', 86, 4); b.e('flag', 64, 10); b.e('flag', 118, 10); b.e('exit', 167, 10);
      }) },
    { id: 'bridge', name: () => T('The Øresund Bridge', 'Øresundsbroen'), place: 'Øresundsbroen',
      brief: () => T("Dr. Mørk's hygge-vacuum is heading for Sweden with every candle in Denmark. Stop him on the bridge!", 'Dr. Mørks hyggesuger er på vej mod Sverige med alle stearinlys i Danmark. Stop ham på broen!'),
      data: () => build(136, 'bridge', b => {
        b.ground(0, 24); b.water(25, 27); b.ground(28, 52); b.water(53, 56); b.plat(54, 8, 2); b.ground(57, 82); b.water(83, 85); b.ground(86, 135);
        [[16, 10, 2, 1], [40, 9, 1, 2], [66, 10, 2, 1], [74, 9, 1, 2], [96, 10, 2, 1]].forEach(a => b.block(...a));
        b.plat(32, 7, 4); b.plat(60, 6, 4); b.plat(90, 7, 4); b.plat(102, 6, 4);
        [12, 22, 34, 46, 62, 70, 80, 92, 100, 106].forEach(x => b.e('man', x, 10));
        b.e('turret', 40, 8); b.e('turret', 74, 8);
        b.e('drone', 30, 3); b.e('drone', 58, 2); b.e('drone', 88, 3); b.e('drone', 104, 2);
        [[18, 9], [26, 7], [33, 6], [55, 7], [61, 5], [84, 7], [91, 6], [103, 5]].forEach(([x, y]) => b.e('file', x, y));
        // the arena: the camera stops, Dr. Mørk arrives
        b.plat(115, 7, 3); b.plat(125, 7, 3); b.plat(120, 5, 3);
        b.e('heal', 60, 5); b.e('heal', 110, 10); b.e('power', 102, 5); b.e('flag', 66, 10); b.e('flag', 110, 10); b.e('boss', 112, 0);
      }) },
  ];
  const ARENA = 112;   // first column of the boss arena (exactly one screen wide)

  const THEMES = {
    office: { sky: ['#2c3e5c', '#56708f', '#8aa2bd'], far: '#3b4f6e', near: '#4f6684', ground: '#5d6b84', top: '#7d8aa3', block: '#8a6a4c', blockTop: '#a5845f', plat: '#b7bfcc', enemy: 'suit' },
    nyhavn: { sky: ['#5ba3d9', '#8cc4ea', '#c6e3f5'], far: '#7aa7c4', near: null, ground: '#7a5a3e', top: '#9a7752', block: '#a8743f', blockTop: '#c48a50', plat: '#9a7752', enemy: 'sailor' },
    tivoli: { sky: ['#1d1442', '#3a2370', '#6b3a8c'], far: '#2a1d55', near: '#3b2a6b', ground: '#4a3b6b', top: '#e24d7a', block: '#e9c35a', blockTop: '#f6dc8c', plat: '#e24d7a', enemy: 'clown' },
    metro: { sky: ['#15161a', '#22242b', '#2e3038'], far: '#24262d', near: '#30333c', ground: '#55585f', top: '#8a8d94', block: '#3f6f9a', blockTop: '#5c8cb8', plat: '#9aa0aa', enemy: 'hood' },
    bridge: { sky: ['#e8794a', '#f3a55e', '#f8d08a'], far: '#c06a55', near: null, ground: '#55585f', top: '#e9e4d8', block: '#8a8d94', blockTop: '#b0b3ba', plat: '#c9cdd3', enemy: 'robot' },
  };

  // ---------------- tiny pixel helpers ----------------
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  function txt(c, s, x, y, col = '#fff', size = 8, align = 'left', shadow = '#000') {
    c.font = `bold ${size}px "Courier New", monospace`; c.textAlign = align; c.textBaseline = 'top';
    if (shadow) { c.fillStyle = shadow; c.fillText(s, Math.round(x) + 1, Math.round(y) + 1); }
    c.fillStyle = col; c.fillText(s, Math.round(x), Math.round(y));
  }
  function wrap(c, s, x, y, maxW, col, size = 8, lh = 11) {
    c.font = `bold ${size}px "Courier New", monospace`;
    let line = '', yy = y;
    for (const w of s.split(' ')) {
      const t2 = line ? line + ' ' + w : w;
      if (c.measureText(t2).width > maxW && line) { txt(c, line, x, yy, col, size); line = w; yy += lh; } else line = t2;
    }
    if (line) txt(c, line, x, yy, col, size);
    return yy + lh;
  }
  const heart = (c, x, y, full) => { const col = full ? '#e8364d' : '#4a2a33'; R(c, x + 1, y, 2, 1, col); R(c, x + 4, y, 2, 1, col); R(c, x, y + 1, 7, 2, col); R(c, x + 1, y + 3, 5, 1, col); R(c, x + 2, y + 4, 3, 1, col); R(c, x + 3, y + 5, 1, 1, col); };

  // Adam: no beard, a light blue shirt and a tie, and (on duty) sunglasses
  function drawAdam(c, x, y, face, frame, shoot, hurt) {
    if (hurt && Math.floor(hurt * 20) % 2) return;
    c.save(); c.translate(Math.round(x) + 5, Math.round(y)); c.scale(face, 1); c.translate(-5, 0);
    const skin = '#f0c8a8', hair = '#6b4a2e', shirt = '#9cc3e6', tie = '#8a2a3a', pants = '#2c3340', shoe = '#141414';
    R(c, 2, 0, 7, 2, hair); R(c, 2, 2, 7, 5, skin); R(c, 2, 2, 1, 2, hair); R(c, 3, 3, 6, 2, '#111'); R(c, 8, 4, 1, 1, '#111');
    R(c, 4, 6, 3, 1, '#c99a80');
    R(c, 1, 7, 9, 8, shirt); R(c, 5, 7, 1, 7, tie); R(c, 4, 7, 3, 1, '#fff');
    const lg = frame % 4;
    if (frame < 0) { R(c, 2, 15, 3, 6, pants); R(c, 6, 15, 3, 6, pants); R(c, 1, 21, 4, 1, shoe); R(c, 6, 21, 4, 1, shoe); }   // jumping
    else if (lg === 1) { R(c, 1, 15, 3, 6, pants); R(c, 6, 15, 3, 5, pants); R(c, 0, 21, 4, 1, shoe); R(c, 7, 20, 4, 1, shoe); }
    else if (lg === 3) { R(c, 2, 15, 3, 5, pants); R(c, 6, 15, 3, 6, pants); R(c, 1, 20, 4, 1, shoe); R(c, 7, 21, 4, 1, shoe); }
    else { R(c, 2, 15, 3, 6, pants); R(c, 6, 15, 3, 6, pants); R(c, 2, 21, 4, 1, shoe); R(c, 6, 21, 4, 1, shoe); }
    // arm and pistol
    R(c, 7, 9, 4, 2, shirt); R(c, 10, 9, 2, 2, skin); R(c, 11, 8, 4, 2, '#3a3d44'); R(c, 11, 10, 1, 2, '#3a3d44');
    if (shoot) { R(c, 15, 7, 3, 4, '#ffe08a'); R(c, 16, 8, 2, 2, '#fff'); }
    c.restore();
  }
  // the henchmen, dressed for each level
  function drawMan(c, x, y, face, kind, frame, flash) {
    c.save(); c.translate(Math.round(x) + 5, Math.round(y)); c.scale(face, 1); c.translate(-5, 0);
    const pal = {
      suit: { body: '#1d1f26', head: '#e6b896', hair: '#2a2a2a', trim: '#fff', legs: '#1d1f26' },
      sailor: { body: '#f2f2f2', head: '#d9a37e', hair: '#1c2a4a', trim: '#1c2a4a', legs: '#1c2a4a' },
      clown: { body: '#e9c35a', head: '#fff3e8', hair: '#e8364d', trim: '#3a86d9', legs: '#3a86d9' },
      hood: { body: '#3b3e46', head: '#c99a80', hair: '#2a2c32', trim: '#55585f', legs: '#25272c' },
      robot: { body: '#9aa0aa', head: '#c9cdd3', hair: '#6b7078', trim: '#e8364d', legs: '#6b7078' },
    }[kind];
    if (flash) Object.keys(pal).forEach(k => { pal[k] = '#fff'; });
    R(c, 2, 0, 7, 2, pal.hair); R(c, 2, 2, 7, 5, pal.head);
    if (kind === 'clown') { R(c, 5, 4, 2, 2, '#e8364d'); R(c, 0, 1, 2, 3, pal.hair); R(c, 9, 1, 2, 3, pal.hair); }
    else if (kind === 'robot') { R(c, 3, 3, 6, 2, '#2a2c32'); R(c, 6, 3, 2, 2, '#e8364d'); }
    else if (kind === 'hood') { R(c, 1, 0, 9, 3, pal.hair); R(c, 1, 2, 2, 5, pal.hair); R(c, 4, 3, 5, 1, '#111'); }
    else R(c, 3, 3, 6, 1, '#111');
    R(c, 1, 7, 9, 8, pal.body);
    if (kind === 'sailor') for (let k = 0; k < 4; k++) R(c, 1, 8 + k * 2, 9, 1, pal.trim);
    else if (kind === 'clown') { R(c, 3, 9, 2, 2, pal.trim); R(c, 6, 12, 2, 2, '#e8364d'); }
    else if (kind === 'suit') { R(c, 4, 7, 3, 3, pal.trim); R(c, 5, 8, 1, 4, '#8a2a3a'); }
    else R(c, 4, 9, 3, 2, pal.trim);
    const lg = frame % 4;
    R(c, lg === 1 ? 1 : 2, 15, 3, 6, pal.legs); R(c, lg === 3 ? 7 : 6, 15, 3, 6, pal.legs); R(c, 1, 21, 4, 1, '#141414'); R(c, 6, 21, 4, 1, '#141414');
    R(c, 7, 9, 4, 2, pal.body); R(c, 11, 8, 3, 2, '#2a2c32');
    c.restore();
  }
  function drawDrone(c, x, y, t, flash) {
    const b = flash ? '#fff' : '#5d636e';
    R(c, x, y + 3, 14, 4, b); R(c, x + 2, y + 7, 10, 2, flash ? '#fff' : '#3b3f47'); R(c, x + 6, y + 8, 2, 2, Math.floor(t * 4) % 2 ? '#e8364d' : '#7a1a26');
    const p = Math.floor(t * 20) % 2 ? 6 : 3;
    R(c, x - 1 + (6 - p) / 2, y + 1, p, 1, '#c9cdd3'); R(c, x + 11 + (6 - p) / 2, y + 1, p, 1, '#c9cdd3'); R(c, x + 1, y + 2, 1, 1, '#c9cdd3'); R(c, x + 12, y + 2, 1, 1, '#c9cdd3');
  }
  function drawTurret(c, x, y, face, flash) {
    R(c, x, y + 6, 14, 10, flash ? '#fff' : '#4a4e57'); R(c, x + 2, y + 2, 10, 6, flash ? '#fff' : '#6b7078'); R(c, x + 5, y + 4, 4, 2, '#e8364d');
    if (face < 0) R(c, x - 6, y + 4, 8, 3, '#2a2c32'); else R(c, x + 12, y + 4, 8, 3, '#2a2c32');
  }
  // Dr. Mørk in his flying hygge-vacuum: a dark saucer, a glass dome, and his monocle
  function drawBoss(c, x, y, t, flash, hpFrac) {
    const hull = flash ? '#fff' : '#3b2a55', rim = flash ? '#fff' : '#6b4a8c';
    R(c, x + 6, y + 18, 52, 10, hull); R(c, x, y + 22, 64, 6, rim); R(c, x + 10, y + 28, 44, 4, hull);
    for (let k = 0; k < 6; k++) R(c, x + 6 + k * 10, y + 24, 4, 2, Math.floor(t * 6 + k) % 3 ? '#ffd27a' : '#e8364d');
    R(c, x + 18, y + 4, 28, 14, '#bfe3f2'); R(c, x + 20, y + 2, 24, 2, '#bfe3f2');
    R(c, x + 26, y + 6, 12, 10, '#e9e4e0'); R(c, x + 26, y + 5, 12, 3, '#1d1f26'); R(c, x + 28, y + 10, 3, 2, '#111'); R(c, x + 34, y + 9, 4, 4, '#e9c35a'); R(c, x + 35, y + 10, 2, 2, '#bfe3f2');
    R(c, x + 30, y + 14, 4, 3, '#1d1f26');   // the goatee
    R(c, x + 28, y + 32, 8, 6, '#5d636e'); R(c, x + 26, y + 38, 12, 3, '#3b3f47');   // the vacuum nozzle
    if (hpFrac < 0.5 && Math.floor(t * 8) % 2) R(c, x + 50, y + 16, 3, 3, '#9aa0aa');   // smoking
  }
  function drawPickup(c, type, x, y, t) {
    const bob = Math.round(Math.sin(t * 4) * 1.5);
    y += bob;
    if (type === 'file') { R(c, x, y + 2, 12, 9, '#e9c35a'); R(c, x, y, 5, 2, '#e9c35a'); R(c, x + 1, y + 4, 10, 6, '#f6dc8c'); R(c, x + 3, y + 6, 6, 1, '#e8364d'); }
    else if (type === 'heal') { R(c, x + 1, y + 4, 10, 6, '#c98a3a'); R(c, x, y + 6, 12, 3, '#d9a04a'); R(c, x + 3, y + 3, 6, 2, '#fff3e0'); R(c, x + 2, y + 5, 8, 1, '#fff3e0'); R(c, x + 5, y + 6, 2, 2, '#b5223a'); }
    else if (type === 'power') { R(c, x, y, 12, 12, '#e9c35a'); R(c, x + 1, y + 1, 10, 10, '#f6dc8c'); txt(c, 'K', x + 3, y + 1, '#8a2a3a', 9, 'left', null); }
  }
  function drawFlag(c, x, y, on, t) {
    R(c, x, y - 4, 2, 26, '#d9d9d9');
    const w = on ? Math.round(Math.sin(t * 6) * 1) : 0;
    R(c, x + 2, y - 4 + w, 14, 9, on ? '#c8102e' : '#6b6b6b'); R(c, x + 6, y - 4 + w, 2, 9, '#fff'); R(c, x + 2, y - 1 + w, 14, 2, '#fff');
  }

  // ---------------- backgrounds and tiles (painted once per level) ----------------
  function paintBackground(theme, len) {
    const th = THEMES[theme], wpx = W + len * TS * 0.5;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(wpx); cv.height = H;
    const c = cv.getContext('2d');
    // banded retro sky
    const bands = th.sky; const bh = Math.ceil(H / 6);
    for (let i = 0; i < 6; i++) R(c, 0, i * bh, cv.width, bh, bands[Math.min(2, Math.floor(i / 2))]);
    const rnd = (() => { let s = theme.length * 9301; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    if (theme === 'tivoli' || theme === 'metro') for (let i = 0; i < 90; i++) R(c, rnd() * cv.width, rnd() * 120, 1, 1, theme === 'tivoli' ? '#fff' : '#3a3d44');
    if (theme === 'office') {   // a glass skyline at dusk, lit windows
      for (let x = 0; x < cv.width; x += 26 + Math.floor(rnd() * 20)) { const h = 60 + rnd() * 90, w = 18 + rnd() * 16; R(c, x, H - h, w, h, th.far); for (let yy = H - h + 6; yy < H; yy += 7) for (let xx = x + 3; xx < x + w - 3; xx += 5) if (rnd() > 0.55) R(c, xx, yy, 2, 3, '#ffd98a'); }
    } else if (theme === 'nyhavn') {   // the coloured houses of Nyhavn and masts
      const cols = ['#e9b44c', '#d9553f', '#4f86c6', '#e88a3a', '#7fb07a', '#c94a6a', '#f2d16b'];
      for (let x = 0, k = 0; x < cv.width; x += 30, k++) { const h = 70 + (k % 3) * 12; R(c, x, H - 40 - h, 30, h, cols[k % cols.length]); R(c, x + 4, H - 40 - h - 8, 22, 8, cols[(k + 3) % cols.length]); for (let yy = H - 34 - h; yy < H - 48; yy += 14) for (let xx = x + 5; xx < x + 26; xx += 8) R(c, xx, yy, 4, 6, '#fff7e8'); }
      for (let x = 20; x < cv.width; x += 90) { R(c, x, H - 120, 2, 80, '#5a3a2a'); R(c, x - 14, H - 100, 30, 1, '#5a3a2a'); }
    } else if (theme === 'tivoli') {   // the ferris wheel, a rollercoaster and strings of lights
      for (let x = 60; x < cv.width; x += 260) {
        c.strokeStyle = '#7a5ab0'; c.lineWidth = 2; c.beginPath(); c.arc(x, 110, 50, 0, Math.PI * 2); c.stroke();
        for (let a = 0; a < 12; a++) { const ax = x + Math.cos(a * Math.PI / 6) * 50, ay = 110 + Math.sin(a * Math.PI / 6) * 50; R(c, ax - 2, ay - 2, 4, 4, ['#ffd27a', '#e24d7a', '#7fd0ff'][a % 3]); }
        R(c, x - 1, 110, 2, 106, '#7a5ab0');
        c.beginPath(); c.moveTo(x + 80, 200); for (let k = 0; k < 8; k++) c.lineTo(x + 90 + k * 18, 120 + (k % 2) * 50); c.stroke();
      }
      for (let x = 0; x < cv.width; x += 6) R(c, x, 40 + Math.sin(x / 30) * 8, 2, 2, ['#ffd27a', '#e24d7a', '#7fd0ff'][Math.floor(x / 6) % 3]);
    } else if (theme === 'metro') {   // tunnel wall with lights and tiles
      R(c, 0, 30, cv.width, 150, '#2a2c33');
      for (let x = 0; x < cv.width; x += 12) for (let y = 34; y < 176; y += 8) R(c, x + ((y / 8) % 2) * 6, y, 11, 7, '#30333b');
      for (let x = 40; x < cv.width; x += 120) { R(c, x, 40, 30, 4, '#fff6c8'); R(c, x - 10, 44, 50, 30, 'rgba(255,246,200,0.06)'); }
      for (let x = 100; x < cv.width; x += 300) { R(c, x, 70, 60, 16, '#3f6f9a'); txt(c, 'M', x + 4, 72, '#fff', 12, 'left', null); txt(c, 'KGS. NYTORV', x + 16, 75, '#fff', 7, 'left', null); }
    } else if (theme === 'bridge') {   // the sea, Sweden on the horizon, pylons and cables
      R(c, 0, 150, cv.width, 66, '#3f7fae'); for (let x = 0; x < cv.width; x += 14) R(c, x + (x % 28 ? 0 : 6), 160 + (x % 3) * 12, 6, 1, '#8fc0e0');
      R(c, 0, 146, cv.width, 4, '#7d8a72');
      for (let x = 120; x < cv.width; x += 340) { R(c, x, 30, 6, 130, '#d9d4c8'); R(c, x + 40, 30, 6, 130, '#d9d4c8'); R(c, x - 4, 26, 54, 5, '#d9d4c8'); c.strokeStyle = '#e9e4d8'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x + 3, 34 + k * 6); c.lineTo(x - 120 + k * 16, 150); c.stroke(); c.beginPath(); c.moveTo(x + 43, 34 + k * 6); c.lineTo(x + 166 - k * 16, 150); c.stroke(); } }
    }
    return cv;
  }
  function paintTiles(lv) {
    const th = THEMES[lv.theme];
    const cv = document.createElement('canvas'); cv.width = lv.len * TS; cv.height = ROWS * TS;
    const c = cv.getContext('2d');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < lv.len; x++) {
      const ch = lv.map[y][x], px = x * TS, py = y * TS;
      if (ch === '#') {
        const top = y === 0 || lv.map[y - 1][x] !== '#';
        R(c, px, py, TS, TS, th.ground);
        if (top) { R(c, px, py, TS, 3, th.top); if (lv.theme === 'bridge' && x % 3 === 0) R(c, px + 4, py + 8, 8, 2, '#e9e4d8'); }
        if (lv.theme === 'nyhavn') { R(c, px, py + 7, TS, 1, '#5e4430'); R(c, px + (y % 2) * 8, py + 3, 1, 13, '#5e4430'); }
        else if (lv.theme === 'office') { if (top) R(c, px, py + 3, TS, 1, '#4a5670'); }
        else if (lv.theme === 'tivoli') { if (top && x % 2) R(c, px, py, TS, 3, '#fff'); }
        else if (lv.theme === 'metro') { if (top) { R(c, px, py + 3, TS, 2, '#e9c35a'); } }
      } else if (ch === 'B') {
        R(c, px, py, TS, TS, th.block); R(c, px, py, TS, 2, th.blockTop); R(c, px, py + TS - 1, TS, 1, 'rgba(0,0,0,.35)');
        if (lv.theme === 'nyhavn' || lv.theme === 'tivoli') { R(c, px + 2, py + 2, 1, 13, 'rgba(0,0,0,.25)'); R(c, px + 13, py + 2, 1, 13, 'rgba(0,0,0,.25)'); R(c, px + 2, py + 8, 12, 1, 'rgba(0,0,0,.25)'); }
        if (lv.theme === 'office') { R(c, px + 3, py + 6, 10, 1, '#5e4430'); R(c, px + 7, py + 9, 2, 1, '#e9c35a'); }
      } else if (ch === '=') {
        R(c, px, py, TS, 4, th.plat); R(c, px, py + 4, TS, 1, 'rgba(0,0,0,.35)');
        if (lv.theme === 'tivoli' && x % 2) R(c, px, py, TS, 4, '#fff');
      } else if (ch === '~') {
        R(c, px, py, TS, TS, '#2f6fae'); if (y === 11) { R(c, px, py, TS, 2, '#7fc0ee'); R(c, px + 3, py + 6, 6, 1, '#7fc0ee'); }
      } else if (ch === '^') {
        R(c, px, py + 12, TS, 4, '#e9c35a'); for (let k = 0; k < 4; k++) R(c, px + k * 4, py + 12, 2, 4, '#1d1f26');
        R(c, px + 3, py + 8, 1, 4, '#7fd0ff'); R(c, px + 10, py + 6, 1, 6, '#7fd0ff');
      }
    }
    return cv;
  }

  // ---------------- the game ----------------
  let root = null, cv = null, ctx = null, raf = 0, last = 0, music = 0, opts = null;
  let S = null;   // the whole state of the screen and the level
  const keys = {}, touch = { left: false, right: false, jump: false, fire: false };

  const solidAt = (lv, tx, ty) => { if (tx < 0 || tx >= lv.len) return true; if (ty < 0 || ty >= ROWS) return false; const ch = lv.map[ty][tx]; return ch === '#' || ch === 'B'; };
  const tileAt = (lv, tx, ty) => (tx < 0 || tx >= lv.len || ty < 0 || ty >= ROWS ? '.' : lv.map[ty][tx]);

  function startLevel(i) {
    const def = LEVELS[i], lv = def.data();
    S = {
      screen: 'brief', level: i, lv, t: 0, bg: paintBackground(lv.theme, lv.len), tiles: paintTiles(lv),
      p: { x: 32, y: 120, vx: 0, vy: 0, w: 10, h: 22, face: 1, ground: false, coyote: 0, buf: 0, cd: 0, hp: 5, hurt: 0, power: 0, frame: 0, anim: 0, shot: 0 },
      cam: 0, shake: 0, ents: [], bullets: [], foes: [], fx: [], score: 0, files: 0, filesTotal: 0, deaths: 0, spawn: { x: 32, y: 120 }, safe: { x: 32, y: 120 },
      boss: null, cleared: false, dead: 0, enemy: THEMES[lv.theme].enemy,
    };
    lv.ents.forEach(e => {
      const x = e.x * TS, y = e.y * TS + TOP;
      if (e.type === 'man') S.foes.push({ kind: 'man', x: x + 3, y: y - 6, w: 10, h: 22, vx: 30, vy: 0, face: -1, hp: lv.theme === 'bridge' ? 3 : 2, cd: 1 + Math.random(), frame: 0, flash: 0 });
      else if (e.type === 'drone') S.foes.push({ kind: 'drone', x, y, baseY: y, w: 14, h: 10, hp: 1, cd: 2 + Math.random(), flash: 0, ph: Math.random() * 6 });
      else if (e.type === 'turret') S.foes.push({ kind: 'turret', x: x + 1, y, w: 14, h: 16, hp: 3, cd: 1.5, face: -1, flash: 0 });
      else if (e.type === 'boss') S.bossAt = x;
      else { S.ents.push({ type: e.type, x: x + 2, y: e.type === 'flag' || e.type === 'exit' ? y - 6 : y + 2, w: 12, h: e.type === 'flag' ? 22 : e.type === 'exit' ? 22 : 12, on: false }); if (e.type === 'file') S.filesTotal++; }
    });
    playMusic(true);
  }

  function hitBox(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // move a body through the tiles (solid blocks, and platforms you can jump up through)
  function moveBody(lv, o, dt, oneWay = true) {
    o.x += o.vx * dt;
    const x0 = Math.floor(o.x / TS), x1 = Math.floor((o.x + o.w - 1) / TS), y0 = Math.floor((o.y - TOP) / TS), y1 = Math.floor((o.y - TOP + o.h - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) {
      if (o.vx > 0 && solidAt(lv, x1, ty)) { o.x = x1 * TS - o.w; o.vx = 0; o.bump = 1; }
      else if (o.vx < 0 && solidAt(lv, x0, ty)) { o.x = (x0 + 1) * TS; o.vx = 0; o.bump = -1; }
    }
    const prevBottom = o.y + o.h;
    o.y += o.vy * dt;
    o.ground = false;
    const ax0 = Math.floor((o.x + 1) / TS), ax1 = Math.floor((o.x + o.w - 2) / TS);
    if (o.vy >= 0) {
      const ty = Math.floor((o.y - TOP + o.h) / TS);
      for (let tx = ax0; tx <= ax1; tx++) {
        const ch = tileAt(lv, tx, ty), topY = ty * TS + TOP;
        if (ch === '#' || ch === 'B' || (oneWay && ch === '=' && prevBottom <= topY + 1 && !o.drop)) { o.y = topY - o.h; o.vy = 0; o.ground = true; break; }
      }
    } else {
      const ty = Math.floor((o.y - TOP) / TS);
      for (let tx = ax0; tx <= ax1; tx++) if (solidAt(lv, tx, ty) && ty >= 0) { o.y = (ty + 1) * TS + TOP; o.vy = 0; break; }
    }
  }

  const input = () => ({
    left: keys.ArrowLeft || keys.KeyA || touch.left, right: keys.ArrowRight || keys.KeyD || touch.right,
    jump: keys.ArrowUp || keys.KeyW || keys.Space || touch.jump, fire: keys.KeyX || keys.KeyJ || keys.KeyK || keys.Enter || touch.fire,
  });

  function hurtPlayer(n = 1) {
    const p = S.p;
    if (p.hurt > 0 || S.dead) return;
    p.hp -= n; p.hurt = 1.1; S.shake = 0.25; sfx('hurt');
    if (p.hp <= 0) { S.dead = 1.4; S.deaths++; sfx('down'); }
  }
  function respawn() {
    const p = S.p;
    Object.assign(p, { x: S.spawn.x, y: S.spawn.y, vx: 0, vy: 0, hp: 5, hurt: 1.5 });
    S.bullets = S.bullets.filter(b => b.mine);
    if (S.boss) { S.boss.hp = Math.min(S.boss.max, S.boss.hp + 4); }
  }

  function addFx(x, y, col, n = 6, sp = 60) { for (let i = 0; i < n; i++) S.fx.push({ x, y, vx: (Math.random() - 0.5) * sp * 2, vy: (Math.random() - 0.8) * sp, t: 0.4 + Math.random() * 0.3, col }); }

  function update(dt) {
    S.t += dt;
    const lv = S.lv, p = S.p, inp = input();
    if (S.dead) { S.dead -= dt; if (S.dead <= 0) { S.dead = 0; respawn(); } updateFx(dt); return; }
    // ---- Adam ----
    const want = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    p.vx = want * RUN; if (want) p.face = want;
    p.coyote = p.ground ? 0.09 : Math.max(0, p.coyote - dt);
    if (inp.jump && !p.jumpHeld) p.buf = 0.12; else p.buf = Math.max(0, p.buf - dt);
    if (p.buf > 0 && p.coyote > 0) { p.vy = -JUMP; p.buf = 0; p.coyote = 0; sfx('jump'); }
    if (!inp.jump && p.vy < -90) p.vy = -90;   // short hop when released early
    p.jumpHeld = inp.jump;
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    moveBody(lv, p, dt);
    if (S.boss && p.x < ARENA * TS) p.x = ARENA * TS;
    p.anim += dt * (want ? 12 : 0); p.frame = p.ground ? (want ? Math.floor(p.anim) : 0) : -1;
    if (p.ground) { const tx = Math.floor((p.x + 5) / TS), ty = Math.floor((p.y - TOP + p.h) / TS); if (tileAt(lv, tx, ty) !== '~') S.safe = { x: p.x, y: p.y }; }
    p.hurt = Math.max(0, p.hurt - dt); p.power = Math.max(0, p.power - dt); p.cd -= dt; p.shot = Math.max(0, p.shot - dt);
    if (inp.fire && p.cd <= 0) {
      p.cd = p.power > 0 ? 0.16 : 0.24; p.shot = 0.06; sfx('shoot');
      const by = p.y + 8, bx = p.face > 0 ? p.x + 16 : p.x - 8;
      const spread = p.power > 0 ? [-40, 0, 40] : [0];
      spread.forEach(vy => S.bullets.push({ mine: true, x: bx, y: by, w: 5, h: 2, vx: 300 * p.face, vy, t: 1.2, dmg: 1 }));
    }
    // falling into the water, off the track, or touching the live rails
    const feetT = tileAt(lv, Math.floor((p.x + 5) / TS), Math.floor((p.y - TOP + p.h - 2) / TS));
    if (p.y > H + 20 || feetT === '~') { hurtPlayer(1); if (!S.dead) Object.assign(p, { x: S.safe.x, y: S.safe.y - 4, vx: 0, vy: 0 }); sfx('splash'); }
    if (feetT === '^' || tileAt(lv, Math.floor((p.x + 5) / TS), Math.floor((p.y - TOP + p.h) / TS)) === '^') { hurtPlayer(1); p.vy = -200; }
    // ---- camera ----
    const maxCam = lv.len * TS - W;
    if (S.boss) S.cam = ARENA * TS;
    else S.cam = Math.max(0, Math.min(maxCam, p.x - W * 0.4));
    if (S.bossAt != null && !S.boss && p.x > ARENA * TS + 40) startBoss();
    // ---- pickups, flags, the exit ----
    S.ents.forEach(e => {
      if (e.gone || !hitBox(p, e)) return;
      if (e.type === 'file') { e.gone = true; S.files++; S.score += 250; sfx('pick'); addFx(e.x + 6, e.y, '#e9c35a', 5); }
      else if (e.type === 'heal') { if (p.hp < 5) { e.gone = true; p.hp = Math.min(5, p.hp + 2); sfx('heal'); } }
      else if (e.type === 'power') { e.gone = true; p.power = 14; sfx('power'); }
      else if (e.type === 'flag' && !e.on) { e.on = true; S.spawn = { x: e.x, y: e.y - 4 }; sfx('flag'); }
      else if (e.type === 'exit' && !S.cleared) finishLevel();
    });
    // ---- enemies ----
    S.foes.forEach(f => {
      if (f.dead) return;
      f.flash = Math.max(0, f.flash - dt); f.cd -= dt;
      const dx = p.x - f.x, dy = p.y - f.y, near = Math.abs(dx) < 200 && f.x > S.cam - 40 && f.x < S.cam + W + 40;
      if (f.kind === 'man') {
        const sees = near && Math.abs(dy) < 50;
        if (sees) { f.face = dx > 0 ? 1 : -1; f.vx = 0; } else if (!f.vx) f.vx = 30 * f.face;
        f.vy = Math.min(MAXFALL, f.vy + GRAV * dt); f.bump = 0;
        moveBody(lv, f, dt);
        // turn at walls and at edges
        const ahead = Math.floor((f.x + (f.vx > 0 ? f.w + 2 : -2)) / TS), below = Math.floor((f.y - TOP + f.h + 2) / TS);
        if (f.bump || (f.ground && f.vx && !solidAt(lv, ahead, below) && tileAt(lv, ahead, below) !== '=')) { f.vx = -f.vx || 30; f.face = f.vx > 0 ? 1 : -1; }
        if (f.vx) f.face = f.vx > 0 ? 1 : -1;
        f.frame = f.vx ? Math.floor(S.t * 8) : 0;
        if (sees && f.cd <= 0) {
          f.cd = 1.3 + Math.random() * 0.8;
          if (S.enemy === 'clown') S.bullets.push({ x: f.x + 5, y: f.y + 6, w: 6, h: 4, vx: f.face * 120, vy: -170, grav: true, t: 3, pie: true });
          else S.bullets.push({ x: f.x + (f.face > 0 ? 14 : -4), y: f.y + 9, w: 4, h: 2, vx: f.face * 150, vy: 0, t: 2.5 });
          sfx('eshoot');
        }
        if (f.y > H + 30) f.dead = true;
      } else if (f.kind === 'drone') {
        f.ph += dt;
        if (near) f.x += Math.sign(dx) * Math.min(Math.abs(dx), 34 * dt);
        f.y = f.baseY + Math.sin(f.ph * 2.2) * 6;
        if (near && Math.abs(dx) < 30 && f.cd <= 0) { f.cd = 2.2; S.bullets.push({ x: f.x + 6, y: f.y + 10, w: 3, h: 4, vx: 0, vy: 90, grav: true, t: 3, bomb: true }); sfx('eshoot'); }
      } else if (f.kind === 'turret') {
        f.face = dx > 0 ? 1 : -1;
        if (near && Math.abs(dy) < 60 && f.cd <= 0) { f.cd = 2; S.bullets.push({ x: f.x + (f.face > 0 ? 20 : -6), y: f.y + 5, w: 4, h: 2, vx: f.face * 170, vy: 0, t: 2.5 }); sfx('eshoot'); }
      }
      if (!f.dead && p.hurt <= 0 && hitBox(p, f)) hurtPlayer(1);
    });
    if (S.boss) updateBoss(dt);
    // ---- bullets ----
    S.bullets.forEach(b => {
      b.t -= dt; if (b.grav) b.vy += GRAV * 0.6 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const tx = Math.floor((b.x + b.w / 2) / TS), ty = Math.floor((b.y - TOP + b.h / 2) / TS);
      if (solidAt(lv, tx, ty) && ty >= 0) { b.t = 0; addFx(b.x, b.y, b.mine ? '#ffe08a' : '#f6dc8c', 3, 30); if (b.pie) addFx(b.x, b.y, '#fff', 6, 40); }
      if (b.t <= 0) return;
      if (b.mine) {
        for (const f of S.foes) if (!f.dead && hitBox(b, f)) {
          b.t = 0; f.hp -= b.dmg; f.flash = 0.1; sfx('hit');
          if (f.hp <= 0) { f.dead = true; S.score += f.kind === 'turret' ? 200 : f.kind === 'drone' ? 150 : 100; addFx(f.x + f.w / 2, f.y + f.h / 2, '#ff9a3a', 12, 90); sfx('boom'); }
          break;
        }
        if (b.t > 0 && S.boss && !S.boss.down && hitBox(b, S.boss)) {
          b.t = 0; S.boss.hp -= b.dmg; S.boss.flash = 0.08; sfx('hit');
          if (S.boss.hp <= 0) bossDown();
        }
      } else if (hitBox(b, p)) { b.t = 0; hurtPlayer(1); if (b.pie) addFx(b.x, b.y, '#fff', 8, 50); }
    });
    S.bullets = S.bullets.filter(b => b.t > 0 && b.x > S.cam - 60 && b.x < S.cam + W + 60 && b.y < H + 20);
    updateFx(dt);
    S.shake = Math.max(0, S.shake - dt);
  }
  function updateFx(dt) {
    S.fx.forEach(f => { f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 200 * dt; });
    S.fx = S.fx.filter(f => f.t > 0);
  }

  // ---- Dr. Mørk ----
  function startBoss() {
    S.boss = { x: ARENA * TS + 160, y: -50, w: 64, h: 40, hp: 40, max: 40, cd: 2, dive: 5, state: 'enter', flash: 0, t: 0, minions: 0, drop: 4 };
    S.say = { text: T('Dr. Mørk: "Your hygge is MINE, Agent A!"', 'Dr. Mørk: "Jeres hygge er MIN, Agent A!"'), t: 3 };
    sfx('alarm'); playMusic(true, true);
  }
  function updateBoss(dt) {
    const b = S.boss, p = S.p, ax = ARENA * TS;
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    if (b.down) { b.y += 30 * dt; if (Math.random() < 0.3) addFx(b.x + Math.random() * 64, b.y + Math.random() * 30, '#ff9a3a', 2, 60); return; }
    const frac = b.hp / b.max, fast = frac < 0.25 ? 1.5 : 1;
    if (b.state === 'enter') { b.y += 40 * dt; if (b.y >= 46) { b.y = 46; b.state = 'fly'; } return; }
    if (b.state === 'fly') {
      b.ph = (b.ph || 0) + dt * 0.8 * fast;   // the phase moves on, so speeding up never makes him jump
      b.x = ax + 160 + Math.sin(b.ph) * 150; b.y = 46 + Math.sin(b.t * 1.7) * 6;
      b.cd -= dt; b.dive -= dt;
      if (b.cd <= 0) {
        b.cd = (frac < 0.5 ? 1.2 : 1.7) / fast;
        const n = frac < 0.25 ? 5 : 3, cx = b.x + 32, cy = b.y + 40, ang = Math.atan2(p.y + 10 - cy, p.x + 5 - cx);
        for (let k = 0; k < n; k++) { const a = ang + (k - (n - 1) / 2) * 0.22; S.bullets.push({ x: cx, y: cy, w: 4, h: 4, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, t: 4, orb: true }); }
        sfx('eshoot');
      }
      if (frac < 0.5) { b.drop -= dt; if (b.drop <= 0 && S.foes.filter(f => f.kind === 'drone' && !f.dead && f.boss).length < 2) { b.drop = 5; S.foes.push({ kind: 'drone', boss: true, x: b.x + 25, y: b.y + 30, baseY: 50 + Math.random() * 30, w: 14, h: 10, hp: 1, cd: 1.5, flash: 0, ph: 0 }); } }
      if (b.dive <= 0) { b.state = 'dive'; b.dt = 0; b.tx = Math.max(ax + 10, Math.min(ax + W - 74, p.x - 27)); }
    } else if (b.state === 'dive') {
      // swoops down low to vacuum up Adam: the moment to shoot him
      b.dt += dt;
      const k = Math.min(1, b.dt / 0.8);
      b.x += (b.tx - b.x) * Math.min(1, dt * 3); b.y = 46 + (140 - 46) * Math.sin(k * Math.PI / 2);
      if (b.dt > 2.6) { b.state = 'rise'; }
      if (hitBox(p, { x: b.x + 6, y: b.y + 18, w: 52, h: 22 })) hurtPlayer(1);
    } else if (b.state === 'rise') {
      b.y -= 70 * dt; if (b.y <= 46) { b.y = 46; b.state = 'fly'; b.dive = 4.5 / fast; b.ph = Math.asin(Math.max(-1, Math.min(1, (b.x - ax - 160) / 150))); }
    }
  }
  function bossDown() {
    const b = S.boss;
    b.down = true; S.score += 2000; S.shake = 1; sfx('bigboom');
    S.say = { text: T('Dr. Mørk: "Nooo! My lovely candles!"', 'Dr. Mørk: "Neeej! Mine dejlige stearinlys!"'), t: 3 };
    S.foes.forEach(f => { if (f.boss) f.dead = true; });
    S.ents.push({ type: 'exit', x: (ARENA + 21) * TS, y: 10 * TS + TOP - 6, w: 12, h: 22 });
  }

  function stars() { const all = S.files >= S.filesTotal, clean = S.deaths === 0; return all && clean ? 3 : all || clean ? 2 : 1; }
  function finishLevel() {
    S.cleared = true; S.screen = 'clear'; S.clearT = 0; sfx('win'); stopMusic();
    const res = { level: S.level, score: S.score, stars: stars(), files: S.files, filesTotal: S.filesTotal, deaths: S.deaths };
    S.result = res;
    if (opts && opts.onResult) opts.onResult(res);
  }

  // ---------------- drawing ----------------
  function draw() {
    const c = ctx;
    c.imageSmoothingEnabled = false;
    if (S.screen === 'title') return drawTitle(c);
    if (S.screen === 'select') return drawSelect(c);
    if (S.screen === 'ending') return drawEnding(c);
    const lv = S.lv, p = S.p;
    const sx = S.shake ? Math.round((Math.random() - 0.5) * 4) : 0, cam = Math.round(S.cam) + sx;
    c.drawImage(S.bg, -Math.round(cam * 0.5), 0);
    c.drawImage(S.tiles, -cam, TOP);
    S.ents.forEach(e => {
      if (e.gone || e.x < cam - 20 || e.x > cam + W + 20) return;
      if (e.type === 'flag') drawFlag(c, e.x - cam, e.y, e.on, S.t);
      else if (e.type === 'exit') { R(c, e.x - cam - 2, e.y - 6, 18, 28, '#2a5a3a'); R(c, e.x - cam, e.y - 4, 14, 26, '#3f8a5a'); txt(c, 'EXIT', e.x - cam - 1, e.y - 15, '#7fe0a0', 7); }
      else drawPickup(c, e.type, e.x - cam, e.y, S.t);
    });
    S.foes.forEach(f => {
      if (f.dead || f.x < cam - 30 || f.x > cam + W + 30) return;
      if (f.kind === 'man') drawMan(c, f.x - cam, f.y, f.face, S.enemy, f.frame, f.flash > 0);
      else if (f.kind === 'drone') drawDrone(c, f.x - cam, f.y, S.t, f.flash > 0);
      else drawTurret(c, f.x - cam, f.y, f.face, f.flash > 0);
    });
    if (S.boss) drawBoss(c, S.boss.x - cam, S.boss.y, S.t, S.boss.flash > 0, S.boss.hp / S.boss.max);
    if (!S.dead) drawAdam(c, p.x - cam, p.y, p.face, p.frame, p.shot > 0, p.hurt);
    S.bullets.forEach(b => {
      const x = b.x - cam;
      if (b.mine) { R(c, x, b.y, b.w, b.h, '#ffe08a'); R(c, x + (b.vx > 0 ? 3 : 0), b.y, 2, 2, '#fff'); }
      else if (b.pie) { R(c, x, b.y + 1, 6, 3, '#c98a3a'); R(c, x, b.y, 6, 2, '#fff'); }
      else if (b.orb) { R(c, x, b.y, 4, 4, '#b06aff'); R(c, x + 1, b.y + 1, 2, 2, '#fff'); }
      else if (b.bomb) { R(c, x, b.y, 3, 4, '#2a2c32'); R(c, x + 1, b.y - 1, 1, 1, '#e8364d'); }
      else R(c, x, b.y, b.w, b.h, '#ff5a5a');
    });
    S.fx.forEach(f => R(c, f.x - cam, f.y, 2, 2, f.col));
    // HUD
    R(c, 0, 0, W, 11, 'rgba(0,0,0,.55)');
    for (let i = 0; i < 5; i++) heart(c, 4 + i * 9, 2, i < p.hp);
    txt(c, `${T('FILES', 'MAPPER')} ${S.files}/${S.filesTotal}`, 56, 1, '#e9c35a', 8);
    txt(c, String(S.score).padStart(6, '0'), W - 64, 1, '#fff', 8);
    txt(c, LEVELS[S.level].name().toUpperCase(), W / 2 + 26, 1, '#7fd0ff', 8, 'center');
    if (p.power > 0) txt(c, `K ${Math.ceil(p.power)}`, 150, 1, '#ffd27a', 8);
    if (S.boss && !S.boss.down) { R(c, 92, 14, 200, 6, '#2a1d3a'); R(c, 93, 15, Math.max(0, 198 * S.boss.hp / S.boss.max), 4, '#b06aff'); txt(c, 'DR. MØRK', W / 2, 21, '#fff', 7, 'center'); }
    if (S.say && S.say.t > 0) { S.say.t -= 1 / 60; R(c, 20, 190, W - 40, 16, 'rgba(0,0,0,.7)'); txt(c, S.say.text, W / 2, 194, '#fff', 8, 'center'); }
    if (S.dead) { R(c, 0, 90, W, 30, 'rgba(0,0,0,.6)'); txt(c, T('AGENT DOWN!', 'AGENT NEDE!'), W / 2, 98, '#e8364d', 14, 'center'); }
    if (S.screen === 'brief') drawBrief(c);
    if (S.screen === 'clear') drawClear(c);
    if (S.paused) { R(c, 0, 0, W, H, 'rgba(0,0,0,.6)'); txt(c, T('PAUSED', 'PAUSE'), W / 2, 90, '#fff', 16, 'center'); txt(c, T('tap to continue', 'tryk for at fortsætte'), W / 2, 114, '#9aa0aa', 8, 'center'); }
  }
  function frameBox(c, x, y, w, h) { R(c, x, y, w, h, '#0e1630'); R(c, x, y, w, 2, '#7fd0ff'); R(c, x, y + h - 2, w, 2, '#7fd0ff'); R(c, x, y, 2, h, '#7fd0ff'); R(c, x + w - 2, y, 2, h, '#7fd0ff'); }
  function drawTitle(c) {
    // a glowing 90s title over the night skyline of Copenhagen
    R(c, 0, 0, W, H, '#0b0f24');
    for (let i = 0; i < 70; i++) R(c, (i * 97) % W, (i * 53) % 120, 1, 1, i % 5 ? '#4a5a8a' : '#fff');
    for (let x = 0; x < W; x += 22) { const h = 30 + ((x * 7) % 50); R(c, x, H - h, 20, h, '#16204a'); for (let yy = H - h + 5; yy < H; yy += 7) if ((x + yy) % 3) R(c, x + 4 + (yy % 2) * 8, yy, 2, 3, '#ffd98a'); }
    R(c, 176, 92, 4, 40, '#16204a'); R(c, 172, 80, 12, 14, '#16204a'); R(c, 177, 66, 2, 14, '#16204a');   // a copper spire
    const glow = Math.floor(S.t * 3) % 2;
    txt(c, 'AGENT ADAM', W / 2, 30, glow ? '#ffd27a' : '#ffb347', 32, 'center', '#8a2a3a');
    txt(c, T('OPERATION HYGGE', 'OPERATION HYGGE'), W / 2, 66, '#7fd0ff', 12, 'center', '#16204a');
    drawAdam(c, 70, 120, 1, Math.floor(S.t * 8), Math.floor(S.t * 2) % 2 === 0, 0);
    drawMan(c, 300, 120, -1, 'suit', Math.floor(S.t * 8), false);
    if (Math.floor(S.t * 2) % 2) txt(c, T('TAP TO START', 'TRYK FOR AT STARTE'), W / 2, 150, '#fff', 10, 'center');
    txt(c, T('© 1997 D.A.N.E. - Danish Agency for Neutralising Evil', '© 1997 D.A.N.E. - Danmarks Agentur for Nedkæmpelse af Ondskab'), W / 2, 200, '#4a5a8a', 7, 'center', null);
  }
  function drawSelect(c) {
    R(c, 0, 0, W, H, '#0b0f24');
    txt(c, T('MISSIONS', 'MISSIONER'), W / 2, 8, '#ffd27a', 14, 'center', '#8a2a3a');
    const best = (opts.progress && opts.progress.best) || [];
    S.boxes = [];
    LEVELS.forEach((lv, i) => {
      const x = 14 + i * 72, y = 40, w = 66, h = 120, open = i <= best.length;
      frameBox(c, x, y, w, h);
      S.boxes.push({ x, y, w, h, i, open });
      txt(c, String(i + 1), x + w / 2, y + 8, open ? '#ffd27a' : '#3a4a6a', 16, 'center');
      const th = THEMES[lv.id];
      R(c, x + 8, y + 32, w - 16, 30, th.sky[1]); R(c, x + 8, y + 54, w - 16, 8, th.ground); R(c, x + 8, y + 54, w - 16, 2, th.top);
      if (!open) { R(c, x + 8, y + 32, w - 16, 30, 'rgba(0,0,0,.6)'); txt(c, '🔒', x + w / 2 - 5, y + 40, '#fff', 10, 'left', null); }
      c.font = 'bold 8px "Courier New", monospace';
      const nm = lv.name(), small = c.measureText(nm).width > w - 10;
      if (small) wrap(c, nm.replace('sundsbroen', 'sunds- broen').replace('Bridge', ' Bridge'), x + 6, y + 68, w - 10, open ? '#fff' : '#3a4a6a', 7, 9);
      else wrap(c, nm, x + 6, y + 68, w - 10, open ? '#fff' : '#3a4a6a', 8, 10);
      const b = best[i];
      if (b) { txt(c, '★'.repeat(b.stars) + '☆'.repeat(3 - b.stars), x + w / 2, y + 96, '#ffd27a', 9, 'center'); txt(c, String(b.score), x + w / 2, y + 107, '#7fd0ff', 7, 'center'); }
    });
    txt(c, T('Tap a mission', 'Vælg en mission'), W / 2, 176, '#9aa0aa', 8, 'center');
    if (opts.progress && opts.progress.done) txt(c, T('Denmark is safe. Hygge restored.', 'Danmark er reddet. Hyggen er tilbage.'), W / 2, 192, '#7fe0a0', 8, 'center');
  }
  function drawBrief(c) {
    R(c, 0, 0, W, H, 'rgba(5,8,20,.82)');
    frameBox(c, 30, 26, W - 60, 150);
    txt(c, `${T('MISSION', 'MISSION')} ${S.level + 1}: ${LEVELS[S.level].name().toUpperCase()}`, 44, 36, '#ffd27a', 10);
    txt(c, LEVELS[S.level].place, 44, 50, '#7fd0ff', 8);
    // the boss at D.A.N.E. briefs Agent A
    R(c, 44, 66, 30, 34, '#1d2650'); R(c, 50, 70, 18, 16, '#e6c0a0'); R(c, 48, 68, 22, 5, '#c9cdd3'); R(c, 52, 76, 5, 1, '#111'); R(c, 61, 76, 5, 1, '#111'); R(c, 46, 86, 26, 14, '#3a3d44');
    txt(c, T('Fru Mortensen, chief of D.A.N.E.:', 'Fru Mortensen, chef for D.A.N.E.:'), 82, 66, '#9aa0aa', 7);
    wrap(c, LEVELS[S.level].brief(), 82, 78, W - 130, '#fff', 8, 11);
    if (Math.floor(S.t * 2) % 2) txt(c, T('TAP TO BEGIN', 'TRYK FOR AT BEGYNDE'), W / 2, 158, '#fff', 9, 'center');
  }
  function drawClear(c) {
    S.clearT += 1 / 60;
    R(c, 0, 0, W, H, 'rgba(5,8,20,.8)');
    frameBox(c, 70, 34, W - 140, 140);
    txt(c, T('MISSION COMPLETE', 'MISSION FULDFØRT'), W / 2, 44, '#7fe0a0', 14, 'center');
    const r = S.result;
    txt(c, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), W / 2, 66, '#ffd27a', 18, 'center');
    txt(c, `${T('Score', 'Point')}: ${r.score}`, 100, 94, '#fff', 9);
    txt(c, `${T('Secret files', 'Hemmelige mapper')}: ${r.files}/${r.filesTotal}`, 100, 108, '#e9c35a', 9);
    txt(c, `${T('Times knocked down', 'Gange slået ned')}: ${r.deaths}`, 100, 122, '#9aa0aa', 9);
    if (S.firstClear) txt(c, T('Overtime bonus for Adam: 2.000 kr', 'Overarbejdsbonus til Adam: 2.000 kr'), W / 2, 138, '#7fd0ff', 8, 'center');
    S.btns = [{ x: 90, y: 150, w: 90, h: 16, act: 'levels', label: T('MISSIONS', 'MISSIONER') }, { x: 204, y: 150, w: 90, h: 16, act: S.level < LEVELS.length - 1 ? 'next' : 'ending', label: S.level < LEVELS.length - 1 ? T('NEXT', 'NÆSTE') : T('THE END', 'SLUTNING') }];
    S.btns.forEach(b => { R(c, b.x, b.y, b.w, b.h, b.act === 'levels' ? '#2a3a6a' : '#3f8a5a'); txt(c, b.label, b.x + b.w / 2, b.y + 4, '#fff', 8, 'center'); });
  }
  function drawEnding(c) {
    R(c, 0, 0, W, H, '#0b0f24');
    // Adam at home at two minutes past five: the lamp, the sofa, Mie
    R(c, 0, 120, W, 96, '#5a4636'); R(c, 0, 0, W, 120, '#2a3350');
    R(c, 120, 90, 150, 34, '#1d6b6b'); R(c, 112, 96, 16, 30, '#17595a'); R(c, 262, 96, 16, 30, '#17595a');
    R(c, 190, 0, 1, 40, '#999'); R(c, 180, 40, 22, 8, '#e9c35a'); R(c, 160, 48, 62, 40, 'rgba(255,217,138,.12)');
    drawAdam(c, 150, 98, 1, 0, false, 0);
    R(c, 232, 98, 10, 7, '#3b2418'); R(c, 232, 104, 10, 6, '#f3cdb0'); R(c, 233, 106, 8, 1, '#111'); R(c, 230, 110, 14, 10, '#2f6f73'); R(c, 232, 120, 3, 4, '#3b3040'); R(c, 238, 120, 3, 4, '#3b3040');
    const lines = [T('Denmark is saved. Every candle is back where it belongs.', 'Danmark er reddet. Alle stearinlys er tilbage, hvor de hører til.'), T('17:02. Adam comes home.', 'Klokken 17.02 kommer Adam hjem.'), T('Mie: "How was work, love?"', 'Mie: "Hvordan var arbejdet, skat?"'), T('Adam: "Oh, you know. Spreadsheets."', 'Adam: "Åh, du ved. Regneark."')];
    let y = 136; lines.forEach((l, i) => { if (S.t > i * 1.6) { y = wrap(c, l, 24, y, W - 48, i === 3 ? '#ffd27a' : '#fff', 9, 12) + 2; } });
    if (S.t > 7) txt(c, T('THE END - tap to return', 'SLUT - tryk for at vende tilbage'), W / 2, 200, '#7fd0ff', 8, 'center');
  }

  // ---------------- sound ----------------
  function sfx(n) {
    const A = DG.Audio; if (!A || !A.chip) return;
    const f = {
      shoot: () => A.chip(880, 0.06, 'square', 0.07, 0), eshoot: () => A.chip(300, 0.08, 'square', 0.04, 0),
      jump: () => { A.chip(330, 0.06, 'square', 0.06); A.chip(495, 0.06, 'square', 0.05, 0.05); },
      hit: () => A.noise(0.06, 0.15, 2400), boom: () => A.noise(0.35, 0.35, 700), bigboom: () => { A.noise(1.2, 0.5, 500); A.chip(80, 1, 'sawtooth', 0.1); },
      hurt: () => A.chip(160, 0.2, 'sawtooth', 0.09), down: () => [392, 330, 262, 196].forEach((fq, i) => A.chip(fq, 0.18, 'square', 0.08, i * 0.15)),
      pick: () => { A.chip(988, 0.05, 'square', 0.05); A.chip(1319, 0.08, 'square', 0.05, 0.05); }, heal: () => [523, 659, 784].forEach((fq, i) => A.chip(fq, 0.08, 'triangle', 0.1, i * 0.06)),
      power: () => [523, 659, 784, 1047].forEach((fq, i) => A.chip(fq, 0.08, 'square', 0.06, i * 0.05)), flag: () => [784, 988, 1175].forEach((fq, i) => A.chip(fq, 0.1, 'square', 0.05, i * 0.08)),
      splash: () => A.noise(0.3, 0.2, 1500), alarm: () => [0, 0.3, 0.6].forEach(w => { A.chip(660, 0.15, 'square', 0.06, w); A.chip(440, 0.15, 'square', 0.06, w + 0.15); }),
      win: () => [523, 659, 784, 1047, 784, 1047].forEach((fq, i) => A.chip(fq, 0.12, 'square', 0.07, i * 0.1)),
    }[n];
    if (f) f();
  }
  // a little spy theme in the spirit of 1997: a walking bass and a minor melody
  const BASS = [45, 45, 52, 45, 48, 45, 52, 50], MEL = [69, 0, 72, 71, 69, 0, 64, 0, 69, 0, 72, 74, 76, 74, 72, 71];
  const BOSS_MEL = [69, 72, 76, 72, 69, 72, 77, 76, 74, 71, 74, 77, 76, 72, 69, 68];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function playMusic(on, boss) {
    stopMusic();
    if (!on || !DG.Audio || !DG.Audio.chip) return;
    let i = 0;
    const mel = boss ? BOSS_MEL : MEL;
    music = setInterval(() => {
      if (S && S.paused) return;
      const b = BASS[Math.floor(i / 2) % BASS.length];
      if (i % 2 === 0) DG.Audio.chip(hz(b), 0.18, 'triangle', 0.22, 0, true);
      const m = mel[i % mel.length];
      if (m) DG.Audio.chip(hz(m), 0.12, 'square', 0.06, 0, true);
      i++;
    }, boss ? 120 : 150);
  }
  function stopMusic() { clearInterval(music); music = 0; }

  // ---------------- loop, input and the screen ----------------
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(1 / 30, (now - last) / 1000 || 0); last = now;
    if (!S) return;
    if (S.screen === 'play' && !S.paused) { update(dt / 2); update(dt / 2); }
    else S.t += dt;
    draw();
  }
  function tap(x, y) {
    if (!S) return;
    if (S.paused) { S.paused = false; return; }
    if (S.screen === 'title') { S.screen = 'select'; sfx('pick'); return; }
    if (S.screen === 'select') {
      const b = (S.boxes || []).find(k => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
      if (b && b.open) { const best = opts.progress.best; startLevel(b.i); S.firstClear = !best[b.i]; sfx('pick'); }
      return;
    }
    if (S.screen === 'brief') { S.screen = 'play'; return; }
    if (S.screen === 'clear') {
      const b = (S.btns || []).find(k => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
      if (!b) return;
      if (b.act === 'levels') toSelect();
      else if (b.act === 'next') { const best = opts.progress.best; startLevel(S.level + 1); S.firstClear = !best[S.level]; }
      else { S = { screen: 'ending', t: 0 }; playMusic(true); }
      return;
    }
    if (S.screen === 'ending' && S.t > 7) toSelect();
  }
  function toSelect() { S = { screen: 'select', t: 0 }; playMusic(true); }

  function onKey(e, down) {
    if (!root) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    keys[e.code] = down;
    if (down && !e.repeat) {
      if (e.code === 'Escape') { if (S && S.screen === 'play') S.paused = !S.paused; else DG.Agent.close(); }
      else if ((e.code === 'Enter' || e.code === 'Space') && S && S.screen !== 'play') {
        if (S.screen === 'select') { const open = (S.boxes || []).filter(b => b.open).pop(); if (open) tap(open.x + 5, open.y + 5); }
        else tap(W / 2 + (S.screen === 'clear' ? 60 : 0), S.screen === 'clear' ? 158 : 100);
      }
    }
  }
  const kd = e => onKey(e, true), ku = e => onKey(e, false);
  function onVis() { if (document.hidden && S && S.screen === 'play') S.paused = true; }

  function fit() {
    if (!cv) return;
    const s = Math.min(g.innerWidth / W, g.innerHeight / H);
    cv.style.width = `${Math.floor(W * s)}px`; cv.style.height = `${Math.floor(H * s)}px`;
  }

  // touch pads: one zone for left/right and one for jump/fire, so a thumb can slide between buttons
  function pad(el, map) {
    const ptrs = new Map();
    const sync = () => { Object.values(map).forEach(k => { touch[k] = false; }); ptrs.forEach(k => { if (k) touch[k] = true; }); el.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', touch[b.dataset.k])); };
    const which = e => { const b = document.elementFromPoint(e.clientX, e.clientY); return b && b.dataset && b.dataset.k && el.contains(b) ? b.dataset.k : null; };
    el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } ptrs.set(e.pointerId, which(e)); sync(); });
    el.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, which(e)); sync(); } });
    const up = e => { ptrs.delete(e.pointerId); sync(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  // the cover story: Adam's very normal office job
  function coverHtml() {
    const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const head = [T('Account', 'Konto'), 'Q1', 'Q2', 'Q3', 'Q4', T('Total', 'I alt'), '%'];
    let rows = '';
    for (let r = 1; r <= 14; r++) rows += `<tr><th>${r}</th>${cols.map((c, i) => `<td>${r === 1 ? head[i] : i === 0 ? `${4000 + r * 110}` : i === 6 ? `${(rnd() * 12 - 2).toFixed(1)}%` : Math.round(rnd() * 90000).toLocaleString('da-DK')}</td>`).join('')}</tr>`;
    return `<div class="w95">
      <div class="w95-win">
        <div class="w95-title"><span>Microsoft Excel - ${T('Quarterly_report_Q3_FINAL_v7.xls', 'Kvartalsrapport_Q3_ENDELIG_v7.xls')}</span><span class="w95-btns"><i>_</i><i>□</i><button data-ag="close" aria-label="Close">✕</button></span></div>
        <div class="w95-menu">${[T('File', 'Filer'), T('Edit', 'Rediger'), T('View', 'Vis'), T('Insert', 'Indsæt'), T('Format', 'Formater'), T('Tools', 'Funktioner'), T('Data', 'Data'), T('Window', 'Vindue'), T('Help', 'Hjælp')].map(m => `<span>${m}</span>`).join('')}</div>
        <div class="w95-formula"><b>F7</b><span>=SUM(F2:F14)</span></div>
        <div class="w95-sheet"><table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows}</table>
          <div class="w95-note">${T('Remember: buy milk.<br>Meeting about the meeting 10:00.', 'Husk: køb mælk.<br>Møde om mødet kl. 10.')}</div></div>
      </div>
      <div class="w95-bar"><span class="w95-start">⊞ Start</span><span class="w95-task">Microsoft Excel</span><span class="w95-tray"><button data-ag="secret" class="w95-shades" aria-label="?">🕶</button>09:41</span></div>
    </div>`;
  }

  DG.Agent = {
    LEVELS,
    // opts: { lang, progress: {best: [], done}, onResult(res), onClose() }
    open(o) {
      if (root) return;
      opts = o; L = o.lang || 'en';
      root = document.createElement('div'); root.className = 'agent'; root.setAttribute('translate', 'no');
      root.innerHTML = coverHtml();
      document.body.appendChild(root);
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-ag]');
        if (!b) return;
        if (b.dataset.ag === 'close') DG.Agent.close();
        else if (b.dataset.ag === 'secret') DG.Agent.reveal();
        else if (b.dataset.ag === 'pause' && S && S.screen === 'play') S.paused = !S.paused;
      });
      document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      document.addEventListener('visibilitychange', onVis);
      g.addEventListener('resize', fit);
    },
    // the sunglasses in the taskbar: ACCESS GRANTED
    reveal() {
      if (!root) return;
      root.innerHTML = `<div class="agent-granted">${T('ACCESS GRANTED', 'ADGANG GODKENDT')}<small>D.A.N.E.</small></div>`;
      sfx('alarm');
      setTimeout(() => {
        if (!root) return;
        root.innerHTML = `<canvas width="${W}" height="${H}"></canvas><div class="agent-crt"></div>
          <button class="agent-x" data-ag="close" aria-label="Close">✕</button><button class="agent-p" data-ag="pause" aria-label="Pause">II</button>
          <div class="agent-pad left"><span data-k="left">◀</span><span data-k="right">▶</span></div>
          <div class="agent-pad right"><span data-k="fire">B</span><span data-k="jump">A</span></div>`;
        cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
        cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); tap((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height); });
        pad(root.querySelector('.agent-pad.left'), { left: 'left', right: 'right' });
        pad(root.querySelector('.agent-pad.right'), { fire: 'fire', jump: 'jump' });
        S = { screen: 'title', t: 0 }; playMusic(true);
        fit(); last = performance.now(); raf = requestAnimationFrame(loop);
      }, 900);
    },
    close() {
      if (!root) return;
      cancelAnimationFrame(raf); stopMusic();
      document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku);
      document.removeEventListener('visibilitychange', onVis);
      g.removeEventListener('resize', fit);
      root.remove(); root = null; cv = null; ctx = null; S = null;
      Object.keys(keys).forEach(k => { keys[k] = false; }); Object.keys(touch).forEach(k => { touch[k] = false; });
      if (opts && opts.onClose) opts.onClose();
    },
    get state() { return S; },
    // for tests: drive the game without a screen tap
    _start(i) { startLevel(i); S.screen = 'play'; },
    _keys: keys,
    _step(dt) { if (S && S.screen === 'play') update(dt); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
