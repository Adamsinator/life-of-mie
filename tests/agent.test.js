// Agent Adam: every secret file, coin, pickup, checkpoint and exit in every mission must be reachable with the
// basic jump (no upgrades). Simulates Adam's own physics (js/agent.js moveBody) from every place he can stand,
// trying every direction, jump length and a change of direction in mid-air, and follows where he lands.
// Run: node tests/agent.test.js
const assert = require('assert');
global.window = global; global.document = {};
require('../js/agent.js');
const A = global.DG.Agent, P = A._phys;
const { moveBody, tileAt, GRAV, RUN, MAXFALL, TS, TOP, H } = P;
const JUMP = +process.env.JUMP || P.JUMP;   // JUMP=285 shows what the first version's jump could not reach
const DT = 1 / 120;

let failures = 0;
for (const def of A.LEVELS) {
  const lv = def.data();
  const targets = lv.ents.filter(e => ['file', 'coin', 'heal', 'power', 'flag', 'exit'].includes(e.type)).map(e => {
    const x = e.x * TS, y = e.y * TS + TOP;
    return e.type === 'coin' ? { e, x: x + 4, y: y + 4, w: 8, h: 8 } : e.type === 'flag' || e.type === 'exit' ? { e, x: x + 2, y: y - 6, w: 12, h: 22 } : { e, x: x + 2, y: y + 2, w: 12, h: 12 };
  });
  if (def.id === 'bridge') targets.push({ e: { type: 'arena', x: 113, y: 10 }, x: 113 * TS, y: 0, w: 16, h: H });
  const reached = new Set();
  const seen = new Set(), queue = [];
  const key = o => `${Math.round(o.x / 8)},${Math.round(o.y)}`;
  const touch = o => targets.forEach((t, i) => { if (!reached.has(i) && o.x < t.x + t.w && o.x + o.w > t.x && o.y < t.y + t.h && o.y + o.h > t.y) reached.add(i); });
  const bad = o => { const t = tileAt(lv, Math.floor((o.x + 5) / TS), Math.floor((o.y - TOP + o.h - 2) / TS)); return o.y > H + 10 || t === '~' || t === '^'; };
  // land Adam from the spawn point
  const s0 = { x: 32, y: 120, w: 10, h: 22, vx: 0, vy: 0 };
  for (let i = 0; i < 400 && !s0.ground; i++) { s0.vy = Math.min(MAXFALL, s0.vy + GRAV * DT); moveBody(lv, s0, DT); }
  const push = o => { const k = key(o); if (!seen.has(k)) { seen.add(k); queue.push({ x: o.x, y: o.y }); } };
  push(s0);
  // one move: run in dir (switching to dir2 after tSwitch), holding jump for hold seconds (0 = just walk)
  function sim(st, dir, hold, tSwitch, dir2) {
    const o = { x: st.x, y: st.y, w: 10, h: 22, vx: 0, vy: hold > 0 ? -JUMP : 0, ground: true };
    let t = 0, left = false, walked = 0;
    for (; t < 3; t += DT) {
      const d = t < tSwitch ? dir : dir2;
      o.vx = d * RUN;
      if (hold > 0 && t > hold && o.vy < -110) o.vy = -110;
      o.vy = Math.min(MAXFALL, o.vy + GRAV * DT);
      const x0 = o.x;
      moveBody(lv, o, DT);
      touch(o);
      if (bad(o)) return;
      if (!o.ground) left = true;
      if (hold === 0) {
        walked += Math.abs(o.x - x0);
        if (o.ground && walked >= 16) { push(o); walked = 0; }
        if (o.ground && o.vx === 0 && t > 0.05) return;
        if (left && o.ground) { push(o); return; }
      } else if (left && o.ground) { push(o); return; }
    }
  }
  while (queue.length) {
    const st = queue.shift();
    for (const dir of [-1, 1]) sim(st, dir, 0, 9, dir);
    for (const dir of [-1, 0, 1]) for (const hold of [0.06, 0.18, 0.5]) {
      sim(st, dir, hold, 9, dir);
      if (dir) { sim(st, dir, hold, 0.25, 0); sim(st, dir, hold, 0.4, -dir); sim(st, 0, hold, 0.3, dir); }
    }
  }
  const missing = targets.filter((t, i) => !reached.has(i)).map(t => `${t.e.type}@${t.e.x},${t.e.y}`);
  console.log(`  ${def.id}: ${targets.length - missing.length}/${targets.length} reachable from ${seen.size} standing places${missing.length ? '  MISSING: ' + missing.join(' ') : ''}`);
  if (missing.length) failures++;
}
assert.strictEqual(failures, 0, 'some things in the missions cannot be reached');
console.log('agent reachability checks passed');
