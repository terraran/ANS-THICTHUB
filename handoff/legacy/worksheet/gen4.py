import json, os
src = open('gen2.py').read()
ns = {}
exec(src.replace("make('Y3_", "_nomake('Y3_").replace("make('Y4_", "_nomake('Y4_").replace("print('endpoint:'", "pass #"), {**ns, '_nomake': lambda *a, **k: None, '__name__': 'x'}, ns)
y3, y4 = ns['y3'], ns['y4']
y3['act'] = 'y3w1'; y4['act'] = 'y4w1'
for s, th, en in zip(y4['signs'], ['🔑 ขอข้อมูล/รหัสผ่าน', '📷 ขอรูป', '🎁 ให้ของรางวัล', '🤫 ให้เก็บเป็นความลับ'], ['🔑 Info / password', '📷 Photos', '🎁 Gifts / prizes', '🤫 Keep it secret']): s['short'] = {'th': th, 'en': en}
for s, th, en in zip(y3['signs'], ['🎁 ได้รางวัล/ของฟรี', '⏰ เร่งให้รีบกด', '📥 ขอข้อมูล/ให้ดาวน์โหลด'], ['🎁 Prize / free stuff', '⏰ Hurry up!', '📥 Info / download']): s['short'] = {'th': th, 'en': en}
END = open('endpoint.txt').read().strip()
KEY = open('key.txt').read().strip()
T = open('template4.html').read()
def make(out, accent, cfg, end=END):
    s = T.replace('__TITLE__', cfg['title']['th']).replace('__ACCENT__', accent).replace('__ENDPOINT__', end).replace('__CONFIG__', json.dumps(cfg, ensure_ascii=False))
    open(out, 'w').write(s)
import sys
end = sys.argv[1] if len(sys.argv) > 1 else END
pre = sys.argv[2] if len(sys.argv) > 2 else ''
make(pre + 'Y3_สัปดาห์1_กดได้หรือหยุดถามผู้ใหญ่.html', '#0284c7', y3, end)
make(pre + 'Y4_สัปดาห์1_ข้อความปลอดภัยหรืออันตราย.html', '#4f46e5', y4, end)
# share page
S = open('share_template.html').read() if os.path.exists('share_template.html') else None
if S:
    acts = {'y3w1': dict(y3, accent='#0284c7'), 'y4w1': dict(y4, accent='#4f46e5')}
    open(pre + 'ครู_หน้าแชร์ผลงาน.html', 'w').write(S.replace('__ENDPOINT__', end).replace('__KEY__', KEY).replace('__ACTS__', json.dumps(acts, ensure_ascii=False)))
print('ok', end[:40])
# ---- embed adventure game in Y3 worksheet (shown after a successful send)
GAME = open('adventure.html', encoding='utf-8').read()
y3f = pre + 'Y3_สัปดาห์1_กดได้หรือหยุดถามผู้ใหญ่.html'
w = open(y3f, encoding='utf-8').read()
def RR(a, b):
    global w; assert w.count(a) == 1, a[:60]; w = w.replace(a, b)
RR('<div class="btns"><button id="edit"></button>', '<div class="btns"><button id="play" class="hide" style="background:linear-gradient(#fb923c,#ea580c);color:#fff"></button><button id="edit"></button>')
RR('</body>', '''<div id="gameWrap" style="display:none;position:fixed;inset:0;z-index:9999;background:#0c4a6e"><iframe id="gameFrame" title="game" style="width:100%;height:100%;border:0;display:block"></iframe></div>
<script>
const GAME_HTML = ''' + json.dumps(GAME, ensure_ascii=False).replace('</', '<\\/') + ''';
(function(){
  const btn = document.getElementById('play'), wrap = document.getElementById('gameWrap'), fr = document.getElementById('gameFrame');
  const label = () => { btn.textContent = L === 'en' ? '🎮 Play the adventure game' : '🎮 เล่นเกมผจญภัย'; };
  const _show = showSent; showSent = function(){ _show(); btn.classList.toggle('hide', sendState !== 'ok'); label(); };
  const _lang = applyLang; applyLang = function(){ _lang(); label(); };
  btn.onclick = () => {
    wrap.style.display = 'block';
    const sendLang = () => fr.contentWindow.postMessage({ lang: L }, '*');
    if (!fr.srcdoc) { fr.onload = () => { sendLang(); fr.contentWindow.focus(); }; fr.srcdoc = GAME_HTML; } else { sendLang(); fr.contentWindow.focus(); }
  };
  addEventListener('message', e => { if (e.data === 'closeGame') wrap.style.display = 'none'; });
  document.getElementById('edit').addEventListener('click', () => btn.classList.add('hide'));
})();
</script>
</body>''')
open(y3f, 'w', encoding='utf-8').write(w)
print('game embedded')
