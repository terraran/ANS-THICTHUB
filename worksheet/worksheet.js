// ใบงานกลาง: worksheet/?act=y3w1#room=Y3.2&name=ขิม&lang=th&round=2&draft=1
// draft=1 = มีงานค้าง ให้โหลดมาทำต่อ · done=1 = ส่งแล้ว ให้โหลดงานที่ส่งล่าสุดมาแสดงผลตรวจ
// เนื้อหามาจาก content/<act>.json · ข้อมูลการ์ดในคลัง (frq, afterGame) มาจาก ../data/activities.json
// view=1 (worksheet/?act=y3w1&view=1) = มุมครูเปิดดูงานที่ส่งแล้วแบบดูอย่างเดียว ข้อมูลงานส่งมาทาง postMessage (ดู bootView)
// map: "tree" (ค่าเริ่มต้น Tree Map 2 กลุ่ม binA/binB) · "flow" (Flow Map: กล่องตาม bins)
//      · "bubble" (Double Bubble: หัวข้อ 2 วงตรงกลาง ฟองลอยอยู่ในแผนภาพ เด็กลากเส้นจากฟองไปหาหัวข้อ · ต่อ A อย่างเดียว = a · B อย่างเดียว = b · ต่อทั้งคู่ = m)
// ขั้น 2: มี signs = กดป้ายสัญญาณบนการ์ดกลุ่ม b · มี write = เขียนตัวอย่าง/วิธีรับมือ (เลือกสถานการณ์ได้ถ้ามี write.choose)
// add = ขั้น 1 เด็กพิมพ์การ์ดของตัวเองเพิ่มลงกล่องไหนก็ได้ (อย่างน้อย add.min ใบ ไม่ตรวจถูกผิด)
// write.fields[].hd = หัวข้อเหนือช่อง (แค่แสดง) · noReason = ไม่มีขั้นให้เหตุผล: ขั้น 2 เสร็จแล้วเด้งคำถาม Frame of Reference เลย (หัวขั้นเหลือ 3 ขั้น)
// write.flex = Flow Map ไม่จำกัดขั้น: กล่องแรกเลือกสัญญาณ (signs + พิมพ์เพิ่มเอง) · เด็กกด ➕ เพิ่มกล่องเอง (min-max กล่อง)
// map: "multi" = Multi-Flow Map: เหตุการณ์ (multi.event) อยู่กลาง · ซ้าย = สาเหตุ (multi.cause) · ขวา = ผล (multi.effect) · เด็กกด ➕ เพิ่มกล่องเอง (min-max ต่อฝั่ง)
//   ขั้น 1 เขียน Map → ขั้น 2 คิดย้อนกลับ (FoR) แล้วส่ง · ไม่ตรวจถูกผิด · เก็บใน write.ca / write.ef
// write.choose[].thumb = รูปบนการ์ดเลือกเรื่อง (ไม่ใส่ = ใช้ art ฉากแรก) · write.choose[].scenes = การ์ตูนสั้น: ขั้น 1 เลือกเรื่องแล้วดูให้จบ · cards: [] = ไม่มีการ์ด ไม่ตรวจถูกผิด ครูอ่านที่เด็กเขียน
(() => {
const $ = s => document.querySelector(s);
const { store, initial, esc, AV } = HubUtil;
const UI = {
  th: { steps: ['1 จัดกลุ่ม', '2 หาสัญญาณ', '3 ให้เหตุผล', '4 คิดย้อนกลับ'], stepTag: (n, m) => `ขั้น ${n} / ${m}`, lib: 'คลังกิจกรรม', week: n => `สัปดาห์ ${n}`,
        next: 'ไปขั้นต่อไป ➜', back: '◀ ย้อนกลับ', check: 'ตรวจคำตอบและส่งให้ครู ✔', skip: 'ข้าม แล้วส่งเลย', edit: '✏️ แก้แล้วส่งใหม่', lib2: 'กลับคลังกิจกรรม',
        pickHint: '👆 กดเลือกการ์ดที่เราลังเลมากที่สุดบนใบงาน', picked: 'การ์ดที่เราลังเลที่สุด:', reason: 'อะไรทำให้เราคิดแบบนั้น?', reasonPh: 'พิมพ์เหตุผลของเรา...',
        task4: '<b>ขั้นที่ 4</b> คิดย้อนกลับ: ตอบคำถามในกรอบ หรือกดข้ามได้ถ้าเวลาไม่พอ', frOpt: '· ไม่บังคับ', frPh: 'เรารู้เพราะ...',
        doneTask: 'ดูผลการตรวจ การ์ด ✗ มีคำอธิบายบอกไว้ ส่วนการ์ด ✓ เอาเมาส์ชี้เพื่อดูคำอธิบาย', should: 'ควรอยู่ใน', result: (a, n) => `ถูก ${a}/${n} ใบ`, round: n => `รอบที่ ${n}`,
        wait: 'กำลังส่งคำตอบให้ครู...', ok: 'ส่งคำตอบให้ครูแล้ว ✓', err: 'ส่งไม่สำเร็จ ลองกดส่งอีกครั้ง หรือบอกครู', play: n => `🎮 เล่นเกม${n}`,
        noMe: 'ยังไม่ได้เลือกห้องและชื่อ เข้าใบงานจากคลังกิจกรรมนะ', noAct: 'ไม่พบใบงานนี้', goLib: 'ไปที่คลังกิจกรรม',
        sentAt: tm => `ส่งให้ครูแล้วเมื่อ ${tm} ✓`, myReason: 'เหตุผลของเรา:', myFr: 'คิดย้อนกลับ:', lastLoading: 'กำลังโหลดงานที่ส่งไปแล้ว...',
        saved: tm => `💾 บันทึกอัตโนมัติแล้ว ${tm}`, resumed: tm => `↻ ทำต่อจากที่บันทึกไว้ ${tm}`, restart: 'เริ่มใหม่ ↺', confirmRestart: 'ลบงานที่ทำไว้ แล้วเริ่มใหม่ไหม?',
        loading: 'กำลังโหลดงานที่ทำค้างไว้...', pairAdd: '+ ทำกับเพื่อน', pairChange: 'เปลี่ยนเพื่อน', pairHd: r => `ทำงานคู่กับใคร? (${r})`,
        solo: 'ทำคนเดียว', pairFt: 'กดส่งครั้งเดียว ใบงานนับให้ทั้งสองคน', rosterErr: 'โหลดรายชื่อไม่สำเร็จ ลองใหม่อีกครั้ง',
        addPh: 'พิมพ์เพิ่ม 1 ข้อ...', addTo: 'ใส่ใน', addN: (n, m) => n >= m ? `เพิ่มแล้ว ${n} ใบ ✓ เพิ่มอีกได้` : `เพิ่มแล้ว ${n} ใบ · อีก ${m - n} ใบ`, del: 'ลบ', myOwn: 'การ์ดที่เราเพิ่ม:', addBubble: '➕ เพิ่มฟอง',
        replay: '↺ ดูอีกครั้ง', addMf: '➕ เพิ่มกล่อง', doneMulti: 'ส่ง Multi-Flow Map ให้ครูแล้ว ครูจะอ่านที่เราเขียน', addHere: 'เพิ่มกล่องตรงนี้ไหม?', addBox: 'เพิ่มกล่องไหม?', add: 'เพิ่ม', watchAgain: '▶ ดูการ์ตูนอีกครั้ง', chooseTtl: '🎬 เลือกเรื่องที่อยากดู', watchThis: '▶ ดูเรื่องนี้', change: '⇄ เปลี่ยนเรื่อง', doneWrite: 'ส่ง Flow Map ให้ครูแล้ว ครูจะอ่านที่เราเขียน' },
  en: { steps: ['1 Sort', '2 Find signs', '3 Explain', '4 Look back'], stepTag: (n, m) => `Step ${n} / ${m}`, lib: 'Activities', week: n => `Week ${n}`,
        next: 'Next step ➜', back: '◀ Back', check: 'Check and send to teacher ✔', skip: 'Skip and send', edit: '✏️ Fix and send again', lib2: 'Back to activities',
        pickHint: '👆 Tap the card you were least sure about', picked: 'The card we were least sure about:', reason: 'What makes you think that?', reasonPh: 'Type your reason...',
        task4: '<b>Step 4</b> Look back: answer the question in the frame, or skip if there is no time.', frOpt: '· optional', frPh: 'We know because...',
        doneTask: 'Here are your results. ✗ cards show why. Point at a ✓ card to see why it is right.', should: 'Belongs in', result: (a, n) => `${a}/${n} correct`, round: n => `Round ${n}`,
        wait: 'Sending to your teacher...', ok: 'Sent to your teacher ✓', err: 'Could not send. Try sending again or tell your teacher.', play: n => `🎮 Play ${n}`,
        noMe: 'Pick your class and name first. Open worksheets from the activity page.', noAct: 'Worksheet not found', goLib: 'Go to activities',
        sentAt: tm => `Sent to your teacher on ${tm} ✓`, myReason: 'Our reason:', myFr: 'Looking back:', lastLoading: 'Loading the work you sent...',
        saved: tm => `💾 Saved ${tm}`, resumed: tm => `↻ Continuing from ${tm}`, restart: 'Start over ↺', confirmRestart: 'Delete your saved work and start over?',
        loading: 'Loading your saved work...', pairAdd: '+ Work with a friend', pairChange: 'Change friend', pairHd: r => `Who are you working with? (${r})`,
        solo: 'Work alone', pairFt: 'Send once and it counts for both of you', rosterErr: 'Could not load names. Try again.',
        addPh: 'Type 1 more...', addTo: 'Put in', addN: (n, m) => n >= m ? `${n} added ✓ you can add more` : `${n} added · ${m - n} to go`, del: 'Delete', myOwn: 'Cards we added:', addBubble: '➕ Add bubble',
        replay: '↺ Watch again', addMf: '➕ Add a box', doneMulti: 'Your Multi-Flow Map was sent. Your teacher will read it.', addHere: 'Add a box here?', addBox: 'Add a box?', add: 'Add', watchAgain: '▶ Watch the cartoon again', chooseTtl: '🎬 Pick a story to watch', watchThis: '▶ Watch this', change: '⇄ Change story', doneWrite: 'Your Flow Map was sent. Your teacher will read it.' }
};

const H = new URLSearchParams(location.hash.slice(1));
const me = { room: H.get('room') || '', name: H.get('name') || '' };
if (!me.room || !me.name) { const s = store.get('me'); if (s) Object.assign(me, s); }
const Q = new URLSearchParams(location.search);
const actId = Q.get('act') || '', viewOnly = Q.get('view') === '1';
let L = (H.get('lang') || store.get('lang')) === 'en' ? 'en' : 'th';
let C = null, A = null, game = null;   // เนื้อหาใบงาน · ข้อมูลการ์ดในคลัง · เกมหลังส่ง
let step = 1, placed = {}, signs = {}, hes = '', sel = null, round = Math.max(1, parseInt(H.get('round'), 10) || 1);
let wr = { pick: '', f: {} };   // ขั้นเขียน: สถานการณ์ที่เลือก + ข้อความแต่ละช่อง
let own = [];                    // การ์ดที่เด็กเพิ่มเอง [{id, text, bin}]
let scene = 0, seen = false, sceneTimer = 0, choosing = false;   // การ์ตูนขั้น 1: ฉากที่เล่นอยู่ · ดูจบแล้วหรือยัง · อยู่หน้าเลือกเรื่อง
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
const MULTI = () => C.map === 'multi';
const isWrite = () => !!C.write || MULTI();
const fieldEl = id => document.querySelector(`[data-f="${id}"]`);
const signsDone = () => C.cards.filter(c => placed[c.id] === 'b').every(c => signs[c.id] && signs[c.id].size);
const FLEX = () => !!(C.write && C.write.flex);
const flexDone = () => wr.sg.length + wr.so.length >= 1 && wr.st.length >= (C.write.flex.min || 1) && wr.st.every(x => x.trim().length >= 2);
const writeDone = () => (!C.write.choose || !!wr.pick) && (FLEX() ? flexDone() : C.write.fields.every(f => (wr.f[f.id] || '').trim().length >= 2));
const mfOk = (xs, M) => xs.length >= (M.min || 2) && xs.every(x => x.trim().length >= 2);
const multiDone = () => mfOk(wr.ca, C.multi) && mfOk(wr.ef, C.multi);
const step2Done = () => MULTI() ? multiDone() : isWrite() ? writeDone() : signsDone();
const isAdd = () => !!C.add;
const WEB = () => C.map === 'bubble';
const ownDone = () => !isAdd() || (own.length >= (C.add.min || 3) && (!WEB() || own.every(o => o.bin)));
const skip3 = () => !!C.noReason;
const stepNo = n => n >= 3 && MULTI() ? 2 : skip3() && n === 4 ? 3 : n;   // เลขขั้นที่เด็กเห็น
const stepMax = () => MULTI() ? 2 : skip3() ? 3 : 4;
const STORY = () => !!(C.write && C.write.choose && C.write.choose.some(c => c.scenes));
const story = () => STORY() && C.write.choose.find(c => c.id === wr.pick);
const storyDone = () => !STORY() || (!!wr.pick && seen);

// สร้างแผนภาพตามชนิด (tree ใช้ HTML เดิมใน index.html)
function buildMap(){
  stage.classList.toggle('popfor', skip3()); app.classList.toggle('bubblemap', C.map === 'bubble'); app.classList.toggle('nocards', !C.cards.length);
  const m = $('#map'), box = b => `<div class="bin ${b.id}" data-bin="${b.id}"><h2></h2><div class="list"></div>` +
    (C.write ? C.write.fields.filter(f => f.in === b.id).map(fieldHtml).join('') : '') + '</div>';
  if (WEB()) {
    m.className = 'map web';
    m.innerHTML = '<svg class="links" id="links" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>' +
      '<div class="topic a" id="topA" data-topic="a"></div><div class="topic b" id="topB" data-topic="b"></div><div id="web"></div>';
    m.addEventListener('click', e => {
      if (step !== 1 || checked || e.target.closest('#web .cardx')) return;
      const hit = e.target.closest('.hit');                // แตะเส้น = ตัดเส้นนั้นทิ้ง
      if (hit) { toggleLink(lineEls[hit.dataset.i], hit.dataset.t); select(null); return; }
      const tp = e.target.closest('.topic');
      if (tp && sel) toggleLink(sel, tp.dataset.topic); else if (!tp) select(null);
    });
  } else if (C.map === 'flow') {
    const steps = bins().filter(b => !b.off), off = bins().filter(b => b.off);
    m.className = 'map flow';
    m.innerHTML = '<div class="frow">' + steps.map(box).join('<div class="arrow">➜</div>') + '</div>' + off.map(box).join('');
    if (FLEX()) { m.className = 'map flow flex'; m.innerHTML = '<div class="frow" id="frow"></div>'; Object.assign(wr, { sg: [], so: [], st: [] }); bindFlex(); }
  } else if (MULTI()) {
    m.className = 'map multi'; m.innerHTML = '<div class="mf" id="mf"></div>';
    Object.assign(wr, { ca: [''], ef: [''] }); bindMulti();
  }
  if (C.add) {
    $('#addBins').innerHTML = WEB() ? '<button type="button" class="ab add" data-b=""></button>'
      : bins().map(b => `<button type="button" class="ab ${b.id}" data-b="${b.id}"></button>`).join('');
    $('#addTx').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = $('.ab'); if (!b.disabled) b.click(); } });
    $('#addBins').addEventListener('click', e => { const b = e.target.closest('.ab'); if (b) addOwn($('#addTx').value, b.dataset.b); });
    $('#addTx').addEventListener('input', update);
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
    const b = e.target.closest('.pick'); if (!b || step !== (STORY() ? 1 : 2) || checked) return;
    const again = wr.pick !== b.dataset.p;
    wr.pick = b.dataset.p; paintPick(); dirty = true;
    if (STORY() && again) { seen = false; playScene(0); }
    update();
  });
  if (STORY()) {
    $('#sdots').addEventListener('click', e => { const d = e.target.closest('[data-i]'); if (d && story()) playScene(+d.dataset.i); });
    $('#replay').onclick = () => { if (story()) playScene(0); };
    $('#change').onclick = () => { choosing = true; playScene(0); };
    $('#scene').addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b || step !== 1 || checked) return;
      if (wr.pick !== b.dataset.p) seen = false;
      wr.pick = b.dataset.p; choosing = false; dirty = true; playScene(0); update();
    });
    $('#again').onclick = () => setStep(1);
  }
}
// ---- Flow Map ไม่จำกัดขั้น (write.flex): wr.sg = ป้ายสัญญาณที่เลือก · wr.so = สัญญาณที่พิมพ์เอง · wr.st = ข้อความแต่ละกล่อง ----
function renderFlex(){
  const F = C.write.flex, U = UI[L], ed = step === 2 && !checked, can = ed && wr.st.length < (F.max || 6);
  const ph = i => t(F.ph[Math.min(i, F.ph.length - 1)]);
  const plus = i => can ? `<button type="button" class="plus" data-add="${i}">➕ <span>${U.addHere}</span></button>` : '';
  const sign = `<div class="bin sig"><h2>${esc(t(binLabel('sig')) || '')}</h2><div class="sgs">` +
    F.signs.map(g => `<button type="button" class="sg${wr.sg.includes(g.id) ? ' on' : ''}" data-sg="${g.id}"${ed ? '' : ' disabled'}><span>${g.icon || ''}</span>${esc(t(g.text))}</button>`).join('') +
    wr.so.map((x, i) => `<span class="sg on own"><span>✏️</span>${esc(x)}${ed ? `<button type="button" class="x" data-sodel="${i}" aria-label="${U.del}">✕</button>` : ''}</span>`).join('') + '</div>' +
    (ed ? `<div class="sgadd"><input id="sgTx" maxlength="40" autocomplete="off" placeholder="${esc(t(F.signPh))}"><button type="button" id="sgAdd">${U.add}</button></div>` : '') + '</div>';
  // แถวละ ROW ช่อง · 2 แถวเมื่อกล่องเกิน: กล่องสัญญาณสูงเต็มซ้าย ขั้นที่เหลือขึ้นแถวใหม่ รับลูกศรหักมุมจากท้ายแถวบน (.wrapline)
  const slot = (k, add) => `<div class="slot${k % ROW ? '' : ' up'}${can && add != null ? ' can' : ''}">${k % ROW ? '<span class="arrow">➜</span>' : ''}${add != null ? plus(add) : ''}</div>`;
  const box = (x, i) => `<div class="bin stp">${slot(i + 1, i)}<h2><span class="no">${i + 2}</span>${ed ? `<button type="button" class="x" data-del="${i}" aria-label="${U.del}">✕</button>` : ''}</h2>` +
    `<textarea data-st="${i}" placeholder="${esc(ph(i))}"${ed ? '' : ' readonly'}>${esc(x)}</textarea></div>`;
  const n = 1 + wr.st.length + (can ? 1 : 0);
  $('#frow').innerHTML = sign + wr.st.map(box).join('') +
    (can ? `<div class="ghost">${slot(wr.st.length + 1)}<button type="button" class="gbox" data-add="${wr.st.length}"><b>➕</b><span>${U.addBox}</span></button></div>` : '') +
    (n > ROW ? '<div class="wrapline"><i></i><i></i></div>' : '');
  $('#frow').classList.toggle('two', n > ROW);
}
const ROW = 4;
function addSign(){
  const x = $('#sgTx').value.trim().slice(0, 40);
  if (!x || wr.so.length >= 4) return;
  wr.so.push(x); dirty = true; renderFlex(); update(); $('#sgTx').focus();
}
function bindFlex(){
  const fr = $('#frow');
  fr.addEventListener('click', e => {
    if (step !== 2 || checked) return;
    const g = e.target.closest('[data-sg]'), a = e.target.closest('button[data-add]'), d = e.target.closest('[data-del]'), so = e.target.closest('[data-sodel]');
    if (e.target.closest('#sgAdd')) return addSign();
    if (g) wr.sg = wr.sg.includes(g.dataset.sg) ? wr.sg.filter(x => x !== g.dataset.sg) : wr.sg.concat(g.dataset.sg);
    else if (so) wr.so.splice(+so.dataset.sodel, 1);
    else if (d) wr.st.splice(+d.dataset.del, 1);
    else if (a) wr.st.splice(+a.dataset.add, 0, '');
    else return;
    dirty = true; renderFlex(); update();
    if (a) fr.querySelector(`[data-st="${a.dataset.add}"]`).focus();
  });
  fr.addEventListener('input', e => { const i = e.target.dataset.st; if (i == null) return; wr.st[+i] = e.target.value; dirty = true; update(); });
  fr.addEventListener('keydown', e => { if (e.target.id === 'sgTx' && e.key === 'Enter') { e.preventDefault(); addSign(); } });
}

// ---- Multi-Flow Map (map: "multi"): wr.ca = กล่องสาเหตุ · wr.ef = กล่องผล ----
let mfNew = '';   // กล่องที่เพิ่งกด ➕ (เด้งเข้าเฉพาะกล่องนี้ ไม่เด้งทุกครั้งที่วาดใหม่)
function renderMulti(){
  const M = C.multi, U = UI[L], ed = step === 1 && !checked;
  const col = k => { const xs = wr[k], S = k === 'ca' ? M.cause : M.effect, ph = i => t(S.ph[Math.min(i, S.ph.length - 1)]);
    return `<div class="mcol ${k}"><h2>${esc(t(S.label))}</h2><div class="mlist">` + xs.map((x, i) =>
      `<div class="mbox${mfNew === k + i ? ' nw' : ''}"><textarea data-mf="${k}" data-i="${i}" maxlength="120" placeholder="${esc(ph(i))}"${ed ? '' : ' readonly'}>${esc(x)}</textarea>` +
      (ed && xs.length > 1 ? `<button type="button" class="x" data-mdel="${k}" data-i="${i}" aria-label="${U.del}">✕</button>` : '') + '</div>').join('') +
      (ed && xs.length < (M.max || 5) ? `<button type="button" class="madd" data-madd="${k}">${U.addMf}</button>` : '') + '</div></div>'; };
  $('#mf').innerHTML = '<svg class="mfl" id="mfl" aria-hidden="true"></svg>' + col('ca') +
    `<div class="mev"><div class="mevb" id="mev">${esc(t(M.event))}</div></div>` + col('ef');
  mfNew = ''; requestAnimationFrame(drawMulti);
}
// เส้นลูกศร: กล่องสาเหตุ → เหตุการณ์ → กล่องผล (คิดจากตำแหน่งจริง หารด้วย scale ของจอ)
function drawMulti(){
  const mf = $('#mf'), ev = $('#mev'), svg = $('#mfl'); if (!mf || !ev || !svg) return;
  const o = mf.getBoundingClientRect(), r = el => { const b = el.getBoundingClientRect(); return { l: (b.left - o.left) / scale, r: (b.right - o.left) / scale, y: (b.top + b.height / 2 - o.top) / scale }; };
  const e = r(ev);
  svg.setAttribute('viewBox', `0 0 ${o.width / scale} ${o.height / scale}`);
  const line = (x1, y1, x2, y2, k) => `<path class="${k}" d="M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}" marker-end="url(#mfa-${k})"/>`;
  const spread = (i, n) => e.y + (i - (n - 1) / 2) * 16;
  const ca = [...mf.querySelectorAll('.ca .mbox')], ef = [...mf.querySelectorAll('.ef .mbox')];
  svg.innerHTML = '<defs>' + ['ca', 'ef'].map(k => `<marker id="mfa-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path class="${k}" d="M0,0 L10,5 L0,10 z"/></marker>`).join('') + '</defs>' +
    ca.map((b, i) => { const p = r(b); return line(p.r + 4, p.y, e.l - 16, spread(i, ca.length), 'ca'); }).join('') +
    ef.map((b, i) => { const p = r(b); return line(e.r + 12, spread(i, ef.length), p.l - 8, p.y, 'ef'); }).join('');
}
addEventListener('resize', () => { if (C && MULTI()) drawMulti(); });
function bindMulti(){
  const mf = $('#mf');
  mf.addEventListener('click', e => {
    if (step !== 1 || checked) return;
    const a = e.target.closest('[data-madd]'), d = e.target.closest('[data-mdel]');
    if (a) { wr[a.dataset.madd].push(''); mfNew = a.dataset.madd + (wr[a.dataset.madd].length - 1); }
    else if (d) wr[d.dataset.mdel].splice(+d.dataset.i, 1);
    else return;
    dirty = true; renderMulti(); update();
    if (a) { const xs = mf.querySelectorAll(`.${a.dataset.madd} textarea`); xs[xs.length - 1].focus(); }
  });
  mf.addEventListener('input', e => { const k = e.target.dataset.mf; if (!k) return; wr[k][+e.target.dataset.i] = e.target.value; dirty = true; update(); });
  mf.addEventListener('pointerdown', e => e.stopPropagation());
}

// ---- การ์ดที่เด็กเพิ่มเอง (ขั้น 1) ----
function ownEl(o){
  const d = document.createElement('div'); d.className = 'cardx own'; d.dataset.own = o.id;
  d.innerHTML = `<div class="ic">✏️</div><div class="bd"><div class="tx">${esc(o.text)}</div></div><button type="button" class="del">✕</button>`;
  d.querySelector('.del').addEventListener('click', e => {
    e.stopPropagation(); if (step !== 1 || checked) return;
    own = own.filter(x => x.id !== o.id); if (sel === d) select(null); d.remove(); dirty = true; layout(); update();
  });
  if (WEB()) d.addEventListener('pointerdown', e => startDrag(e, d));
  return d;
}
// id = โหลดกลับจากงานค้าง/งานที่ส่ง (ไม่เช็กขั้น)
function addOwn(text, bin, id){
  text = String(text || '').trim().slice(0, 50);
  const list = WEB() ? $('#web') : document.querySelector(`.bin[data-bin="${bin}"] .list`);
  if (!text || !list || (!id && (step !== 1 || checked || own.length >= (C.add.max || 9)))) return;
  const o = { id: id || 'o' + Date.now().toString(36) + own.length, text, bin: bin || '' };
  const el = ownEl(o);
  own.push(o); list.appendChild(el);
  if (!id) { $('#addTx').value = ''; dirty = true; if (WEB()) select(el); else $('#addTx').focus(); }
  layout(); update();
}

// ---- Double Bubble: ฟองลอยรอบหัวข้อ 2 วง · เส้นเชื่อมฟองกับหัวข้อ ----
const TOPIC = { a: [31, 50], b: [69, 50] };          // จุดกลางหัวข้อ (% ของแผนภาพ)
let lineEls = [];                                     // ฟองของเส้นแต่ละเส้น (ใช้ตอนแตะเส้น)
const linksOf = bin => bin === 'm' ? ['a', 'b'] : bin ? [bin] : [];
const binOf = set => set.has('a') && set.has('b') ? 'm' : set.has('a') ? 'a' : set.has('b') ? 'b' : '';
const ownOf = el => el.dataset.own ? own.find(o => o.id === el.dataset.own) : null;
const binFor = el => { const o = ownOf(el); return o ? o.bin : placed[el.dataset.id] || ''; };
function select(el){
  document.querySelectorAll('.cardx.sel').forEach(x => x !== el && x.classList.remove('sel'));
  sel = el || null; if (sel) sel.classList.add('sel');
  if ($('#map')) $('#map').classList.toggle('picking', !!sel && WEB());
}
// แตะหัวข้อ = ต่อ/ตัดเส้นไปหัวข้อนั้น · ไม่เหลือเส้นเลย = ฟองกลับไปลอยว่าง ๆ
function toggleLink(el, tp){
  const cur = new Set(linksOf(binFor(el)));
  cur.has(tp) ? cur.delete(tp) : cur.add(tp);
  setBin(el, binOf(cur));
  el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing');
  dirty = true; layout(); update();
}
function setBin(el, b){
  const o = ownOf(el);
  if (o) o.bin = b; else if (b) placed[el.dataset.id] = b; else delete placed[el.dataset.id];
}
function layout(){
  if (!C || !WEB()) return;
  const g = { a: [], m: [], b: [], '': [] };
  $('#web').querySelectorAll('.cardx').forEach(el => { const b = binFor(el); g[b].push(el); el.classList.toggle('free', !b); });
  const sp = (n, i, lo, hi) => n < 2 ? (lo + hi) / 2 : lo + (hi - lo) * i / (n - 1);
  const right = el => { const c = C.cards.find(x => x.id === el.dataset.id); return !c || placed[c.id] === c.bin; };
  let lines = '', hits = ''; lineEls = [];
  const put = (el, x, y) => {
    el.style.left = x + '%'; el.style.top = y + '%';
    if (!el.style.animationDelay) el.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
    linksOf(binFor(el)).forEach(tp => {
      lines += `<line class="${checked && !right(el) ? 'bad' : ''}" x1="${x}" y1="${y}" x2="${TOPIC[tp][0]}" y2="${TOPIC[tp][1]}"/>`;
      hits += `<polyline class="hit" data-i="${lineEls.length}" data-t="${tp}" points="${x},${y} ${TOPIC[tp][0]},${TOPIC[tp][1]}"/>`;
      lineEls.push(el);
    });
  };
  const roomy = !g[''].length;                         // มีฟองลอยว่าง ๆ อยู่ = เว้นบน/ล่างไว้ให้
  const many = C.cards.length > 10;                    // ฟองเยอะ = ฟองลอยเรียงแถวบน/ล่างแถวละ 6 ฟองที่ต่อแล้วอยู่แถบกลาง
  ['a', 'b'].forEach(side => {
    const xs = g[side], max = Math.min(roomy ? 70 : many ? 36 : 60, 20 * (xs.length - 1)), dir = side === 'a' ? -1 : 1;
    xs.forEach((el, i) => { const r = sp(xs.length, i, -max, max) * Math.PI / 180;
      put(el, TOPIC[side][0] + dir * 20 * Math.cos(r), 50 + 42 * Math.sin(r)); });
  });
  const h = Math.min(roomy ? 38 : 22, 13 * (g.m.length - 1));
  g.m.forEach((el, i) => put(el, 50, sp(g.m.length, i, 50 - h, 50 + h)));
  // ฟองที่ยังไม่ต่อเส้น ลอยอยู่แถวบน/ล่างของแผนภาพ
  const FREE = many
    ? [[41, 9], [59, 9], [41, 91], [59, 91], [25, 9], [75, 9], [25, 91], [75, 91], [9, 9], [91, 9], [9, 91], [91, 91]]
    : [[50, 11], [35, 13], [65, 13], [50, 89], [35, 87], [65, 87], [20, 11], [80, 11], [20, 89], [80, 89]];
  g[''].forEach((el, i) => { const [x, y] = FREE[i % FREE.length]; put(el, x, y + 4 * Math.floor(i / FREE.length)); });
  $('#links').innerHTML = lines + hits;
  $('#web').classList.toggle('tight', Math.max(g.a.length, g.m.length, g.b.length) > 5 || many);
}
// ลากจากฟองไปปล่อยบนหัวข้อ = ต่อ/ตัดเส้น · แตะเฉย ๆ = เลือกฟอง แล้วแตะหัวข้อทีหลัง
const topicAt = ev => { const x = document.elementFromPoint(ev.clientX, ev.clientY); return x && x.closest('.topic'); };
function startLink(e, el){
  if (e.target.closest('.del')) return;
  e.preventDefault();
  const sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), svg = $('#dragLine'), ln = svg.querySelector('line');
  const x1 = (r.left + r.width / 2 - sr.left) / scale, y1 = (r.top + r.height / 2 - sr.top) / scale, sx = e.clientX, sy = e.clientY;
  let moved = false;
  const mv = ev => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
    if (!moved) { moved = true; select(el); svg.classList.remove('hide'); }
    ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
    ln.setAttribute('x2', (ev.clientX - sr.left) / scale); ln.setAttribute('y2', (ev.clientY - sr.top) / scale);
    const tp = topicAt(ev); document.querySelectorAll('.topic').forEach(x => x.classList.toggle('hover', x === tp));
  };
  addEventListener('pointermove', mv);
  addEventListener('pointerup', ev => {
    removeEventListener('pointermove', mv); svg.classList.add('hide');
    document.querySelectorAll('.topic').forEach(x => x.classList.remove('hover'));
    if (!moved) return select(sel === el ? null : el);
    const tp = topicAt(ev); if (tp) toggleLink(el, tp.dataset.topic);
  }, { once: true });
}
const ownSummary = () => bins().map(b => { const xs = own.filter(o => o.bin === b.id).map(o => o.text);
  return xs.length ? plain(HubUtil.t(b.label, 'th')) + ': ' + xs.join(', ') : ''; }).filter(Boolean).join(' | ');
const fieldHtml = f => `<div class="wfield"><label></label><textarea rows="2" data-f="${f.id}"></textarea></div>`;
const paintPick = () => document.querySelectorAll('.pick').forEach(b => b.classList.toggle('on', b.dataset.p === wr.pick));
function paintWrite(){
  if (!C.write) return;
  const w = C.write;
  $('#chooseHd').textContent = t(w.chooseHd);
  document.querySelectorAll('.pick').forEach(b => { const c = w.choose.find(x => x.id === b.dataset.p); b.innerHTML = `<span class="pic">${c.icon || ''}</span>${t(c.text)}`; });
  w.fields.forEach(f => { const el = fieldEl(f.id); if (!el) return; el.placeholder = t(f.ph); el.previousElementSibling.textContent = t(f.hd || f.label); });
}
const writeSummary = () => {
  const th = o => (o && typeof o === 'object') ? o.th : o;
  if (MULTI()) { const xs = k => wr[k].map(x => x.trim()).filter(Boolean).join(', ');
    return `${plain(th(C.multi.event))} | ${plain(th(C.multi.cause.label))}: ${xs('ca')} | ${plain(th(C.multi.effect.label))}: ${xs('ef')}`; }
  const w = C.write, p = (w.choose || []).find(c => c.id === wr.pick);
  if (w.flex) return (p ? plain(th(p.text)) + ' | ' : '') + 'สัญญาณ: ' + w.flex.signs.filter(g => wr.sg.includes(g.id)).map(g => th(g.text)).concat(wr.so).join(', ') +
    wr.st.map((x, i) => ` | ขั้น ${i + 2}: ${x.trim()}`).join('');
  return (p ? plain(th(p.text)) + ' | ' : '') + w.fields.map(f => plain(th(f.label || binLabel(f.in)) || f.id) + ': ' + (wr.f[f.id] || '').trim()).join(' | ');
};

// ---- การ์ตูนสั้นขั้น 1 (write.choose[].scenes) · เล่นต่อเองทีละฉาก · ฉากสุดท้ายคือคำถาม ask ----
const sceneHtml = (sc, i) => `<div class="scn bg-${sc.bg || 'day'}${sc.fx ? ' fx-' + sc.fx : ''}" data-n="${i}">` +
  `<div class="art">${(sc.art || []).map((a, k) => `<span style="--k:${k}">${a}</span>`).join('')}</div>` +
  (sc.phone ? `<div class="phone"><div class="pfrom">${esc(sc.phone.from || '')}</div><div class="pmsg">${esc(t(sc.phone.text))}</div></div>` : '') +
  `<div class="say">${esc(t(sc.say))}</div></div>`;
function paintScene(){
  const s = story(), U = UI[L];
  $('#change').textContent = U.change;
  $('.sbar').classList.toggle('hide', !s || choosing);
  // หน้าเลือกเรื่อง: การ์ดใหญ่เรื่องละใบ (ภาพจากฉากแรก)
  if (!s || choosing) { $('#scene').innerHTML = `<div class="chooser"><h2>${U.chooseTtl}</h2><div class="scards">` + C.write.choose.map((c, k) =>
    `<button type="button" class="scard${c.id === wr.pick ? ' on' : ''}" data-p="${c.id}" style="--k:${k}"><span class="sart bg-${c.scenes[0].bg || 'day'}">${(c.thumb || c.scenes[0].art).map(a => `<span>${a}</span>`).join('')}</span>` +
    `<b>${esc(t(c.text))}</b><span class="go">${U.watchThis}</span></button>`).join('') + '</div></div>'; return; }
  const n = s.scenes.length;
  $('#scene').innerHTML = scene < n ? sceneHtml(s.scenes[scene], scene)
    : `<div class="scn bg-ask" data-n="ask"><div class="art"><span>🧒</span><span style="--k:1">💭</span></div><div class="say big">${esc(t(s.ask))}</div></div>`;
  $('#sdots').innerHTML = s.scenes.map((x, i) => `<button type="button" class="dot${i === scene ? ' on' : i < scene ? ' past' : ''}" data-i="${i}">${i + 1}</button>`).join('') +
    `<button type="button" class="dot${scene >= n ? ' on' : ''}" data-i="${n}">❓</button>`;
  $('#replay').textContent = U.replay;
}
function playScene(i){
  clearTimeout(sceneTimer);
  const s = story(); scene = i;
  if (s && i >= s.scenes.length) { scene = s.scenes.length; if (!seen) { seen = true; update(); } }
  paintScene();
  if (s && !choosing && scene < s.scenes.length && step === 1 && !checked) sceneTimer = setTimeout(() => playScene(scene + 1), s.scenes[scene].ms || 4000);
}
// ขั้นเขียน: แถบเรื่องย่อ 4 ฉาก ให้ดูระหว่างเขียน
function paintStrip(){
  const s = story(); if (!s) { $('#strip').innerHTML = ''; return; }
  $('#strip').innerHTML = `<div class="sttl"><span class="pic">${s.icon || ''}</span>${esc(t(s.text))}</div>` +
    s.scenes.map(sc => `<div class="mini bg-${sc.bg || 'day'}"><span class="ma">${(sc.art || []).join('')}</span><span class="ms">${esc(t(sc.say))}</span></div>`).join('');
  $('#again').textContent = UI[L].watchAgain;
}

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
  const U = UI[L]; document.documentElement.lang = L; if (!viewOnly) store.set('lang', L);
  $('#lth').classList.toggle('on', L === 'th'); $('#len').classList.toggle('on', L === 'en');
  $('#lLib').textContent = U.lib;
  $('#toLib').href = libHref();
  $('#ttl').textContent = `${U.week(C.week)} · ${t(C.title)}`; document.title = t(C.title);
  (t(C.steps) || U.steps).forEach((s, i) => $('#s' + (i + 1)).textContent = s);
  $('#s4').classList.toggle('hide', skip3()); $('#s3').classList.toggle('hide', MULTI());
  $('#stag').textContent = U.stepTag(stepNo(Math.min(step, 4)), stepMax());
  let task = t(C['task' + step]) || '';
  if (step === 3) task += hes ? '' : `<br><b>${U.pickHint}</b>`;
  if (checked) task = `<b>${U.round(round)}</b> · ${C.cards.length ? U.doneTask : MULTI() ? U.doneMulti : U.doneWrite}`;
  $('#task').innerHTML = task;
  if ($('#root')) $('#root').textContent = t(C.root);
  if ($('#topA')) { $('#topA').textContent = t(C.topicA); $('#topB').textContent = t(C.topicB); }
  document.querySelectorAll('.bin').forEach(el => el.querySelector('h2').textContent = t(binLabel(el.dataset.bin)));
  paintWrite();
  if (STORY()) { paintStrip(); if (step === 1 && !checked) paintScene(); }
  if (FLEX()) renderFlex();
  if (MULTI()) renderMulti();
  if (C.add) {
    $('#addTx').placeholder = t(C.add.ph) || U.addPh;
    document.querySelectorAll('.ab').forEach(b => b.textContent = b.dataset.b ? `${U.addTo} ${t(binLabel(b.dataset.b))}` : U.addBubble);
    $('#addN').textContent = U.addN(own.length, C.add.min || 3);
    document.querySelectorAll('.cardx.own .del').forEach(b => b.setAttribute('aria-label', U.del));
  }
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
  if (checked) { $('#result').textContent = C.cards.length ? U.result(score(), C.cards.length) : '✍️'; $('#think').innerHTML = t(C.think); showSent(); }
}
// คำถาม FoR: ครูตั้งได้ใบงานละ 1 ข้อใน activities.json · ค่าเริ่มต้นคือคำถามหลักข้อ 1 ของโรงเรียน
const frq = () => (A && A.frq) || { th: 'เรารู้ได้อย่างไรว่าการ์ดไหนอยู่กลุ่มไหน?', en: 'How do we know which group each card belongs to?' };
$('#lth').onclick = () => { L = 'th'; applyLang(); }; $('#len').onclick = () => { L = 'en'; applyLang(); };

// ---- ลาก (เมาส์ + ทัช บนจอที่ถูกย่อขยาย) และแตะเพื่อวาง ----
let drag = null;
function startDrag(e, el){
  if (step !== 1 || e.target.classList.contains('chip')) return;
  if (WEB()) return checked || startLink(e, el);
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
  if (step === 1) $('#next').disabled = Object.keys(placed).length !== C.cards.length || !ownDone() || !storyDone() || (MULTI() && !multiDone());
  if (C.add) { $('#addN').textContent = UI[L].addN(own.length, C.add.min || 3);
    const full = own.length >= (C.add.max || 9);
    document.querySelectorAll('.ab').forEach(b => b.disabled = full || !$('#addTx').value.trim()); $('#addTx').disabled = full; }
  if (step === 2) $('#next').disabled = !step2Done();
  $('#toFor').disabled = !(hes && $('#reason').value.trim().length >= 5);
  $('#check').disabled = $('#skip').disabled = sending;
}
$('#reason').addEventListener('input', () => { dirty = true; update(); });
$('#fr').addEventListener('input', () => { dirty = true; });

function setStep(n){
  step = n; [1, 2, 3, 4].forEach(i => $('#s' + i).classList.toggle('on', i === stepNo(n) && !checked));
  app.classList.toggle('full', n >= 2 || WEB() || !C.cards.length); app.classList.toggle('pickmode', n === 3 && !checked && !skip3()); app.classList.toggle('adding', n === 1 && !checked);
  $('#next').classList.toggle('hide', n >= 3); $('#back').classList.toggle('hide', checked || n === 1);
  $('#drawer').classList.toggle('hide', !(n === 3 && hes && !checked));
  $('#res').classList.toggle('hide', !checked);
  $('#forPanel').classList.toggle('hide', n !== 4);
  const adder = isAdd() && n === 1 && !checked;
  $('#adder').classList.toggle('hide', !adder);
  if (C.write) {
    const box = !!C.write.choose || C.write.fields.some(f => !f.in);   // มีอะไรให้แสดงนอกแผนภาพไหม
    $('#writer').classList.toggle('hide', !(adder || (box && (n === 2 || checked))));
    $('#wgrid').classList.toggle('hide', adder || !C.write.fields.some(f => !f.in));
    document.querySelectorAll('[data-f]').forEach(el => { el.readOnly = n !== 2 || checked; });
  }
  if (STORY()) {   // ขั้น 1 = เลือกเรื่อง + ดูการ์ตูน (ซ่อนแผนภาพ) · ขั้นอื่น = แถบเรื่องย่อเหนือ Flow Map
    const watch = n === 1 && !checked;
    $('#story').classList.toggle('hide', !watch); $('#map').classList.toggle('hide', watch);
    $('#wch').classList.add('hide'); $('#stripRow').classList.toggle('hide', watch || !story());
    $('#again').classList.toggle('hide', checked);
    if (watch) playScene(seen && story() ? story().scenes.length : 0); else clearTimeout(sceneTimer);
  }
  if (n === 2 && !isWrite()) C.cards.forEach(c => { if (placed[c.id] !== 'b') delete signs[c.id]; const el = cardOf(c.id); el && el.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('on', !!(signs[c.id] && signs[c.id].has(+ch.dataset.s)))); });
  if (n === 4) setTimeout(() => $('#fr').focus(), 0);
  if (WEB() && n !== 1) select(null);
  applyLang(); update();
  if (dirty && !checked) saveNow();
}
$('#next').onclick = () => setStep(MULTI() || (step === 2 && skip3()) ? 4 : step + 1);
$('#back').onclick = () => setStep(step - 1);
$('#toFor').onclick = () => setStep(4);
$('#forBack').onclick = () => setStep(MULTI() ? 1 : skip3() ? 2 : 3);

const score = () => C.cards.filter(c => placed[c.id] === c.bin).length;
function showSent(){ const U = UI[L], s = $('#sent'); s.className = 'sent ' + sendState;
  s.textContent = sendState === 'ok' ? (sentAt ? U.sentAt(sentAt.toLocaleString('th-TH', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })) : U.ok)
    : sendState === 'err' ? U.err : sendState === 'wait' ? U.wait : '';
  const rs = $('#reason').value.trim(), fr = $('#fr').value.trim();
  $('#mine').innerHTML = checked ? [rs && `<b>🤔 ${U.myReason}</b> ${esc(rs)}`, fr && `<b>🧭 ${U.myFr}</b> ${esc(fr)}`].filter(Boolean).join(' · ') : '';
  $('#play').classList.toggle('hide', !(game && sendState === 'ok')); }

// แถวที่ส่ง: รูปแบบเดิม 15 ช่อง (Script เติมเวลาไว้หน้าสุด) · JSON v3 = v2 + frq
function buildRow(fr){
  const th = o => (o && typeof o === 'object') ? o.th : o;
  const wrong = C.cards.filter(c => placed[c.id] !== c.bin).map(c => plain(th(c.text)));
  const inB = C.cards.filter(c => placed[c.id] === 'b');
  const exact = isWrite() ? null : inB.filter(c => c.bin === 'b' && [...(signs[c.id] || [])].sort().join() === (c.signs || []).slice().sort().join()).length;
  const chosen = (isAdd() && own.length ? 'เพิ่มเอง ' + ownSummary() + (isWrite() ? ' || ' : '') : '') + (isWrite() ? writeSummary() : inB.map(c => plain(th(c.text)) + ' = ' + [...(signs[c.id] || [])].sort().map(n => plain(th(C.signs[n - 1].short))).join(', ')).join(' | '));
  const hc = C.cards.find(c => c.id === hes);
  const sg = {}; if (!isWrite()) inB.forEach(c => sg[c.id] = [...(signs[c.id] || [])].sort());
  const reason = $('#reason').value.trim();
  const data = { v: 3, act: C.act, round, place: placed, signs: sg, hes, reason, fr, frq: th(frq()) };
  if (isWrite()) Object.assign(data, { map: C.map, write: wr });
  if (isAdd()) Object.assign(data, { map: C.map, own });
  return [C.level, C.week, th(C.title), me.room, members().join(' + '), L.toUpperCase(), C.cards.length ? `${score()}/${C.cards.length}` : '✓',
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
  select(null); layout();
}
function submit(fr){ checked = true; markResults(); setStep(3); send(fr); }
// งานที่ส่งล่าสุด: วางการ์ดตามที่ส่ง แสดงผลตรวจ · กด "แก้แล้วส่งใหม่" ทำรอบถัดไปจากคำตอบเดิมได้
function showSubmitted(last){
  const d = last.data, key = n => String(n).replace(/\s+/g, '').toUpperCase();
  restore({ placed: d.place, signs: d.signs, hes: d.hes, reason: d.reason, fr: d.fr, write: d.write, own: d.own,
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
  layout();
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
  return { v: 1, step, round, placed, signs: sg, write: wr, own, hes, reason: $('#reason').value, fr: $('#fr').value, partner };
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
  if (WEB()) Object.keys(d.placed || {}).forEach(id => { const el = cardOf(id); if (el && linksOf(d.placed[id]).length) setBin(el, d.placed[id]); });
  else Object.keys(d.placed || {}).forEach(id => { const el = cardOf(id), bin = document.querySelector(`.bin[data-bin="${d.placed[id]}"]`); if (el && bin) { bin.querySelector('.list').appendChild(el); placed[id] = d.placed[id]; } });
  if (isAdd() && Array.isArray(d.own)) { own = []; document.querySelectorAll('.cardx.own').forEach(x => x.remove()); d.own.forEach(o => addOwn(o.text, o.bin, o.id)); }
  layout();
  Object.keys(d.signs || {}).forEach(id => { if (placed[id] === 'b') { signs[id] = new Set(d.signs[id]); cardOf(id).querySelectorAll('.chip').forEach(ch => ch.classList.toggle('on', signs[id].has(+ch.dataset.s))); } });
  if (MULTI() && d.write) {
    const arr = x => Array.isArray(x) && x.length ? x.slice(0, C.multi.max || 5).map(String) : [''];
    wr = { pick: '', f: {}, ca: arr(d.write.ca), ef: arr(d.write.ef) };
  }
  if (C.write && d.write) {
    wr = { pick: d.write.pick || '', f: Object.assign({}, d.write.f) }; seen = !!wr.pick; choosing = false;
    if (FLEX()) { const arr = x => Array.isArray(x) ? x.map(String) : []; Object.assign(wr, { sg: arr(d.write.sg), so: arr(d.write.so), st: arr(d.write.st) }); }
    Object.keys(wr.f).forEach(id => { const el = fieldEl(id); if (el) el.value = wr.f[id]; }); paintPick();
  }
  if (d.hes && cardOf(d.hes)) { hes = d.hes; cardOf(hes).classList.add('hes'); }
  $('#reason').value = d.reason || ''; $('#fr').value = d.fr || '';
  setPartner(d.partner && d.partner !== me.name ? d.partner : '');
  // ไปขั้นที่ไกลที่สุดที่ทำได้จริง (กันข้อมูลไม่ครบ)
  if (MULTI()) return (d.step || 1) >= 4 && multiDone() ? 4 : 1;
  let n = 1;
  if (Object.keys(placed).length === C.cards.length && ownDone() && storyDone()) n = 2;
  if (n === 2 && step2Done()) n = 3;
  const s = Math.min(Math.max(1, d.step || 1), n === 3 && (skip3() || (hes && $('#reason').value.trim().length >= 5)) ? 4 : n);
  return skip3() && s === 3 ? 2 : s;
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
async function loadContent(){
  if (!/^[a-z0-9_-]+$/i.test(actId)) throw new Error('act');
  const [c, acts] = await Promise.all([fetch(`content/${actId}.json`).then(r => { if (!r.ok) throw new Error('act'); return r.json(); }),
                                       fetch('../data/activities.json').then(r => r.json())]);
  C = c; A = acts.activities.find(a => a.id === actId) || null;
  game = A && A.afterGame ? acts.activities.find(a => a.id === A.afterGame) || null : null;
}
// งานที่ส่งกับการ์ดชุดเก่า: แสดงด้วยการ์ดที่เด็กเห็นตอนส่ง (ดูจาก retired ในไฟล์เนื้อหา)
function useCardsOf(last){
  const ids = Object.keys(last.data.place), all = C.cards.concat(C.retired || []);
  if (ids.some(id => !C.cards.some(c => c.id === id))) { oldSet = true; C = Object.assign({}, C, { cards: ids.map(id => all.find(c => c.id === id)).filter(Boolean) }); }
}
async function boot(){
  if (viewOnly) return bootView();
  if (!me.room || !me.name) return showMsg(UI[L].noMe);
  store.set('me', me);
  $('#meName').textContent = me.name; $('#meAv').textContent = initial(me.name);
  $('#meAv').style.background = AV[1];
  try { await loadContent(); } catch (e) { return showMsg(UI[L].noAct); }
  const want = H.get('draft') === '1' ? 'draft' : H.get('done') === '1' ? 'last' : '';
  let saved = null;
  if (want && HubAPI.configured()) {
    $('#loadingTxt').textContent = want === 'draft' ? UI[L].loading : UI[L].lastLoading; $('#loading').classList.remove('hide');
    try { saved = want === 'draft' ? await HubAPI.draft(me.room, me.name, actId) : await HubAPI.last(me.room, me.name, actId); } catch (e) {}
    $('#loading').classList.add('hide');
  }
  const last = want === 'last' && saved && saved.data && saved.data.place ? saved : null;
  if (last) useCardsOf(last);
  buildMap();
  shuffle(C.cards).forEach(c => (WEB() ? $('#web') : pool).appendChild(cardEl(c)));
  layout();
  let start = 1;
  if (want === 'draft' && saved && saved.data && saved.data.placed) {
    start = restore(saved.data) || 1; resumedAt = new Date(saved.updatedAt);
    $('#resume').classList.remove('hide'); setTimeout(() => $('#resume').classList.add('hide'), 15000);
  }
  setStep(start);
  if (last) showSubmitted(last);
}
// มุมครู: ใบงานบอกหน้าแม่ว่า 'viewReady' → หน้าแม่ตอบ { view: { data, time, members }, room, lang, hide }
// ไม่บันทึก ไม่ส่ง ไม่จำชื่อในเครื่อง · hide = ซ่อนชื่อเด็กเป็น •••
function bootView(){
  document.body.classList.add('viewonly');
  let started = false;
  addEventListener('message', async e => {
    const m = e.data;
    if (e.origin !== location.origin || !m || !m.view || !m.view.data || started) return;
    started = true;
    const last = m.view, who = last.members || [];
    L = m.lang === 'en' ? 'en' : 'th'; me.room = m.room || ''; me.name = who[0] || '';
    try { await loadContent(); } catch (err) { return showMsg(UI[L].noAct); }
    useCardsOf(last);
    buildMap();
    C.cards.forEach(c => (WEB() ? $('#web') : pool).appendChild(cardEl(c)));
    setStep(1); showSubmitted(last);
    const nm = n => m.hide ? '•••' : n, av = n => m.hide ? '?' : initial(n);
    $('#meName').textContent = nm(me.name); $('#meAv').textContent = av(me.name); $('#meAv').style.background = AV[1];
    if (partner) { $('#pName').textContent = nm(partner); $('#pAv').textContent = av(partner); }
    parent.postMessage('viewShown', location.origin);
  });
  parent.postMessage('viewReady', location.origin);
}
boot();
})();
