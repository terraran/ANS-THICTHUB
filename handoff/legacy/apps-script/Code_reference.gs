// ⚠️ เวอร์ชันอ้างอิง (เขียนใหม่จากบันทึก) ของ Apps Script ที่ใช้อยู่ตอนนี้
// ตัวจริงอยู่ใน Google Sheet ของครู (Extensions → Apps Script) — ให้คัดลอกตัวจริงมาแทนไฟล์นี้ก่อนเริ่มแก้
// อย่า commit ค่า KEY จริงลง repo

const KEY = 'PUT_TEACHER_KEY_HERE';

// ใบงานส่งมาเป็น text/plain JSON: { row: [...] } (ดู SCOPE.md หัวข้อ 3.3)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sh.appendRow([new Date()].concat(body.row));
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// หน้าแชร์ผลงานของครู: ?key=..&level=Y3&week=1
function doGet(e) {
  const p = e.parameter || {};
  if (p.key !== KEY) return json({ error: 'key' });
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  const out = rows
    .filter(r => String(r[1]) === p.level && String(r[2]) === String(p.week))
    .map(r => ({ time: r[0], room: r[4], names: r[5], lang: r[6], score: r[7], data: r[13] }));
  return json(out);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
