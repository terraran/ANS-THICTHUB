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
  await expect(page.locator('.card')).toHaveCount(2);   // Y3 เห็นแค่เกมของ Y3 (ผจญภัย + ตั้งโปรไฟล์)
  await expect(page.locator('.card[data-act="profile"] .lockbox')).toBeVisible();   // ครูยังไม่เปิด
  await expect(page.locator('.card[data-act="profile"] button')).toHaveCount(0);
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

test('ออกจากระบบ: ลืมชื่อในเครื่องนี้ กด THAI ICT แล้วต้องเลือกห้องใหม่', async ({ page }) => {
  mockApi(page);
  await page.goto('/#/lib/Y3.2/' + encodeURIComponent('ขิม'));
  await expect(page.locator('.me b')).toHaveText('สวัสดี ขิม!');
  await page.click('[data-logout]');
  await expect(page.locator('#goIct')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ansHub.me'))).toBeNull();
  await page.click('#goIct');
  await expect(page).toHaveURL(/#\/rooms$/);
  await page.click('[data-lang="en"]');
  await page.goto('/#/lib/Y3.2/' + encodeURIComponent('ขิม'));
  await expect(page.locator('[data-logout]')).toHaveText('🚪 Log out');
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
  await page.goto('/games/detective.html');
  await expect(page.locator('#gback')).toBeHidden();
  await page.click('#goE');
  for (let i = 0; i < 12; i++) {
    await page.click('#pChat');                            // แตะแชทเพื่อข้ามให้เทสต์เร็ว
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
  await page.click('#eTitle'); await page.click('#goN'); await page.click('#pChat');
  await page.click('.sg[data-n="0"]'); await page.click('.sg[data-n="2"]');
  expect(await page.evaluate(() => [...pick])).toEqual([2]);
  await expect(page.locator('#pHint')).toBeHidden();
  expect(errs).toEqual([]);
});

test('เกมนักสืบแชท: แชทค่อย ๆ เด้ง (แม้เครื่องปิดภาพเคลื่อนไหว) ปุ่มล็อกจนข้อความมาครบ แตะแชทเพื่อข้ามได้', async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });   // เครื่องนักเรียนที่ปิด "แสดงภาพเคลื่อนไหว" ใน Windows
  await page.goto('/games/detective.html');
  await page.click('#goN');
  await expect(page.locator('.sg').first()).toBeDisabled();
  await expect(page.locator('#pLines .ln.typing')).toBeVisible();
  await expect(page.locator('#pLines .ln:not(.typing)')).toHaveCount(1);
  await page.click('#pChat');
  await expect(page.locator('#pLines .ln:not(.typing)')).toHaveCount(3);
  // บทสนทนาเป็นเรื่องเดียวกับข้อความที่ต้องสืบ: คนนั้นทัก → เราตอบ → ข้อความที่ต้องสืบ
  const m = await page.evaluate(() => deck[0]);
  await expect(page.locator('#pLines .ln .bub')).toHaveText([m.o.th, m.r.th, m.th]);
  await expect(page.locator('.sg').first()).toBeEnabled();
  // ข้อความถัดไปเล่นแชทเองจนครบโดยไม่ต้องแตะ
  await page.click('.sg[data-n="0"]'); await page.click('#pCheck'); await page.click('#pNext');
  await expect(page.locator('#pLines .ln.target')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('#pLines .ln.target')).toHaveCSS('opacity', '1');
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

// ---- สัปดาห์ 2: Double Bubble (Y3) · Flow Map (Y4) ----
async function placeAll(page, C, wrong = {}) {
  await expect(page.locator('#pool .cardx')).toHaveCount(C.cards.length);
  for (const c of C.cards) { await page.click(`.cardx[data-id="${c.id}"]`); await page.click(`.bin[data-bin="${wrong[c.id] || c.bin}"] h2`); }
}

test('เนื้อหาสัปดาห์ 2: การ์ดทุกใบอยู่ในกล่องที่มีจริง · ช่องเขียนชี้กล่องที่มีจริง · id ไม่ซ้ำ', async () => {
  for (const id of ['y3w2', 'y4w2']) {
    const C = content(id), bins = C.bins.map(b => b.id);
    expect(C.act).toBe(id);
    expect(new Set(C.cards.map(c => c.id)).size).toBe(C.cards.length);
    for (const c of C.cards) { expect(bins).toContain(c.bin); expect(c.text.th && c.text.en && c.why.th && c.why.en).toBeTruthy(); }
    if (C.cards.length) for (const b of bins) expect(C.cards.some(c => c.bin === b)).toBe(true);
    for (const f of C.write.fields) if (f.in) expect(bins).toContain(f.in);
  }
  const y3 = content('y3w2');
  expect(y3.map).toBe('bubble');
  expect(['a', 'b', 'm'].map(b => y3.cards.filter(c => c.bin === b).length)).toEqual([5, 5, 2]);   // 12 ฟอง: บอกได้ 5 ส่วนตัว 5 เหมือนกัน 2
  expect(y3.add).toBeUndefined();                                  // ไม่ต้องพิมพ์ฟองเอง
  for (const k of ['share', 'priv']) expect(y3.write.fields.filter(f => f.id.startsWith(k))).toHaveLength(3);   // ยกตัวอย่างหัวข้อละ 3
  expect(y3.noReason).toBe(true);
  // Y4: ไม่มีการ์ด · เลือก 1 จาก 3 เรื่อง แต่ละเรื่องมีการ์ตูน 4 ฉาก + คำถามปิดท้าย · กล่องสัญญาณ + เด็กเพิ่มกล่องเอง
  const y4 = content('y4w2');
  expect(y4.cards).toEqual([]);
  expect(y4.noReason).toBe(true);
  expect(y4.bins.map(b => b.id)).toEqual(['sig']);
  expect(y4.write.fields).toEqual([]);
  expect(y4.write.flex).toMatchObject({ min: 1, max: 6 });
  expect(new Set(y4.write.flex.signs.map(g => g.id)).size).toBe(y4.write.flex.signs.length);
  for (const g of y4.write.flex.signs) expect(g.text.th && g.text.en).toBeTruthy();
  expect(y4.write.choose).toHaveLength(3);
  for (const c of y4.write.choose) {
    expect(c.scenes).toHaveLength(4);
    expect(c.text.th && c.text.en && c.ask.th && c.ask.en).toBeTruthy();
    expect(c.thumb.length).toBeGreaterThan(0);
    for (const sc of c.scenes) { expect(sc.say.th && sc.say.en).toBeTruthy(); expect(sc.art.length).toBeGreaterThan(0); if (sc.phone) expect(sc.phone.text.th && sc.phone.text.en).toBeTruthy(); }
  }
  const acts = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/activities.json'), 'utf8')).activities;
  for (const id of ['y3w2', 'y4w2']) expect(acts.find(a => a.id === id)).toMatchObject({ week: 2, kind: 'sheet', path: 'worksheet/?act=' + id });
});
// SHOTS=<โฟลเดอร์> npx playwright test = เก็บภาพหน้าจอไว้ให้ครูดู
const shot = (page, name) => process.env.SHOTS ? page.screenshot({ path: path.join(process.env.SHOTS, name + '.png') }) : null;
// Double Bubble: แตะฟอง แล้วแตะหัวข้อ (m = แตะทั้งสองหัวข้อ)
const TOPICS = { a: ['#topA'], b: ['#topB'], m: ['#topA', '#topB'] };
async function linkAll(page, C, wrong = {}) {
  await expect(page.locator('#web .cardx.free')).toHaveCount(C.cards.length);
  for (const c of C.cards) { await page.click(`.cardx[data-id="${c.id}"]`); for (const tp of TOPICS[wrong[c.id] || c.bin]) await page.click(tp) }
}

test('Y3 สัปดาห์ 2 Double Bubble: ฟองลอยในแผนภาพ ต่อเส้นครบ 12 ฟอง → ยกตัวอย่างหัวข้อละ 3 → เด้งคำถาม FoR → ส่ง → เปิดดูงานที่ส่ง', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });           // ฟองไม่ลอย ให้คลิกได้แม่น
  const api = mockApi(page, { open: { y3w1: true, y3w2: true } });
  await page.goto('/#/lib/Y3.2/' + encodeURIComponent('ขิม'));
  await page.click('.card[data-act="y3w2"] a.btn');
  const C = content('y3w2');
  await expect(page.locator('#s1')).toHaveText('1 เปรียบเทียบ');
  await expect(page.locator('#s3')).toHaveText('3 คิดย้อนกลับ');
  await expect(page.locator('#s4')).toBeHidden();                 // ไม่มีขั้นให้เหตุผล
  await expect(page.locator('#stag')).toHaveText('ขั้น 1 / 3');
  await expect(page.locator('#topA')).toHaveText('ข้อมูล\nที่บอกได้');
  await expect(page.locator('.bin')).toHaveCount(0);
  await expect(page.locator('#poolWrap')).toBeHidden();               // ไม่มีกองการ์ดด้านซ้าย ฟองลอยในแผนภาพเลย
  await expect(page.locator('#web .cardx.free')).toHaveCount(12);
  await expect(page.locator('#adder')).toBeHidden();              // ไม่มีช่องพิมพ์ฟองเอง
  // แตะฟอง → หัวข้อเรืองแสง · แตะหัวข้อ → ฟองลอยไปข้าง ๆ หัวข้อ มีเส้นเชื่อม · แตะหัวข้อเดิมอีกครั้ง = ตัดเส้น กลับกองซ้าย
  await page.click('.cardx[data-id="a1"]');
  await expect(page.locator('#map')).toHaveClass(/picking/);
  await page.click('#topB');
  await expect(page.locator('#web .cardx[data-id="a1"]')).not.toHaveClass(/free/);
  await expect(page.locator('#links line')).toHaveCount(1);
  await page.click('#topA');                                      // ต่อทั้งคู่ = เหมือนกัน (เส้น 2 เส้น อยู่ตรงกลาง)
  await expect(page.locator('#links line')).toHaveCount(2);
  expect(await page.evaluate(() => document.querySelector('.cardx[data-id="a1"]').style.left)).toBe('50%');
  await page.click('#topA'); await page.click('#topB');
  await expect(page.locator('#web .cardx[data-id="a1"]')).toHaveClass(/free/);
  await expect(page.locator('#links line')).toHaveCount(0);
  await page.click('#topA');                                      // ต่อใหม่ แล้วแตะที่เส้น = เส้นหายไป ฟองกลับไปลอย
  await expect(page.locator('#links line')).toHaveCount(1);
  await page.waitForTimeout(700);                                 // รอฟองเลื่อนเข้าที่ก่อนวัดตำแหน่งเส้น
  const fb = await page.locator('.cardx[data-id="a1"]').boundingBox(), tb = await page.locator('#topA').boundingBox();
  await page.mouse.click((fb.x + fb.width + tb.x) / 2, tb.y + tb.height / 2);   // แตะกลางเส้นระหว่างฟองกับหัวข้อ
  await expect(page.locator('#links line')).toHaveCount(0);
  await expect(page.locator('#web .cardx[data-id="a1"]')).toHaveClass(/free/);
  await expect(page.locator('#map')).not.toHaveClass(/picking/);

  await linkAll(page, C, { m1: 'b' });                           // ตั้งใจต่อ "เกี่ยวกับตัวเรา" ไปฝั่งส่วนตัวอย่างเดียว
  await expect(page.locator('#links line')).toHaveCount(13);
  await expect(page.locator('#next')).toBeEnabled();
  await shot(page, '1-link');
  await page.click('#next');                                     // ขั้น 2 ยกตัวอย่าง
  await expect(page.locator('#stag')).toHaveText('ขั้น 2 / 3');
  await expect(page.locator('#adder')).toBeHidden();
  await expect(page.locator('#writer')).toBeVisible();
  await expect(page.locator('#map')).not.toHaveClass(/picking/);
  await expect(page.locator('#next')).toBeDisabled();
  await expect(page.locator('#wgrid [data-f]')).toHaveCount(6);
  const ex = { share1: 'สีที่ชอบ', priv1: 'ที่อยู่บ้าน', share2: 'การ์ตูนที่ชอบ', priv2: 'รหัสผ่าน', share3: 'อาหารที่ชอบ', priv3: 'เบอร์โทร' };
  for (const [k, v] of Object.entries(ex).slice(0, 5)) await page.fill(`[data-f="${k}"]`, v);
  await expect(page.locator('#next')).toBeDisabled();             // ต้องครบ 6 ช่อง
  await page.fill('[data-f="priv3"]', ex.priv3);
  await shot(page, '2-examples');
  await page.click('#next');                                     // เด้งคำถาม FoR เลย
  await expect(page.locator('#forPanel')).toBeVisible();
  await expect(page.locator('#s3')).toHaveClass(/on/);
  await expect(page.locator('#frq')).toHaveText('เรารู้ได้อย่างไรว่าลักษณะไหนเหมือนกัน ลักษณะไหนต่างกัน?');
  await page.click('#forBack');
  await expect(page.locator('#forPanel')).toBeHidden();
  await expect(page.locator('#stag')).toHaveText('ขั้น 2 / 3');
  await page.click('#next');
  await page.fill('#fr', 'เรารู้เพราะดูว่าทำให้คนอื่นหาเราเจอไหม');
  await shot(page, '3-for');
  await page.click('#check');
  await expect(page.locator('#sent')).toHaveClass(/ok/);
  await expect(page.locator('#result')).toHaveText('ถูก 11/12 ใบ');
  await expect(page.locator('#links line.bad')).toHaveCount(1);   // เส้นของฟองที่ผิดเป็นสีแดง
  await page.hover('.cardx[data-id="m1"]');
  await expect(page.locator('.cardx[data-id="m1"] .exp')).toBeVisible();
  await expect(page.locator('.cardx[data-id="m1"] .exp')).toContainText('ควรอยู่ใน "🤝 เหมือนกัน"');
  await expect(page.locator('[data-f="priv2"]')).toHaveJSProperty('readOnly', true);
  await expect(page.locator('#mine')).toHaveText('🧭 คิดย้อนกลับ: เรารู้เพราะดูว่าทำให้คนอื่นหาเราเจอไหม');
  await shot(page, '4-result');

  const row = api.posts[0].row;
  expect(row).toHaveLength(15);
  expect(row.slice(0, 7)).toEqual(['Y3', 2, 'ข้อมูลนี้ บอกได้ หรือ ไม่ควรบอก?', 'Y3.2', 'ขิม', 'TH', '11/12']);
  expect(row[7]).toBe('เป็นเรื่องเกี่ยวกับตัวเรา');
  expect(row[8]).toBe('-');
  expect(row[9]).toBe(Object.entries(ex).map(([k, v]) => (k[0] === 's' ? '🟢 ตัวอย่างข้อมูลที่บอกได้: ' : '🔴 ตัวอย่างข้อมูลส่วนตัว: ') + v).join(' | '));
  expect(row[10]).toBe(''); expect(row[11]).toBe('');
  const d = JSON.parse(row[12]);
  expect(d).toMatchObject({ v: 3, act: 'y3w2', map: 'bubble', hes: '', write: { pick: '', f: ex }, signs: {} });
  expect(d.place).toEqual(Object.fromEntries(C.cards.map(c => [c.id, c.id === 'm1' ? 'b' : c.bin])));
  expect(d.own).toBeUndefined();                                  // ไม่มีฟองที่พิมพ์เอง

  // เปิดอีกครั้งจากคลัง = เห็นงานที่ส่ง พร้อมเส้นเชื่อม และตัวอย่าง
  await page.click('#lib2');
  await page.click('.card[data-act="y3w2"] a.btn');
  await expect(page.locator('#result')).toHaveText('ถูก 11/12 ใบ');
  await expect(page.locator('#links line')).toHaveCount(13);
  await expect(page.locator('[data-f="share2"]')).toHaveValue('การ์ตูนที่ชอบ');
  await page.click('#edit');
  await expect(page.locator('#web .cardx.free')).toHaveCount(0);
  await expect(page.locator('#links line.bad')).toHaveCount(0);
  await expect(page.locator('#next')).toBeEnabled();
  expect(errs).toEqual([]);
});

test('Y3 สัปดาห์ 2: ลากเส้นจากฟองไปหาหัวข้อได้ · งานค้างเก็บเส้น · เปิดอีกเครื่องกลับมาขั้น 2', async ({ page, browser }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const api = mockApi(page, { open: { y3w2: true } });
  await page.goto('/worksheet/?act=y3w2#room=Y3.2&name=' + encodeURIComponent('ขิม'));
  // ลากจากฟองไปปล่อยบนหัวข้อ
  const from = await page.locator('.cardx[data-id="b1"]').boundingBox(), to = await page.locator('#topB').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + to.height / 2, { steps: 8 });
  await expect(page.locator('#dragLine')).toBeVisible();
  await expect(page.locator('#topB')).toHaveClass(/hover/);
  await page.mouse.up();
  await expect(page.locator('#dragLine')).toBeHidden();
  await expect(page.locator('#web .cardx[data-id="b1"]')).not.toHaveClass(/free/);
  await expect(page.locator('#links line')).toHaveCount(1);
  await linkAll(page, Object.assign({}, content('y3w2'), { cards: content('y3w2').cards.filter(c => c.id !== 'b1') }));
  await page.click('#next');
  await page.fill('[data-f="share1"]', 'สีที่ชอบ');
  await page.click('#toLib');
  await expect.poll(() => { const d = api.drafts['Y3.2|ขิม|y3w2']; return d && Object.keys(d.data.placed).length; }).toBe(12);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const p2 = await ctx.newPage();
  mockApi(p2, { open: { y3w2: true } }, api);
  await p2.goto('/worksheet/?act=y3w2#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&draft=1');
  await expect(p2.locator('#s2')).toHaveClass(/on/);
  await expect(p2.locator('#web .cardx')).toHaveCount(12);
  await expect(p2.locator('#links line')).toHaveCount(14);
  await expect(p2.locator('[data-f="share1"]')).toHaveValue('สีที่ชอบ');
  await ctx.close();
});

test('Y4 สัปดาห์ 2 Flow Map: เลือกเรื่อง → ดูการ์ตูนจบ → เลือกสัญญาณ + เพิ่มกล่องเอง → เด้งคำถาม FoR → ส่ง · งานค้างทำต่อได้', async ({ page, browser }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const api = mockApi(page, { open: { y4w2: true } });
  await page.goto('/worksheet/?act=y4w2#room=Y4.1&name=' + encodeURIComponent('เมษา') + '&lang=en');
  const C = content('y4w2'), p2s = C.write.choose.find(c => c.id === 'p2');
  await expect(page.locator('#s1')).toHaveText('1 Watch');
  await expect(page.locator('#s3')).toHaveText('3 Look back');
  await expect(page.locator('#s4')).toBeHidden();
  await expect(page.locator('#stag')).toHaveText('Step 1 / 3');
  await expect(page.locator('#poolWrap')).toBeHidden();             // ไม่มีการ์ดให้ลาก
  await expect(page.locator('.cardx')).toHaveCount(0);
  await expect(page.locator('#map')).toBeHidden();
  await expect(page.locator('#story')).toBeVisible();
  await expect(page.locator('#wch')).toBeHidden();                // เลือกเรื่องในหน้าเลือกเรื่องตรงกลางแทน
  await expect(page.locator('.chooser h2')).toHaveText('🎬 Pick a story to watch');
  await expect(page.locator('.scard')).toHaveCount(3);
  await expect(page.locator('.sbar')).toBeHidden();
  await expect(page.locator('#next')).toBeDisabled();
  await shot(page, 'y4w2-0-choose');
  await page.click('.scard[data-p="p1"]');
  await expect(page.locator('.scn .say')).toHaveText(C.write.choose[0].scenes[0].say.en);
  await page.click('#change');                                     // เปลี่ยนเรื่องได้
  await expect(page.locator('.scard[data-p="p1"]')).toHaveClass(/on/);
  await page.click('.scard[data-p="p2"]');
  await expect(page.locator('.scn .say')).toHaveText(p2s.scenes[0].say.en);
  await shot(page, 'y4w2-1-scene1');
  await expect(page.locator('.dot[data-i="1"]')).toHaveClass(/on/, { timeout: 6000 });   // เล่นต่อฉากถัดไปเอง
  await expect(page.locator('.scn .pmsg')).toHaveText(p2s.scenes[1].phone.text.en);
  await shot(page, 'y4w2-2-scene2');
  await expect(page.locator('#next')).toBeDisabled();             // ยังดูไม่จบ
  await page.click('.dot[data-i="4"]');
  await expect(page.locator('.scn .say.big')).toHaveText(p2s.ask.en);
  await expect(page.locator('#next')).toBeEnabled();
  await page.click('#next');

  // ขั้น 2: เริ่มมีแค่กล่องสัญญาณ + กล่องจาง ๆ ให้เพิ่ม
  await expect(page.locator('#stag')).toHaveText('Step 2 / 3');
  await expect(page.locator('#story')).toBeHidden();
  await expect(page.locator('#strip .mini')).toHaveCount(4);
  await expect(page.locator('.bin.sig h2')).toHaveText('👀 Signs');
  await expect(page.locator('.sg[data-sg]')).toHaveCount(C.write.flex.signs.length);
  await expect(page.locator('.bin.stp')).toHaveCount(0);
  await expect(page.locator('.gbox')).toBeVisible();
  await shot(page, 'y4w2-3-start');
  await page.click('.sg[data-sg="g5"]');
  await expect(page.locator('.sg[data-sg="g5"]')).toHaveClass(/on/);
  await page.fill('#sgTx', 'Wants it fast'); await page.press('#sgTx', 'Enter');
  await expect(page.locator('.sg.own')).toHaveText(/Wants it fast/);
  await expect(page.locator('#next')).toBeDisabled();             // ยังไม่มีกล่องขั้นต่อไป
  await page.click('.gbox');
  await expect(page.locator('.bin.stp')).toHaveCount(1);
  await expect(page.locator('[data-st="0"]')).toBeFocused();
  await expect(page.locator('#next')).toBeDisabled();             // กล่องยังว่าง
  await page.keyboard.type('Tell Fern to stop');
  await expect(page.locator('#next')).toBeEnabled();
  await page.click('.gbox');
  await page.keyboard.type('Tell a teacher');
  await page.hover('.slot >> nth=1');                              // ชี้ลูกศรระหว่างกล่อง = ถามว่าเพิ่มตรงนี้ไหม
  await expect(page.locator('.slot >> nth=1').locator('.plus')).toHaveCSS('opacity', '1');
  await expect(page.locator('.slot >> nth=1').locator('.plus')).toContainText('Add a box here?');
  await shot(page, 'y4w2-4-hover');
  await page.click('.slot >> nth=1 >> .plus');
  await expect(page.locator('.bin.stp')).toHaveCount(3);
  await expect(page.locator('[data-st="1"]')).toHaveValue('');
  await expect(page.locator('[data-st="2"]')).toHaveValue('Tell a teacher');
  await page.keyboard.type('Do not send a photo');
  await expect(page.locator('.stp .no')).toHaveText(['2', '3', '4']);
  await page.click('.gbox'); await page.click('[data-del="3"]');  // เพิ่มแล้วลบได้
  await expect(page.locator('.bin.stp')).toHaveCount(3);
  for (let i = 3; i < C.write.flex.max; i++) await page.click('.gbox');
  await expect(page.locator('.bin.stp')).toHaveCount(C.write.flex.max);
  await expect(page.locator('.gbox')).toHaveCount(0);             // ครบสูงสุดแล้ว
  await expect(page.locator('.wrapline')).toBeVisible();         // เกินแถวแรก = ขึ้นแถวใหม่ มีลูกศรหักมุม
  const [r2, r5] = [await page.locator('.bin.stp >> nth=0').boundingBox(), await page.locator('.bin.stp >> nth=3').boundingBox()];
  expect(r5.y).toBeGreaterThan(r2.y + r2.height);                 // ขั้น 5 อยู่แถวล่าง
  expect(Math.abs(r5.width - r2.width)).toBeLessThan(2);          // กล่องไม่หดตามจำนวน
  await shot(page, 'y4w2-5b-max');
  for (let i = C.write.flex.max - 1; i >= 3; i--) await page.click(`[data-del="${i}"]`);
  await shot(page, 'y4w2-5-write');
  await page.click('#toLib');                                     // ออกกลางทาง = บันทึกงานค้าง
  await expect.poll(() => { const d = api.drafts['Y4.1|เมษา|y4w2']; return d && d.data.write.st; })
    .toEqual(['Tell Fern to stop', 'Do not send a photo', 'Tell a teacher']);

  // อีกเครื่อง: ทำต่อที่ขั้น 2 · กลับไปดูการ์ตูนอีกครั้งได้โดยไม่ต้องดูใหม่จนจบ
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const p2 = await ctx.newPage();
  mockApi(p2, { open: { y4w2: true } }, api);
  await p2.goto('/worksheet/?act=y4w2#room=Y4.1&name=' + encodeURIComponent('เมษา') + '&lang=en&draft=1');
  await expect(p2.locator('#s2')).toHaveClass(/on/);
  await expect(p2.locator('[data-st="2"]')).toHaveValue('Tell a teacher');
  await expect(p2.locator('.sg.on')).toHaveCount(2);
  await p2.click('#again');
  await expect(p2.locator('#s1')).toHaveClass(/on/);
  await expect(p2.locator('.scn .say.big')).toHaveText(p2s.ask.en);   // ดูจบแล้ว ไม่ต้องดูใหม่
  await expect(p2.locator('#next')).toBeEnabled();
  await p2.click('#next');
  await p2.click('#next');                                        // ขั้น 2 เสร็จ = เด้งคำถาม FoR
  await expect(p2.locator('#forPanel')).toBeVisible();
  await expect(p2.locator('#stag')).toHaveText('Step 3 / 3');
  await p2.fill('#fr', 'Skipping a step is not safe');
  await p2.click('#check');
  await expect(p2.locator('#sent')).toHaveClass(/ok/);
  await expect(p2.locator('#result')).toHaveText('✍️');
  await expect(p2.locator('#task')).toContainText('Your teacher will read it');
  await expect(p2.locator('[data-st="0"]')).toHaveJSProperty('readOnly', true);
  await expect(p2.locator('.gbox, .plus, .bin.stp .x, #sgTx')).toHaveCount(0);   // ส่งแล้วแก้ไม่ได้
  await shot(p2, 'y4w2-6-sent');
  const row = api.posts[0].row;
  expect(row.slice(0, 2)).toEqual(['Y4', 2]);
  expect(row[5]).toBe('EN');
  expect(row[6]).toBe('✓');
  expect(row[9]).toBe('ใบเฟิร์นกับเพชรฟรี | สัญญาณ: ขอรูปของเรา, Wants it fast | ขั้น 2: Tell Fern to stop | ขั้น 3: Do not send a photo | ขั้น 4: Tell a teacher');
  const d = JSON.parse(row[12]);
  expect(d).toMatchObject({ act: 'y4w2', map: 'flow', place: {}, write: { pick: 'p2', sg: ['g5'], so: ['Wants it fast'] }, fr: 'Skipping a step is not safe' });
  await ctx.close();

  // เปิดงานที่ส่งแล้ว (done=1): เห็นสัญญาณ + กล่องที่เขียน · แก้แล้วส่งใหม่ได้
  await page.goto('/worksheet/?act=y4w2#room=Y4.1&name=' + encodeURIComponent('เมษา') + '&lang=en&done=1');
  await expect(page.locator('#result')).toHaveText('✍️');
  await expect(page.locator('.bin.stp')).toHaveCount(3);
  await expect(page.locator('[data-st="1"]')).toHaveValue('Do not send a photo');
  await page.click('#edit');
  await expect(page.locator('#story')).toBeVisible();
  await page.click('#next');
  await expect(page.locator('.gbox')).toBeVisible();
  expect(errs).toEqual([]);
});

test('เกมสัปดาห์ 2: แถวเกมใน activities ชี้ไฟล์จริง · ล็อกด้วยใบงานคู่ · ใบงานพาไปเกม', async () => {
  const A = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/activities.json'), 'utf8')).activities;
  for (const [sheet, game, level] of [['y3w2', 'profile', 'Y3'], ['y4w2', 'rescue', 'Y4']]) {
    const g = A.find(a => a.id === game);
    expect(g).toMatchObject({ kind: 'game', level, ownBack: true, requires: sheet, path: `games/${game}.html` });
    expect(g.tag.th && g.tag.en && g.title.th && g.title.en).toBeTruthy();
    expect(fs.existsSync(path.join(__dirname, '..', g.path))).toBe(true);
    expect(A.find(a => a.id === sheet).afterGame).toBe(game);
  }
});

test('เกมตั้งโปรไฟล์ (Y3): ช่องที่ต้องซ่อนไม่เท่ากัน · ปุ่มเหมือนกัน · ถามครู · เล่นจบได้ดาวเต็ม', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/profile.html');
  await expect(page.locator('#gback')).toBeHidden();
  await page.click('#goE');
  // จำนวนช่องที่ต้องซ่อน 2, 3, 4 (สลับลำดับ) · ช่องชื่อเดียวกันไม่อยู่โปรไฟล์เดียวกัน
  const P = await page.evaluate(() => profs.map(p => ({ n: p.rows.length, k: p.rows.filter(f => f.p).length, g: p.rows.filter(f => f.g).length })));
  expect(P.map(p => p.k).sort()).toEqual([2, 3, 4]);
  for (const p of P) { expect(p.n).toBe(6); expect(p.g).toBeLessThanOrEqual(1); }
  // ปุ่มโชว์/ซ่อนทุกแถวหน้าตาเหมือนกัน ไม่บอกใบ้คำตอบ
  const looks = await page.locator('.fr').evaluateAll(rs => rs.map(r => r.className + r.querySelector('.tg').innerHTML));
  expect(new Set(looks).size).toBe(1);
  // ถามครู: แตะช่อง → ครูบอกพร้อมเหตุผล · ตัวช่วยลดลง
  await expect(page.locator('#pHelp')).toHaveText('🙋 ถามครู (เหลือ 3)');
  await page.click('#pHelp'); await page.locator('.fr .lab').first().click();
  await expect(page.locator('.fr').first().locator('.tip')).toContainText('ครูบอกว่า');
  await expect(page.locator('#pHelp')).toHaveText('🙋 ถามครู (เหลือ 2)');
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('#pPost')).toBeDisabled();
    const rows = await page.evaluate(() => profs[idx].rows.map(f => [f.id, f.p]));
    for (const [id, p] of rows) await page.click(`.fr[data-id="${id}"] .tg button[data-v="${p}"]`);
    await page.click('#pPost');
    await expect(page.locator('#pRes')).toHaveClass(/good/);
    await expect(page.locator('.fr.right')).toHaveCount(6);
    await page.click('#pNext');
  }
  await expect(page.locator('#eStars')).toHaveText('ได้ดาว 18 จาก 18 ดวง');
  await expect(page.locator('#eRank')).toHaveText('ฮีโร่ระดับทอง');
  // ตอบผิด: แถวแดงพร้อมเหตุผล · ภาษาอังกฤษ
  await page.click('#len'); await page.click('#eTitle'); await page.click('#goN');
  await expect(page.locator('#pHelp')).toHaveText('🙋 Ask the teacher (1 left)');
  const rows = await page.evaluate(() => profs[0].rows.map(f => [f.id, f.p]));
  for (const [id, p] of rows) await page.click(`.fr[data-id="${id}"] .tg button[data-v="${1 - p}"]`);
  await page.click('#pPost');
  await expect(page.locator('.fr.wrong')).toHaveCount(6);
  await expect(page.locator('.fr.wrong .tip').first()).toContainText('✗');
  await expect(page.locator('#pRes')).toHaveClass(/no/);
  expect(errs).toEqual([]);
});

test('เกมตั้งโปรไฟล์ (Y3): โหมดยาก 8 ช่อง จับเวลา · เครื่องปิดภาพเคลื่อนไหวยังเห็นทุกแถว', async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/games/profile.html');
  await page.click('#goH');
  await expect(page.locator('.fr')).toHaveCount(8);
  await expect(page.locator('.fr').last()).toHaveCSS('opacity', '1');
  await expect(page.locator('#hTime')).toBeVisible();
  await expect(page.locator('#pHelper')).toBeHidden();
  expect((await page.evaluate(() => profs.map(p => p.rows.filter(f => f.p).length))).sort()).toEqual([3, 4, 5]);
  await page.evaluate(() => { left = 1; });                 // หมดเวลา = โพสต์เอง ช่องที่ไม่ได้เลือกนับว่าผิด
  await expect(page.locator('#pRes')).toContainText('หมดเวลา!', { timeout: 3000 });
  await expect(page.locator('.fr.wrong')).toHaveCount(8);
});

test('เกมกู้ภัยแชท (Y4): เพื่อนอยู่คนละขั้น · ตัวเลือกหน้าตาเหมือนกัน · ผิดแล้วเพื่อนเล่าผล · เล่นจบได้ดาว', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/rescue.html');
  await expect(page.locator('#gback')).toBeHidden();
  await page.click('#goN');
  expect((await page.evaluate(() => team.map(m => m.step))).sort()).toEqual([0, 1, 2]);
  await expect(page.locator('.fbtn.new')).toHaveCount(3);
  await expect(page.locator('.track')).toHaveCount(0);       // ปกติ: ไม่บอกขั้นที่เพื่อนอยู่
  // ตอบผิดก่อน 1 ครั้งกับเพื่อนคนแรก
  await page.click('.fbtn[data-i="0"]'); await page.click('#cChat');
  await expect(page.locator('.map .now')).toHaveCount(0);
  const ops = page.locator('.op');
  await expect(ops).toHaveCount(3);
  const who = await page.evaluate(() => team[0].F.who);
  for (const tx of await ops.allTextContents()) expect(tx).toContain(who);   // ทุกตัวเลือกพูดถึงคนหลอกเหมือนกัน
  expect(new Set(await ops.evaluateAll(b => b.map(x => x.className))).size).toBe(1);
  const wrong = await page.evaluate(() => team[0].opts.find(o => !/^r\d$/.test(o)));
  await page.click(`.op[data-o="${wrong}"]`); await page.click('#cChat');
  await expect(page.locator('.ln.me.x')).toHaveCount(1);
  await expect(page.locator(`.op[data-o="${wrong}"]`)).toHaveClass(/wrong/);
  await expect(page.locator(`.op[data-o="${wrong}"]`)).toBeDisabled();
  await expect(page.locator('#cRes')).toHaveClass(/no/);
  // ตอบถูกทุกขั้นจนทุกคนปลอดภัย · ตอบถูกแล้วเพื่อนพิมพ์ขั้นถัดไปต่อในแชทเดิม กลับกล่องแชทแค่ตอนเพื่อนถึงรายงานแล้ว
  let opened = 1;
  for (let guard = 0; guard < 20; guard++) {
    if (await page.locator('#sInbox').isVisible()) {
      const i = await page.evaluate(() => team.findIndex(m => m.step < 4));
      await page.click(`.fbtn[data-i="${i}"]`); await page.click('#cChat'); opened++;
    }
    const r = await page.evaluate(() => team[cur].opts.find(o => /^r\d$/.test(o)));
    await page.click(`.op[data-o="${r}"]`); await page.click('#cChat');
    if (await page.evaluate(() => team[cur].step < 4)) {
      await expect(page.locator('#cNext')).toBeHidden();
      await expect(page.locator('#cLines .ln.typing')).toBeVisible();   // ข้อความขั้นถัดไปกำลังมา
      await page.click('#cChat');
      await expect(page.locator('.op').first()).toBeEnabled();
      continue;
    }
    await expect(page.locator('#cNext')).toBeVisible();
    const last = await page.evaluate(() => team.every(m => m.step > 3));
    await page.click('#cNext');
    if (last) break;
  }
  expect(opened).toBe(3);                                      // เปิดแชทเพื่อนคนละครั้งเดียว
  await expect(page.locator('#eStars')).toHaveText('ได้ดาว 8 จาก 9 ดวง');   // 9 ขั้น (4+3+2) เสียดาวข้อที่ตอบผิดไป 1
  await expect(page.locator('#eRank')).toHaveText('กู้ภัยระดับเงิน');
  expect(errs).toEqual([]);
});

test('เกมกู้ภัยแชท (Y4): ง่ายบอกขั้น · ข้อความค่อย ๆ เด้ง (แม้ปิดภาพเคลื่อนไหว) · ยาก 4 คนจับเวลา · EN', async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/games/rescue.html');
  await page.click('#goE');
  await expect(page.locator('.track')).toHaveCount(3);
  await page.click('.fbtn[data-i="0"]');
  await expect(page.locator('.op').first()).toBeDisabled();  // ล็อกจนข้อความเพื่อนมาครบ
  await expect(page.locator('#cLines .ln.typing')).toBeVisible();
  await expect(page.locator('#cLines .ln.cur')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#cLines .ln.cur')).toHaveCSS('opacity', '1');
  await expect(page.locator('.op').first()).toBeEnabled();
  const s = await page.evaluate(() => team[0].step);
  await expect(page.locator('.map span.now')).toHaveText(['👀 สังเกต', '🤔 สงสัย', '🙋 สอบถาม'][s]);
  // ยาก: 4 คน · หมดเวลา = เฉลยข้อถูก ไม่ได้ดาว แล้วเพื่อนไปขั้นต่อไป
  await page.click('#len'); await page.click('#cBackIn');
  await page.evaluate(() => toTitle()); await page.click('#goH');
  await expect(page.locator('.fbtn')).toHaveCount(4);
  await page.click('.fbtn[data-i="0"]'); await page.click('#cChat');
  await expect(page.locator('#hTime')).toBeVisible();
  const st0 = await page.evaluate(() => team[0].step);
  await page.evaluate(() => { left = 1; });
  await expect(page.locator('#cRes')).toHaveText('Time is up! The right reply is now in the chat (no star)', { timeout: 6000 });
  await expect(page.locator('#hStar')).toHaveText('⭐ 0');
  await expect(page.locator('#cRes')).toBeVisible({ timeout: 4000 });
  expect(await page.evaluate(() => team[0].step)).toBe(st0 + 1);
  // เพื่อนยังไม่ถึงรายงาน: ข้อความถัดไปมาต่อในแชทเดิม แล้วเริ่มจับเวลาใหม่
  await expect(page.locator('#cLines .ln.cur')).toHaveText(new RegExp(await page.evaluate(() => team[0].F.s[team[0].step].f.en.slice(0, 12))), { timeout: 4000 });
  await expect(page.locator('#sChat')).toBeVisible();
  await expect(page.locator('#cNext')).toBeHidden();
  await expect(page.locator('#hTime')).toBeVisible();
});
