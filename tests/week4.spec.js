// สัปดาห์ 4: Y3 Bubble Map วงเดียว + AI ทาย (y3w4) · Y4 Double Bubble + ภาพปริศนา (y4w4) · เกม teachbot / photocheck
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path'), vm = require('vm');
const content = id => JSON.parse(fs.readFileSync(path.join(__dirname, '../worksheet/content', id + '.json'), 'utf8'));
const ACTS = () => JSON.parse(fs.readFileSync(path.join(__dirname, '../data/activities.json'), 'utf8')).activities;
const shot = (page, name) => process.env.SHOTS ? page.screenshot({ path: path.join(process.env.SHOTS, name + '.png') }) : null;
const PICS = (() => { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../worksheet/pics.js'), 'utf8'), { window: w }); return w.WSPics; })();

// จำลอง Apps Script แบบย่อ (เหมือน tests/week3.spec.js)
function mockApi(page, open, api = { posts: [], done: {}, drafts: {}, members: {} }) {
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  page.route('**/script.google.com/**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      const b = JSON.parse(req.postData());
      if (b.action === 'draft') for (const m of b.members) api.drafts[`${b.room}|${m}|${b.act}`] = { data: b.data, updatedAt: new Date().toISOString() };
      else {
        api.posts.push(b);
        const d = JSON.parse(b.row[12]);
        for (const m of b.members) { api.done[m] = d; api.members[m] = b.members; delete api.drafts[`${b.row[3]}|${m}|${d.act}`]; }
      }
      return route.fulfill({ body: 'ok' });
    }
    const p = new URL(req.url()).searchParams, room = p.get('room'), name = p.get('name');
    let body;
    if (p.get('action') === 'roster') body = { ok: true, names: ['กาย', 'ขิม', 'เมษา'] };
    else if (p.get('action') === 'state') {
      const d = api.done[name], drafts = {};
      for (const k of Object.keys(api.drafts)) { const [r, n, a] = k.split('|'); if (r === room && n === name) drafts[a] = api.drafts[k].updatedAt; }
      body = { ok: true, open, status: d ? { [d.act]: 'done' } : {}, rounds: d ? { [d.act]: d.round } : {}, drafts };
    } else if (p.get('action') === 'draft') body = { ok: true, draft: api.drafts[`${room}|${name}|${p.get('act')}`] || null };
    else if (p.get('action') === 'last') {
      const d = api.done[name];
      body = { ok: true, last: d && d.act === p.get('act') ? { data: d, time: '2026-11-17T02:30:00.000Z', members: api.members[name] || [name] } : null };
    } else body = { ok: false, error: 'action' };
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  return api;
}
// แตะฟองแล้วแตะหัวข้อ = ต่อเส้น
async function link(page, id, topic) {   // ฟองที่เลือกอยู่แล้ว แตะซ้ำ = เลิกเลือก จึงแตะเฉพาะตอนยังไม่ได้เลือก
  const b = page.locator(`#web .cardx[data-id="${id}"]`);
  if (!(await b.getAttribute('class')).split(' ').includes('sel')) await b.click();
  await page.click(topic);
}
// มุมครูเปิดงานที่ส่งแล้ว (worksheet/?view=1 ใน iframe รับข้อมูลทาง postMessage แบบหน้าแชร์ผลงาน)
async function teacherView(page, act, data) {
  await page.goto('/data/activities.json');
  await page.evaluate(({ act, data }) => {
    document.documentElement.innerHTML = '<body style="margin:0"><iframe id="f" style="width:1600px;height:900px;border:0"></iframe></body>';
    addEventListener('message', e => { if (e.data === 'viewReady') e.source.postMessage({ view: { data, time: '2026-11-17T02:30:00.000Z', members: ['ขิม'] }, room: 'Y3.2', lang: 'th' }, location.origin); });
    document.getElementById('f').src = `/worksheet/?act=${act}&view=1`;
  }, { act, data });
  return page.frameLocator('#f');
}

test('เนื้อหาสัปดาห์ 4: ครบ TH/EN · ภาพทุกภาพมีใน pics.js · แถวใน activities · เกมล็อกจนส่งใบงาน', async () => {
  const A = ACTS(), tx = o => expect(o && o.th && o.en, JSON.stringify(o)).toBeTruthy();
  const picIds = C => [...C.gallery.items.flatMap(i => i.pics), ...(C.aitest ? C.aitest.tests.map(x => x.pic) : C.mystery.items.map(q => q.pic))];
  for (const [id, level, game] of [['y3w4', 'Y3', 'teachbot'], ['y4w4', 'Y4', 'photocheck']]) {
    const C = content(id);
    expect(C).toMatchObject({ act: id, level, week: 4, noReason: true });
    [C.title, C.topicA, C.task1, C.task2, C.think, C.gallery.title, C.add.ph].forEach(tx);
    expect(C.steps.th).toHaveLength(3); expect(C.steps.en).toHaveLength(3);
    C.cards.forEach(c => tx(c.text));
    for (const p of picIds(C)) expect(PICS.get(p), p).toContain('<svg');
    const row = A.find(a => a.id === id);
    expect(row).toMatchObject({ level, week: 4, kind: 'sheet', path: 'worksheet/?act=' + id, afterGame: game });
    [row.title, row.frq, row.frPh].forEach(tx);
    expect(row.frq.th).toContain('ทำไม');                                // คำถามหลักข้อ 3 "ทำไมสำคัญ"
    const g = A.find(a => a.id === game);
    expect(g).toMatchObject({ kind: 'game', level, ownBack: true, path: `games/${game}.html`, requires: id });
    [g.tag, g.title].forEach(tx);
    expect(fs.existsSync(path.join(__dirname, '..', g.path))).toBe(true);
  }
  const Y3 = content('y3w4'), Y4 = content('y4w4');
  expect(Y3.map).toBe('single'); expect(Y3.cards).toHaveLength(12); expect(Y3.cards.every(c => !c.bin)).toBe(true);
  expect(Y3.aitest.tests).toHaveLength(4); expect(Y3.gallery.items).toHaveLength(6);
  Y3.aitest.tests.forEach(x => { tx(x.name); x.has.forEach(h => expect(Y3.cards.some(c => c.id === h)).toBe(true)); });
  expect(Y4.map).toBe('bubble'); expect(Y4.cards).toHaveLength(12);
  expect(Y4.cards.map(c => c.bin).sort().join('')).toBe('aaaaabbbbbmm');
  Y4.cards.forEach(c => tx(c.why));
  expect(Y4.gallery.items).toHaveLength(4); Y4.gallery.items.forEach(i => { expect(i.pics).toHaveLength(2); tx(i.label); });
  expect(Y4.mystery.items.map(q => q.truth)).toEqual(['ai', 'real', 'ai']);
  Y4.mystery.items.forEach(q => tx(q.why));
});

test('Y3 สัปดาห์ 4: Bubble Map วงเดียว → AI ของเราทายจากฟองที่ต่อ → FoR → ส่ง · เปิดงานที่ส่งแล้ว · มุมครูดูได้', async ({ page, browser }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const api = mockApi(page, { y3w4: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });   // ฟองไม่ลอย ให้คลิกได้แม่น
  const C = content('y3w4');
  await page.goto('/worksheet/?act=y3w4#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=th');
  await expect(page.locator('#s1')).toHaveText(C.steps.th[0]);
  await expect(page.locator('#s3')).toHaveText(C.steps.th[2]);
  await expect(page.locator('#s4')).toBeHidden();
  await expect(page.locator('#stag')).toHaveText('ขั้น 1 / 3');
  await expect(page.locator('#map.web.single')).toBeVisible();
  await expect(page.locator('.topic')).toHaveCount(1);
  await expect(page.locator('#topA')).toHaveText('🐱\nแมว');
  await expect(page.locator('#web .cardx.free')).toHaveCount(12);
  await expect(page.locator('#gal .gi')).toHaveCount(6);
  await page.locator('#gal .gi').nth(2).click();                          // แตะภาพ = ขยาย · แตะอีกที = ปิด
  await expect(page.locator('#zoom svg')).toHaveCount(1);
  await page.click('#zoom');
  await expect(page.locator('#zoom')).toBeHidden();
  await expect(page.locator('#addN')).toHaveText('เพิ่มเองได้อีก 3 ฟอง (ไม่บังคับ)');
  await shot(page, 'y3w4-1');
  await link(page, 'c1', '#topA'); await link(page, 'c2', '#topA');
  await expect(page.locator('#next')).toBeDisabled();                     // อย่างน้อย 3 ฟอง
  await link(page, 'c3', '#topA');
  await expect(page.locator('#next')).toBeEnabled();
  await link(page, 'c2', '#topA');                                        // แตะซ้ำ = ตัดเส้น
  await expect(page.locator('#links line')).toHaveCount(2);
  for (const id of ['c4', 'c5', 'c6', 'c2']) await link(page, id, '#topA');
  await page.fill('#addTx', 'ขนนุ่มนิ่ม'); await page.click('.ab');        // ฟองที่พิมพ์เองต่อเส้นเข้ากลางทันที
  await expect(page.locator('#links line')).toHaveCount(7);
  await expect(page.locator('#web .cardx.free')).toHaveCount(6);
  await shot(page, 'y3w4-1b');
  await page.click('#next');
  // ขั้น 2: AI ทาย 4 ภาพ จากฟองที่ต่อ (c1–c6 · ฟองพิมพ์เอง AI ไม่รู้จัก)
  await expect(page.locator('#stag')).toHaveText('ขั้น 2 / 3');
  await expect(page.locator('#map')).toBeHidden(); await expect(page.locator('#gal')).toBeHidden();
  await expect(page.locator('.tcard')).toHaveCount(4);
  await expect(page.locator('.tsay')).toHaveText([/แมว 100%/, /ไม่ใช่แมว 67%/, /แมว 83%/, /ไม่ใช่แมว 50%/]);
  await expect(page.locator('.tcard').first().locator('.tk.u')).toHaveText('🤷 ขนนุ่มนิ่ม');
  await expect(page.locator('.tcard').nth(3).locator('.tk.n')).toHaveCount(3);
  await expect(page.locator('#next')).toBeDisabled();
  for (const [i, j] of [[0, 'no'], [1, 'ok'], [2, 'ok'], [3, 'ok']]) await page.locator('.tcard').nth(i).locator(`[data-j="${j}"]`).click();
  await expect(page.locator('#next')).toBeDisabled();                     // ยังไม่เขียนเหตุผล
  await page.fill('#s2why', 'ตุ๊กตามีหูมีหนวดเหมือนแมว');
  await expect(page.locator('#next')).toBeEnabled();
  await shot(page, 'y3w4-2');
  await page.click('#next');
  await expect(page.locator('#frq')).toHaveText('ทำไมเราไม่ควรเชื่อทุกอย่างที่ AI บอก?');
  await page.fill('#fr', 'เพราะ AI ทายผิดได้');
  await page.click('#check');
  await expect(page.locator('#sent')).toHaveText('ส่งคำตอบให้ครูแล้ว ✓');
  const row = api.posts[0].row, d = JSON.parse(row[12]);
  expect(row.slice(0, 2)).toEqual(['Y3', 4]);
  expect(row[6]).toBe('✓'); expect(row[7]).toBe('-'); expect(row[8]).toBe('-');
  expect(row[9]).toContain('ต่อเส้น: หูแหลม, มีหนวด'); expect(row[9]).toContain('ขนนุ่มนิ่ม'); expect(row[9]).toContain('AI ว่าแมว 100%');
  expect(d).toMatchObject({ v: 3, act: 'y3w4', map: 'single', fr: 'เพราะ AI ทายผิดได้', s2: { j: { t1: 'no', t2: 'ok', t3: 'ok', t4: 'ok' }, why: 'ตุ๊กตามีหูมีหนวดเหมือนแมว' } });
  expect(Object.keys(d.place).sort()).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
  expect(d.own).toHaveLength(1);
  // หลังส่ง: แท็บขั้น 2 พร้อมเฉลย (t4 AI ทายผิดแต่เรากดว่าถูก) · สลับไปดู Map ได้
  await expect(page.locator('#vtabs')).toBeVisible();
  await expect(page.locator('#result')).toHaveText('🤖');
  await expect(page.locator('.truth.good')).toHaveCount(3);
  await expect(page.locator('.truth.bad')).toContainText('แมวมุดกล่อง');
  await expect(page.locator('.jb').first()).toBeDisabled();
  await page.click('#vtabs [data-vt="map"]');
  await expect(page.locator('#map')).toBeVisible(); await expect(page.locator('#gal')).toBeVisible();
  await expect(page.locator('#web .mark')).toHaveCount(0);                // วงเดียวไม่ตรวจถูกผิด
  await shot(page, 'y3w4-3');
  // เปิดงานที่ส่งแล้วจากคลัง (done=1)
  const p2 = await browser.newPage();
  mockApi(p2, { y3w4: true }, api);
  await p2.emulateMedia({ reducedMotion: 'reduce' });   // ฟองไม่ลอย ให้คลิกได้แม่น
  await p2.goto('/worksheet/?act=y3w4#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=en&done=1');
  await expect(p2.locator('.tcard')).toHaveCount(4);
  await expect(p2.locator('.tsay').first()).toContainText('Cat 100%');
  await expect(p2.locator('#s2why')).toHaveValue('ตุ๊กตามีหูมีหนวดเหมือนแมว');
  await p2.click('#vtabs [data-vt="map"]');
  await expect(p2.locator('#links line')).toHaveCount(7);
  await p2.close();
  // มุมครู (หน้าแชร์ผลงานเปิดใบงานแบบดูอย่างเดียว)
  const f = await teacherView(page, 'y3w4', d);
  await expect(f.locator('.tcard')).toHaveCount(4);
  await expect(f.locator('.truth')).toHaveCount(4);
  await f.locator('#vtabs [data-vt="map"]').click();
  await expect(f.locator('#links line')).toHaveCount(7);
  expect(errs).toEqual([]);
});

test('Y3 สัปดาห์ 4: งานค้างทำต่อได้ (ขั้น 2 + ฟองที่ต่อ)', async ({ page, browser }) => {
  const api = mockApi(page, { y3w4: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });   // ฟองไม่ลอย ให้คลิกได้แม่น
  await page.goto('/worksheet/?act=y3w4#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=th');
  for (const id of ['c1', 'c3', 'c7']) await link(page, id, '#topA');
  await page.click('#next');
  await page.locator('.tcard').first().locator('[data-j="no"]').click();
  await page.fill('#s2why', 'ยังคิดอยู่');
  await page.click('#toLib');                                             // ออกกลางทาง = บันทึกงานค้าง
  await expect.poll(() => { const d = api.drafts['Y3.2|ขิม|y3w4']; return d && d.data.s2 && d.data.s2.why; }).toBe('ยังคิดอยู่');
  const p2 = await browser.newPage();
  mockApi(p2, { y3w4: true }, api);
  await p2.emulateMedia({ reducedMotion: 'reduce' });   // ฟองไม่ลอย ให้คลิกได้แม่น
  await p2.goto('/worksheet/?act=y3w4#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=th&draft=1');
  await expect(p2.locator('#stag')).toHaveText('ขั้น 2 / 3');
  await expect(p2.locator('.tcard').first().locator('[data-j="no"]')).toHaveClass(/on/);
  await expect(p2.locator('#s2why')).toHaveValue('ยังคิดอยู่');
  await expect(p2.locator('.tsay').nth(1)).toContainText('100%');         // ชิบะ: หูแหลม หาง สีส้ม ครบ
  await p2.click('#back');
  await expect(p2.locator('#links line')).toHaveCount(3);
  await p2.close();
});

test('Y4 สัปดาห์ 4: Double Bubble ภาพจริง/AI + ฟองเพิ่มเอง → ภาพปริศนา → ส่ง · เฉลย · มุมครูดูได้', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const api = mockApi(page, { y4w4: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });   // ฟองไม่ลอย ให้คลิกได้แม่น
  const C = content('y4w4');
  await page.goto('/worksheet/?act=y4w4#room=Y4.1&name=' + encodeURIComponent('กาย') + '&lang=th');
  await expect(page.locator('#stag')).toHaveText('ขั้น 1 / 3');
  await expect(page.locator('#gal .gi.pair')).toHaveCount(4);
  await expect(page.locator('#gal .gi').first().locator('.gt')).toHaveText(['📷 จริง', '🤖 AI']);
  await expect(page.locator('#gal .gl').first()).toHaveText('โบกมือทักทาย');
  await page.locator('#gal .gi').nth(1).click();
  await expect(page.locator('#zoom figure')).toHaveCount(2);
  await expect(page.locator('#zoom .zcap')).toContainText('ร้านขนม');
  await page.click('#zoom');
  for (const c of C.cards) {
    const bin = c.id === 'a5' ? 'b' : c.bin;                              // จงใจต่อผิด 1 ฟอง
    if (bin !== 'b') await link(page, c.id, '#topA');
    if (bin !== 'a') await link(page, c.id, '#topB');
  }
  await expect(page.locator('#next')).toBeEnabled();
  await page.fill('#addTx', 'ผมยุ่งนิดหน่อย'); await page.click('.ab');
  await expect(page.locator('#next')).toBeDisabled();                     // ฟองที่เพิ่มต้องต่อเส้นก่อน
  await page.click('#topA');
  await expect(page.locator('#next')).toBeEnabled();
  await shot(page, 'y4w4-1');
  await page.click('#next');
  await expect(page.locator('.qcard')).toHaveCount(3);
  await expect(page.locator('.qcard').first().locator('.cl')).toHaveCount(13);
  await expect(page.locator('#next')).toBeDisabled();
  const q = i => page.locator('.qcard').nth(i);
  await q(0).locator('[data-v="ai"]').click(); await q(0).locator('[data-c="b2"]').click();
  await q(1).locator('[data-v="real"]').click();
  await expect(page.locator('#next')).toBeDisabled();                     // โหวตจริง/AI ต้องแตะเบาะแส
  await q(1).locator('.cl', { hasText: 'ผมยุ่งนิดหน่อย' }).click(); await q(1).locator('[data-c="a2"]').click();
  await q(2).locator('[data-v="unsure"]').click();                        // ดูไม่ออก ไม่ต้องมีเบาะแส
  await expect(page.locator('#next')).toBeEnabled();
  await shot(page, 'y4w4-2');
  await page.click('#next');
  await expect(page.locator('#frq')).toHaveText('ทำไมต้องตรวจภาพก่อนเชื่อหรือแชร์ต่อ?');
  await page.click('#skip');
  await expect(page.locator('#sent')).toHaveText('ส่งคำตอบให้ครูแล้ว ✓');
  const row = api.posts[0].row, d = JSON.parse(row[12]);
  expect(row[6]).toBe('11/12'); expect(row[7]).toContain('กรอบหน้าต่างตรง');
  expect(row[9]).toContain('ภาพปริศนา: 1 = 🤖 AI สร้าง (ตัวหนังสือขยุกขยิก อ่านไม่ออก)');
  expect(row[9]).toContain('ผมยุ่งนิดหน่อย');
  expect(d).toMatchObject({ act: 'y4w4', map: 'bubble', s2: { v: { q1: 'ai', q2: 'real', q3: 'unsure' }, cl: { q1: ['b2'] } } });
  expect(d.s2.cl.q2).toHaveLength(2);
  // หลังส่ง: แท็บ Map ก่อน (มีคะแนน) · แท็บภาพปริศนามีเฉลย ดูไม่ออก = ตอบดี
  await expect(page.locator('#result')).toHaveText('ถูก 11/12 ใบ');
  await expect(page.locator('#map')).toBeVisible();
  await page.click('#vtabs [data-vt="s2"]');
  await expect(page.locator('.truth.good')).toHaveCount(3);
  await expect(page.locator('.truth').nth(2)).toContainText('ดูไม่ออก');
  await shot(page, 'y4w4-3');
  // แก้แล้วส่งใหม่: กลับขั้น 1 คำตอบเดิมยังอยู่
  await page.click('#edit');
  await expect(page.locator('#stag')).toHaveText('ขั้น 1 / 3');
  await expect(page.locator('#gal')).toBeVisible();
  await expect(page.locator('#vtabs')).toBeHidden();
  // มุมครู
  const f = await teacherView(page, 'y4w4', d);
  await expect(f.locator('#result')).toHaveText('ถูก 11/12 ใบ');
  await f.locator('#vtabs [data-vt="s2"]').click();
  await expect(f.locator('.qcard .vb.on')).toHaveCount(3);
  expect(errs).toEqual([]);
});

test('ใบงานเก่ายังเหมือนเดิม: Double Bubble y3w2 ไม่มีแถบภาพ/แท็บ', async ({ page }) => {
  mockApi(page, { y3w2: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });   // ฟองไม่ลอย ให้คลิกได้แม่น
  await page.goto('/worksheet/?act=y3w2#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=th');
  await expect(page.locator('.topic')).toHaveCount(2);
  await expect(page.locator('#gal')).toHaveCount(0);
  await expect(page.locator('#vtabs')).toHaveCount(0);
  await expect(page.locator('#writer')).toBeHidden();
});

test('เกม Y3 สอนหุ่นยนต์ AI: ติดป้าย → ทดสอบ → สอนเพิ่ม → ครบ 6 ด่าน (รวมด่านแก้ป้ายผิด) · TH/EN · ไม่ล้นจอ · ปุ่มกลับใน iframe', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/games/teachbot.html');
  await expect(page.locator('#tTitle')).toHaveText('สอนหุ่นยนต์ AI');
  await expect(page.locator('#gback')).toBeHidden();
  await page.click('#go');
  await expect(page.locator('.it')).toHaveCount(8);
  await expect(page.locator('#test')).toBeDisabled();
  const tap = async (name, n = 1) => { for (let i = 0; i < n; i++) await page.locator('.it', { hasText: name }).click(); };
  // สอนน้อยเกินไป: แอปเปิลแดง/เขียว = ใช่ · เชอร์รี่ = ไม่ใช่ → ลูกบอลแดงถูกทายว่าเป็นแอปเปิล
  await tap('แอปเปิลแดง'); await tap('แอปเปิลเขียว');
  await expect(page.locator('#test')).toBeDisabled();
  await tap('เชอร์รี่', 2);
  await expect(page.locator('.it.no')).toHaveCount(1);
  await expect(page.locator('#test')).toBeEnabled();
  await page.click('#test');
  await expect(page.locator('.tc')).toHaveCount(4);
  await expect(page.locator('.tc .res.b').first()).toBeVisible();
  await expect(page.locator('.tc', { hasText: 'ลูกบอลแดง' }).locator('.ans')).toContainText('นี่คือแอปเปิล');
  await expect(page.locator('#say')).toContainText('หุ่นทายถูก 2/4');
  // สอนเพิ่ม: ลูกบอล มะเขือเทศ = ไม่ใช่ → ถูกครบ
  await page.click('#again');
  await expect(page.locator('.it.yes')).toHaveCount(2);                      // ป้ายเดิมยังอยู่
  await tap('ลูกบอลแดง', 2); await tap('มะเขือเทศ', 2);
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('หุ่นทายถูก 4/4');
  await expect(page.locator('.tc .res.g')).toHaveCount(4);
  await shot(page, 'teachbot-1');
  // ด่าน 2 แมว · ด่าน 3 ปลา (ฉลามหลอกหุ่นได้แม้สอนครบ)
  await page.click('#next');
  await expect(page.locator('#goal')).toHaveText('🐱 แมว');
  for (const n of ['แมวส้ม', 'แมวดำ']) await tap(n);
  for (const n of ['หมา', 'จิ้งจอก', 'เสือ', 'หนู', 'กระต่าย', 'หมี']) await tap(n, 2);
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('4/4');
  await page.click('#next');
  for (const n of ['ปลาการ์ตูน', 'ปลาปักเป้า']) await tap(n);
  await page.locator('.it').first().click();                                   // ปลา
  for (const n of ['โลมา', 'ปู', 'ปลาหมึก', 'แมวน้ำ', 'วาฬ']) await tap(n, 2);
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('3/4');
  await expect(page.locator('#say')).toContainText('ฉลามเป็นปลา');
  // ด่าน 4 นก: ค้างคาวบินได้แต่ไม่ใช่นก · สอนแต่นกที่บินได้ก็ยังทายเพนกวินถูก เพราะมีขนนก/จะงอยปาก
  await page.click('#next');
  await expect(page.locator('#goal')).toHaveText('🐦 นก');
  await tap('นกกระจอก'); await tap('ค้างคาว'); await tap('นกฮูก'); await tap('เครื่องบิน', 2);
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('2/4');                  // ค้างคาว = นก → ค้างคาวอีกตัวผิด · ผึ้งก็สับสน
  await expect(page.locator('#say')).toContainText('ค้างคาวบินได้แต่ไม่ใช่นก');
  await page.click('#again'); await tap('ค้างคาว'); await tap('ผีเสื้อ', 2);  // ใช่ → ไม่ใช่
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('4/4');
  // ด่าน 5 แมลง: แมงมุม 8 ขาไม่ใช่แมลง
  await page.click('#next');
  await expect(page.locator('#goal')).toHaveText('🐞 แมลง');
  for (const n of ['มด', 'ผึ้ง', 'แมงมุม']) await tap(n);
  await tap('หอยทาก', 2);
  await page.click('#test');
  await expect(page.locator('.tc', { hasText: 'แมงมุมขนดก' }).locator('.res')).toHaveText('ทายผิด 😵');
  await page.click('#again'); await tap('แมงมุม'); await tap('แมงป่อง', 2);
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('4/4');
  // ด่าน 6 ช่วยแก้หุ่น: ป้ายมาให้แล้ว ผิด 2 ภาพ → ทดสอบได้ทันที 2/4 → แก้แมว/หมาพันธุ์ใหญ่ → 4/4
  await page.click('#next');
  await expect(page.locator('#goal')).toHaveText('🐶 หมา');
  await expect(page.locator('#hd')).toContainText('ติดป้ายผิด');
  await expect(page.locator('.it.yes')).toHaveCount(3); await expect(page.locator('.it.no')).toHaveCount(5);
  await expect(page.locator('#test')).toBeEnabled();
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('2/4');
  await expect(page.locator('.tc', { hasText: 'แมวลาย' }).locator('.why')).toContainText('ติดป้ายว่าใช่');
  await page.click('#again');
  await tap('แมว'); await tap('หมาพันธุ์ใหญ่', 2);                       // ใช่→ไม่ใช่ · ไม่ใช่→ไม่ใช้→ใช่
  await expect(page.locator('.it.yes')).toHaveCount(3);
  await page.click('#test');
  await expect(page.locator('#say')).toContainText('4/4');
  await expect(page.locator('#say')).toContainText('แก้ป้ายถูกแล้ว');
  await shot(page, 'teachbot-6');
  await page.click('#next');
  await expect(page.locator('#eSum div')).toHaveCount(6);
  await expect(page.locator('#eBadge')).toHaveText('🏆');
  await page.click('#len');
  await expect(page.locator('#eTitle')).toHaveText('Our robot finished school!');
  // จอเล็ก/จอห้องเรียน: ไม่มีแถบเลื่อน
  await page.click('#eAgain');
  await page.locator('.it').first().click();
  for (const vp of [{ width: 1366, height: 768 }, { width: 1024, height: 640 }]) {
    await page.setViewportSize(vp);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  }
  // ใน iframe: ปุ่มกลับส่ง closeGame
  await page.goto('/data/activities.json');
  await page.evaluate(() => { document.documentElement.innerHTML = '<body><iframe id="g" src="/games/teachbot.html" style="width:1000px;height:640px"></iframe></body>'; window.got = []; addEventListener('message', e => got.push(e.data)); });
  const g = page.frameLocator('#g');
  await expect(g.locator('#gback')).toBeVisible();
  await page.evaluate(() => document.getElementById('g').contentWindow.postMessage({ lang: 'en' }, '*'));
  await expect(g.locator('#tTitle')).toHaveText('Teach the Robot');
  await g.locator('#gback').click();
  await expect.poll(() => page.evaluate(() => got)).toContain('closeGame');
  expect(errs).toEqual([]);
});

test('เกม Y4 นักสืบภาพ: แชร์/เช็กที่มา/ไม่แชร์ ได้ผลตามโพสต์ · ซูมภาพ · จบเกม · ไม่ล้นจอ', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/games/photocheck.html');
  await expect(page.locator('#tTitle')).toHaveText('นักสืบภาพ');
  await page.click('#goH');
  await expect(page.locator('#trail i')).toHaveCount(10);
  const seen = [];
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.post .pic svg')).toHaveCount(1);
    const cap = await page.locator('.cap').textContent(); seen.push(cap);
    if (i === 0) { await page.click('#pic'); await expect(page.locator('#zoom svg')).toHaveCount(1); await page.click('#zoom'); await expect(page.locator('#zoom')).toBeHidden(); }
    const trick = /UFO|นักเรียนใหม่|แมวบ้านเราเอง|หมาหลง|กีฬาสี/.test(cap);
    if (i % 2) { await page.click('#aCheck'); await expect(page.locator('.src')).toBeVisible(); await page.click(trick ? '#aSkip2' : '#aShare2'); }
    else await page.click(trick ? '#aShare' : '#aSkip');
    await expect(page.locator('.fb')).toHaveClass(i % 2 ? /fb g/ : trick ? /fb r/ : /fb n/);
    await expect(page.locator('.fb .clue')).toContainText(/ภาพนี้/);
    if (i === 1) await shot(page, 'photocheck-1');
    await page.click('#nextP');
  }
  expect(new Set(seen).size).toBe(10);
  await expect(page.locator('#eSum')).toHaveText('ตัดสินใจได้ดี 5 จาก 10 โพสต์');
  await expect(page.locator('#ePath div')).toHaveCount(10);
  await page.click('#len');
  await expect(page.locator('#eRank')).toHaveText(/detective/);
  await page.click('#eTitle');
  for (const vp of [{ width: 1366, height: 768 }, { width: 1024, height: 640 }]) {
    await page.setViewportSize(vp);
    await page.click('#goE');
    await expect(page.locator('#trail i')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.click('#aCheck');
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.goto('/games/photocheck.html');
  }
  expect(errs).toEqual([]);
});

test('ต่อฟองหนึ่งฟอง ฟองลอยที่เหลือไม่ย้ายที่ (ไม่ดูเหมือนหน้ารีโหลด) · ทุกใบงานแบบฟอง', async ({ page }) => {
  for (const [act, topic, cards] of [['y3w4', '#topA', ['c1', 'c2', 'c3']], ['y4w4', '#topB', ['b1', 'b2', 'b3']], ['y3w2', '#topA', null]]) {
    mockApi(page, { [act]: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let loads = 0; const onLoad = () => loads++; page.on('load', onLoad);
    await page.goto(`/worksheet/?act=${act}#room=Y3.2&name=` + encodeURIComponent('ขิม') + '&lang=th');
    await expect(page.locator('#web .cardx')).toHaveCount(12);
    const ids = cards || (await page.locator('#web .cardx').evaluateAll(xs => xs.slice(0, 3).map(x => x.dataset.id)));
    const pos = () => page.locator('#web .cardx.free').evaluateAll(xs => Object.fromEntries(xs.map(x => [x.dataset.id, x.style.left + ' ' + x.style.top])));
    for (const id of ids) {
      const before = await pos();
      await link(page, id, topic);
      await expect(page.locator(`#web .cardx[data-id="${id}"]`)).not.toHaveClass(/free/);
      const after = await pos();
      for (const k of Object.keys(after)) expect(after[k], `${act} ${k}`).toBe(before[k]);
    }
    expect(loads).toBe(1);
    page.off('load', onLoad);
  }
});
