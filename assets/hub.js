// ANS ICT Hub ฝั่งนักเรียน: หน้าแรก → เลือกห้อง → เลือกชื่อ → คลังกิจกรรม
// เส้นทาง: #/ · #/rooms · #/names/Y3.2 · #/lib/Y3.2/ชื่อ
(() => {
const CFG = window.HUB_CONFIG || {};
const { store, initial, esc, AV } = HubUtil;
const $ = s => document.querySelector(s);
const view = $('#view');

const UI = {
  th: {
    hello: 'วันนี้จะเรียนอะไร? เลือกเลย', ict: 'THAI ICT', ictTag: 'ใบงาน + เกม', ictSub: 'ใบงานและเกมของวิชา ป.3–ป.4 · เลือกห้องและชื่อของเรา',
    typ: 'พิมพ์ไทย', typTag: 'ฝึกพิมพ์สัมผัส', typSub: 'คีย์บอร์ดเควส · เปิดแอปฝึกพิมพ์ในแท็บใหม่', teacher: 'มุมครู',
    home: 'หน้าแรก', whichRoom: 'เราเรียนห้องไหน?', changeRoom: 'เปลี่ยนห้อง', whoAmI: 'เราคือใคร? กดชื่อของเรา', onlyMine: 'กดชื่อตัวเองเท่านั้นนะ',
    noName: 'ไม่เจอชื่อตัวเอง? บอกครูได้เลย', emptyRoster: 'ห้องนี้ยังไม่มีรายชื่อ บอกครูได้เลย',
    loading: 'กำลังโหลด...', loadErr: 'โหลดข้อมูลไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง', retry: 'ลองอีกครั้ง', notSetup: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ (config.js)',
    hi: n => `สวัสดี ${n}!`, notMe: 'ไม่ใช่เรา? เปลี่ยนชื่อ', sent: 'ใบงานที่ส่งแล้ว',
    tabs: { sheet: 'ใบงาน', game: 'เกม' }, week: n => `สัปดาห์ ${n}`,
    st: { done: 'ส่งแล้ว ✓', doing: 'ทำค้างไว้', todo: 'ยังไม่เริ่ม', lock: 'ล็อกอยู่', play: 'เล่นได้เลย' },
    btn: { done: 'ดูผล / แก้ใหม่', doing: 'ทำต่อ', todo: 'เริ่มทำ', play: 'เล่น' },
    locked: 'ครูยังไม่เปิด', noActs: 'ยังไม่มีกิจกรรมในหมวดนี้', closeGame: '✕ กลับคลังกิจกรรม'
  },
  en: {
    hello: 'What shall we learn today? Pick one!', ict: 'THAI ICT', ictTag: 'Worksheets + games', ictSub: 'ICT worksheets and games for Y3–Y4 · pick your class and name',
    typ: 'Thai Typing', typTag: 'Touch typing', typSub: 'Keyboard Quest · opens the typing app in a new tab', teacher: 'Teacher corner',
    home: 'Home', whichRoom: 'Which class are you in?', changeRoom: 'Change class', whoAmI: 'Who are you? Tap your name', onlyMine: 'Only tap your own name',
    noName: 'Can’t find your name? Tell your teacher.', emptyRoster: 'This class has no names yet. Tell your teacher.',
    loading: 'Loading...', loadErr: 'Could not load. Check the internet and try again.', retry: 'Try again', notSetup: 'The connection is not set up yet (config.js)',
    hi: n => `Hi ${n}!`, notMe: 'Not you? Change name', sent: 'Worksheets sent',
    tabs: { sheet: 'Worksheets', game: 'Games' }, week: n => `Week ${n}`,
    st: { done: 'Sent ✓', doing: 'In progress', todo: 'Not started', lock: 'Locked', play: 'Ready to play' },
    btn: { done: 'See results / redo', doing: 'Continue', todo: 'Start', play: 'Play' },
    locked: 'Not open yet', noActs: 'Nothing here yet', closeGame: '✕ Back to activities'
  }
};

let L = store.get('lang') === 'en' ? 'en' : 'th';
let tab = 'sheet';
const U = () => UI[L];
const tt = o => HubUtil.t(o, L);
let LEVELS = [], ACTS = [];
const rosterCache = {};

const ICON = {
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  sheet: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  game: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="6"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>',
  lock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  play: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  ext: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
};

const go = h => { location.hash = h; };
const levelOf = room => LEVELS.find(l => l.rooms.includes(room));
const langBtns = () => `<div class="langs"><button type="button" data-lang="th" aria-pressed="${L === 'th'}">TH</button><button type="button" data-lang="en" aria-pressed="${L === 'en'}">EN</button></div>`;
const backBtn = (h, label) => `<button type="button" class="back" data-go="${esc(h)}">${ICON.back}${esc(label)}</button>`;
const msgBox = (text, retry) => `<div class="msg">${esc(text)}${retry ? `<br><button type="button" class="btn" data-retry>${esc(U().retry)}</button>` : ''}</div>`;

// ---------- หน้าแรก ----------
function pageHome(){
  const kb = [['ๆ','ไ','ำ','พ','ะ','ั','ี','ร','น','ย'], ['ฟ','ห','ก','ด','เ','้','่','า','ส','ว']];
  const hl = new Set(['ห','ก','ด','่','า','ส']);
  view.innerHTML = `<div class="page">
   <div class="hero"><h1>ANS ICT Hub</h1><p>${esc(U().hello)}</p></div>
   <div class="wrap big">
    <button type="button" class="bigcard" id="goIct">
     <div class="art" style="background:#0284c7">
      <div class="blob" style="width:360px;height:360px;background:#0ea5e9;right:-90px;top:-150px"></div>
      <div class="blob" style="width:220px;height:220px;background:#0369a1;left:-60px;bottom:-110px"></div>
      <div class="minis">
       <div class="mini" style="transform:rotate(-4deg)"><div class="ico" style="background:#0284c7">${ICON.sheet.replace(/64/g, 34)}</div><div class="ln"></div><div class="ln" style="width:60%;background:#86efac"></div></div>
       <div class="mini" style="transform:translateY(-12px)"><div class="ico" style="background:#16a34a">${ICON.game.replace(/64/g, 34)}</div><div class="ln"></div><div class="ln" style="width:60%;background:#c4b5fd"></div></div>
       <div class="mini" style="transform:rotate(4deg)"><div class="ico" style="background:#ea580c"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><div class="ln"></div><div class="ln" style="width:60%;background:#fde68a"></div></div>
      </div>
      <span class="lbl">${esc(U().ictTag)}</span>
     </div>
     <div class="foot"><div class="t"><b>${esc(U().ict)}</b><span>${esc(U().ictSub)}</span></div><span class="round" style="background:#0284c7">${ICON.play}</span></div>
    </button>
    <a class="bigcard" id="goTyping" href="${esc(CFG.typingUrl || '#')}" target="_blank" rel="noopener">
     <div class="art" style="background:#ea580c">
      <div class="blob" style="width:320px;height:320px;background:#fb923c;left:-80px;top:-140px"></div>
      <div class="blob" style="width:240px;height:240px;background:#c2410c;right:-60px;bottom:-120px"></div>
      <div class="kb" aria-hidden="true">${kb.map(r => `<div class="row">${r.map(k => `<span class="${hl.has(k) ? 'hl' : ''}">${k}</span>`).join('')}</div>`).join('')}<div class="space"></div></div>
      <span class="lbl">${esc(U().typTag)}</span>
     </div>
     <div class="foot"><div class="t"><b>${esc(U().typ)}</b><span>${esc(U().typSub)}</span></div><span class="round" style="background:#ea580c">${ICON.ext}</span></div>
    </a>
   </div>
   <div class="wrap bar">${langBtns()}<a class="teacher" href="teacher/">${ICON.lock}${esc(U().teacher)}</a></div>
  </div>`;
  $('#goIct').onclick = () => {
    const me = store.get('me');
    go(me && levelOf(me.room) ? `#/lib/${me.room}/${encodeURIComponent(me.name)}` : '#/rooms');
  };
}

// ---------- เลือกห้อง ----------
function pageRooms(){
  view.innerHTML = `<div class="page">
   <div class="wrap bar">${backBtn('#/', U().home)}<span class="tag">THAI ICT</span></div>
   <h1 style="font-size:48px;text-align:center">${esc(U().whichRoom)}</h1>
   <div class="wrap levels">${LEVELS.map(l => `<section>
     <div class="lvname" style="color:${l.label}">${esc(tt(l.name))}</div>
     <div class="rooms">${l.rooms.map(r => `<button type="button" class="room" data-go="#/names/${esc(r)}" style="background:${l.color};box-shadow:0 8px 0 ${l.shadow}">${esc(r)}</button>`).join('')}</div>
   </section>`).join('')}</div>
   <div class="wrap bar">${langBtns()}</div>
  </div>`;
}

// ---------- เลือกชื่อ ----------
async function pageNames(room){
  const lv = levelOf(room);
  if (!lv) return go('#/rooms');
  const head = `<div class="wrap bar">${backBtn('#/rooms', U().changeRoom)}
     <div class="namehead"><span class="chip-room" style="background:${lv.color}">${esc(room)}</span><h1 style="font-size:36px">${esc(U().whoAmI)}</h1></div>
     <span style="font-size:18px;color:#bfdbfe">${esc(U().onlyMine)}</span></div>`;
  const shell = body => { view.innerHTML = `<div class="page">${head}${body}<div class="wrap bar">${langBtns()}</div></div>`; };
  if (!HubAPI.configured()) return shell(msgBox(U().notSetup));
  let names = rosterCache[room];
  if (!names) {
    shell(msgBox(U().loading));
    try { names = rosterCache[room] = await HubAPI.roster(room); }
    catch (e) { if (location.hash === '#/names/' + room) shell(msgBox(U().loadErr, true)); return; }
    if (location.hash !== '#/names/' + room) return;
  }
  shell(names.length ? `<div class="wrap names">${names.map((n, i) =>
      `<button type="button" class="name" data-go="#/lib/${esc(room)}/${esc(encodeURIComponent(n))}"><span class="av" style="background:${AV[i % AV.length]}">${esc(initial(n))}</span>${esc(n)}</button>`).join('')}</div>
      <p class="msg" style="margin:0;font-size:17px;color:#93c5fd">${esc(U().noName)}</p>`
    : msgBox(U().emptyRoster));
}

// ---------- คลังกิจกรรม ----------
let libState = null;   // { key, data }
async function pageLib(room, name){
  const lv = levelOf(room);
  if (!lv || !name) return go('#/rooms');
  store.set('me', { room, name });
  const key = room + '|' + name;
  const idx = Math.max(0, (rosterCache[room] || []).indexOf(name));
  const header = (done, total) => `<div class="wrap bar">
     <div class="me"><span class="av" style="background:${AV[idx % AV.length]}">${esc(initial(name))}</span>
      <div><b>${esc(U().hi(name))}</b><small>${esc(room)} · <button type="button" class="back" data-go="#/names/${esc(room)}">${esc(U().notMe)}</button> · <button type="button" class="back" data-go="#/">${esc(U().home)}</button></small></div></div>
     ${total != null ? `<div class="prog"><span>${esc(U().sent)}</span><div class="track"><div class="fill" style="width:${total ? Math.round(done / total * 100) : 0}%"></div></div><b>${done}/${total}</b></div>` : ''}
    </div>`;
  const shell = (body, done, total) => { view.innerHTML = `<div class="page">${header(done, total)}${body}<div class="wrap bar">${langBtns()}</div></div>`; };
  if (!HubAPI.configured()) return shell(msgBox(U().notSetup));
  if (!libState || libState.key !== key) {
    shell(msgBox(U().loading));
    try { libState = { key, data: await HubAPI.state(room, name) }; }
    catch (e) { if (location.hash === libHash(room, name)) shell(msgBox(U().loadErr, true)); return; }
    if (location.hash !== libHash(room, name)) return;
  }
  const open = libState.data.open || {}, status = libState.data.status || {};
  const mine = ACTS.filter(a => a.level === lv.id);
  const sheets = mine.filter(a => a.kind === 'sheet');
  const openSheets = sheets.filter(a => open[a.id]);
  const done = openSheets.filter(a => status[a.id] === 'done').length;
  const list = mine.filter(a => a.kind === tab);
  const tabs = `<div class="wrap tabs" role="tablist">${Object.keys(U().tabs).map(k =>
    `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${esc(U().tabs[k])}<small>${mine.filter(a => a.kind === k).length}</small></button>`).join('')}</div>`;
  const cards = list.length ? `<div class="wrap cards">${list.map(a => cardHtml(a, open[a.id], status[a.id], room, name, (libState.data.rounds || {})[a.id] || 0, !!(libState.data.drafts || {})[a.id])).join('')}</div>` : msgBox(U().noActs);
  shell(tabs + cards, done, openSheets.length);
}
const libHash = (room, name) => `#/lib/${room}/${encodeURIComponent(name)}`;

// มีงานค้าง: ยังไม่เคยส่ง = "ทำค้างไว้" · ส่งแล้วแต่กำลังแก้รอบใหม่ = ยังเป็น "ส่งแล้ว" แต่ปุ่มเป็น "ทำต่อ"
function cardHtml(a, isOpen, status, room, name, rounds, draft){
  const s = !isOpen ? 'lock' : a.kind === 'game' ? 'play' : status === 'done' ? 'done' : draft ? 'doing' : 'todo';
  const art = !isOpen ? '#94a3b8' : a.kind === 'game' ? '#15803d' : '#0284c7';
  const tag = a.kind === 'sheet' ? U().week(a.week) : tt(a.tag);
  let action;
  if (s === 'lock') action = `<div class="lockbox">${ICON.lock}${esc(U().locked)}</div>`;
  else if (a.kind === 'game') action = `<button type="button" class="btn" style="background:#15803d" data-game="${esc(a.id)}">${esc(U().btn.play)}</button>`;
  else action = `<a class="btn" href="${esc(sheetHref(a, room, name, rounds + 1, draft))}">${esc(U().btn[draft ? 'doing' : s])}</a>`;
  return `<div class="card${s === 'lock' ? ' locked' : ''}" data-act="${esc(a.id)}">
    <div class="pic" style="background:${art}">${a.kind === 'game' ? ICON.game : ICON.sheet}<span>${esc(tag)}</span></div>
    <div class="bd"><div class="ttl">${esc(tt(a.title))}</div><span class="st ${s}">${esc(U().st[s])}</span><div class="sp"></div>${action}</div>
  </div>`;
}
// ส่งห้อง/ชื่อ/ภาษา/รอบถัดไปให้ใบงานทาง # (ไม่ถูกส่งไปเซิร์ฟเวอร์) เผื่อเครื่องที่ปิด localStorage
const sheetHref = (a, room, name, round, draft) => `${a.path}#${new URLSearchParams(Object.assign({ room, name, lang: L, round }, draft ? { draft: 1 } : {}))}`;

// ---------- เกม (เปิดเต็มจอใน iframe) ----------
function openGame(id){
  const a = ACTS.find(x => x.id === id); if (!a) return;
  const wrap = $('#gameWrap'), fr = $('#gameFrame'), close = $('#gameClose');
  close.textContent = U().closeGame;
  close.classList.toggle('hide', !!a.ownBack);
  fr.onload = () => { try { fr.contentWindow.postMessage({ lang: L }, '*'); fr.contentWindow.focus(); } catch (e) {} };
  fr.src = a.path;
  wrap.classList.remove('hide');
}
function closeGame(){ $('#gameWrap').classList.add('hide'); $('#gameFrame').src = 'about:blank'; }
$('#gameClose').onclick = closeGame;
addEventListener('message', e => { if (e.data === 'closeGame') closeGame(); });

// ---------- ตัวจัดเส้นทาง ----------
function route(){
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  document.documentElement.lang = L;
  window.scrollTo(0, 0);
  if (parts[0] === 'rooms') return pageRooms();
  if (parts[0] === 'names') return pageNames(parts[1]);
  if (parts[0] === 'lib') return pageLib(parts[1], parts[2]);
  return pageHome();
}
view.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-lang],[data-tab],[data-retry],[data-game]');
  if (!el) return;
  if (el.dataset.go) return go(el.dataset.go);
  if (el.dataset.lang) { L = el.dataset.lang; store.set('lang', L); return route(); }
  if (el.dataset.tab) { tab = el.dataset.tab; return route(); }
  if (el.dataset.game) return openGame(el.dataset.game);
  if (el.hasAttribute('data-retry')) { libState = null; return route(); }
});
addEventListener('hashchange', () => { libState = null; route(); });
// กลับมาจากใบงานด้วยปุ่ม Back ของเบราว์เซอร์ → โหลดสถานะใหม่
addEventListener('pageshow', e => { if (e.persisted) { libState = null; route(); } });

Promise.all([fetch('data/levels.json').then(r => r.json()), fetch('data/activities.json').then(r => r.json())])
  .then(([lv, ac]) => { LEVELS = lv.levels; ACTS = ac.activities; route(); })
  .catch(() => { view.innerHTML = `<div class="page">${msgBox(UI[L].loadErr)}</div>`; });
})();
