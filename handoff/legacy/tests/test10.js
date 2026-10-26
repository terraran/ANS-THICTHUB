const { chromium } = require('../stim/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/fonts.googleapis.com/**', r => r.abort());
  await p.goto('file://' + __dirname + '/adventure.html');
  await p.click('#len'); await p.click('#goN');
  // in-page autopilot presses Space via real key events when obstacle in window [80,130]
  await p.evaluate(() => setInterval(() => { const o = world.find(o => o.t === 'ob' && !o.gone && o.x - camX > 80 && o.x - camX < 130); if (o && hero.onGround) dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); }, 16));
  let baited = false;
  for (let i = 0; i < 200; i++) {
    await p.waitForTimeout(250);
    if (await p.evaluate(() => state) !== 'play') break;
    if (!baited && i > 20) { const bait = p.locator('.pop.trick:not(.out) .bait').first(); if (await bait.count()) { await bait.click({ force: true }); baited = true; await p.waitForTimeout(800); await p.screenshot({ path: 'a_more.png' }); console.log('after bait pops', await p.locator('.pop:not(.out)').count()); continue; } }
    if (i % 12 === 0) await p.screenshot({ path: 'a_norm.png' });
  }
  console.log(await p.evaluate(() => ({ state, hearts, coins, fooled, camX: Math.round(camX), open: openPops() })), errs);
  await b.close();
})();
