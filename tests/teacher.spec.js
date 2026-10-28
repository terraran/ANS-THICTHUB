// มุมครู: API จำลองรัน apps-script/Code.gs จริงบน Sheet จำลอง (tests/fake-gas.js) จึงเทสต์ทั้งหน้าเว็บและ Script ไปพร้อมกัน
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const load = require('./fake-gas');
const content = id => JSON.parse(fs.readFileSync(path.join(__dirname, '../worksheet/content', id + '.json'), 'utf8'));
const KEY = 'test-key';

// แถว Submissions 17 ช่อง · wrong = id การ์ดที่วางผิดกล่อง
function sub(act, room, members, { round = 1, wrong = [], fr = '', time, lang = 'TH' } = {}) {
  const C = content(act), place = {}, other = b => (C.bins ? C.bins.map(x => x.id) : ['a', 'b']).find(x => x !== b);
  C.cards.forEach(c => { place[c.id] = wrong.includes(c.id) ? other(c.bin) : c.bin; });
  const signs = {}; C.cards.filter(c => place[c.id] === 'b' && c.signs).forEach(c => { signs[c.id] = c.signs; });
  const data = { v: 3, act, round, place, signs, hes: C.cards[0].id, reason: 'เพราะดูจากสัญญาณ', fr, frq: 'คำถาม FoR ของใบงาน' };
  if (C.write) Object.assign(data, { map: C.map, write: { pick: '', f: Object.fromEntries(C.write.fields.map(f => [f.id, 'ตัวอย่าง ' + f.id])) } });
  const score = `${C.cards.length - wrong.length}/${C.cards.length}`;
  return [time || '2026-10-20T03:00:00.000Z', C.level, C.week, 't', room, members.join(' + '), lang, score, '-', '-', '-', '', data.reason, JSON.stringify(data), fr || '-', round, JSON.stringify(members)];
}
function seed() {
  return {
    Submissions: [['time']],
    Roster: [['room', 'nickname', 'active', 'order'], ['Y3.2', 'กาย', true, 1], ['Y3.2', 'ขิม', true, 2], ['Y3.2', 'จีน', true, 3], ['Y3.2', 'ชิน', true, 4], ['Y3.2', 'ซ่อนไว้', false, 5], ['Y3.1', 'อื่น', true, 1]],
    Unlocks: [['room', 'activityId', 'open'], ['Y3', 'y3w1', true], ['Y3.2', 'y3w2', true]],
    Drafts: [['room', 'nickname', 'activityId', 'json', 'updatedAt'], ['Y3.2', 'ชิน', 'y3w2', '{"v":1,"step":2}', '2026-10-21T03:00:00.000Z']]
  };
}
function withWork(tabs) {
  tabs.Submissions.push(
    sub('y3w1', 'Y3.2', ['ขิม'], { wrong: ['a1', 'b1'], time: '2026-10-20T03:00:00.000Z' }),
    sub('y3w1', 'Y3.2', ['กาย', 'จีน'], { fr: 'เรารู้เพราะครูสอน', time: '2026-10-20T03:05:00.000Z' }),
    sub('y3w1', 'Y3.2', ['ขิม'], { round: 2, fr: 'เรารู้เพราะดูคำว่าฟรี', time: '2026-10-20T03:10:00.000Z' }),
    sub('y3w2', 'Y3.2', ['ขิม'], { wrong: ['m1'], time: '2026-10-27T03:00:00.000Z' }),
    sub('y3w1', 'Y3.1', ['อื่น'], { wrong: ['a1'] }));
  return tabs;
}

function mockGas(page, tabs) {
  const S = load(tabs, { TEACHER_KEY: KEY }), log = { gets: [], posts: [] };
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  // html2canvas ตัวจำลอง (ไม่ต่อ cdnjs): คืน canvas ขนาดที่ขอ
  page.route('**/cdnjs.cloudflare.com/**', r => r.fulfill({ contentType: 'text/javascript',
    body: 'window.html2canvas=(el,o)=>{const c=document.createElement("canvas");c.width=o.width;c.height=o.height;return Promise.resolve(c)}' }));
  page.route('**/script.google.com/**', route => {
    const req = route.request();
    if (req.method() === 'POST') { const b = JSON.parse(req.postData()); log.posts.push(b); return route.fulfill({ body: S.post(b) }); }
    const p = Object.fromEntries(new URL(req.url()).searchParams); log.gets.push(p);
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(S.get(p)) });
  });
  return { S, log, tabs };
}
async function enter(page) {
  await page.goto('/teacher/');
  await page.fill('#key', KEY);
  await page.click('#enter');
  await expect(page.locator('#app')).toBeVisible();
}
const frame = (page, i = 0) => page.frameLocator('#vFrames iframe').nth(i);

test('มุมครู: รหัสผิดเข้าไม่ได้ · รหัสถูกเข้าได้ จำในแท็บนี้ (sessionStorage) ไม่จำใน localStorage · ออกแล้วต้องใส่ใหม่', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const { log } = mockGas(page, seed());
  await page.goto('/teacher/');
  await expect(page.locator('#login')).toBeVisible();
  await page.fill('#key', 'ผิด');
  await page.click('#enter');
  await expect(page.locator('#keyMsg')).toHaveText('รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง');
  await expect(page.locator('#app')).toBeHidden();
  await enter(page);
  expect(log.gets.some(p => p.action === 'whoami' && p.key === KEY)).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(KEY);
  expect(await page.evaluate(() => sessionStorage.getItem('ansHub.tkey'))).toBe(KEY);
  // เมนู 4 หัวข้อ + ห้องจาก levels.json
  await expect(page.locator('#tabs button')).toHaveText(['ตารางส่งงาน', 'เปิด/ปิดกิจกรรม', 'แชร์ผลงาน', 'รายชื่อนักเรียน']);
  await expect(page.locator('#rooms button')).toHaveCount(8);
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();     // รีเฟรชไม่ต้องใส่ใหม่
  await page.click('#logout');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/teacher/');
  await expect(page.locator('#login')).toBeVisible();
  // ทุกคำขอข้อมูลมีรหัส
  for (const p of log.gets) expect(p.key).toBeTruthy();
  expect(errs).toEqual([]);
});

test('มุมครู: Script เวอร์ชันเก่า (ไม่มี whoami) บอกให้ Deploy ใหม่', async ({ page }) => {
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  page.route('**/script.google.com/**', r => r.fulfill({ contentType: 'application/json', body: '{"ok":false,"error":"action"}' }));
  await page.goto('/teacher/');
  await page.fill('#key', 'x'); await page.click('#enter');
  await expect(page.locator('#keyMsg')).toContainText('Deploy แบบ New version');
});

test('ตารางส่งงาน: ค่าเริ่มต้น = สัปดาห์ล่าสุดที่เปิด · สรุปจำนวน · คะแนน · ทำคู่กับ · กดดูงาน', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  mockGas(page, withWork(seed()));
  await enter(page);
  await page.click('#rooms button:has-text("Y3.2")');
  await expect(page.locator('.picker [aria-pressed="true"]')).toContainText('สัปดาห์ 2');   // Y3.2 เปิดถึงสัปดาห์ 2
  await expect(page.locator('.sum .done b')).toHaveText('1');
  await expect(page.locator('.sum .doing b')).toHaveText('1');
  await expect(page.locator('.sum .todo b')).toHaveText('2');
  const row = n => page.locator('.grid tbody tr', { has: page.locator(`td:first-child:text-is("${n}")`) });
  await expect(page.locator('.grid tbody tr')).toHaveCount(4);                     // ชื่อที่ซ่อนไม่อยู่ในตาราง
  await expect(row('ขิม').locator('td').nth(1)).toHaveText('16/16 · รอบ 2');
  await expect(row('ขิม').locator('td').nth(2)).toHaveText('8/9');
  await expect(row('ชิน').locator('td').nth(2)).toHaveText('ทำค้าง');
  await expect(row('กาย').locator('td').nth(2)).toHaveText('ยังไม่เริ่ม');
  // เปลี่ยนเป็นสัปดาห์ 1 → ทำคู่กับ
  await page.click('.picker button:has-text("สัปดาห์ 1")');
  await expect(page.locator('.sum .done b')).toHaveText('3');
  await expect(row('กาย').locator('td.pair')).toHaveText('จีน');
  await expect(row('ขิม').locator('td.pair')).toHaveText('-');
  // กดคะแนน → เปิดหน้าใบงานจริงแบบดูอย่างเดียว · ดูรอบก่อนได้
  await row('ขิม').locator('button.chip').first().click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect(frame(page).locator('#result')).toHaveText('ถูก 16/16 ใบ');
  await expect(frame(page).locator('#meName')).toHaveText('ขิม');
  await expect(frame(page).locator('#edit')).toBeHidden();
  await expect(frame(page).locator('#toLib')).toBeHidden();
  await page.click('.vhead button:has-text("รอบ 1")');
  await expect(frame(page).locator('#result')).toHaveText('ถูก 14/16 ใบ');
  await expect(frame(page).locator('.cardx.bad')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).toBeHidden();
  // ห้องอื่น
  await page.click('#rooms button:has-text("Y3.1")');
  await expect(page.locator('.picker [aria-pressed="true"]')).toContainText('สัปดาห์ 1');
  await expect(page.locator('.grid tbody tr')).toHaveCount(1);
  expect(errs).toEqual([]);
});

test('เปิด/ปิดกิจกรรม: สวิตช์เขียนลง Unlocks แล้วโหลดใหม่มายืนยัน · ใช้กับทุกห้องในชั้นนี้', async ({ page }) => {
  const { S, log } = mockGas(page, seed());
  await enter(page);
  await page.click('#rooms button:has-text("Y3.2")');
  await page.click('#tabs button:has-text("เปิด/ปิดกิจกรรม")');
  const sw = id => page.locator(`.sw[data-act="${id}"]`);
  await expect(page.locator('.sw')).toHaveCount(3);                                  // Y3: ใบงาน 2 + เกม 1
  await expect(sw('y3w1')).toHaveAttribute('aria-checked', 'true');
  await expect(sw('y3w2')).toHaveText('เปิดอยู่');
  await expect(sw('adventure')).toHaveText('ปิดอยู่');
  await sw('adventure').click();
  await expect(page.locator('#note')).toHaveText('เปิด "ผจญภัยป่ามหัศจรรย์" ให้ห้อง Y3.2 แล้ว ✓');
  await expect(sw('adventure')).toHaveText('เปิดอยู่');
  expect(S.get({ action: 'state', room: 'Y3.2', name: 'ขิม' }).open).toEqual({ y3w1: true, y3w2: true, adventure: true });
  await sw('y3w1').click();
  await expect(sw('y3w1')).toHaveText('ปิดอยู่');
  expect(S.get({ action: 'state', room: 'Y3.1', name: 'อื่น' }).open).toEqual({ y3w1: true });   // ห้องอื่นไม่เปลี่ยน
  // ใช้กับทุกห้อง (มีกล่องยืนยัน)
  page.once('dialog', d => d.accept());
  await page.click('#allRooms');
  await expect(page.locator('#note')).toHaveText('ใช้กับทุกห้องใน Y3 แล้ว ✓');
  for (const r of ['Y3.1', 'Y3.3', 'Y3.4']) expect(S.get({ action: 'state', room: r, name: 'x' }).open).toEqual({ y3w2: true, adventure: true });
  expect(S.get({ action: 'state', room: 'Y4.1', name: 'x' }).open).toEqual({});
  expect(log.posts.every(b => b.key === KEY)).toBe(true);
  // บันทึกไม่ติด (เช่น Script เก่า ไม่รู้จัก setUnlock) → โหลดใหม่แล้วยังเหมือนเดิม → บอกครู
  page.route('**/script.google.com/**', r => r.request().method() === 'POST' ? r.fulfill({ body: 'ok' }) : r.fallback());
  await sw('y3w2').click();
  await expect(page.locator('#note')).toContainText('บันทึกไม่สำเร็จ');
});

test('แชร์ผลงาน: จัดกลุ่มคน/คู่ · ซ่อนชื่อ ••• · ผิดบ่อย · FoR ของห้อง · ดูทีละรอบ · เทียบ 2 ชิ้น · Double Bubble · บันทึก PNG', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  mockGas(page, withWork(seed()));
  await enter(page);
  await page.click('#rooms button:has-text("Y3.2")');
  await page.click('#tabs button:has-text("แชร์ผลงาน")');
  await page.click('.picker button:has-text("สัปดาห์ 1")');
  await expect(page.locator('.sub .nm')).toHaveText(['กาย + จีน', 'ขิม']);
  await expect(page.locator('.sub').nth(1).locator('.info')).toHaveText('จัดถูก 16/16 · รอบที่ 2 · ส่ง 2 ครั้ง');
  await expect(page.locator('.miss')).toContainText('ทุกงานจัดถูกหมด');                // รอบล่าสุดถูกหมด
  await expect(page.locator('.fr li')).toHaveText(['กาย + จีน: เรารู้เพราะครูสอน', 'ขิม: เรารู้เพราะดูคำว่าฟรี']);
  await expect(page.locator('.fr .q')).toHaveText('คำถาม FoR ของใบงาน');
  // ซ่อนชื่อ
  await page.click('#sHide');
  await expect(page.locator('.sub .nm')).toHaveText(['•••', '•••']);
  await expect(page.locator('.fr li').first()).toHaveText('•••: เรารู้เพราะครูสอน');
  await page.locator('.sub').nth(0).click();
  await expect(frame(page).locator('#meName')).toHaveText('•••');
  await expect(frame(page).locator('#pName')).toHaveText('•••');
  await expect(page.locator('.vhead b')).toHaveText('•••');
  // บันทึก PNG
  const dl = page.waitForEvent('download');
  await page.click('#vPng');
  expect((await dl).suggestedFilename()).toBe('Y3.2_สัปดาห์1_ผลงาน.png');
  await page.click('#vHide');                                                           // แสดงชื่อจากในหน้าดูเต็มจอ
  await expect(frame(page).locator('#meName')).toHaveText('กาย');
  await expect(frame(page).locator('#pName')).toHaveText('จีน');
  await page.click('#vClose');
  await expect(page.locator('.sub .nm').first()).toHaveText('กาย + จีน');
  // เทียบ 2 ชิ้น
  await page.click('#sCmp');
  await page.locator('.sub').nth(0).click();
  await expect(page.locator('.sub').nth(0)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sub').nth(1).click();
  await expect(page.locator('#vFrames iframe')).toHaveCount(2);
  await expect(frame(page, 0).locator('#result')).toHaveText('ถูก 16/16 ใบ');
  await expect(frame(page, 1).locator('#result')).toHaveText('ถูก 16/16 ใบ');
  await page.click('.vpanel:nth-child(2) .vhead button:has-text("รอบ 1")');
  await expect(frame(page, 1).locator('#result')).toHaveText('ถูก 14/16 ใบ');
  const dl2 = page.waitForEvent('download');
  await page.click('#vPng');
  expect((await dl2).suggestedFilename()).toBe('Y3.2_สัปดาห์1_กาย+จีน_vs_ขิม.png');
  await page.click('#vClose');
  await page.click('#sCmp');
  // สัปดาห์ 2 Double Bubble: แสดงด้วยหน้าใบงานจริง + การ์ดผิดบ่อย
  await page.click('.picker button:has-text("สัปดาห์ 2")');
  await expect(page.locator('.sub .nm')).toHaveText(['ขิม']);
  await expect(page.locator('.miss div')).toHaveCount(1);
  await expect(page.locator('.miss .p')).toHaveText('1/1');
  await page.locator('.sub').first().click();
  await expect(frame(page).locator('#map.bubble')).toBeVisible();
  await expect(frame(page).locator('#result')).toHaveText('ถูก 8/9 ใบ');
  await expect(frame(page).locator('[data-f="share1"]')).toHaveValue('ตัวอย่าง share1');
  expect(errs).toEqual([]);
});

test('รายชื่อนักเรียน: เพิ่ม · วางหลายชื่อ · แก้ชื่อแล้วงานเดิมตามไป · ซ่อน/แสดง', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const { S, tabs } = mockGas(page, withWork(seed()));
  await enter(page);
  await page.click('#rooms button:has-text("Y3.2")');
  await page.click('#tabs button:has-text("รายชื่อนักเรียน")');
  const names = page.locator('.names').first().locator('.n');
  await expect(names).toHaveText(['กาย', 'ขิม', 'จีน', 'ชิน']);
  await expect(page.locator('.nmcard.off .n')).toHaveText(['ซ่อนไว้']);
  // เพิ่มทีละชื่อ · ซ้ำ = บอก ไม่ส่ง
  await page.fill('#newName', '  มายด์   ก ');
  await page.click('#addOne button.go');
  await expect(page.locator('#note')).toHaveText('เพิ่มแล้ว 1 ชื่อ ✓');
  await expect(page.locator('#newName')).toHaveValue('');
  await page.fill('#newName', 'ขิม'); await page.press('#newName', 'Enter');
  await expect(page.locator('#note')).toHaveText('มีชื่อนี้ในห้องแล้ว: ขิม');
  // วางหลายชื่อ (บรรทัดว่าง/ซ้ำ ข้าม · ชื่อที่ซ่อนอยู่ = แสดงกลับ)
  await page.click('#pasteBtn');
  await page.fill('#many', 'ต้นกล้า\n\nใบเตย\nกาย\nใบเตย\nซ่อนไว้\n');
  await page.click('#addMany');
  await expect(page.locator('#note')).toHaveText('เพิ่มแล้ว 3 ชื่อ ✓ · ข้ามชื่อที่มีอยู่แล้ว: กาย');
  await expect(page.locator('#many')).toHaveCount(0);
  expect(S.get({ action: 'roster', room: 'Y3.2' }).names).toEqual(['กาย', 'ขิม', 'จีน', 'ชิน', 'ซ่อนไว้', 'มายด์ ก', 'ต้นกล้า', 'ใบเตย']);
  // ซ่อน → อยู่ในกลุ่มที่ซ่อน · เด็กไม่เห็น · แสดงกลับได้
  await page.click('[data-hide="ชิน"]');
  await expect(page.locator('#note')).toHaveText('ซ่อนชื่อ ชิน แล้ว ✓');
  await expect(page.locator('.nmcard.off .n')).toHaveText(['ชิน']);
  expect(S.get({ action: 'roster', room: 'Y3.2' }).names).not.toContain('ชิน');
  await page.click('[data-unhide="ชิน"]');
  await expect(page.locator('.nmcard.off')).toHaveCount(0);
  // แก้ชื่อ: ซ้ำคนอื่น = ไม่ส่ง · Esc ยกเลิก · Enter บันทึก
  await page.click('[data-edit="ขิม"]');
  await page.fill('#renameIn', 'กาย'); await page.press('#renameIn', 'Enter');
  await expect(page.locator('#note')).toContainText('ห้องนี้มีชื่อ "กาย" อยู่แล้ว');
  await page.press('#renameIn', 'Escape');
  await expect(page.locator('#renameIn')).toHaveCount(0);
  await page.click('[data-edit="ขิม"]');
  await page.fill('#renameIn', 'ขิม ก');
  await page.click('[data-save="ขิม"]');
  await expect(page.locator('#note')).toHaveText('แก้ชื่อ ขิม → ขิม ก แล้ว ✓ งานเดิมย้ายไปชื่อใหม่แล้ว');
  await expect(names.nth(1)).toHaveText('ขิม ก');
  expect(tabs.Submissions.filter(r => r[4] === 'Y3.2' && r[5] === 'ขิม ก').length).toBe(3);
  expect(S.get({ action: 'state', room: 'Y3.2', name: 'ขิม ก' }).rounds).toEqual({ y3w1: 2, y3w2: 1 });
  // ตารางส่งงานตามชื่อใหม่
  await page.click('#tabs button:has-text("ตารางส่งงาน")');
  await expect(page.locator('.grid tbody tr', { has: page.locator('td:first-child:text-is("ขิม ก")') }).locator('td').nth(2)).toHaveText('8/9');
  expect(errs).toEqual([]);
});

test('มุมครูบนจอเล็ก: ไม่ล้นแนวนอน', async ({ page }) => {
  mockGas(page, withWork(seed()));
  await page.setViewportSize({ width: 390, height: 800 });
  await enter(page);
  for (const t of ['ตารางส่งงาน', 'เปิด/ปิดกิจกรรม', 'แชร์ผลงาน', 'รายชื่อนักเรียน']) {
    await page.click(`#tabs button:has-text("${t}")`);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), t).toBeLessThanOrEqual(390);
  }
});
