/* Clinic Desk — Reception app (every screen working) */
(function () {
  'use strict';
  const CD = window.CD, A = CD.A, R = CD.R, UI = CD.UI;
  const esc = CD.esc, rs = CD.rs;
  const S = () => CD.S, C = () => CD.C();

  const KIND = { new: 'New', follow: 'Follow-up', proc: 'Procedure' };
  const visitLabel = v => { const p = CD.P(v.pid); const k = KIND[v.kind] || 'Visit'; return k + (p && p.problem && v.kind !== 'proc' ? ' · ' + p.problem : '') + ' · ' + CD.doc(v.doc).short; };
  const feeDue = v => (v.bill ? 0 : CD.feeItems(v.pid, v.kind, v.tr).reduce((s, x) => s + x.amt, 0));
  const unpaidToday = () => CD.todays().filter(v => ['waiting', 'cabin', 'booked', 'done'].includes(v.status) && !v.bill && feeDue(v) > 0 && !v.payLaterOk);
  const collected = date => C().bills.filter(b => b.date === date).reduce((s, b) => s + CD.netOf(b), 0);

  /* ---------- shared: train ---------- */
  CD.trainHtml = function (docId, youPid, phone) {
    const d = CD.doc(docId);
    const cabin = CD.inCabin(docId);
    const wait = CD.waiting(docId);
    const max = phone ? 3 : 6;
    let shown = wait.slice(0, max);
    if (youPid && !shown.some(v => v.pid === youPid)) { const yv = wait.find(v => v.pid === youPid); if (yv) shown = shown.slice(0, max - 1).concat([yv]); }
    const more = wait.length - shown.length;
    const coaches = shown.slice().reverse().map(v => { const p = CD.P(v.pid); const you = phone ? v.pid === youPid : wait[0] === v; return '<div class="coach' + (you ? ' you' : '') + '">' + (phone ? (v.pid === youPid ? 'You' : esc(v.tok)) : esc(v.tok) + '<small>' + esc(CD.first(p ? p.name : '')) + '</small>') + '</div>'; }).join('');
    const eng = d.status === 'out' && d.out ? '<div class="coach eng out">Back ' + CD.tShort(d.out.until) + '<small>' + (phone ? 'Doctor out' : esc(d.short) + ' stepped out') + '</small></div>'
      : '<div class="coach eng">' + (cabin ? esc(cabin.tok) + (phone ? '' : ' inside') : 'Free') + '<small>' + (phone ? 'Doctor' : esc(d.short) + '\'s cabin') + '</small></div>';
    return '<div class="train">' + (more > 0 ? '<span class="muted small" style="padding-bottom:18px;flex:none">+' + more + (phone ? '' : ' more') + '</span>' : '') + coaches + eng + '</div><div class="track" aria-hidden="true"></div>';
  };

  /* ---------- shared: receipt ---------- */
  CD.receiptHtml = function (b) {
    const c = C(), p = CD.P(b.pid);
    let gstTotal = 0;
    const lines = b.items.map(it => {
      const r = it.gst || 0; const base = r ? it.amt / (1 + r / 100) : it.amt; gstTotal += it.amt - base;
      return '<div class="flex" style="justify-content:space-between;padding:6px 0"><span>' + esc(it.n) + '</span><span>' + rs(r ? base : it.amt) + '</span></div>';
    }).join('');
    const gst = gstTotal > 0.5 ? '<div class="flex muted" style="justify-content:space-between;padding:6px 0"><span>GST 18% (CGST ' + rs(gstTotal / 2) + ' + SGST ' + rs(gstTotal / 2) + ')</span><span>' + rs(gstTotal) + '</span></div>' : '';
    const disc = b.discount ? '<div class="flex muted" style="justify-content:space-between;padding:6px 0"><span>Discount</span><span>− ' + rs(b.discount) + '</span></div>' : '';
    const stamp = b.refund ? '<span class="stamp bad">Refunded</span>' : '<span class="stamp ok">Paid · ' + esc(b.mode) + '</span>';
    return '<div class="paper"><div class="flex" style="justify-content:space-between;align-items:flex-start"><div><div class="serif" style="font-size:22px;font-weight:600">' + esc(c.name) + '</div><div class="muted small">Bill ' + esc(b.no) + ' · ' + CD.d(b.date) + ' · ' + CD.t(b.time) + (c.gstin ? ' · GSTIN ' + esc(c.gstin) : '') + '</div><div class="small" style="margin-top:4px">' + esc(p ? p.name : '') + (p ? ' · ' + CD.mask(p.phone) : '') + '</div></div>' + stamp + '</div><div class="dash" style="margin:14px 0 6px"></div>' + lines + disc + gst + '<div class="dash" style="margin:6px 0"></div><div class="flex" style="justify-content:space-between;font-size:20px;font-weight:700"><span>Total</span><span>' + rs(b.total) + '</span></div>' + (b.refund ? '<div class="bad small" style="margin-top:6px">Refunded ' + rs(b.refund.amt) + ' on ' + CD.d(b.refund.date) + ' · ' + esc(b.refund.reason) + '</div>' : '') + '<div class="tear"></div></div>';
  };
  CD.printReceipt = b => { if (CD.docs && CD.docs.receipt) return CD.print('Receipt ' + b.no, CD.docs.receipt(b)); const c = C(); CD.print('Bill ' + b.no, CD.receiptHtml(b).replace(/class="paper"/, 'style="max-width:420px;border:1px solid #ccc;padding:20px;border-radius:10px"').replace(/class="flex[^"]*"/g, 'style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:4px 0"').replace(/class="dash"[^>]*>/g, 'style="border-top:1px dashed #aaa;margin:8px 0">') + '<p style="font-size:12px;color:#666">Thank you for visiting ' + esc(c.name) + '.</p>'); };

  /* ---------- header ---------- */
  function hdr() {
    const docs = C().doctors.map(d => {
      const col = d.status === 'in' ? '#2E7D4F' : d.status === 'out' ? '#C58A12' : '#B9AE99';
      const txt = d.status === 'in' ? d.short + ' in cabin' : d.status === 'out' ? d.short + ' back ' + CD.tShort(d.out.until) : d.status === 'gone' ? d.short + ' gone for the day' : d.short + ' from ' + CD.tShort(d.from);
      return '<span class="flex small" style="gap:7px"><span aria-hidden="true" style="width:9px;height:9px;border-radius:5px;background:' + col + '"></span>' + esc(txt) + '</span>';
    }).join('');
    return CD.header('Reception', docs + '<span class="muted" style="margin-left:10px">' + CD.esc(CD.meName()) + ' · ' + CD.t(S().clock) + '</span>');
  }
  const outBanners = () => C().doctors.filter(d => d.status === 'out' && d.out).map(d => '<div class="banner"><strong>' + esc(d.short) + ' stepped out</strong><span>' + esc(d.out.reason) + ' · back by ' + CD.t(d.out.until) + ' · ' + d.out.told + ' waiting patients were told on WhatsApp</span></div>').join('');

  const SC = {};
  CD.apps.reception = { screens: SC };

  /* ================= HOME ================= */
  SC.home = function () {
    const c = C(), s = S();
    const tq = CD.todays();
    const waiting = tq.filter(v => v.status === 'waiting');
    const firstWait = CD.waiting()[0];
    const unpaid = unpaidToday();
    const calls = c.calls.filter(x => !x.done);
    const tmr = CD.addDays(s.today, 1);
    const apToday = c.appts.filter(a => a.date === s.today).length + tq.filter(v => v.booked).length;
    const apTmr = c.appts.filter(a => a.date === tmr).length;
    const closed = s.dayClosed[c.id];
    const docsIn = C().doctors.filter(d => d.status === 'in' || d.status === 'out');
    const now = docsIn.length ? docsIn.map(d => {
      const cab = CD.inCabin(d.id), nx = CD.waiting(d.id)[0];
      const pc = cab && CD.P(cab.pid), pn = nx && CD.P(nx.pid);
      return '<section class="card soft" style="display:flex;flex-wrap:wrap;align-items:center;gap:22px;padding:20px 26px" aria-label="Now with ' + esc(d.short) + '">' +
        '<div style="flex:1 1 280px"><div class="muted small">With ' + esc(d.short) + ' now</div><div style="font-size:20px;font-weight:600">' + (cab ? esc(cab.tok) + ' · ' + esc(pc.name) : (d.status === 'out' ? 'Doctor stepped out' : 'Cabin is free')) + '</div></div>' +
        '<div style="flex:1 1 280px"><div class="muted small">Next to go in</div><div style="font-size:20px;font-weight:600">' + (nx ? esc(nx.tok) + ' · ' + esc(pn.name) : 'No one waiting') + '</div></div>' +
        '<button class="btn" data-a="sendNext" data-doc="' + d.id + '"' + (nx && d.status === 'in' ? '' : ' disabled') + '>Send next patient in</button></section>';
    }).join('') : '<section class="card soft pad">No doctor is in the cabin right now. ' + esc(C().doctors.map(d => d.short + ' from ' + CD.tShort(d.from)).join(' · ')) + '</section>';

    const tiles = [
      CD.tile('newp', '+', 'New patient', 'Register and give a token', 'var(--a)', '#FFFFFF'),
      CD.tile('queue', String(waiting.length), 'Queue', waiting.length ? waiting.length + ' waiting · next is ' + (firstWait ? firstWait.tok : '') : 'No one waiting', 'var(--at)', 'var(--a)'),
      CD.tile('pay', '₹', 'Take payment', unpaid.length ? unpaid.length + ' patient' + (unpaid.length > 1 ? 's' : '') + ' not paid yet' : 'Everyone has paid', '#F3E6CC', '#6B4300', unpaid.length ? 'warn' : ''),
      CD.tile('calls', String(calls.length), 'Calls to return', calls.length ? calls.length + ' people asked for a call' : 'All calls done', calls.length ? '#F6E1DF' : '#E8EFE9', calls.length ? '#8E2A22' : '#24563A', calls.length ? 'bad' : 'ok')
    ];
    if (c.boxes.r_appt) tiles.push(CD.tile('appt', '◷', 'Appointments', 'Today ' + apToday + ' · Tomorrow ' + apTmr, 'var(--at)', 'var(--a)'));
    if (c.boxes.r_close) tiles.push(CD.tile('close', '✓', 'Close the day', closed ? 'Closed at ' + CD.t(closed) + ' ✓' : 'Count cash before you leave', '#E8EFE9', '#24563A', closed ? 'ok' : ''));
    const done = tq.filter(v => v.status === 'done').length;
    return hdr() + '<main class="pg">' +
      '<div><label class="card flex" style="height:64px;padding:0 22px;border-radius:16px;border-width:1.5px"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B6474" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input id="home-search" data-f="q" data-u="search" value="' + esc(UI.f.q || '') + '" placeholder="Search a patient — name or phone number" autocomplete="off" style="flex:1;border:0;outline:none;font-size:19px;background:transparent"><span class="muted small">F2</span></label>' + CD.region('search') + '</div>' +
      outBanners() + now +
      '<div class="tiles">' + tiles.join('') + '</div>' +
      '<div class="flex wrap" style="justify-content:center;gap:10px"><span class="muted">More:</span>' + [['patients', 'Patients'], ['bills', 'Bills and refunds'], ['inbox', 'WhatsApp inbox'], ['status', 'Doctor status'], ['more', 'Print and export']].map(([k, l]) => '<button class="link" data-a="nav" data-v="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<p class="muted" style="margin:0;text-align:center;font-size:16px">Today: ' + done + ' seen · ' + waiting.length + ' waiting · ' + rs(collected(s.today)) + ' collected</p></main>';
  };
  R.search = function () {
    const q = (UI.f.q || '').trim().toLowerCase();
    if (q.length < 2) return '';
    const dig = q.replace(/\D/g, '');
    const res = C().patients.filter(p => !p.merged && (p.name.toLowerCase().includes(q) || (dig.length >= 3 && p.phone.includes(dig)))).slice(0, 6);
    if (!res.length) return '<div class="search-res"><div class="search-drop"><button data-a="nav" data-v="newp">No one found. <strong style="color:var(--a)">Register "' + esc(UI.f.q) + '" as a new patient →</strong></button></div></div>';
    return '<div class="search-res"><div class="search-drop">' + res.map(p => { const lv = CD.lastVisit(p.id); return '<button data-a="openP" data-id="' + p.id + '"><span class="grow"><strong>' + esc(p.name) + '</strong> <span class="muted">· ' + esc(CD.as(p)) + '</span><br><span class="muted small">' + CD.phoneFmt(p.phone) + (lv ? ' · last visit ' + CD.d(lv.date) : ' · no visits yet') + '</span></span><span class="badge b-a">Open</span></button>'; }).join('') + '</div></div>';
  };
  A.openP = ds => CD.go('reception', 'patient', { id: ds.id });

  A.sendNext = function (ds) {
    const d = CD.doc(ds.doc);
    if (d.status === 'out') { CD.toast(d.short + ' is out until ' + CD.t(d.out.until)); return; }
    const cab = CD.inCabin(d.id);
    const nx = CD.waiting(d.id)[0];
    if (!nx) { CD.toast('No one is waiting for ' + d.short); return; }
    if (cab) {
      const p = CD.P(cab.pid);
      CD.modal('<h2 class="t">' + esc(p.name) + ' is still with ' + esc(d.short) + '</h2><p class="muted" style="margin:0">Usually the doctor taps "Finish" in her app. If she has finished, you can mark it here.</p><div class="flex wrap"><button class="btn" data-a="finishCabinAndNext" data-doc="' + d.id + '">Yes, ' + esc(CD.first(p.name)) + ' is done — send next</button><button class="ghost" data-a="close">Wait</button></div>');
      return;
    }
    sendIn(nx, ds.force);
  };
  A.finishCabinAndNext = ds => { const cab = CD.inCabin(ds.doc); if (cab) { cab.status = 'done'; cab.ended = S().clock; } CD.closeModal(); const nx = CD.waiting(ds.doc)[0]; if (nx) sendIn(nx); else CD.render(); };
  function sendIn(v, force) {
    const p = CD.P(v.pid);
    const due = feeDue(v);
    if (due > 0 && !force && !v.payLaterOk) {
      CD.modal('<h2 class="t">' + esc(p.name) + ' hasn\'t paid ' + rs(due) + '</h2><div class="flex wrap"><button class="btn" data-a="nav" data-v="pay" data-p=\'' + JSON.stringify({ pid: v.pid }) + '\'>Take payment first</button><button class="ghost" data-a="sendAnyway" data-tok="' + v.tok + '">Send in, pay after</button></div>');
      return;
    }
    v.status = 'cabin'; v.started = S().clock;
    CD.send(v.pid, 'turn', { token: v.tok }, 'Your turn');
    CD.tick(1);
    CD.closeModal();
    CD.toast(v.tok + ' ' + p.name + ' sent in · WhatsApp sent', true);
    CD.render();
  }
  A.sendAnyway = ds => { const v = CD.todays().find(x => x.tok === ds.tok); v.payLaterOk = true; sendIn(v, true); };

  /* ================= QUEUE ================= */
  SC.queue = function () {
    const docs = C().doctors.filter(d => CD.todays().some(v => v.doc === d.id));
    const sel = UI.f.qdoc || (docs[0] ? docs[0].id : (C().doctors[0] || {}).id);
    const d = CD.doc(sel);
    const cab = CD.inCabin(sel);
    const list = CD.queue(sel);
    const nx = CD.waiting(sel)[0];
    const doneL = CD.todays().filter(v => v.doc === sel && (v.status === 'done' || v.status === 'left')).sort((a, b) => CD.tokN(b) - CD.tokN(a));
    const row = (v, isCab) => {
      const p = CD.P(v.pid); const due = feeDue(v);
      let st, stc, act, aa;
      if (isCab) { st = 'With doctor'; stc = 'b-ink'; act = 'Details'; aa = 'data-a="visitDetail" data-tok="' + v.tok + '"'; }
      else if (v.status === 'booked') { st = 'Not arrived · booked ' + CD.tShort(v.booked); stc = 'b-a'; act = 'Mark arrived'; aa = 'data-a="arrived" data-tok="' + v.tok + '"'; }
      else if (due > 0 && !v.payLaterOk) { st = 'Not paid'; stc = 'b-warn'; act = 'Take ' + rs(due); aa = 'data-a="nav" data-v="pay" data-p=\'' + JSON.stringify({ pid: v.pid }) + '\''; }
      else { st = v.bill ? 'Paid' : (due ? 'Pay after' : 'Free follow-up'); stc = 'b-ok'; act = nx === v && !cab && d.status === 'in' ? 'Send in' : 'Details'; aa = act === 'Send in' ? 'data-a="sendNext" data-doc="' + sel + '"' : 'data-a="visitDetail" data-tok="' + v.tok + '"'; }
      return '<div class="card list-card" style="' + (isCab ? 'background:var(--as);border-color:var(--al)' : '') + '"><span class="tok">' + esc(v.tok) + '</span><button class="grow" data-a="visitDetail" data-tok="' + v.tok + '" style="text-align:left;background:none;border:0;padding:0"><div class="nm2">' + esc(p.name) + '</div><div class="muted" style="font-size:16px">' + esc(visitLabel(v)) + (CD.as(p) ? ' · ' + esc(CD.as(p)) : '') + '</div></button><span class="badge ' + stc + '">' + esc(st) + '</span><button class="ghost" style="min-width:150px" ' + aa + '>' + esc(act) + '</button></div>';
    };
    return hdr() + '<main class="pg mid">' + CD.backBtn() +
      '<div class="flex wrap" style="align-items:flex-end"><h1 class="t grow">Queue · ' + CD.waiting(sel).length + ' waiting</h1>' + (nx && d.status === 'in' ? '<button class="btn" data-a="sendNext" data-doc="' + sel + '">Send ' + esc(nx.tok) + ' in</button>' : '') + '</div>' +
      (docs.length > 1 ? CD.choices('qdoc', docs.map(x => [x.id, x.short]), sel, 'sm') : '') +
      outBanners() +
      '<section class="card" aria-label="Live queue train" style="padding:22px 26px 26px"><div class="muted small" style="margin-bottom:14px">Live queue — patients see this same train on their phone</div>' + CD.trainHtml(sel) + '</section>' +
      (cab ? row(cab, true) : '') +
      (list.length ? list.map(v => row(v)).join('') : CD.empty('No one is waiting for ' + d.short + '.')) +
      '<p class="muted" style="margin:4px 0 0">' + doneL.length + ' patients already seen today · <button class="txt" data-a="pick" data-k="showDone" data-v="' + (UI.f.showDone === '1' ? '0' : '1') + '">' + (UI.f.showDone === '1' ? 'hide them' : 'show them') + '</button></p>' +
      (UI.f.showDone === '1' ? '<div class="card" style="padding:4px 24px">' + doneL.map(v => { const p = CD.P(v.pid); return '<div class="row"><span class="tok" style="color:#9AA1AE;font-size:18px">' + v.tok + '</span><span class="grow" style="' + (v.status === 'left' ? 'text-decoration:line-through;color:#8E2A22' : '') + '">' + esc(p.name) + '</span><span class="muted small">' + esc(visitLabel(v)) + '</span><span class="badge ' + (v.status === 'left' ? 'b-bad' : 'b-ok') + '">' + (v.status === 'left' ? 'Left' : 'Done') + '</span></div>'; }).join('') + '</div>' : '') +
      '</main>';
  };
  A.arrived = ds => { const v = CD.todays().find(x => x.tok === ds.tok); v.status = 'waiting'; v.arrived = S().clock; CD.tick(1); CD.send(v.pid, 'token', { token: v.tok, doctor: CD.doc(v.doc).name }, 'Token sent'); CD.toast(CD.P(v.pid).name + ' marked arrived · token link sent', true); CD.render(); };
  A.visitDetail = function (ds) {
    const v = CD.todays().find(x => x.tok === ds.tok); const p = CD.P(v.pid); const b = CD.billOf(v);
    const others = C().doctors.filter(d => d.id !== v.doc);
    CD.modal('<div class="flex"><span class="tok" style="font-size:30px">' + esc(v.tok) + '</span><div class="grow"><h2 class="t">' + esc(p.name) + '</h2><div class="muted">' + esc(CD.as(p)) + (p.rel ? ' · ' + esc(p.rel) : '') + ' · ' + CD.phoneFmt(p.phone) + '</div></div></div>' +
      '<div class="card pad soft">' + esc(visitLabel(v)) + '<br><span class="muted small">Came at ' + CD.t(v.time) + (b ? ' · paid ' + rs(b.total) + ' by ' + b.mode : (feeDue(v) ? ' · not paid (' + rs(feeDue(v)) + ')' : ' · nothing to pay')) + '</span></div>' +
      '<div class="flex wrap">' + (v.status === 'waiting' ? '<button class="ghost sm" data-a="moveEnd" data-tok="' + v.tok + '">Move to the end</button>' : '') +
      (others.length && v.status !== 'cabin' ? others.map(o => '<button class="ghost sm" data-a="changeDoc" data-tok="' + v.tok + '" data-doc="' + o.id + '">Send to ' + esc(o.short) + ' instead</button>').join('') : '') +
      (v.status === 'cabin' ? '<button class="ghost sm" data-a="finishVisit" data-tok="' + v.tok + '">Mark done</button>' : '') +
      '<button class="ghost sm" data-a="openP" data-id="' + p.id + '">Open patient</button>' +
      (v.status !== 'cabin' ? '<button class="ghost sm" style="color:#8E2A22;border-color:#E8B9B4" data-a="markLeft" data-tok="' + v.tok + '">Patient left</button>' : '') + '</div><div class="right"><button class="txt" data-a="close">Close</button></div>');
  };
  A.moveEnd = ds => { const v = CD.todays().find(x => x.tok === ds.tok); const max = Math.max(...CD.todays().map(CD.tokN)); v.origTok = v.origTok || v.tok; v.tok = 'A-' + (max + 1); C().tokNext = max + 2; CD.send(v.pid, 'token', { token: v.tok, doctor: CD.doc(v.doc).name }, 'Token changed'); CD.closeModal(); CD.toast(CD.P(v.pid).name + ' moved to the end · new token ' + v.tok, true); CD.render(); };
  A.changeDoc = ds => { const v = CD.todays().find(x => x.tok === ds.tok); v.doc = ds.doc; CD.closeModal(); CD.toast('Sent to ' + CD.doc(ds.doc).short); CD.render(); };
  A.finishVisit = ds => { const v = CD.todays().find(x => x.tok === ds.tok); v.status = 'done'; v.ended = S().clock; CD.closeModal(); CD.render(); };
  A.markLeft = function (ds) {
    const v = CD.todays().find(x => x.tok === ds.tok); const b = CD.billOf(v);
    CD.modal('<h2 class="t">' + esc(CD.P(v.pid).name) + ' left without seeing the doctor?</h2>' + (b ? '<p style="margin:0">She paid ' + rs(b.total) + ' by ' + b.mode + '.</p>' : '') + '<div class="flex wrap">' + (b && C().perms.refund ? '<button class="btn red" data-a="leftRefund" data-tok="' + v.tok + '">Yes, and refund ' + rs(b.total) + '</button>' : '') + '<button class="ghost" data-a="leftNoRefund" data-tok="' + v.tok + '">Yes' + (b ? ', no refund' : '') + '</button><button class="txt" data-a="close">Cancel</button></div>');
  };
  A.leftRefund = ds => { const v = CD.todays().find(x => x.tok === ds.tok); const b = CD.billOf(v); doRefund(b, b.total, 'Left before seeing the doctor'); v.status = 'left'; CD.closeModal(); CD.render(); };
  A.leftNoRefund = ds => { const v = CD.todays().find(x => x.tok === ds.tok); v.status = 'left'; CD.closeModal(); CD.toast('Marked as left'); CD.render(); };

  /* ================= NEW PATIENT ================= */
  SC.newp = function () {
    const f = UI.f, c = C();
    if (f.init !== 1) {
      f.init = 1; f.sex = f.sex || 'F'; f.kind = f.kind || 'new'; f.mode = f.mode || 'UPI'; f.src = f.src || 'Walk-in';
      const inDoc = c.doctors.find(d => d.status === 'in') || c.doctors[0]; f.doc = f.doc || (inDoc && inDoc.id);
      if (UI.prm.pid) { const p = CD.P(UI.prm.pid); Object.assign(f, { pid: p.id, phone: p.phone, name: p.name, age: String(p.age || ''), sex: p.sex, kind: CD.lastVisit(p.id) ? 'follow' : 'new' }); }
    }
    const docs = c.doctors.map(d => [d.id, d.short + (d.status === 'in' ? ' · now' : d.status === 'out' ? ' · back ' + CD.tShort(d.out.until) : ' · from ' + CD.tShort(d.from))]);
    const ff = CD.visitFee(f.pid, 'follow');
    const procs = c.treatments.filter(t => t.cat === 'procedure');
    return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">New patient</h1>' +
      '<div><span class="flbl">Phone number (we check if they came before)</span><input class="field" data-f="phone" data-u="match,submit" inputmode="numeric" maxlength="10" value="' + esc(f.phone || '') + '" placeholder="10-digit mobile" style="font-size:22px;letter-spacing:1px" data-autofocus></div>' +
      CD.region('match') +
      '<div class="grid2" style="grid-template-columns:2fr 1fr"><div><span class="flbl">Full name</span><input class="field" data-f="name" data-u="submit" value="' + esc(f.name || '') + '" placeholder="Name"></div><div><span class="flbl">Age</span><input class="field" data-f="age" inputmode="numeric" value="' + esc(f.age || '') + '" placeholder="Years"></div></div>' +
      '<div><span class="flbl">Gender</span>' + CD.choices('sex', [['F', 'Female'], ['M', 'Male'], ['O', 'Other']], f.sex) + '</div>' +
      '<div><span class="flbl">Doctor</span>' + CD.choices('doc', docs, f.doc) + '</div>' +
      '<div><span class="flbl">Visit</span>' + CD.choices('kind', [['new', 'New problem · ' + rs(c.fee)], ['follow', 'Follow-up · ' + (ff ? rs(ff) : 'free')], ['proc', 'Procedure']], f.kind) + '</div>' +
      (f.kind === 'proc' ? '<div><span class="flbl">Which procedure</span>' + CD.choices('tr', procs.map(t => [t.id, t.n + ' · ' + rs(t.p)]), f.tr || '', 'sm') + '</div>' : '') +
      '<div><span class="flbl">Payment</span>' + CD.choices('mode', ['UPI', 'Cash', 'Card', ['later', 'Pay later']], f.mode) + '</div>' +
      (!f.pid ? '<div><span class="flbl">How did they find us?</span>' + CD.choices('src', ['Walk-in', 'WhatsApp bot', 'Missed call', 'Referral', 'Instagram', 'Google'], f.src, 'sm') + '</div>' : '') +
      CD.region('submit') + '</main>';
  };
  R.match = function () {
    const f = UI.f; const ph = (f.phone || '').replace(/\D/g, '');
    if (ph.length < 10) return '';
    if (f.pid) { const p = CD.P(f.pid); if (p && p.phone === ph) return '<div class="card soft flex" style="padding:16px 20px"><span class="grow"><strong>Using ' + esc(p.name) + '\'s details</strong><br><span class="muted small">' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + C().visits.filter(v => v.pid === p.id).length + ' visits</span></span><button class="txt" data-a="unuseP">Not her? Register new</button></div>'; }
    const p = C().patients.find(x => x.phone === ph && !x.merged);
    if (!p) return '<div class="muted small">New number — fill the details below.</div>';
    const n = C().visits.filter(v => v.pid === p.id && v.status === 'done').length; const lv = CD.lastVisit(p.id);
    return '<div class="card soft flex" style="padding:16px 20px"><span class="grow"><strong>' + esc(p.name) + ' came before</strong><br><span class="muted small">' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + n + ' visits' + (lv ? ' · last on ' + CD.d(lv.date) : '') + '</span></span><button class="ghost" data-a="useP" data-id="' + p.id + '">Use ' + (p.sex === 'F' ? 'her' : 'his') + ' details</button></div>';
  };
  A.useP = ds => { const p = CD.P(ds.id); const lv = CD.lastVisit(p.id); Object.assign(UI.f, { pid: p.id, name: p.name, age: String(p.age || ''), sex: p.sex, kind: lv ? 'follow' : 'new', doc: p.doc && CD.doc(p.doc).status !== 'gone' ? p.doc : UI.f.doc }); CD.render(); };
  A.unuseP = () => { delete UI.f.pid; UI.f.name = ''; UI.f.age = ''; CD.render(); };
  R.submit = function () {
    const f = UI.f;
    const items = CD.feeItems(f.pid, f.kind, f.tr);
    const amt = items.reduce((s, x) => s + x.amt, 0);
    const tokPreview = 'A-' + Math.max(C().tokNext || 1, ...CD.todays().map(CD.tokN).filter(x => x < 900).map(x => x + 1));
    const label = amt && f.mode !== 'later' ? 'Take ' + rs(amt) + ' and give token ' + tokPreview : 'Give token ' + tokPreview + (amt ? ' · pay later' : '');
    return '<div id="np-err" class="bad small" style="min-height:4px"></div><button class="btn big full" data-a="registerP">' + label + '</button>';
  };
  A.registerP = function () {
    const f = UI.f, c = C(), s = S();
    const ph = (f.phone || '').replace(/\D/g, '');
    const errs = [];
    if (ph.length !== 10) errs.push('phone number (10 digits)');
    if (!(f.name || '').trim()) errs.push('name');
    if (!f.pid && !(f.age || '').trim()) errs.push('age');
    if (f.kind === 'proc' && !f.tr) errs.push('which procedure');
    if (errs.length) { document.getElementById('np-err').textContent = 'Please fill the ' + errs.join(', ') + '.'; return; }
    let p = f.pid ? CD.P(f.pid) : null;
    if (!p) {
      p = { id: CD.uid('p'), name: f.name.trim().replace(/\b\w/g, m => m.toUpperCase()), sex: f.sex, age: Number(f.age) || 0, phone: ph, rel: '', since: s.today, source: f.src || 'Walk-in', problem: '', words: '', allergies: 'None told', outcome: '', doc: f.doc };
      c.patients.push(p);
    } else { p.name = f.name.trim(); if (f.age) p.age = Number(f.age) || p.age; p.sex = f.sex; }
    const tok = CD.nextTok();
    const v = { date: s.today, time: s.clock, pid: p.id, doc: f.doc, kind: f.kind, tr: f.tr, status: 'waiting', tok };
    c.visits.push(v);
    const items = CD.feeItems(p.id === f.pid ? p.id : null, f.kind, f.tr);
    let b = null;
    if (items.length && f.mode !== 'later') { b = CD.makeBill(p.id, items, f.mode); v.bill = b.no; }
    if (f.mode === 'later') v.payLaterOk = true;
    CD.send(p.id, 'token', { token: tok, doctor: CD.doc(f.doc).name }, 'Token sent');
    if (b) CD.send(p.id, 'receipt', { bill: b.no, amount: b.total, mode: b.mode, link: CD.link(p.id, 'bills') }, 'Receipt');
    CD.tick(2);
    const ahead = CD.waiting(f.doc).filter(x => x !== v).length + (CD.inCabin(f.doc) ? 1 : 0);
    CD.modal('<div class="muted">Token for ' + esc(p.name) + '</div><div style="font-size:80px;font-weight:700;line-height:1;color:var(--a)">' + tok + '</div><div style="font-size:19px">' + esc(CD.doc(f.doc).name) + ' · about ' + ahead + ' before ' + (p.sex === 'F' ? 'her' : 'him') + '</div><div class="card pad soft small">✓ WhatsApp sent with the live queue link' + (b ? ' and the bill (' + rs(b.total) + ', ' + b.mode + ')' : '') + '.</div><div class="flex wrap"><button class="btn" data-a="printTok" data-tok="' + tok + '">Print token slip</button><button class="ghost" data-a="nav" data-v="newp">Next new patient</button><button class="ghost" data-a="nav" data-v="home">Home</button></div>');
    UI.f = {};
  };
  A.printTok = ds => { if (CD.docs && CD.docs.token) return CD.print('Token ' + ds.tok, CD.docs.token(CD.todays().find(x => x.tok === ds.tok))); const v = CD.todays().find(x => x.tok === ds.tok); const p = CD.P(v.pid); CD.print('Token ' + v.tok, '<div style="width:260px;text-align:center;border:1px dashed #999;padding:18px;border-radius:8px"><div class="serif" style="font-size:18px">' + esc(C().name) + '</div><div style="font-size:64px;font-weight:700">' + v.tok + '</div><div>' + esc(p.name) + '</div><div style="color:#666">' + esc(CD.doc(v.doc).name) + ' · ' + CD.d(v.date) + ' ' + CD.t(v.time) + '</div><div style="margin-top:10px;font-size:12px">Track your turn: ' + CD.link(p.id) + '</div></div>'); };

  /* ================= PAYMENT ================= */
  SC.pay = function () {
    const f = UI.f, c = C();
    const list = unpaidToday();
    if (f.init !== 1) {
      f.init = 1; f.mode = 'UPI'; f.wa = true;
      const pid = UI.prm.pid || (list[0] && list[0].pid);
      if (pid) selectPay(pid);
    }
    const sel = f.pid ? CD.P(f.pid) : null;
    const v = sel ? CD.todays().find(x => x.pid === sel.id && !x.bill) : null;
    const left = '<div style="flex:1 1 340px;display:flex;flex-direction:column;gap:12px"><div class="muted">Not paid yet · ' + list.length + '</div>' +
      (list.length ? list.map(x => { const p = CD.P(x.pid); const on = f.pid === p.id; return '<button class="card" data-a="selPay" data-id="' + p.id + '" style="padding:16px 20px;text-align:left;display:flex;justify-content:space-between;align-items:center;' + (on ? 'border-color:var(--a);background:var(--as);border-width:1.5px' : '') + '"><span><span style="font-size:19px;font-weight:600">' + esc(p.name) + '</span><br><span class="muted" style="font-size:16px">' + esc(x.tok) + ' · ' + esc(KIND[x.kind]) + '</span></span><span style="font-size:19px;font-weight:600">' + rs(feeDue(x)) + '</span></button>'; }).join('') : CD.empty('Everyone has paid.')) +
      '<button class="ghost" data-a="otherBill">+ Bill someone else (medicines, procedure)</button></div>';
    let right;
    if (!sel) right = '<div class="card pad" style="flex:1 1 420px">Pick a patient on the left.</div>';
    else {
      const items = f.items || [];
      right = '<div class="card" style="flex:1 1 420px;padding:28px;display:flex;flex-direction:column;gap:16px"><div class="muted">' + esc(sel.name) + (v ? ' · ' + esc(v.tok) + ' · ' + esc(KIND[v.kind]) : '') + '</div>' +
        '<div>' + items.map((it, i) => '<div class="row" style="padding:10px 0"><span class="grow">' + esc(it.n) + '</span><span style="font-weight:600">' + rs(it.amt) + '</span><button class="txt" style="text-decoration:none;color:#8E2A22" aria-label="Remove ' + esc(it.n) + '" data-a="rmItem" data-i="' + i + '">✕</button></div>').join('') +
        '<label class="flex small" style="margin-top:8px"><span class="muted">Add</span><select class="field" style="height:46px;font-size:16px" data-ac="addItem"><option value="">Choose a treatment or medicines…</option>' + c.treatments.map(t => '<option value="' + t.id + '">' + esc(t.n) + ' · ' + rs(t.p) + '</option>').join('') + '</select></label></div>' +
        (c.perms.discount ? '<label class="flex"><span class="muted grow">Discount (₹)</span><input class="field" style="width:140px;height:46px" inputmode="numeric" data-f="disc" data-u="paytotal" value="' + esc(f.disc || '') + '"></label>' : '<div class="muted small">Discounts are turned off by the owner.</div>') +
        CD.region('paytotal') +
        CD.choices('mode', ['UPI', 'Cash', 'Card'], f.mode) +
        '<label class="flex" style="gap:10px"><input type="checkbox" data-f="wa" ' + (f.wa !== false ? 'checked' : '') + ' style="width:20px;height:20px">Send receipt on WhatsApp</label>' +
        '<button class="btn big" data-a="markPaid">Mark paid</button><button class="txt" style="align-self:center" data-a="nav" data-v="bills">Refund or cancel a bill</button></div>';
    }
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Take payment</h1><div class="flex wrap" style="align-items:flex-start;gap:24px">' + left + right + '</div></main>';
  };
  function selectPay(pid) {
    const v = CD.todays().find(x => x.pid === pid && !x.bill);
    UI.f.pid = pid; UI.f.items = v ? CD.feeItems(pid, v.kind, v.tr) : []; UI.f.disc = '';
  }
  R.paytotal = function () {
    const items = UI.f.items || []; const sub = items.reduce((s, x) => s + x.amt, 0); const disc = Math.min(sub, Number(UI.f.disc) || 0);
    return '<div style="font-size:54px;font-weight:700;line-height:1">' + rs(sub - disc) + '</div>' + (disc ? '<div class="muted small">' + rs(sub) + ' − ' + rs(disc) + ' discount</div>' : '');
  };
  A.selPay = ds => { selectPay(ds.id); CD.render(); };
  A.rmItem = ds => { UI.f.items.splice(Number(ds.i), 1); CD.render(); };
  A.addItem = (ds, el) => { const t = C().treatments.find(x => x.id === el.value); if (!t) return; (UI.f.items = UI.f.items || []).push({ n: t.n, amt: t.p, cat: t.cat, gst: t.gst }); CD.render(); };
  A.otherBill = () => {
    CD.modal('<h2 class="t">Bill someone</h2><input class="field" data-f="obq" data-u="obres" placeholder="Name or phone" autocomplete="off">' + CD.region('obres') + '<div class="right"><button class="txt" data-a="close">Cancel</button></div>');
  };
  R.obres = function () { const q = (UI.f.obq || '').toLowerCase(); if (q.length < 2) return ''; const dig = q.replace(/\D/g, ''); return C().patients.filter(p => p.name.toLowerCase().includes(q) || (dig.length > 2 && p.phone.includes(dig))).slice(0, 6).map(p => '<button class="card" style="width:100%;text-align:left;padding:12px 16px;margin-top:8px" data-a="obPick" data-id="' + p.id + '"><strong>' + esc(p.name) + '</strong> <span class="muted small">' + CD.phoneFmt(p.phone) + '</span></button>').join(''); };
  A.obPick = ds => { UI.f.pid = ds.id; UI.f.items = []; CD.closeModal(); CD.render(); };
  A.markPaid = function () {
    const f = UI.f; const items = f.items || [];
    if (!items.length) { CD.toast('Add at least one item'); return; }
    const sub = items.reduce((s, x) => s + x.amt, 0); const disc = Math.min(sub, Number(f.disc) || 0);
    const b = CD.makeBill(f.pid, items.map(x => Object.assign({}, x)), f.mode, disc ? { discount: disc, total: sub - disc } : null);
    if (disc) b.total = sub - disc;
    const v = CD.todays().find(x => x.pid === f.pid && !x.bill); if (v) v.bill = b.no;
    if (f.wa !== false) CD.send(f.pid, 'receipt', { bill: b.no, amount: b.total, mode: b.mode, link: CD.link(f.pid, 'bills') }, 'Receipt');
    CD.tick(1);
    UI.f = { init: 1, mode: 'UPI', wa: true };
    const nextUnpaid = unpaidToday()[0]; if (nextUnpaid) selectPay(nextUnpaid.pid);
    CD.render();
    CD.modal('<h2 class="t">' + rs(b.total) + ' received</h2>' + CD.receiptHtml(b) + '<div class="flex wrap"><button class="btn" data-a="printBill" data-no="' + b.no + '">Print receipt</button><button class="ghost" data-a="close">Done</button></div>' + (f.wa !== false ? '<div class="muted small">✓ Receipt sent on WhatsApp</div>' : ''));
  };
  A.printBill = ds => CD.printReceipt(C().bills.find(b => b.no === ds.no));

  /* ================= CALLS ================= */
  SC.calls = function () {
    const c = C(); const open = c.calls.filter(x => !x.done); const done = c.calls.filter(x => x.done);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Calls to return · ' + open.length + '</h1><p class="muted" style="margin:0">The WhatsApp bot handled everything else.</p>' +
      (open.length ? open.map(x => '<div class="card list-card"><div class="grow"><div class="nm2">' + esc(x.name) + ' · ' + CD.mask(x.phone) + '</div><div style="color:#3A4458">' + esc(x.why) + '</div><div class="muted small">At ' + CD.t(x.when) + ' · ' + esc(x.how) + '</div></div><button class="btn green" data-a="callNow" data-id="' + x.id + '">Call</button><button class="ghost" data-a="callDone" data-id="' + x.id + '">Done</button></div>').join('') : CD.empty('All calls done. Nice.')) +
      (done.length ? '<div class="muted" style="margin-top:6px">Done today</div><div class="card" style="padding:4px 24px">' + done.map(x => '<div class="row"><span class="grow">' + esc(x.name) + '</span><span class="muted small">' + esc(x.result || 'Done') + '</span></div>').join('') + '</div>' : '') + '</main>';
  };
  A.callNow = ds => { const x = C().calls.find(y => y.id === ds.id); CD.modal('<div class="muted">Calling…</div><h2 class="t">' + esc(x.name) + '</h2><div style="font-size:22px;letter-spacing:1px">' + CD.phoneFmt(x.phone) + '</div><div class="muted small">On the real desk this dials from the clinic phone.</div><div class="muted">What happened?</div><div class="flex wrap"><button class="btn" data-a="callRes" data-id="' + x.id + '" data-r="booked">Booked an appointment</button><button class="ghost" data-a="callRes" data-id="' + x.id + '" data-r="answered">Answered, no booking</button><button class="ghost" data-a="callRes" data-id="' + x.id + '" data-r="noans">No answer</button></div>'); };
  A.callRes = ds => {
    const x = C().calls.find(y => y.id === ds.id); CD.tick(3);
    if (ds.r === 'noans') { x.when = S().clock; x.how = 'tried again · no answer'; CD.closeModal(); CD.toast('Will stay in the list. Bot sent "We tried calling you" on WhatsApp', true); CD.render(); return; }
    x.done = true; x.result = ds.r === 'booked' ? 'Booked' : 'Answered';
    CD.closeModal();
    if (ds.r === 'booked') { CD.go('reception', 'appt'); openBook(x.pid, x.name, x.phone); return; }
    CD.render();
  };
  A.callDone = ds => { const x = C().calls.find(y => y.id === ds.id); x.done = true; x.result = 'Done'; CD.render(); };

  /* ================= APPOINTMENTS ================= */
  const slotsFor = (docId, date) => { const d = CD.doc(docId); const out = []; for (let t = d.from; t < d.to; t += 30) out.push(t); return out; };
  const takenSlots = (docId, date) => C().appts.filter(a => a.doc === docId && a.date === date).map(a => a.time).concat(date === S().today ? CD.todays().filter(v => v.doc === docId && v.booked).map(v => v.booked) : []);
  SC.appt = function () {
    const c = C(), s = S(), f = UI.f;
    const tmr = CD.addDays(s.today, 1);
    const day = f.day || s.today;
    const items = c.appts.filter(a => a.date === day).map(a => ({ t: a.time, pid: a.pid, doc: a.doc, src: a.src, id: a.id }))
      .concat(day === s.today ? CD.todays().filter(v => v.booked).map(v => ({ t: v.booked, pid: v.pid, doc: v.doc, src: 'Booked · token ' + v.tok, tok: v.tok, st: v.status })) : [])
      .sort((a, b) => a.t - b.t);
    const leave = c.leaves.filter(l => l.date === day);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<div class="flex wrap" style="align-items:flex-end"><h1 class="t grow">Appointments</h1><button class="btn" data-a="bookNew">+ Book appointment</button></div>' +
      '<div class="flex wrap">' + CD.choices('day', [[s.today, 'Today'], [tmr, 'Tomorrow']], day) + '<label class="flex"><span class="muted small">or date</span><input type="date" class="field" style="height:54px;width:190px;font-size:16px" value="' + day + '" data-ac="pickDay"></label></div>' +
      leave.map(l => '<div class="banner"><strong>' + esc(CD.doc(l.doc).short) + ' is on leave on ' + CD.day(day) + '.</strong> Booked patients were told on WhatsApp.</div>').join('') +
      (items.length ? items.map(a => { const p = CD.P(a.pid); const past = day === s.today && a.t < s.clock - 15 && !a.tok; return '<div class="card list-card" style="' + (past ? 'background:#FBF8F2' : '') + '"><span style="width:96px;font-size:19px;font-weight:600">' + CD.tShort(a.t) + '</span><div class="grow"><div class="nm2" style="font-size:19px">' + esc(p ? p.name : '—') + '</div><div class="muted" style="font-size:16px">' + esc(CD.doc(a.doc).short) + ' · ' + esc(a.src) + '</div></div>' + (a.tok ? '<span class="badge ' + (a.st === 'booked' ? 'b-a' : 'b-ok') + '">' + (a.st === 'booked' ? 'Not arrived' : 'Arrived') + '</span>' : (day === s.today ? '<button class="ghost sm" data-a="apArrived" data-id="' + a.id + '">Arrived · give token</button>' : '') + '<button class="ghost sm" data-a="apMove" data-id="' + a.id + '">Move</button><button class="txt" style="color:#8E2A22" data-a="apCancel" data-id="' + a.id + '">Cancel</button>') + '</div>'; }).join('') : CD.empty('No appointments on ' + CD.day(day) + '.')) + '</main>';
  };
  A.pickDay = (ds, el) => { if (el.value) { UI.f.day = el.value; CD.render(); } };
  A.apArrived = ds => { const c = C(); const a = c.appts.find(x => x.id === ds.id); const tok = CD.nextTok(); c.visits.push({ date: S().today, time: S().clock, pid: a.pid, doc: a.doc, kind: CD.lastVisit(a.pid) ? 'follow' : 'new', status: 'waiting', tok, fromAppt: a.time }); c.appts = c.appts.filter(x => x !== a); CD.send(a.pid, 'token', { token: tok, doctor: CD.doc(a.doc).name }, 'Token sent'); CD.toast('Token ' + tok + ' given to ' + CD.P(a.pid).name + ' · WhatsApp sent', true); CD.render(); };
  A.apCancel = ds => { const c = C(); const a = c.appts.find(x => x.id === ds.id); CD.modal('<h2 class="t">Cancel ' + esc(CD.P(a.pid).name) + '\'s appointment?</h2><p style="margin:0">' + CD.day(a.date) + ' at ' + CD.tShort(a.time) + ' with ' + esc(CD.doc(a.doc).short) + '. We\'ll tell her on WhatsApp.</p><div class="flex"><button class="btn red" data-a="apCancelYes" data-id="' + a.id + '">Yes, cancel</button><button class="ghost" data-a="close">Keep it</button></div>'); };
  A.apCancelYes = ds => { const c = C(); const a = c.appts.find(x => x.id === ds.id); c.appts = c.appts.filter(x => x !== a); c.inbox.push({ date: S().today, time: S().clock, pid: a.pid, kind: 'Cancelled', text: 'Your appointment on ' + CD.day(a.date) + ' at ' + CD.tShort(a.time) + ' is cancelled. Reply 1 to book again.', out: true }); CD.closeModal(); CD.toast('Cancelled · patient told on WhatsApp', true); CD.render(); };
  A.apMove = ds => { const a = C().appts.find(x => x.id === ds.id); openBook(a.pid, null, null, a); };
  A.bookNew = () => openBook();
  function openBook(pid, name, phone, moving) {
    const s = S(); const c = C();
    UI.f.bk = { pid: pid || '', name: name || '', phone: phone || '', doc: moving ? moving.doc : (c.doctors[0] || {}).id, date: moving ? moving.date : CD.addDays(s.today, 1), time: null, moving: moving ? moving.id : null };
    if (pid) { const p = CD.P(pid); UI.f.bk.name = p.name; UI.f.bk.phone = p.phone; }
    CD.modal(bookHtml, true);
  }
  CD.openBook = openBook;
  function bookHtml() {
    const s = S(), c = C(), bk = UI.f.bk;
    const dates = []; let d = s.today; while (dates.length < 6) { if (CD.dow(d) !== 0) dates.push(d); d = CD.addDays(d, 1); }
    const onLeave = c.leaves.some(l => l.doc === bk.doc && l.date === bk.date);
    const taken = takenSlots(bk.doc, bk.date);
    const slots = slotsFor(bk.doc, bk.date).filter(t => !(bk.date === s.today && t <= s.clock));
    return '<h2 class="t">' + (bk.moving ? 'Move appointment' : 'Book appointment') + '</h2>' +
      (bk.pid ? '<div class="card pad soft"><strong>' + esc(bk.name) + '</strong> · ' + CD.phoneFmt(bk.phone) + (bk.moving ? '' : ' <button class="txt" data-a="bkClear">change</button>') + '</div>' :
        '<div class="grid2"><div><span class="flbl">Phone</span><input class="field" inputmode="numeric" maxlength="10" value="' + esc(bk.phone) + '" data-ai="bkPhone"></div><div><span class="flbl">Name</span><input class="field" value="' + esc(bk.name) + '" data-ai="bkName"></div></div><div id="bk-found"></div>') +
      '<div><span class="flbl">Doctor</span><div class="choices">' + c.doctors.map(x => '<button class="choice sm' + (bk.doc === x.id ? ' on' : '') + '" data-a="bkSet" data-k="doc" data-v="' + x.id + '">' + esc(x.short) + '</button>').join('') + '</div></div>' +
      '<div><span class="flbl">Day</span><div class="choices">' + dates.map(x => '<button class="choice sm' + (bk.date === x ? ' on' : '') + '" data-a="bkSet" data-k="date" data-v="' + x + '">' + (x === s.today ? 'Today' : CD.day(x)) + '</button>').join('') + '</div></div>' +
      (onLeave ? '<div class="banner">' + esc(CD.doc(bk.doc).short) + ' is on leave that day.</div>' :
        '<div><span class="flbl">Free times</span><div class="choices">' + (slots.length ? slots.map(t => { const tk = taken.includes(t); return '<button class="choice sm' + (bk.time === t ? ' on' : '') + '"' + (tk ? ' disabled style="opacity:.35;text-decoration:line-through"' : '') + ' data-a="bkSet" data-k="time" data-v="' + t + '">' + CD.tShort(t) + '</button>'; }).join('') : '<span class="muted">No times left that day.</span>') + '</div></div>') +
      '<div id="bk-err" class="bad small"></div><div class="flex"><button class="btn" data-a="bkSave">' + (bk.moving ? 'Move it' : 'Book') + ' and send WhatsApp</button><button class="txt" data-a="close">Cancel</button></div>';
  }
  A.bkSet = ds => { const bk = UI.f.bk; bk[ds.k] = ds.k === 'time' ? Number(ds.v) : ds.v; if (ds.k !== 'time') bk.time = null; CD.renderModal(); };
  A.bkClear = () => { UI.f.bk.pid = ''; UI.f.bk.name = ''; UI.f.bk.phone = ''; CD.renderModal(); };
  A.bkName = (ds, el) => { UI.f.bk.name = el.value; };
  A.bkPhone = (ds, el) => { const bk = UI.f.bk; bk.phone = el.value.replace(/\D/g, ''); const p = bk.phone.length === 10 ? C().patients.find(x => x.phone === bk.phone) : null; const box = document.getElementById('bk-found'); if (box) box.innerHTML = p ? '<button class="card" style="width:100%;text-align:left;padding:12px 16px" data-a="bkUse" data-id="' + p.id + '">✓ ' + esc(p.name) + ' came before — <strong style="color:var(--a)">use</strong></button>' : ''; };
  A.bkUse = ds => { const p = CD.P(ds.id); Object.assign(UI.f.bk, { pid: p.id, name: p.name, phone: p.phone }); CD.renderModal(); };
  A.bkSave = function () {
    const bk = UI.f.bk, c = C();
    const err = document.getElementById('bk-err');
    if (!bk.time) { err.textContent = 'Pick a time.'; return; }
    if (!bk.pid) {
      if ((bk.phone || '').length !== 10 || !(bk.name || '').trim()) { err.textContent = 'Fill phone (10 digits) and name.'; return; }
      const p = { id: CD.uid('p'), name: bk.name.trim(), sex: 'F', age: 0, phone: bk.phone, since: S().today, source: 'Phone call', problem: '', words: '', allergies: 'None told', outcome: '', doc: bk.doc };
      c.patients.push(p); bk.pid = p.id;
    }
    if (bk.moving) c.appts = c.appts.filter(a => a.id !== bk.moving);
    c.appts.push({ id: CD.uid('a'), date: bk.date, time: bk.time, pid: bk.pid, doc: bk.doc, src: 'Reception' });
    CD.send(bk.pid, 'booked', { doctor: CD.doc(bk.doc).name, day: bk.date === S().today ? 'today' : CD.day(bk.date), time: CD.tShort(bk.time) }, 'Booked');
    UI.f.day = bk.date;
    CD.closeModal();
    CD.toast((bk.moving ? 'Moved to ' : 'Booked for ') + (bk.date === S().today ? 'today' : CD.day(bk.date)) + ' ' + CD.tShort(bk.time) + ' · WhatsApp sent', true);
    CD.render();
  };

  /* ================= CLOSE THE DAY ================= */
  const NOTES = [500, 200, 100, 50, 20, 10];
  const cashExpected = () => { const t = S().today; const bills = C().bills.filter(b => b.date === t); const cashIn = bills.filter(b => b.mode === 'Cash').reduce((s, b) => s + CD.netOf(b), 0); const petty = (C().expenses || []).filter(x => x.date === t && x.from === 'drawer').reduce((s, x) => s + x.amt, 0); const float = C().float || 0; const cash = float + cashIn - petty; const upi = bills.filter(b => b.mode === 'UPI').reduce((s, b) => s + CD.netOf(b), 0); const card = bills.filter(b => b.mode === 'Card').reduce((s, b) => s + CD.netOf(b), 0); return { cash, upi, card, cashIn, petty, float }; };
  SC.close = function () {
    const s = S(), c = C();
    const ex = cashExpected();
    const closed = s.dayClosed[c.id];
    if (closed) {
      const cd = c.cashDays.find(x => x.date === s.today);
      return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">Day closed ✓</h1><div class="card pad"><div class="flex" style="justify-content:space-between"><span>Cash counted</span><strong>' + rs(cd.counted) + '</strong></div><div class="flex" style="justify-content:space-between"><span>Should have been</span><strong>' + rs(cd.expected) + '</strong></div><div class="flex" style="justify-content:space-between;margin-top:8px"><span>Result</span>' + (cd.diff === 0 ? '<span class="stamp ok">Matches</span>' : '<span class="stamp bad">' + (cd.diff < 0 ? 'Short ' : 'Extra ') + rs(Math.abs(cd.diff)) + '</span>') + '</div>' + (cd.note ? '<div class="muted small" style="margin-top:8px">Note: ' + esc(cd.note) + '</div>' : '') + '</div><div class="card pad soft">Hand <strong>' + rs(cd.handed || 0) + '</strong> to the owner and keep ' + rs(c.float || 0) + ' change for tomorrow. Summary sent to the owner on WhatsApp at ' + CD.t(closed) + '.</div><div class="flex wrap"><button class="btn" data-a="printDay">Print day report</button><button class="txt" data-a="reopenDay">Open the day again (forgot something)</button></div></main>';
    }
    return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">Close the day</h1>' +
      '<div class="card soft pad"><div class="muted">Cash that should be in the drawer</div><div style="font-size:44px;font-weight:700">' + rs(ex.cash) + '</div><div class="muted small">Opening change ' + rs(ex.float) + ' + cash taken ' + rs(ex.cashIn) + ' − spent from drawer ' + rs(ex.petty) + '. UPI ' + rs(ex.upi) + ' and card ' + rs(ex.card) + ' are already in the bank.</div></div>' +
      '<div class="card" style="padding:4px 24px"><div class="row"><strong class="grow">Money taken out of the drawer today</strong><button class="ghost sm" data-a="addPetty">+ Add</button></div>' + ((C().expenses || []).filter(x => x.date === S().today && x.from === 'drawer').map(x => '<div class="row"><span class="muted small" style="width:80px">' + CD.tShort(x.time) + '</span><span class="grow">' + esc(x.what) + '</span><strong>' + rs(x.amt) + '</strong></div>').join('') || '<div class="row muted">Nothing yet.</div>') + '</div>' +
      '<div style="color:#3A4458">Count the notes</div>' +
      NOTES.map(n => '<div class="flex"><span style="width:110px;font-size:19px;font-weight:600">₹' + n + '</span><span class="muted">×</span><input class="field" inputmode="numeric" style="width:110px;text-align:center" data-f="n' + n + '" data-u="closeSum" value="' + esc(UI.f['n' + n] || '') + '" placeholder="0" aria-label="Number of ₹' + n + ' notes"><span class="grow right" style="font-size:19px" id="nt' + n + '">' + rs((Number(UI.f['n' + n]) || 0) * n) + '</span></div>').join('') +
      '<div class="flex"><span style="width:110px;font-size:19px;font-weight:600">Coins</span><span class="muted">₹</span><input class="field" inputmode="numeric" style="width:110px;text-align:center" data-f="coins" data-u="closeSum" value="' + esc(UI.f.coins || '') + '" placeholder="0" aria-label="Coins total"></div>' +
      CD.region('closeSum') + '<button class="txt" style="align-self:flex-start" data-a="printDay">Print today\'s report so far</button></main>';
  };
  R.closeSum = function () {
    const ex = cashExpected().cash;
    let tot = Number(UI.f.coins) || 0;
    NOTES.forEach(n => { const v = (Number(UI.f['n' + n]) || 0) * n; tot += v; const el = document.getElementById('nt' + n); if (el) el.textContent = rs(v); });
    const diff = tot - ex;
    const any = NOTES.some(n => UI.f['n' + n]) || UI.f.coins;
    const res = !any ? '<span class="muted">Start counting</span>' : diff === 0 ? '<span class="stamp ok">Matches</span>' : '<span class="stamp ' + (diff < 0 ? 'bad' : 'warn') + '">' + (diff < 0 ? 'Short ' : 'Extra ') + rs(Math.abs(diff)) + '</span>';
    return '<div class="flex" style="justify-content:space-between;border-top:1.5px solid #16213A;padding-top:14px"><span style="font-size:20px;font-weight:600">Counted ' + rs(tot) + '</span>' + res + '</div>' +
      (any && diff !== 0 ? '<div><span class="flbl">Why is it ' + (diff < 0 ? 'short' : 'extra') + '? (the owner will see this)</span><input class="field" data-f="cnote" value="' + esc(UI.f.cnote || '') + '" placeholder="e.g. ₹200 change diya, bill nahi bana"></div>' : '') +
      '<button class="btn big full" data-a="closeDay"' + (any ? '' : ' disabled') + '>Close the day and send report to the owner</button>';
  };
  A.closeDay = function () {
    const s = S(), c = C();
    const ex = cashExpected().cash; let tot = Number(UI.f.coins) || 0; NOTES.forEach(n => { tot += (Number(UI.f['n' + n]) || 0) * n; });
    const diff = tot - ex;
    if (diff !== 0 && !(UI.f.cnote || '').trim()) { CD.toast('Write why it is ' + (diff < 0 ? 'short' : 'extra') + ' — the owner will ask'); return; }
    c.cashDays = c.cashDays.filter(x => x.date !== s.today);
    c.cashDays.unshift({ date: s.today, expected: ex, counted: tot, diff, note: (UI.f.cnote || '').trim(), by: CD.meName(), checked: diff === 0, handed: Math.max(0, tot - (c.float || 0)) });
    const todayNet = c.bills.filter(b => b.date === s.today).reduce((x, b) => x + CD.netOf(b), 0);
    c.inbox.push({ date: s.today, time: s.clock, pid: null, kind: 'Day summary to owner', out: true, text: c.short + ' · day closed by ' + CD.meName() + ' at ' + CD.t(s.clock) + '\nNet collected: ' + rs(todayNet) + '\nCash: ' + (diff === 0 ? 'matched' : (diff < 0 ? 'SHORT ' : 'extra ') + rs(Math.abs(diff))) + ' · hand over ' + rs(Math.max(0, tot - (c.float || 0))) + '\nPatients seen: ' + CD.todays().filter(v => v.status === 'done').length + '\nFull report: desk.bas30din.com/' + c.slug + '/day' });
    s.dayClosed[c.id] = s.clock;
    CD.toast('Day closed · report sent to the owner', true);
    CD.go('reception', 'close');
  };
  A.addPetty = () => { UI.f.pt = { amt: '', what: 'Tea and snacks' }; CD.modal('<h2 class="t">Money taken out of the drawer</h2><div><span class="flbl">Amount ₹</span><input class="field" inputmode="numeric" data-ai="ptSet" data-k="amt"></div><div><span class="flbl">For what</span><div class="choices">' + ['Tea and snacks', 'Courier', 'Stationery', 'Cleaning supplies', 'Auto fare', 'Other'].map(w => '<button class="choice sm' + (w === 'Tea and snacks' ? ' on' : '') + '" data-a="ptWhat" data-v="' + w + '">' + w + '</button>').join('') + '</div></div><div class="flex"><button class="btn" data-a="ptSave">Add</button><button class="txt" data-a="close">Cancel</button></div>'); };
  A.ptSet = (ds, el) => { UI.f.pt[ds.k] = el.value; };
  A.ptWhat = (ds, el) => { UI.f.pt.what = ds.v; document.querySelectorAll('.modal .choice').forEach(x => x.classList.toggle('on', x === el)); };
  A.ptSave = () => { const a = Number(UI.f.pt.amt); if (!(a > 0)) { CD.toast('Enter the amount'); return; } const c = C(); (c.expenses = c.expenses || []).push({ id: CD.uid('e'), date: S().today, time: S().clock, amt: a, what: UI.f.pt.what, from: 'drawer', by: 'Priya' }); c.log.push({ date: S().today, time: S().clock, who: CD.meName(), what: 'Took ' + rs(a) + ' from the drawer', why: UI.f.pt.what }); CD.closeModal(); CD.render(); };
  A.printDay = () => CD.print('Day report', CD.docs.daily());
  A.reopenDay = () => { delete S().dayClosed[C().id]; CD.render(); };

  /* ================= MORE: patients, profile, bills, inbox, status, print ================= */
  SC.patients = function () {
    const c = C();
    const dups = []; const seen = {};
    c.patients.filter(p => !p.merged).forEach(p => { if (seen[p.phone]) dups.push([seen[p.phone], p]); else seen[p.phone] = p; });
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Patients · ' + c.patients.filter(p => !p.merged).length + '</h1>' +
      '<input class="field" data-f="pq" data-u="plist" placeholder="Search by name, phone or problem" value="' + esc(UI.f.pq || '') + '" data-autofocus>' +
      dups.map(([a, b]) => '<div class="banner"><span class="grow"><strong>Possible duplicate:</strong> "' + esc(a.name) + '" and "' + esc(b.name) + '" have the same phone (' + CD.mask(a.phone) + ').</span><button class="btn sm" data-a="merge" data-a1="' + a.id + '" data-b1="' + b.id + '">Merge into ' + esc(a.name) + '</button></div>').join('') +
      CD.region('plist') + '</main>';
  };
  R.plist = function () {
    const q = (UI.f.pq || '').toLowerCase(); const dig = q.replace(/\D/g, '');
    let ps = C().patients.filter(p => !p.merged);
    if (q) ps = ps.filter(p => p.name.toLowerCase().includes(q) || (p.problem || '').includes(q) || (dig.length > 2 && p.phone.includes(dig)));
    const lv = {}; C().visits.forEach(v => { if (!lv[v.pid] || lv[v.pid] < v.date) lv[v.pid] = v.date; });
    ps = ps.slice().sort((a, b) => (lv[b.id] || '') > (lv[a.id] || '') ? 1 : -1).slice(0, 40);
    return '<div class="card" style="padding:4px 24px">' + (ps.length ? ps.map(p => '<button class="row" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left" data-a="openP" data-id="' + p.id + '"><span class="grow"><strong style="font-size:18px">' + esc(p.name) + '</strong><br><span class="muted small">' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + CD.phoneFmt(p.phone) + '</span></span><span class="muted small">' + (lv[p.id] ? 'Last visit ' + CD.d(lv[p.id]) : 'No visit yet') + '</span></button>').join('') : '<div class="empty">No one found.</div>') + '</div>' + (ps.length === 40 ? '<div class="muted small">Showing 40. Search to find others.</div>' : '');
  };
  A.merge = ds => { const c = C(); const a = CD.P(ds.a1), b = CD.P(ds.b1); c.visits.forEach(v => { if (v.pid === b.id) v.pid = a.id; }); c.bills.forEach(x => { if (x.pid === b.id) x.pid = a.id; }); c.rx.forEach(x => { if (x.pid === b.id) x.pid = a.id; }); c.appts.forEach(x => { if (x.pid === b.id) x.pid = a.id; }); b.merged = a.id; c.log.push({ date: S().today, time: S().clock, who: CD.meName(), what: 'Merged "' + b.name + '" into "' + a.name + '"', why: 'Same phone number' }); CD.toast('Merged. All visits and bills are now under ' + a.name); CD.render(); };

  SC.patient = function () {
    const c = C(); const p = CD.P(UI.prm.id); if (!p) return hdr() + '<main class="pg">' + CD.backBtn() + CD.empty('Patient not found') + '</main>';
    const visits = c.visits.filter(v => v.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    const bills = c.bills.filter(b => b.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    const ap = c.appts.filter(a => a.pid === p.id && a.date >= S().today);
    const todayV = visits.find(v => v.date === S().today && v.status !== 'done' && v.status !== 'left');
    return hdr() + '<main class="pg mid">' + CD.backBtn('patients') +
      '<div class="flex wrap" style="align-items:flex-end"><div class="grow"><h1 class="t">' + esc(p.name) + '</h1><div class="muted">' + esc(CD.as(p)) + (p.rel ? ' · ' + esc(p.rel) : '') + ' · ' + CD.phoneFmt(p.phone) + ' · patient since ' + CD.d(p.since) + ' · came from ' + esc(p.source) + '</div></div>' +
      (todayV ? '<span class="badge b-a">Today: ' + esc(todayV.tok) + ' · ' + esc(todayV.status) + '</span>' : '<button class="btn" data-a="nav" data-v="newp" data-p=\'' + JSON.stringify({ pid: p.id }) + '\'>Give token today</button>') +
      '<button class="ghost" data-a="bookFor" data-id="' + p.id + '">Book appointment</button><button class="ghost" data-a="editP" data-id="' + p.id + '">Edit details</button></div>' +
      (ap.length ? '<div class="card pad soft">Coming: ' + ap.map(a => CD.day(a.date) + ' ' + CD.tShort(a.time) + ' with ' + esc(CD.doc(a.doc).short)).join(' · ') + '</div>' : '') +
      '<div class="grid2" style="align-items:start"><section class="card" style="padding:8px 24px"><h2 class="t" style="font-size:22px;padding:12px 0 4px">Visits · ' + visits.length + '</h2>' + (visits.slice(0, 12).map(v => '<div class="row"><span style="width:90px">' + CD.d(v.date) + '</span><span class="grow">' + esc(KIND[v.kind] || 'Visit') + ' · ' + esc(CD.doc(v.doc).short) + '</span><span class="muted small">' + esc(v.status === 'done' ? 'Seen' : v.status) + '</span></div>').join('') || '<div class="empty">No visits yet</div>') + '</section>' +
      '<section class="card" style="padding:8px 24px"><h2 class="t" style="font-size:22px;padding:12px 0 4px">Bills · ' + rs(bills.reduce((s, b) => s + CD.netOf(b), 0)) + '</h2>' + (bills.slice(0, 12).map(b => '<button class="row" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left" data-a="showBill" data-no="' + b.no + '"><span style="width:90px">' + CD.d(b.date) + '</span><span class="grow">' + esc(b.items.map(i => i.n).join(', ')) + '</span><span style="font-weight:600' + (b.refund ? ';color:#8E2A22;text-decoration:line-through' : '') + '">' + rs(b.total) + '</span></button>').join('') || '<div class="empty">No bills</div>') + '</section></div>' +
      '<p class="muted small" style="margin:0">Prescriptions and diagnosis are visible to doctors only.</p></main>';
  };
  A.bookFor = ds => openBook(ds.id);
  A.editP = ds => { const p = CD.P(ds.id); UI.f.ep = { name: p.name, age: String(p.age || ''), phone: p.phone, rel: p.rel || '' }; CD.modal('<h2 class="t">Edit details</h2><div><span class="flbl">Name</span><input class="field" value="' + esc(p.name) + '" data-ai="epSet" data-k="name"></div><div class="grid2"><div><span class="flbl">Age</span><input class="field" value="' + esc(p.age || '') + '" data-ai="epSet" data-k="age"></div><div><span class="flbl">Phone</span><input class="field" maxlength="10" value="' + esc(p.phone) + '" data-ai="epSet" data-k="phone"></div></div><div><span class="flbl">Relation (S/O, W/O, D/O)</span><input class="field" value="' + esc(p.rel || '') + '" data-ai="epSet" data-k="rel"></div><div class="flex"><button class="btn" data-a="epSave" data-id="' + p.id + '">Save</button><button class="txt" data-a="close">Cancel</button></div>'); };
  A.epSet = (ds, el) => { UI.f.ep[ds.k] = el.value; };
  A.epSave = ds => { const p = CD.P(ds.id); const e = UI.f.ep; p.name = e.name.trim() || p.name; p.age = Number(e.age) || p.age; if (/^\d{10}$/.test(e.phone)) p.phone = e.phone; p.rel = e.rel.trim(); CD.closeModal(); CD.toast('Saved'); CD.render(); };

  SC.bills = function () {
    const s = S(), c = C(); const per = UI.f.per || 'today';
    const from = per === 'today' ? s.today : per === 'yday' ? CD.addDays(s.today, -1) : CD.addDays(s.today, -6);
    const to = per === 'yday' ? CD.addDays(s.today, -1) : s.today;
    const bills = c.bills.filter(b => b.date >= from && b.date <= to).sort((a, b) => (a.date + String(a.time).padStart(4, '0')) < (b.date + String(b.time).padStart(4, '0')) ? 1 : -1);
    const tot = bills.reduce((x, b) => x + CD.netOf(b), 0);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Bills and refunds</h1>' + CD.choices('per', [['today', 'Today'], ['yday', 'Yesterday'], ['week', 'Last 7 days']], per, 'sm') +
      '<div class="muted">' + bills.length + ' bills · ' + rs(tot) + ' after refunds. Tap a bill to print, resend or refund.</div>' +
      '<div class="card" style="padding:4px 24px">' + (bills.length ? bills.slice(0, 80).map(b => { const p = CD.P(b.pid); return '<button class="row" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left" data-a="showBill" data-no="' + b.no + '"><span style="width:' + (per === 'today' ? 80 : 140) + 'px" class="muted">' + (per === 'today' ? '' : CD.d(b.date) + ' ') + CD.tShort(b.time) + '</span><span style="width:90px" class="muted small">' + esc(b.no) + '</span><span class="grow"><strong>' + esc(p ? p.name : '') + '</strong> <span class="muted small">' + esc(b.items.map(i => i.n).join(', ')) + '</span></span><span class="muted small" style="width:56px">' + b.mode + '</span><span style="width:100px;text-align:right;font-weight:600;' + (b.refund ? 'color:#8E2A22;text-decoration:line-through' : '') + '">' + rs(b.total) + '</span></button>'; }).join('') : '<div class="empty">No bills.</div>') + '</div></main>';
  };
  A.showBill = ds => {
    const c = C(); const b = c.bills.find(x => x.no === ds.no);
    CD.modal(CD.receiptHtml(b) + '<div class="flex wrap"><button class="btn" data-a="printBill" data-no="' + b.no + '">Print</button><button class="ghost" data-a="resendBill" data-no="' + b.no + '">Send again on WhatsApp</button>' +
      (!b.refund ? (c.perms.refund ? '<button class="ghost" style="color:#8E2A22;border-color:#E8B9B4" data-a="refundStart" data-no="' + b.no + '">Refund</button>' : '<span class="muted small">Refunds are turned off by the owner.</span>') : '') +
      (!b.refund ? (c.perms.editBill ? '<button class="ghost" data-a="changeMode" data-no="' + b.no + '">Change payment mode</button>' : '<span class="muted small">Bill changes are turned off by the owner.</span>') : '') + '</div><div class="right"><button class="txt" data-a="close">Close</button></div>', true);
  };
  A.resendBill = ds => { const b = C().bills.find(x => x.no === ds.no); CD.send(b.pid, 'receipt', { bill: b.no, amount: b.total, mode: b.mode, link: CD.link(b.pid, 'bills') }, 'Receipt'); CD.toast('Receipt sent again on WhatsApp', true); };
  A.refundStart = ds => { const b = C().bills.find(x => x.no === ds.no); UI.f.rf = { amt: String(b.total), why: '' }; CD.modal('<h2 class="t">Refund ' + esc(b.no) + '</h2><div><span class="flbl">Amount (max ' + rs(b.total) + ')</span><input class="field" inputmode="numeric" value="' + b.total + '" data-ai="rfSet" data-k="amt"></div><div><span class="flbl">Reason (the owner sees this)</span><div class="choices">' + ['Left before seeing doctor', 'Charged twice', 'Wrong amount', 'Procedure not done'].map(r => '<button class="choice sm" data-a="rfWhy" data-v="' + r + '">' + r + '</button>').join('') + '</div></div><input class="field" id="rf-why" placeholder="Or type a reason" data-ai="rfSet" data-k="why"><div class="flex"><button class="btn red" data-a="rfDo" data-no="' + b.no + '">Refund</button><button class="txt" data-a="close">Cancel</button></div>'); };
  A.rfSet = (ds, el) => { UI.f.rf[ds.k] = el.value; };
  A.rfWhy = (ds, el) => { UI.f.rf.why = ds.v; document.getElementById('rf-why').value = ds.v; document.querySelectorAll('.modal .choice').forEach(x => x.classList.toggle('on', x === el)); };
  A.rfDo = ds => { const b = C().bills.find(x => x.no === ds.no); const amt = Math.min(b.total, Number(UI.f.rf.amt) || 0); if (!amt) { CD.toast('Enter an amount'); return; } if (!UI.f.rf.why.trim()) { CD.toast('Pick or type a reason'); return; } doRefund(b, amt, UI.f.rf.why.trim()); CD.closeModal(); CD.render(); };
  function doRefund(b, amt, why) { const c = C(); b.refund = { amt, reason: why, by: CD.meName(), date: S().today, time: S().clock }; c.log.push({ date: S().today, time: S().clock, who: CD.meName(), what: 'Refunded ' + b.no + ' (' + rs(amt) + ')', why }); c.inbox.push({ date: S().today, time: S().clock, pid: b.pid, kind: 'Refund', text: rs(amt) + ' refunded for bill ' + b.no + '. It reaches you in 2–3 days if paid by UPI/card.', out: true }); CD.toast('Refunded ' + rs(amt) + ' · owner can see it', true); }
  A.changeMode = ds => { const b = C().bills.find(x => x.no === ds.no); CD.modal('<h2 class="t">Change payment mode of ' + esc(b.no) + '</h2><div class="choices">' + ['UPI', 'Cash', 'Card'].filter(m => m !== b.mode).map(m => '<button class="choice" data-a="cmDo" data-no="' + b.no + '" data-v="' + m + '">' + b.mode + ' → ' + m + '</button>').join('') + '</div><div class="right"><button class="txt" data-a="close">Cancel</button></div>'); };
  A.cmDo = ds => { const b = C().bills.find(x => x.no === ds.no); C().log.push({ date: S().today, time: S().clock, who: CD.meName(), what: 'Changed payment of ' + b.no + ' from ' + b.mode + ' to ' + ds.v, why: '' }); b.mode = ds.v; CD.closeModal(); CD.toast('Changed · owner can see who changed it'); CD.render(); };

  SC.inbox = function () {
    const c = C(); const s = S(); const flt = UI.f.ib || 'all';
    let msgs = c.inbox.filter(m => m.date === s.today).slice().sort((a, b) => b.time - a.time);
    if (flt === 'out') msgs = msgs.filter(m => m.out); if (flt === 'bot') msgs = msgs.filter(m => !m.out);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">WhatsApp inbox · today</h1>' + CD.choices('ib', [['all', 'Everything'], ['bot', 'What the bot did'], ['out', 'Sent from the desk']], flt, 'sm') +
      (msgs.length ? msgs.map(m => { const p = m.pid ? CD.P(m.pid) : null; return '<div class="card list-card" style="align-items:flex-start"><span class="muted" style="width:80px">' + CD.tShort(m.time) + '</span><div class="grow"><div><strong>' + esc(p ? p.name : 'Many patients') + '</strong> <span class="badge b-a" style="margin-left:6px">' + esc(m.kind) + '</span></div><div style="color:#3A4458;white-space:pre-line;margin-top:4px">' + esc(m.text) + '</div></div></div>'; }).join('') : CD.empty('Nothing yet today.')) + '</main>';
  };

  SC.status = function () {
    const c = C();
    return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">Doctor status</h1><p class="muted" style="margin:0">Patients see this on the queue page.</p>' +
      c.doctors.map(d => '<div class="card pad"><div class="nm2">' + esc(d.name) + '</div><div class="muted small" style="margin-bottom:12px">' + esc(d.days) + ' · ' + CD.tShort(d.from) + ' – ' + CD.tShort(d.to) + '</div><div class="choices">' + [['in', 'In cabin'], ['later', 'Not in yet'], ['gone', 'Gone for the day']].map(([k, l]) => '<button class="choice sm' + (d.status === k ? ' on' : '') + '" data-a="setDocStatus" data-id="' + d.id + '" data-v="' + k + '">' + l + '</button>').join('') + (d.status === 'out' ? '<span class="badge b-warn">Stepped out · back ' + CD.tShort(d.out.until) + '</span>' : '') + '</div></div>').join('') + '</main>';
  };
  A.setDocStatus = ds => { const d = CD.doc(ds.id); d.status = ds.v; d.out = null; CD.toast(d.short + ': ' + (ds.v === 'in' ? 'in cabin' : ds.v === 'gone' ? 'gone for the day' : 'not in yet')); CD.render(); };

  SC.more = function () {
    const items = [['patients', '☺', 'Patients', 'Search anyone, see visits, merge duplicates'], ['bills', '₹', 'Bills and refunds', 'All bills, refund with a reason, GST receipt'], ['inbox', '✉', 'WhatsApp inbox', 'Every message the bot and desk sent today'], ['status', '◷', 'Doctor status', 'In cabin, not in yet, gone for the day']];
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Print and export</h1><div class="grid2">' +
      '<button class="card pad" style="text-align:left" data-a="printReg"><div class="nm2">Print today\'s OPD register</div><div class="muted">Token, time, patient, visit, doctor, paid</div></button>' +
      '<button class="card pad" style="text-align:left" data-a="exportReg"><div class="nm2">Today\'s register in Excel</div><div class="muted">Downloads a file that opens in Excel</div></button></div>' +
      '<h2 class="t" style="margin-top:8px">Also here</h2><div class="grid2">' + items.map(([k, i, t, d]) => '<button class="card pad flex" style="text-align:left;align-items:flex-start" data-a="nav" data-v="' + k + '"><span class="badge b-a" style="height:40px;width:40px;justify-content:center;font-size:18px">' + i + '</span><span><span class="nm2" style="font-size:19px">' + t + '</span><br><span class="muted" style="font-size:16px">' + d + '</span></span></button>').join('') + '</div></main>';
  };
  const regRows = () => CD.todays().slice().sort((a, b) => CD.tokN(a) - CD.tokN(b)).map(v => { const p = CD.P(v.pid); const b = CD.billOf(v); return [v.tok, CD.t(v.time), p.name, CD.as(p), KIND[v.kind], CD.doc(v.doc).short, v.status, b ? b.total : 0, b ? b.mode : (feeDue(v) ? 'Not paid' : 'Free')]; });
  A.printReg = () => { if (CD.docs && CD.docs.register) return CD.print('OPD register', CD.docs.register()); const c = C(); CD.print('OPD register', '<h1>' + esc(c.name) + '</h1><div style="color:#666;margin-bottom:12px">OPD register · ' + CD.day(S().today) + '</div><table><tr><th>Token</th><th>Time</th><th>Patient</th><th>Age</th><th>Visit</th><th>Doctor</th><th>Status</th><th class="r">Paid</th><th>Mode</th></tr>' + regRows().map(r => '<tr>' + r.map((x, i) => '<td' + (i === 7 ? ' class="r"' : '') + '>' + esc(i === 7 ? (x ? '₹' + x : '—') : x) + '</td>').join('') + '</tr>').join('') + '</table>'); };
  A.exportReg = () => CD.csv('OPD-register-' + S().today + '.csv', [['Token', 'Time', 'Patient', 'Age', 'Visit', 'Doctor', 'Status', 'Paid ₹', 'Mode']].concat(regRows()));
})();
