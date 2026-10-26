// ใช้ร่วมกันระหว่าง Hub กับใบงาน: เรียก Apps Script + ตัวช่วยเล็ก ๆ
// อ่านข้อมูลทั้งหมดใช้ GET (อ่าน JSON ได้) · เขียนใช้ POST แบบ no-cors (อ่านผลไม่ได้)
window.HubAPI = (() => {
  const C = window.HUB_CONFIG || {};
  const configured = () => /^https?:\/\//.test(C.endpoint || '');
  async function get(params){
    const r = await fetch(C.endpoint + '?' + new URLSearchParams(params));
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.error) || 'bad response');
    return j;
  }
  async function post(body){
    await fetch(C.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  }
  return {
    configured,
    roster: room => get({ action: 'roster', room }).then(j => j.names),
    state: (room, name) => get({ action: 'state', room, name }),
    submit: (row, members) => post({ action: 'submit', row, members })
  };
})();

window.HubUtil = (() => {
  const AV = ['#0284c7', '#4f46e5', '#15803d', '#c2410c'];
  // localStorage ใช้จำห้อง/ชื่อ/ภาษาในเครื่องนี้เท่านั้น · บางเครื่องปิดไว้ จึงห่อ try/catch
  const store = {
    get(k){ try { return JSON.parse(localStorage.getItem('ansHub.' + k)); } catch (e) { return null; } },
    set(k, v){ try { localStorage.setItem('ansHub.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  // ตัวอักษรแรกของชื่อ ข้ามสระหน้า เ แ โ ใ ไ
  const initial = s => { const c = [...String(s)]; return /[เแโใไ]/.test(c[0]) && c[1] ? c[1] : c[0] || '?'; };
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const t = (o, L) => (o && typeof o === 'object') ? (o[L] || o.th) : (o == null ? '' : o);
  return { AV, store, initial, esc, t };
})();
