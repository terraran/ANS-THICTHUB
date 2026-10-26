// ทดสอบ Hub + ใบงาน ทั้งเส้นทาง โดยจำลอง Apps Script (ไม่ต่อ Google จริง)
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const content = id => JSON.parse(fs.readFileSync(path.join(__dirname, '../worksheet/content', id + '.json'), 'utf8'));

function mockApi(page, { open = { y3w1: true, y4w1: true, adventure: true } } = {}) {
  const api = { posts: [], done: {} };
  page.route('**/fonts.googleapis.com/**', r => r.abort());
  page.route('**/script.google.com/**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      const b = JSON.parse(req.postData());
      api.posts.push(b);
      for (const m of b.members) api.done[m] = JSON.parse(b.row[12]);
      return route.fulfill({ body: 'ok' });
    }
    const p = new URL(req.url()).searchParams;
    let body;
    if (p.get('action') === 'roster') body = { ok: true, names: ['กาย', 'ขิม', 'เมษา'] };
    else if (p.get('action') === 'state') {
      const d = api.done[p.get('name')];
      body = { ok: true, open, status: d ? { [d.act]: 'done' } : {}, rounds: d ? { [d.act]: d.round } : {} };
    } else body = { ok: false, error: 'action' };
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
  // เปิดใหม่ = รอบที่ 2
  await page.click('.card[data-act="y3w1"] a.btn');
  await expect(page).toHaveURL(/round=2/);
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
  mockApi(page, { open: { adventure: true } });
  await page.goto('/#/lib/Y3.1/' + encodeURIComponent('กาย'));
  await expect(page.locator('.card[data-act="y3w1"] .lockbox')).toBeVisible();
  await expect(page.locator('.card[data-act="y3w1"] a')).toHaveCount(0);
  await page.click('[data-tab="game"]');
  await expect(page.locator('.card')).toHaveCount(1);   // Y3 เห็นแค่เกมผจญภัย
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
