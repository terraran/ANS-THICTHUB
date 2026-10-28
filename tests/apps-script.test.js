// ทดสอบ apps-script/Code.gs ด้วย Sheet จำลอง (ไม่ต่อ Google): node tests/apps-script.test.js
const assert = require('assert');
const load = require('./fake-gas');
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

// ชื่อที่เด็กพิมพ์เองในใบงานเก่า: ไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่าง
tabs.Submissions.push([new Date()].concat(row('y3w1', 'Y3.4', 'Loukpear + yuki ')));
for (const n of ['LOUK PEAR', 'YUKI']) assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.4', name: n }).status, { y3w1: 'done' }, n);
assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.4', name: 'YUK' }).status, {});

// งานที่ทำค้าง: แท็บ Drafts สร้างเองถ้ายังไม่มี · ทำคู่บันทึกให้ทั้งคู่ · บันทึกซ้ำ = ทับแถวเดิม
assert.strictEqual(S.get({ action: 'draft', room: 'Y3.2', name: 'ขิม', act: 'y3w1' }).draft, null);
S.post({ action: 'draft', room: 'Y3.2', act: 'y3w1', members: ['ขิม', 'กาย'], data: { step: 2 } });
S.post({ action: 'draft', room: 'Y3.2', act: 'y3w1', members: ['ขิม', 'กาย'], data: { step: 3 } });
assert.deepStrictEqual(tabs.Drafts[0], ['room', 'nickname', 'activityId', 'json', 'updatedAt']);
assert.strictEqual(tabs.Drafts.length, 3);
assert.deepStrictEqual(S.get({ action: 'draft', room: 'Y3.2', name: 'กาย', act: 'y3w1' }).draft.data, { step: 3 });
assert.deepStrictEqual(Object.keys(S.get({ action: 'state', room: 'Y3.2', name: 'ขิม' }).drafts), ['y3w1']);
S.post({ action: 'draft', room: 'Y3.2', act: 'y4w1', members: ['ท้าย'], data: { step: 1 } });
// ส่งงานแล้ว งานค้างของทั้งคู่ (กิจกรรมนั้น) หายไป ของคนอื่นยังอยู่
S.post({ action: 'submit', row: row('y3w1', 'Y3.2', 'ขิม + กาย', 3), members: ['ขิม', 'กาย'] });
assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.2', name: 'กาย' }).drafts, {});
assert.strictEqual(tabs.Drafts.length, 2);
assert.strictEqual(S.get({ action: 'state', room: 'Y3.2', name: 'กาย' }).rounds.y3w1, 3);

// งานที่ส่งล่าสุด: แถวสุดท้ายที่มีชื่อเด็ก (ไม่สนตัวพิมพ์) · ไม่มี = null
assert.strictEqual(S.get({ action: 'last', room: 'Y3.2', name: 'กาย', act: 'y3w1' }).last.data.round, 3);
assert.deepStrictEqual(S.get({ action: 'last', room: 'Y3.2', name: 'กาย', act: 'y3w1' }).last.members, ['ขิม', 'กาย']);
assert.strictEqual(S.get({ action: 'last', room: 'Y3.4', name: 'YUKI', act: 'y3w1' }).last.data.act, 'y3w1');
assert.strictEqual(S.get({ action: 'last', room: 'Y3.2', name: 'ท้าย', act: 'y3w1' }).last, null);

// หน้าแชร์เดิม
assert.deepStrictEqual(S.get({ key: 'wrong', level: 'Y3', week: '1' }), { error: 'key' });
assert.strictEqual(S.get({ key: 'secret', level: 'Y3', week: '1' }).rows.length, 5);
assert.deepStrictEqual(load(tabs).get({ key: '', level: 'Y3', week: '1' }), { error: 'key' }, 'no key set → locked');
assert.strictEqual(S.get({ action: 'roster' }).ok, false);

// ---------- มุมครู: ทุก action ต้องมีรหัส ----------
for (const action of ['whoami', 'dashboard', 'submissions'])
  for (const key of [undefined, '', 'wrong']) assert.deepStrictEqual(S.get({ action, key, room: 'Y3.2', act: 'y3w1' }), { ok: false, error: 'key' }, action + key);
assert.deepStrictEqual(load(tabs).get({ action: 'whoami', key: '' }), { ok: false, error: 'key' }, 'no TEACHER_KEY → locked');
assert.deepStrictEqual(S.get({ action: 'whoami', key: 'secret' }), { ok: true });

let db = S.get({ action: 'dashboard', key: 'secret', room: 'Y3.2' });
assert.deepStrictEqual(db.roster, [{ name: 'กาย', active: true }, { name: 'ขิม', active: true }, { name: 'ซ่อนไว้', active: false }, { name: 'ท้าย', active: true }]);
assert.deepStrictEqual(db.open, { y3w1: true });
assert.deepStrictEqual(db.subs.map(s => [s.act, s.members, s.score, s.round]),
  [['y3w1', ['ขิม', 'กาย'], '10/16', 1], ['y3w1', ['ขิม'], '10/16', 2], ['y3w1', ['ขิม', 'กาย'], '10/16', 3]]);
assert.deepStrictEqual(db.drafts.map(d => [d.name, d.act]), [['ท้าย', 'y4w1']]);
let subs = S.get({ action: 'submissions', key: 'secret', room: 'Y3.2', act: 'y3w1' }).rows;
assert.strictEqual(subs.length, 3);
assert.deepStrictEqual([subs[2].data.round, subs[2].lang, subs[2].members], [3, 'TH', ['ขิม', 'กาย']]);
assert.strictEqual(S.get({ action: 'submissions', key: 'secret', room: 'Y3.2', act: 'y4w1' }).rows.length, 0);

// เปิด/ปิด: รหัสผิด = ไม่เขียน · เขียนแถวรายห้อง (แก้แถวเดิม ไม่ซ้ำ) · ใช้กับทุกห้องในชั้น
const nUnlock = tabs.Unlocks.length;
assert.strictEqual(S.post({ action: 'setUnlock', key: 'wrong', rooms: ['Y3.2'], acts: { y3w2: true } }), 'key');
assert.strictEqual(tabs.Unlocks.length, nUnlock);
S.post({ action: 'setUnlock', key: 'secret', rooms: ['Y3.2'], acts: { adventure: true, y3w1: false } });
assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.2', name: 'ขิม' }).open, { adventure: true });
assert.strictEqual(tabs.Unlocks.length, nUnlock + 1, 'adventure row reused, y3w1 row added');
S.post({ action: 'setUnlock', key: 'secret', rooms: ['Y3.1', 'Y3.2', 'Y3.3', 'Y3.4'], acts: { adventure: true, y3w1: true, y3w2: false } });
for (const r of ['Y3.1', 'Y3.3']) assert.deepStrictEqual(S.get({ action: 'dashboard', key: 'secret', room: r }).open, r === 'Y3.1' ? { adventure: true, y3w1: true, popup60: true } : { adventure: true, y3w1: true }, r);
assert.strictEqual(tabs.Unlocks.filter(r => r[0] === 'Y3.2' && r[1] === 'y3w1').length, 1);

// รายชื่อ: เพิ่มหลายชื่อ (ซ้ำ = ข้าม, ซ้ำแต่ซ่อน = แสดงกลับ, ช่องว่างเกินถูกตัด) · ซ่อน · แสดง
assert.strictEqual(S.post({ action: 'roster', key: 'wrong', room: 'Y3.2', op: 'add', names: ['แอบ'] }), 'key');
S.post({ action: 'roster', key: 'secret', room: 'Y3.2', op: 'add', names: ['  มายด์   ก ', 'ขิม', 'ซ่อนไว้', '', 'จีน'] });
assert.deepStrictEqual(S.get({ action: 'roster', room: 'Y3.2' }).names, ['กาย', 'ขิม', 'ซ่อนไว้', 'มายด์ ก', 'จีน', 'ท้าย']);
S.post({ action: 'roster', key: 'secret', room: 'Y3.2', op: 'active', name: 'จีน', active: false });
assert.ok(!S.get({ action: 'roster', room: 'Y3.2' }).names.includes('จีน'));
assert.deepStrictEqual(S.get({ action: 'dashboard', key: 'secret', room: 'Y3.2' }).roster.find(x => x.name === 'จีน'), { name: 'จีน', active: false });
S.post({ action: 'roster', key: 'secret', room: 'Y3.2', op: 'active', name: 'จีน', active: true });
assert.ok(S.get({ action: 'roster', room: 'Y3.2' }).names.includes('จีน'));
S.post({ action: 'roster', key: 'secret', room: 'Y3.1', op: 'add', names: ['ขิม'] });
assert.deepStrictEqual(S.get({ action: 'roster', room: 'Y3.1' }).names, ['ขิม', 'อื่น'], 'same name in another room is fine');

// แก้ชื่อ: งานที่ส่ง (ทั้งแถวเก่าที่มีแต่ชื่อ และแถวที่มี members) + งานค้าง + เพื่อนคู่ในงานค้าง ตามไปชื่อใหม่ · ห้องอื่นไม่เปลี่ยน
S.post({ action: 'draft', room: 'Y3.2', act: 'y3w2', members: ['ขิม', 'ท้าย'], data: { step: 1, partner: 'ท้าย' } });
S.post({ action: 'draft', room: 'Y3.1', act: 'y3w2', members: ['ขิม'], data: { step: 1 } });
S.post({ action: 'roster', key: 'secret', room: 'Y3.2', op: 'rename', from: 'ขิม', to: 'กาย' });   // ซ้ำคนอื่น = ไม่ทำ
assert.ok(S.get({ action: 'roster', room: 'Y3.2' }).names.includes('ขิม'));
S.post({ action: 'roster', key: 'secret', room: 'Y3.2', op: 'rename', from: 'ขิม', to: 'ขิม ก' });
S.post({ action: 'roster', key: 'secret', room: 'Y3.2', op: 'rename', from: 'ท้าย', to: 'ท้ายสุด' });
assert.deepStrictEqual(S.get({ action: 'roster', room: 'Y3.2' }).names, ['กาย', 'ขิม ก', 'ซ่อนไว้', 'มายด์ ก', 'จีน', 'ท้ายสุด']);
st = S.get({ action: 'state', room: 'Y3.2', name: 'ขิม ก' });
assert.deepStrictEqual([st.status, st.rounds, Object.keys(st.drafts)], [{ y3w1: 'done' }, { y3w1: 3 }, ['y3w2']]);
assert.deepStrictEqual(S.get({ action: 'state', room: 'Y3.2', name: 'ขิม' }).status, {});
assert.strictEqual(tabs.Submissions[1][5], 'ขิม ก + กาย');
assert.deepStrictEqual(S.get({ action: 'last', room: 'Y3.2', name: 'กาย', act: 'y3w1' }).last.members, ['ขิม ก', 'กาย']);
assert.deepStrictEqual(S.get({ action: 'draft', room: 'Y3.2', name: 'ขิม ก', act: 'y3w2' }).draft.data, { step: 1, partner: 'ท้ายสุด' });
assert.ok(S.get({ action: 'draft', room: 'Y3.1', name: 'ขิม', act: 'y3w2' }).draft, 'other room untouched');
assert.strictEqual(tabs.Submissions.find(r => r[4] === 'Y3.4')[5], 'Loukpear + yuki ');
// แก้แค่ตัวพิมพ์/ช่องว่างของชื่อตัวเองได้
S.post({ action: 'roster', key: 'secret', room: 'Y3.4', op: 'add', names: ['yuki'] });
S.post({ action: 'roster', key: 'secret', room: 'Y3.4', op: 'rename', from: 'yuki', to: 'Yuki' });
assert.deepStrictEqual(S.get({ action: 'roster', room: 'Y3.4' }).names, ['Yuki']);
// แท็บ Unlocks/Roster ยังไม่มี → สร้างเอง
const fresh = { Submissions: [['time']] }, F = load(fresh, { TEACHER_KEY: 'k' });
F.post({ action: 'setUnlock', key: 'k', rooms: ['Y4.1'], acts: { y4w1: true } });
F.post({ action: 'roster', key: 'k', room: 'Y4.1', op: 'add', names: ['เอ', 'บี'] });
assert.deepStrictEqual(JSON.parse(JSON.stringify([fresh.Unlocks, fresh.Roster.slice(1)])),[[['room', 'activityId', 'open'], ['Y4.1', 'y4w1', true]], [['Y4.1', 'เอ', true, 1], ['Y4.1', 'บี', true, 2]]]);
console.log('apps-script tests: ok');
