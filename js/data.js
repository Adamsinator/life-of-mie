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
    { id: 'poly',     name: 'Polyester', price: 20,  tier: 0, tex: 'plain',   show: 'coral',   s: s(2, 5, 2, 0, 2, 3),  desc: 'Cheap and cheerful. Nobody brags about it.' },
    { id: 'cotton',   name: 'Cotton',    price: 34,  tier: 0, tex: 'weave',   show: 'sky',     s: s(5, 5, 3, 1, 3, 7),  desc: 'The honest all-rounder.' },
    { id: 'jersey',   name: 'Jersey',    price: 40,  tier: 0, tex: 'knit',    show: 'sage',    s: s(4, 4, 3, 1, 3, 9),  desc: 'Stretchy, soft and forgiving.' },
    { id: 'linen',    name: 'Linen',     price: 56,  tier: 0, tex: 'slub',    show: 'ivory',   s: s(6, 5, 4, 2, 5, 8),  desc: 'Breezy summer classic. Wrinkles with pride.' },
    { id: 'denim',    name: 'Denim',     price: 50,  tier: 0, tex: 'twill',   show: 'indigo',  s: s(6, 9, 4, 1, 2, 4),  desc: 'Built to survive anything.', colors: ['indigo', 'navy', 'sky', 'black', 'white'] },
    { id: 'canvas',   name: 'Canvas',    price: 44,  tier: 0, tex: 'weave',   show: 'mustard', s: s(5, 9, 2, 1, 1, 3),  desc: 'Basically a very durable tent.' },
    { id: 'chiffon',  name: 'Chiffon',   price: 66,  tier: 0, tex: 'sheer',   show: 'blush',   s: s(5, 1, 5, 3, 7, 6),  desc: 'Light and floaty. Fears staplers.' },
    { id: 'satin',    name: 'Satin',     price: 80,  tier: 0, tex: 'sheen',   show: 'rose',    s: s(6, 2, 4, 4, 8, 5),  desc: 'Glossy evening shine.' },
    { id: 'wool',     name: 'Wool',      price: 95,  tier: 1, tex: 'weave',   show: 'brown',   s: s(8, 7, 3, 4, 6, 6),  desc: 'Warm, structured and long-lasting.' },
    { id: 'lace',     name: 'Lace',      price: 125,  tier: 1, tex: 'lace',    show: 'white',   s: s(7, 1, 7, 6, 8, 4),  desc: 'Delicate floral openwork.' },
    { id: 'tweed',    name: 'Tweed',     price: 120,  tier: 1, tex: 'tweed',   show: 'sage',    s: s(8, 7, 6, 6, 6, 4),  desc: 'Heritage texture with attitude.' },
    { id: 'velvet',   name: 'Velvet',    price: 150,  tier: 1, tex: 'velvet',  show: 'plum',    s: s(8, 3, 6, 7, 9, 7),  desc: 'Deep, plush and dramatic.' },
    { id: 'silk',     name: 'Silk',      price: 210, tier: 1, tex: 'sheen',   show: 'emerald', s: s(9, 2, 5, 8, 10, 8), desc: 'The real deal. Handle with love.' },
    { id: 'organza',  name: 'Organza',   price: 160,  tier: 2, tex: 'sheer',   show: 'lavender',s: s(8, 1, 8, 8, 8, 3),  desc: 'Crisp, sheer and sculptural.' },
    { id: 'brocade',  name: 'Brocade',   price: 290, tier: 2, tex: 'brocade', show: 'red',     s: s(9, 4, 9, 10, 9, 4), desc: 'Woven gold motifs. Royalty approved.' },
    { id: 'cashmere', name: 'Cashmere',  price: 390, tier: 2, tex: 'knit',    show: 'ivory',   s: s(10, 5, 4, 10, 8, 10), desc: 'Unreasonably soft. Unreasonably priced.' },
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
    { id: 'zipper',      name: 'Zipper',            price: 12, icon: '🤐' },
    { id: 'btn_plastic', name: 'Plastic buttons',   price: 8,  icon: '⚪' },
    { id: 'btn_wood',    name: 'Wooden buttons',    price: 15, icon: '🟤' },
    { id: 'btn_brass',   name: 'Brass buttons',     price: 26, icon: '🟡' },
    { id: 'btn_pearl',   name: 'Pearl buttons',     price: 48, icon: '🦪', tier: 1 },
    { id: 'btn_gold',    name: 'Gold buttons',      price: 95, icon: '🪙', tier: 2 },
    { id: 'ribbon',      name: 'Ribbon',            price: 10, icon: '🎀' },
    { id: 'lacetrim',    name: 'Lace trim',         price: 30, icon: '🧶' },
    { id: 'sequins',     name: 'Sequins',           price: 36, icon: '✨' },
    { id: 'thread',      name: 'Embroidery thread', price: 25, icon: '🧵', needs: { embroidery: 1 } },
    { id: 'crystals',    name: 'Crystal beads',     price: 85, icon: '💎', needs: { embroidery: 2 } },
  ];

  DG.UPGRADES = [
    { id: 'machine',    name: 'Sewing machine',     icon: '🪡', costs: [400, 950, 1900], desc: 'Wider stitch zone, slower needle and +0.5 quality per level.' },
    { id: 'display',    name: 'Shop window',        icon: '🪟', costs: [350, 850, 1700], desc: 'Room for more customers each day, and they bring bigger budgets.' },
    { id: 'supplier',   name: 'Supplier network',   icon: '🚚', costs: [500, 1500],      desc: 'Level 1: wool, lace, tweed, velvet, silk, pearl buttons. Level 2: organza, brocade, cashmere, gold buttons.' },
    { id: 'embroidery', name: 'Embroidery machine', icon: '🌸', costs: [600, 1400],      desc: 'Level 1 unlocks embroidery. Level 2 unlocks crystal beading.' },
    { id: 'haggle',     name: 'Market haggling',    icon: '🤝', costs: [300, 700, 1400], desc: '8% off everything at the market, per level.' },
    { id: 'fitting',    name: 'Cozy fitting room',  icon: '🛋️', costs: [450, 1100],      desc: '+3 satisfaction per level, and happy customers tip more.' },
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
    { id: 'worker', title: 'Hands-on worker', minRep: 0, budget: [350, 600],
      w: { workwear: 3, comfort: 2, quality: 1 }, t: { workwear: 8, comfort: 6, quality: 5 },
      styles: ['shirt', 'pinafore', 'aline'], reqs: [['pockets', 0.8], ['longsleeves', 0.3]],
      jobs: ['gardener', 'veterinarian', 'chef', 'carpenter', 'florist', 'farmer', 'potter'],
      lines: ['I need a dress I can actually work in.', 'My last dress fell apart in a week. Never again!'] },
    { id: 'student', title: 'Student on a budget', minRep: 0, budget: [220, 380],
      w: { comfort: 3, creativity: 2 }, t: { comfort: 7, creativity: 5 },
      styles: ['aline', 'wrap', 'empire', 'pinafore'], reqs: [['notmaxi', 0.3]],
      jobs: ['student'],
      lines: ['Something fun for campus, and cheap-ish please!', 'Exams are over. I deserve a new dress!'] },
    { id: 'summer', title: 'Summer picnic', minRep: 0, budget: [300, 520],
      w: { comfort: 3, creativity: 1, elegance: 1 }, t: { comfort: 7, creativity: 5, elegance: 5 },
      styles: ['aline', 'empire', 'wrap'], reqs: [['shortsleeves', 0.7]],
      jobs: ['teacher', 'nurse', 'librarian', 'baker', 'dentist'],
      lines: ["We're having a picnic at Dyrehavsbakken this weekend!", 'Summer is finally here and my wardrobe is not ready.'] },
    { id: 'office', title: 'Office professional', minRep: 5, budget: [480, 800],
      w: { quality: 3, elegance: 2, comfort: 1, workwear: 1 }, t: { quality: 7, elegance: 6, comfort: 5, workwear: 4 },
      styles: ['sheath', 'shirt', 'wrap'], reqs: [['kneeplus', 0.7], ['nosequins', 0.4]],
      jobs: ['lawyer', 'accountant', 'actuary', 'architect', 'banker', 'project manager'],
      lines: ['I have a big board meeting coming up.', 'I need something sharp for the office.'] },
    { id: 'winter', title: 'Cozy winter', minRep: 10, budget: [450, 750],
      w: { comfort: 3, quality: 2, workwear: 1 }, t: { comfort: 8, quality: 7, workwear: 5 },
      styles: ['shirt', 'aline', 'sheath', 'empire'], reqs: [['longsleeves', 0.9]],
      jobs: ['teacher', 'postwoman', 'pharmacist', 'museum guide'],
      lines: ['Winter in Denmark is long and grey...', 'I want to be warm AND look nice for once.'] },
    { id: 'artist', title: 'Free-spirited artist', minRep: 10, budget: [500, 900],
      w: { creativity: 3, exclusivity: 1, comfort: 1 }, t: { creativity: 8, exclusivity: 5, comfort: 5 },
      styles: ['pinafore', 'empire', 'wrap', 'aline'], reqs: [['nopolyester', 0.4]],
      jobs: ['painter', 'musician', 'sculptor', 'poet', 'tattoo artist'],
      lines: ['My exhibition opens next week.', 'I want a dress that is a piece of art in itself.'] },
    { id: 'guest', title: 'Wedding guest', minRep: 15, budget: [600, 1000],
      w: { elegance: 3, quality: 1, creativity: 1 }, t: { elegance: 8, quality: 6.5, creativity: 5.5 },
      styles: ['aline', 'wrap', 'sheath', 'empire'], reqs: [['notwhite', 1.0]],
      jobs: ['teacher', 'engineer', 'nurse', 'dentist', 'journalist'],
      lines: ['My best friend is getting married!', "I'm invited to a wedding at a castle in Jutland."] },
    { id: 'influencer', title: 'Influencer', minRep: 30, budget: [800, 1300],
      w: { exclusivity: 3, creativity: 3 }, t: { exclusivity: 8, creativity: 8 },
      styles: ['mermaid', 'sheath', 'ballgown'], reqs: [['nopolyester', 1.0]],
      jobs: ['influencer', 'pop singer', 'TV host'],
      lines: ['I have 400k followers and they need content.', 'Nobody, and I mean NOBODY, can have this dress.'] },
    { id: 'gala', title: 'Gala night', minRep: 45, budget: [1200, 1900],
      w: { elegance: 3, exclusivity: 2, quality: 2 }, t: { elegance: 9, exclusivity: 7, quality: 8 },
      styles: ['ballgown', 'mermaid', 'sheath'], reqs: [['maxi', 0.9]],
      jobs: ['CEO', 'diplomat', 'opera singer', 'surgeon', 'countess'],
      lines: ['The Royal Theatre gala is next month.', 'There will be photographers. Many photographers.'] },
    { id: 'bride', title: 'Bride-to-be', minRep: 65, budget: [2000, 3200],
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
