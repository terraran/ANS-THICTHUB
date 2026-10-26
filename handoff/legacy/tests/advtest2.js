const { chromium } = require('playwright');
const F = 'file://' + __dirname + '/../act/adventure.html';
async function run(b, mode){
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(300);
  await p.click(mode === 'easy' ? '#goE' : mode === 'hard' ? '#goH' : '#goN');
  const t0 = Date.now(); let pauseOK = true, pauses = 0, maxBurst = 0, corner = 0, bait = false;
  while (Date.now() - t0 < 150000) {
    const st = await p.evaluate(() => state); if (st !== 'play') break;
    const open = await p.$$('#layer .pop:not(.out)');
    if (open.length) {
      pauses++; maxBurst = Math.max(maxBurst, open.length);
      const c1 = await p.evaluate(() => camX); await p.waitForTimeout(400); const c2 = await p.evaluate(() => camX);
      if (c1 !== c2) pauseOK = false;
      const pops = await p.$$('#layer .pop:not(.out)');
      for (const el of pops) {
        if (await el.$('.barfake')) corner++;
        if (mode === 'normal' && !bait && await el.$('.bait')) { bait = true; await (await el.$('.bait')).click({ force: true }); continue; }
        const btn = (await el.$('.realx')) || (await el.$('.nothanks')) || (await el.$('.ok'));
        if (btn) await btn.click({ force: true }).catch(() => {});
        await p.waitForTimeout(150);
      }
      continue;
    }
    if (mode !== 'easy') await p.evaluate(() => { const a = world.find(o => o.t === 'ob' && !o.gone && o.x - camX > 40 && o.x - camX < SPEED * .38); if (a) jump(); });
    await p.waitForTimeout(16);
  }
  const r = await p.evaluate(() => ({ state, hearts, maxHearts, coins, closed, fooled, speed: SPEED }));
  console.log(mode, JSON.stringify({ ...r, secs: Math.round((Date.now() - t0) / 1000), pauses, maxBurst, pauseOK, corner, errs }));
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/7840a9c0-c050-55f4-a369-f9590ff920c3/scratchpad/adv_' + mode + '.png' });
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  // title screenshot
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); await p.goto(F); await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/claude-0/-home-claude/7840a9c0-c050-55f4-a369-f9590ff920c3/scratchpad/adv_title.png' });
  await Promise.all(process.argv.slice(2).map(m => run(b, m)));
  await b.close();
})();
