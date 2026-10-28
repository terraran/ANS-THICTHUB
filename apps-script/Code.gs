// ANS ICT Hub · Apps Script (ผูกกับ Google Sheet ของครู) · Phase 3
// วางทับโค้ดเดิมทั้งไฟล์ → Deploy → Manage deployments → แก้ไข → Version: New version (URL เดิม)
//
// รหัสครูไม่อยู่ในไฟล์นี้: ตั้งที่ Project Settings → Script properties → TEACHER_KEY
//
// แท็บใน Sheet
//   Submissions : แถวที่ใบงานส่ง [timestamp, level, week, title, room, names, lang, score, wrong, exact, chosen, hesCard, reason, JSON, fr, round, members]
//   Roster      : room | nickname | active | order
//   Unlocks     : room | activityId | open      (room ใส่ Y3.2 = ห้องเดียว, Y3 = ทั้งชั้น, * = ทุกห้อง · ห้องเดียวชนะชั้น ชั้นชนะ *)
//   Drafts      : room | nickname | activityId | json | updatedAt   (งานที่ทำค้าง 1 แถวต่อคนต่อกิจกรรม · ส่งงานแล้วลบ)
// กิจกรรมที่ไม่มีแถวใน Unlocks = ปิด
//
// นักเรียน (ไม่ต้องใช้ key)
//   GET  ?action=roster&room=Y3.2             → { ok, names: [...] }
//   GET  ?action=state&room=Y3.2&name=ขิม     → { ok, open: {actId: true}, status: {actId: 'done'}, rounds: {actId: n}, drafts: {actId: updatedAt} }
//   GET  ?action=draft&room=..&name=..&act=..  → { ok, draft: { data, updatedAt } | null }
//   GET  ?action=last&room=..&name=..&act=..   → { ok, last: { data, time, members } | null }   ← งานที่ส่งล่าสุด (ให้เด็กดูงานตัวเอง)
//   POST {action:'draft', room, act, members:[...], data:{...}}   ← บันทึกงานค้างให้ทุกคนใน members
//   POST {action:'submit', row:[15 ช่อง], members:[...]}          ← ส่งงาน แล้วลบงานค้างของทุกคนใน members
// ครู (ทุก action ต้องมี key ตรงกับ TEACHER_KEY · key ผิด = { ok:false, error:'key' } / POST ไม่ทำอะไร)
//   GET  ?action=whoami&key=..                     → { ok }   ← ตรวจรหัสตอนเข้ามุมครู
//   GET  ?action=dashboard&key=..&room=Y3.2        → { ok, roster: [{name, active}], open: {actId: true}, subs: [{act, members, score, round, time}], drafts: [{name, act, updatedAt}] }
//   GET  ?action=submissions&key=..&room=..&act=.. → { ok, rows: [{time, members, score, lang, data}] }   ← แชร์ผลงาน/เปิดดูงาน
//   POST {action:'setUnlock', key, rooms:[...], acts:{actId: true/false}}   ← เขียนแถวรายห้องในแท็บ Unlocks (มีแถวเดิมก็แก้ทับ)
//   POST {action:'roster', key, room, op:'add', names:[...]}               ← เพิ่มชื่อ (มีอยู่แล้วแต่ซ่อน = แสดงกลับ)
//   POST {action:'roster', key, room, op:'active', name, active:true/false} ← แสดง/ซ่อนชื่อ
//   POST {action:'roster', key, room, op:'rename', from, to}               ← แก้ชื่อ แล้วงานที่ส่ง/งานค้างในห้องนั้นตามไปชื่อใหม่
// ของเดิม (ยังใช้ได้)
//   POST {row:[15 ช่อง]}                        ← ใบงานไฟล์เก่า
//   GET  ?key=..&level=Y3&week=1                → { rows: [...] }  ← หน้าแชร์ผลงานเดิม

const TAB = { sub: 'Submissions', roster: 'Roster', unlocks: 'Unlocks', drafts: 'Drafts' };
const HEAD = {
  Roster: ['room', 'nickname', 'active', 'order'],
  Unlocks: ['room', 'activityId', 'open'],
  Drafts: ['room', 'nickname', 'activityId', 'json', 'updatedAt']
};
const COL = { room: 4, names: 5, lang: 6, score: 7, json: 13, round: 15, members: 16 };   // index ในแถว Submissions (เริ่ม 0)

const TEACHER_GET = {
  whoami: () => ({}),
  dashboard: p => dashboard_(p.room),
  submissions: p => ({ rows: submissions_(p.room, p.act) })
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (TEACHER_GET[p.action]) {
      if (!checkKey_(p.key)) return json_({ ok: false, error: 'key' });
      return json_(Object.assign({ ok: true }, TEACHER_GET[p.action](p)));
    }
    if (p.action === 'roster') return json_({ ok: true, names: roster_(p.room) });
    if (p.action === 'state') return json_(Object.assign({ ok: true }, state_(p.room, p.name)));
    if (p.action === 'draft') return json_({ ok: true, draft: getDraft_(p.room, p.name, p.act) });
    if (p.action === 'last') return json_({ ok: true, last: lastSubmission_(p.room, p.name, p.act) });
    if (!p.action && p.key !== undefined) return legacyShare_(p);
    return json_({ ok: false, error: 'action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === 'draft') { saveDraft_(body); return ContentService.createTextOutput('ok'); }
    if (body.action === 'setUnlock' || body.action === 'roster') {
      if (!checkKey_(body.key)) return ContentService.createTextOutput('key');
      if (body.action === 'setUnlock') setUnlock_(body); else rosterOp_(body);
      return ContentService.createTextOutput('ok');
    }
    if (!Array.isArray(body.row)) return ContentService.createTextOutput('bad');
    const members = Array.isArray(body.members) && body.members.length
      ? body.members.map(String)
      : splitNames_(body.row[COL.names - 1]);
    subSheet_().appendRow([new Date()].concat(body.row, [JSON.stringify(members)]));
    const d = parseJson_(body.row[COL.json - 1]);
    if (d && d.act) deleteDrafts_(String(body.row[COL.room - 1]), members, d.act);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

// ---------- นักเรียน ----------
function roster_(room) {
  return rosterAll_(room).filter(x => x.active).map(x => x.name);
}

// ทุกชื่อของห้อง รวมที่ซ่อน เรียงตาม order (ไม่ใส่ order = ต่อท้าย)
function rosterAll_(room) {
  if (!room) throw new Error('room');
  return rows_(TAB.roster)
    .filter(r => String(r[0]).trim() === room && String(r[1]).trim())
    .map((r, i) => ({ name: String(r[1]).trim(), active: !isOff_(r[2]), order: r[3] === '' ? 1e6 + i : Number(r[3]) }))
    .sort((a, b) => a.order - b.order)
    .map(x => ({ name: x.name, active: x.active }));
}

function state_(room, name) {
  if (!room || !name) throw new Error('room/name');
  const open = openFor_(room);
  const status = {}, rounds = {};
  const me = nameKey_(name);
  subSheet_().getDataRange().getValues().forEach(r => {
    if (String(r[COL.room]) !== room) return;
    const d = parseJson_(r[COL.json]);
    if (!d || !d.act) return;
    if (!membersOf_(r).some(n => nameKey_(n) === me)) return;
    status[d.act] = 'done';
    rounds[d.act] = Math.max(rounds[d.act] || 0, Number(d.round || r[COL.round]) || 1);
  });
  const drafts = {};
  rows_(TAB.drafts).forEach(r => {
    if (String(r[0]) === room && nameKey_(r[1]) === me && r[2]) drafts[String(r[2])] = iso_(r[4]);
  });
  return { open, status, rounds, drafts };
}

// แถวล่าสุดของกิจกรรมนี้ที่มีชื่อเด็กอยู่ใน members (แถวต่อท้ายตามเวลา จึงเอาแถวสุดท้ายที่ตรง)
function lastSubmission_(room, name, act) {
  if (!room || !name || !act) throw new Error('room/name/act');
  const me = nameKey_(name);
  let last = null;
  subSheet_().getDataRange().getValues().forEach(r => {
    if (String(r[COL.room]) !== room) return;
    const d = parseJson_(r[COL.json]);
    if (!d || d.act !== act) return;
    const list = membersOf_(r);
    if (list.some(n => nameKey_(n) === me)) last = { data: d, time: iso_(r[0]), members: list };
  });
  return last;
}

// ---------- งานที่ทำค้าง ----------
function getDraft_(room, name, act) {
  if (!room || !name || !act) throw new Error('room/name/act');
  const me = nameKey_(name);
  const r = rows_(TAB.drafts).find(r => String(r[0]) === room && nameKey_(r[1]) === me && String(r[2]) === act);
  return r ? { data: parseJson_(r[3]), updatedAt: iso_(r[4]) } : null;
}

// บันทึกทับแถวเดิมของแต่ละคน (ทำคู่ = บันทึกให้ทั้งคู่ เพื่อนเปิดทำต่อจากเครื่องตัวเองได้)
function saveDraft_(b) {
  const room = String(b.room || ''), act = String(b.act || '');
  const members = (Array.isArray(b.members) ? b.members : []).map(String).filter(String);
  if (!room || !act || !members.length) return;
  const sh = tab_(TAB.drafts), v = sh.getDataRange().getValues(), now = new Date(), json = JSON.stringify(b.data || {});
  members.forEach(name => {
    const k = nameKey_(name);
    const i = v.findIndex((r, n) => n > 0 && String(r[0]) === room && nameKey_(r[1]) === k && String(r[2]) === act);
    if (i > 0) sh.getRange(i + 1, 4, 1, 2).setValues([[json, now]]);
    else { sh.appendRow([room, name, act, json, now]); v.push([room, name, act, json, now]); }
  });
}

function deleteDrafts_(room, members, act) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.drafts);
  if (!sh) return;
  const keys = members.map(nameKey_), v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--)
    if (String(v[i][0]) === room && String(v[i][2]) === act && keys.indexOf(nameKey_(v[i][1])) >= 0) sh.deleteRow(i + 1);
}

function openFor_(room) {
  const level = room.split('.')[0];
  const rank = { '*': 1 }; rank[level] = 2; rank[room] = 3;
  const best = {};
  rows_(TAB.unlocks).forEach(r => {
    const who = String(r[0]).trim(), id = String(r[1]).trim();
    const k = rank[who];
    if (!k || !id) return;
    if (!best[id] || k >= best[id].k) best[id] = { k, on: isOn_(r[2]) };
  });
  const open = {};
  Object.keys(best).forEach(id => { if (best[id].on) open[id] = true; });
  return open;
}

// ---------- ครู ----------
function dashboard_(room) {
  if (!room) throw new Error('room');
  const subs = [];
  subSheet_().getDataRange().getValues().forEach(r => {
    if (String(r[COL.room]) !== room) return;
    const d = parseJson_(r[COL.json]);
    if (!d || !d.act) return;
    subs.push({ act: d.act, members: membersOf_(r), score: String(r[COL.score]), round: Number(d.round || r[COL.round]) || 1, time: iso_(r[0]) });
  });
  const drafts = rows_(TAB.drafts).filter(r => String(r[0]) === room && r[2])
    .map(r => ({ name: String(r[1]), act: String(r[2]), updatedAt: iso_(r[4]) }));
  return { roster: rosterAll_(room), open: openFor_(room), subs, drafts };
}

function submissions_(room, act) {
  if (!room || !act) throw new Error('room/act');
  const rows = [];
  subSheet_().getDataRange().getValues().forEach(r => {
    if (String(r[COL.room]) !== room) return;
    const d = parseJson_(r[COL.json]);
    if (d && d.act === act) rows.push({ time: iso_(r[0]), members: membersOf_(r), score: String(r[COL.score]), lang: String(r[COL.lang]), data: d });
  });
  return rows;
}

// แถวรายห้องชนะแถวชั้น/* อยู่แล้ว จึง "ใช้กับทุกห้องในชั้น" = เขียนแถวให้ทุกห้อง
function setUnlock_(b) {
  const rooms = (Array.isArray(b.rooms) ? b.rooms : []).map(x => String(x).trim()).filter(String);
  const acts = b.acts && typeof b.acts === 'object' ? b.acts : {};
  const sh = tab_(TAB.unlocks), v = sh.getDataRange().getValues();
  rooms.forEach(room => Object.keys(acts).forEach(id => {
    const on = acts[id] === true;
    const i = v.findIndex((r, n) => n > 0 && String(r[0]).trim() === room && String(r[1]).trim() === id);
    if (i > 0) { sh.getRange(i + 1, 3, 1, 1).setValues([[on]]); v[i][2] = on; }
    else { sh.appendRow([room, id, on]); v.push([room, id, on]); }
  }));
}

function rosterOp_(b) {
  const room = String(b.room || '').trim();
  if (!room) return;
  const sh = tab_(TAB.roster), v = sh.getDataRange().getValues();
  const find = name => v.findIndex((r, n) => n > 0 && String(r[0]).trim() === room && nameKey_(r[1]) === nameKey_(name));
  if (b.op === 'add') {
    // ชื่อใหม่ต่อท้ายเสมอ: ถ้าห้องนี้มีแถวที่ไม่ใส่ order (เรียงตามแถว) ก็เว้น order ไว้เหมือนกัน
    const mine = v.filter((r, n) => n > 0 && String(r[0]).trim() === room);
    const blank = mine.some(r => r[3] === '' || r[3] === undefined || isNaN(r[3]));
    let order = mine.reduce((m, r) => blank ? m : Math.max(m, Number(r[3])), 0);
    (Array.isArray(b.names) ? b.names : []).map(cleanName_).filter(String).forEach(name => {
      const i = find(name);
      if (i > 0) { if (isOff_(v[i][2])) { sh.getRange(i + 1, 3, 1, 1).setValues([[true]]); v[i][2] = true; } return; }
      const row = [room, name, true, blank ? '' : ++order];
      sh.appendRow(row); v.push(row);
    });
  } else if (b.op === 'active') {
    const i = find(b.name);
    if (i > 0) sh.getRange(i + 1, 3, 1, 1).setValues([[b.active === true]]);
  } else if (b.op === 'rename') {
    const from = String(b.from || '').trim(), to = cleanName_(b.to), i = find(from), j = find(to);
    if (i < 1 || !to || (j > 0 && j !== i)) return;   // ไม่มีชื่อเดิม หรือชื่อใหม่ซ้ำคนอื่นในห้อง
    sh.getRange(i + 1, 2, 1, 1).setValues([[to]]);
    renameWork_(room, from, to);
  }
}

// งานที่ส่งแล้ว (ชื่อ + members) และงานค้าง (ชื่อ + เพื่อนคู่ที่จำไว้ในงานค้าง) ของห้องนี้ ตามไปชื่อใหม่
function renameWork_(room, from, to) {
  const k = nameKey_(from), swap = n => nameKey_(n) === k ? to : n;
  const sub = subSheet_();
  sub.getDataRange().getValues().forEach((r, n) => {
    if (n === 0 || String(r[COL.room]) !== room || !membersOf_(r).some(x => nameKey_(x) === k)) return;
    const names = splitNames_(r[COL.names]);
    if (names.some(x => nameKey_(x) === k)) sub.getRange(n + 1, COL.names + 1, 1, 1).setValues([[names.map(swap).join(' + ')]]);
    const who = r[COL.members] ? parseJson_(r[COL.members]) : null;
    if (Array.isArray(who)) sub.getRange(n + 1, COL.members + 1, 1, 1).setValues([[JSON.stringify(who.map(swap))]]);
  });
  const dr = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.drafts);
  if (!dr) return;
  dr.getDataRange().getValues().forEach((r, n) => {
    if (n === 0 || String(r[0]) !== room) return;
    if (nameKey_(r[1]) === k) dr.getRange(n + 1, 2, 1, 1).setValues([[to]]);
    const d = parseJson_(r[3]);
    if (d && d.partner && nameKey_(d.partner) === k) { d.partner = to; dr.getRange(n + 1, 4, 1, 1).setValues([[JSON.stringify(d)]]); }
  });
}

// ---------- ของเดิม: หน้าแชร์ผลงาน ----------
function legacyShare_(p) {
  if (!checkKey_(p.key)) return json_({ error: 'key' });
  const rows = subSheet_().getDataRange().getValues()
    .filter(r => String(r[1]) === p.level && String(r[2]) === String(p.week))
    .map(r => ({ time: r[0], room: r[4], names: r[5], lang: r[6], score: r[7], data: r[13] }));
  return json_({ rows });
}

function checkKey_(key) {
  const real = PropertiesService.getScriptProperties().getProperty('TEACHER_KEY');
  return !!real && String(key || '') === real;
}

// ---------- ตัวช่วย ----------
function subSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TAB.sub) || ss.getSheets()[0];
}

function tab_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || makeTab_(ss, name);
}

// ข้ามแถวหัวตาราง (แถวแรก)
function rows_(tab) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  return v.slice(1);
}

// แถวใหม่มีคอลัมน์ members (JSON) · แถวเก่าใช้ชื่อ "ขิม + กาย"
function membersOf_(r) {
  const who = r[COL.members] ? parseJson_(r[COL.members]) : null;
  return Array.isArray(who) ? who.map(String) : splitNames_(r[COL.names]);
}
function cleanName_(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40); }
function splitNames_(s) {
  return String(s || '').split('+').map(x => x.trim()).filter(String);
}
// ใบงานเก่าให้เด็กพิมพ์ชื่อเอง ("yuki", "Loukpear") จึงเทียบชื่อแบบไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่าง
function nameKey_(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
function parseJson_(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function isOn_(v) { return v === true || /^(true|1|yes|on|เปิด)$/i.test(String(v).trim()); }
function isOff_(v) { return v === false || /^(false|0|no|off|ซ่อน|ปิด)$/i.test(String(v).trim()); }

function iso_(d) { return d instanceof Date ? d.toISOString() : String(d || ''); }

function makeTab_(ss, name) {
  const sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// กด Run ครั้งเดียวจากหน้า Apps Script: สร้างแท็บ Roster / Unlocks / Drafts พร้อมหัวตาราง (ถ้ายังไม่มี)
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEAD).forEach(name => { if (!ss.getSheetByName(name)) makeTab_(ss, name); });
  if (!ss.getSheetByName(TAB.sub)) Logger.log('ยังไม่มีแท็บ Submissions: เปลี่ยนชื่อแท็บที่รับงานอยู่เป็น Submissions');
  if (!PropertiesService.getScriptProperties().getProperty('TEACHER_KEY')) Logger.log('ยังไม่ได้ตั้ง TEACHER_KEY ใน Script properties');
}
