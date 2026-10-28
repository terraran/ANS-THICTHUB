// มุมครู: ใส่รหัสครู → ตารางส่งงาน / เปิด-ปิดกิจกรรม / แชร์ผลงาน / รายชื่อนักเรียน
// อ่านใช้ GET (ใส่ key ทุกครั้ง) · เขียนใช้ POST แบบ no-cors อ่านผลไม่ได้ จึงโหลดข้อมูลใหม่มาตรวจทุกครั้งหลังบันทึก
(() => {
const $ = s => document.querySelector(s);
const { esc, store } = HubUtil;
const th = o => HubUtil.t(o, 'th');
const plain = h => String(h).replace(/<[^>]+>/g, '');
const H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const TABS = { matrix: 'ตารางส่งงาน', open: 'เปิด/ปิดกิจกรรม', share: 'แชร์ผลงาน', roster: 'รายชื่อนักเรียน' };
const ST = { done: 'ส่งแล้ว', doing: 'ทำค้าง', todo: 'ยังไม่เริ่ม' };
// รหัสอยู่ใน sessionStorage เท่านั้น (ปิดแท็บแล้วต้องใส่ใหม่) · บางเครื่องปิดไว้ จึงห่อ try/catch
const SES = 'ansHub.tkey';
const ses = {
  get(){ try { return sessionStorage.getItem(SES) || ''; } catch (e) { return ''; } },
  set(v){ try { sessionStorage.setItem(SES, v); } catch (e) {} },
  del(){ try { sessionStorage.removeItem(SES); } catch (e) {} }
};

let key = '', levels = [], acts = [], room = '', tab = 'matrix', busy = false;
let dash = {}, subsCache = {};       // ข้อมูลจาก Script ต่อห้อง · งานที่ส่งต่อ "ห้อง|ใบงาน"
const content = {}, pick = {};       // เนื้อหาใบงาน · ใบงานที่ครูเลือกต่อชั้น
let hide = false, compare = false, cmpSel = [], editing = '', pasteOpen = false, draftOne = '', draftMany = '';
let vw = null;                       // ผลงานที่เปิดเต็มจอ { a, groups }

const api = p => HubAPI.get(Object.assign({ key }, p));
const send = b => HubAPI.post(Object.assign({ key }, b));
const levelOf = r => r.split('.')[0];
const roomsOf = lv => (levels.find(l => l.id === lv) || {}).rooms || [];
const sheetsOf = lv => acts.filter(a => a.level === lv && a.kind === 'sheet').sort((a, b) => a.week - b.week);
const gamesOf = lv => acts.filter(a => a.level === lv && a.kind === 'game');
const actOf = id => acts.find(a => a.id === id);
const nk = s => String(s || '').replace(/\s+/g, '').toUpperCase();   // เทียบชื่อแบบเดียวกับ Script (nameKey_)
const has = (list, n) => list.some(x => nk(x) === nk(n));
const clean = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
const who = n => hide ? '•••' : esc(n);
const weekName = a => `สัปดาห์ ${a.week} · ${esc(th(a.title))}`;

function note(text, kind){ const n = $('#note'); n.textContent = text || ''; n.className = 'note ' + (kind || ''); n.classList.toggle('hide', !text); }

// ---------- เข้า/ออก ----------
function showLogin(msg){
  $('#app').classList.add('hide'); $('#login').classList.remove('hide');
  $('#keyMsg').className = 'kmsg'; $('#keyMsg').textContent = msg || '';
  $('#key').value = ''; $('#key').focus();
}
async function login(k, quiet){
  const m = $('#keyMsg');
  if (!HubAPI.configured()) return showLogin('ยังไม่ได้ตั้ง endpoint ใน config.js');
  m.className = 'kmsg wait'; m.textContent = quiet ? 'กำลังเข้ามุมครู...' : 'กำลังตรวจรหัส...';
  $('#enter').disabled = true;
  try { await HubAPI.get({ action: 'whoami', key: k }); }
  catch (e) {
    $('#enter').disabled = false;
    const why = e.message === 'key' ? (quiet ? '' : 'รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง')
      : e.message === 'action' ? 'Script ยังเป็นเวอร์ชันเก่า: วาง apps-script/Code.gs ใหม่ แล้ว Deploy แบบ New version'
      : 'ต่อ Script ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่';
    if (e.message === 'key') ses.del();
    showLogin(why); return;
  }
  $('#enter').disabled = false;
  key = k; ses.set(k);
  $('#login').classList.add('hide'); $('#app').classList.remove('hide');
  drawNav(); show();
}
function logout(msg){ key = ''; ses.del(); dash = {}; subsCache = {}; closeViewer(); note(''); showLogin(msg); }
$('#login').addEventListener('submit', e => { e.preventDefault(); const k = $('#key').value.trim(); if (k) login(k); });
$('#logout').addEventListener('click', () => ses.del());

// ---------- เมนู + ห้อง ----------
function drawNav(){
  $('#tabs').innerHTML = Object.keys(TABS).map(k => `<button data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${TABS[k]}</button>`).join('');
  $('#rooms').innerHTML = '<span class="lbl">ห้อง</span>' + levels.flatMap(l => l.rooms)
    .map(r => `<button data-room="${r}" aria-pressed="${r === room}">${r}</button>`).join('');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; store.set('tTab', tab); editing = ''; note(''); drawNav(); show(); });
$('#rooms').addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (!b) return; room = b.dataset.room; store.set('tRoom', room); editing = ''; cmpSel = []; note(''); drawNav(); show(); });

async function loadDash(r){ dash[r] = await api({ action: 'dashboard', room: r }); return dash[r]; }
async function getSubs(act, force){
  const k = room + '|' + act;
  if (force || !subsCache[k]) subsCache[k] = (await api({ action: 'submissions', room, act })).rows;
  return subsCache[k];
}
async function getContent(act){
  if (!content[act]) content[act] = await fetch(`../worksheet/content/${act}.json`).then(r => { if (!r.ok) throw new Error('content'); return r.json(); });
  return content[act];
}
function fail(e){
  if (e && e.message === 'key') return logout('รหัสครูไม่ถูกต้องแล้ว ใส่รหัสใหม่อีกครั้ง');
  $('#view').innerHTML = '<div class="empty">โหลดข้อมูลไม่สำเร็จ<br><button class="tbtn" id="retry">ลองใหม่ ↻</button></div>';
  $('#retry').onclick = () => { delete dash[room]; show(); };
}

// วาดหัวข้อที่เลือก (โหลดข้อมูลห้องก่อนถ้ายังไม่มี)
async function show(){
  const r = room;
  if (!dash[r]) {
    $('#view').innerHTML = '<div class="empty">กำลังโหลด...</div>';
    try { await loadDash(r); } catch (e) { if (r === room) fail(e); return; }
    if (r !== room) return;
  }
  render();
}
function render(){
  $('#view').classList.toggle('busy', busy);
  if (tab === 'matrix') drawMatrix();
  else if (tab === 'open') drawOpen();
  else if (tab === 'share') drawShare();
  else drawRoster();
}

// POST อ่านผลไม่ได้ → ส่งแล้วโหลดข้อมูลห้องใหม่ มาตรวจว่าเปลี่ยนจริง
async function save(wait, post, rooms, check, done){
  if (busy) return false;
  busy = true; note(wait); render();
  let ok = false;
  try { await post(); await Promise.all(rooms.map(loadDash)); ok = check(); }
  catch (e) { if (e.message === 'key') { busy = false; logout('รหัสครูไม่ถูกต้องแล้ว ใส่รหัสใหม่อีกครั้ง'); return false; } }
  busy = false;
  note(ok ? done : 'บันทึกไม่สำเร็จ ลองอีกครั้ง (ถ้ายังไม่ได้ ตรวจว่า Deploy Script เวอร์ชันใหม่แล้ว)', ok ? 'ok' : 'err');
  render();
  return ok;
}

// ---------- เลือกใบงาน (ค่าเริ่มต้น = สัปดาห์ล่าสุดที่เปิดให้ห้องนี้) ----------
function curSheet(){
  const list = sheetsOf(levelOf(room)), mine = list.find(a => a.id === pick[levelOf(room)]);
  if (mine) return mine;
  const open = list.filter(a => dash[room] && dash[room].open[a.id]);
  return open[open.length - 1] || list[0];
}
function picker(cur){
  return `<div class="picker"><span class="lbl">ใบงาน</span>${sheetsOf(levelOf(room)).map(a =>
    `<button data-sheet="${a.id}" aria-pressed="${a.id === cur.id}">${weekName(a)}</button>`).join('')}</div>`;
}
$('#view').addEventListener('click', e => {
  const b = e.target.closest('[data-sheet]'); if (!b) return;
  pick[levelOf(room)] = b.dataset.sheet; cmpSel = []; render();
});

// ---------- 1. ตารางส่งงาน ----------
function statusOf(D, act, name){
  const mine = D.subs.filter(s => s.act === act && has(s.members, name));
  if (mine.length) return { st: 'done', last: mine[mine.length - 1] };
  if (D.drafts.some(d => d.act === act && nk(d.name) === nk(name))) return { st: 'doing' };
  return { st: 'todo' };
}
function drawMatrix(){
  const D = dash[room], sheets = sheetsOf(levelOf(room)), cur = curSheet();
  if (!cur) { $('#view').innerHTML = '<div class="empty">ชั้นนี้ยังไม่มีใบงาน</div>'; return; }
  const kids = D.roster.filter(x => x.active).map(x => x.name), cnt = { done: 0, doing: 0, todo: 0 };
  kids.forEach(n => cnt[statusOf(D, cur.id, n).st]++);
  const cell = (a, n) => {
    const s = statusOf(D, a.id, n);
    if (s.st !== 'done') return `<span class="chip ${s.st}">${ST[s.st]}</span>`;
    return `<button class="chip done" data-view="${a.id}" data-name="${esc(n)}" title="เปิดดูงานของ ${esc(n)}">${esc(s.last.score)}${s.last.round > 1 ? ` · รอบ ${s.last.round}` : ''}</button>`;
  };
  const pair = n => { const s = statusOf(D, cur.id, n); return s.st === 'done' ? esc(s.last.members.filter(m => nk(m) !== nk(n)).join(', ')) || '-' : '-'; };
  $('#view').innerHTML = picker(cur) +
    `<div class="sum"><div class="done"><b>${cnt.done}</b> ส่งแล้ว</div><div class="doing"><b>${cnt.doing}</b> ทำค้าง</div><div class="todo"><b>${cnt.todo}</b> ยังไม่เริ่ม</div>
      <div class="of">นับจากใบงานสัปดาห์ ${cur.week} · ห้อง ${esc(room)} · ${kids.length} คน</div></div>` +
    (kids.length ? `<div class="panel tablewrap"><table class="grid"><thead><tr><th>ชื่อเล่น</th>${sheets.map(a =>
        `<th class="${a.id === cur.id ? 'cur' : ''}"><button data-sheet="${a.id}">สัปดาห์ ${a.week}</button></th>`).join('')}<th>ทำคู่กับ</th></tr></thead>
      <tbody>${kids.map(n => `<tr><td>${esc(n)}</td>${sheets.map(a => `<td>${cell(a, n)}</td>`).join('')}<td class="pair">${pair(n)}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint">กดคะแนนในช่อง "ส่งแล้ว" เพื่อเปิดดูงาน · ทำคู่กับ = ใบงานสัปดาห์ ${cur.week}</p>`
      : '<div class="empty">ห้องนี้ยังไม่มีรายชื่อ เพิ่มได้ที่เมนู "รายชื่อนักเรียน"</div>');
}
$('#view').addEventListener('click', async e => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  const a = actOf(b.dataset.view), name = b.dataset.name;
  try {
    const rows = (await getSubs(a.id)).filter(r => has(r.members, name));
    if (!rows.length) return note('ยังไม่พบงานนี้ ลองกดห้องอีกครั้งเพื่อโหลดใหม่', 'err');
    openViewer(a, [makeGroup(name, rows)]);
  } catch (err) { fail(err); }
});

// ---------- 2. เปิด/ปิดกิจกรรม ----------
function drawOpen(){
  const D = dash[room], lv = levelOf(room), list = sheetsOf(lv).concat(gamesOf(lv)), rs = roomsOf(lv);
  const kind = a => a.kind === 'sheet' ? `ใบงาน · สัปดาห์ ${a.week}`
    : 'เกม' + (actOf(a.requires) ? ` · เล่นได้หลังส่งใบงานสัปดาห์ ${actOf(a.requires).week}` : '');
  $('#view').innerHTML = `<p class="hint">เปิดกิจกรรมที่สอนแล้วให้ห้อง ${esc(room)} เด็กจะเห็นการ์ดที่ยังปิดเป็นรูปกุญแจ</p>
    <div class="panel">${list.map(a => { const on = !!D.open[a.id];
      return `<div class="arow"><div><b>${esc(th(a.title))}</b><small>${kind(a)}</small></div>
        <button class="sw" role="switch" aria-checked="${on}" data-act="${a.id}" aria-label="${esc(th(a.title))}">${on ? 'เปิดอยู่' : 'ปิดอยู่'}</button></div>`; }).join('')}</div>
    <div class="allrow"><button class="tbtn line" id="allRooms">ใช้กับทุกห้องในชั้นนี้</button><span class="hint">ตั้งค่าแบบห้อง ${esc(room)} ให้ ${rs.map(esc).join(', ')}</span></div>`;
}
$('#view').addEventListener('click', e => {
  if (tab !== 'open') return;
  const sw = e.target.closest('.sw');
  if (sw) {
    const id = sw.dataset.act, want = !dash[room].open[id], r = room, t = th(actOf(id).title);
    return save(`กำลัง${want ? 'เปิด' : 'ปิด'} "${t}" ให้ห้อง ${r}...`, () => send({ action: 'setUnlock', rooms: [r], acts: { [id]: want } }), [r],
      () => !!dash[r].open[id] === want, `${want ? 'เปิด' : 'ปิด'} "${t}" ให้ห้อง ${r} แล้ว ✓`);
  }
  if (e.target.closest('#allRooms')) {
    const lv = levelOf(room), rs = roomsOf(lv), list = sheetsOf(lv).concat(gamesOf(lv)), want = {};
    if (!confirm(`ตั้งค่าเปิด/ปิดแบบห้อง ${room} ให้ทุกห้องใน ${lv} (${rs.join(', ')}) ไหม?`)) return;
    list.forEach(a => { want[a.id] = !!dash[room].open[a.id]; });
    save(`กำลังตั้งค่าให้ทุกห้องใน ${lv}...`, () => send({ action: 'setUnlock', rooms: rs, acts: want }), rs,
      () => rs.every(r => list.every(a => !!dash[r].open[a.id] === want[a.id])), `ใช้กับทุกห้องใน ${lv} แล้ว ✓`);
  }
});

// ---------- 3. แชร์ผลงาน ----------
// งานเดียวกัน = คนชุดเดียวกัน (คนเดียวหรือคู่) · รอบเรียงตามรอบแล้วตามเวลา
function makeGroup(label, rows){
  rows = rows.slice().sort((a, b) => (a.data.round || 1) - (b.data.round || 1) || new Date(a.time) - new Date(b.time));
  return { label, rows, cur: rows.length - 1 };
}
function groupsOf(rows){
  const m = new Map();
  rows.forEach(x => { const k = x.members.map(nk).sort().join('|'); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
  return [...m.values()].map(rs => makeGroup(rs[rs.length - 1].members.join(' + '), rs)).sort((a, b) => a.label.localeCompare(b.label, 'th'));
}
let shareGroups = [], shareTok = 0;
async function drawShare(force){
  const cur = curSheet(), tok = ++shareTok;
  if (!cur) { $('#view').innerHTML = '<div class="empty">ชั้นนี้ยังไม่มีใบงาน</div>'; return; }
  const bar = picker(cur) + `<div class="bar2"><span class="lbl">ห้อง ${esc(room)}</span><span class="sp"></span>
    <button class="tbtn line" id="sHide" aria-pressed="${hide}">ซ่อนชื่อ</button>
    <button class="tbtn line" id="sCmp" aria-pressed="${compare}">เทียบ 2 ชิ้น</button>
    <button class="tbtn line" id="sReload">โหลดใหม่ ↻</button></div>`;
  if (force || !subsCache[room + '|' + cur.id]) $('#view').innerHTML = bar + '<div class="empty">กำลังโหลดผลงาน...</div>';
  let rows, C;
  try { [rows, C] = await Promise.all([getSubs(cur.id, force), getContent(cur.id)]); } catch (e) { if (tok === shareTok) fail(e); return; }
  if (tok !== shareTok || tab !== 'share') return;
  shareGroups = groupsOf(rows);
  if (!shareGroups.length) { $('#view').innerHTML = bar + '<div class="empty">ห้องนี้ยังไม่มีใครส่งใบงานนี้</div>'; return; }
  const latest = shareGroups.map(g => g.rows[g.rows.length - 1]);
  // การ์ดที่ผิดบ่อย: นับจากรอบล่าสุดของแต่ละงาน
  const all = C.cards.concat(C.retired || []), bins = C.bins || [{ id: 'a', label: C.binA }, { id: 'b', label: C.binB }];
  const binName = id => plain(th((bins.find(b => b.id === id) || {}).label || ''));
  const miss = all.map(c => { const seen = latest.filter(r => r.data.place && r.data.place[c.id]); const bad = seen.filter(r => r.data.place[c.id] !== c.bin).length;
    return { c, bad, n: seen.length }; }).filter(x => x.bad).sort((x, y) => y.bad / y.n - x.bad / x.n).slice(0, 5);
  const frs = shareGroups.filter(g => (g.rows[g.rows.length - 1].data.fr || '').trim());
  const frq = latest.map(r => r.data.frq).find(Boolean) || th(cur.frq) || '';
  $('#view').innerHTML = bar +
    (compare ? `<div class="note">เทียบ 2 ชิ้น: กดเลือกผลงาน ${cmpSel.length ? 'อีก 1 ชิ้น' : '2 ชิ้น'}</div>` : '') +
    `<div class="share"><div class="subs">${shareGroups.map((g, i) => { const r = g.rows[g.rows.length - 1];
      return `<button class="sub" data-g="${i}" aria-pressed="${cmpSel.includes(i)}"><span class="nm">${who(g.label)}</span>
        <span class="info">จัดถูก ${esc(r.score)} · รอบที่ ${r.data.round || 1}${g.rows.length > 1 ? ` · ส่ง ${g.rows.length} ครั้ง` : ''}</span></button>`; }).join('')}</div>
     <div class="side">
      <div class="panel miss"><h3>การ์ดที่จัดผิดบ่อย <small>(${latest.length} ผลงาน รอบล่าสุด)</small></h3>${miss.length ? miss.map(x =>
        `<div><span>${esc(plain(th(x.c.text)))}<br><small>ควรอยู่ใน "${esc(binName(x.c.bin))}"</small></span><span class="p">${x.bad}/${x.n}</span></div>`).join('') : '<small>ทุกงานจัดถูกหมด 🎉</small>'}</div>
      <div class="panel fr"><h3>คำตอบ Frame of Reference <small>(ตอบ ${frs.length}/${shareGroups.length})</small></h3><div class="q">${esc(frq)}</div>${frs.length ? `<ul>${frs.map(g =>
        `<li><b>${who(g.label)}:</b> ${esc(g.rows[g.rows.length - 1].data.fr)}</li>`).join('')}</ul>` : '<small>ยังไม่มีใครตอบ</small>'}</div>
     </div></div>`;
}
$('#view').addEventListener('click', e => {
  if (tab !== 'share') return;
  if (e.target.closest('#sHide')) { hide = !hide; return render(); }
  if (e.target.closest('#sCmp')) { compare = !compare; cmpSel = []; return render(); }
  if (e.target.closest('#sReload')) return drawShare(true);
  const b = e.target.closest('[data-g]'); if (!b) return;
  const i = +b.dataset.g, a = curSheet();
  if (!compare) return openViewer(a, [shareGroups[i]]);
  cmpSel = cmpSel.includes(i) ? cmpSel.filter(x => x !== i) : cmpSel.concat(i);
  if (cmpSel.length === 2) { openViewer(a, cmpSel.map(k => shareGroups[k])); cmpSel = []; }
  render();
});

// ---------- ดูผลงานเต็มจอ: iframe หน้าใบงานจริง (view=1) จึงแสดงได้ทุกแบบ Tree / Double Bubble / Flow ----------
function openViewer(a, groups){ vw = { a, groups }; $('#viewer').classList.remove('hide'); drawViewer(); $('#vClose').focus(); }
function closeViewer(){ vw = null; $('#viewer').classList.add('hide'); $('#vFrames').innerHTML = ''; }
function drawViewer(){
  const { a, groups } = vw;
  $('#vTitle').textContent = `ห้อง ${room} · สัปดาห์ ${a.week} · ${th(a.title)}`;
  $('#vHide').setAttribute('aria-pressed', hide);
  $('#vFrames').innerHTML = groups.map((g, i) => `<div class="vpanel"><div class="vhead"><b>${who(g.label)}</b>${g.rows.length > 1 ? g.rows.map((r, k) =>
    `<button data-p="${i}" data-r="${k}" aria-pressed="${k === g.cur}">รอบ ${r.data.round || k + 1} · ${esc(r.score)}</button>`).join('') : ''}</div>
    <iframe data-i="${i}" title="ผลงาน ${i + 1}" src="../worksheet/?act=${encodeURIComponent(a.id)}&view=1"></iframe></div>`).join('');
}
addEventListener('message', e => {
  if (e.data !== 'viewReady' || e.origin !== location.origin || !vw) return;
  const f = [...document.querySelectorAll('#vFrames iframe')].find(x => x.contentWindow === e.source); if (!f) return;
  const g = vw.groups[+f.dataset.i], r = g.rows[g.cur];
  e.source.postMessage({ view: { data: r.data, time: r.time, members: r.members }, room, lang: /^en$/i.test(r.lang) ? 'en' : 'th', hide }, location.origin);
});
$('#vFrames').addEventListener('click', e => {
  const b = e.target.closest('[data-r]'); if (!b) return;
  vw.groups[+b.dataset.p].cur = +b.dataset.r; drawViewer();
});
$('#vClose').onclick = closeViewer;
$('#vHide').onclick = () => { hide = !hide; drawViewer(); render(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && vw) closeViewer(); });

// บันทึก PNG: ถ่ายหน้าใบงานในแต่ละ iframe ขนาดจริง 1600×900 แล้ววางต่อกัน
function shoot(f){
  const w = f.contentWindow, d = f.contentDocument;
  return new Promise((ok, bad) => {
    const go = () => {
      const st = d.querySelector('#stage'), prev = st.getAttribute('style') || '';
      st.style.transform = 'none'; st.style.left = st.style.top = '0px';
      const back = () => st.setAttribute('style', prev);
      w.html2canvas(st, { backgroundColor: '#f1f5f9', scale: 1, width: 1600, height: 900, windowWidth: 1600, windowHeight: 900 })
        .then(c => { back(); ok(c); }, err => { back(); bad(err); });
    };
    if (w.html2canvas) return go();
    const s = d.createElement('script'); s.src = H2C; s.onload = go; s.onerror = () => bad(new Error('html2canvas')); d.head.appendChild(s);
  });
}
$('#vPng').onclick = async () => {
  const btn = $('#vPng'), frames = [...document.querySelectorAll('#vFrames iframe')];
  if (!vw || !frames.length) return;
  btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
  try {
    const shots = [];
    for (const f of frames) shots.push(await shoot(f));
    const gap = 24, out = document.createElement('canvas');
    out.width = shots.reduce((s, c) => s + c.width, 0) + gap * (shots.length - 1); out.height = Math.max(...shots.map(c => c.height));
    const g = out.getContext('2d'); g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, out.width, out.height);
    let x = 0; shots.forEach(c => { g.drawImage(c, x, 0); x += c.width + gap; });
    const link = document.createElement('a');
    link.download = `${room}_สัปดาห์${vw.a.week}_${hide ? 'ผลงาน' : vw.groups.map(gr => gr.label).join('_vs_')}.png`.replace(/[\\/:*?"<>|\s]+/g, '');
    link.href = out.toDataURL('image/png'); link.click();
  } catch (e) { alert('บันทึกภาพไม่สำเร็จ (ต้องต่ออินเทอร์เน็ตเพื่อโหลดตัวช่วยถ่ายภาพ)'); }
  btn.disabled = false; btn.textContent = 'บันทึก PNG';
};

// ---------- 4. รายชื่อนักเรียน ----------
const PEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function drawRoster(){
  const D = dash[room], on = D.roster.filter(x => x.active), off = D.roster.filter(x => !x.active);
  const card = x => editing === x.name
    ? `<div class="nmcard"><input class="tin" id="renameIn" value="${esc(x.name)}" aria-label="ชื่อใหม่ของ ${esc(x.name)}" maxlength="40">
        <span class="ops"><button class="ic ok" data-save="${esc(x.name)}" aria-label="บันทึกชื่อ">✓</button><button class="ic" data-cancel aria-label="ยกเลิก">✕</button></span></div>`
    : `<div class="nmcard ${x.active ? '' : 'off'}"><span class="n">${esc(x.name)}</span><span class="ops">
        <button class="ic" data-edit="${esc(x.name)}" aria-label="แก้ชื่อ ${esc(x.name)}">${PEN}</button>
        ${x.active ? `<button class="ic" data-hide="${esc(x.name)}" aria-label="ซ่อนชื่อ ${esc(x.name)}">${EYE_OFF}</button>`
                   : `<button class="ic wide" data-unhide="${esc(x.name)}" aria-label="แสดงชื่อ ${esc(x.name)}">แสดง</button>`}</span></div>`;
  $('#view').innerHTML = `<form class="addrow" id="addOne"><label>เพิ่มชื่อเล่น (ห้อง ${esc(room)})<input class="tin" id="newName" placeholder="เช่น มายด์ ค" maxlength="40" value="${esc(draftOne)}"></label>
      <button class="tbtn go">+ เพิ่ม</button><button type="button" class="tbtn line" id="pasteBtn" aria-expanded="${pasteOpen}">วางหลายชื่อทีเดียว</button></form>
    ${pasteOpen ? `<div class="panel paste"><label for="many" class="lbl">วางชื่อเล่น บรรทัดละ 1 ชื่อ (คัดลอกจาก Excel/Sheet ได้)</label>
      <textarea id="many" placeholder="กาย&#10;ขิม&#10;มายด์ ก">${esc(draftMany)}</textarea>
      <div><button class="tbtn go" id="addMany">เพิ่มทุกชื่อ</button></div></div>` : ''}
    <p class="hint">ใช้ชื่อเล่นเท่านั้น ห้ามชื่อจริง/นามสกุล · ชื่อซ้ำในห้องให้ต่อท้าย เช่น "มายด์ ก" · แก้ชื่อแล้วงานที่ส่ง/งานค้างจะตามไปชื่อใหม่</p>
    ${on.length ? `<div class="names">${on.map(card).join('')}</div>` : '<div class="empty">ห้องนี้ยังไม่มีรายชื่อ</div>'}
    ${off.length ? `<h2 class="sub2">ชื่อที่ซ่อนอยู่ (เด็กไม่เห็นในหน้าเลือกชื่อ · งานเดิมยังอยู่)</h2><div class="names">${off.map(card).join('')}</div>` : ''}`;
  const ri = $('#renameIn'); if (ri) { ri.focus(); ri.select(); }
}
const inRoom = (name, active) => dash[room].roster.some(x => nk(x.name) === nk(name) && (active === undefined || x.active === active));
async function addNames(list, done){
  const seen = new Set(), names = list.map(clean).filter(n => n && !seen.has(nk(n)) && seen.add(nk(n)));
  if (!names.length) return;
  const dup = names.filter(n => inRoom(n, true)), todo = names.filter(n => !inRoom(n, true)), r = room;
  if (!todo.length) return note(`มีชื่อนี้ในห้องแล้ว: ${dup.join(', ')}`, 'err');
  const ok = await save(`กำลังเพิ่ม ${todo.length} ชื่อ...`, () => send({ action: 'roster', room: r, op: 'add', names: todo }), [r],
    () => todo.every(n => inRoom(n, true)), `เพิ่มแล้ว ${todo.length} ชื่อ ✓` + (dup.length ? ` · ข้ามชื่อที่มีอยู่แล้ว: ${dup.join(', ')}` : ''));
  if (ok) { done(); render(); }
}
function rename(from, to){
  to = clean(to);
  if (!to || to === from) { editing = ''; return render(); }
  if (dash[room].roster.some(x => nk(x.name) === nk(to) && nk(x.name) !== nk(from))) return note(`ห้องนี้มีชื่อ "${to}" อยู่แล้ว ใช้ชื่ออื่น เช่น "${to} ก"`, 'err');
  editing = ''; const r = room;
  Object.keys(subsCache).forEach(k => { if (k.startsWith(r + '|')) delete subsCache[k]; });
  save(`กำลังแก้ชื่อ ${from} → ${to}...`, () => send({ action: 'roster', room: r, op: 'rename', from, to }), [r],
    () => dash[r].roster.some(x => x.name === to), `แก้ชื่อ ${from} → ${to} แล้ว ✓ งานเดิมย้ายไปชื่อใหม่แล้ว`);
}
function setActive(name, active){
  const r = room;
  save(`กำลัง${active ? 'แสดง' : 'ซ่อน'}ชื่อ ${name}...`, () => send({ action: 'roster', room: r, op: 'active', name, active }), [r],
    () => inRoom(name, active), `${active ? 'แสดง' : 'ซ่อน'}ชื่อ ${name} แล้ว ✓`);
}
$('#view').addEventListener('submit', e => {
  if (e.target.id !== 'addOne') return;
  e.preventDefault(); draftOne = $('#newName').value;
  addNames([draftOne], () => { draftOne = ''; });
});
$('#view').addEventListener('input', e => { if (e.target.id === 'newName') draftOne = e.target.value; if (e.target.id === 'many') draftMany = e.target.value; });
$('#view').addEventListener('click', e => {
  if (tab !== 'roster') return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'pasteBtn') { pasteOpen = !pasteOpen; render(); if (pasteOpen) $('#many').focus(); return; }
  if (b.id === 'addMany') return addNames(draftMany.split(/\r?\n/), () => { draftMany = ''; pasteOpen = false; });
  if (b.dataset.edit !== undefined) { editing = b.dataset.edit; return render(); }
  if (b.dataset.cancel !== undefined) { editing = ''; return render(); }
  if (b.dataset.save !== undefined) return rename(b.dataset.save, $('#renameIn').value);
  if (b.dataset.hide !== undefined) return setActive(b.dataset.hide, false);
  if (b.dataset.unhide !== undefined) return setActive(b.dataset.unhide, true);
});
$('#view').addEventListener('keydown', e => {
  if (e.target.id !== 'renameIn') return;
  if (e.key === 'Enter') { e.preventDefault(); rename(editing, e.target.value); }
  if (e.key === 'Escape') { e.stopPropagation(); editing = ''; render(); }
});

// ---------- เริ่ม ----------
(async () => {
  try {
    const [lv, ac] = await Promise.all([fetch('../data/levels.json').then(r => r.json()), fetch('../data/activities.json').then(r => r.json())]);
    levels = lv.levels; acts = ac.activities;
  } catch (e) { return showLogin('โหลดข้อมูลห้อง/กิจกรรมไม่สำเร็จ ลองรีเฟรชหน้า'); }
  const all = levels.flatMap(l => l.rooms);
  room = all.includes(store.get('tRoom')) ? store.get('tRoom') : all[0];
  tab = TABS[store.get('tTab')] ? store.get('tTab') : 'matrix';
  const k = ses.get();
  if (k) login(k, true); else showLogin();
})();
})();
