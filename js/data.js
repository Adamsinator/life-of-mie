// Static game data: fabrics, dress parts, notions, upgrades, customer archetypes.
(function (g) {
  const DG = (g.DG = g.DG || {});

  DG.ATTRS = ['quality', 'workwear', 'creativity', 'exclusivity', 'elegance', 'comfort'];
  DG.ATTR_META = {
    quality:     { label: 'Quality',     icon: '🏅', adj: 'beautifully made' },
    workwear:    { label: 'Workwear',    icon: '🛠️', adj: 'tough enough for a working day' },
    creativity:  { label: 'Creativity',  icon: '🎨', adj: 'creative and original' },
    exclusivity: { label: 'Exclusivity', icon: '👑', adj: 'exclusive, truly one of a kind' },
    elegance:    { label: 'Elegance',    icon: '🦢', adj: 'elegant' },
    comfort:     { label: 'Comfort',     icon: '☁️', adj: 'comfortable' },
  };

  const s = (quality, workwear, creativity, exclusivity, elegance, comfort) =>
    ({ quality, workwear, creativity, exclusivity, elegance, comfort });

  // price = base kr per metre; tier = supplier level needed
  DG.FABRICS = [
    { id: 'poly',     name: 'Polyester', price: 60,  tier: 0, tex: 'plain',   show: 'coral',   s: s(2, 5, 2, 0, 2, 3),  desc: 'Cheap and cheerful. Nobody brags about it.' },
    { id: 'cotton',   name: 'Cotton',    price: 120,  tier: 0, tex: 'weave',   show: 'sky',     s: s(5, 5, 3, 1, 3, 7),  desc: 'The honest all-rounder.' },
    { id: 'jersey',   name: 'Jersey',    price: 140,  tier: 0, tex: 'knit',    show: 'sage',    s: s(4, 4, 3, 1, 3, 9),  desc: 'Stretchy, soft and forgiving.' },
    { id: 'linen',    name: 'Linen',     price: 180,  tier: 0, tex: 'slub',    show: 'ivory',   s: s(6, 5, 4, 2, 5, 8),  desc: 'Breezy summer classic. Wrinkles with pride.' },
    { id: 'denim',    name: 'Denim',     price: 160,  tier: 0, tex: 'twill',   show: 'indigo',  s: s(6, 9, 4, 1, 2, 4),  desc: 'Built to survive anything.', colors: ['indigo', 'navy', 'sky', 'black', 'white'] },
    { id: 'canvas',   name: 'Canvas',    price: 140,  tier: 0, tex: 'weave',   show: 'mustard', s: s(5, 9, 2, 1, 1, 3),  desc: 'Basically a very durable tent.' },
    { id: 'chiffon',  name: 'Chiffon',   price: 220,  tier: 0, tex: 'sheer',   show: 'blush',   s: s(5, 1, 5, 3, 7, 6),  desc: 'Light and floaty. Fears staplers.' },
    { id: 'satin',    name: 'Satin',     price: 260,  tier: 0, tex: 'sheen',   show: 'rose',    s: s(6, 2, 4, 4, 8, 5),  desc: 'Glossy evening shine.' },
    { id: 'wool',     name: 'Wool',      price: 380,  tier: 1, tex: 'weave',   show: 'brown',   s: s(8, 7, 3, 4, 6, 6),  desc: 'Warm, structured and long-lasting.' },
    { id: 'lace',     name: 'Lace',      price: 600,  tier: 1, tex: 'lace',    show: 'white',   s: s(7, 1, 7, 6, 8, 4),  desc: 'Delicate floral openwork.' },
    { id: 'tweed',    name: 'Tweed',     price: 450,  tier: 1, tex: 'tweed',   show: 'sage',    s: s(8, 7, 6, 6, 6, 4),  desc: 'Heritage texture with attitude.' },
    { id: 'velvet',   name: 'Velvet',    price: 520,  tier: 1, tex: 'velvet',  show: 'plum',    s: s(8, 3, 6, 7, 9, 7),  desc: 'Deep, plush and dramatic.' },
    { id: 'silk',     name: 'Silk',      price: 650, tier: 1, tex: 'sheen',   show: 'emerald', s: s(9, 2, 5, 8, 10, 8), desc: 'The real deal. Handle with love.' },
    { id: 'organza',  name: 'Organza',   price: 420,  tier: 2, tex: 'sheer',   show: 'lavender',s: s(8, 1, 8, 8, 8, 3),  desc: 'Crisp, sheer and sculptural.' },
    { id: 'brocade',  name: 'Brocade',   price: 1100, tier: 2, tex: 'brocade', show: 'red',     s: s(9, 4, 9, 10, 9, 4), desc: 'Woven gold motifs. Royalty approved.' },
    { id: 'cashmere', name: 'Cashmere',  price: 1500, tier: 2, tex: 'knit',    show: 'ivory',   s: s(10, 5, 4, 10, 8, 10), desc: 'Unreasonably soft. Unreasonably priced.' },
  ];

  DG.COLORS = [
    { id: 'white',    name: 'White',    hex: '#f7f5ef' },
    { id: 'ivory',    name: 'Ivory',    hex: '#eee0c3' },
    { id: 'blush',    name: 'Blush',    hex: '#f1b9c2' },
    { id: 'rose',     name: 'Rose',     hex: '#d6577b' },
    { id: 'red',      name: 'Red',      hex: '#bf2630' },
    { id: 'coral',    name: 'Coral',    hex: '#ee7d61' },
    { id: 'mustard',  name: 'Mustard',  hex: '#d6a22a' },
    { id: 'sage',     name: 'Sage',     hex: '#9db69a' },
    { id: 'emerald',  name: 'Emerald',  hex: '#1e7a58' },
    { id: 'sky',      name: 'Sky blue', hex: '#8dc2e4' },
    { id: 'indigo',   name: 'Indigo',   hex: '#34437f' },
    { id: 'navy',     name: 'Navy',     hex: '#1e2b47' },
    { id: 'lavender', name: 'Lavender', hex: '#b6a4da' },
    { id: 'plum',     name: 'Plum',     hex: '#6b2a5e' },
    { id: 'brown',    name: 'Brown',    hex: '#7a5236' },
    { id: 'black',    name: 'Black',    hex: '#232326' },
  ];

  // m = metres of main fabric for a knee-length version
  DG.SILHOUETTES = [
    { id: 'aline',    name: 'A-line',      m: 2.2, d: { comfort: 1, elegance: 0.5 } },
    { id: 'sheath',   name: 'Sheath',      m: 1.7, d: { elegance: 1, quality: 0.5, comfort: -1 } },
    { id: 'wrap',     name: 'Wrap',        m: 2.4, d: { comfort: 1, elegance: 1, creativity: 0.5 }, noClosure: true },
    { id: 'shirt',    name: 'Shirt dress', m: 2.3, d: { workwear: 2, comfort: 1, elegance: -1 } },
    { id: 'empire',   name: 'Empire',      m: 2.3, d: { comfort: 1.5, elegance: 0.5, creativity: 0.5 } },
    { id: 'pinafore', name: 'Pinafore',    m: 2.0, d: { workwear: 2.5, creativity: 1, elegance: -2 } },
    { id: 'mermaid',  name: 'Mermaid',     m: 3.0, d: { elegance: 2, exclusivity: 1, comfort: -2, workwear: -3 } },
    { id: 'ballgown', name: 'Ball gown',   m: 4.5, d: { elegance: 2.5, exclusivity: 1.5, creativity: 1, comfort: -2.5, workwear: -4 } },
  ];

  DG.LENGTHS = [
    { id: 'mini', name: 'Mini', mult: 0.7,  d: { creativity: 1, elegance: -1, workwear: -0.5 } },
    { id: 'knee', name: 'Knee', mult: 1.0,  d: { workwear: 1 } },
    { id: 'midi', name: 'Midi', mult: 1.25, d: { elegance: 0.5, workwear: 0.5 } },
    { id: 'maxi', name: 'Maxi', mult: 1.6,  d: { elegance: 1.5, workwear: -2, comfort: -0.5 } },
  ];

  DG.NECKLINES = [
    { id: 'round',       name: 'Round',         d: { comfort: 0.5, workwear: 0.5 } },
    { id: 'vneck',       name: 'V-neck',        d: { elegance: 0.5 } },
    { id: 'square',      name: 'Square',        d: { creativity: 0.5, elegance: 0.5 } },
    { id: 'collar',      name: 'Collar',        d: { workwear: 1.5, quality: 0.5, elegance: -0.5 }, m: 0.15 },
    { id: 'sweetheart',  name: 'Sweetheart',    d: { elegance: 1.5, creativity: 0.5, workwear: -1 } },
    { id: 'offshoulder', name: 'Off-shoulder',  d: { elegance: 1, creativity: 1, workwear: -1.5, comfort: -0.5 } },
    { id: 'halter',      name: 'Halter',        d: { creativity: 1, elegance: 0.5, workwear: -1 } },
  ];

  DG.SLEEVES = [
    { id: 'none',  name: 'Sleeveless', m: 0,    d: { workwear: -0.5 } },
    { id: 'cap',   name: 'Cap',        m: 0.2,  d: { elegance: 0.5 } },
    { id: 'short', name: 'Short',      m: 0.35, d: { workwear: 0.5, comfort: 0.5 } },
    { id: 'long',  name: 'Long',       m: 0.6,  d: { workwear: 1, quality: 0.5 } },
    { id: 'puff',  name: 'Puff',       m: 0.6,  d: { creativity: 1.5, workwear: -0.5 } },
    { id: 'bell',  name: 'Bell',       m: 0.8,  d: { creativity: 1, elegance: 1, workwear: -1.5 } },
  ];

  DG.CLOSURES = [
    { id: 'none',    name: 'None',            d: {} },
    { id: 'zipper',  name: 'Zipper',          item: 'zipper',      d: { quality: 0.5 } },
    { id: 'plastic', name: 'Plastic buttons', item: 'btn_plastic', d: { quality: -0.5 },                 hex: '#f2f2f2' },
    { id: 'wood',    name: 'Wooden buttons',  item: 'btn_wood',    d: { creativity: 0.5, workwear: 0.5 }, hex: '#9a6b3f' },
    { id: 'brass',   name: 'Brass buttons',   item: 'btn_brass',   d: { workwear: 1, quality: 0.5 },      hex: '#c9a43a' },
    { id: 'pearl',   name: 'Pearl buttons',   item: 'btn_pearl',   d: { elegance: 1, exclusivity: 1 },    hex: '#f6f1e6' },
    { id: 'gold',    name: 'Gold buttons',    item: 'btn_gold',    d: { exclusivity: 2, elegance: 1 },    hex: '#f0c443' },
  ];

  // deco: counts towards the "over-decorated" penalty
  DG.EXTRAS = [
    { id: 'pockets',    name: 'Pockets',          icon: '👜', m: 0.3, d: { workwear: 2, comfort: 1, elegance: -0.5 } },
    { id: 'reinforced', name: 'Reinforced seams', icon: '🧷', d: { workwear: 2, quality: 1, comfort: -0.5 } },
    { id: 'ruffles',    name: 'Ruffles',          icon: '🌊', m: 0.6, deco: true, d: { creativity: 1.5, elegance: 0.5, workwear: -1 } },
    { id: 'belt',       name: 'Belt',             icon: '➰', item: 'ribbon', deco: true, d: { elegance: 0.5, creativity: 0.5 } },
    { id: 'bow',        name: 'Bow',              icon: '🎀', item: 'ribbon', deco: true, d: { creativity: 1, elegance: 0.5, workwear: -0.5 } },
    { id: 'lacetrim',   name: 'Lace trim',        icon: '🧶', item: 'lacetrim', deco: true, d: { elegance: 1, creativity: 0.5, exclusivity: 0.5, workwear: -0.5 } },
    { id: 'sequins',    name: 'Sequins',          icon: '✨', item: 'sequins', deco: true, d: { creativity: 1.5, exclusivity: 1, elegance: 0.5, comfort: -1, workwear: -1.5 } },
    { id: 'embroidery', name: 'Embroidery',       icon: '🌸', item: 'thread', deco: true, needs: { embroidery: 1 }, d: { creativity: 2, exclusivity: 1.5, quality: 0.5 } },
    { id: 'beading',    name: 'Crystal beading',  icon: '💎', item: 'crystals', deco: true, needs: { embroidery: 2 }, d: { exclusivity: 2.5, elegance: 1.5, comfort: -1, workwear: -2 } },
  ];

  DG.ITEMS = [
    { id: 'zipper',      name: 'Zipper',            price: 40, icon: '🤐' },
    { id: 'btn_plastic', name: 'Plastic buttons',   price: 30,  icon: '⚪' },
    { id: 'btn_wood',    name: 'Wooden buttons',    price: 60, icon: '🟤' },
    { id: 'btn_brass',   name: 'Brass buttons',     price: 90, icon: '🟡' },
    { id: 'btn_pearl',   name: 'Pearl buttons',     price: 220, icon: '🦪', tier: 1 },
    { id: 'btn_gold',    name: 'Gold buttons',      price: 450, icon: '🪙', tier: 2 },
    { id: 'ribbon',      name: 'Ribbon',            price: 40, icon: '🎀' },
    { id: 'lacetrim',    name: 'Lace trim',         price: 150, icon: '🧶' },
    { id: 'sequins',     name: 'Sequins',           price: 180, icon: '✨' },
    { id: 'thread',      name: 'Embroidery thread', price: 120, icon: '🧵', needs: { embroidery: 1 } },
    { id: 'crystals',    name: 'Crystal beads',     price: 400, icon: '💎', needs: { embroidery: 2 } },
  ];

  DG.UPGRADES = [
    { id: 'machine',    name: 'Sewing machine',     icon: '🪡', costs: [5000, 12000, 25000], desc: 'Wider stitch zone, slower needle and +0.5 quality per level.' },
    { id: 'display',    name: 'Shop window',        icon: '🪟', costs: [4000, 10000, 22000], desc: 'Room for more customers each day, and they bring bigger budgets.' },
    { id: 'supplier',   name: 'Supplier network',   icon: '🚚', costs: [6000, 18000],      desc: 'Level 1: wool, lace, tweed, velvet, silk, pearl buttons. Level 2: organza, brocade, cashmere, gold buttons.' },
    { id: 'embroidery', name: 'Embroidery machine', icon: '🌸', costs: [12000, 28000],      desc: 'Level 1 unlocks embroidery. Level 2 unlocks crystal beading.' },
    { id: 'haggle',     name: 'Market haggling',    icon: '🤝', costs: [3000, 8000, 16000], desc: '8% off everything at the market, per level.' },
    { id: 'accountant', name: 'Accountant (revisor)', icon: '🧮', costs: [12000, 35000], desc: 'Lower SKAT. Level 1: finds 1.000 kr more deductions every day. Level 2: virksomhedsordningen cuts the top rate from 52% to 42% and finds 2.500 kr of deductions a day.' },
    { id: 'fitting',    name: 'Cozy fitting room',  icon: '🛋️', costs: [5000, 12000],      desc: '+3 satisfaction per level, and happy customers tip more.' },
    { id: 'pottery',    name: 'Pottery studio',     icon: '🏺', costs: [8000, 20000], group: 'expansion', desc: 'Level 1: a potter\'s wheel and a small kiln for 3 pots. Level 2: an electric kiln for 5 pots, half as many cracks, and 2 more shelf spaces.' },
    { id: 'floor',      name: 'Upstairs floor',     icon: '🏠', costs: [150000],      group: 'expansion', desc: 'Opens the first floor: +1 customer per day, room for 1 more, and +2 rack hangers.' },
  ];

  // ---------------- seasons (7 days each, starting in spring) ----------------
  // in-season fabrics cost 12% more but please customers; off-season fabrics are 15% cheaper but annoy them.
  DG.SEASON_LENGTH = 7;
  DG.SEASONS = [
    { id: 'spring', name: 'Spring', icon: '🌷', in: ['cotton', 'linen', 'chiffon', 'lace'], out: ['cashmere', 'velvet', 'wool'],
      arche: { guest: 1.8, summer: 1.3, winter: 0.5 }, sky: '#dff0fa', hello: 'Spring has arrived! Wedding season is starting.' },
    { id: 'summer', name: 'Summer', icon: '☀️', in: ['linen', 'cotton', 'chiffon', 'jersey'], out: ['wool', 'velvet', 'cashmere', 'tweed'],
      arche: { summer: 2.5, guest: 1.6, winter: 0.15 }, sky: '#cbe8fb', hello: 'Summer! Everyone wants something light and breezy.' },
    { id: 'autumn', name: 'Autumn', icon: '🍂', in: ['tweed', 'wool', 'denim', 'velvet'], out: ['chiffon', 'organza', 'linen'],
      arche: { worker: 1.5, office: 1.4, summer: 0.3 }, sky: '#f3dcc2', hello: 'Autumn leaves are falling. Back to work and back to the office.' },
    { id: 'winter', name: 'Winter', icon: '❄️', in: ['wool', 'velvet', 'cashmere', 'brocade'], out: ['linen', 'chiffon', 'organza'],
      arche: { winter: 2.5, gala: 1.8, summer: 0.1 }, sky: '#dfe5ee', hello: 'Winter is here. Time for warm dresses and glittering galas.' },
  ];

  // ---------------- pottery ----------------
  DG.CLAYS = [
    { id: 'terracotta', name: 'Terracotta', price: 30,  mult: 0.8, hex: '#c4693d', tier: 0, desc: 'Warm, rustic and forgiving.' },
    { id: 'stoneware',  name: 'Stoneware',  price: 50, mult: 1.0, hex: '#b9a68e', tier: 0, desc: 'Sturdy everyday clay.' },
    { id: 'porcelain',  name: 'Porcelain',  price: 120, mult: 1.6, hex: '#f2efe8', tier: 1, desc: 'Translucent and precious. Needs supplier level 1.' },
  ];
  // kg of clay, base value, throwing difficulty
  DG.POT_SHAPES = [
    { id: 'cup',    name: 'Cup',    kg: 0.5, base: 250,  diff: 1.0 },
    { id: 'bowl',   name: 'Bowl',   kg: 0.8, base: 350,  diff: 1.2 },
    { id: 'plate',  name: 'Plate',  kg: 1.0, base: 380, diff: 1.1 },
    { id: 'vase',   name: 'Vase',   kg: 1.5, base: 650, diff: 1.6 },
    { id: 'teapot', name: 'Teapot', kg: 2.0, base: 1100, diff: 2.0 },
    { id: 'mug',     name: 'Mug',     kg: 0.6, base: 300,  diff: 1.1 },
    { id: 'planter', name: 'Planter', kg: 1.2, base: 420,  diff: 1.0 },
    { id: 'jug',     name: 'Jug',     kg: 1.4, base: 600,  diff: 1.5 },
    { id: 'amphora', name: 'Amphora', kg: 2.2, base: 1000, diff: 1.9 },
  ];
  DG.GLAZES = [
    { id: 'none',     name: 'Unglazed',        price: 0,  mult: 0.8, hex: null },
    { id: 'cream',    name: 'Speckled cream',  price: 75, mult: 1.1, hex: '#efe6d2', speckle: true },
    { id: 'celadon',  name: 'Celadon',         price: 120, mult: 1.25, hex: '#a9c9b4' },
    { id: 'cobalt',   name: 'Cobalt blue',     price: 150, mult: 1.3, hex: '#2f4f9e' },
    { id: 'copper',   name: 'Copper red',      price: 250, mult: 1.5, hex: '#a3262e', tier: 1 },
    { id: 'lustre',   name: 'Gold lustre',     price: 450, mult: 1.9, hex: '#d4a93a', tier: 2 },
  ];
  DG.POT_DECOS = [
    { id: 'none',    name: 'Plain',          mult: 1.0 },
    { id: 'carved',  name: 'Carved lines',   mult: 1.08 },
    { id: 'painted', name: 'Painted flowers',mult: 1.15 },
    { id: 'goldrim', name: 'Gold rim',       mult: 1.25, item: 'goldleaf' },
    { id: 'handpainted', name: 'Hand-painted', mult: 1.0, paint: true },  // value set by the painting itself
  ];
  DG.PAINT_COLORS = ['#2f4f9e', '#a3262e', '#1e7a58', '#e3b53b', '#f7f5ef', '#232326', '#d6577b', '#ee7d61'];
  DG.POT_ITEMS = [{ id: 'goldleaf', name: 'Gold leaf', price: 200, icon: '🟨' }];

  // ---------------- Mie's home ----------------
  DG.FAMILY = {
    adam:      { name: 'Adam',      look: { skin: '#efc3a0', hair: '#4a2c1a', style: 4, top: '#8db4d9', bg: 'transparent', glasses: false, earrings: false, shirt: true } },
    elizabeth: { name: 'Elizabeth', look: { skin: '#f6d7bf', hair: '#b07a3e', style: 5, top: '#f1b9c2', bg: 'transparent', glasses: false, earrings: false } },
  };
  // toys: one-off purchases. joy = instant happiness, each also slows the daily drop by 1.
  DG.HOME_ITEMS = [
    { id: 'crayons',   who: 'elizabeth', name: 'Crayons and paper', icon: '🖍️', cost: 60,  joy: 6,  desc: 'Elizabeth draws dresses "just like Mama".' },
    { id: 'teddy',     who: 'elizabeth', name: 'Teddy bear',        icon: '🧸', cost: 250,  joy: 8,  desc: 'Named Bamse, obviously.' },
    { id: 'train',     who: 'elizabeth', name: 'Wooden train',      icon: '🚂', cost: 600, joy: 10, desc: 'Choo-choo all around the living room.' },
    { id: 'puppets',   who: 'elizabeth', name: 'Puppet theatre',    icon: '🎭', cost: 800, joy: 12, desc: 'Starring Dexter, against his will.' },
    { id: 'tricycle',  who: 'elizabeth', name: 'Tricycle',          icon: '🚲', cost: 900, joy: 12, desc: 'Fast. Too fast, says Adam.' },
    { id: 'dollhouse', who: 'elizabeth', name: 'Dollhouse',         icon: '🏠', cost: 1500, joy: 15, desc: 'With a tiny atelier on the ground floor.' },
    { id: 'feather',   who: 'dexter',    name: 'Feather wand',      icon: '🪶', cost: 60,  joy: 4,  desc: 'Dexter pretends not to care. He cares.' },
    { id: 'scratch',   who: 'dexter',    name: 'Scratching post',   icon: '🪵', cost: 400, joy: 6,  desc: 'Saves the sofa. Mostly.' },
    { id: 'catbed',    who: 'dexter',    name: 'Cat bed',           icon: '🛏️', cost: 500, joy: 8,  desc: 'He still sleeps on the fabric pile.' },
    { id: 'cattower',  who: 'dexter',    name: 'Cat tower',         icon: '🗼', cost: 1200, joy: 10, desc: 'King Dexter surveys his kingdom.' },
  ];
  // Where the family lives: start in a rented flat, buy and move up in 5 steps to a Strandvejsvilla.
  // Homes are bought with a realkreditlån: 5% down payment, 30-year fixed-rate annuity at 4%.
  DG.MORTGAGE = { down: 0.05, rate: 0.04, years: 30 };
  DG.ADAM_SALARY = 1000;   // Adam's net pay per day, into the family budget
  // floor = family happiness never drops below this; each move also slows the nightly drop by 1.
  DG.HOUSES = [
    { id: 'flat',      name: 'Small flat in Nørrebro',          cost: 0, rent: 300,      joy: 0,  floor: 0,  view: 'city',
      desc: 'A rented two-room flat on the 4th floor, no lift. Cosy, says Mie. Small, says Adam.' },
    { id: 'frb',       name: 'Apartment on Frederiksberg',      cost: 4500000,   joy: 15, floor: 10, view: 'trees',
      desc: 'A room of her own for Elizabeth, and a balcony for Dexter to judge the birds from.' },
    { id: 'valby',     name: 'Rækkehus in Valby',               cost: 6500000,  joy: 20, floor: 20, view: 'garden',
      desc: 'A terraced house with a little garden and a door straight out.' },
    { id: 'lyngby',    name: 'Parcelhus in Lyngby',             cost: 11000000,  joy: 25, floor: 30, view: 'swing',
      desc: 'A proper house with a big garden, a swing and an apple tree.' },
    { id: 'hellerup',  name: 'Villa in Hellerup',               cost: 25000000, joy: 30, floor: 40, view: 'hedge',
      desc: 'Bay windows, herringbone floors and a wine cellar for Adam.' },
    { id: 'strandvej', name: 'Strandvejsvilla in Klampenborg',  cost: 75000000, joy: 40, floor: 50, view: 'sea',
      desc: 'The dream: a white villa on Strandvejen with a view over Øresund.' },
  ];
  // Mie's wardrobe: what she wears shows everywhere and adds style charm to the shop (worn items only).
  // slot: outfit | acc | glasses.  season: +1 extra charm when worn in that season.
  DG.WARDROBE = [
    { id: 'worktop',  slot: 'outfit', name: 'Teal work top',        cost: 0,    charm: 0, top: '#2f6f73', kind: 'tee',     desc: 'Comfy, practical, covered in threads.' },
    { id: 'breton',   slot: 'outfit', name: 'Breton stripes',       cost: 450,  charm: 1, top: '#1e2b47', kind: 'stripes', desc: 'Very French. Very chic.' },
    { id: 'knit',     slot: 'outfit', name: 'Chunky knit sweater',  cost: 900,  charm: 1, top: '#d6a22a', kind: 'knit',    season: 'winter', desc: 'Hygge you can wear. Extra charming in winter.' },
    { id: 'sundress', slot: 'outfit', name: 'Linen summer dress',   cost: 1100,  charm: 1, top: '#9db69a', kind: 'dress',   season: 'summer', desc: 'Light and breezy. Extra charming in summer.' },
    { id: 'blouse',   slot: 'outfit', name: 'Silk blouse with bow', cost: 1500,  charm: 2, top: '#f1b9c2', kind: 'blouse',  desc: 'Soft pink silk, sewn by Mie herself.' },
    { id: 'trench',   slot: 'outfit', name: 'Trench coat',          cost: 2500,  charm: 2, top: '#c9a87a', kind: 'blazer',  season: 'autumn', desc: 'For Copenhagen drizzle. Extra charming in autumn.' },
    { id: 'blazer',   slot: 'outfit', name: 'Tailored blazer',      cost: 3000, charm: 3, top: '#232326', kind: 'blazer',  desc: 'Means business. Bankers suddenly take her calls.' },
    { id: 'gown',     slot: 'outfit', name: 'Velvet evening gown',  cost: 8000, charm: 4, top: '#6b2a5e', kind: 'gown',    desc: 'For gala nights. Customers ask who made it.' },
    { id: 'measure',  slot: 'acc', name: 'Tape measure',            cost: 0,    charm: 0, desc: 'Never leaves home without it.' },
    { id: 'noacc',    slot: 'acc', name: 'No accessory',            cost: 0,    charm: 0, desc: 'Simple and clean.' },
    { id: 'clip',     slot: 'acc', name: 'Flower hair clip',        cost: 120,   charm: 1, color: '#d6577b', season: 'spring', desc: 'A little spring in her hair. Extra charming in spring.' },
    { id: 'scarf',    slot: 'acc', name: 'Silk scarf',              cost: 400,  charm: 1, color: '#c44d6c', desc: 'Tied the Parisian way.' },
    { id: 'beret',    slot: 'acc', name: 'Red beret',               cost: 350,  charm: 1, color: '#bf2630', desc: 'Artistic and a little bit cheeky.' },
    { id: 'pearls',   slot: 'acc', name: 'Pearl necklace',          cost: 3500,  charm: 2, color: '#f6f1e6', desc: 'A classic. Grandma would approve.' },
    { id: 'rdark',    slot: 'glasses', name: 'Round, dark brown',   cost: 0,    charm: 0, color: '#3a2a22', desc: 'Her trusty round glasses.' },
    { id: 'rtort',    slot: 'glasses', name: 'Round, tortoiseshell', cost: 1800, charm: 1, color: '#8a5a2b', desc: 'Warm and bookish.' },
    { id: 'rred',     slot: 'glasses', name: 'Round, cherry red',   cost: 2000,  charm: 1, color: '#bf2630', desc: 'A pop of colour.' },
    { id: 'rgold',    slot: 'glasses', name: 'Round, thin gold',    cost: 2500,  charm: 1, color: '#c99a2e', desc: 'Light and elegant.' },
  ];
  DG.WARDROBE_SLOTS = [['outfit', 'Outfits'], ['acc', 'Accessories'], ['glasses', 'Glasses']];

  DG.CAT_FOOD = { name: 'Cat food (7 days)', icon: '🐟', cost: 150, days: 7 };
  // once per day each; outings share one daily slot
  DG.ACTIVITIES = [
    { id: 'play',     name: 'Play with Elizabeth', icon: '🧩', cost: 0,   joy: 8,  free: true },
    { id: 'pet',      name: 'Pet Dexter',          icon: '🐈', cost: 0,   joy: 4,  free: true },
    { id: 'badminton', name: 'Badminton with Adam', icon: '🏸', cost: 150, joy: 12 },
    { id: 'beach',    name: 'Beach day at Amager Strand', icon: '🏖️', cost: 200, joy: 22, seasons: ['summer'] },
    { id: 'movie',    name: 'Movie night with popcorn', icon: '🍿', cost: 120, joy: 16, seasons: ['winter'] },
    { id: 'icecream', name: 'Ice cream in Nyhavn', icon: '🍦', cost: 180,  joy: 10 },
    { id: 'zoo',      name: 'Copenhagen Zoo',      icon: '🦒', cost: 600, joy: 18 },
    { id: 'date',     name: 'Date night with Adam',icon: '🕯️', cost: 1200, joy: 20 },
    { id: 'tivoli',   name: 'Family day at Tivoli',icon: '🎡', cost: 1500, joy: 30 },
  ];
  DG.HOME_EVENTS = [
    'Elizabeth drew a dress for the shop window. It has seven sleeves.',
    'Dexter knocked a spool of thread off the table. Then another. Then another.',
    'Adam made æbleskiver for everyone.',
    'Elizabeth asked why the sky is blue. Then why fabric is blue. Then why Dexter is grey.',
    'Dexter fell asleep on the pattern paper. Nobody dared to move him.',
    'Adam read "Rasmus Klump" three times in a row at bedtime.',
    'Elizabeth "helped" pin a hem. Mie found pins in the teddy bear.',
    'Dexter brought Mie a button. Probably from the shop. Probably expensive.',
    'The whole family had hygge with candles and cocoa.',
    'Elizabeth wore Mie\'s tape measure as a necklace all evening.',
  ];

  // ---------------- goals ----------------
  DG.GOALS = [
    { id: 'first',    title: 'First stitch',        desc: 'Deliver your first dress.',                       target: 1,    reward: 1000,  prog: G => G.stats.served },
    { id: 'happy5',   title: 'Word of mouth',       desc: 'Deliver 5 dresses that score 75% or more.',       target: 5,    reward: 2000,  prog: G => G.stats.happy },
    { id: 'worker5',  title: 'Built to last',       desc: 'Make 5 dresses for hands-on workers.',            target: 5,    reward: 2500,  prog: G => G.stats.byArche.worker || 0 },
    { id: 'regulars', title: 'Familiar faces',      desc: 'Have 3 regular customers at the same time.',      target: 3,    reward: 2000,  prog: G => G.known.length },
    { id: 'perfect',  title: 'Masterpiece',         desc: 'Deliver a dress that scores 95% or more.',        target: 95,   reward: 3000,  prog: G => G.stats.best },
    { id: 'rack3',    title: 'Off the rack',        desc: 'Sell 3 ready-to-wear dresses.',                    target: 3,    reward: 2000,  prog: G => G.stats.rackSold },
    { id: 'pots5',    title: 'Muddy hands',         desc: 'Sell 5 pieces of pottery.',                        target: 5,    reward: 2500,  prog: G => G.stats.potsSold },
    { id: 'charm10',  title: 'Cosy corner',         desc: 'Reach 10 shop charm.',                             target: 10,   reward: 3000,  prog: G => DG.charm(G) },
    { id: 'rep30',    title: 'Talk of the town',    desc: 'Reach reputation 30.',                             target: 30,   reward: 3000,  prog: G => Math.floor(G.rep) },
    { id: 'teapot',   title: 'Tea time',            desc: 'Fire a teapot in the kiln without it cracking.',  target: 1,    reward: 4000,  prog: G => G.stats.teapots },
    { id: 'seasons',  title: 'All year round',      desc: 'Deliver a dress in all four seasons.',             target: 4,    reward: 5000,  prog: G => G.stats.seasons.length },
    { id: 'bank5k',   title: 'Nest egg',            desc: 'Have 250.000 kr in the bank.',                     target: 250000, reward: 10000,  prog: G => Math.floor(G.money) },
    { id: 'floor',    title: 'Moving on up',        desc: 'Open the upstairs floor.',                         target: 1,    reward: 10000,  prog: G => DG.upgradeLevel(G, 'floor') },
    { id: 'rep60',    title: 'Copenhagen icon',     desc: 'Reach reputation 60.',                             target: 60,   reward: 8000,  prog: G => Math.floor(G.rep) },
    { id: 'day30',    title: 'One month in',        desc: 'Keep the atelier open for 30 days.',               target: 30,   reward: 15000, prog: G => G.day },
    { id: 'family',   title: 'Happy home',          desc: 'Get family happiness to 90.',                      target: 90,   reward: 3000,  prog: G => Math.floor(G.home.happy) },
    { id: 'artist',   title: 'Potter and painter',  desc: 'Fire a hand-painted pot.',                        target: 1,    reward: 2500,  prog: G => G.stats.painted },
    { id: 'move1',    title: 'Room to grow',        desc: 'Move out of the small flat in Nørrebro.',         target: 1,    reward: 25000,  prog: G => G.home.house },
    { id: 'dream',    title: 'Strandvejsvilla!',    desc: 'Move into the villa on Strandvejen.',             target: 5,    reward: 250000, prog: G => G.home.house },
    { id: 'style',    title: 'Style icon',          desc: 'Wear an outfit worth 5 style charm.',             target: 5,    reward: 4000,  prog: G => DG.styleCharm(G) },
    { id: 'bride',    title: 'Say yes to the dress',desc: "Make a bride's dress that scores 85% or more.",   target: 85,   reward: 25000, prog: G => G.stats.brideBest },
  ];

  // Decor: bought once, shown in the shop scene. Charm raises satisfaction (+0.25 each) and budgets (+1% each).
  DG.DECOR = [
    { id: 'plant',      name: 'Monstera plant',   icon: '🪴', cost: 1200, charm: 1, desc: 'A big green friend by the door.' },
    { id: 'windowbox',  name: 'Window flowers',   icon: '🌷', cost: 1500, charm: 1, desc: 'Tulips under the shop window.' },
    { id: 'rug',        name: 'Persian rug',      icon: '🟥', cost: 1800, charm: 1, desc: 'Soft underfoot, lovely to look at.' },
    { id: 'mirror',     name: 'Gilded mirror',    icon: '🪞', cost: 2600, charm: 2, desc: 'Customers love seeing themselves in your work.' },
    { id: 'gallery',    name: 'Sketch gallery',   icon: '🖼️', cost: 3000, charm: 2, desc: "Framed sketches of Mie's best designs." },
    { id: 'espresso',   name: 'Espresso machine', icon: '☕', cost: 3500, charm: 2, desc: 'A cup of coffee makes every fitting nicer.' },
    { id: 'armchair',   name: 'Velvet armchair',  icon: '🛋️', cost: 4200, charm: 2, desc: 'Somewhere for husbands and friends to wait.' },
    { id: 'neon',       name: 'Neon sign',        icon: '💡', cost: 5000, charm: 2, desc: "A glowing pink “Mie's” above the door." },
    { id: 'chandelier', name: 'Crystal chandelier', icon: '✨', cost: 7500, charm: 3, desc: 'Pure sparkle. The gala crowd notices.' },
  ];
  DG.WALLPAPERS = [
    { id: 'stripes',   name: 'Candy stripes', cost: 0,   charm: 0 },
    { id: 'botanical', name: 'Botanical',     cost: 2800, charm: 1 },
    { id: 'damask',    name: 'Damask',        cost: 3200, charm: 1 },
    { id: 'midnight',  name: 'Midnight gold', cost: 4500, charm: 2 },
  ];

  // Staff: one-off hiring fee + daily wage paid with the rent.
  DG.STAFF = [
    { id: 'apprentice', name: 'Oskar, apprentice', icon: '🧑‍🎓', fee: 3000, wage: 600,
      look: { skin: '#efc3a0', hair: '#e2c27a', style: 4, top: '#9db69a', bg: '#e2ecdf', glasses: false, earrings: false },
      desc: 'Cuts patterns so carefully that every dress uses 10% less fabric, and steadies the fabric so the stitch zone is wider.' },
    { id: 'assistant', name: 'Lise, shop assistant', icon: '💁‍♀️', fee: 4000, wage: 900,
      look: { skin: '#a06a44', hair: '#1c1c1c', style: 3, top: '#d6577b', bg: '#f5dfe4', glasses: true, earrings: true },
      desc: 'Room for one more customer each day. Customers you could not help leave with a voucher, so no reputation is lost.' },
  ];

  // Marketing: paid today, takes effect tomorrow.
  DG.MARKETING = [
    { id: 'flyers',    name: 'Flyers on Strøget',     icon: '📄', cost: 800,   minRep: 0,  desc: '+1 customer tomorrow.' },
    { id: 'newspaper', name: 'Ad in the local paper', icon: '📰', cost: 2200,  minRep: 0,  desc: '+1 customer and 15% bigger budgets tomorrow.' },
    { id: 'influencer',name: 'Influencer shout-out',  icon: '📱', cost: 5500,  minRep: 15, desc: "Tomorrow's first customer is one of the fanciest types you have unlocked." },
    { id: 'show',      name: 'Host a fashion show',   icon: '💃', cost: 12000, minRep: 35, desc: '+4 reputation right away and +2 customers tomorrow.' },
  ];

  DG.REQS = {
    pockets:     { short: 'Pockets',              text: 'It needs pockets!',                                  check: d => d.extras.includes('pockets') },
    longsleeves: { short: 'Long sleeves',         text: 'Long sleeves, please. I get cold.',                  check: d => d.sleeves === 'long' || d.sleeves === 'bell' },
    shortsleeves:{ short: 'Short or no sleeves',  text: 'Short sleeves or none. It will be hot!',             check: d => ['none', 'cap', 'short'].includes(d.sleeves) },
    kneeplus:    { short: 'Knee length or longer',text: 'Nothing shorter than the knee.',                     check: d => d.length !== 'mini' },
    notmaxi:     { short: 'Not floor length',     text: 'Not floor length. I bike everywhere.',               check: d => d.length !== 'maxi' },
    maxi:        { short: 'Floor length',         text: 'It must be floor length.',                           check: d => d.length === 'maxi' },
    nosequins:   { short: 'No sequins',           text: "No sequins, please. It's an office, not a disco.",   check: d => !d.extras.includes('sequins') },
    notwhite:    { short: 'Not white or ivory',   text: "And of course it can't be white or ivory!",          check: d => !['white', 'ivory'].includes(d.mainColor) },
    nopolyester: { short: 'No polyester',         text: 'Absolutely no polyester.',                           check: d => d.main !== 'poly' && d.accent !== 'poly' },
  };

  // w = weights (1-3), t = target levels (0-10), reqs = [id, probability]
  DG.ARCHETYPES = [
    { id: 'worker', title: 'Hands-on worker', minRep: 0, budget: [2800, 4800],
      w: { workwear: 3, comfort: 2, quality: 1 }, t: { workwear: 8, comfort: 6, quality: 5 },
      styles: ['shirt', 'pinafore', 'aline'], reqs: [['pockets', 0.8], ['longsleeves', 0.3]],
      jobs: ['gardener', 'veterinarian', 'chef', 'carpenter', 'florist', 'farmer', 'potter'],
      lines: ['I need a dress I can actually work in.', 'My last dress fell apart in a week. Never again!'] },
    { id: 'student', title: 'Student on a budget', minRep: 0, budget: [1800, 3000],
      w: { comfort: 3, creativity: 2 }, t: { comfort: 7, creativity: 5 },
      styles: ['aline', 'wrap', 'empire', 'pinafore'], reqs: [['notmaxi', 0.3]],
      jobs: ['student'],
      lines: ['Something fun for campus, and cheap-ish please!', 'Exams are over. I deserve a new dress!'] },
    { id: 'summer', title: 'Summer picnic', minRep: 0, budget: [2400, 4200],
      w: { comfort: 3, creativity: 1, elegance: 1 }, t: { comfort: 7, creativity: 5, elegance: 5 },
      styles: ['aline', 'empire', 'wrap'], reqs: [['shortsleeves', 0.7]],
      jobs: ['teacher', 'nurse', 'librarian', 'baker', 'dentist'],
      lines: ["We're having a picnic at Dyrehavsbakken this weekend!", 'Summer is finally here and my wardrobe is not ready.'] },
    { id: 'office', title: 'Office professional', minRep: 5, budget: [3800, 6400],
      w: { quality: 3, elegance: 2, comfort: 1, workwear: 1 }, t: { quality: 7, elegance: 6, comfort: 5, workwear: 4 },
      styles: ['sheath', 'shirt', 'wrap'], reqs: [['kneeplus', 0.7], ['nosequins', 0.4]],
      jobs: ['lawyer', 'accountant', 'actuary', 'architect', 'banker', 'project manager'],
      lines: ['I have a big board meeting coming up.', 'I need something sharp for the office.'] },
    { id: 'winter', title: 'Cozy winter', minRep: 10, budget: [3600, 6000],
      w: { comfort: 3, quality: 2, workwear: 1 }, t: { comfort: 8, quality: 7, workwear: 5 },
      styles: ['shirt', 'aline', 'sheath', 'empire'], reqs: [['longsleeves', 0.9]],
      jobs: ['teacher', 'postwoman', 'pharmacist', 'museum guide'],
      lines: ['Winter in Denmark is long and grey...', 'I want to be warm AND look nice for once.'] },
    { id: 'artist', title: 'Free-spirited artist', minRep: 10, budget: [4000, 7200],
      w: { creativity: 3, exclusivity: 1, comfort: 1 }, t: { creativity: 8, exclusivity: 5, comfort: 5 },
      styles: ['pinafore', 'empire', 'wrap', 'aline'], reqs: [['nopolyester', 0.4]],
      jobs: ['painter', 'musician', 'sculptor', 'poet', 'tattoo artist'],
      lines: ['My exhibition opens next week.', 'I want a dress that is a piece of art in itself.'] },
    { id: 'guest', title: 'Wedding guest', minRep: 15, budget: [4800, 8000],
      w: { elegance: 3, quality: 1, creativity: 1 }, t: { elegance: 8, quality: 6.5, creativity: 5.5 },
      styles: ['aline', 'wrap', 'sheath', 'empire'], reqs: [['notwhite', 1.0]],
      jobs: ['teacher', 'engineer', 'nurse', 'dentist', 'journalist'],
      lines: ['My best friend is getting married!', "I'm invited to a wedding at a castle in Jutland."] },
    { id: 'influencer', title: 'Influencer', minRep: 30, budget: [8000, 13000],
      w: { exclusivity: 3, creativity: 3 }, t: { exclusivity: 8, creativity: 8 },
      styles: ['mermaid', 'sheath', 'ballgown'], reqs: [['nopolyester', 1.0]],
      jobs: ['influencer', 'pop singer', 'TV host'],
      lines: ['I have 400k followers and they need content.', 'Nobody, and I mean NOBODY, can have this dress.'] },
    { id: 'gala', title: 'Gala night', minRep: 45, budget: [12000, 20000],
      w: { elegance: 3, exclusivity: 2, quality: 2 }, t: { elegance: 9, exclusivity: 7, quality: 8 },
      styles: ['ballgown', 'mermaid', 'sheath'], reqs: [['maxi', 0.9]],
      jobs: ['CEO', 'diplomat', 'opera singer', 'surgeon', 'countess'],
      lines: ['The Royal Theatre gala is next month.', 'There will be photographers. Many photographers.'] },
    { id: 'bride', title: 'Bride-to-be', minRep: 65, budget: [25000, 45000],
      w: { elegance: 3, quality: 3, exclusivity: 2, creativity: 1 }, t: { elegance: 9, quality: 9, exclusivity: 8, creativity: 6 },
      styles: ['ballgown', 'mermaid', 'aline', 'empire'], reqs: [['maxi', 1.0]],
      colors: { liked: ['white', 'ivory', 'blush'], disliked: ['black', 'red'] },
      jobs: ['bride'],
      lines: ["I'm getting married!! And I want YOU to make my dress.", "It's the most important dress of my life. No pressure! 😅"] },
  ];

  DG.NAMES = ['Freja', 'Ida', 'Sofie', 'Karen', 'Line', 'Birgitte', 'Hanne', 'Astrid', 'Emma', 'Clara', 'Signe', 'Maja',
    'Lærke', 'Nanna', 'Ditte', 'Agnes', 'Ellen', 'Vibeke', 'Pernille', 'Mette', 'Camilla', 'Rikke', 'Tove', 'Inger',
    'Josefine', 'Alma', 'Olivia', 'Thea', 'Sara', 'Lotte', 'Bente', 'Gitte', 'Malene', 'Asta', 'Liva', 'Dagmar'];

  DG.SKINS = ['#f6d7bf', '#efc3a0', '#dca47c', '#c68a5e', '#a06a44', '#7a4b2e', '#5a3620'];
  DG.HAIRS = ['#2a1b14', '#4a2c1a', '#7b4a2a', '#b07a3e', '#e2c27a', '#a33a1f', '#d9d4cc', '#1c1c1c', '#5b3f8a'];

  DG.QUOTES = {
    5: ["I'm speechless. This is the most beautiful thing I've ever owned!", 'Mie, you are a genius!', "I'm going to wear this until it falls apart. Which will be never."],
    4: ['I love it! Thank you so much.', 'Oh, this is lovely. Great work!', "Wonderful. I'll tell all my friends."],
    3: ["It's... nice. Not quite what I pictured, but nice.", 'Hmm, okay. It will do.', "It's fine. Just fine."],
    2: ["I'll pay, but I'm not thrilled.", 'This is not really what I asked for.', "Well... I suppose I can wear it at home."],
    1: ['This is NOT what I asked for!', "I can't wear this anywhere. Ever.", 'Are you sure you heard me right?'],
  };
})(typeof window !== 'undefined' ? window : globalThis);
