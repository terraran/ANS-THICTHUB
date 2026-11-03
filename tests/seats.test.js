// ทดสอบตัวจัดที่นั่ง teacher/seats-core.js: node tests/seats.test.js
// ใช้ชื่อสมมติเท่านั้น (ห้ามใช้รายชื่อหรือคู่จริงของเด็ก)
const assert = require('assert');
const SC = require('../teacher/seats-core.js');

assert.strictEqual(SC.N, 25);
assert.strictEqual(SC.CAP, 24, 'seat 20 always empty');
// ตัวสุ่มแบบกำหนดค่าเริ่มได้ ให้ผลซ้ำได้ทุกครั้ง
const rng = seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const kids = n => Array.from({ length: n }, (_, i) => 'K' + (i + 1));
const posOf = (seating, n) => seating.indexOf(n);

// ทุกคนได้ที่นั่ง 1 ที่ · ไม่มีใครอยู่โต๊ะ 20 · ที่เหลือว่าง
for (const n of [0, 1, 23, 24]) {
  const { seating } = SC.solve(kids(n), {}, rng(n + 1));
  assert.strictEqual(seating.length, 25);
  assert.strictEqual(seating[19], '');
  assert.deepStrictEqual(seating.filter(Boolean).sort(), kids(n).sort());
}
assert.throws(() => SC.solve(kids(25), {}), /cap/);

// คู่ที่ต้องแยก (ห่างมาก) + นั่งติดกัน: ผ่านทุกครั้ง
const names = kids(23);
const cfg = { apart: [['K1', 'K2'], ['K1', 'K3'], ['K2', 'K3'], ['K4', 'K5']], together: [['K6', 'K7'], ['K8', 'K9']], level: 'vfar', zone: true };
for (let s = 1; s <= 40; s++) {
  const { seating, ev } = SC.solve(names, cfg, rng(s));
  assert.strictEqual(ev.hard, 0, 'seed ' + s);
  cfg.apart.forEach(([a, b]) => assert.ok(SC.GAP[posOf(seating, a)][posOf(seating, b)] >= SC.LEVELS.vfar, a + b));
  cfg.together.forEach(([a, b]) => assert.ok(SC.ADJ[posOf(seating, a)][posOf(seating, b)], a + b));
  assert.deepStrictEqual(seating.filter(Boolean).sort(), names.slice().sort());
}
// ชื่อในเงื่อนไขเทียบแบบไม่สนตัวพิมพ์/ช่องว่าง · คู่ที่มีชื่อไม่อยู่ในห้องถูกข้าม
let r = SC.solve(['ขิม ก', 'กาย', 'จีน'], { apart: [['ขิมก', 'กาย'], ['กาย', 'ไม่มี']], together: [] }, rng(3));
assert.ok(SC.GAP[posOf(r.seating, 'ขิม ก')][posOf(r.seating, 'กาย')] >= SC.LEVELS.vfar);
assert.deepStrictEqual(r.ev.detail.map(d => d.s), ['ok', 'missing']);

// evaluate: ใกล้เกินไป / โซนเดียวกัน / ไม่ได้นั่งติด
const empty = () => Array(25).fill('');
let s = empty(); s[7] = 'A'; s[8] = 'B'; s[0] = 'C'; s[16] = 'D';     // โต๊ะ 8-9 ติดกัน · 1 กับ 17 ไกลกันคนละโซน
let ev = SC.evaluate(s, { apart: [['A', 'B'], ['C', 'D']], together: [['A', 'C']] });
assert.deepStrictEqual(ev.detail.map(d => d.s), ['near', 'ok', 'split']);
assert.strictEqual(ev.hard, 2);
s = empty(); s[0] = 'A'; s[8] = 'B';                                   // โต๊ะ 1 กับ 9 โซน A ทั้งคู่ แต่ห่างกัน
ev = SC.evaluate(s, { apart: [['A', 'B']], together: [], level: 'far' });
assert.deepStrictEqual([ev.detail[0].s, ev.soft, ev.score], ['zone', 1, 1]);
assert.strictEqual(SC.evaluate(s, { apart: [['A', 'B']], together: [], zone: false }).score, 0);

// เงื่อนไขขัดกันเอง (ต้องนั่งติดกันและต้องแยกในคู่เดียวกัน): ยังคืนผังครบทุกคน แต่บอกว่าไม่ผ่าน
r = SC.solve(kids(10), { apart: [['K1', 'K2']], together: [['K1', 'K2']] }, rng(9));
assert.deepStrictEqual(r.seating.filter(Boolean).sort(), kids(10).sort());
assert.ok(r.ev.hard >= 1);
console.log('seats tests: ok');
