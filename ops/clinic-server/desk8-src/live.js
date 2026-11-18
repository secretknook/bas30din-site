/* Clinic Desk — live mode: the same four-app design, but every change goes to the clinic server
   (desk.bas30din.com) and the screen shows the server's real data. */
(function () {
  'use strict';
  const CD = window.CD;
  const UI = CD.UI;
  const API = (window.CD_API) || (location.hostname.indexOf('desk.') === 0 ? location.origin + '/api' : location.origin + '/webhook/desk-api');
  const store = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  const load = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const L = CD.L = { sid: load('cd_sid'), role: load('cd_role'), busy: 0, queue: [], lastOk: 0, offline: false, ver: 0 };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const C = () => CD.C();
  const S = () => CD.S;
  const md = m => String(m || 'cash').toLowerCase();
  const its = list => (list || []).map(x => ({ n: x.n, p: Math.round(Number(x.amt != null ? x.amt : x.p) || 0), g: Number(x.gst || 0) }));
  const vTok = tok => CD.todays().find(x => x.tok === tok);
  const iso = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

  function post(body, ms) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(() => { if (ctl) ctl.abort(); }, ms || 20000);
    return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(r => { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(r => (r && r.desk) ? r.desk : r);
  }

  /* ---------- state from the server ---------- */
  function apply(st) {
    if (!st || !st.clinics) return;
    const keepDoc = S() && S().docId;
    st.docId = keepDoc && st.clinics.live.doctors.some(d => d.id === keepDoc) ? keepDoc : st.clinics.live.doctors[0].id;
    // the design reads a few fields the server does not keep yet
    const c = st.clinics.live;
    c.msgs = c.msgs || { en: Object.assign({}, CD_DATA.MSG_EN), hl: Object.assign({}, CD_DATA.MSG_HL) };
    if (!c.sets) { let n = 0; c.sets = ((CD_DATA.TEMPLATES[c.tpl === 'general' ? 'gp' : c.tpl] || CD_DATA.TEMPLATES.skin).sets || []).map(x => ({ id: 's' + (++n), n: x.n, used: 0, meds: x.meds.map(m => (m[2] ? { n: m[0], how: m[1], brand: m[2] } : { n: m[0], how: m[1] })) })); }
    c.billNo = 1; c.named = c.named || {};
    const cat = n => /medicine|tablet|cream|gel|lotion|shampoo|sunscreen|pharmacy/i.test(n) ? 'medicine' : /consult|follow-up|check-up|session|opd/i.test(n) ? 'consult' : 'procedure';
    c.visits.forEach(v => { v.key = v.key || v.k; v.doc = v.doc || 'd0'; v.missed = v.missed || 0; v.prob = v.prob || ''; });
    c.bills.forEach(b => { b.day = b.date; b.refund = b.refund || null; b.items.forEach(x => { x.cat = x.cat || cat(x.n); x.gst = x.gst || 0; }); });
    c.patients.forEach(p => { ['name', 'phone', 'source', 'problem', 'words', 'outcome', 'sex', 'rel', 'wt', 'uhid'].forEach(k => { if (p[k] == null) p[k] = ''; }); p.age = p.age || 0; p.doc = p.doc || 'd0'; p.since = p.since || st.today; });
    c.patients.forEach(p => { if (!p.allergies) p.allergies = 'None told'; });
    CD.liveState = st; CD.load();
    L.lastOk = Date.now(); L.offline = false; L.ver++;
  }
  function busyUI() { return !!UI.modal || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox'); }
  function refresh(force) {
    if (!L.sid || L.busy || L.queue.length) return Promise.resolve();
    L.busy++;
    return post({ sid: L.sid, v8: true, v8h: L.h }, 15000).then(r => {
      L.busy--;
      if (r && r.auth) return loggedOut(r.error);
      if (r.v8h) L.h = r.v8h;
      if (r.v8same) { L.lastOk = Date.now(); L.offline = false; const n = new Date(Date.now() + 330 * 60000); S().clock = n.getUTCHours() * 60 + n.getUTCMinutes(); paintBar(); return; }
      if (r.v8) { apply(r.v8); if (force || !busyUI()) CD.render(); else paintBar(); }
      else if (r.v8err) console.error(r.v8err);
    }).catch(() => { L.busy--; L.offline = true; paintBar(); });
  }
  CD.liveRefresh = refresh;

  /* ---------- every tap that changes something ---------- */
  function send(payload) {
    if (!payload) return;
    L.queue.push(payload); pump();
  }
  function pump() {
    if (L.busy || !L.queue.length) return;
    const p = L.queue[0]; L.busy++; paintBar();
    post(Object.assign({ sid: L.sid, v8: true }, p), 20000).then(r => {
      L.busy--; L.queue.shift();
      if (r && r.auth) return loggedOut(r.error);
      if (r.error) {
        const msg = r.error === 'CABIN_BUSY' ? 'Someone is still with the doctor. Refresh and try again.' : r.error;
        CD.toast(msg); if (r.v8err) console.error(r.v8err);
      }
      if (r.v8h) L.h = r.v8h;
      if (r.v8) apply(r.v8);
      if (!L.queue.length) { if (!busyUI() || r.error) { CD.render(); } else paintBar(); }
      pump();
    }).catch(() => {
      L.busy--; L.offline = true; paintBar();
      // keep it in the queue and retry: the change is not lost if the internet blinks
      setTimeout(pump, 4000);
    });
  }
  CD.liveSend = send;

  // each entry runs BEFORE the screen's own action and returns a function that runs AFTER it,
  // which decides what (if anything) to send to the server.
  const P = {};
  /* reception */
  P.sendNext = ds => { const nx = CD.waiting(ds.doc)[0]; return () => nx && nx.status === 'cabin' ? { action: 'v8_next', key: nx.key, force: true } : null; };
  P.finishCabinAndNext = ds => { const cab = CD.inCabin(ds.doc); const nx = CD.waiting(ds.doc)[0]; return () => (nx && nx.status === 'cabin') ? { action: 'v8_next', key: nx.key, force: true, finishCur: true } : (cab ? { action: 'finish' } : null); };
  P.sendAnyway = ds => { const v = vTok(ds.tok); return () => v ? { action: 'v8_next', key: v.key, force: true } : null; };
  P.arrived = ds => { const v = vTok(ds.tok); return () => v && { action: 'v8_arrived', key: v.key }; };
  P.moveEnd = ds => { const v = vTok(ds.tok); return () => v && { action: 'v8_moveend', key: v.key }; };
  P.finishVisit = ds => () => ({ action: 'finish' });
  P.leftRefund = ds => { const v = vTok(ds.tok); return () => v && { action: 'v8_left', key: v.key, refund: true }; };
  P.leftNoRefund = ds => { const v = vTok(ds.tok); return () => v && { action: 'v8_left', key: v.key }; };
  P.registerP = () => {
    const f = Object.assign({}, UI.f); const n0 = CD.todays().length;
    return () => {
      if (CD.todays().length === n0) return null; // the form had an error
      const v = CD.todays()[CD.todays().length - 1]; const b = v.bill ? C().bills.find(x => x.no === v.bill) : null;
      const tr = f.tr ? (C().treatments.find(t => t.id === f.tr) || {}).n : '';
      return { action: 'v8_register', name: (f.name || '').trim(), phone: (f.phone || '').replace(/\D/g, ''), age: f.age, sex: f.sex, kind: f.kind, tr, src: f.pid ? '' : f.src, mode: f.mode === 'later' ? 'later' : (b ? md(f.mode) : ''), items: b ? its(b.items) : [] };
    };
  };
  P.markPaid = () => {
    const f = Object.assign({}, UI.f); const items = (f.items || []).slice(); const nb = C().bills.length;
    const v = CD.todays().find(x => x.pid === f.pid && !x.bill);
    return () => {
      if (C().bills.length === nb) return null;
      const b = { action: 'v8_pay', items: its(items), mode: md(f.mode), disc: Number(f.disc) || 0, wa: f.wa !== false };
      if (v && v.key) b.key = v.key; else { b.pid = f.pid; b.name = (CD.P(f.pid) || {}).name; }
      return b;
    };
  };
  P.callRes = ds => { const x = C().calls.find(y => y.id === ds.id); return () => x && { action: 'v8_cb', id: x.id, phone: x.phone, r: ds.r }; };
  P.callDone = ds => { const x = C().calls.find(y => y.id === ds.id); return () => x && { action: 'v8_cb', id: x.id, phone: x.phone, r: 'done' }; };
  P.apArrived = ds => () => ({ action: 'v8_appt_arrived', id: ds.id });
  P.apCancelYes = ds => () => ({ action: 'v8_appt_cancel', id: ds.id });
  P.bkSave = () => {
    const bk = Object.assign({}, UI.f.bk || {}); const na = C().appts.length; const p0 = bk.pid ? CD.P(bk.pid) : null;
    return () => {
      if (C().appts.length === na && !bk.moving) return null;
      if (UI.modal && document.getElementById('bk-err') && document.getElementById('bk-err').textContent) return null;
      const p = p0 || {}; return { action: 'v8_appt_add', pid: bk.pid || '', name: (p.name || bk.name || '').trim(), phone: p.phone || bk.phone || '', date: bk.date, time: Number(bk.time), moving: bk.moving || '' };
    };
  };
  P.closeDay = () => {
    let tot = Number(UI.f.coins) || 0; [2000, 500, 200, 100, 50, 20, 10].forEach(n => { tot += (Number(UI.f['n' + n]) || 0) * n; });
    const note = (UI.f.cnote || '').trim(); const was = !!S().dayClosed[C().id];
    return () => (!was && S().dayClosed[C().id]) ? { action: 'v8_close', counted: tot, note } : null;
  };
  P.ptSave = () => { const pt = Object.assign({}, UI.f.pt || {}); return () => Number(pt.amt) > 0 ? { action: 'v8_petty', amt: Number(pt.amt), what: pt.what } : null; };
  P.reopenDay = () => () => ({ action: 'v8_reopen' });
  P.epSave = ds => { const e = Object.assign({}, UI.f.ep || {}); return () => ({ action: 'v8_pinfo', pid: ds.id, p: { name: (e.name || '').trim(), age: e.age, rel: e.rel } }); };
  P.rfDo = ds => { const b = C().bills.find(x => x.no === ds.no); const rf = Object.assign({}, UI.f.rf || {}); return () => (b && b.refund) ? { action: 'v8_refund', day: b.day, k: b.k, amt: Number(rf.amt) || b.total, reason: (rf.why || '').trim() } : null; };
  P.cmDo = ds => { const b = C().bills.find(x => x.no === ds.no); return () => b && { action: 'v8_mode', day: b.day, k: b.k, m: md(ds.v) }; };
  P.setDocStatus = ds => () => ({ action: 'v8_docstatus', status: ds.v });
  /* doctor */
  P.startConsult = ds => {
    const d = CD.doc(S().docId); const v = ds && ds.tok ? vTok(ds.tok) : (CD.inCabin(d.id) || CD.waiting(d.id)[0]);
    return () => v ? { action: 'v8_start', key: v.key } : null;
  };
  P.imBack = () => () => ({ action: 'v8_in' });
  P.imIn = () => () => ({ action: 'v8_in' });
  P.outMore = () => () => ({ action: 'v8_more' });
  P.stepOut = () => { const f = Object.assign({}, UI.f); return () => ({ action: 'v8_out', mins: Number(f.mins) || 30, reason: f.why === "Don't say" ? 'Short break' : f.why }); };
  P.finishRx = () => {
    const nrx = C().rx.length; const tok = UI.prm.tok; const pid = UI.prm.pid; const set = UI.f.set;
    return () => {
      if (C().rx.length === nrx) return null;
      const r = C().rx[C().rx.length - 1]; const v = tok ? vTok(tok) : null;
      if (set) { const st = C().sets.find(x => x.id === set); if (st) send({ action: 'v8_sets', sets: C().sets }); }
      return { action: 'v8_finish', key: v ? v.key : '', pid: r.pid || pid, name: (CD.P(r.pid) || {}).name, rx: { finding: r.finding, meds: r.meds, advice: r.advice, vitals: r.vitals, tests: r.tests, follow: r.follow } };
    };
  };
  P.askCall = ds => () => ({ action: 'v8_askcall', pid: ds.id, name: (CD.P(ds.id) || {}).name });
  P.remindNow = ds => () => ({ action: 'v8_remind', pid: ds.id });
  P.repSeen = ds => () => ({ action: 'v8_rep_seen', id: ds.id });
  P.repReply = ds => () => ({ action: 'v8_rep_seen', id: ds.id, reply: ds.v });
  P.esSave = () => () => ({ action: 'v8_sets', sets: C().sets });
  P.esDel = () => () => ({ action: 'v8_sets', sets: C().sets });
  P.saveAsSet = () => { const n = C().sets.length; return () => C().sets.length !== n ? { action: 'v8_sets', sets: C().sets } : null; };
  P.markLeave = ds => () => ({ action: 'v8_leave', date: ds.v, on: true });
  P.cancelLeave = ds => () => ({ action: 'v8_leave', date: ds.v, on: false });
  P.tmSave = () => { const tm = Object.assign({}, UI.f.tm || {}); return () => tm.to > tm.from ? { action: 'v8_timings', open: iso(tm.from), close: iso(tm.to) } : null; };
  /* owner */
  P.cashOk = ds => () => ({ action: 'v8_cash_ok', date: ds.v });
  P.togglePerm = ds => () => ({ action: 'v8_perm', k: ds.k });
  P.toggleBox = ds => () => ({ action: 'v8_box', k: ds.k });
  P.nsSave = () => { const n = Object.assign({}, UI.f.ns || {}); return () => (n.name || '').trim() ? { action: 'v8_staff', name: n.name.trim(), phone: (n.phone || '').replace(/\D/g, ''), role: /doctor/i.test(n.role) ? 'doctor' : 'reception' } : null; };
  P.refPaid = ds => () => ({ action: 'v8_ref', id: ds.id });
  P.nrSave = () => { const n = Object.assign({}, UI.f.nr || {}); return () => ((n.name || '').trim() && Number(n.amt) > 0) ? { action: 'v8_ref', name: n.name.trim(), what: n.what, amt: Number(n.amt) } : null; };
  P.setColor = ds => () => ({ action: 'v8_cfg', cfg: { color: ds.v } });
  P.setLang = ds => () => ({ action: 'v8_cfg', cfg: { lang: ds.v } });
  P.setRxLang = ds => () => ({ action: 'v8_cfg', cfg: { rxLang: ds.v } });
  let nameT = null;
  P.setName = (ds, el) => { clearTimeout(nameT); const v = el.value; nameT = setTimeout(() => send({ action: 'v8_cfg', cfg: { name: v } }), 900); return null; };
  P.setLogo = (ds, el) => () => el.value ? { action: 'v8_cfg', cfg: { logo: el.value } } : null;
  let docT = null;
  P.docField = () => { clearTimeout(docT); docT = setTimeout(() => { const d = CD.doc(S().docId); send({ action: 'v8_cfg', cfg: { doc: { name: d.name, deg: d.deg, reg: d.reg, council: d.council, spec: d.spec } } }); }, 900); return null; };
  P.esSaveSetting = () => {
    const k = UI.f.esk; const e = JSON.parse(JSON.stringify(UI.f.es || {}));
    return () => {
      if (UI.modal) return null; // the form showed an error
      const c = C();
      if (k === 'fees') return { action: 'v8_cfg', cfg: { fee: Number(e.fee), freeDays: Number(e.free) || 0 } };
      if (k === 'treat') return { action: 'v8_cfg', cfg: { treatments: c.treatments } };
      if (k === 'gst') return { action: 'v8_cfg', cfg: { biz: { gstin: (e.gstin || '').trim(), prefix: (e.pre || '').replace(/\W/g, '') } } };
      if (k === 'timings') return { action: 'v8_cfg', cfg: { timings: e.t } };
      if (k === 'doctors') { const d = c.doctors[0]; return { action: 'v8_cfg', cfg: { doc: { name: d.name, deg: d.deg, reg: d.reg, council: d.council, spec: d.spec } } }; }
      return null;
    };
  };
  P.winBack = () => () => { CD.toast('Bulk messages need an approved WhatsApp template. Ask Alok to switch this on.'); return null; };
  P.merge = () => () => { CD.toast('Merging patients is coming soon on the live desk.'); return null; };
  P.changeDoc = () => () => null;

  CD.livePre = (name, ds, el) => { const f = P[name]; if (!f) return null; try { return f(ds, el); } catch (e) { console.error('livePre ' + name, e); return null; } };
  CD.liveAfter = fn => { let p = null; try { p = fn(); } catch (e) { console.error('liveAfter', e); } if (p) send(p); };

  /* ---------- top bar (replaces the demo bar) ---------- */
  const APPS = { owner: [['owner', 'Owner'], ['doctor', 'Doctor'], ['reception', 'Reception']], doctor: [['doctor', 'Doctor'], ['reception', 'Reception']], reception: [['reception', 'Reception']] };
  CD.allowApp = a => (APPS[L.role] || APPS.reception).some(x => x[0] === a);
  CD.homeApp = () => (APPS[L.role] || APPS.reception)[0][0];
  function dot() { return L.offline ? '<span class="lv-dot off" title="No internet">Offline · will retry</span>' : (L.busy || L.queue.length) ? '<span class="lv-dot busy">Saving…</span>' : '<span class="lv-dot ok">Live</span>'; }
  CD.liveBar = () => {
    const apps = APPS[L.role] || APPS.reception; const me = (S() && S().me) || {};
    return '<div class="demo live no-print" role="navigation"><b>' + esc(C().name) + '</b>' + (apps.length > 1 ? apps.map(([id, l]) => '<button class="pill' + (UI.app === id ? ' on' : '') + '" data-a="app" data-v="' + id + '">' + l + '</button>').join('') : '') +
      '<span class="sp"></span><span id="lv-dot">' + dot() + '</span><span>' + esc(me.name || '') + '</span><button class="pill" data-a="lvRefresh" title="Get the latest">↻</button><button class="pill" data-a="lvMenu">⋯</button></div>';
  };
  function paintBar() { const el = document.getElementById('lv-dot'); if (el) el.innerHTML = dot(); }
  CD.A.lvRefresh = () => refresh(true).then(() => CD.toast('Up to date'));
  CD.A.lvMenu = () => CD.modal('<h2 class="t">' + esc((S().me || {}).name || '') + '</h2><div class="muted">' + esc(C().name) + ' · ' + esc(L.role) + '</div><div class="flex wrap"><a class="ghost" style="text-decoration:none" href="?old=1">Open the old desk</a><button class="ghost" data-a="lvLogout">Log out</button><button class="txt" data-a="close">Close</button></div>');
  CD.A.lvLogout = () => { CD.closeModal(); loggedOut(); };

  /* ---------- login ---------- */
  function loggedOut(msg) { store('cd_sid', null); store('cd_role', null); L.sid = null; CD.liveState = null; drawLogin(msg); }
  let LG = { step: 'phone', ph: '', err: '' };
  function drawLogin(msg) {
    if (msg) LG.err = msg;
    document.body.className = 'app-reception';
    const r = document.getElementById('root');
    const err = LG.err ? '<div class="bad small" style="min-height:4px">' + esc(LG.err) + '</div>' : '';
    let inner;
    if (LG.step === 'code') inner = '<h1 class="t">Enter the code</h1><div class="muted">We sent a 6-digit code on WhatsApp to ' + esc(LG.sentTo || LG.ph) + '.</div><input class="field" id="lg-code" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="font-size:26px;letter-spacing:6px" autofocus>' + err + '<button class="btn big full" id="lg-go">Log in</button><button class="txt" id="lg-back">Use another number</button>';
    else if (LG.step === 'pw') inner = '<h1 class="t">Your password</h1><div class="muted">' + esc(LG.ph) + '</div><input class="field" id="lg-pw" type="password" placeholder="Password" autofocus>' + err + '<button class="btn big full" id="lg-go">Log in</button><button class="txt" id="lg-back">Back</button>';
    else if (LG.step === 'wa') inner = '<h1 class="t">One step on WhatsApp</h1><div class="card pad soft">Open WhatsApp and send <b>LOGIN</b> to the clinic number. You will get a login link. Tap it and you are in.</div>' + err + '<button class="ghost" id="lg-back">Back</button>';
    else inner = '<h1 class="t">Log in to the desk</h1><div class="muted">Use the phone number your clinic added.</div><input class="field" id="lg-ph" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" value="' + esc(LG.ph) + '" style="font-size:24px;letter-spacing:1px" autofocus>' + err + '<button class="btn big full" id="lg-otp">Get code on WhatsApp</button><button class="ghost full" id="lg-pwb">I have a password</button>';
    r.innerHTML = '<div class="app-reception"><main class="pg narrow" style="padding-top:64px"><div class="card pad" style="display:grid;gap:14px">' + inner + '</div><p class="muted small" style="text-align:center">Clinic Desk · bas30din</p></main></div>';
    const $ = id => document.getElementById(id);
    const busy = b => r.querySelectorAll('button').forEach(x => { x.disabled = b; });
    const phOk = () => { const p = ($('lg-ph') ? $('lg-ph').value : LG.ph).replace(/\D/g, ''); if (p.length !== 10) { LG.err = 'Enter your 10-digit mobile number.'; drawLogin(); return null; } LG.ph = p; return p; };
    if ($('lg-otp')) $('lg-otp').onclick = () => { const p = phOk(); if (!p) return; busy(true); post({ action: 'otp_send', phone: p }).then(x => { LG.err = ''; if (!x.ok) { LG.err = x.error || 'Could not send the code.'; } else if (x.viaWa) LG.step = 'wa'; else { LG.step = 'code'; LG.sentTo = x.sentTo; } drawLogin(); }).catch(() => { LG.err = 'No internet. Try again.'; drawLogin(); }); };
    if ($('lg-pwb')) $('lg-pwb').onclick = () => { const p = phOk(); if (!p) return; LG.step = 'pw'; LG.err = ''; drawLogin(); };
    if ($('lg-back')) $('lg-back').onclick = () => { LG.step = 'phone'; LG.err = ''; drawLogin(); };
    const done = x => { if (!x.ok) { LG.err = x.error || 'Could not log in.'; drawLogin(); return; } store('cd_sid', x.sid); store('cd_role', x.role); L.sid = x.sid; L.role = x.role; LG = { step: 'phone', ph: '', err: '' }; boot(); };
    if ($('lg-go')) $('lg-go').onclick = () => {
      busy(true);
      const q = LG.step === 'code' ? { action: 'otp_verify', phone: LG.ph, code: ($('lg-code').value || '').replace(/\D/g, '') } : { action: 'pw_login', phone: LG.ph, pw: $('lg-pw').value };
      post(q).then(done).catch(() => { LG.err = 'No internet. Try again.'; drawLogin(); });
    };
    const inp = r.querySelector('input'); if (inp) { inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('lg-go') || $('lg-otp'); if (b) b.click(); } }); setTimeout(() => inp.focus(), 0); }
  }

  /* ---------- start ---------- */
  function boot() {
    document.getElementById('root').innerHTML = '<div class="pg narrow" style="padding-top:120px;text-align:center" class="muted">Opening the desk…</div>';
    post({ sid: L.sid, v8: true }).then(r => {
      if (r && r.auth) return loggedOut(r.error);
      if (!r.v8) { document.getElementById('root').innerHTML = '<main class="pg narrow" style="padding-top:80px"><div class="card pad bad">The desk could not load. ' + esc(r.v8err ? 'Error on the server.' : (r.error || '')) + '</div><a href="?old=1">Open the old desk</a></main>'; return; }
      L.role = (r.v8.me && r.v8.me.role) || L.role; store('cd_role', L.role);
      CD.send = () => {}; CD.tick = () => {};
      apply(r.v8);
      if (!CD.allowApp(UI.app) || !location.hash) { UI.app = CD.homeApp(); UI.scr = 'home'; }
      CD.start();
      setInterval(() => { if (!document.hidden) refresh(false); }, 7000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
      window.addEventListener('online', () => { L.offline = false; pump(); refresh(false); });
    }).catch(() => { document.getElementById('root').innerHTML = '<main class="pg narrow" style="padding-top:80px"><div class="card pad">No internet. <button class="btn" onclick="location.reload()">Try again</button></div></main>'; });
  }
  CD.liveBoot = function () {
    const qs = new URLSearchParams(location.search);
    const code = qs.get('code');
    if (code) {
      history.replaceState(null, '', location.pathname);
      post({ action: 'login', code }).then(x => { if (!x.ok) return drawLogin(x.error || 'This login link has expired.'); store('cd_sid', x.sid); store('cd_role', x.role); L.sid = x.sid; L.role = x.role; boot(); }).catch(() => drawLogin('No internet. Try again.'));
      return;
    }
    if (L.sid) boot(); else drawLogin();
  };
})();
