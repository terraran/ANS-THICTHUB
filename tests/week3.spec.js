// สัปดาห์ 3: ใบงาน Multi-Flow Map (y3w3, y4w3) + เกม footprint (Y3) / upstander (Y4)
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const content = id => JSON.parse(fs.readFileSync(path.join(__dirname, '../worksheet/content', id + '.json'), 'utf8'));
const ACTS = () => JSON.parse(fs.readFileSync(path.join(__dirname, '../data/activities.json'), 'utf8')).activities;
const shot = (page, name) => process.env.SHOTS ? page.screenshot({ path: path.join(process.env.SHOTS, name + '.png') }) : null;

// จำลอง Apps Script แบบย่อ (เหมือน tests/hub.spec.js)
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
      body = { ok: true, last: d && d.act === p.get('act') ? { data: d, time: '2026-11-10T02:30:00.000Z', members: api.members[name] || [name] } : null };
    } else body = { ok: false, error: 'action' };
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  return api;
}

test('เนื้อหาสัปดาห์ 3: Multi-Flow Map ครบ TH/EN · แถวใน activities มี frq/afterGame · เกมล็อกด้วยใบงานคู่', async () => {
  const A = ACTS();
  for (const [id, level, game] of [['y3w3', 'Y3', 'footprint'], ['y4w3', 'Y4', 'upstander']]) {
    const C = content(id);
    expect(C).toMatchObject({ act: id, level, week: 3, map: 'multi', noReason: true, cards: [] });
    const M = C.multi;
    expect(M.min).toBeGreaterThanOrEqual(1); expect(M.max).toBeGreaterThan(M.min);
    for (const o of [C.title, C.task1, C.task4, C.think, M.event, M.cause.label, M.effect.label, ...M.cause.ph, ...M.effect.ph]) expect(o.th && o.en).toBeTruthy();
    const row = A.find(a => a.id === id);
    expect(row).toMatchObject({ level, week: 3, kind: 'sheet', path: 'worksheet/?act=' + id, afterGame: game });
    expect(row.frq.th && row.frq.en && row.frPh.th && row.frPh.en).toBeTruthy();
    const g = A.find(a => a.id === game);
    expect(g).toMatchObject({ kind: 'game', level, ownBack: true, requires: id, path: `games/${game}.html` });
    expect(g.tag.th && g.tag.en && g.title.th && g.title.en).toBeTruthy();
    expect(fs.existsSync(path.join(__dirname, '..', g.path))).toBe(true);
  }
  expect(A.find(a => a.id === 'y3w3').frq.th).toContain('สำคัญ');        // คำถามหลักข้อ 3
  expect(A.find(a => a.id === 'y4w3').frq.th).toContain('อะไรทำให้');    // คำถามหลักข้อ 2
});

test('Y3 สัปดาห์ 3 Multi-Flow Map: เพิ่ม/ลบกล่องสองฝั่ง → FoR (ขั้น 2/2) → ส่ง · งานค้างทำต่อได้ · เปิดงานที่ส่งแล้ว', async ({ page, browser }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const api = mockApi(page, { y3w3: true });
  const C = content('y3w3'), M = C.multi;
  await page.goto('/worksheet/?act=y3w3#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=th');
  await expect(page.locator('#s1')).toHaveText(C.steps.th[0]);
  await expect(page.locator('#s2')).toHaveText(C.steps.th[1]);
  await expect(page.locator('#s3')).toBeHidden(); await expect(page.locator('#s4')).toBeHidden();
  await expect(page.locator('#stag')).toHaveText('ขั้น 1 / 2');
  await expect(page.locator('#poolWrap')).toBeHidden();
  await expect(page.locator('#mev')).toHaveText(M.event.th);
  await expect(page.locator('.mcol.ca h2')).toHaveText(M.cause.label.th);
  await expect(page.locator('.mcol.ef h2')).toHaveText(M.effect.label.th);
  await expect(page.locator('.ca .mbox')).toHaveCount(1); await expect(page.locator('.ef .mbox')).toHaveCount(1);
  await expect(page.locator('.mbox .x')).toHaveCount(0);                 // กล่องเดียวลบไม่ได้
  await expect(page.locator('.ca textarea')).toHaveAttribute('placeholder', M.cause.ph[0].th);
  await expect(page.locator('#mfl path.ca')).toHaveCount(2);             // เส้น 1 + หัวลูกศร 1
  await expect(page.locator('#next')).toBeDisabled();

  await page.fill('.ca textarea >> nth=0', 'เวลาเราโพสต์รูป');
  await page.click('.madd[data-madd="ca"]');
  await expect(page.locator('.ca textarea >> nth=1')).toBeFocused();
  await expect(page.locator('.ca textarea >> nth=1')).toHaveAttribute('placeholder', M.cause.ph[1].th);
  await page.keyboard.type('เมื่อเรากดไลก์');
  await page.fill('.ef textarea >> nth=0', 'เพื่อนแคปไว้ได้');
  await expect(page.locator('#next')).toBeDisabled();                    // ฝั่งผลยังไม่ครบ 2
  await page.click('.madd[data-madd="ef"]');
  await expect(page.locator('#next')).toBeDisabled();                    // กล่องว่างยังไปต่อไม่ได้
  await page.keyboard.type('ในอนาคตคนอื่นยังเห็น');
  await expect(page.locator('#next')).toBeEnabled();
  for (let i = 2; i < M.max; i++) await page.click('.madd[data-madd="ef"]');
  await expect(page.locator('.ef .mbox')).toHaveCount(M.max);
  await expect(page.locator('.madd[data-madd="ef"]')).toHaveCount(0);   // ครบสูงสุดแล้ว
  await expect(page.locator('#mfl > path.ef')).toHaveCount(M.max);
  // เส้นไม่ล้นกล่อง: กล่องสุดท้ายยังอยู่ในแผนภาพ
  const [mf, last] = [await page.locator('#mf').boundingBox(), await page.locator('.ef .mbox >> nth=-1').boundingBox()];
  expect(last.y + last.height).toBeLessThanOrEqual(mf.y + mf.height);
  await shot(page, 'y3w3-1-max');
  for (let i = M.max - 1; i >= 2; i--) await page.click(`.ef [data-mdel="ef"][data-i="${i}"]`);
  await expect(page.locator('.ef .mbox')).toHaveCount(2);
  await expect(page.locator('#next')).toBeEnabled();
  await shot(page, 'y3w3-2-write');
  await page.click('#toLib');                                            // ออกกลางทาง = บันทึกงานค้าง
  await expect.poll(() => { const d = api.drafts['Y3.2|ขิม|y3w3']; return d && d.data.write.ef; }).toEqual(['เพื่อนแคปไว้ได้', 'ในอนาคตคนอื่นยังเห็น']);

  // อีกเครื่อง: ทำต่อ → FoR → ส่ง
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctx.newPage();
  mockApi(p2, { y3w3: true }, api);
  await p2.goto('/worksheet/?act=y3w3#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=th&draft=1');
  await expect(p2.locator('.ca textarea >> nth=1')).toHaveValue('เมื่อเรากดไลก์');
  await p2.click('#next');
  await expect(p2.locator('#forPanel')).toBeVisible();
  await expect(p2.locator('#stag')).toHaveText('ขั้น 2 / 2');
  await expect(p2.locator('#s2')).toHaveClass(/on/);
  await expect(p2.locator('#frq')).toHaveText(ACTS().find(a => a.id === 'y3w3').frq.th);
  await expect(p2.locator('#fr')).toHaveAttribute('placeholder', 'สำคัญเพราะ...');
  await p2.click('#forBack');                                            // ย้อนกลับไปแก้ Map ได้
  await expect(p2.locator('#s1')).toHaveClass(/on/);
  await p2.click('#next');
  await p2.fill('#fr', 'สำคัญเพราะโพสต์แล้วลบไม่หาย');
  await p2.click('#check');
  await expect(p2.locator('#sent')).toHaveClass(/ok/);
  await expect(p2.locator('#result')).toHaveText('✍️');
  await expect(p2.locator('#stag')).toHaveText('ขั้น 2 / 2');
  await expect(p2.locator('#task')).toContainText('Multi-Flow Map');
  await expect(p2.locator('#think')).toHaveText(C.think.th);
  await expect(p2.locator('.ca textarea >> nth=0')).toHaveJSProperty('readOnly', true);
  await expect(p2.locator('.madd, .mbox .x')).toHaveCount(0);           // ส่งแล้วแก้ไม่ได้
  await expect(p2.locator('#play')).toBeVisible();                      // ปุ่มไปเกมคู่กัน
  await shot(p2, 'y3w3-3-sent');
  const row = api.posts[0].row;
  expect(row.slice(0, 2)).toEqual(['Y3', 3]);
  expect(row[6]).toBe('✓');
  expect(row[9]).toBe('👣 เกิดร่องรอยดิจิทัล | ⬅️ เราสร้างร่องรอยได้อย่างไร: เวลาเราโพสต์รูป, เมื่อเรากดไลก์ | ร่องรอยทำอะไรกับชีวิตเรา ➡️: เพื่อนแคปไว้ได้, ในอนาคตคนอื่นยังเห็น');
  expect(JSON.parse(row[12])).toMatchObject({ v: 3, act: 'y3w3', map: 'multi', place: {}, write: { ca: ['เวลาเราโพสต์รูป', 'เมื่อเรากดไลก์'] }, fr: 'สำคัญเพราะโพสต์แล้วลบไม่หาย' });
  await ctx.close();

  // เปิดงานที่ส่งแล้ว · แก้แล้วส่งใหม่ได้
  await page.goto('/worksheet/?act=y3w3#room=Y3.2&name=' + encodeURIComponent('ขิม') + '&lang=en&done=1');
  await expect(page.locator('#result')).toHaveText('✍️');
  await expect(page.locator('#mev')).toHaveText(M.event.en);
  await expect(page.locator('.ef textarea >> nth=1')).toHaveValue('ในอนาคตคนอื่นยังเห็น');
  await page.click('#edit');
  await expect(page.locator('#stag')).toHaveText('Step 1 / 2');
  await expect(page.locator('.madd')).toHaveCount(2);
  await expect(page.locator('#next')).toBeEnabled();
  expect(errs).toEqual([]);
});

test('Y4 สัปดาห์ 3 Multi-Flow Map: ภาษาอังกฤษ · ข้าม FoR แล้วส่ง · ไปเกมฮีโร่กลุ่มแชท', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const api = mockApi(page, { y4w3: true, upstander: true });
  const M = content('y4w3').multi;
  await page.goto('/worksheet/?act=y4w3#room=Y4.1&name=' + encodeURIComponent('เมษา') + '&lang=en');
  await expect(page.locator('#mev')).toHaveText(M.event.en);
  await expect(page.locator('.mcol.ca h2')).toHaveText(M.cause.label.en);
  await page.fill('.ca textarea', 'They think it is funny');
  await page.click('.madd[data-madd="ca"]'); await page.keyboard.type('Nobody stops them');
  await page.fill('.ef textarea', 'The person feels sad');
  await page.click('.madd[data-madd="ef"]'); await page.keyboard.type('They do not want to go to school');
  await page.click('#len');                                                // สลับภาษาแล้วข้อความยังอยู่
  await page.click('#lth');
  await expect(page.locator('#mev')).toHaveText(M.event.th);
  await expect(page.locator('.ef textarea >> nth=1')).toHaveValue('They do not want to go to school');
  await shot(page, 'y4w3-1-write');
  await page.click('#next');
  await page.click('#skip');
  await expect(page.locator('#sent')).toHaveClass(/ok/);
  expect(JSON.parse(api.posts[0].row[12])).toMatchObject({ act: 'y4w3', map: 'multi', fr: '', write: { ef: ['The person feels sad', 'They do not want to go to school'] } });
  await page.click('#play');
  const g = page.frameLocator('#gameFrame');
  await expect(g.locator('#gback')).toBeVisible();
  await g.locator('#gback').click();
  await expect(page.locator('#gameWrap')).toBeHidden();
  expect(errs).toEqual([]);
});

test('เกม Y3/Y4 สัปดาห์ 3 ล็อกในคลังจนกว่าจะส่งใบงานคู่กัน', async ({ page }) => {
  for (const [room, sheet, game] of [['Y3.2', 'y3w3', 'footprint'], ['Y4.1', 'y4w3', 'upstander']]) {
    const api = mockApi(page, { [sheet]: true, [game]: true });
    await page.goto(`/#/lib/${room}/` + encodeURIComponent('ขิม'));
    await page.click('[data-tab="game"]');
    await expect(page.locator(`.card[data-act="${game}"] .lockbox`)).toHaveText('ทำใบงานสัปดาห์ 3 ให้เสร็จก่อน');
    await expect(page.locator(`.card[data-act="${game}"] button`)).toHaveCount(0);
    api.done['ขิม'] = { act: sheet, round: 1 };
    await page.reload();
    await page.click('[data-tab="game"]');
    await expect(page.locator(`.card[data-act="${game}"] .st`)).toHaveText('เล่นได้เลย');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('เกมโพสต์ดีไหมนะ (Y3): โพสต์หน้าตาเหมือนกัน · โพสต์ไม่ดีแล้วเพื่อนแคป ลบแล้วไม่หาย · เล่นจบเห็นรอยเท้า', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/footprint.html');
  await expect(page.locator('#tTitle')).toHaveText('โพสต์ดีไหมนะ?');
  await expect(page.locator('#gback')).toBeHidden();                       // เปิดตรง ๆ ไม่มีปุ่มกลับ
  await page.click('#goE');
  await expect(page.locator('#trail i')).toHaveCount(8);
  const deck = await page.evaluate(() => deck.map(p => p.ok));
  expect(deck.filter(Boolean).length).toBe(4);                              // โพสต์ได้ 4 · ไม่ควร 4
  let delDone = false;
  for (let i = 0; i < 8; i++) {
    await expect(page.locator('#pCount')).toHaveText(`โพสต์ที่ ${i + 1} / 8`);
    await expect(page.locator('#post.draft')).toBeVisible();
    await expect(page.locator('#post .tag, #post .ptx, #post .pic')).not.toHaveCount(0);
    const cls = await page.locator('#bPost, #bKeep').evaluateAll(bs => bs.map(b => b.className + getComputedStyle(b).backgroundColor));
    expect(cls[0]).toBe(cls[1]);                                            // ปุ่มสองปุ่มหน้าตาเหมือนกัน
    if (!deck[i] && !delDone) {                                             // ลองโพสต์อันที่ไม่ควร 1 ครั้ง
      await page.click('#bPost');
      await expect(page.locator('.toast')).toHaveCount(2, { timeout: 8000 });
      await expect(page.locator('#del')).toBeVisible({ timeout: 4000 });
      await page.click('#del');
      await expect(page.locator('.toast')).toHaveText(/ลบแล้ว/);
      await expect(page.locator('#pRes')).toHaveClass(/no/);
      await expect(page.locator(`#trail i >> nth=${i}`)).toHaveClass('r');
      delDone = true;
    } else {
      await page.click(deck[i] ? '#bPost' : '#bKeep');
      await expect(page.locator('#pRes')).toHaveClass(/good/, { timeout: 6000 });
      await expect(page.locator(`#trail i >> nth=${i}`)).toHaveClass('g');
    }
    await page.click('#pNext');
  }
  await expect(page.locator('#eSum')).toHaveText('ตัดสินใจดี 7 จาก 8 โพสต์');
  await expect(page.locator('#ePath > div')).toHaveCount(8);
  await page.click('#len');
  await expect(page.locator('#eSum')).toHaveText('Good choices: 7 of 8 posts');
  await page.click('#eTitle');
  await page.click('#goH');
  await expect(page.locator('#trail i')).toHaveCount(12);
  await page.click('#bKeep');                                               // ไม่โพสต์อันที่โพสต์ได้ = ไม่เสียอะไร แต่บอกว่าโพสต์ได้
  const ok0 = await page.evaluate(() => deck[0].ok);
  await expect(page.locator('#pRes')).toHaveClass(ok0 ? /mid/ : /good/);
  expect(errs).toEqual([]);
});

test('เกมฮีโร่กลุ่มแชท (Y4): แชทเด้งทีละข้อความ · สุ่ม 5 จาก 7 เหตุการณ์ · ตัวเลือก 6 ข้อหน้าตาเหมือนกัน · หัวใจของภูมิขึ้นลงตามที่เลือก · เล่นจบ', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/upstander.html');
  await page.click('#goN');
  await expect(page.locator('#hRound')).toHaveText('เหตุการณ์ 1 / 5');
  await expect(page.locator('#hLbl')).toHaveText('❤️ ใจของภูมิ 60%');
  await expect(page.locator('#lines .ln.typing')).toHaveCount(1);         // กำลังพิมพ์...
  await expect(page.locator('.op')).toHaveCount(0);                        // ยังไม่มีตัวเลือกจนแชทมาครบ
  await expect(page.locator('#lines .bub').first()).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.op')).toHaveCount(6, { timeout: 8000 });
  const looks = await page.locator('.op').evaluateAll(bs => [...new Set(bs.map(b => b.className + getComputedStyle(b).backgroundColor + getComputedStyle(b).borderColor))]);
  expect(looks.length).toBe(1);
  const helpful = await page.evaluate(() => opts.filter(a => a.h).length);
  expect(helpful).toBe(3);
  // รอบ 1: ด่ากลับ (ดูเหมือนช่วยแต่ไม่ใช่) → หัวใจลด
  const fight = await page.evaluate(() => opts.some(a => a.id === 'fight'));
  const bad = fight ? 'fight' : await page.evaluate(() => opts.find(a => !a.h).id);
  await page.click(`.op[data-a="${bad}"]`);
  await expect(page.locator('.op:disabled')).toHaveCount(6);
  await expect(page.locator('#delta')).toHaveClass(/dn/);
  await expect(page.locator('#res')).toHaveClass(/no/, { timeout: 8000 });
  for (let r = 1; r < 5; r++) {
    await page.click('#next');
    await expect(page.locator('#hRound')).toHaveText(`เหตุการณ์ ${r + 1} / 5`);
    for (let k = 0; k < 6; k++) await page.click('#chat');                 // แตะแชทเพื่อข้าม
    await expect(page.locator('.op')).toHaveCount(6, { timeout: 8000 });
    const before = await page.evaluate(() => heart);
    const good = await page.evaluate(() => opts.find(a => a.h).id);
    await page.click(`.op[data-a="${good}"]`);
    await expect(page.locator('#delta')).toHaveClass(/up/);
    const after = await page.evaluate(() => heart);
    expect(after > before || after === 100).toBe(true);                   // หัวใจเต็ม 100 แล้วไม่เกิน
    await expect(page.locator('#res')).toHaveClass(/good/, { timeout: 8000 });
  }
  // ตัวเลือกเฉพาะเหตุการณ์ 2 ข้อ (ช่วยได้ 1 + ไม่ช่วย 1) อยู่ในตัวเลือกทุกรอบ
  expect(await page.evaluate(() => { const R = ROUNDS[order[round]]; return R.sp.every(a => opts.some(o => o.id === a.id)) && R.sp.map(a => a.h).join(); })).toBe('1,0');
  // จบ → ฉาก 1 สัปดาห์ต่อมา: การ์ดมาจากตัวเลือกที่เลือกจริง · ตอนจบตามหัวใจของภูมิ
  await page.click('#next');
  await expect(page.locator('#sEpi')).toBeVisible();
  await expect(page.locator('#epTitle')).toHaveText('📅 1 สัปดาห์ต่อมา…');
  await expect(page.locator('#toSum')).toBeHidden();
  await expect(page.locator('#epCards .ecard')).toHaveCount(1, { timeout: 4000 });   // เด้งทีละใบ
  const want = await page.evaluate(() => ({ cards: epiCards().map(h => h.af.x.th), end: endKey(), n: ENDS[endKey()].c.length }));
  for (let k = 0; k < 12; k++) await page.click('#epTitle');              // แตะเพื่อข้าม
  await expect(page.locator('#toSum')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#epCards .ecard span:last-child')).toHaveText(want.cards);
  await expect(page.locator('#ending')).toHaveClass(new RegExp(want.end));
  await expect(page.locator('#enCards .ecard')).toHaveCount(want.n);
  await expect(page.locator('#epCards .ecard.b')).toHaveCount(1);            // รอบแรกเลือกไม่ช่วย = การ์ดผลเสีย 1 ใบ
  await page.click('#toSum');
  await expect(page.locator('#eSum')).toContainText('เราช่วยภูมิ 4 จาก 5 ครั้ง');
  await expect(page.locator('#eList > div')).toHaveCount(5);
  await expect(page.locator('#eRank')).toHaveText('เพื่อนที่ช่วยได้');
  await page.click('#len');
  await expect(page.locator('#eRank')).toHaveText('Helpful friend');
  expect(errs).toEqual([]);
});

test('เกมสัปดาห์ 3: คลังโพสต์ 22 แบบ · 7 เหตุการณ์ 16 ตัวเลือก · ตัวเลือกเรียกชื่อคนแกล้งของเหตุการณ์นั้น', async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto('/games/footprint.html');
  const fp = await page.evaluate(() => ({ n: POSTS.length, ok: POSTS.filter(p => p.ok).length, ids: new Set(POSTS.map(p => p.id)).size,
    full: POSTS.every(p => p.tx.th && p.tx.en && p.why.th && p.why.en && p.cm.length === 2) }));
  expect(fp).toEqual({ n: 22, ok: 10, ids: 22, full: true });
  await page.click('#goH');
  await expect(page.locator('#trail i')).toHaveCount(12);
  await page.goto('/games/upstander.html');
  const up = await page.evaluate(() => ({ ev: ROUNDS.length, acts: ACTS.length, good: ACTS.filter(a => a.h).length, ids: new Set(ACTS.map(a => a.id)).size,
    by: ROUNDS.every(R => P[R.by]) }));
  expect(up).toEqual({ ev: 7, acts: 16, good: 8, ids: 16, by: true });
  // เหตุการณ์ที่บีมแชร์รูป: ตัวเลือก ด่ากลับ ต้องเรียกบีม ไม่ใช่ต้า · บัญชีปลอมไม่มีตัวเลือกคุย/ด่า/แกล้งคืน
  const names = await page.evaluate(() => ({ fight: forEvent(ACTS.find(a => a.id === 'fight'), ROUNDS[1]).t.th,
    reply: forEvent(ACTS.find(a => a.id === 'talkta'), ROUNDS[1]).out[1].p, fake: ROUNDS.find(R => R.by === 'fake').skip }));
  expect(names.fight).toContain('บีม'); expect(names.fight).not.toContain('ต้า');
  expect(names.reply).toBe('beam');
  // ตัวเลือกเฉพาะเหตุการณ์ครบทุกเหตุการณ์ · ทุกตัวเลือกมีผลที่ตามมา · ตอนจบ 3 แบบ (เศร้า = ย้ายโรงเรียน)
  const sp = await page.evaluate(() => ({ every: ROUNDS.every(R => R.sp.length === 2 && R.sp[0].h === 1 && R.sp[1].h === 0),
    af: ROUNDS.every(R => ACTS.concat(R.sp).every(a => forEvent(a, R).af.x.th && forEvent(a, R).af.x.en)), ends: Object.keys(ENDS).join(),
    who: forEvent(ACTS.find(a => a.id === 'fight'), ROUNDS[6]).af.x.th, sad: ENDS.sad.c.map(c => c.x.th).join(' ') }));
  expect(sp).toMatchObject({ every: true, af: true, ends: 'good,mid,sad' });
  expect(sp.who).toContain('มิ้นท์'); expect(sp.sad).toContain('ย้ายไปเรียนโรงเรียนอื่น');
  expect(names.fake).toEqual(expect.arrayContaining(['talkta', 'fight', 'revenge']));
});
