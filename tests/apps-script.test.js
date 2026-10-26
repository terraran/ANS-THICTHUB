// ทดสอบ apps-script/Code.gs ด้วย Sheet จำลอง (ไม่ต่อ Google): node tests/apps-script.test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

function load(tabs, props = {}) {
  const sheet = name => ({
    getDataRange: () => ({ getValues: () => tabs[name] }),
    appendRow: r => tabs[name].push(r)
  });
  const ss = {
    getSheetByName: n => tabs[n] ? sheet(n) : null,
    getSheets: () => [sheet(Object.keys(tabs)[0])]
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
}
const row = (act, room, names, round = 1) => ['Y3', 1, 't', room, names, 'TH', '10/16', '-', '0/8', '', '', 'r', JSON.stringify({ v: 2, act, round }), '-', round];

const tabs = {
  Submissions: [['time', 'level']],
  Roster: [['room', 'nickname', 'active', 'order'], ['Y3.2', 'ขิม', '', 2], ['Y3.2', 'กาย', true, 1], ['Y3.2', 'ซ่อนไว้', false, 3], ['Y3.1', 'อื่น', '', ''], ['Y3.2', 'ท้าย', '', '']],
  Unlocks: [['room', 'activityId', 'open'], ['*', 'adventure', true], ['Y3', 'y3w1', true], ['Y3.2', 'adventure', false], ['Y3.1', 'popup60', true]]
};
const S = load(tabs, { TEACHER_KEY: 'secret' });

assert.deepStrictEqual(S.get({ action: 'roster', room: 'Y3.2' }).names, ['กาย', 'ขิม', 'ท้าย']);
let st = S.get({ action: 'state', room: 'Y3.2', name: 'ขิม' });
assert.deepStrictEqual(st.open, { y3w1: true }, 'room override closes adventure; popup60 only Y3.1');
assert.deepStrictEqual(st.status, {});

// ใบงานไฟล์เก่า (ไม่มี action) + ทำคู่แบบเดิม "ขิม + กาย"
assert.strictEqual(S.post({ row: row('y3w1', 'Y3.2', 'ขิม + กาย') }), 'ok');
assert.strictEqual(tabs.Submissions[1].length, 17);
assert.strictEqual(tabs.Submissions[1][16], '["ขิม","กาย"]');
// Hub ใหม่
S.post({ action: 'submit', row: row('y3w1', 'Y3.2', 'ขิม', 2), members: ['ขิม'] });
st = S.get({ action: 'state', room: 'Y3.2', name: 'กาย' });
assert.deepStrictEqual([st.status, st.rounds], [{ y3w1: 'done' }, { y3w1: 1 }]);
st = S.get({ action: 'state', room: 'Y3.2', name: 'ขิม' });
assert.deepStrictEqual(st.rounds, { y3w1: 2 });
assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.1', name: 'ขิม' }).status, {}, 'other room');
// แถวเก่าที่ไม่มีคอลัมน์ members
tabs.Submissions.push([new Date()].concat(row('y3w1', 'Y3.3', 'เก่า + เพื่อน')));
assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.3', name: 'เพื่อน' }).status, { y3w1: 'done' });

// หน้าแชร์เดิม
assert.deepStrictEqual(S.get({ key: 'wrong', level: 'Y3', week: '1' }), { error: 'key' });
assert.strictEqual(S.get({ key: 'secret', level: 'Y3', week: '1' }).rows.length, 3);
assert.deepStrictEqual(load(tabs).get({ key: '', level: 'Y3', week: '1' }), { error: 'key' }, 'no key set → locked');
assert.strictEqual(S.get({ action: 'roster' }).ok, false);
console.log('apps-script tests: ok');
