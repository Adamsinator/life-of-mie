// Danish: every generated customer request is fully translated, also when shown as one joined text,
// and a sentence pattern never runs into the next sentence.
// Run: node tests/i18n.test.js
const assert = require('assert');
global.window = global;
for (const f of ['i18n', 'lang-da', 'data', 'logic', 'stories']) require(`../js/${f}.js`);
DG.I18N.lang = 'da';
const tr = DG.tr;

const gitte = "Hi! I'm Gitte, a carpenter. My last dress fell apart in a week. Never again! It absolutely has to be tough enough for a working day. I'd love it to be comfortable. Long sleeves, please. I get cold. My budget is 470 kr.";
assert.strictEqual(tr(gitte), 'Hej! Jeg hedder Gitte og er tømrer. Min sidste kjole faldt fra hinanden på en uge. Aldrig igen! Den skal absolut være robust nok til en arbejdsdag. Jeg ville elske, hvis den var behagelig. Lange ærmer, tak. Jeg fryser let. Mit budget er 470 kr.');
assert.strictEqual(tr("Hi! I'm Rikke, a bride. Long sleeves, please. I get cold. My budget is 41.500 kr."), 'Hej! Jeg hedder Rikke og er brud. Lange ærmer, tak. Jeg fryser let. Mit budget er 41.500 kr.');
assert.strictEqual(tr('Bought 3 m Linen.'), 'Købte 3 m Hør.');
assert.strictEqual(tr("It's the most important dress of my life. No pressure! 😅 My budget is 900 kr."), 'Det er mit livs vigtigste kjole. Intet pres! 😅 Mit budget er 900 kr.');

// colour wishes: every colour name inside the sentence is translated too
const enColours = new RegExp(`\\b(${DG.COLORS.map(c => c.name.toLowerCase()).filter(n => tr(n) !== n).join('|')})\\b`);
const missing = new Map();
let n = 0;
for (const day of [1, 8, 20, 45, 90]) for (const rep of [0, 40, 100]) {
  const G = DG.newGame(); G.day = day; G.rep = rep;
  for (let i = 0; i < 300; i++) {
    const c = DG.genCustomer(G);
    if (!c.parts) continue;
    n++;
    const parts = c.parts.map(tr);
    c.parts.forEach((p, k) => { if (parts[k] === p || (/^I adore/.test(p) && enColours.test(parts[k]))) missing.set(parts[k], (missing.get(parts[k]) || 0) + 1); });
    assert.strictEqual(tr(c.text), parts.join(' '), `joined text differs from its parts:\n${c.text}`);
  }
}
assert.strictEqual(missing.size, 0, 'request lines without Danish:\n' + [...missing.keys()].join('\n'));
console.log(`i18n checks passed (${n} customers)`);
