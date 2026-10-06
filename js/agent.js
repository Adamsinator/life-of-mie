// Agent Adam: what Adam really does at work. Behind his "normal office job" (a very boring spreadsheet) he is
// Agent A of D.A.N.E., and in a retro 90s run-and-gun he stops Dr. Mørk from stealing Denmark's hygge.
// Six missions, five weapons, an armory with upgrades, grenades, mini-bosses and Dr. Mørk himself.
// Everything is drawn on one small canvas (384x216) that the screen scales up with hard pixel edges.
(function (g) {
  const DG = (g.DG = g.DG || {});
  const W = 384, H = 216, TS = 16, ROWS = 13, TOP = 8;   // the level sits under an 8 px HUD band
  // a jump rises 4.5 tiles: every ledge in the missions is at most 4 tiles above the last (tests/agent.test.js checks it)
  const GRAV = 760, RUN = 100, JUMP = 330, MAXFALL = 420;
  let L = 'en';
  const T = (en, da) => (L === 'da' ? da : en);

  // ---------------- weapons and the armory ----------------
  const WEAPONS = [
    { id: 'pistol', name: () => T('Pistol', 'Pistol'), cost: 0, rate: 0.26, dmg: 1, speed: 320, life: 1.1, col: '#ffe08a', desc: () => T('Reliable. Like a Volvo.', 'Pålidelig. Som en Volvo.') },
    { id: 'mg', name: () => T('Machine gun', 'Maskingevær'), cost: 100, rate: 0.09, dmg: 1, speed: 360, life: 0.9, jitter: 0.06, col: '#ffd27a', desc: () => T('Hold B and the files fly.', 'Hold B nede, og mapperne flyver.') },
    { id: 'spread', name: () => T('Spread gun', 'Spredehagl'), cost: 160, rate: 0.34, dmg: 1, speed: 300, life: 0.45, pellets: 5, spread: 0.32, col: '#ff9a6a', desc: () => T('Five pellets. Close range.', 'Fem hagl. Tæt på.') },
    { id: 'laser', name: () => T('Laser', 'Laser'), cost: 260, rate: 0.36, dmg: 2, speed: 640, life: 0.7, pierce: true, col: '#7fe0ff', desc: () => T('Goes straight through shields.', 'Går lige gennem skjolde.') },
    { id: 'rocket', name: () => T('Rocket launcher', 'Raketkaster'), cost: 380, rate: 0.85, dmg: 6, speed: 150, life: 1.6, rocket: true, col: '#ff6a3a', desc: () => T('Big bang, splash damage.', 'Stort brag, rammer omkring sig.') },
  ];
  const UPGRADES = [
    { id: 'hp', name: () => T('Extra heart', 'Ekstra hjerte'), costs: [80, 140, 220], desc: () => T('+1 heart', '+1 hjerte') },
    { id: 'boots', name: () => T('Jump boots', 'Hoppestøvler'), costs: [180], desc: () => T('Double jump in the air', 'Dobbelthop i luften') },
    { id: 'nades', name: () => T('Grenade belt', 'Granatbælte'), costs: [90, 160], desc: () => T('+2 grenades a mission', '+2 granater pr. mission') },
    { id: 'vest', name: () => T('Kevlar vest', 'Skudsikker vest'), costs: [200], desc: () => T('Longer safe time after a hit', 'Længere beskyttelse efter et slag') },
    { id: 'magnet', name: () => T('Coin magnet', 'Møntmagnet'), costs: [70], desc: () => T('Coins come to you', 'Mønterne kommer til dig') },
  ];
  // coins each enemy drops, and their toughness
  const FOE = {
    man: { hp: 2, coins: 2, score: 100 }, shield: { hp: 3, coins: 4, score: 200 }, jumper: { hp: 2, coins: 3, score: 150 }, sniper: { hp: 2, coins: 3, score: 150 },
    drone: { hp: 1, coins: 3, score: 150 }, turret: { hp: 3, coins: 5, score: 200 }, heavy: { hp: 12, coins: 10, score: 500 }, crate: { hp: 2, coins: 4, score: 20 },
  };

  // ---------------- missions ----------------
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
      coins(x, y, n) { for (let i = 0; i < n; i++) ents.push({ type: 'coin', x: x + i, y }); },
      many(type, xs, y = 10) { xs.forEach(x => ents.push({ type, x, y })); },
    };
    def(api);
    return { len, theme, map: m.map(r => r.join('')), ents };
  }
  const LEVELS = [
    { id: 'office', name: () => T('The Office', 'Kontoret'), place: 'Kalvebod Brygge', guard: () => T('The Chief Auditor', 'Chefrevisoren'),
      brief: () => T("Dr. Mørk's men have sneaked onto the 7th floor dressed as auditors. Clear the office before the ten o'clock meeting.", 'Dr. Mørks mænd har sneget sig ind på 7. sal forklædt som revisorer. Ryd kontoret før mødet klokken ti.'),
      data: () => build(132, 'office', b => {
        b.ground(0, 131);
        [[10, 10, 2, 1], [18, 10, 2, 1], [30, 9, 1, 2], [44, 10, 2, 1], [52, 9, 1, 2], [66, 10, 2, 1], [80, 9, 1, 2], [86, 10, 2, 1], [104, 9, 1, 2]].forEach(a => b.block(...a));
        b.plat(24, 7, 4); b.plat(33, 5, 4); b.plat(58, 7, 5); b.plat(70, 6, 4); b.plat(92, 7, 5); b.plat(107, 5, 4);
        b.many('man', [14, 26, 40, 63, 76, 90, 100]); b.e('shield', 48, 10); b.e('sniper', 59, 6);
        b.many('crate', [36, 84, 114]); b.e('drone', 70, 3); b.e('drone', 97, 3);
        [[25, 6], [34, 4], [45, 9], [61, 6], [71, 5], [94, 6], [108, 4], [116, 10]].forEach(([x, y]) => b.e('file', x, y));
        b.coins(4, 8, 4); b.coins(20, 8, 3); b.coins(38, 8, 3); b.coins(54, 6, 3); b.coins(78, 8, 3); b.coins(96, 9, 4); b.coins(112, 8, 3);
        b.e('heal', 56, 10); b.e('flag', 62, 10); b.e('heavy', 122, 10, { guard: true }); b.e('exit', 129, 10);
      }) },
    { id: 'nyhavn', name: () => 'Nyhavn', place: 'Nyhavn', guard: () => T('The Bosun', 'Bådsmanden'),
      brief: () => T('A boat full of stolen candles is about to leave Nyhavn. Mind the water: Agent A cannot swim in a suit.', 'En båd fuld af stjålne stearinlys er ved at sejle fra Nyhavn. Pas på vandet: Agent A kan ikke svømme i jakkesæt.'),
      data: () => build(162, 'nyhavn', b => {
        b.ground(0, 20); b.water(21, 23); b.ground(24, 44); b.water(45, 55); b.block(47, 10, 6, 1); b.ground(56, 82); b.water(83, 86);
        b.ground(87, 112); b.water(113, 115); b.ground(116, 161);
        [[30, 10, 2, 1], [31, 9, 1, 1], [62, 9, 1, 2], [70, 10, 2, 1], [96, 9, 1, 2], [95, 10, 1, 1], [122, 10, 2, 1], [140, 9, 1, 2]].forEach(a => b.block(...a));
        b.plat(36, 7, 4); b.plat(64, 5, 4); b.plat(90, 7, 4); b.plat(128, 7, 5); b.plat(143, 5, 3);
        b.many('man', [12, 28, 40, 59, 68, 76, 92, 104, 120, 134, 150]); b.many('jumper', [74, 108]); b.many('shield', [100, 146]);
        b.e('sniper', 37, 6); b.e('sniper', 129, 6); b.e('turret', 50, 9); b.e('turret', 96, 8);
        b.e('drone', 54, 3); b.e('drone', 100, 3); b.e('drone', 130, 3); b.many('crate', [26, 88, 118]);
        [[16, 10], [22, 7], [39, 6], [49, 8], [65, 4], [84, 7], [91, 6], [106, 10], [114, 7], [131, 6]].forEach(([x, y]) => b.e('file', x, y));
        b.coins(4, 8, 4); b.coins(46, 8, 3); b.coins(58, 8, 3); b.coins(78, 8, 4); b.coins(98, 6, 3); b.coins(124, 8, 4); b.coins(150, 8, 4);
        b.e('heal', 58, 10); b.e('heal', 117, 10); b.e('power', 66, 4); b.e('flag', 72, 10); b.e('heavy', 153, 10, { guard: true }); b.e('exit', 159, 10);
      }) },
    { id: 'tivoli', name: () => 'Tivoli', place: 'Tivoli', guard: () => T('Strongman Svend', 'Stærke Svend'),
      brief: () => T('The henchmen are hiding in Tivoli dressed as clowns. Nobody has noticed anything. Watch out for flying cream pies.', 'Håndlangerne gemmer sig i Tivoli forklædt som klovne. Ingen har bemærket noget. Pas på flyvende flødeskumskager.'),
      data: () => build(172, 'tivoli', b => {
        b.ground(0, 30); b.ground(34, 60); b.plat(62, 9, 2); b.ground(65, 95); b.ground(99, 171);
        b.plat(12, 7, 4); b.plat(42, 7, 5); b.plat(48, 4, 4); b.plat(74, 7, 4); b.plat(80, 4, 4); b.plat(108, 7, 5); b.plat(116, 4, 4); b.plat(132, 7, 4); b.plat(139, 4, 4); b.plat(150, 7, 4);
        [[22, 10, 1, 1], [52, 9, 2, 2], [88, 10, 1, 1], [126, 9, 1, 2], [156, 10, 2, 1]].forEach(a => b.block(...a));
        b.many('man', [16, 26, 38, 46, 70, 90, 104, 114, 122, 138, 148]); b.many('jumper', [44, 84, 128]); b.many('shield', [58, 134]);
        b.e('turret', 52, 8); b.e('turret', 126, 8);
        b.e('drone', 30, 3); b.e('drone', 64, 2); b.e('drone', 98, 3); b.e('drone', 136, 2); b.many('crate', [8, 68, 102]);
        [[13, 6], [32, 7], [43, 6], [49, 3], [62, 8], [82, 3], [97, 7], [110, 6], [117, 3], [140, 3]].forEach(([x, y]) => b.e('file', x, y));
        b.coins(4, 8, 4); b.coins(24, 7, 3); b.coins(36, 8, 3); b.coins(68, 8, 3); b.coins(92, 8, 3); b.coins(102, 8, 4); b.coins(144, 8, 3); b.coins(160, 8, 3);
        b.e('heal', 40, 10); b.e('heal', 119, 3); b.e('power', 50, 3); b.e('flag', 79, 10); b.e('heavy', 162, 10, { guard: true }); b.e('exit', 168, 10);
      }) },
    { id: 'metro', name: () => T('The Metro', 'Metroen'), place: 'Kongens Nytorv', guard: () => T('The Conductor', 'Togføreren'),
      brief: () => T('Dr. Mørk is escaping through the Metro. Jump the live rails, and mind the gap.', 'Dr. Mørk flygter gennem Metroen. Spring over de strømførende skinner, og pas på afstanden mellem tog og perron.'),
      data: () => build(176, 'metro', b => {
        b.ground(0, 175); b.zap(20, 22); b.zap(48, 50); b.zap(90, 93); b.zap(130, 132); b.zap(150, 151);
        [[12, 10, 2, 1], [34, 10, 2, 1], [58, 9, 1, 2], [70, 10, 2, 1], [102, 9, 1, 2], [116, 10, 2, 1], [140, 10, 1, 1], [158, 9, 1, 2]].forEach(a => b.block(...a));
        b.plat(26, 7, 4); b.plat(42, 7, 4); b.plat(61, 5, 4); b.plat(84, 7, 5); b.plat(105, 5, 4); b.plat(124, 7, 4); b.plat(144, 7, 4);
        b.many('man', [10, 18, 30, 40, 55, 66, 78, 98, 112, 120, 136, 146]); b.many('shield', [74, 118, 154]); b.many('jumper', [44, 96, 140]);
        b.e('sniper', 27, 6); b.e('sniper', 85, 6); b.e('sniper', 125, 6); b.e('turret', 58, 8); b.e('turret', 102, 8); b.e('turret', 158, 8);
        b.e('drone', 46, 3); b.e('drone', 76, 3); b.e('drone', 95, 2); b.e('drone', 128, 3); b.e('drone', 152, 2); b.many('crate', [16, 64, 110, 148]);
        [[21, 8], [29, 6], [43, 6], [49, 8], [62, 4], [87, 6], [92, 8], [106, 4], [127, 6], [145, 6]].forEach(([x, y]) => b.e('file', x, y));
        b.coins(4, 8, 4); b.coins(36, 8, 3); b.coins(52, 8, 3); b.coins(72, 8, 3); b.coins(96, 8, 4); b.coins(114, 8, 3); b.coins(134, 8, 3); b.coins(162, 8, 4);
        b.e('heal', 60, 10); b.e('heal', 119, 10); b.e('power', 88, 6); b.e('flag', 64, 10); b.e('flag', 118, 10); b.e('heavy', 166, 10, { guard: true }); b.e('exit', 173, 10);
      }) },
    { id: 'palace', name: () => 'Amalienborg', place: 'Amalienborg', guard: () => T('The Fake Guardsman', 'Den falske garder'),
      brief: () => T("Dr. Mørk's men have swapped places with the Royal Guard. Real guardsmen never run. These ones do.", 'Dr. Mørks mænd har byttet plads med Den Kongelige Livgarde. Rigtige gardere løber aldrig. Det gør de her.'),
      data: () => build(172, 'palace', b => {
        b.ground(0, 171);
        [14, 30, 52, 76, 98, 122, 146].forEach(x => b.block(x, 9, 1, 2));   // sentry boxes
        b.block(84, 8, 4, 3);   // the statue's plinth
        b.plat(20, 7, 4); b.plat(33, 6, 4); b.plat(58, 7, 5); b.plat(66, 5, 3); b.plat(80, 5, 3); b.plat(104, 7, 4); b.plat(110, 4, 4); b.plat(128, 7, 4); b.plat(134, 4, 3); b.plat(154, 7, 4);
        b.many('man', [10, 24, 38, 46, 62, 72, 92, 108, 118, 132, 142, 158]); b.many('shield', [56, 100, 140]); b.many('jumper', [68, 126]);
        b.e('sniper', 21, 6); b.e('sniper', 105, 6); b.e('sniper', 155, 6); b.e('turret', 52, 8); b.e('turret', 122, 8);
        b.e('drone', 44, 3); b.e('drone', 90, 2); b.e('drone', 116, 3); b.e('drone', 150, 2); b.many('crate', [26, 70, 136]);
        [[23, 6], [34, 5], [60, 6], [67, 4], [82, 4], [86, 7], [107, 6], [111, 3], [135, 3], [157, 6]].forEach(([x, y]) => b.e('file', x, y));
        b.coins(4, 8, 4); b.coins(16, 6, 2); b.coins(42, 8, 3); b.coins(62, 8, 3); b.coins(85, 5, 3); b.coins(112, 8, 3); b.coins(130, 8, 3); b.coins(150, 8, 4);
        b.e('heal', 48, 10); b.e('heal', 116, 10); b.e('power', 80, 4); b.e('flag', 64, 10); b.e('flag', 120, 10); b.e('heavy', 162, 10, { guard: true }); b.e('exit', 168, 10);
      }) },
    { id: 'bridge', name: () => T('The Øresund Bridge', 'Øresundsbroen'), place: 'Øresundsbroen',
      brief: () => T("Dr. Mørk's hygge-vacuum is heading for Sweden with every candle in Denmark. Stop him on the bridge!", 'Dr. Mørks hyggesuger er på vej mod Sverige med alle stearinlys i Danmark. Stop ham på broen!'),
      data: () => build(136, 'bridge', b => {
        b.ground(0, 24); b.water(25, 27); b.ground(28, 52); b.water(53, 56); b.plat(54, 8, 2); b.ground(57, 82); b.water(83, 85); b.ground(86, 135);
        [[16, 10, 2, 1], [40, 9, 1, 2], [66, 10, 2, 1], [74, 9, 1, 2], [96, 10, 2, 1]].forEach(a => b.block(...a));
        b.plat(32, 7, 4); b.plat(60, 7, 4); b.plat(90, 7, 4); b.plat(101, 6, 4);
        b.many('man', [12, 22, 46, 62, 70, 80, 100, 106]); b.many('shield', [30, 88]); b.many('jumper', [50, 78]);
        b.e('sniper', 33, 6); b.e('sniper', 91, 6); b.e('turret', 40, 8); b.e('turret', 74, 8);
        b.e('drone', 30, 3); b.e('drone', 58, 2); b.e('drone', 88, 3); b.e('drone', 104, 2); b.many('crate', [20, 64]);
        [[18, 9], [26, 7], [35, 6], [55, 7], [61, 6], [84, 7], [93, 6], [102, 5]].forEach(([x, y]) => b.e('file', x, y));
        b.coins(4, 8, 4); b.coins(44, 8, 3); b.coins(68, 8, 3); b.coins(98, 8, 3);
        // the arena: the camera stops, Dr. Mørk arrives
        b.plat(115, 7, 3); b.plat(125, 7, 3); b.plat(120, 5, 3);
        b.e('heal', 63, 6); b.e('heal', 110, 10); b.e('power', 104, 5); b.e('flag', 66, 10); b.e('flag', 110, 10); b.e('boss', 112, 0);
      }) },
  ];
  const ARENA = 112;   // first column of the boss arena on the bridge (exactly one screen wide)

  const THEMES = {
    office: { sky: ['#2c3e5c', '#56708f', '#8aa2bd'], far: '#3b4f6e', ground: '#5d6b84', top: '#7d8aa3', block: '#8a6a4c', blockTop: '#a5845f', plat: '#b7bfcc', enemy: 'suit' },
    nyhavn: { sky: ['#5ba3d9', '#8cc4ea', '#c6e3f5'], far: '#7aa7c4', ground: '#7a5a3e', top: '#9a7752', block: '#a8743f', blockTop: '#c48a50', plat: '#9a7752', enemy: 'sailor' },
    tivoli: { sky: ['#1d1442', '#3a2370', '#6b3a8c'], far: '#2a1d55', ground: '#4a3b6b', top: '#e24d7a', block: '#e9c35a', blockTop: '#f6dc8c', plat: '#e24d7a', enemy: 'clown' },
    metro: { sky: ['#15161a', '#22242b', '#2e3038'], far: '#24262d', ground: '#55585f', top: '#8a8d94', block: '#3f6f9a', blockTop: '#5c8cb8', plat: '#9aa0aa', enemy: 'hood' },
    palace: { sky: ['#8ab8e0', '#b9d6ee', '#e6f0f8'], far: '#c9b48a', ground: '#8f8a84', top: '#b0aba5', block: '#c8102e', blockTop: '#fff', plat: '#d9cfa8', enemy: 'bearskin' },
    bridge: { sky: ['#e8794a', '#f3a55e', '#f8d08a'], far: '#c06a55', ground: '#55585f', top: '#e9e4d8', block: '#8a8d94', blockTop: '#b0b3ba', plat: '#c9cdd3', enemy: 'robot' },
  };

  // ---------------- tiny pixel helpers ----------------
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  // a 5x7 pixel font, as in the games of the 90s (capitals, ÆØÅ, digits and the punctuation the texts use)
  const GLYPHS = {
    A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
    D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
    G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
    J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
    M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
    P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
    S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
    V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
    Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
    'Æ': '01111101001010011111101001010010111', 'Ø': '01110100111010110101101011100101110', 'Å': '00100000000111010001111111000110001',
    '0': '01110100111010110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100110010001000011111',
    '3': '11110000010000101110000010000111110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
    '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
    '9': '01110100011000101111000010001001100',
    '.': '00000000000000000000000000110001100', ',': '00000000000000000000011000010001000', ':': '00000011000110000000011000110000000',
    '!': '00100001000010000100001000000000100', '?': '01110100010000100010001000000000100', "'": '00100001000100000000000000000000000',
    '"': '01010010100000000000000000000000000', '-': '00000000000000011111000000000000000', '/': '00001000100001000100010000100010000',
    '(': '00010001000100001000010000010000010', ')': '01000001000001000010000100010001000', '%': '11001110100001000100010000101110011',
    '+': '00000001000010011111001000010000000', '©': '01110100011011110100101111000101110', '★': '00100001001111101110011100110110001',
    '☆': '00100010101101110001010101010111011', '·': '00000000000000000100000000000000000', '_': '00000000000000000000000000000011111',
  };
  const glyphW = scale => 6 * scale;
  const textW = (s, scale) => String(s).length * glyphW(scale) - scale;
  const scaleOf = size => (size >= 28 ? 4 : size >= 12 ? 2 : 1);
  function blit(c, s, x, y, col, k) {
    c.fillStyle = col;
    let cx = x;
    for (const ch0 of String(s).toUpperCase()) {
      const gl = GLYPHS[ch0];
      if (gl) for (let i = 0; i < 35; i++) if (gl[i] === '1') c.fillRect(cx + (i % 5) * k, y + Math.floor(i / 5) * k, k, k);
      cx += glyphW(k);
    }
  }
  function txt(c, s, x, y, col = '#fff', size = 8, align = 'left', shadow = '#000') {
    const k = scaleOf(size), w = textW(s, k);
    x = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x); y = Math.round(y);
    if (shadow) blit(c, s, x + k, y + k, shadow, k);
    blit(c, s, x, y, col, k);
  }
  function wrap(c, s, x, y, maxW, col, size = 8, lh = 11) {
    const k = scaleOf(size);
    let line = '', yy = y;
    for (const w of s.split(' ')) {
      const t2 = line ? line + ' ' + w : w;
      if (textW(t2, k) > maxW && line) { txt(c, line, x, yy, col, size); line = w; yy += lh; } else line = t2;
    }
    if (line) txt(c, line, x, yy, col, size);
    return yy + lh;
  }
  const lock = (c, x, y) => { R(c, x + 2, y, 6, 2, '#e9c35a'); R(c, x + 1, y + 1, 2, 4, '#e9c35a'); R(c, x + 7, y + 1, 2, 4, '#e9c35a'); R(c, x, y + 5, 10, 8, '#e9a93a'); R(c, x + 4, y + 7, 2, 3, '#5a3a1a'); };
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
  function drawMan(c, x, y, face, kind, frame, flash, k = 1, extra) {
    c.save(); c.translate(Math.round(x) + 5 * k, Math.round(y)); c.scale(face * k, k); c.translate(-5, 0);
    const pal = {
      suit: { body: '#1d1f26', head: '#e6b896', hair: '#2a2a2a', trim: '#fff', legs: '#1d1f26' },
      sailor: { body: '#f2f2f2', head: '#d9a37e', hair: '#1c2a4a', trim: '#1c2a4a', legs: '#1c2a4a' },
      clown: { body: '#e9c35a', head: '#fff3e8', hair: '#e8364d', trim: '#3a86d9', legs: '#3a86d9' },
      hood: { body: '#3b3e46', head: '#c99a80', hair: '#2a2c32', trim: '#55585f', legs: '#25272c' },
      robot: { body: '#9aa0aa', head: '#c9cdd3', hair: '#6b7078', trim: '#e8364d', legs: '#6b7078' },
      bearskin: { body: '#1c2a5a', head: '#e6b896', hair: '#111', trim: '#fff', legs: '#1c2a5a' },
    }[kind];
    if (flash) Object.keys(pal).forEach(k => { pal[k] = '#fff'; });
    R(c, 2, 0, 7, 2, pal.hair); R(c, 2, 2, 7, 5, pal.head);
    if (kind === 'clown') { R(c, 5, 4, 2, 2, '#e8364d'); R(c, 0, 1, 2, 3, pal.hair); R(c, 9, 1, 2, 3, pal.hair); }
    else if (kind === 'robot') { R(c, 3, 3, 6, 2, '#2a2c32'); R(c, 6, 3, 2, 2, '#e8364d'); }
    else if (kind === 'hood') { R(c, 1, 0, 9, 3, pal.hair); R(c, 1, 2, 2, 5, pal.hair); R(c, 4, 3, 5, 1, '#111'); }
    else if (kind === 'bearskin') { R(c, 1, -7, 9, 9, pal.hair); R(c, 2, -8, 7, 2, pal.hair); R(c, 3, 3, 6, 1, '#111'); }
    else R(c, 3, 3, 6, 1, '#111');
    R(c, 1, 7, 9, 8, pal.body);
    if (kind === 'sailor') for (let k = 0; k < 4; k++) R(c, 1, 8 + k * 2, 9, 1, pal.trim);
    else if (kind === 'clown') { R(c, 3, 9, 2, 2, pal.trim); R(c, 6, 12, 2, 2, '#e8364d'); }
    else if (kind === 'suit') { R(c, 4, 7, 3, 3, pal.trim); R(c, 5, 8, 1, 4, '#8a2a3a'); }
    else if (kind === 'bearskin') { R(c, 1, 8, 9, 1, pal.trim); R(c, 3, 7, 1, 8, pal.trim); R(c, 7, 7, 1, 8, pal.trim); R(c, 1, 13, 9, 1, '#e9c35a'); }
    else R(c, 4, 9, 3, 2, pal.trim);
    const lg = frame % 4;
    R(c, lg === 1 ? 1 : 2, 15, 3, 6, pal.legs); R(c, lg === 3 ? 7 : 6, 15, 3, 6, pal.legs); R(c, 1, 21, 4, 1, '#141414'); R(c, 6, 21, 4, 1, '#141414');
    if (extra === 'shield') { R(c, 9, 4, 4, 17, flash ? '#fff' : '#8a93a3'); R(c, 10, 5, 2, 15, flash ? '#fff' : '#b8c0cc'); R(c, 10, 8, 2, 2, '#e8364d'); }
    else if (extra === 'rifle') { R(c, 7, 9, 4, 2, pal.body); R(c, 9, 8, 9, 2, '#2a2c32'); R(c, 13, 7, 2, 1, '#2a2c32'); }
    else if (extra === 'heavy') { R(c, 7, 9, 4, 3, pal.body); R(c, 9, 8, 8, 4, '#3b3f47'); R(c, 16, 9, 3, 2, '#2a2c32'); }
    else { R(c, 7, 9, 4, 2, pal.body); R(c, 11, 8, 3, 2, '#2a2c32'); }
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
  function drawCoin(c, x, y, t) {
    const f = Math.floor(t * 8 + x) % 4, w = [6, 4, 2, 4][f];
    R(c, x + 4 - w / 2, y, w, 8, '#e9b43a'); R(c, x + 4 - w / 2 + (w > 2 ? 1 : 0), y + 1, Math.max(1, w - 2), 6, '#ffd96a'); if (w === 6) R(c, x + 3, y + 2, 1, 4, '#c98a1a');
  }
  function drawCrate(c, x, y, flash) {
    R(c, x, y, 14, 14, flash ? '#fff' : '#a8743f'); R(c, x, y, 14, 2, flash ? '#fff' : '#c48a50'); R(c, x + 1, y + 2, 1, 12, '#7a5236'); R(c, x + 12, y + 2, 1, 12, '#7a5236');
    for (let k = 0; k < 10; k++) R(c, x + 2 + k, y + 2 + k, 1, 1, '#7a5236');
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
      for (let x = 100; x < cv.width; x += 300) { R(c, x, 69, 90, 18, '#3f6f9a'); txt(c, 'M', x + 4, 71, '#fff', 12, 'left', null); txt(c, 'KGS. NYTORV', x + 20, 74, '#fff', 7, 'left', null); }
    } else if (theme === 'palace') {   // Amalienborg: the Marble Church dome, rococo palaces and the king on his horse
      for (let x = 60; x < cv.width; x += 400) {
        R(c, x - 6, 70, 92, 80, '#d9cfb8'); c.fillStyle = '#6aa58f'; c.beginPath(); c.arc(x + 40, 72, 40, Math.PI, 0); c.fill();
        R(c, x + 36, 22, 8, 12, '#6aa58f'); R(c, x + 39, 14, 2, 8, '#e9c35a'); for (let k = 0; k < 7; k++) R(c, x + 2 + k * 12, 84, 4, 50, '#c9bc9e');
      }
      for (let x = 0, k = 0; x < cv.width; x += 120, k++) {
        R(c, x, 110, 110, 74, '#e6d3a8'); R(c, x, 106, 110, 6, '#d2bd8c'); R(c, x + 40, 96, 30, 12, '#d2bd8c');
        for (let yy = 118; yy < 176; yy += 18) for (let xx = x + 6; xx < x + 104; xx += 12) R(c, xx, yy, 6, 11, '#f7f2e6');
      }
      for (let x = 200; x < cv.width; x += 560) { R(c, x, 150, 30, 30, '#8a8478'); R(c, x + 4, 128, 20, 18, '#3f6f5f'); R(c, x + 18, 120, 4, 10, '#3f6f5f'); R(c, x + 10, 118, 6, 8, '#3f6f5f'); }
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
        else if (lv.theme === 'palace') { for (let k = 0; k < 4; k++) R(c, px + (k % 2) * 8 + ((y % 2) * 4), py + 4 + Math.floor(k / 2) * 6, 6, 4, '#a39d96'); }
      } else if (ch === 'B') {
        R(c, px, py, TS, TS, th.block); R(c, px, py, TS, 2, th.blockTop); R(c, px, py + TS - 1, TS, 1, 'rgba(0,0,0,.35)');
        if (lv.theme === 'nyhavn' || lv.theme === 'tivoli') { R(c, px + 2, py + 2, 1, 13, 'rgba(0,0,0,.25)'); R(c, px + 13, py + 2, 1, 13, 'rgba(0,0,0,.25)'); R(c, px + 2, py + 8, 12, 1, 'rgba(0,0,0,.25)'); }
        if (lv.theme === 'office') { R(c, px + 3, py + 6, 10, 1, '#5e4430'); R(c, px + 7, py + 9, 2, 1, '#e9c35a'); }
        if (lv.theme === 'palace') { R(c, px, py, TS, TS, '#fff'); for (let k = 0; k < 4; k++) R(c, px + k * 4, py, 2, TS, '#c8102e'); R(c, px, py, TS, 3, '#1c2a5a'); }
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
  let S = null;   // the whole state of the screen and the mission
  let touchMode = !!(g.matchMedia && g.matchMedia('(pointer: coarse)').matches);   // the last input was a finger
  const useTouch = on => { if (touchMode !== on) { touchMode = on; fit(); } };
  const keys = {}, touch = { left: false, right: false, jump: false, fire: false, nade: false, swap: false };

  const solidAt = (lv, tx, ty) => { if (tx < 0 || tx >= lv.len) return true; if (ty < 0 || ty >= ROWS) return false; const ch = lv.map[ty][tx]; return ch === '#' || ch === 'B'; };
  const tileAt = (lv, tx, ty) => (tx < 0 || tx >= lv.len || ty < 0 || ty >= ROWS ? '.' : lv.map[ty][tx]);
  const hitBox = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // the saved progress: best per mission, coins, weapons and upgrades (older saves are filled in)
  function norm(p) {
    if (!p.best || Array.isArray(p.best)) {
      const old = Array.isArray(p.best) ? p.best : [];
      p.best = {};
      ['office', 'nyhavn', 'tivoli', 'metro', 'bridge'].forEach((id, i) => { if (old[i]) p.best[id] = old[i]; });
    }
    if (typeof p.coins !== 'number') p.coins = 0;
    if (!Array.isArray(p.owned)) p.owned = ['pistol'];
    if (!p.weapon || !p.owned.includes(p.weapon)) p.weapon = 'pistol';
    p.up = Object.assign({ hp: 0, boots: 0, nades: 0, vest: 0, magnet: 0 }, p.up || {});
    return p;
  }
  const prog = () => (opts && opts.progress) || norm({});
  const unlocked = i => i === 0 || !!prog().best[LEVELS[i - 1].id];
  const weaponOf = id => WEAPONS.find(w => w.id === id) || WEAPONS[0];

  function startLevel(i) {
    const def = LEVELS[i], lv = def.data(), P = prog(), up = P.up;
    const maxHp = 5 + up.hp;
    S = {
      screen: 'brief', level: i, lv, t: 0, bg: paintBackground(lv.theme, lv.len), tiles: paintTiles(lv),
      p: { x: 32, y: 120, vx: 0, vy: 0, w: 10, h: 22, face: 1, ground: false, coyote: 0, buf: 0, cd: 0, hp: maxHp, max: maxHp, hurt: 0, power: 0, frame: 0, anim: 0, shot: 0, air: 0, weapon: P.weapon, nades: 3 + up.nades * 2 },
      cam: 0, shake: 0, ents: [], bullets: [], foes: [], fx: [], nades: [], booms: [], score: 0, coins: 0, files: 0, filesTotal: 0, deaths: 0,
      spawn: { x: 32, y: 120 }, safe: { x: 32, y: 120 }, boss: null, cleared: false, dead: 0, enemy: THEMES[lv.theme].enemy, up, toast: null,
    };
    lv.ents.forEach(e => {
      const x = e.x * TS, y = e.y * TS + TOP, kind = e.type, F = FOE[kind];
      const hpBoost = i * 0.15;
      if (kind === 'man' || kind === 'shield' || kind === 'jumper' || kind === 'sniper') S.foes.push({ kind, x: x + 3, y: y - 6, w: 10, h: 22, vx: kind === 'sniper' ? 0 : 30, vy: 0, face: -1, hp: Math.round(F.hp * (1 + hpBoost)), cd: 1 + Math.random(), frame: 0, flash: 0 });
      else if (kind === 'heavy') { const hp = Math.round((e.guard ? 26 : F.hp) * (1 + i * 0.25)); S.foes.push({ kind, guard: !!e.guard, home: x, x, y: y - 14, w: 16, h: 30, vx: 0, vy: 0, face: -1, hp, max: hp, cd: 2, frame: 0, flash: 0 }); }
      else if (kind === 'drone') S.foes.push({ kind, x, y, baseY: y, w: 14, h: 10, hp: 1, cd: 2 + Math.random(), flash: 0, ph: Math.random() * 6 });
      else if (kind === 'turret') S.foes.push({ kind, x: x + 1, y, w: 14, h: 16, hp: 3 + i, cd: 1.5, face: -1, flash: 0 });
      else if (kind === 'crate') S.foes.push({ kind, x: x + 1, y: y + 2, w: 14, h: 14, hp: 2, flash: 0, still: true });
      else if (kind === 'boss') S.bossAt = x;
      else if (kind === 'coin') S.ents.push({ type: 'coin', x: x + 4, y: y + 4, w: 8, h: 8 });
      else { S.ents.push({ type: kind, x: x + 2, y: kind === 'flag' || kind === 'exit' ? y - 6 : y + 2, w: 12, h: kind === 'flag' || kind === 'exit' ? 22 : 12, on: false }); if (kind === 'file') S.filesTotal++; }
    });
    playMusic(true);
  }

  // move a body through the tiles (solid blocks, and platforms you can jump up through)
  function moveBody(lv, o, dt, oneWay = true) {
    o.x += o.vx * dt;
    const x0 = Math.floor(o.x / TS), x1 = Math.floor((o.x + o.w - 1) / TS), y0 = Math.floor((o.y - TOP) / TS), y1 = Math.floor((o.y - TOP + o.h - 1) / TS);
    o.bump = 0;
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
        if (ch === '#' || ch === 'B' || (oneWay && ch === '=' && prevBottom <= topY + 1)) { o.y = topY - o.h; o.vy = 0; o.ground = true; break; }
      }
    } else {
      const ty = Math.floor((o.y - TOP) / TS);
      for (let tx = ax0; tx <= ax1; tx++) if (ty >= 0 && solidAt(lv, tx, ty)) { o.y = (ty + 1) * TS + TOP; o.vy = 0; break; }
    }
  }

  // keyboard: arrows or A/D to move, Space / Z / Up / W to jump, X / J / Enter to fire, C / G to throw a grenade, Q / E or 1-5 for weapons
  const input = () => ({
    left: keys.ArrowLeft || keys.KeyA || touch.left, right: keys.ArrowRight || keys.KeyD || touch.right,
    jump: keys.Space || keys.KeyZ || keys.ArrowUp || keys.KeyW || keys.KeyK || touch.jump,
    fire: keys.KeyX || keys.KeyJ || keys.Enter || touch.fire || (touchMode && S && S.p && autoTarget(S.p)), nade: keys.KeyC || keys.KeyG || keys.KeyL || touch.nade,
  });

  function hurtPlayer(n = 1) {
    const p = S.p;
    if (p.hurt > 0 || S.dead) return;
    p.hp -= n; p.hurt = S.up.vest ? 1.8 : 1.1; S.shake = 0.25; sfx('hurt');
    if (p.hp <= 0) { S.dead = 1.4; S.deaths++; sfx('down'); }
  }
  function respawn() {
    const p = S.p;
    Object.assign(p, { x: S.spawn.x, y: S.spawn.y, vx: 0, vy: 0, hp: p.max, hurt: 1.5 });
    p.nades = Math.max(p.nades, 2);
    S.bullets = S.bullets.filter(b => b.mine);
    if (S.boss) S.boss.hp = Math.min(S.boss.max, S.boss.hp + 4);
  }
  function addFx(x, y, col, n = 6, sp = 60) { for (let i = 0; i < n; i++) S.fx.push({ x, y, vx: (Math.random() - 0.5) * sp * 2, vy: (Math.random() - 0.8) * sp, t: 0.4 + Math.random() * 0.3, col }); }
  function say(text, t = 2.2) { S.say = { text, t }; }

  // auto-aim: the nearest enemy in front of Adam, within a cone (so drones and Dr. Mørk can be hit)
  function aimAngle(p) {
    const cx = p.x + 5, cy = p.y + 9;
    let best = null, bd = 1e9;
    const consider = (x, y, w, h) => {
      const dx = x + w / 2 - cx, dy = y + h / 2 - cy;
      if (dx * p.face < 4) return;
      const d = Math.hypot(dx, dy), a = Math.atan2(dy, Math.abs(dx));
      if (d < 250 && Math.abs(a) < 1.05 && d < bd) { bd = d; best = a; }
    };
    S.foes.forEach(f => { if (!f.dead && !f.still) consider(f.x, f.y, f.w, f.h); });
    if (S.boss && !S.boss.down) consider(S.boss.x, S.boss.y + 10, S.boss.w, S.boss.h - 10);
    return best;
  }
  // on a touch screen Adam fires by himself at whatever he could hit: an enemy in his sights, or a crate just ahead
  function autoTarget(p) {
    if (aimAngle(p) != null) return true;
    return S.foes.some(f => f.still && !f.dead && (f.x + 7 - p.x - 5) * p.face > 4 && (f.x + 7 - p.x - 5) * p.face < 140 && Math.abs(f.y - p.y - 6) < 20);
  }
  function fire(p) {
    const w = weaponOf(p.weapon);
    p.cd = w.rate * (p.power > 0 ? 0.5 : 1); p.shot = 0.06;
    const a0 = aimAngle(p) || 0, bx = p.face > 0 ? p.x + 16 : p.x - 8, by = p.y + 8;
    const n = w.pellets || 1;
    for (let k = 0; k < n; k++) {
      const a = a0 + (n > 1 ? (k - (n - 1) / 2) * (w.spread / (n - 1)) * 2 : 0) + (w.jitter ? (Math.random() - 0.5) * w.jitter * 2 : 0);
      const vx = Math.cos(a) * w.speed * p.face, vy = Math.sin(a) * w.speed;
      S.bullets.push({ mine: true, x: bx, y: by, w: w.pierce ? 10 : w.rocket ? 7 : 5, h: w.rocket ? 3 : 2, vx, vy, t: w.life, dmg: w.dmg, pierce: w.pierce, rocket: w.rocket, hit: w.pierce ? new Set() : null, col: w.col });
    }
    sfx(w.rocket ? 'rocket' : w.pierce ? 'laser' : 'shoot');
  }
  function swapWeapon(dir, to) {
    const owned = WEAPONS.filter(w => prog().owned.includes(w.id));
    if (owned.length < 2 && !to) return;
    const p = S.p;
    let i = owned.findIndex(w => w.id === p.weapon);
    if (to) { const w = owned.find(x => x.id === to); if (!w) return; p.weapon = w.id; }
    else p.weapon = owned[(i + dir + owned.length) % owned.length].id;
    prog().weapon = p.weapon; sfx('swap'); S.toast = { text: weaponOf(p.weapon).name().toUpperCase(), t: 1.2 };
  }
  function explode(x, y, r, dmg) {
    S.booms.push({ x, y, r, t: 0.3 }); addFx(x, y, '#ff9a3a', 14, 110); addFx(x, y, '#ffe08a', 8, 70); S.shake = Math.max(S.shake, 0.2); sfx('boom');
    S.foes.forEach(f => { if (!f.dead && Math.hypot(f.x + f.w / 2 - x, f.y + f.h / 2 - y) < r + f.w / 2) damageFoe(f, dmg); });
    if (S.boss && !S.boss.down && Math.hypot(S.boss.x + 32 - x, S.boss.y + 24 - y) < r + 30) damageBoss(dmg);
  }
  function dropCoins(x, y, n) { for (let i = 0; i < n; i++) S.ents.push({ type: 'coin', x: x + (Math.random() - 0.5) * 8, y, w: 8, h: 8, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 80, fall: true }); }
  function damageFoe(f, dmg) {
    f.hp -= dmg; f.flash = 0.1; sfx('hit');
    if (f.hp > 0) return;
    f.dead = true;
    const F = FOE[f.kind] || FOE.man;
    S.score += f.guard ? 1500 : F.score;
    dropCoins(f.x + f.w / 2 - 4, f.y + f.h / 2, f.guard ? 30 : F.coins);
    if (f.kind === 'crate' && Math.random() < 0.35) S.ents.push({ type: 'heal', x: f.x, y: f.y, w: 12, h: 12 });
    addFx(f.x + f.w / 2, f.y + f.h / 2, f.kind === 'crate' ? '#c48a50' : '#ff9a3a', f.guard ? 30 : 12, 90);
    sfx(f.guard ? 'bigboom' : 'boom');
    if (f.guard) say(T('The exit is open!', 'Udgangen er åben!'));
  }
  function damageBoss(dmg) {
    const b = S.boss; b.hp -= dmg; b.flash = 0.08; sfx('hit');
    if (b.hp <= 0) bossDown();
  }

  function update(dt) {
    S.t += dt;
    const lv = S.lv, p = S.p, inp = input();
    if (S.toast) { S.toast.t -= dt; if (S.toast.t <= 0) S.toast = null; }
    if (S.say) { S.say.t -= dt; if (S.say.t <= 0) S.say = null; }
    if (S.dead) { S.dead -= dt; if (S.dead <= 0) { S.dead = 0; respawn(); } updateFx(dt); return; }
    // ---- Adam ----
    const want = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    p.vx = want * RUN; if (want) p.face = want;
    if (p.ground) { p.coyote = 0.1; p.air = 0; } else p.coyote = Math.max(0, p.coyote - dt);
    const pressed = inp.jump && !p.jumpHeld;
    if (pressed) p.buf = 0.12; else p.buf = Math.max(0, p.buf - dt);
    if (p.buf > 0 && p.coyote > 0) { p.vy = -JUMP; p.buf = 0; p.coyote = 0; sfx('jump'); }
    else if (pressed && !p.ground && S.up.boots && p.air < 1) { p.vy = -JUMP * 0.85; p.air++; p.buf = 0; addFx(p.x + 5, p.y + 22, '#c9cdd3', 6, 40); sfx('jump'); }
    if (!inp.jump && p.vy < -110) p.vy = -110;   // a short hop when the button is let go early
    p.jumpHeld = inp.jump;
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    moveBody(lv, p, dt);
    if (S.boss && p.x < ARENA * TS) p.x = ARENA * TS;
    p.anim += dt * (want ? 12 : 0); p.frame = p.ground ? (want ? Math.floor(p.anim) : 0) : -1;
    if (p.ground) { const tx = Math.floor((p.x + 5) / TS), ty = Math.floor((p.y - TOP + p.h) / TS); if (tileAt(lv, tx, ty) !== '~' && tileAt(lv, tx, ty - 1) !== '^') S.safe = { x: p.x, y: p.y }; }
    p.hurt = Math.max(0, p.hurt - dt); p.power = Math.max(0, p.power - dt); p.cd -= dt; p.shot = Math.max(0, p.shot - dt);
    if (inp.fire && p.cd <= 0) fire(p);
    if (inp.nade && !p.nadeHeld && p.nades > 0) { p.nades--; S.nades.push({ x: p.x + 5, y: p.y + 4, w: 4, h: 4, vx: 150 * p.face + p.vx * 0.4, vy: -230, t: 1.1 }); sfx('throw'); }
    p.nadeHeld = inp.nade;
    if (touch.swap && !touch.swapHeld) swapWeapon(1); touch.swapHeld = touch.swap;
    // water, falling off, and the live rails
    const feetT = tileAt(lv, Math.floor((p.x + 5) / TS), Math.floor((p.y - TOP + p.h - 2) / TS));
    if (p.y > H + 20 || feetT === '~') { hurtPlayer(1); if (!S.dead) Object.assign(p, { x: S.safe.x, y: S.safe.y - 4, vx: 0, vy: 0 }); sfx('splash'); }
    if (feetT === '^') { hurtPlayer(1); p.vy = -220; }
    // ---- camera ----
    const maxCam = lv.len * TS - W;
    S.cam = S.boss ? ARENA * TS : Math.max(0, Math.min(maxCam, p.x - W * 0.4));
    if (S.bossAt != null && !S.boss && p.x > ARENA * TS + 40) startBoss();
    // ---- coins, pickups, flags and the exit ----
    S.guards = S.foes.filter(f => f.guard && !f.dead).length;
    S.ents.forEach(e => {
      if (e.gone) return;
      if (e.fall) { e.vy = Math.min(MAXFALL, e.vy + GRAV * dt); moveBody(lv, e, dt); if (e.ground) e.vx *= 0.8; if (e.y > H + 20) e.gone = true; }
      if (e.type === 'coin' && S.up.magnet) { const dx = p.x + 5 - e.x, dy = p.y + 10 - e.y, d = Math.hypot(dx, dy); if (d < 80) { e.fall = false; e.x += dx / d * 200 * dt; e.y += dy / d * 200 * dt; } }
      if (!hitBox(p, e)) return;
      if (e.type === 'coin') { e.gone = true; S.coins++; S.score += 10; sfx('coin'); }
      else if (e.type === 'file') { e.gone = true; S.files++; S.score += 250; sfx('pick'); addFx(e.x + 6, e.y, '#e9c35a', 5); }
      else if (e.type === 'heal') { if (p.hp < p.max) { e.gone = true; p.hp = Math.min(p.max, p.hp + 2); sfx('heal'); } }
      else if (e.type === 'power') { e.gone = true; p.power = 12; p.nades += 1; sfx('power'); S.toast = { text: T('DOUBLE FIRE RATE!', 'DOBBELT SKUDTEMPO!'), t: 1.5 }; }
      else if (e.type === 'flag' && !e.on) { e.on = true; S.spawn = { x: e.x, y: e.y - 4 }; sfx('flag'); }
      else if (e.type === 'exit' && !S.cleared) { if (S.guards) { if (!S.lockSaid) { S.lockSaid = true; say(T(`Defeat ${LEVELS[S.level].guard()} first!`, `Besejr ${LEVELS[S.level].guard()} først!`)); } } else finishLevel(); }
    });
    S.ents = S.ents.filter(e => !e.gone);
    // ---- enemies ----
    S.foes.forEach(f => {
      if (f.dead || f.still) return;
      f.flash = Math.max(0, f.flash - dt); f.cd -= dt;
      const dx = p.x - f.x, dy = p.y - f.y, onScreen = f.x > S.cam - 40 && f.x < S.cam + W + 40, near = Math.abs(dx) < 210 && onScreen;
      if (f.kind === 'drone') {
        f.ph += dt;
        if (near) f.x += Math.sign(dx) * Math.min(Math.abs(dx), 34 * dt);
        f.y = f.baseY + Math.sin(f.ph * 2.2) * 6;
        if (near && Math.abs(dx) < 30 && f.cd <= 0) { f.cd = 2.2; S.bullets.push({ x: f.x + 6, y: f.y + 10, w: 3, h: 4, vx: 0, vy: 90, grav: true, t: 3, bomb: true }); sfx('eshoot'); }
      } else if (f.kind === 'turret') {
        f.face = dx > 0 ? 1 : -1;
        if (near && Math.abs(dy) < 60 && f.cd <= 0) { f.cd = 2; S.bullets.push({ x: f.x + (f.face > 0 ? 20 : -6), y: f.y + 5, w: 4, h: 2, vx: f.face * 170, vy: 0, t: 2.5 }); sfx('eshoot'); }
      } else {
        // walkers: henchmen, shield men, jumpers, snipers and the heavies
        const sees = near && Math.abs(dy) < (f.kind === 'sniper' ? 120 : 50);
        const speed = f.kind === 'heavy' ? 22 : f.kind === 'shield' ? 22 : 32;
        if (f.kind === 'sniper') { f.face = dx > 0 ? 1 : -1; f.vx = 0; }
        else if (f.kind === 'shield' || f.kind === 'heavy') { if (sees) { f.face = dx > 0 ? 1 : -1; f.vx = Math.abs(dx) > 40 ? speed * f.face : 0; } else if (!f.vx) f.vx = speed * f.face; }
        else if (sees && f.kind === 'man') { f.face = dx > 0 ? 1 : -1; f.vx = 0; }
        else if (!f.vx && f.ground) f.vx = speed * f.face;
        if (f.kind === 'jumper' && sees && f.ground && f.cd <= 0) { f.cd = 1.4 + Math.random(); f.face = dx > 0 ? 1 : -1; f.vy = -300; f.vx = f.face * 120; f.leap = true; sfx('jump2'); }
        f.vy = Math.min(MAXFALL, f.vy + GRAV * dt);
        moveBody(lv, f, dt);
        if (f.ground && f.leap) { f.leap = false; f.vx = speed * f.face; }
        if (!f.leap && f.kind !== 'sniper') {
          const ahead = Math.floor((f.x + (f.vx > 0 ? f.w + 2 : -2)) / TS), below = Math.floor((f.y - TOP + f.h + 2) / TS);
          if (f.bump || (f.ground && f.vx && !solidAt(lv, ahead, below) && tileAt(lv, ahead, below) !== '=')) { f.vx = -f.vx || speed; f.face = f.vx > 0 ? 1 : -1; }
          if (f.vx) f.face = f.vx > 0 ? 1 : -1;
          // a guard stays at his post by the exit
          if (f.guard && Math.abs(f.x - f.home) > 64 && Math.sign(f.vx) === Math.sign(f.x - f.home)) f.vx = -f.vx;
          if (sees && (f.kind === 'shield' || f.kind === 'heavy')) f.face = dx > 0 ? 1 : -1;
        }
        f.frame = f.vx ? Math.floor(S.t * 8) : 0;
        if (f.kind === 'man' && sees && f.cd <= 0) {
          f.cd = 1.3 + Math.random() * 0.8;
          if (S.enemy === 'clown') S.bullets.push({ x: f.x + 5, y: f.y + 6, w: 6, h: 4, vx: f.face * 120, vy: -170, grav: true, t: 3, pie: true });
          else S.bullets.push({ x: f.x + (f.face > 0 ? 14 : -4), y: f.y + 9, w: 4, h: 2, vx: f.face * 150, vy: 0, t: 2.5 });
          sfx('eshoot');
        }
        if (f.kind === 'sniper') {
          // a red line first, then a fast shot along it: step out of the way
          if (sees && !f.aim && f.cd <= 0) { f.aim = 0.9; f.ax = p.x + 5; f.ay = p.y + 10; }
          if (f.aim) { f.aim -= dt; if (f.aim <= 0) { f.aim = 0; f.cd = 2.4; const ox = f.x + 5, oy = f.y + 9, a = Math.atan2(f.ay - oy, f.ax - ox); S.bullets.push({ x: ox, y: oy, w: 4, h: 3, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, t: 2, snipe: true }); sfx('snipe'); } }
        }
        if (f.kind === 'heavy' && sees && f.cd <= 0) {
          f.cd = f.guard ? 1.8 : 2.4;
          for (let k = 0; k < 3; k++) S.bullets.push({ x: f.x + (f.face > 0 ? 20 : -6), y: f.y + 12, w: 5, h: 3, vx: f.face * 160, vy: (k - 1) * 30, t: 2.5 });
          if (f.guard && f.hp < f.max / 2) S.bullets.push({ x: f.x + 8, y: f.y, w: 4, h: 4, vx: f.face * 90, vy: -200, grav: true, t: 3, bomb: true });
          sfx('eshoot');
        }
        if (f.y > H + 30) f.dead = true;
      }
      if (!f.dead && p.hurt <= 0 && hitBox(p, f)) hurtPlayer(1);
    });
    if (S.boss) updateBoss(dt);
    // ---- grenades ----
    S.nades.forEach(n => {
      n.t -= dt; n.vy += GRAV * dt; n.x += n.vx * dt; n.y += n.vy * dt;
      const tx = Math.floor(n.x / TS), ty = Math.floor((n.y - TOP + 4) / TS);
      if (ty >= 0 && (solidAt(lv, tx, ty) || tileAt(lv, tx, ty) === '=') && n.vy > 0) { n.y = ty * TS + TOP - 4; n.vy = -n.vy * 0.35; n.vx *= 0.6; }
      const hitFoe = S.foes.some(f => !f.dead && !f.still && hitBox(n, f)) || (S.boss && !S.boss.down && hitBox(n, S.boss));
      if (n.t <= 0 || hitFoe || n.y > H + 10) { n.t = -1; if (n.y < H) explode(n.x, n.y, 38, 7); }
    });
    S.nades = S.nades.filter(n => n.t > 0);
    S.booms.forEach(b => { b.t -= dt; }); S.booms = S.booms.filter(b => b.t > 0);
    // ---- bullets ----
    S.bullets.forEach(b => {
      b.t -= dt; if (b.grav) b.vy += GRAV * 0.6 * dt;
      if (b.rocket) { const sp = Math.hypot(b.vx, b.vy), k = (sp + 420 * dt) / sp; b.vx *= k; b.vy *= k; if (Math.random() < 0.5) S.fx.push({ x: b.x, y: b.y + 1, vx: -b.vx * 0.1, vy: 0, t: 0.25, col: '#c9cdd3' }); }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const tx = Math.floor((b.x + b.w / 2) / TS), ty = Math.floor((b.y - TOP + b.h / 2) / TS);
      if (ty >= 0 && solidAt(lv, tx, ty)) { b.t = 0; if (b.rocket) explode(b.x, b.y, 30, 3); else addFx(b.x, b.y, b.mine ? '#ffe08a' : '#f6dc8c', 3, 30); if (b.pie) addFx(b.x, b.y, '#fff', 6, 40); }
      if (b.t <= 0) return;
      if (b.mine) {
        for (const f of S.foes) {
          if (f.dead || !hitBox(b, f) || (b.hit && b.hit.has(f))) continue;
          // shields stop ordinary bullets from the front: go round, throw a grenade, or use the laser
          if (f.kind === 'shield' && !f.broken && !b.pierce && !b.rocket && Math.sign(b.vx) === -f.face) {
            b.t = 0; addFx(b.x, b.y, '#fff', 4, 40); sfx('clink');
            f.shieldHp = (f.shieldHp == null ? 6 : f.shieldHp) - 1;   // even a pistol breaks the shield in the end
            if (f.shieldHp <= 0) { f.broken = true; addFx(f.x + 10, f.y + 10, '#b8c0cc', 12, 70); sfx('boom'); }
            break;
          }
          if (b.rocket) { b.t = 0; damageFoe(f, b.dmg); explode(b.x, b.y, 30, 3); break; }
          damageFoe(f, b.dmg);
          if (b.pierce) b.hit.add(f); else { b.t = 0; break; }
        }
        if (b.t > 0 && S.boss && !S.boss.down && hitBox(b, S.boss) && !(b.hit && b.hit.has(S.boss))) {
          damageBoss(b.dmg);
          if (b.rocket) { b.t = 0; explode(b.x, b.y, 30, 3); } else if (b.pierce) b.hit.add(S.boss); else b.t = 0;
        }
      } else if (hitBox(b, p)) { b.t = 0; hurtPlayer(1); if (b.pie) addFx(b.x, b.y, '#fff', 8, 50); }
    });
    S.bullets = S.bullets.filter(b => b.t > 0 && b.x > S.cam - 60 && b.x < S.cam + W + 60 && b.y < H + 20 && b.y > -40);
    updateFx(dt);
    S.shake = Math.max(0, S.shake - dt);
  }
  function updateFx(dt) {
    S.fx.forEach(f => { f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 200 * dt; });
    S.fx = S.fx.filter(f => f.t > 0);
  }

  // ---- Dr. Mørk ----
  function startBoss() {
    S.boss = { x: ARENA * TS + 160, y: -50, w: 64, h: 40, hp: 70, max: 70, cd: 2, dive: 5, state: 'enter', flash: 0, t: 0, ph: 0, drop: 4 };
    say(T('Dr. Mørk: "Your hygge is MINE, Agent A!"', 'Dr. Mørk: "Jeres hygge er MIN, Agent A!"'), 3);
    sfx('alarm'); playMusic(true, true);
  }
  function updateBoss(dt) {
    const b = S.boss, p = S.p, ax = ARENA * TS;
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    if (b.down) { b.y += 30 * dt; if (Math.random() < 0.3) addFx(b.x + Math.random() * 64, b.y + Math.random() * 30, '#ff9a3a', 2, 60); return; }
    const frac = b.hp / b.max, fast = frac < 0.25 ? 1.5 : 1;
    if (b.state === 'enter') { b.y += 40 * dt; if (b.y >= 46) { b.y = 46; b.state = 'fly'; } return; }
    if (b.state === 'fly') {
      b.ph += dt * 0.8 * fast;   // the phase moves on, so speeding up never makes him jump
      b.x = ax + 160 + Math.sin(b.ph) * 150; b.y = 46 + Math.sin(b.t * 1.7) * 6;
      b.cd -= dt; b.dive -= dt;
      if (b.cd <= 0) {
        b.cd = (frac < 0.5 ? 1.2 : 1.7) / fast;
        const n = frac < 0.25 ? 5 : 3, cx = b.x + 32, cy = b.y + 40, ang = Math.atan2(p.y + 10 - cy, p.x + 5 - cx);
        for (let k = 0; k < n; k++) { const a = ang + (k - (n - 1) / 2) * 0.22; S.bullets.push({ x: cx, y: cy, w: 4, h: 4, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, t: 4, orb: true }); }
        sfx('eshoot');
      }
      if (frac < 0.5) { b.drop -= dt; if (b.drop <= 0 && S.foes.filter(f => f.kind === 'drone' && !f.dead && f.boss).length < 2) { b.drop = 5; S.foes.push({ kind: 'drone', boss: true, x: b.x + 25, y: b.y + 30, baseY: 60 + Math.random() * 30, w: 14, h: 10, hp: 1, cd: 1.5, flash: 0, ph: 0 }); } }
      if (b.dive <= 0) { b.state = 'dive'; b.dt = 0; b.tx = Math.max(ax + 10, Math.min(ax + W - 74, p.x - 27)); }
    } else if (b.state === 'dive') {
      // he swoops down to vacuum up Adam
      b.dt += dt;
      const k = Math.min(1, b.dt / 0.8);
      b.x += (b.tx - b.x) * Math.min(1, dt * 3); b.y = 46 + (140 - 46) * Math.sin(k * Math.PI / 2);
      if (b.dt > 2.6) b.state = 'rise';
      if (hitBox(p, { x: b.x + 6, y: b.y + 18, w: 52, h: 22 })) hurtPlayer(1);
    } else if (b.state === 'rise') {
      b.y -= 70 * dt; if (b.y <= 46) { b.y = 46; b.state = 'fly'; b.dive = 4.5 / fast; b.ph = Math.asin(Math.max(-1, Math.min(1, (b.x - ax - 160) / 150))); }
    }
  }
  function bossDown() {
    const b = S.boss;
    b.down = true; S.score += 3000; S.shake = 1; sfx('bigboom');
    dropCoins(b.x + 28, b.y + 20, 40);
    say(T('Dr. Mørk: "Nooo! My lovely candles!"', 'Dr. Mørk: "Neeej! Mine dejlige stearinlys!"'), 3);
    S.foes.forEach(f => { if (f.boss) f.dead = true; });
    S.ents.push({ type: 'exit', x: (ARENA + 21) * TS, y: 10 * TS + TOP - 6, w: 12, h: 22 });
  }

  function stars() { const all = S.files >= S.filesTotal, clean = S.deaths === 0; return all && clean ? 3 : all || clean ? 2 : 1; }
  function finishLevel() {
    S.cleared = true; S.screen = 'clear'; sfx('win'); stopMusic();
    const P = prog(), id = LEVELS[S.level].id;
    S.firstClear = !P.best[id];
    P.coins += S.coins;
    const res = { level: S.level, id, score: S.score, stars: stars(), files: S.files, filesTotal: S.filesTotal, deaths: S.deaths, coins: S.coins, first: S.firstClear };
    const prev = P.best[id];
    P.best[id] = { score: Math.max(res.score, prev ? prev.score : 0), stars: Math.max(res.stars, prev ? prev.stars : 0) };
    if (LEVELS.every(l => P.best[l.id])) P.done = true;
    S.result = res;
    if (opts && opts.onResult) opts.onResult(res);
  }

  // ---------------- drawing ----------------
  // The game is drawn at its own 384x216 and the screen scales it up with hard pixel edges (image-rendering: pixelated);
  // with the pixel font every letter stays sharp, and nothing large has to be repainted each frame.
  function draw() {
    const c = ctx;
    c.imageSmoothingEnabled = false;
    S.btns = [];
    if (S.screen === 'title') return drawTitle(c);
    if (S.screen === 'select') return drawSelect(c);
    if (S.screen === 'armory') return drawArmory(c);
    if (S.screen === 'ending') return drawEnding(c);
    const p = S.p;
    const sx = S.shake ? Math.round((Math.random() - 0.5) * 4) : 0, cam = Math.round(S.cam) + sx;
    c.drawImage(S.bg, -Math.round(cam * 0.5), 0);
    c.drawImage(S.tiles, -cam, TOP);
    S.ents.forEach(e => {
      if (e.x < cam - 20 || e.x > cam + W + 20) return;
      if (e.type === 'flag') drawFlag(c, e.x - cam, e.y, e.on, S.t);
      else if (e.type === 'exit') {
        R(c, e.x - cam - 2, e.y - 6, 18, 28, '#2a5a3a'); R(c, e.x - cam, e.y - 4, 14, 26, S.guards ? '#5a5a5a' : '#3f8a5a');
        txt(c, 'EXIT', e.x - cam - 3, e.y - 15, S.guards ? '#9aa0aa' : '#7fe0a0', 7);
        if (S.guards) lock(c, e.x - cam + 2, e.y + 4);
      } else if (e.type === 'coin') drawCoin(c, e.x - cam, e.y, S.t);
      else drawPickup(c, e.type, e.x - cam, e.y, S.t);
    });
    S.foes.forEach(f => {
      if (f.dead || f.x < cam - 40 || f.x > cam + W + 40) return;
      const fx = f.x - cam, fl = f.flash > 0;
      if (f.kind === 'drone') drawDrone(c, fx, f.y, S.t, fl);
      else if (f.kind === 'turret') drawTurret(c, fx, f.y, f.face, fl);
      else if (f.kind === 'crate') drawCrate(c, fx, f.y, fl);
      else if (f.kind === 'heavy') drawMan(c, fx - 1, f.y, f.face, S.enemy, f.frame, fl, 1.4, 'heavy');
      else {
        if (f.kind === 'sniper' && f.aim) { c.strokeStyle = 'rgba(255,40,60,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx + 5, f.y + 9); c.lineTo(f.ax - cam, f.ay); c.stroke(); }
        drawMan(c, fx, f.y, f.face, S.enemy, f.frame, fl, 1, f.kind === 'shield' && !f.broken ? 'shield' : f.kind === 'sniper' ? 'rifle' : null);
      }
    });
    if (S.boss) drawBoss(c, S.boss.x - cam, S.boss.y, S.t, S.boss.flash > 0, S.boss.hp / S.boss.max);
    if (!S.dead) drawAdam(c, p.x - cam, p.y, p.face, p.frame, p.shot > 0, p.hurt);
    S.nades.forEach(n => { R(c, n.x - cam, n.y, 4, 4, '#3f5a2a'); R(c, n.x - cam + 1, n.y - 1, 2, 1, '#9aa0aa'); });
    S.bullets.forEach(b => {
      const x = b.x - cam;
      if (b.mine) {
        if (b.rocket) { R(c, x, b.y, 7, 3, '#c9cdd3'); R(c, b.vx > 0 ? x + 5 : x, b.y, 2, 3, '#e8364d'); }
        else if (b.pierce) { R(c, x, b.y, 10, 2, b.col); R(c, x + 2, b.y, 6, 1, '#fff'); }
        else { R(c, x, b.y, b.w, b.h, b.col || '#ffe08a'); R(c, x + (b.vx > 0 ? 3 : 0), b.y, 2, 2, '#fff'); }
      } else if (b.pie) { R(c, x, b.y + 1, 6, 3, '#c98a3a'); R(c, x, b.y, 6, 2, '#fff'); }
      else if (b.orb) { R(c, x, b.y, 4, 4, '#b06aff'); R(c, x + 1, b.y + 1, 2, 2, '#fff'); }
      else if (b.bomb) { R(c, x, b.y, 3, 4, '#2a2c32'); R(c, x + 1, b.y - 1, 1, 1, '#e8364d'); }
      else if (b.snipe) { R(c, x, b.y, 5, 2, '#ff2840'); R(c, x + 1, b.y, 3, 1, '#fff'); }
      else R(c, x, b.y, b.w, b.h, '#ff5a5a');
    });
    S.booms.forEach(b => { const r = Math.round(b.r * (1 - b.t / 0.3 * 0.5)); c.fillStyle = `rgba(255,${150 + Math.round(b.t * 300)},60,${b.t * 2.5})`; c.beginPath(); c.arc(b.x - cam, b.y, r, 0, Math.PI * 2); c.fill(); });
    S.fx.forEach(f => R(c, f.x - cam, f.y, 2, 2, f.col));
    drawHud(c);
    if (S.say) { R(c, 14, 188, W - 28, 16, 'rgba(0,0,0,.72)'); txt(c, S.say.text, W / 2, 192, '#fff', 8, 'center'); }
    if (S.toast) txt(c, S.toast.text, W / 2, 40, '#ffd27a', 8, 'center');
    if (S.dead) { R(c, 0, 90, W, 30, 'rgba(0,0,0,.6)'); txt(c, T('AGENT DOWN!', 'AGENT NEDE!'), W / 2, 98, '#e8364d', 14, 'center'); }
    if (S.screen === 'brief') drawBrief(c);
    if (S.screen === 'clear') drawClear(c);
    if (S.paused) { R(c, 0, 0, W, H, 'rgba(0,0,0,.6)'); txt(c, T('PAUSED', 'PAUSE'), W / 2, 90, '#fff', 16, 'center'); txt(c, T('tap to continue', 'tryk for at fortsætte'), W / 2, 116, '#9aa0aa', 8, 'center'); }
  }
  function drawHud(c) {
    const p = S.p;
    R(c, 0, 0, W, 11, 'rgba(0,0,0,.6)');
    for (let i = 0; i < p.max; i++) heart(c, 3 + i * 8, 2, i < p.hp);
    let x = 6 + p.max * 8;
    txt(c, weaponOf(p.weapon).name().toUpperCase(), x, 2, p.power > 0 ? '#ffd27a' : '#7fd0ff', 8); x += textW(weaponOf(p.weapon).name(), 1) + 8;
    R(c, x, 3, 5, 5, '#3f5a2a'); txt(c, `${p.nades}`, x + 7, 2, '#c9e0a0', 8); x += 22;
    drawCoin(c, x, 2, 0); txt(c, `${S.coins}`, x + 10, 2, '#ffd96a', 8);
    txt(c, `${T('FILES', 'MAPPER')} ${S.files}/${S.filesTotal}`, W - 112, 2, '#e9c35a', 8);
    txt(c, String(S.score).padStart(5, '0'), W - 3, 2, '#fff', 8, 'right');
    const guard = S.foes.find(f => f.guard && !f.dead && Math.abs(f.x - p.x) < 260);
    const bar = S.boss && !S.boss.down ? { hp: S.boss.hp, max: S.boss.max, name: 'DR. MØRK' } : guard ? { hp: guard.hp, max: guard.max, name: LEVELS[S.level].guard().toUpperCase() } : null;
    if (bar) { R(c, 92, 14, 200, 6, '#2a1d3a'); R(c, 93, 15, Math.max(0, 198 * bar.hp / bar.max), 4, S.boss ? '#b06aff' : '#ff6a3a'); txt(c, bar.name, W / 2, 22, '#fff', 8, 'center'); }
  }
  function frameBox(c, x, y, w, h, col = '#7fd0ff') { R(c, x, y, w, h, '#0e1630'); R(c, x, y, w, 2, col); R(c, x, y + h - 2, w, 2, col); R(c, x, y, 2, h, col); R(c, x + w - 2, y, 2, h, col); }
  function button(c, x, y, w, h, label, act, col = '#3f8a5a', arg) {
    R(c, x, y, w, h, col); R(c, x, y + h - 2, w, 2, 'rgba(0,0,0,.35)'); txt(c, label, x + w / 2, y + Math.round((h - 7) / 2), '#fff', 8, 'center');
    S.btns.push({ x, y, w, h, act, arg });
  }
  function drawTitle(c) {
    R(c, 0, 0, W, H, '#0b0f24');
    for (let i = 0; i < 70; i++) R(c, (i * 97) % W, (i * 53) % 120, 1, 1, i % 5 ? '#4a5a8a' : '#fff');
    for (let x = 0; x < W; x += 22) { const h = 30 + ((x * 7) % 50); R(c, x, H - h, 20, h, '#16204a'); for (let yy = H - h + 5; yy < H; yy += 7) if ((x + yy) % 3) R(c, x + 4 + (yy % 2) * 8, yy, 2, 3, '#ffd98a'); }
    R(c, 176, 92, 4, 40, '#16204a'); R(c, 172, 80, 12, 14, '#16204a'); R(c, 177, 66, 2, 14, '#16204a');
    const glow = Math.floor(S.t * 3) % 2;
    txt(c, 'AGENT ADAM', W / 2, 28, glow ? '#ffd27a' : '#ffb347', 32, 'center', '#8a2a3a');
    txt(c, 'OPERATION HYGGE', W / 2, 66, '#7fd0ff', 12, 'center', '#16204a');
    drawAdam(c, 70, 120, 1, Math.floor(S.t * 8), Math.floor(S.t * 2) % 2 === 0, 0);
    drawMan(c, 300, 120, -1, 'suit', Math.floor(S.t * 8), false);
    if (Math.floor(S.t * 2) % 2) txt(c, T('TAP TO START', 'TRYK FOR AT STARTE'), W / 2, 150, '#fff', 12, 'center');
    txt(c, T('© 1997 D.A.N.E. - Danish Agency for Neutralising Evil', '© 1997 D.A.N.E. - Danmarks Agentur for Nedkæmpelse af Ondskab'), W / 2, 200, '#4a5a8a', 8, 'center', null);
  }
  function drawSelect(c) {
    R(c, 0, 0, W, H, '#0b0f24');
    txt(c, T('MISSIONS', 'MISSIONER'), W / 2, 6, '#ffd27a', 14, 'center', '#8a2a3a');
    const P = prog();
    drawCoin(c, W - 60, 8, S.t); txt(c, String(P.coins), W - 48, 8, '#ffd96a', 8);
    S.boxes = [];
    LEVELS.forEach((lv, i) => {
      const x = 8 + i * 62, y = 30, w = 58, h = 124, open = unlocked(i), th = THEMES[lv.id];
      frameBox(c, x, y, w, h, open ? '#7fd0ff' : '#2a3a6a');
      S.boxes.push({ x, y, w, h, i, open });
      txt(c, String(i + 1), x + w / 2, y + 6, open ? '#ffd27a' : '#3a4a6a', 16, 'center');
      S.thumbs = S.thumbs || {};
      if (!S.thumbs[lv.id]) S.thumbs[lv.id] = paintBackground(lv.id, 40);
      c.imageSmoothingEnabled = true; c.drawImage(S.thumbs[lv.id], 0, 0, W, H, x + 6, y + 26, w - 12, 28); c.imageSmoothingEnabled = false;
      R(c, x + 6, y + 50, w - 12, 4, th.ground); R(c, x + 6, y + 50, w - 12, 1, th.top);
      if (!open) { R(c, x + 6, y + 26, w - 12, 28, 'rgba(0,0,0,.55)'); lock(c, x + w / 2 - 5, y + 33); }
      wrap(c, lv.name().replace('Øresundsbroen', 'Øre- sunds- broen').replace('Amalienborg', 'Amalien- borg'), x + 5, y + 60, w - 8, open ? '#fff' : '#5a6a8a', 8, 10);
      const b = P.best[lv.id];
      if (b) { txt(c, '★'.repeat(b.stars) + '☆'.repeat(3 - b.stars), x + w / 2, y + 98, '#ffd27a', 8, 'center'); txt(c, String(b.score), x + w / 2, y + 110, '#7fd0ff', 8, 'center'); }
    });
    button(c, W / 2 - 70, 164, 140, 18, T('ARMORY', 'VÅBENKAMMER'), 'armory', '#8a2a3a');
    txt(c, P.done ? T('Denmark is safe. Hygge restored.', 'Danmark er reddet. Hyggen er tilbage.') : T('Tap a mission', 'Vælg en mission'), W / 2, 194, P.done ? '#7fe0a0' : '#9aa0aa', 8, 'center');
  }
  // the armory: weapons and upgrades on two tabs, paid with the coins from the missions
  function drawArmory(c) {
    R(c, 0, 0, W, H, '#0b0f24');
    const P = prog(), tab = S.tab || 'weapons';
    txt(c, T('ARMORY', 'VÅBENKAMMER'), 8, 6, '#ffd27a', 14, 'left', '#8a2a3a');
    drawCoin(c, W - 60, 10, S.t); txt(c, String(P.coins), W - 48, 10, '#ffd96a', 8);
    button(c, 8, 28, 120, 14, T('WEAPONS', 'VÅBEN'), 'tab', tab === 'weapons' ? '#2a5a8a' : '#1a2440', 'weapons');
    button(c, 132, 28, 120, 14, T('UPGRADES', 'OPGRADERINGER'), 'tab', tab === 'upgrades' ? '#2a5a8a' : '#1a2440', 'upgrades');
    const rows = tab === 'weapons' ? WEAPONS : UPGRADES;
    rows.forEach((it, i) => {
      const y = 46 + i * 28;
      if (tab === 'weapons') {
        const own = P.owned.includes(it.id), on = P.weapon === it.id;
        frameBox(c, 8, y, W - 16, 26, on ? '#ffd27a' : '#2a3a6a');
        drawWeaponIcon(c, it.id, 16, y + 8);
        txt(c, it.name().toUpperCase(), 46, y + 5, '#fff', 8);
        txt(c, it.desc(), 46, y + 15, '#9aa0aa', 8);
        if (on) txt(c, T('IN HAND', 'I HÅNDEN'), W - 16, y + 10, '#ffd27a', 8, 'right');
        else if (own) button(c, W - 76, y + 6, 60, 15, T('USE', 'BRUG'), 'equip', '#2a5a8a', it.id);
        else { button(c, W - 76, y + 6, 60, 15, `${it.cost}`, 'buyw', P.coins >= it.cost ? '#3f8a5a' : '#4a4a4a', it.id); drawCoin(c, W - 72, y + 9, 0); }
      } else {
        const lvl = P.up[it.id], max = it.costs.length, cost = it.costs[lvl];
        frameBox(c, 8, y, W - 16, 26, '#2a3a6a');
        txt(c, it.name().toUpperCase(), 18, y + 5, '#fff', 8);
        txt(c, it.desc(), 18, y + 15, '#9aa0aa', 8);
        for (let k = 0; k < max; k++) R(c, 24 + textW(it.name(), 1) + k * 7, y + 5, 5, 6, k < lvl ? '#ffd27a' : '#2a3a6a');
        if (lvl >= max) txt(c, 'MAX', W - 20, y + 10, '#7fe0a0', 8, 'right');
        else { button(c, W - 76, y + 6, 60, 15, `${cost}`, 'buyu', P.coins >= cost ? '#3f8a5a' : '#4a4a4a', it.id); drawCoin(c, W - 72, y + 9, 0); }
      }
    });
    button(c, W / 2 - 50, 194, 100, 16, T('BACK', 'TILBAGE'), 'levels', '#2a3a6a');
  }
  function drawWeaponIcon(c, id, x, y) {
    const g = '#9aa0aa', d = '#3a3d44';
    if (id === 'pistol') { R(c, x + 4, y, 12, 4, d); R(c, x + 6, y + 4, 4, 6, d); }
    else if (id === 'mg') { R(c, x, y, 20, 4, d); R(c, x + 6, y + 4, 4, 6, d); R(c, x + 12, y + 4, 3, 7, '#c9a23a'); R(c, x + 18, y + 1, 4, 2, g); }
    else if (id === 'spread') { R(c, x, y, 18, 5, '#7a5236'); R(c, x + 14, y - 1, 8, 2, d); R(c, x + 14, y + 4, 8, 2, d); R(c, x + 4, y + 5, 4, 5, '#7a5236'); }
    else if (id === 'laser') { R(c, x, y, 18, 5, '#e9e4d8'); R(c, x + 18, y + 1, 4, 3, '#7fe0ff'); R(c, x + 6, y + 5, 4, 5, '#e9e4d8'); R(c, x + 2, y + 1, 10, 1, '#7fe0ff'); }
    else { R(c, x, y - 1, 22, 6, '#4a5a3a'); R(c, x + 20, y - 2, 3, 8, d); R(c, x + 6, y + 5, 4, 5, d); }
  }
  function drawBrief(c) {
    R(c, 0, 0, W, H, 'rgba(5,8,20,.85)');
    frameBox(c, 26, 22, W - 52, 172);
    txt(c, `${T('MISSION', 'MISSION')} ${S.level + 1}: ${LEVELS[S.level].name().toUpperCase()}`, 40, 32, '#ffd27a', 12);
    txt(c, LEVELS[S.level].place, 40, 50, '#7fd0ff', 8);
    R(c, 40, 64, 30, 34, '#1d2650'); R(c, 46, 68, 18, 16, '#e6c0a0'); R(c, 44, 66, 22, 5, '#c9cdd3'); R(c, 48, 74, 5, 1, '#111'); R(c, 57, 74, 5, 1, '#111'); R(c, 42, 84, 26, 14, '#3a3d44');
    txt(c, T('Fru Mortensen, chief of D.A.N.E.:', 'Fru Mortensen, chef for D.A.N.E.:'), 78, 64, '#9aa0aa', 8);
    let y = wrap(c, LEVELS[S.level].brief(), 78, 76, W - 120, '#fff', 8, 11);
    if (LEVELS[S.level].guard) y = wrap(c, T(`The exit is guarded by ${LEVELS[S.level].guard()}.`, `Udgangen bevogtes af ${LEVELS[S.level].guard()}.`), 78, y + 2, W - 120, '#ff9a6a', 8, 11);
    txt(c, T('CONTROLS', 'STYRING'), 40, 140, '#7fd0ff', 8);
    txt(c, touchMode ? T('LEFT THUMB: SLIDE TO RUN   RIGHT THUMB: JUMP', 'VENSTRE TOMMEL: GLID FOR AT LØBE   HØJRE: HOP') : T('ARROWS MOVE  SPACE JUMP  X FIRE', 'PILE GÅ  MELLEMRUM HOP  X SKYD'), 40, 151, '#c9cdd3', 8);
    txt(c, touchMode ? T('ADAM FIRES BY HIMSELF   G GRENADE   W WEAPON', 'ADAM SKYDER SELV   G GRANAT   W VÅBEN') : T('C GRENADE  Q/E WEAPON  ESC PAUSE', 'C GRANAT  Q/E VÅBEN  ESC PAUSE'), 40, 162, '#c9cdd3', 8);
    if (Math.floor(S.t * 2) % 2) txt(c, T('TAP TO BEGIN', 'TRYK FOR AT BEGYNDE'), W / 2, 178, '#fff', 8, 'center');
  }
  function drawClear(c) {
    R(c, 0, 0, W, H, 'rgba(5,8,20,.82)');
    frameBox(c, 64, 26, W - 128, 160);
    txt(c, T('MISSION COMPLETE', 'MISSION FULDFØRT'), W / 2, 36, '#7fe0a0', 14, 'center');
    const r = S.result;
    txt(c, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), W / 2, 58, '#ffd27a', 16, 'center');
    txt(c, `${T('Score', 'Point')}: ${r.score}`, 90, 82, '#fff', 8);
    txt(c, `${T('Secret files', 'Hemmelige mapper')}: ${r.files}/${r.filesTotal}`, 90, 94, '#e9c35a', 8);
    txt(c, `${T('Coins', 'Mønter')}: +${r.coins}`, 90, 106, '#ffd96a', 8);
    txt(c, `${T('Times knocked down', 'Gange slået ned')}: ${r.deaths}`, 90, 118, '#9aa0aa', 8);
    if (r.first) txt(c, T('Overtime bonus for Adam: 2.000 kr', 'Overarbejdsbonus til Adam: 2.000 kr'), W / 2, 134, '#7fd0ff', 8, 'center');
    const last = S.level >= LEVELS.length - 1;
    button(c, 76, 154, 70, 18, T('MISSIONS', 'MISSIONER'), 'levels', '#2a3a6a');
    button(c, 157, 154, 70, 18, T('ARMORY', 'VÅBEN'), 'armory', '#8a2a3a');
    button(c, 238, 154, 70, 18, last ? T('THE END', 'SLUT') : T('NEXT', 'NÆSTE'), last ? 'ending' : 'next', '#3f8a5a');
  }
  function drawEnding(c) {
    R(c, 0, 0, W, H, '#0b0f24');
    R(c, 0, 120, W, 96, '#5a4636'); R(c, 0, 0, W, 120, '#2a3350');
    R(c, 120, 90, 150, 34, '#1d6b6b'); R(c, 112, 96, 16, 30, '#17595a'); R(c, 262, 96, 16, 30, '#17595a');
    R(c, 190, 0, 1, 40, '#999'); R(c, 180, 40, 22, 8, '#e9c35a'); R(c, 160, 48, 62, 40, 'rgba(255,217,138,.12)');
    drawAdam(c, 150, 98, 1, 0, false, 0);
    R(c, 232, 98, 10, 7, '#3b2418'); R(c, 232, 104, 10, 6, '#f3cdb0'); R(c, 233, 106, 8, 1, '#111'); R(c, 230, 110, 14, 10, '#2f6f73'); R(c, 232, 120, 3, 4, '#3b3040'); R(c, 238, 120, 3, 4, '#3b3040');
    const lines = [T('Denmark is saved. Every candle is back where it belongs.', 'Danmark er reddet. Alle stearinlys er tilbage, hvor de hører til.'), T('17:02. Adam comes home.', 'Klokken 17.02 kommer Adam hjem.'), T('Mie: "How was work, love?"', 'Mie: "Hvordan var arbejdet, skat?"'), T('Adam: "Oh, you know. Spreadsheets."', 'Adam: "Åh, du ved. Regneark."')];
    let y = 134; lines.forEach((l, i) => { if (S.t > i * 1.6) y = wrap(c, l, 24, y, W - 48, i === 3 ? '#ffd27a' : '#fff', 8, 11) + 3; });
    if (S.t > 7) txt(c, T('THE END - tap to return', 'SLUT - tryk for at vende tilbage'), W / 2, 200, '#7fd0ff', 8, 'center');
  }

  // ---------------- sound ----------------
  function sfx(n) {
    const A = DG.Audio; if (!A || !A.chip) return;
    const f = {
      shoot: () => A.chip(880, 0.06, 'square', 0.07, 0), eshoot: () => A.chip(300, 0.08, 'square', 0.04, 0),
      laser: () => A.chip(1800, 0.12, 'sawtooth', 0.05, 0, false), rocket: () => { A.noise(0.25, 0.2, 600); A.chip(140, 0.2, 'sawtooth', 0.06); },
      jump: () => { A.chip(330, 0.06, 'square', 0.06); A.chip(495, 0.06, 'square', 0.05, 0.05); }, jump2: () => A.chip(260, 0.08, 'square', 0.03),
      hit: () => A.noise(0.06, 0.15, 2400), boom: () => A.noise(0.35, 0.35, 700), bigboom: () => { A.noise(1.2, 0.5, 500); A.chip(80, 1, 'sawtooth', 0.1); },
      hurt: () => A.chip(160, 0.2, 'sawtooth', 0.09), down: () => [392, 330, 262, 196].forEach((fq, i) => A.chip(fq, 0.18, 'square', 0.08, i * 0.15)),
      pick: () => { A.chip(988, 0.05, 'square', 0.05); A.chip(1319, 0.08, 'square', 0.05, 0.05); }, coin: () => { A.chip(1568, 0.04, 'square', 0.035); A.chip(2093, 0.06, 'square', 0.03, 0.04); },
      heal: () => [523, 659, 784].forEach((fq, i) => A.chip(fq, 0.08, 'triangle', 0.1, i * 0.06)),
      power: () => [523, 659, 784, 1047].forEach((fq, i) => A.chip(fq, 0.08, 'square', 0.06, i * 0.05)), flag: () => [784, 988, 1175].forEach((fq, i) => A.chip(fq, 0.1, 'square', 0.05, i * 0.08)),
      splash: () => A.noise(0.3, 0.2, 1500), alarm: () => [0, 0.3, 0.6].forEach(w => { A.chip(660, 0.15, 'square', 0.06, w); A.chip(440, 0.15, 'square', 0.06, w + 0.15); }),
      win: () => [523, 659, 784, 1047, 784, 1047].forEach((fq, i) => A.chip(fq, 0.12, 'square', 0.07, i * 0.1)),
      clink: () => A.chip(2400, 0.05, 'triangle', 0.06), snipe: () => { A.noise(0.12, 0.3, 3000); A.chip(220, 0.1, 'square', 0.05); },
      throw: () => A.chip(500, 0.08, 'triangle', 0.06), swap: () => A.chip(700, 0.05, 'square', 0.04), buy: () => [880, 1175, 1568].forEach((fq, i) => A.chip(fq, 0.07, 'square', 0.05, i * 0.06)),
      no: () => A.chip(150, 0.15, 'square', 0.05),
    }[n];
    if (f) f();
  }
  // a little spy theme in the spirit of 1997: a walking bass and a minor melody
  const BASS = [45, 45, 52, 45, 48, 45, 52, 50], MEL = [69, 0, 72, 71, 69, 0, 64, 0, 69, 0, 72, 74, 76, 74, 72, 71];
  const BOSS_MEL = [69, 72, 76, 72, 69, 72, 77, 76, 74, 71, 74, 77, 76, 72, 69, 68];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function playMusic(on, boss) {
    stopMusic();
    if (!on || !DG.Audio || !DG.Audio.chip || !root) return;
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
  let shownPlay = null;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(1 / 30, (now - last) / 1000 || 0); last = now;
    if (!S) return;
    // the thumb controls only show while playing (taps on menus still reach the picture)
    const pl = S.screen === 'play' && !S.paused;
    if (root && pl !== shownPlay) { shownPlay = pl; root.classList.toggle('playing', pl); }
    if (S.screen === 'play' && !S.paused) { update(dt / 2); update(dt / 2); }
    else S.t += dt;
    draw();
  }
  const saved = () => { if (opts && opts.onSave) opts.onSave(); };
  function toSelect() { S = { screen: 'select', t: 0 }; playMusic(true); }
  function doButton(b) {
    const P = prog();
    if (b.act === 'armory') { S = { screen: 'armory', t: 0, tab: 'weapons' }; sfx('pick'); }
    else if (b.act === 'levels') toSelect();
    else if (b.act === 'tab') { S.tab = b.arg; sfx('swap'); }
    else if (b.act === 'next') { startLevel(S.level + 1); }
    else if (b.act === 'ending') { S = { screen: 'ending', t: 0 }; playMusic(true); }
    else if (b.act === 'equip') { P.weapon = b.arg; sfx('swap'); saved(); }
    else if (b.act === 'buyw') { const w = weaponOf(b.arg); if (P.coins >= w.cost && !P.owned.includes(w.id)) { P.coins -= w.cost; P.owned.push(w.id); P.weapon = w.id; sfx('buy'); saved(); } else sfx('no'); }
    else if (b.act === 'buyu') { const u = UPGRADES.find(x => x.id === b.arg), lvl = P.up[u.id], cost = u.costs[lvl]; if (cost != null && P.coins >= cost) { P.coins -= cost; P.up[u.id] = lvl + 1; sfx('buy'); saved(); } else sfx('no'); }
  }
  function tap(x, y) {
    if (!S) return;
    if (S.paused) { S.paused = false; return; }
    const b = (S.btns || []).find(k => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
    if (b) { doButton(b); return; }
    if (S.screen === 'title') { toSelect(); sfx('pick'); return; }
    if (S.screen === 'select') {
      const box = (S.boxes || []).find(k => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
      if (box && box.open) { startLevel(box.i); sfx('pick'); }
      return;
    }
    if (S.screen === 'brief') { S.screen = 'play'; return; }
    if (S.screen === 'ending' && S.t > 7) toSelect();
  }

  function onKey(e, down) {
    if (!root) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    keys[e.code] = down;
    if (down) useTouch(false);
    if (!down || e.repeat || !S) return;
    if (e.code === 'Escape') { if (S.screen === 'play') S.paused = !S.paused; else if (S.screen === 'select') DG.Agent.close(); else toSelect(); return; }
    if (S.screen === 'play') {
      if (e.code === 'KeyQ') swapWeapon(-1);
      else if (e.code === 'KeyE' || e.code === 'Tab') swapWeapon(1);
      else if (/^Digit[1-5]$/.test(e.code)) swapWeapon(0, WEAPONS[+e.code.slice(5) - 1].id);
      else if (e.code === 'KeyP') S.paused = !S.paused;
      return;
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      if (S.screen === 'select') { let i = LEVELS.length - 1; while (i > 0 && !unlocked(i)) i--; startLevel(i); }
      else if (S.screen === 'clear') doButton({ act: S.level >= LEVELS.length - 1 ? 'ending' : 'next' });
      else if (S.screen === 'armory') toSelect();
      else tap(W / 2, 100);
    }
  }
  const kd = e => onKey(e, true), ku = e => onKey(e, false);
  function onVis() { if (document.hidden && S && S.screen === 'play') S.paused = true; }

  function fit() {
    if (!cv) return;
    const w = g.innerWidth, h = g.innerHeight, full = Math.min(w / W, h / H);
    let sc = full;
    if (touchMode) {
      // keep a band of at least 130 px under the picture for the thumbs, unless that shrinks it too much
      const band = h - H * full;
      if (band < 130) sc = Math.max(full * 0.84, Math.min(w / W, (h - 130) / H));
    }
    cv.style.width = `${Math.floor(W * sc)}px`; cv.style.height = `${Math.floor(H * sc)}px`;
    if (root) { root.classList.toggle('touch', touchMode); root.style.setProperty('--band', `${Math.max(0, h - Math.floor(H * sc))}px`); }
  }

  // small buttons (grenade, weapon): held while a finger is on them, and a thumb can slide between them
  function pad(el, map) {
    const ptrs = new Map();
    const sync = () => { Object.values(map).forEach(k => { touch[k] = false; }); ptrs.forEach(k => { if (k) touch[k] = true; }); el.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', !!touch[b.dataset.k])); };
    const which = e => { const b = document.elementFromPoint(e.clientX, e.clientY); return b && b.dataset && b.dataset.k && el.contains(b) ? b.dataset.k : null; };
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useTouch(true); try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } ptrs.set(e.pointerId, which(e)); sync(); });
    el.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, which(e)); sync(); } });
    const up = e => { ptrs.delete(e.pointerId); sync(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  // a tap that isn't for the controls (menus, the briefing, pause) goes to the picture
  function tapCanvas(e) { const r = cv.getBoundingClientRect(); tap((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height); }
  const playing = () => S && S.screen === 'play' && !S.paused && !S.dead;
  // left half of the screen: put a thumb down anywhere and slide it left or right. The ring follows the
  // thumb if it slides far, so turning around is always a short slide.
  function stickZone(el, stick, knob) {
    let id = null, ox = 0, oy = 0;
    const DEAD = 12, MAX = 46;
    const show = (x, y, dx) => { stick.style.transform = `translate(${x}px, ${y}px)`; knob.style.transform = `translateX(${dx}px)`; stick.classList.add('on'); };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); useTouch(true);
      if (!playing()) { tapCanvas(e); return; }
      if (id != null) return;
      id = e.pointerId; ox = e.clientX; oy = e.clientY;
      try { el.setPointerCapture(id); } catch (err) { /* fine */ }
      show(ox, oy, 0);
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox;
      if (dx > MAX) { ox = e.clientX - MAX; dx = MAX; } else if (dx < -MAX) { ox = e.clientX + MAX; dx = -MAX; }
      touch.left = dx < -DEAD; touch.right = dx > DEAD;
      show(ox, oy, dx);
    });
    const up = e => { if (e.pointerId !== id) return; id = null; touch.left = touch.right = false; stick.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  // right half: press anywhere to jump (hold for a higher jump)
  function jumpZone(el) {
    const ptrs = new Set();
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); useTouch(true);
      if (!playing()) { tapCanvas(e); return; }
      ptrs.add(e.pointerId); touch.jump = true; el.classList.add('on');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    });
    const up = e => { ptrs.delete(e.pointerId); touch.jump = ptrs.size > 0; el.classList.toggle('on', touch.jump); };
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
    LEVELS, WEAPONS, UPGRADES, norm,
    // opts: { lang, progress (saved; filled in by norm), onResult(res), onSave(), onClose() }
    open(o) {
      if (root) return;
      opts = o; L = o.lang || 'en';
      if (opts.progress) norm(opts.progress);
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
          <div class="agent-zone left"><div class="agent-hint">◀ ▶</div></div>
          <div class="agent-zone right"><div class="agent-hint jump">A</div></div>
          <div class="agent-stick"><i></i></div>
          <div class="agent-pad"><span data-k="nade">G</span><span data-k="swap">W</span></div>`;
        cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
        cv.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') useTouch(true); tapCanvas(e); });
        stickZone(root.querySelector('.agent-zone.left'), root.querySelector('.agent-stick'), root.querySelector('.agent-stick i'));
        jumpZone(root.querySelector('.agent-zone.right'));
        pad(root.querySelector('.agent-pad'), { nade: 'nade', swap: 'swap' });
        S = { screen: 'title', t: 0 }; shownPlay = null; playMusic(true);
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
    // for tests: drive the game without tapping, and the pure physics for the reachability check
    _start(i) { startLevel(i); S.screen = 'play'; },
    _keys: keys,
    _step(dt) { if (S && S.screen === 'play') update(dt); },
    _phys: { moveBody, tileAt, solidAt, GRAV, RUN, JUMP, MAXFALL, TS, TOP, ROWS, W, H },
  };
})(typeof window !== 'undefined' ? window : globalThis);
