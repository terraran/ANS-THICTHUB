// ANS ICT Hub · Apps Script (ผูกกับ Google Sheet ของครู) · Phase 2
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
// ของเดิม (ยังใช้ได้)
//   POST {row:[15 ช่อง]}                        ← ใบงานไฟล์เก่า
//   GET  ?key=..&level=Y3&week=1                → { rows: [...] }  ← หน้าแชร์ผลงานเดิม

const TAB = { sub: 'Submissions', roster: 'Roster', unlocks: 'Unlocks', drafts: 'Drafts' };
const HEAD = {
  Roster: ['room', 'nickname', 'active', 'order'],
  Unlocks: ['room', 'activityId', 'open'],
  Drafts: ['room', 'nickname', 'activityId', 'json', 'updatedAt']
};
const COL = { room: 4, names: 5, json: 13, round: 15, members: 16 };   // index ในแถว Submissions (เริ่ม 0)

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
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
  if (!room) throw new Error('room');
  return rows_(TAB.roster)
    .filter(r => String(r[0]).trim() === room && String(r[1]).trim() && !isOff_(r[2]))
    .map((r, i) => ({ name: String(r[1]).trim(), order: r[3] === '' ? 1e6 + i : Number(r[3]) }))
    .sort((a, b) => a.order - b.order)
    .map(x => x.name);
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
    const who = r[COL.members] ? parseJson_(r[COL.members]) : null;
    const list = Array.isArray(who) ? who : splitNames_(r[COL.names]);
    if (!list.some(n => nameKey_(n) === me)) return;
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
    const who = r[COL.members] ? parseJson_(r[COL.members]) : null;
    const list = Array.isArray(who) ? who : splitNames_(r[COL.names]);
    if (list.some(n => nameKey_(n) === me)) last = { data: d, time: iso_(r[0]), members: list };
  });
  return last;
}

// ---------- งานที่ทำค้าง ----------
function draftSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TAB.drafts) || makeTab_(ss, TAB.drafts);
}

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
  const sh = draftSheet_(), v = sh.getDataRange().getValues(), now = new Date(), json = JSON.stringify(b.data || {});
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

// ข้ามแถวหัวตาราง (แถวแรก)
function rows_(tab) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  return v.slice(1);
}

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
