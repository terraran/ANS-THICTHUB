// ตัวจัดที่นั่ง (ไม่แตะหน้าเว็บ จึงเทสต์ด้วย node ได้: tests/seats.test.js)
// ผังห้องคอม 25 โต๊ะ 4 โซน หน้าห้องอยู่ด้านบน · พิกัดในกรอบ 536×640 · โต๊ะ 20 เว้นว่างเสมอ
// cfg = { apart: [[a,b]], together: [[a,b]], level: 'far'|'vfar', zone: true } มาจากแท็บ Seats ของห้อง
(function (root) {
const W = 536, H = 640;
const SEATS = [
  ['A', 60, 150, 46, 92], ['A', 106, 150, 92, 46], ['A', 106, 196, 92, 46], ['A', 198, 150, 46, 92],
  ['A', 60, 242, 46, 92], ['A', 106, 334, 92, 46], ['A', 60, 334, 46, 92], ['A', 60, 426, 92, 46], ['A', 152, 426, 92, 46],
  ['B', 338, 150, 92, 46], ['B', 430, 150, 46, 92], ['B', 338, 196, 92, 46], ['B', 430, 242, 46, 92],
  ['B', 338, 334, 92, 46], ['B', 430, 334, 46, 92], ['B', 292, 426, 92, 46], ['B', 384, 426, 92, 46],
  ['C', 20, 520, 104, 50], ['C', 124, 520, 104, 50], ['C', 124, 570, 104, 50],
  ['D', 288, 520, 48, 100], ['D', 336, 520, 90, 50], ['D', 426, 520, 90, 50], ['D', 336, 570, 90, 50], ['D', 426, 570, 90, 50]
].map((s, i) => ({ no: i + 1, zone: s[0], x: s[1], y: s[2], w: s[3], h: s[4] }));
const N = SEATS.length;
const RESERVED = [20];                                   // เลขโต๊ะที่เว้นว่างเสมอ
const AV = SEATS.map((s, i) => i).filter(i => !RESERVED.includes(SEATS[i].no));
const CAP = AV.length;
const LEVELS = { far: 80, vfar: 100 };                   // ระยะขอบโต๊ะถึงขอบโต๊ะขั้นต่ำ: ห่าง ≈ 2 ช่วงโต๊ะ · ห่างมาก = เกิน 2 ช่วง
// ระยะขอบถึงขอบระหว่างโต๊ะ (วัดทุกทิศ รวมข้ามทางเดิน)
const GAP = SEATS.map(a => SEATS.map(b => {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.hypot(dx, dy);
}));
// คู่โต๊ะที่นับว่า "นั่งติดกัน" (ด้านข้างชนกัน) · เลขโต๊ะ
const SIDE = [[8, 9], [16, 17], [18, 19], [22, 23], [24, 25], [1, 5], [5, 7], [11, 13], [13, 15]];
const ADJ = SEATS.map(() => SEATS.map(() => false));
SIDE.forEach(([a, b]) => { ADJ[a - 1][b - 1] = ADJ[b - 1][a - 1] = true; });

const nk = s => String(s || '').replace(/\s+/g, '').toUpperCase();   // เทียบชื่อแบบเดียวกับ Script
const minGap = cfg => LEVELS[cfg && cfg.level] || LEVELS.vfar;

// ตรวจผังที่นั่ง: hard = เงื่อนไขที่ไม่ผ่าน · soft = คู่ที่ต้องแยกแต่อยู่โซนเดียวกัน
function evaluate(seating, cfg) {
  const pos = {}, T = minGap(cfg), detail = [];
  let hard = 0, soft = 0;
  seating.forEach((n, i) => { if (n) pos[nk(n)] = i; });
  (cfg.apart || []).forEach(([a, b]) => {
    const i = pos[nk(a)], j = pos[nk(b)];
    if (i === undefined || j === undefined) return detail.push({ a, b, s: 'missing' });
    if (GAP[i][j] < T) { hard++; detail.push({ a, b, s: 'near' }); }
    else if (SEATS[i].zone === SEATS[j].zone) { soft++; detail.push({ a, b, s: 'zone' }); }
    else detail.push({ a, b, s: 'ok' });
  });
  (cfg.together || []).forEach(([a, b]) => {
    const i = pos[nk(a)], j = pos[nk(b)];
    if (i === undefined || j === undefined) return detail.push({ a, b, s: 'missing', t: 1 });
    if (ADJ[i][j]) detail.push({ a, b, s: 'tog', t: 1 }); else { hard++; detail.push({ a, b, s: 'split', t: 1 }); }
  });
  return { hard, soft, detail, score: hard * 1000 + (cfg.zone !== false ? soft : 0) };
}

function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

// วางคนที่มีเงื่อนไขก่อนด้วย backtracking (สุ่มลำดับ) แล้วเติมคนที่เหลือ · เก็บผังที่คะแนนดีที่สุด
// คืน { seating: [ชื่อ|'' ยาว 25 ตามเลขโต๊ะ], ev } · คนเกินที่นั่ง = throw
function solve(names, cfg, rnd) {
  rnd = rnd || Math.random; cfg = cfg || {};
  names = names.map(s => String(s).trim()).filter(Boolean);
  if (names.length > CAP) throw new Error('cap');
  const byKey = {}; names.forEach(n => { byKey[nk(n)] = n; });
  const T = minGap(cfg), apart = {}, tog = {}, cons = new Set();
  const link = (m, p) => {
    const a = byKey[nk(p[0])], b = byKey[nk(p[1])];
    if (!a || !b || a === b) return;
    (m[a] = m[a] || []).push(b); (m[b] = m[b] || []).push(a); cons.add(a); cons.add(b);
  };
  (cfg.apart || []).forEach(p => link(apart, p));
  (cfg.together || []).forEach(p => link(tog, p));
  let best = null, bestE = null, found = 0;
  for (let att = 0; att < 300 && found < 40; att++) {
    const order = shuffle([...cons], rnd), pos = {}, used = new Set();
    let nodes = 0;
    const bt = k => {
      if (k === order.length) return true;
      if (++nodes > 4000) return false;
      const n = order[k];
      for (const i of shuffle(AV.filter(i => !used.has(i)), rnd)) {
        if ((apart[n] || []).some(m => m in pos && GAP[i][pos[m]] < T)) continue;
        if ((tog[n] || []).some(m => m in pos && !ADJ[i][pos[m]])) continue;
        if ((tog[n] || []).some(m => !(m in pos)) && !AV.some(j => j !== i && !used.has(j) && ADJ[i][j])) continue;
        pos[n] = i; used.add(i);
        if (bt(k + 1)) return true;
        delete pos[n]; used.delete(i);
      }
      return false;
    };
    if (!bt(0)) continue;
    found++;
    const s = Array(N).fill('');
    for (const n in pos) s[pos[n]] = n;
    const free = shuffle(AV.filter(i => !used.has(i)), rnd);
    names.filter(n => !cons.has(n)).forEach((n, j) => { s[free[j]] = n; });
    const e = evaluate(s, cfg);
    if (!best || e.score < bestE.score) { best = s; bestE = e; }
    if (e.score === 0 || cfg.zone === false) break;
  }
  if (best) return { seating: best, ev: bestE };
  // เงื่อนไขขัดกันจนวางครบไม่ได้: สุ่มเฉย ๆ หลายรอบ เอาผังที่ผิดน้อยที่สุด
  const base = names.concat(Array(CAP - names.length).fill(''));
  for (let t = 0; t < 6000; t++) {
    const s0 = shuffle(base.slice(), rnd), s = Array(N).fill('');
    AV.forEach((k, j) => { s[k] = s0[j]; });
    const e = evaluate(s, cfg);
    if (!best || e.score < bestE.score) { best = s; bestE = e; }
    if (e.score === 0) break;
  }
  return { seating: best, ev: bestE };
}

const api = { W, H, SEATS, N, RESERVED, AV, CAP, LEVELS, GAP, ADJ, evaluate, solve };
if (typeof module === 'object' && module.exports) module.exports = api; else root.SeatCore = api;
})(this);
