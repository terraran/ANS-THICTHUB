// ANS ICT Hub · Apps Script (ผูกกับ Google Sheet ของครู) · Phase 1
// วางทับโค้ดเดิมทั้งไฟล์ → Deploy → Manage deployments → แก้ไข → Version: New version (URL เดิม)
//
// รหัสครูไม่อยู่ในไฟล์นี้: ตั้งที่ Project Settings → Script properties → TEACHER_KEY
//
// แท็บใน Sheet
//   Submissions : แถวที่ใบงานส่ง [timestamp, level, week, title, room, names, lang, score, wrong, exact, chosen, hesCard, reason, JSON, fr, round, members]
//   Roster      : room | nickname | active | order
//   Unlocks     : room | activityId | open      (room ใส่ Y3.2 = ห้องเดียว, Y3 = ทั้งชั้น, * = ทุกห้อง · ห้องเดียวชนะชั้น ชั้นชนะ *)
// กิจกรรมที่ไม่มีแถวใน Unlocks = ปิด
//
// นักเรียน (ไม่ต้องใช้ key)
//   GET  ?action=roster&room=Y3.2             → { ok, names: [...] }
//   GET  ?action=state&room=Y3.2&name=ขิม     → { ok, open: {actId: true}, status: {actId: 'done'}, rounds: {actId: n} }
//   POST {action:'submit', row:[15 ช่อง], members:[...]}
// ของเดิม (ยังใช้ได้)
//   POST {row:[15 ช่อง]}                        ← ใบงานไฟล์เก่า
//   GET  ?key=..&level=Y3&week=1                → { rows: [...] }  ← หน้าแชร์ผลงานเดิม

const TAB = { sub: 'Submissions', roster: 'Roster', unlocks: 'Unlocks' };
const HEAD = {
  Roster: ['room', 'nickname', 'active', 'order'],
  Unlocks: ['room', 'activityId', 'open']
};
const COL = { room: 4, names: 5, json: 13, round: 15, members: 16 };   // index ในแถว Submissions (เริ่ม 0)

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'roster') return json_({ ok: true, names: roster_(p.room) });
    if (p.action === 'state') return json_(Object.assign({ ok: true }, state_(p.room, p.name)));
    if (!p.action && p.key !== undefined) return legacyShare_(p);
    return json_({ ok: false, error: 'action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (!Array.isArray(body.row)) return ContentService.createTextOutput('bad');
  const members = Array.isArray(body.members) && body.members.length
    ? body.members.map(String)
    : splitNames_(body.row[COL.names - 1]);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    subSheet_().appendRow([new Date()].concat(body.row, [JSON.stringify(members)]));
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
  subSheet_().getDataRange().getValues().forEach(r => {
    if (String(r[COL.room]) !== room) return;
    const d = parseJson_(r[COL.json]);
    if (!d || !d.act) return;
    const who = r[COL.members] ? parseJson_(r[COL.members]) : null;
    const list = Array.isArray(who) ? who : splitNames_(r[COL.names]);
    if (list.indexOf(name) < 0) return;
    status[d.act] = 'done';
    rounds[d.act] = Math.max(rounds[d.act] || 0, Number(d.round || r[COL.round]) || 1);
  });
  return { open, status, rounds };
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
function parseJson_(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function isOn_(v) { return v === true || /^(true|1|yes|on|เปิด)$/i.test(String(v).trim()); }
function isOff_(v) { return v === false || /^(false|0|no|off|ซ่อน|ปิด)$/i.test(String(v).trim()); }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// กด Run ครั้งเดียวจากหน้า Apps Script: สร้างแท็บ Roster / Unlocks พร้อมหัวตาราง (ถ้ายังไม่มี)
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEAD).forEach(name => {
    if (ss.getSheetByName(name)) return;
    const sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  if (!ss.getSheetByName(TAB.sub)) Logger.log('ยังไม่มีแท็บ Submissions: เปลี่ยนชื่อแท็บที่รับงานอยู่เป็น Submissions');
  if (!PropertiesService.getScriptProperties().getProperty('TEACHER_KEY')) Logger.log('ยังไม่ได้ตั้ง TEACHER_KEY ใน Script properties');
}
