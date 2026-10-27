// ใบงานกลาง: worksheet/?act=y3w1#room=Y3.2&name=ขิม&lang=th&round=2&draft=1
// draft=1 = มีงานค้าง ให้โหลดมาทำต่อ · done=1 = ส่งแล้ว ให้โหลดงานที่ส่งล่าสุดมาแสดงผลตรวจ
// เนื้อหามาจาก content/<act>.json · ข้อมูลการ์ดในคลัง (frq, afterGame) มาจาก ../data/activities.json
// map: "tree" (ค่าเริ่มต้น Tree Map 2 กลุ่ม binA/binB) · "bubble" (Double Bubble: กล่อง a / m=เหมือนกัน / b) · "flow" (Flow Map: กล่องตาม bins)
// ขั้น 2: มี signs = กดป้ายสัญญาณบนการ์ดกลุ่ม b · มี write = เขียนตัวอย่าง/วิธีรับมือ (เลือกสถานการณ์ได้ถ้ามี write.choose)
(() => {
const $ = s => document.querySelector(s);
const { store, initial, esc, AV } = HubUtil;
const UI = {
  th: { steps: ['1 จัดกลุ่ม', '2 หาสัญญาณ', '3 ให้เหตุผล', '4 คิดย้อนกลับ'], stepTag: n => `ขั้น ${n} / 4`, lib: 'คลังกิจกรรม', week: n => `สัปดาห์ ${n}`,
        next: 'ไปขั้นต่อไป ➜', back: '◀ ย้อนกลับ', check: 'ตรวจคำตอบและส่งให้ครู ✔', skip: 'ข้าม แล้วส่งเลย', edit: '✏️ แก้แล้วส่งใหม่', lib2: 'กลับคลังกิจกรรม',
        pickHint: '👆 กดเลือกการ์ดที่เราลังเลมากที่สุดบนใบงาน', picked: 'การ์ดที่เราลังเลที่สุด:', reason: 'อะไรทำให้เราคิดแบบนั้น?', reasonPh: 'พิมพ์เหตุผลของเรา...',
        task4: '<b>ขั้นที่ 4</b> คิดย้อนกลับ: ตอบคำถามในกรอบ หรือกดข้ามได้ถ้าเวลาไม่พอ', frOpt: '· ไม่บังคับ', frPh: 'เรารู้เพราะ...',
        doneTask: 'ดูผลการตรวจ การ์ด ✗ มีคำอธิบายบอกไว้ ส่วนการ์ด ✓ เอาเมาส์ชี้เพื่อดูคำอธิบาย', should: 'ควรอยู่ใน', result: (a, n) => `ถูก ${a}/${n} ใบ`, round: n => `รอบที่ ${n}`,
        wait: 'กำลังส่งคำตอบให้ครู...', ok: 'ส่งคำตอบให้ครูแล้ว ✓', err: 'ส่งไม่สำเร็จ ลองกดส่งอีกครั้ง หรือบอกครู', play: n => `🎮 เล่นเกม${n}`,
        noMe: 'ยังไม่ได้เลือกห้องและชื่อ เข้าใบงานจากคลังกิจกรรมนะ', noAct: 'ไม่พบใบงานนี้', goLib: 'ไปที่คลังกิจกรรม',
        sentAt: tm => `ส่งให้ครูแล้วเมื่อ ${tm} ✓`, myReason: 'เหตุผลของเรา:', myFr: 'คิดย้อนกลับ:', lastLoading: 'กำลังโหลดงานที่ส่งไปแล้ว...',
        saved: tm => `💾 บันทึกอัตโนมัติแล้ว ${tm}`, resumed: tm => `↻ ทำต่อจากที่บันทึกไว้ ${tm}`, restart: 'เริ่มใหม่ ↺', confirmRestart: 'ลบงานที่ทำไว้ แล้วเริ่มใหม่ไหม?',
        loading: 'กำลังโหลดงานที่ทำค้างไว้...', pairAdd: '+ ทำกับเพื่อน', pairChange: 'เปลี่ยนเพื่อน', pairHd: r => `ทำงานคู่กับใคร? (${r})`,
        solo: 'ทำคนเดียว', pairFt: 'กดส่งครั้งเดียว ใบงานนับให้ทั้งสองคน', rosterErr: 'โหลดรายชื่อไม่สำเร็จ ลองใหม่อีกครั้ง' },
  en: { steps: ['1 Sort', '2 Find signs', '3 Explain', '4 Look back'], stepTag: n => `Step ${n} / 4`, lib: 'Activities', week: n => `Week ${n}`,
        next: 'Next step ➜', back: '◀ Back', check: 'Check and send to teacher ✔', skip: 'Skip and send', edit: '✏️ Fix and send again', lib2: 'Back to activities',
        pickHint: '👆 Tap the card you were least sure about', picked: 'The card we were least sure about:', reason: 'What makes you think that?', reasonPh: 'Type your reason...',
        task4: '<b>Step 4</b> Look back: answer the question in the frame, or skip if there is no time.', frOpt: '· optional', frPh: 'We know because...',
        doneTask: 'Here are your results. ✗ cards show why. Point at a ✓ card to see why it is right.', should: 'Belongs in', result: (a, n) => `${a}/${n} correct`, round: n => `Round ${n}`,
        wait: 'Sending to your teacher...', ok: 'Sent to your teacher ✓', err: 'Could not send. Try sending again or tell your teacher.', play: n => `🎮 Play ${n}`,
        noMe: 'Pick your class and name first. Open worksheets from the activity page.', noAct: 'Worksheet not found', goLib: 'Go to activities',
        sentAt: tm => `Sent to your teacher on ${tm} ✓`, myReason: 'Our reason:', myFr: 'Looking back:', lastLoading: 'Loading the work you sent...',
        saved: tm => `💾 Saved ${tm}`, resumed: tm => `↻ Continuing from ${tm}`, restart: 'Start over ↺', confirmRestart: 'Delete your saved work and start over?',
        loading: 'Loading your saved work...', pairAdd: '+ Work with a friend', pairChange: 'Change friend', pairHd: r => `Who are you working with? (${r})`,
        solo: 'Work alone', pairFt: 'Send once and it counts for both of you', rosterErr: 'Could not load names. Try again.' }
};

const H = new URLSearchParams(location.hash.slice(1));
const me = { room: H.get('room') || '', name: H.get('name') || '' };
if (!me.room || !me.name) { const s = store.get('me'); if (s) Object.assign(me, s); }
const actId = new URLSearchParams(location.search).get('act') || '';
let L = (H.get('lang') || store.get('lang')) === 'en' ? 'en' : 'th';
let C = null, A = null, game = null;   // เนื้อหาใบงาน · ข้อมูลการ์ดในคลัง · เกมหลังส่ง
let step = 1, placed = {}, signs = {}, hes = '', sel = null, round = Math.max(1, parseInt(H.get('round'), 10) || 1);
let wr = { pick: '', f: {} };   // ขั้นเขียน: สถานการณ์ที่เลือก + ข้อความแต่ละช่อง
let checked = false, sendState = '', scale = 1, sending = false, dirty = false, partner = '', sentAt = null, oldSet = false;
const app = $('#app'), pool = $('#pool'), stage = $('#stage');
const t = o => HubUtil.t(o, L);
const plain = h => String(h).replace(/<[^>]+>/g, '');
const libHref = () => `../#/lib/${me.room}/${encodeURIComponent(me.name)}`;

function fit(){ scale = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `scale(${scale})`;
  stage.style.left = ((innerWidth - 1600 * scale) / 2) + 'px'; stage.style.top = ((innerHeight - 900 * scale) / 2) + 'px'; }
addEventListener('resize', fit); fit();
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const cardOf = id => document.querySelector(`.cardx[data-id="${id}"]`);
const bins = () => C.bins || [{ id: 'a', label: C.binA }, { id: 'b', label: C.binB }];
const binLabel = id => (bins().find(b => b.id === id) || {}).label;
const isWrite = () => !!C.write;
const fieldEl = id => document.querySelector(`[data-f="${id}"]`);
const signsDone = () => C.cards.filter(c => placed[c.id] === 'b').every(c => signs[c.id] && signs[c.id].size);
const writeDone = () => (!C.write.choose || !!wr.pick) && C.write.fields.every(f => (wr.f[f.id] || '').trim().length >= 2);
const step2Done = () => isWrite() ? writeDone() : signsDone();

// สร้างแผนภาพตามชนิด (tree ใช้ HTML เดิมใน index.html)
function buildMap(){
  const m = $('#map'), box = b => `<div class="bin ${b.id}" data-bin="${b.id}"><h2></h2><div class="list"></div>` +
    (C.write ? C.write.fields.filter(f => f.in === b.id).map(fieldHtml).join('') : '') + '</div>';
  if (C.map === 'bubble') {
    const [a, mid, b] = ['a', 'm', 'b'].map(id => bins().find(x => x.id === id));
    m.className = 'map bubble';
    m.innerHTML = box(a) + '<div class="topic a" id="topA"></div>' + box(mid) + '<div class="topic b" id="topB"></div>' + box(b);
  } else if (C.map === 'flow') {
    const steps = bins().filter(b => !b.off), off = bins().filter(b => b.off);
    m.className = 'map flow';
    m.innerHTML = '<div class="frow">' + steps.map(box).join('<div class="arrow">➜</div>') + '</div>' + off.map(box).join('');
  }
  if (!C.write) return;
  const w = C.write;
  if (w.choose) { $('#map').before($('#writer')); $('#wch').classList.remove('hide'); $('#choose').innerHTML = w.choose.map(c => `<button class="pick" data-p="${c.id}"></button>`).join(''); }
  $('#wgrid').style.gridTemplateColumns = `repeat(${w.cols || 2}, 1fr)`;
  $('#wgrid').innerHTML = w.fields.filter(f => !f.in).map(fieldHtml).join('');
  $('#wgrid').classList.toggle('hide', !w.fields.some(f => !f.in));
  document.querySelectorAll('[data-f]').forEach(el => {
    el.addEventListener('input', () => { wr.f[el.dataset.f] = el.value; dirty = true; update(); });
    el.addEventListener('pointerdown', e => e.stopPropagation());
  });
  $('#choose').addEventListener('click', e => {
    const b = e.target.closest('.pick'); if (!b || step !== 2 || checked) return;
    wr.pick = b.dataset.p; paintPick(); dirty = true; update();
  });
}
const fieldHtml = f => `<div class="wfield"><label></label><textarea rows="2" data-f="${f.id}"></textarea></div>`;
const paintPick = () => document.querySelectorAll('.pick').forEach(b => b.classList.toggle('on', b.dataset.p === wr.pick));
function paintWrite(){
  if (!C.write) return;
  const w = C.write;
  $('#chooseHd').textContent = t(w.chooseHd);
  document.querySelectorAll('.pick').forEach(b => { const c = w.choose.find(x => x.id === b.dataset.p); b.innerHTML = `<span class="pic">${c.icon || ''}</span>${t(c.text)}`; });
  w.fields.forEach(f => { const el = fieldEl(f.id); if (!el) return; el.placeholder = t(f.ph); el.previousElementSibling.textContent = t(f.label); });
}
const writeSummary = () => {
  const th = o => (o && typeof o === 'object') ? o.th : o, w = C.write, p = (w.choose || []).find(c => c.id === wr.pick);
  return (p ? plain(th(p.text)) + ' | ' : '') + w.fields.map(f => plain(th(f.label || binLabel(f.in)) || f.id) + ': ' + (wr.f[f.id] || '').trim()).join(' | ');
};

function showMsg(text){
  $('#msgTxt').textContent = text; $('#msgBtn').textContent = UI[L].goLib;
  $('#msgBtn').href = me.room && me.name ? libHref() : '../';
  $('#msg').classList.remove('hide');
}

function cardEl(c){
  const d = document.createElement('div'); d.className = 'cardx'; d.dataset.id = c.id;
  d.innerHTML = (c.icon ? `<div class="ic">${c.icon}</div>` : '') + `<div class="bd">` + (c.who ? `<div class="nm">💬 ${esc(c.who)}</div>` : '') +
    `<div class="tx"></div><div class="chips">${(C.signs || []).map((s, i) => `<span class="chip" data-s="${i + 1}"></span>`).join('')}</div><div class="exp"></div></div>`;
  d.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', e => {
    if (step !== 2 || checked) return;
    e.stopPropagation(); const set = signs[c.id] || (signs[c.id] = new Set()); const n = +ch.dataset.s;
    set.has(n) ? set.delete(n) : set.add(n); ch.classList.toggle('on', set.has(n)); dirty = true; update();
  }));
  d.addEventListener('pointerdown', e => startDrag(e, d));
  d.addEventListener('click', () => {
    if (step !== 3 || checked) return;
    hes = c.id; dirty = true;
    document.querySelectorAll('.cardx.hes').forEach(x => x.classList.remove('hes')); d.classList.add('hes');
    $('#drawer').classList.remove('hide'); applyLang(); update();
  });
  return d;
}

function applyLang(){
  const U = UI[L]; document.documentElement.lang = L; store.set('lang', L);
  $('#lth').classList.toggle('on', L === 'th'); $('#len').classList.toggle('on', L === 'en');
  $('#lLib').textContent = U.lib;
  $('#toLib').href = libHref();
  $('#ttl').textContent = `${U.week(C.week)} · ${t(C.title)}`; document.title = t(C.title);
  (t(C.steps) || U.steps).forEach((s, i) => $('#s' + (i + 1)).textContent = s);
  $('#stag').textContent = U.stepTag(Math.min(step, 4));
  let task = t(C['task' + step]) || '';
  if (step === 3) task += hes ? '' : `<br><b>${U.pickHint}</b>`;
  if (checked) task = `<b>${U.round(round)}</b> · ${U.doneTask}`;
  $('#task').innerHTML = task;
  if ($('#root')) $('#root').textContent = t(C.root);
  if ($('#topA')) { $('#topA').textContent = t(C.topicA); $('#topB').textContent = t(C.topicB); }
  document.querySelectorAll('.bin').forEach(el => el.querySelector('h2').textContent = t(binLabel(el.dataset.bin)));
  paintWrite();
  $('#back').textContent = U.back; $('#next').textContent = U.next; $('#toFor').textContent = U.next;
  $('#edit').textContent = U.edit; $('#lib2').textContent = U.lib2; $('#play').textContent = U.play(t(game && game.title));
  const hc = C.cards.find(c => c.id === hes); $('#hesTxt').innerHTML = `${U.picked} <b>${hc ? esc(plain(t(hc.text))) : ''}</b>`;
  $('#lReason').textContent = U.reason; $('#reason').placeholder = U.reasonPh;
  $('#frq').textContent = t(frq()); $('#frOpt').textContent = U.frOpt; $('#fr').placeholder = t(A && A.frPh) || U.frPh;
  $('#forBack').textContent = U.back; $('#skip').textContent = U.skip; $('#check').textContent = U.check;
  $('#pairBtn').textContent = partner ? U.pairChange : U.pairAdd; $('#restart').textContent = U.restart;
  if (savedAt) $('#saved').textContent = U.saved(hm(savedAt));
  if (resumedAt) $('#resumeTxt').textContent = U.resumed(hm(resumedAt));
  C.cards.forEach(c => {
    const el = cardOf(c.id); if (!el) return;
    el.querySelector('.tx').innerHTML = t(c.text);
    el.querySelectorAll('.chip').forEach(ch => ch.textContent = t(C.signs[ch.dataset.s - 1].short));
    el.querySelector('.exp').innerHTML = checked ? (placed[c.id] === c.bin ? '' : `<b>${U.should} "${t(binLabel(c.bin))}"</b> · `) + t(c.why) : '';
  });
  if (checked) { $('#result').textContent = U.result(score(), C.cards.length); $('#think').innerHTML = t(C.think); showSent(); }
}
// คำถาม FoR: ครูตั้งได้ใบงานละ 1 ข้อใน activities.json · ค่าเริ่มต้นคือคำถามหลักข้อ 1 ของโรงเรียน
const frq = () => (A && A.frq) || { th: 'เรารู้ได้อย่างไรว่าการ์ดไหนอยู่กลุ่มไหน?', en: 'How do we know which group each card belongs to?' };
$('#lth').onclick = () => { L = 'th'; applyLang(); }; $('#len').onclick = () => { L = 'en'; applyLang(); };

// ---- ลาก (เมาส์ + ทัช บนจอที่ถูกย่อขยาย) และแตะเพื่อวาง ----
let drag = null;
function startDrag(e, el){
  if (step !== 1 || e.target.classList.contains('chip')) return;
  e.preventDefault();
  const r = el.getBoundingClientRect();
  drag = { el, ox: (e.clientX - r.left) / scale, oy: (e.clientY - r.top) / scale, sx: e.clientX, sy: e.clientY, moved: false, w: r.width / scale, home: el.parentNode, next: el.nextSibling };
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp, { once: true });
}
function binAt(x, y){ return [...document.querySelectorAll('.bin')].find(b => { const r = b.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }); }
function onMove(e){
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
  if (!drag.moved) { drag.moved = true; drag.el.classList.add('drag'); drag.el.style.width = drag.w + 'px'; stage.appendChild(drag.el); }
  const sr = stage.getBoundingClientRect();
  drag.el.style.left = ((e.clientX - sr.left) / scale - drag.ox) + 'px'; drag.el.style.top = ((e.clientY - sr.top) / scale - drag.oy) + 'px';
  document.querySelectorAll('.bin').forEach(b => b.classList.toggle('hover', b === binAt(e.clientX, e.clientY)));
}
function onUp(e){
  removeEventListener('pointermove', onMove);
  const d = drag; drag = null; if (!d) return;
  document.querySelectorAll('.bin').forEach(b => b.classList.remove('hover'));
  if (!d.moved) { document.querySelectorAll('.cardx.sel').forEach(x => x !== d.el && x.classList.remove('sel')); d.el.classList.toggle('sel'); sel = d.el.classList.contains('sel') ? d.el : null; return; }
  const b = binAt(e.clientX, e.clientY);
  d.el.classList.remove('drag'); d.el.style.cssText = '';
  if (b) place(d.el, b);
  else if (d.home === pool) pool.insertBefore(d.el, d.next && d.next.parentNode === pool ? d.next : null);
  else { pool.appendChild(d.el); delete placed[d.el.dataset.id]; update(); }
}
$('#map').addEventListener('click', e => { const b = e.target.closest('.bin'); if (!b || e.target.closest('.cardx, .wfield')) return; if (sel && step === 1) { place(sel, b); sel.classList.remove('sel'); sel = null; } });
pool.addEventListener('click', e => { if (sel && e.target === pool) { pool.appendChild(sel); delete placed[sel.dataset.id]; sel.classList.remove('sel'); sel = null; update(); } });
function place(el, bin){ bin.querySelector('.list').appendChild(el); placed[el.dataset.id] = bin.dataset.bin; dirty = true; update(); }

function update(){
  if (!C) return;
  if (dirty && !checked) scheduleSave();
  if (step === 1) $('#next').disabled = Object.keys(placed).length !== C.cards.length;
  if (step === 2) $('#next').disabled = !step2Done();
  $('#toFor').disabled = !(hes && $('#reason').value.trim().length >= 5);
  $('#check').disabled = $('#skip').disabled = sending;
}
$('#reason').addEventListener('input', () => { dirty = true; update(); });
$('#fr').addEventListener('input', () => { dirty = true; });

function setStep(n){
  step = n; [1, 2, 3, 4].forEach(i => $('#s' + i).classList.toggle('on', i === n && !checked));
  app.classList.toggle('full', n >= 2); app.classList.toggle('pickmode', n === 3 && !checked);
  $('#next').classList.toggle('hide', n >= 3); $('#back').classList.toggle('hide', checked || n === 1);
  $('#drawer').classList.toggle('hide', !(n === 3 && hes && !checked));
  $('#res').classList.toggle('hide', !checked);
  $('#forPanel').classList.toggle('hide', n !== 4);
  if (C.write) {
    $('#writer').classList.toggle('hide', !(n === 2 || checked));
    document.querySelectorAll('[data-f]').forEach(el => { el.readOnly = n !== 2 || checked; });
  }
  if (n === 2 && !isWrite()) C.cards.forEach(c => { if (placed[c.id] !== 'b') delete signs[c.id]; const el = cardOf(c.id); el && el.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('on', !!(signs[c.id] && signs[c.id].has(+ch.dataset.s)))); });
  if (n === 4) setTimeout(() => $('#fr').focus(), 0);
  applyLang(); update();
  if (dirty && !checked) saveNow();
}
$('#next').onclick = () => setStep(step + 1);
$('#back').onclick = () => setStep(step - 1);
$('#toFor').onclick = () => setStep(4);
$('#forBack').onclick = () => setStep(3);

const score = () => C.cards.filter(c => placed[c.id] === c.bin).length;
function showSent(){ const U = UI[L], s = $('#sent'); s.className = 'sent ' + sendState;
  s.textContent = sendState === 'ok' ? (sentAt ? U.sentAt(sentAt.toLocaleString('th-TH', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })) : U.ok)
    : sendState === 'err' ? U.err : sendState === 'wait' ? U.wait : '';
  const rs = $('#reason').value.trim(), fr = $('#fr').value.trim();
  $('#mine').innerHTML = checked && rs ? `<b>🤔 ${U.myReason}</b> ${esc(rs)}` + (fr ? ` · <b>🧭 ${U.myFr}</b> ${esc(fr)}` : '') : '';
  $('#play').classList.toggle('hide', !(game && sendState === 'ok')); }

// แถวที่ส่ง: รูปแบบเดิม 15 ช่อง (Script เติมเวลาไว้หน้าสุด) · JSON v3 = v2 + frq
function buildRow(fr){
  const th = o => (o && typeof o === 'object') ? o.th : o;
  const wrong = C.cards.filter(c => placed[c.id] !== c.bin).map(c => plain(th(c.text)));
  const inB = C.cards.filter(c => placed[c.id] === 'b');
  const exact = isWrite() ? null : inB.filter(c => c.bin === 'b' && [...(signs[c.id] || [])].sort().join() === (c.signs || []).slice().sort().join()).length;
  const chosen = isWrite() ? writeSummary() : inB.map(c => plain(th(c.text)) + ' = ' + [...(signs[c.id] || [])].sort().map(n => plain(th(C.signs[n - 1].short))).join(', ')).join(' | ');
  const hc = C.cards.find(c => c.id === hes);
  const sg = {}; if (!isWrite()) inB.forEach(c => sg[c.id] = [...(signs[c.id] || [])].sort());
  const reason = $('#reason').value.trim();
  const data = { v: 3, act: C.act, round, place: placed, signs: sg, hes, reason, fr, frq: th(frq()) };
  if (isWrite()) Object.assign(data, { map: C.map, write: wr });
  return [C.level, C.week, th(C.title), me.room, members().join(' + '), L.toUpperCase(), `${score()}/${C.cards.length}`,
          wrong.join(' | ') || '-', isWrite() ? '-' : `${exact}/${C.cards.filter(c => c.bin === 'b').length}`, chosen, hc ? plain(th(hc.text)) : '', reason, JSON.stringify(data), fr || '-', round];
}
const members = () => [me.name, partner].filter(Boolean);
async function send(fr){
  sending = true; update(); sendState = 'wait'; showSent();
  clearTimeout(saveTimer); sentAt = null;
  try { await HubAPI.submit(buildRow(fr), members()); sendState = 'ok'; dirty = false; }
  catch (e) { sendState = 'err'; }
  sending = false; showSent();
  if (sendState === 'err') { uncheck(); setStep(4); alert(UI[L].err); }
}
function markResults(){
  C.cards.forEach(c => {
    const el = cardOf(c.id), right = placed[c.id] === c.bin;
    el.classList.add(right ? 'good' : 'bad'); el.insertAdjacentHTML('beforeend', `<div class="mark ${right ? 'ok' : 'no'}">${right ? '✓' : '✗'}</div>`);
    if (placed[c.id] === 'b') el.querySelectorAll('.chip').forEach(ch => {
      const n = +ch.dataset.s, chosen = signs[c.id] && signs[c.id].has(n), should = (c.signs || []).includes(n);
      if (chosen && should) ch.classList.add('right'); else if (chosen) ch.classList.add('wrong'); else if (should) ch.classList.add('miss');
    });
  });
  app.classList.add('checked');
}
function submit(fr){ checked = true; markResults(); setStep(3); send(fr); }
// งานที่ส่งล่าสุด: วางการ์ดตามที่ส่ง แสดงผลตรวจ · กด "แก้แล้วส่งใหม่" ทำรอบถัดไปจากคำตอบเดิมได้
function showSubmitted(last){
  const d = last.data, key = n => String(n).replace(/\s+/g, '').toUpperCase();
  restore({ placed: d.place, signs: d.signs, hes: d.hes, reason: d.reason, fr: d.fr, write: d.write,
            partner: (last.members || []).find(n => key(n) !== key(me.name)) || '' });
  round = d.round || 1; sentAt = last.time ? new Date(last.time) : null;
  checked = true; markResults(); setStep(3);
  sendState = 'ok'; showSent();
}
function uncheck(){
  checked = false; app.classList.remove('checked');
  document.querySelectorAll('.mark').forEach(m => m.remove());
  document.querySelectorAll('.cardx').forEach(el => el.classList.remove('good', 'bad'));
  document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('right', 'wrong', 'miss'));
}
$('#check').onclick = () => submit($('#fr').value.trim());
$('#skip').onclick = () => submit('');
$('#edit').onclick = () => {
  // ส่งไว้กับการ์ดชุดเก่า (ครูเปลี่ยนการ์ดแล้ว) → เริ่มรอบใหม่กับการ์ดชุดปัจจุบัน
  if (oldSet) { const h = new URLSearchParams(location.hash.slice(1)); h.delete('done'); h.set('round', round + 1); location.hash = h; return location.reload(); }
  uncheck(); round++; sendState = ''; sentAt = null; showSent(); setStep(1);
};
$('#lib2').onclick = () => { location.href = libHref(); };
$('#toLib').addEventListener('click', () => { if (dirty && !checked) saveNow(); });

// ---- บันทึกอัตโนมัติ (Sheet แท็บ Drafts) · ทำต่อได้ทุกเครื่อง ----
let saveTimer = 0, savedAt = null, resumedAt = null;
const hm = d => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
function snapshot(){
  const sg = {}; Object.keys(signs).forEach(id => { if (signs[id].size) sg[id] = [...signs[id]].sort(); });
  return { v: 1, step, round, placed, signs: sg, write: wr, hes, reason: $('#reason').value, fr: $('#fr').value, partner };
}
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 8000); }
function saveNow(){
  clearTimeout(saveTimer);
  if (!dirty || checked || !HubAPI.configured()) return;
  dirty = false;
  HubAPI.saveDraft(me.room, actId, members(), snapshot()).then(() => { savedAt = new Date(); $('#saved').classList.remove('hide'); applyLang(); }, () => { dirty = true; });
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
addEventListener('pagehide', saveNow);

function restore(d){
  if (!d || typeof d !== 'object') return;
  round = Math.max(round, d.round || 1);
  Object.keys(d.placed || {}).forEach(id => { const el = cardOf(id), bin = document.querySelector(`.bin[data-bin="${d.placed[id]}"]`); if (el && bin) { bin.querySelector('.list').appendChild(el); placed[id] = d.placed[id]; } });
  Object.keys(d.signs || {}).forEach(id => { if (placed[id] === 'b') { signs[id] = new Set(d.signs[id]); cardOf(id).querySelectorAll('.chip').forEach(ch => ch.classList.toggle('on', signs[id].has(+ch.dataset.s))); } });
  if (C.write && d.write) {
    wr = { pick: d.write.pick || '', f: Object.assign({}, d.write.f) };
    Object.keys(wr.f).forEach(id => { const el = fieldEl(id); if (el) el.value = wr.f[id]; }); paintPick();
  }
  if (d.hes && cardOf(d.hes)) { hes = d.hes; cardOf(hes).classList.add('hes'); }
  $('#reason').value = d.reason || ''; $('#fr').value = d.fr || '';
  setPartner(d.partner && d.partner !== me.name ? d.partner : '');
  // ไปขั้นที่ไกลที่สุดที่ทำได้จริง (กันข้อมูลไม่ครบ)
  let n = 1;
  if (Object.keys(placed).length === C.cards.length) n = 2;
  if (n === 2 && step2Done()) n = 3;
  return Math.min(Math.max(1, d.step || 1), n === 3 && hes && $('#reason').value.trim().length >= 5 ? 4 : n);
}
$('#restart').onclick = () => {
  if (!confirm(UI[L].confirmRestart)) return;
  HubAPI.saveDraft(me.room, actId, members(), { v: 1, step: 1, round }).finally(() => {
    const h = new URLSearchParams(location.hash.slice(1)); h.delete('draft'); h.set('round', round);
    location.hash = h; location.reload();
  });
};

// ---- ทำงานคู่: เลือกเพื่อนจากรายชื่อห้องเดียวกัน 1 คน ----
let roster = null;
function setPartner(n){
  partner = n || '';
  $('#pairWho').classList.toggle('hide', !partner);
  $('#pName').textContent = partner; $('#pAv').textContent = partner ? initial(partner) : '';
  applyLang();
}
async function openPair(){
  const U = UI[L], panel = $('#pairPanel');
  if (!panel.classList.contains('hide')) return panel.classList.add('hide');
  $('#pairHd').textContent = U.pairHd(me.room); $('#pairFt').textContent = U.pairFt;
  panel.classList.remove('hide');
  if (!roster) {
    $('#pairList').textContent = '...';
    try { roster = await HubAPI.roster(me.room); } catch (e) { $('#pairList').textContent = U.rosterErr; return; }
  }
  const mine = HubUtil.esc;
  $('#pairList').innerHTML = `<button class="solo" data-n="">${mine(U.solo)}</button>` +
    roster.filter(n => n !== me.name).map(n => `<button class="${n === partner ? 'on' : ''}" data-n="${mine(n)}">${mine(n)}</button>`).join('');
}
$('#pairBtn').onclick = openPair;
$('#pairList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  setPartner(b.dataset.n); $('#pairPanel').classList.add('hide');
  if (!checked) { dirty = true; saveNow(); }
});

// ---- เกมหลังส่งสำเร็จ (เปิดใน iframe มีปุ่ม "กลับใบงาน" ของเกมเอง) ----
const wrap = $('#gameWrap'), gfr = $('#gameFrame');
$('#play').onclick = () => {
  wrap.style.display = 'block';
  const sendLang = () => { gfr.contentWindow.postMessage({ lang: L }, '*'); gfr.contentWindow.focus(); };
  if (!gfr.getAttribute('src')) { gfr.onload = sendLang; gfr.src = '../' + game.path; } else sendLang();
};
addEventListener('message', e => { if (e.data === 'closeGame') wrap.style.display = 'none'; });

// ---- เริ่ม ----
async function boot(){
  if (!me.room || !me.name) return showMsg(UI[L].noMe);
  store.set('me', me);
  $('#meName').textContent = me.name; $('#meAv').textContent = initial(me.name);
  $('#meAv').style.background = AV[1];
  try {
    if (!/^[a-z0-9_-]+$/i.test(actId)) throw new Error('act');
    const [c, acts] = await Promise.all([fetch(`content/${actId}.json`).then(r => { if (!r.ok) throw new Error('act'); return r.json(); }),
                                         fetch('../data/activities.json').then(r => r.json())]);
    C = c; A = acts.activities.find(a => a.id === actId) || null;
    game = A && A.afterGame ? acts.activities.find(a => a.id === A.afterGame) || null : null;
  } catch (e) { return showMsg(UI[L].noAct); }
  const want = H.get('draft') === '1' ? 'draft' : H.get('done') === '1' ? 'last' : '';
  let saved = null;
  if (want && HubAPI.configured()) {
    $('#loadingTxt').textContent = want === 'draft' ? UI[L].loading : UI[L].lastLoading; $('#loading').classList.remove('hide');
    try { saved = want === 'draft' ? await HubAPI.draft(me.room, me.name, actId) : await HubAPI.last(me.room, me.name, actId); } catch (e) {}
    $('#loading').classList.add('hide');
  }
  const last = want === 'last' && saved && saved.data && saved.data.place ? saved : null;
  if (last) {
    // งานที่ส่งกับการ์ดชุดเก่า: แสดงด้วยการ์ดที่เด็กเห็นตอนส่ง (ดูจาก retired ในไฟล์เนื้อหา)
    const ids = Object.keys(last.data.place), all = C.cards.concat(C.retired || []);
    if (ids.some(id => !C.cards.some(c => c.id === id))) { oldSet = true; C = Object.assign({}, C, { cards: ids.map(id => all.find(c => c.id === id)).filter(Boolean) }); }
  }
  buildMap();
  shuffle(C.cards).forEach(c => pool.appendChild(cardEl(c)));
  let start = 1;
  if (want === 'draft' && saved && saved.data && saved.data.placed) {
    start = restore(saved.data) || 1; resumedAt = new Date(saved.updatedAt);
    $('#resume').classList.remove('hide'); setTimeout(() => $('#resume').classList.add('hide'), 15000);
  }
  setStep(start);
  if (last) showSubmitted(last);
}
boot();
})();
