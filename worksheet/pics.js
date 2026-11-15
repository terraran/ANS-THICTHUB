// ภาพการ์ตูน SVG สัปดาห์ 4 (วาดเองทั้งหมด) · ใช้ในใบงาน (gallery / aitest / mystery) และเกม teachbot / photocheck
// WSPics.get(id) → สตริง <svg> · id ดูได้จาก WSPics.ids
(() => {
const P = {};
const S = (vb, body) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${body}</svg>`;

// ---------- แมว (viewBox 0 0 200 160) ----------
// o: fur สีขน · dark สีลาย · belly · stripes · collar สีปลอกคอ · eye สีตา · pose sit|lie · bg/floor
//    skin = ไม่มีขน (ย่น หูใหญ่ หางเล็ก) · toy = ตุ๊กตา (ตากระดุม รอยเย็บ ป้ายราคา)
function catHead(o){
  const f = o.fur, big = o.skin ? 1.25 : 1;
  const ear = (s) => `<polygon points="${100 + s * 26},52 ${100 + s * 20 * big},${24 - (big - 1) * 30} ${100 + s * 4},40" fill="${f}"/>` +
    `<polygon points="${100 + s * 21},46 ${100 + s * 19 * big},${31 - (big - 1) * 26} ${100 + s * 9},40" fill="#f9a8d4"/>`;
  const eye = (x) => o.toy
    ? `<circle cx="${x}" cy="64" r="7.5" fill="#111827"/>${[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([a, b]) => `<circle cx="${x + a}" cy="${64 + b}" r="1.1" fill="#e5e7eb"/>`).join('')}`
    : `<ellipse cx="${x}" cy="64" rx="${o.skin ? 8.5 : 7}" ry="${o.skin ? 9.5 : 8}" fill="${o.eye || '#65a30d'}"/><ellipse cx="${x}" cy="64" rx="2.4" ry="6" fill="#0f172a"/><circle cx="${x + 2}" cy="60" r="1.8" fill="#fff"/>`;
  const wl = o.skin ? 18 : 26;
  const wh = s => [[-6, 72], [0, 80], [5, 88]].map(([d, y]) => `<line x1="${100 + s * 14}" y1="${78 + d / 4}" x2="${100 + s * (14 + wl)}" y2="${y - 2}" stroke="${o.toy ? '#fef3c7' : '#334155'}" stroke-width="1.4" ${o.toy ? 'stroke-dasharray="3 2"' : ''}/>`).join('');
  return ear(-1) + ear(1) + `<circle cx="100" cy="66" r="30" fill="${f}"/>` +
    (o.stripes ? `<path d="M90,38 l3,11 M100,36 v12 M110,38 l-3,11" stroke="${o.dark}" stroke-width="3.2" stroke-linecap="round"/>` : '') +
    (o.skin ? `<path d="M86,46 q14,-6 28,0 M88,51 q12,-5 24,0" stroke="#c08a80" stroke-width="1.6" fill="none"/>` : '') +
    (o.toy ? `<path d="M100,36 v60" stroke="#fef3c7" stroke-width="1.6" stroke-dasharray="4 3"/>` : '') +
    eye(88) + eye(112) +
    `<polygon points="96,75 104,75 100,80" fill="#f472b6"/><path d="M100,80 q-5,6 -9,2 M100,80 q5,6 9,2" stroke="#334155" stroke-width="1.6" fill="none"/>` +
    wh(-1) + wh(1);
}
function cat(o){
  const f = o.fur, bg = o.bg || '#e0f2fe', fl = o.floor || '#bbf7d0';
  let s = `<rect width="200" height="160" fill="${bg}"/><rect y="128" width="200" height="32" fill="${fl}"/>`;
  if (o.shelf) s += `<rect x="0" y="126" width="200" height="10" fill="#a16207"/><rect x="0" y="136" width="200" height="24" fill="#fef3c7"/>`;
  const tail = o.skin ? 5 : 11;
  if (o.pose === 'lie') {
    s += `<path d="M165,124 C192,122 196,96 182,86" stroke="${f}" stroke-width="${tail}" stroke-linecap="round" fill="none"/>` +
      `<ellipse cx="118" cy="120" rx="56" ry="24" fill="${f}"/>` +
      (o.stripes ? `<path d="M110,98 q5,10 0,20 M128,97 q5,11 0,21 M146,100 q4,9 0,18" stroke="${o.dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : '') +
      `<ellipse cx="152" cy="138" rx="17" ry="8" fill="${f}"/><ellipse cx="70" cy="141" rx="12" ry="6" fill="${f}"/><ellipse cx="96" cy="142" rx="12" ry="6" fill="${f}"/>` +
      `<g transform="translate(-36,30)">${catHead(o)}</g>` +
      (o.collar ? `<path d="M44,120 Q64,130 84,118" stroke="${o.collar}" stroke-width="6" fill="none"/><circle cx="64" cy="128" r="4.5" fill="#facc15"/>` : '');
    return S('0 0 200 160', s);
  }
  s += `<path d="M136,132 C${o.skin ? '172,132 176,104 166,86' : '176,130 182,96 160,80'}" stroke="${f}" stroke-width="${tail}" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="100" cy="112" rx="40" ry="32" fill="${f}"/><ellipse cx="100" cy="118" rx="19" ry="21" fill="${o.belly || f}"/>` +
    (o.stripes ? `<path d="M66,102 q8,5 5,14 M134,102 q-8,5 -5,14 M70,120 q7,4 5,11 M130,120 q-7,4 -5,11" stroke="${o.dark}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` : '') +
    (o.skin ? `<path d="M80,104 q20,6 40,0 M82,112 q18,5 36,0" stroke="#c08a80" stroke-width="1.5" fill="none"/>` : '') +
    (o.toy ? `<path d="M100,92 v50" stroke="#fef3c7" stroke-width="1.6" stroke-dasharray="4 3"/>` : '') +
    `<ellipse cx="70" cy="136" rx="16" ry="9" fill="${f}"/><ellipse cx="130" cy="136" rx="16" ry="9" fill="${f}"/>` +
    `<rect x="84" y="112" width="11" height="28" rx="5" fill="${f}"/><rect x="105" y="112" width="11" height="28" rx="5" fill="${f}"/>` +
    `<ellipse cx="89" cy="141" rx="8" ry="5" fill="${o.paw || f}"/><ellipse cx="111" cy="141" rx="8" ry="5" fill="${o.paw || f}"/>` +
    catHead(o) +
    (o.collar ? `<path d="M76,92 Q100,104 124,92" stroke="${o.collar}" stroke-width="6" fill="none"/><circle cx="100" cy="101" r="4.5" fill="#facc15"/>` : '') +
    (o.toy ? `<line x1="122" y1="36" x2="138" y2="20" stroke="#64748b" stroke-width="1.2"/><g transform="rotate(-18 150 18)"><rect x="136" y="10" width="34" height="17" rx="3" fill="#fff" stroke="#94a3b8"/><text x="153" y="23" font-size="11" font-family="Tahoma,sans-serif" font-weight="700" fill="#dc2626" text-anchor="middle">฿199</text></g>` : '');
  return S('0 0 200 160', s);
}
// หมาชิบะ (หูแหลม สีส้ม หางม้วน ไม่มีหนวดยาว) · w/h ใช้ซ้ำในภาพสวน
function shiba(bg, floor){
  const f = '#ea8a2e';
  return `<rect width="200" height="160" fill="${bg}"/><rect y="128" width="200" height="32" fill="${floor}"/>` +
    `<path d="M136,104 c26,-6 30,-34 10,-34 c-14,0 -14,18 -2,16" stroke="${f}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="100" cy="112" rx="38" ry="32" fill="${f}"/><ellipse cx="100" cy="116" rx="18" ry="22" fill="#fff7ed"/>` +
    `<ellipse cx="72" cy="136" rx="15" ry="9" fill="${f}"/><ellipse cx="128" cy="136" rx="15" ry="9" fill="${f}"/>` +
    `<rect x="84" y="112" width="12" height="28" rx="5" fill="${f}"/><rect x="104" y="112" width="12" height="28" rx="5" fill="${f}"/>` +
    `<ellipse cx="90" cy="141" rx="8" ry="5" fill="#fff7ed"/><ellipse cx="110" cy="141" rx="8" ry="5" fill="#fff7ed"/>` +
    `<polygon points="76,50 80,22 96,40" fill="${f}"/><polygon points="124,50 120,22 104,40" fill="${f}"/>` +
    `<polygon points="81,44 82,30 91,40" fill="#7c2d12"/><polygon points="119,44 118,30 109,40" fill="#7c2d12"/>` +
    `<circle cx="100" cy="62" r="28" fill="${f}"/><ellipse cx="100" cy="80" rx="18" ry="14" fill="#fff7ed"/>` +
    `<circle cx="89" cy="60" r="3.6" fill="#1c1917"/><circle cx="111" cy="60" r="3.6" fill="#1c1917"/><circle cx="90" cy="59" r="1" fill="#fff"/><circle cx="112" cy="59" r="1" fill="#fff"/>` +
    `<ellipse cx="100" cy="74" rx="6" ry="4.5" fill="#1c1917"/><path d="M100,78 v5 M100,83 q-6,5 -11,1 M100,83 q6,5 11,1" stroke="#1c1917" stroke-width="1.6" fill="none"/>` +
    `<ellipse cx="100" cy="90" rx="5" ry="6" fill="#f472b6"/>`;
}

const CAT_BG = ['#e0f2fe', '#fef9c3', '#ede9fe', '#fce7f3', '#dcfce7', '#ffedd5'];
P.cat1 = cat({ fur: '#f59e0b', dark: '#b45309', belly: '#fde68a', stripes: true, collar: '#dc2626', bg: CAT_BG[0] });
P.cat2 = cat({ fur: '#94a3b8', dark: '#475569', belly: '#e2e8f0', stripes: true, eye: '#ca8a04', bg: CAT_BG[1], floor: '#d9f99d' });
P.cat3 = cat({ fur: '#1f2937', dark: '#111827', eye: '#eab308', pose: 'lie', bg: CAT_BG[2], floor: '#c4b5fd' });
P.cat4 = cat({ fur: '#fb923c', dark: '#c2410c', stripes: true, pose: 'lie', bg: CAT_BG[3], floor: '#fbcfe8' });
P.cat5 = cat({ fur: '#f8fafc', dark: '#cbd5e1', belly: '#fff', paw: '#fecdd3', eye: '#0ea5e9', collar: '#2563eb', bg: CAT_BG[4], floor: '#86efac' });
P.cat6 = cat({ fur: '#fdba74', dark: '#ea580c', belly: '#fff7ed', eye: '#16a34a', bg: CAT_BG[5], floor: '#fed7aa' });
// ภาพทดสอบ: ตุ๊กตาแมว · หมาชิบะ · แมวไม่มีขน · แมวมุดกล่อง
P.toycat = cat({ fur: '#f59e0b', dark: '#b45309', belly: '#fde68a', toy: true, shelf: true, bg: '#f1f5f9' });
P.shiba = S('0 0 200 160', shiba('#e0f2fe', '#bbf7d0'));
P.sphynx = cat({ fur: '#e8c4bc', belly: '#f2d6cf', skin: true, eye: '#84cc16', bg: '#fef3c7', floor: '#fde68a' });
P.boxcat = S('0 0 200 160', `<rect width="200" height="160" fill="#ecfeff"/><rect y="128" width="200" height="32" fill="#a7f3d0"/>` +
  `<path d="M150,112 C178,108 186,80 172,60" stroke="#64748b" stroke-width="11" stroke-linecap="round" fill="none"/>` +
  `<g transform="translate(0,14)">${catHead({ fur: '#64748b', dark: '#334155', eye: '#facc15' })}</g>` +
  `<rect x="40" y="88" width="120" height="56" fill="#d6a76b"/><path d="M40,88 l-16,8 h0 M160,88 l16,8" stroke="#b07d3e" stroke-width="3" fill="none"/><path d="M40,88 l-18,10 l6,4 l12,-8z M160,88 l18,10 l-6,4 l-12,-8z" fill="#e0b57a" stroke="#b07d3e" stroke-width="1.5"/>` +
  `<path d="M40,88 h120 v56 h-120 z M100,88 v20" stroke="#b07d3e" stroke-width="2" fill="none"/>`);

// ---------- ภาพ "รูปถ่าย" จริง / AI (viewBox 0 0 240 180) ----------
const SKY = '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>';
const SKIN = '#e9b98a', HAIR = '#3f2a1d';
const kid = (x, y, shirt) => `<rect x="${x - 26}" y="${y + 26}" width="52" height="60" rx="14" fill="${shirt}"/>` +
  `<rect x="${x - 20}" y="${y + 84}" width="15" height="34" rx="6" fill="#1e3a8a"/><rect x="${x + 5}" y="${y + 84}" width="15" height="34" rx="6" fill="#1e3a8a"/>` +
  `<circle cx="${x}" cy="${y}" r="24" fill="${SKIN}"/><path d="M${x - 24},${y - 2} q2,-28 24,-26 q22,-2 24,26 q-8,-12 -24,-12 q-16,0 -24,12z" fill="${HAIR}"/>` +
  `<circle cx="${x - 8}" cy="${y + 2}" r="2.6" fill="#1f2937"/><circle cx="${x + 8}" cy="${y + 2}" r="2.6" fill="#1f2937"/><path d="M${x - 8},${y + 11} q8,7 16,0" stroke="#7c2d12" stroke-width="2" fill="none"/>`;
// มือโบก: n = นิ้ว (ไม่รวมนิ้วโป้ง)
function hand(cx, cy, n){
  let s = '';
  for (let i = 0; i < n; i++) { const a = -42 + i * (84 / (n - 1)); s += `<rect x="${cx - 3.6}" y="${cy - 26}" width="7.2" height="20" rx="3.6" fill="${SKIN}" transform="rotate(${a.toFixed(1)} ${cx} ${cy})"/>`; }
  return s + `<rect x="${cx - 3.6}" y="${cy - 20}" width="7.2" height="15" rx="3.6" fill="${SKIN}" transform="rotate(-92 ${cx} ${cy})"/><circle cx="${cx}" cy="${cy}" r="11" fill="${SKIN}"/>`;
}
const wave = n => S('0 0 240 180', SKY + `<rect width="240" height="180" fill="url(#sky)"/><rect y="138" width="240" height="42" fill="#86efac"/>` +
  `<circle cx="34" cy="120" r="22" fill="#4ade80"/><rect x="31" y="128" width="6" height="16" fill="#92400e"/>` +
  `<path d="M140,86 L170,52" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/><path d="M96,90 L84,124" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>` +
  kid(118, 62, '#f97316') + hand(172, 46, n));
P.wave_real = wave(4);
P.wave_ai = wave(5);
// ป้ายร้าน: ตัวหนังสืออ่านออก / ขยุกขยิก
const shop = ok => S('0 0 240 180', SKY + `<rect width="240" height="180" fill="url(#sky)"/><rect y="150" width="240" height="30" fill="#cbd5e1"/>` +
  `<rect x="20" y="16" width="200" height="140" fill="#fde68a"/><rect x="34" y="22" width="172" height="34" rx="4" fill="#7c2d12"/>` +
  (ok ? `<text x="120" y="45" font-size="21" font-weight="800" font-family="Sarabun,Tahoma,sans-serif" fill="#fff" text-anchor="middle">ร้านขนมบ้านแดง</text>`
      : `<path d="M50,42 c3,-12 7,8 10,-2 s5,-9 9,1 c2,7 6,-12 9,-4 q3,9 7,-3 c3,-6 6,8 9,0 s4,-10 8,2 c3,6 7,-11 10,-1 q4,8 7,-6 c2,-5 5,9 9,1 s6,-7 9,3 c2,4 5,-9 8,-2 q3,7 6,-4 c3,-4 6,8 9,0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`) +
  `<path d="M20,58 h200 l-8,14 h-184z" fill="#dc2626"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${36 + i * 36},58 h18 l-3,14 h-18z" fill="#fff"/>`).join('')}` +
  `<rect x="34" y="82" width="98" height="58" fill="#e0f2fe" stroke="#92400e" stroke-width="3"/>` +
  `<circle cx="56" cy="122" r="9" fill="#f472b6"/><circle cx="80" cy="124" r="9" fill="#a16207"/><circle cx="106" cy="122" r="9" fill="#facc15"/><rect x="40" y="130" width="86" height="4" fill="#92400e"/>` +
  `<rect x="148" y="82" width="52" height="68" fill="#92400e"/><circle cx="190" cy="118" r="3" fill="#facc15"/>` +
  (ok ? `<rect x="154" y="90" width="40" height="15" rx="3" fill="#fff"/><text x="174" y="101.5" font-size="10" font-weight="800" font-family="Tahoma,sans-serif" fill="#16a34a" text-anchor="middle">OPEN</text>`
      : `<rect x="154" y="90" width="40" height="15" rx="3" fill="#fff"/><path d="M158,99 c2,-6 4,4 6,-1 s3,-5 5,1 c2,4 4,-6 6,-1 s3,4 5,-2 c2,-3 3,4 5,0" stroke="#16a34a" stroke-width="2" fill="none"/>`));
P.shop_real = shop(true);
P.shop_ai = shop(false);
// หน้าต่างกับแมว: กรอบตรง / บิดเบี้ยว
const win = ok => S('0 0 240 180', `<rect width="240" height="180" fill="#f1e4d4"/><rect y="146" width="240" height="34" fill="#c08457"/>` +
  `<rect x="46" y="18" width="148" height="112" fill="#bae6fd"/><circle cx="160" cy="44" r="12" fill="#fef08a"/>` +
  `<path d="M46,112 q30,-30 60,-6 q30,-26 60,0 q14,-10 28,0 v18 h-148z" fill="#4ade80"/>` +
  (ok ? `<rect x="46" y="18" width="148" height="112" fill="none" stroke="#f8fafc" stroke-width="8"/><path d="M120,18 V130 M46,74 H194" stroke="#f8fafc" stroke-width="6"/>`
      : `<path d="M46,18 Q120,10 194,22 L196,130 Q120,138 46,130 Z" fill="none" stroke="#f8fafc" stroke-width="8"/><path d="M120,16 Q134,72 114,132 M46,76 Q118,56 196,84" stroke="#f8fafc" stroke-width="6" fill="none"/>`) +
  `<rect x="36" y="128" width="168" height="10" rx="3" fill="#e2e8f0"/>` +
  `<g transform="translate(64,62) scale(.5)">` + cat({ fur: '#78716c', dark: '#44403c', stripes: true, eye: '#ca8a04', bg: 'none', floor: 'none' }).replace(/<\/?svg[^>]*>/g, '').replace(/<rect width="200" height="160" fill="none"\/><rect y="128" width="200" height="32" fill="none"\/>/, '') + '</g>');
P.win_real = win(true);
P.win_ai = win(false);
// คนยืนกลางแดด: เงาทิศเดียวกับต้นไม้ / เงาชี้เข้าหาดวงอาทิตย์
const sun = ok => S('0 0 240 180', SKY + `<rect width="240" height="180" fill="url(#sky)"/><rect y="132" width="240" height="48" fill="#a3e635"/>` +
  `<circle cx="30" cy="26" r="16" fill="#facc15"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="28.5" y="2" width="3" height="8" fill="#facc15" transform="rotate(${a} 30 26)"/>`).join('')}` +
  `<ellipse cx="204" cy="150" rx="34" ry="6" fill="#4d7c0f" opacity=".55" transform="skewX(-20)"/><rect x="178" y="92" width="9" height="56" fill="#92400e"/><circle cx="182" cy="80" r="26" fill="#22c55e"/>` +
  `<ellipse cx="${ok ? 158 : 70}" cy="152" rx="42" ry="6" fill="#3f6212" opacity=".55"/>` +
  `<path d="M98,92 L86,124 M142,92 L154,124" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>` + kid(120, 66, '#a855f7'));
P.sun_real = sun(true);
P.sun_ai = sun(false);
// ภาพปริศนา: โปสเตอร์ (AI · ตัวหนังสือมั่ว) · สนามฟุตบอล (จริง) · หมาในสวน (AI ไม่มีเบาะแส)
P.q_poster = S('0 0 240 180', `<rect width="240" height="180" fill="#e7e5e4"/><rect x="0" y="150" width="240" height="30" fill="#a8a29e"/>` +
  `<rect x="44" y="12" width="152" height="136" rx="4" fill="#fff" stroke="#d6d3d1" stroke-width="2"/><circle cx="120" cy="12" r="4" fill="#dc2626"/>` +
  `<rect x="54" y="22" width="132" height="30" rx="4" fill="#2563eb"/>` +
  `<path d="M64,42 c3,-11 6,7 9,-1 s4,-8 8,1 c2,6 5,-10 8,-3 q3,8 6,-2 c3,-6 6,7 9,0 s4,-9 7,2 c3,5 6,-10 9,-1 q4,7 6,-5 c2,-4 5,8 8,1 s5,-6 8,2" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
  `<circle cx="96" cy="88" r="16" fill="${SKIN}"/><rect x="80" y="104" width="32" height="30" rx="8" fill="#ef4444"/><circle cx="146" cy="88" r="16" fill="${SKIN}"/><rect x="130" y="104" width="32" height="30" rx="8" fill="#22c55e"/>` +
  `<path d="M82,82 q14,-20 28,0 M132,82 q14,-20 28,0" fill="${HAIR}"/><circle cx="121" cy="120" r="8" fill="#fff" stroke="#1f2937" stroke-width="1.5"/>` +
  `<path d="M60,142 c2,-5 4,3 6,-1 s3,-4 5,1 c2,3 4,-5 6,-1 M100,142 c2,-5 4,3 6,-1 s3,-4 5,1 c2,3 4,-5 6,-1 s3,3 5,-2" stroke="#64748b" stroke-width="1.8" fill="none"/>`);
P.q_field = S('0 0 240 180', SKY + `<rect width="240" height="180" fill="url(#sky)"/><rect y="104" width="240" height="76" fill="#4ade80"/>` +
  `<path d="M0,140 H240" stroke="#f0fdf4" stroke-width="2"/><path d="M14,104 v-40 h56 v40" stroke="#fff" stroke-width="4" fill="none"/><path d="M18,68 h48 M18,80 h48 M18,92 h48 M28,64 v40 M42,64 v40 M56,64 v40" stroke="#ffffff99" stroke-width="1"/>` +
  `<rect x="150" y="30" width="76" height="30" rx="4" fill="#1e293b"/><text x="188" y="50" font-size="15" font-weight="800" font-family="Sarabun,Tahoma,sans-serif" fill="#facc15" text-anchor="middle">สนาม 1</text><rect x="184" y="60" width="4" height="44" fill="#475569"/>` +
  `<path d="M64,124 L52,146 M110,124 L124,140" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/><g transform="translate(-18,32) scale(.82)">${kid(128, 64, '#2563eb')}</g>` +
  `<circle cx="150" cy="158" r="10" fill="#fff" stroke="#1f2937" stroke-width="1.6"/><path d="M146,154 l4,3 l4,-3 l-1,5 h-6z" fill="#1f2937"/>`);
P.q_dog = S('0 0 240 180', SKY + `<rect width="240" height="180" fill="url(#sky)"/><rect y="138" width="240" height="42" fill="#86efac"/>` +
  `<circle cx="206" cy="104" r="28" fill="#22c55e"/><rect x="202" y="116" width="8" height="30" fill="#92400e"/><circle cx="26" cy="112" r="20" fill="#4ade80"/>` +
  `<g transform="translate(26,14) scale(.94)">${shiba('none', 'none').replace(/<rect width="200" height="160" fill="none"\/><rect y="128" width="200" height="32" fill="none"\/>/, '')}</g>` +
  `<circle cx="190" cy="156" r="10" fill="#ef4444"/><path d="M182,152 q8,6 16,0" stroke="#fff" stroke-width="2" fill="none"/>`);

// เกมนักสืบภาพ: UFO เหนือโรงเรียน (AI · ป้ายมั่ว เงาไม่มี) · แมวยักษ์ในเมือง (ภาพ AI ที่บอกตรง ๆ ว่าเป็นงานศิลปะ AI)
const school = `<rect x="40" y="70" width="160" height="80" fill="#fde68a"/><polygon points="30,72 120,40 210,72" fill="#b91c1c"/>` +
  [0, 1, 2, 3].map(i => `<rect x="${54 + i * 38}" y="88" width="22" height="20" fill="#bae6fd" stroke="#92400e" stroke-width="2"/>`).join('') +
  `<rect x="108" y="116" width="24" height="34" fill="#92400e"/>`;
P.p_ufo = S('0 0 240 180', `<rect width="240" height="180" fill="#1e1b4b"/>${[[20, 20], [60, 12], [200, 30], [220, 10], [150, 18], [100, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`).join('')}` +
  `<rect y="150" width="240" height="30" fill="#14532d"/>${school}<rect x="70" y="60" width="100" height="16" fill="#fef3c7"/>` +
  `<path d="M76,70 c3,-6 5,4 8,-1 s4,-5 6,1 c2,4 5,-6 7,-1 s3,4 6,-2 c2,-4 4,4 7,0 s4,-5 6,1 c2,3 4,-5 7,-1 s3,3 6,-2 c2,-3 4,3 6,0" stroke="#7c2d12" stroke-width="1.6" fill="none"/>` +
  `<polygon points="110,40 130,40 168,150 72,150" fill="#a7f3d0" opacity=".35"/><ellipse cx="120" cy="34" rx="44" ry="11" fill="#94a3b8"/><ellipse cx="120" cy="28" rx="20" ry="12" fill="#bae6fd"/>` +
  `${[-30, -15, 0, 15, 30].map(d => `<circle cx="${120 + d}" cy="36" r="2.4" fill="#facc15"/>`).join('')}`);
P.p_giant = S('0 0 240 180', SKY + `<rect width="240" height="180" fill="url(#sky)"/><rect y="150" width="240" height="30" fill="#94a3b8"/>` +
  `<rect x="10" y="80" width="40" height="70" fill="#64748b"/><rect x="190" y="70" width="44" height="80" fill="#475569"/><rect x="150" y="100" width="34" height="50" fill="#94a3b8"/>` +
  `<g transform="translate(36,-6) scale(.85)">` + cat({ fur: '#f59e0b', dark: '#b45309', belly: '#fde68a', stripes: true, bg: 'none', floor: 'none' }).replace(/<\/?svg[^>]*>/g, '').replace(/<rect width="200" height="160" fill="none"\/><rect y="128" width="200" height="32" fill="none"\/>/, '') + '</g>' +
  `<rect x="60" y="128" width="70" height="22" fill="#cbd5e1"/><rect x="66" y="132" width="12" height="10" fill="#bae6fd"/><rect x="84" y="132" width="12" height="10" fill="#bae6fd"/>` +
  `<rect x="164" y="6" width="70" height="18" rx="9" fill="#7c3aed"/><text x="199" y="19" font-size="10" font-weight="800" font-family="Tahoma,sans-serif" fill="#fff" text-anchor="middle">#AI art</text>`);

window.WSPics = { get: id => P[id] || '', ids: Object.keys(P) };
})();
