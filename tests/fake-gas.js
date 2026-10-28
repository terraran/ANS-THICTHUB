// Sheet + Apps Script จำลอง: รัน apps-script/Code.gs จริงใน vm (ไม่ต่อ Google)
// ใช้ทั้งเทสต์ Script (apps-script.test.js) และ API จำลองของมุมครูใน Playwright (teacher.spec.js)
// tabs = { ชื่อแท็บ: [[หัวตาราง], [แถว], ...] } · แก้ tabs ตรง ๆ = แก้ Sheet
const fs = require('fs'), path = require('path'), vm = require('vm');

module.exports = function load(tabs, props = {}) {
  const sheet = name => ({
    getDataRange: () => ({ getValues: () => tabs[name].map(r => r.slice()) }),
    appendRow: r => tabs[name].push(r),
    getRange: (r, c) => ({ setValues: v => { v[0].forEach((x, i) => { tabs[name][r - 1][c - 1 + i] = x; }); return { setFontWeight() {} }; } }),
    deleteRow: i => tabs[name].splice(i - 1, 1),
    setFrozenRows() {}
  });
  const ss = {
    getSheetByName: n => tabs[n] ? sheet(n) : null,
    getSheets: () => [sheet(Object.keys(tabs)[0])],
    insertSheet: n => { tabs[n] = [[]]; return sheet(n); }
  };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    Logger: { log() {} }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8'), ctx);
  ctx.get = p => JSON.parse(ctx.doGet({ parameter: p }).s);
  ctx.post = b => ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s;
  return ctx;
};
