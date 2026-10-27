// ทดสอบ Hub + ใบงาน ทั้งเส้นทาง โดยจำลอง Apps Script (ไม่ต่อ Google จริง)
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const content = id => JSON.parse(fs.readFileSync(path.join(__dirname, '../worksheet/content', id + '.json'), 'utf8'));

// api.posts = งานที่ส่ง · api.drafts = งานค้าง (key: "ห้อง|ชื่อ|กิจกรรม") · ส่ง api เดิมเข้าไปเพื่อจำลอง "อีกเครื่อง"
function mockApi(page, { open = { y3w1: true, y4w1: true, adventure: true } } = {}, api = { posts: [], done: {}, drafts: {}, members: {} }) {
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  page.route('**/script.google.com/**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      const b = JSON.parse(req.postData());
      if (b.action === 'draft') {
        for (const m of b.members) api.drafts[`${b.room}|${m}|${b.act}`] = { data: b.data, updatedAt: new Date().toISOString() };
      } else {
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
      body = { ok: true, last: d && d.act === p.get('act') ? { data: d, time: '2026-10-27T02:30:00.000Z', members: api.members[name] || [name] } : null };
    }
    else body = { ok: false, error: 'action' };
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  return api;
}

async function doWorksheet(page, id, { fr, skip } = {}) {
  const C = content(id);
  await expect(page.locator('#pool .cardx')).toHaveCount(16);
  for (const c of C.cards) {               // แตะการ์ด แล้วแตะกล่อง
    await page.click(`.cardx[data-id="${c.id}"]`);
    await page.click(`.bin.${c.bin} h2`);
  }
  await page.click('#next');                // ขั้น 2
  for (const c of C.cards.filter(c => c.bin === 'b'))
    for (const n of c.signs) await page.click(`.cardx[data-id="${c.id}"] .chip[data-s="${n}"]`);
  await page.click('#next');                // ขั้น 3
  await expect(page.locator('#toFor')).toBeDisabled();
  await page.click(`.cardx[data-id="b1"]`);
  await page.fill('#reason', 'เพราะมันบอกว่าได้ของฟรี');
  await page.click('#toFor');               // ขั้น 4
  await expect(page.locator('#forPanel')).toBeVisible();
  if (skip) await page.click('#skip');
  else { await page.fill('#fr', fr); await page.click('#check'); }
  await expect(page.locator('#sent')).toHaveClass(/ok/);
}

test('Y3: เลือกห้อง → ชื่อ → ทำใบงาน 4 ขั้น → ส่ง → สถานะส่งแล้ว', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const api = mockApi(page);
  await page.goto('/');
  await expect(page.locator('#goTyping')).toHaveAttribute('href', 'https://terraran.github.io/ANSTH-Typing/');
  await page.click('#goIct');
  await page.click('text=Y3.2');
  await page.click('button.name:has-text("ขิม")');
  await expect(page.locator('.card[data-act="y3w1"] .st')).toHaveText('ยังไม่เริ่ม');
  await expect(page.locator('.prog b')).toHaveText('0/1');
  await expect(page.locator('.card[data-act="y4w1"]')).toHaveCount(0);   // Y3 ไม่เห็นงาน Y4
  await page.click('.card[data-act="y3w1"] a.btn');

  await expect(page.locator('#meName')).toHaveText('ขิม');
  await expect(page.locator('#ttl')).toContainText('สัปดาห์ 1');
  await doWorksheet(page, 'y3w1', { fr: 'เรารู้เพราะครูสอนในห้อง' });
  await expect(page.locator('#result')).toHaveText('ถูก 16/16 ใบ');

  expect(api.posts).toHaveLength(1);
  const b = api.posts[0];
  expect(b.action).toBe('submit');
  expect(b.members).toEqual(['ขิม']);
  expect(b.row).toHaveLength(15);
  expect(b.row.slice(0, 7)).toEqual(['Y3', 1, 'กดได้ หรือ หยุดถามผู้ใหญ่?', 'Y3.2', 'ขิม', 'TH', '16/16']);
  const d = JSON.parse(b.row[12]);
  expect(d).toMatchObject({ v: 3, act: 'y3w1', round: 1, hes: 'b1', fr: 'เรารู้เพราะครูสอนในห้อง', frq: 'เรารู้ได้อย่างไรว่าการ์ดไหนอยู่กลุ่มไหน?' });
  expect(b.row[13]).toBe('เรารู้เพราะครูสอนในห้อง');

  // เกมหลังส่ง (Y3) เปิดใน iframe แล้วกดกลับใบงานได้
  await expect(page.locator('#play')).toBeVisible();
  await page.click('#play');
  await expect(page.locator('#gameWrap')).toBeVisible();
  await page.frameLocator('#gameFrame').locator('#gback').click();
  await expect(page.locator('#gameWrap')).toBeHidden();

  await page.click('#lib2');
  await expect(page.locator('.card[data-act="y3w1"] .st')).toHaveText('ส่งแล้ว ✓');
  await expect(page.locator('.prog b')).toHaveText('1/1');
  // เปิดอีกครั้ง = เห็นงานที่ส่งไปพร้อมผลตรวจ แล้วแก้ส่งใหม่เป็นรอบที่ 2 ได้
  await page.click('.card[data-act="y3w1"] a.btn');
  await expect(page).toHaveURL(/done=1/);
  await expect(page.locator('#res')).toBeVisible();
  await expect(page.locator('.mark')).toHaveCount(16);
  await expect(page.locator('#result')).toHaveText('ถูก 16/16 ใบ');
  await expect(page.locator('#sent')).toContainText('ส่งให้ครูแล้วเมื่อ');
  await expect(page.locator('#mine')).toContainText('เพราะมันบอกว่าได้ของฟรี');
  await expect(page.locator('#mine')).toContainText('เรารู้เพราะครูสอนในห้อง');
  await expect(page.locator('.cardx[data-id="b1"]')).toHaveClass(/hes/);
  await page.click('#edit');
  await expect(page.locator('#s1')).toHaveClass(/on/);
  await expect(page.locator('#pool .cardx')).toHaveCount(0);          // คำตอบเดิมยังอยู่ แก้ต่อได้
  await expect(page.locator('#task')).toContainText('ขั้นที่ 1');
  expect(errs).toEqual([]);
});

test('Y4: ข้าม FoR แล้วส่ง · ภาษาอังกฤษ · เกมนักสืบหลังส่ง', async ({ page }) => {
  const api = mockApi(page);
  await page.goto('/#/lib/Y4.1/' + encodeURIComponent('เมษา'));
  await page.click('[data-lang="en"]');
  await expect(page.locator('.card[data-act="y4w1"] .st')).toHaveText('Not started');
  await page.click('.card[data-act="y4w1"] a.btn');
  await expect(page.locator('#s1')).toHaveText('1 Sort');
  await doWorksheet(page, 'y4w1', { skip: true });
  const d = JSON.parse(api.posts[0].row[12]);
  expect(d.fr).toBe('');
  expect(api.posts[0].row[5]).toBe('EN');
  expect(api.posts[0].row[13]).toBe('-');
  await expect(page.locator('#play')).toHaveText('🎮 Play Chat Detective');
  await page.click('#play');
  await expect(page.frameLocator('#gameFrame').locator('#tTitle')).toHaveText('Chat Detective');
  await page.frameLocator('#gameFrame').locator('#gback').click();
  await expect(page.locator('#gameWrap')).toBeHidden();
  // แก้แล้วส่งใหม่ → รอบ 2
  await page.click('#edit');
  await expect(page.locator('#task')).toContainText('Step 1');
});

test('การ์ดที่ครูยังไม่เปิดถูกล็อก · เกมเปิดเต็มจอและปิดได้', async ({ page }) => {
  const api = mockApi(page, { open: { adventure: true } });
  api.done['กาย'] = { act: 'y3w1', round: 1 };                    // ส่งใบงานคู่กันแล้ว เกมจึงเล่นได้
  await page.goto('/#/lib/Y3.1/' + encodeURIComponent('กาย'));
  await expect(page.locator('.card[data-act="y3w1"] .lockbox')).toBeVisible();
  await expect(page.locator('.card[data-act="y3w1"] a')).toHaveCount(0);
  await page.click('[data-tab="game"]');
  await expect(page.locator('.card')).toHaveCount(1);   // Y3 เห็นแค่เกมผจญภัย
  await expect(page.locator('.card[data-act="adventure"] .st')).toHaveText('เล่นได้เลย');
  await page.click('.card[data-act="adventure"] button');
  await expect(page.locator('#gameWrap')).toBeVisible();
  await page.frameLocator('#gameFrame').locator('#gback').click();
  await expect(page.locator('#gameWrap')).toBeHidden();
});

test('ใบงานที่เปิดตรง ๆ โดยไม่มีห้อง/ชื่อ → พากลับคลัง', async ({ page }) => {
  mockApi(page);
  await page.goto('/worksheet/?act=y3w1');
  await expect(page.locator('#msg')).toBeVisible();
});

test('มือถือ: หน้าเลือกชื่อไม่ล้นจอแนวนอน', async ({ page }) => {
  mockApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const h of ['/', '/#/rooms', '/#/names/Y3.2', '/#/lib/Y3.2/' + encodeURIComponent('ขิม')]) {
    await page.goto(h); await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
});

test('Y4: เกมนักสืบล็อกถ้าครูยังไม่เปิด', async ({ page }) => {
  mockApi(page, { open: { y4w1: true } });
  await page.goto('/#/lib/Y4.2/' + encodeURIComponent('UNO'));
  await page.click('[data-tab="game"]');
  await expect(page.locator('.card[data-act="detective"] .lockbox')).toBeVisible();
});

test('เกมนักสืบแชท: เล่นจบ 3 คดี ได้ดาวเต็มเมื่อตอบถูกทุกข้อ', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });   // ข้ามอนิเมชันแชทให้เทสต์เร็ว
  await page.goto('/games/detective.html');
  await expect(page.locator('#gback')).toBeHidden();
  await page.click('#goE');
  for (let i = 0; i < 12; i++) {
    await expect(page.locator('#pHint')).toBeVisible();
    const want = await page.evaluate(() => deck[idx].s);
    for (const n of (want.length ? want : [0])) await page.click(`.sg[data-n="${n}"]`);
    await page.click('#pCheck');
    await expect(page.locator('#pRes')).toHaveClass(/good/);
    await page.click('#pNext');
    if (i % 4 === 3) await page.click('#cNext');
  }
  await expect(page.locator('#eStars')).toHaveText('ได้ดาว 24 จาก 24 ดวง');
  await expect(page.locator('#eRank')).toHaveText('นักสืบระดับทอง');
  // เลือก "ปลอดภัย" แล้วเลือกสัญญาณ → ปลอดภัยหลุด
  await page.click('#eTitle'); await page.click('#goN');
  await page.click('.sg[data-n="0"]'); await page.click('.sg[data-n="2"]');
  expect(await page.evaluate(() => [...pick])).toEqual([2]);
  await expect(page.locator('#pHint')).toBeHidden();
  expect(errs).toEqual([]);
});

test('เกมนักสืบแชท: แชทค่อย ๆ เด้ง ปุ่มล็อกจนข้อความมาครบ แตะแชทเพื่อข้ามได้', async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/detective.html');
  await page.click('#goN');
  await expect(page.locator('.sg').first()).toBeDisabled();
  await expect(page.locator('#pLines .ln.typing')).toBeVisible();
  await page.click('#pChat');
  await expect(page.locator('#pLines .ln:not(.typing)')).toHaveCount(3);
  await expect(page.locator('#pLines .ln.target .bub')).toHaveText(await page.evaluate(() => deck[0].th));
  await expect(page.locator('.sg').first()).toBeEnabled();
  // ข้อความถัดไปเล่นแชทเองจนครบโดยไม่ต้องแตะ
  await page.click('.sg[data-n="0"]'); await page.click('#pCheck'); await page.click('#pNext');
  await expect(page.locator('#pLines .ln.target')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.sg').first()).toBeEnabled();
});

test('เกมผจญภัย: ป๊อปอัปหน้าตาเหมือนกัน ไม่มี X ปลอม · หลอก=ต้องปิด · ของเกม=กดได้', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/adventure.html');
  await page.click('#goE');
  await page.waitForFunction(() => state === 'play');
  const st = () => page.evaluate(() => ({ coins, hearts, n: layer.children.length }));
  // ล้างป๊อปอัปที่เกมสุ่มเอง แล้วสร้างอันที่ต้องการ (ปุ่มเต้นตลอดจึงคลิกแบบ force)
  const spawnOne = kind => page.evaluate(k => { layer.innerHTML = ''; bag = [{ x: (k === 't' ? TRICKS : SAFES)[0], k }]; spawn(false); layer.lastChild.id = 'P'; }, kind);
  const tap = sel => page.click('#P ' + sel, { force: true });

  await spawnOne('t');
  await expect(page.locator('#P .fakex, #P .nothanks, #P .barfake')).toHaveCount(0);
  const trickCls = await page.locator('#P').getAttribute('class');
  let s0 = await st();
  await tap('.realx');                      // ปิดป๊อปอัปหลอก = ถูก
  let s1 = await st();
  expect([s1.coins - s0.coins, s1.hearts - s0.hearts]).toEqual([5, 0]);

  await spawnOne('s');
  const safeCls = await page.locator('#P').getAttribute('class');
  expect(safeCls.replace(/c\d/, '')).toBe(trickCls.replace(/c\d/, ''));   // คลาสเหมือนกัน ต่างแค่สี
  s0 = await st();
  await tap('.bait');            // กดปุ่มป๊อปอัปของเกม = ได้เหรียญ
  s1 = await st();
  expect([s1.coins - s0.coins, s1.hearts - s0.hearts]).toEqual([5, 0]);

  await spawnOne('t');
  s0 = await st();
  await tap('.bait');            // กดปุ่มป๊อปอัปหลอก = เสียหัวใจ
  s1 = await st();
  expect(s1.hearts - s0.hearts).toBe(-1);
  expect(errs).toEqual([]);
});

test('ใบงาน Y3: การ์ดใหม่ 16 ใบ และเก็บการ์ดเก่าไว้ใน retired', async () => {
  const C = content('y3w1');
  expect(C.cards).toHaveLength(16);
  expect(C.cards.filter(c => c.bin === 'a')).toHaveLength(8);
  expect(C.cards.map(c => c.id)).toEqual(expect.arrayContaining(['a9', 'a10', 'a11', 'b9', 'b10', 'b11']));
  expect(C.retired.map(c => c.id).sort()).toEqual(['a2', 'a5', 'a7', 'b5', 'b6', 'b7']);
  for (const c of C.cards.filter(c => c.bin === 'b')) expect(c.signs.length).toBeGreaterThan(0);
});

test('งานค้าง: เปลี่ยนขั้นแล้วบันทึกเอง · เปิดอีกเครื่องกดทำต่อ กลับมาขั้นเดิม', async ({ page, browser }) => {
  const api = mockApi(page);
  await page.goto('/worksheet/?act=y3w1#room=Y3.2&name=' + encodeURIComponent('ขิม'));
  const C = content('y3w1');
  await expect(page.locator('#pool .cardx')).toHaveCount(16);
  for (const c of C.cards) { await page.click(`.cardx[data-id="${c.id}"]`); await page.click(`.bin.${c.bin} h2`); }
  await page.click('#next');                                      // ไปขั้น 2 = บันทึกทันที
  const b = C.cards.find(c => c.bin === 'b');
  await page.click(`.cardx[data-id="${b.id}"] .chip[data-s="${b.signs[0]}"]`);
  await expect(page.locator('#saved')).toContainText('บันทึกอัตโนมัติแล้ว');
  await page.click('#toLib');                                      // ออกจากใบงาน = บันทึกที่เหลือ
  await expect.poll(() => (api.drafts['Y3.2|ขิม|y3w1'] || {}).data && api.drafts['Y3.2|ขิม|y3w1'].data.signs[b.id]).toEqual([b.signs[0]]);

  // "อีกเครื่อง" = browser context ใหม่ ไม่มี localStorage เดิม
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctx.newPage();
  mockApi(p2, undefined, api);
  await p2.goto('/#/lib/Y3.2/' + encodeURIComponent('ขิม'));
  await expect(p2.locator('.card[data-act="y3w1"] .st')).toHaveText('ทำค้างไว้');
  await p2.click('.card[data-act="y3w1"] a.btn:has-text("ทำต่อ")');
  await expect(p2.locator('#resume')).toBeVisible();
  await expect(p2.locator('#s2')).toHaveClass(/on/);
  await expect(p2.locator('#pool .cardx')).toHaveCount(0);
  await expect(p2.locator(`.cardx[data-id="${b.id}"] .chip[data-s="${b.signs[0]}"]`)).toHaveClass(/on/);
  await ctx.close();
});

test('ทำคู่: เลือกเพื่อน ส่งครั้งเดียว นับให้ทั้งคู่ และงานค้างหายหลังส่ง', async ({ page }) => {
  const api = mockApi(page);
  await page.goto('/worksheet/?act=y3w1#room=Y3.2&name=' + encodeURIComponent('ขิม'));
  await page.click('#pairBtn');
  await expect(page.locator('#pairList button')).toHaveCount(3);   // ทำคนเดียว + กาย + เมษา (ไม่มีชื่อตัวเอง)
  await page.click('#pairList button:has-text("กาย")');
  await expect(page.locator('#pName')).toHaveText('กาย');
  await expect(page.locator('#pairBtn')).toHaveText('เปลี่ยนเพื่อน');
  await expect.poll(() => Object.keys(api.drafts).sort()).toEqual(['Y3.2|กาย|y3w1', 'Y3.2|ขิม|y3w1']);
  await doWorksheet(page, 'y3w1', { skip: true });
  const sub = api.posts[0];
  expect(sub.members).toEqual(['ขิม', 'กาย']);
  expect(sub.row[4]).toBe('ขิม + กาย');
  expect(api.drafts).toEqual({});
  await page.goto('/#/lib/Y3.2/' + encodeURIComponent('กาย'));
  await expect(page.locator('.card[data-act="y3w1"] .st')).toHaveText('ส่งแล้ว ✓');
});

test('งานค้าง: กดเริ่มใหม่ ได้ใบงานว่าง', async ({ page }) => {
  const api = mockApi(page);
  api.drafts['Y3.2|ขิม|y3w1'] = { data: { v: 1, step: 1, round: 1, placed: { a1: 'a', b1: 'b' }, signs: {}, hes: '', reason: '', fr: '', partner: '' }, updatedAt: new Date().toISOString() };
  await page.goto('/worksheet/?act=y3w1#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&draft=1');
  await expect(page.locator('#pool .cardx')).toHaveCount(14);
  page.once('dialog', d => d.accept());
  await page.click('#restart');
  await expect(page.locator('#pool .cardx')).toHaveCount(16);
  await expect(page.locator('#resume')).toBeHidden();
});

test('เกมล็อกจนกว่าจะส่งใบงานที่คู่กัน แล้วปลดล็อกหลังส่ง', async ({ page }) => {
  mockApi(page);
  await page.goto('/#/lib/Y3.2/' + encodeURIComponent('ขิม'));
  await page.click('[data-tab="game"]');
  await expect(page.locator('.card[data-act="adventure"] .st')).toHaveText('ยังเล่นไม่ได้');
  await expect(page.locator('.card[data-act="adventure"] .lockbox')).toHaveText('ทำใบงานสัปดาห์ 1 ให้เสร็จก่อน');
  await expect(page.locator('.card[data-act="adventure"] button')).toHaveCount(0);
  await page.click('[data-tab="sheet"]');
  await page.click('.card[data-act="y3w1"] a.btn');
  await doWorksheet(page, 'y3w1', { skip: true });
  await page.click('#lib2');
  await page.click('[data-tab="game"]');
  await expect(page.locator('.card[data-act="adventure"] .st')).toHaveText('เล่นได้เลย');
  await expect(page.locator('.card[data-act="adventure"] button')).toBeVisible();
});

test('ดูงานที่ส่งไว้กับการ์ดชุดเก่า: แสดงการ์ดชุดเดิม แล้วแก้ส่งใหม่ได้กับชุดใหม่', async ({ page }) => {
  const api = mockApi(page);
  // งานจากใบงานเก่า (v2) ที่ยังใช้การ์ด a2/a5/a7/b5/b6/b7 ซึ่งตอนนี้อยู่ใน retired
  const place = { a1: 'a', a2: 'a', a3: 'a', a4: 'a', a5: 'a', a6: 'a', a7: 'a', a8: 'b', b1: 'b', b2: 'b', b3: 'b', b4: 'b', b5: 'b', b6: 'b', b7: 'b', b8: 'b' };
  api.done['TALENT'] = { v: 2, act: 'y3w1', round: 1, place, signs: { b1: [1] }, hes: 'b2', reason: 'old reason', fr: '' };
  api.members['TALENT'] = ['TALENT', 'JOEY'];
  await page.goto('/worksheet/?act=y3w1#room=Y3.1&name=TALENT&round=2&done=1');
  await expect(page.locator('.cardx')).toHaveCount(16);
  await expect(page.locator('.cardx[data-id="a2"]')).toHaveCount(1);
  await expect(page.locator('.cardx[data-id="a9"]')).toHaveCount(0);
  await expect(page.locator('#result')).toHaveText('ถูก 15/16 ใบ');
  await expect(page.locator('#pName')).toHaveText('JOEY');
  await page.click('#edit');
  await expect(page).not.toHaveURL(/done=1/);
  await expect(page.locator('#pool .cardx')).toHaveCount(16);
  await expect(page.locator('.cardx[data-id="a9"]')).toHaveCount(1);
});
