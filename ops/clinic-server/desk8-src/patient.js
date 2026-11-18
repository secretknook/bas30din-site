/* Clinic Desk — Patient phone page (every screen working) */
(function () {
  'use strict';
  const CD = window.CD, A = CD.A, UI = CD.UI;
  const esc = CD.esc, rs = CD.rs;
  const S = () => CD.S, C = () => CD.C();
  const SC = {};
  CD.apps.patient = { screens: SC };

  function me() {
    const s = S(), c = C(); s.pAs = s.pAs || {};
    let id = s.pAs[c.id];
    if (!id || !CD.P(id)) { id = (c.named && c.named.riya) || ((CD.todays().find(v => v.status === 'waiting') || {}).pid) || (c.patients[0] || {}).id; s.pAs[c.id] = id; }
    return CD.P(id);
  }
  const authKey = p => C().id + ':' + p.id;
  const todayV = p => CD.todays().filter(v => v.pid === p.id).sort((a, b) => CD.tokN(b) - CD.tokN(a))[0];

  function frame(inner, title) {
    const c = C(), p = me();
    const side = '<aside class="card pad no-print" style="max-width:340px;display:flex;flex-direction:column;gap:12px"><div style="font-size:19px;font-weight:600">This is the patient\'s phone</div><div class="muted small">No app download. It opens from the link in every WhatsApp message. Whatever reception and the doctor do shows up here live.</div>' +
      (c.patients.length ? '<label><span class="flbl">Viewing as</span><select class="field" style="height:48px;font-size:16px" data-ac="viewAs">' + c.patients.filter(x => !x.merged).slice().sort((a, b) => { const va = todayV(a) ? 0 : 1, vb = todayV(b) ? 0 : 1; return va - vb || a.name.localeCompare(b.name); }).slice(0, 60).map(x => '<option value="' + x.id + '"' + (p && x.id === p.id ? ' selected' : '') + '>' + esc(x.name) + (todayV(x) ? ' · ' + todayV(x).tok : '') + '</option>').join('') + '</select></label>' : '') +
      '<button class="txt" data-a="logoutP">Show the first-time login again</button></aside>';
    return '<div class="phone-stage"><div class="phone app-patient"><div class="ph-h"><span class="logo" style="--brand:' + c.color + ';width:32px;height:32px;font-size:16px">' + esc(c.logo) + '</span><span class="serif" style="font-size:19px;font-weight:600">' + esc(c.short) + ' Clinic</span><span class="grow"></span><span class="muted small">' + esc(title || (p ? CD.first(p.name) : '')) + '</span></div>' + inner + '</div>' + side + '</div>';
  }
  A.viewAs = (ds, el) => { S().pAs[C().id] = el.value; CD.go('patient', 'home'); };
  A.logoutP = () => { const p = me(); if (p) delete S().patientAuth[authKey(p)]; CD.go('patient', 'home'); };

  /* ---------- first time: WhatsApp → code ---------- */
  function waChat(p) {
    const c = C();
    const msgs = c.inbox.filter(m => m.pid === p.id && m.out).slice(-4);
    const hasLink = msgs.some(m => /desk\.bas30din\.com/.test(m.text));
    const bubbles = msgs.map(m => '<div class="bub">' + esc(m.text).replace(/(desk\.bas30din\.com\/[\w\-/]+)/g, '<button class="lk" data-a="openLink">$1</button>') + '<span class="tm">' + CD.tShort(m.time) + '</span></div>').join('') + (hasLink ? '' : '<div class="bub">Hello ' + esc(CD.first(p.name)) + ', here is your page at ' + esc(c.name) + ':\n<button class="lk" data-a="openLink">' + CD.link(p.id) + '</button><span class="tm">' + CD.tShort(S().clock) + '</span></div>');
    return '<div class="wa-bg" style="flex:1;display:flex;flex-direction:column"><div class="flex" style="padding:12px 16px;background:' + c.color + ';color:#FFFFFF"><span class="logo" style="--brand:#FFFFFF;width:34px;height:34px;background:#FFFFFF;color:' + c.color + ';border:0">' + esc(c.logo) + '</span><div><div style="font-weight:600">' + esc(c.name) + '</div><div class="small" style="opacity:.8">WhatsApp · business account</div></div></div><div style="flex:1;padding:16px 14px;display:flex;flex-direction:column;gap:10px"><div class="bub me">Hi<span class="tm">' + CD.tShort(Math.max(540, S().clock - 30)) + '</span></div>' + bubbles + '<div style="align-self:center;background:#FFF6D8;color:#6B5A20;font-size:13px;padding:6px 10px;border-radius:8px">Tap the link to open ' + (p.sex === 'M' ? 'his' : 'her') + ' page</div></div></div>';
  }
  A.openLink = () => { UI.f.otp = ''; CD.go('patient', 'otp'); };
  SC.otp = function () {
    const p = me(); const c = C();
    return frame('<main><div class="muted small" style="word-break:break-all">' + CD.link(p.id) + '</div><h1 class="t">Enter the code</h1><div class="bub" style="max-width:none">Your code for ' + esc(c.name) + ' is <strong>4 8 1 7</strong>. Don\'t share it with anyone.<span class="tm">WhatsApp · just now</span></div><div class="otp">' + [0, 1, 2, 3].map(i => '<input inputmode="numeric" maxlength="1" data-ai="otpIn" data-i="' + i + '" aria-label="Digit ' + (i + 1) + '"' + (i === 0 ? ' data-autofocus' : '') + '>').join('') + '</div><div id="otp-err" class="bad small" style="text-align:center"></div><div class="muted small" style="text-align:center">Only the first time on this phone.</div></main>', 'Login');
  };
  A.otpIn = (ds, el) => {
    const ins = Array.from(document.querySelectorAll('.otp input'));
    el.value = el.value.replace(/\D/g, '').slice(-1);
    const i = Number(ds.i); if (el.value && ins[i + 1]) ins[i + 1].focus();
    const code = ins.map(x => x.value).join('');
    if (code.length === 4) {
      if (code === '4817') { S().patientAuth[authKey(me())] = true; CD.go('patient', 'home'); CD.toast('Logged in · next time it opens straight away'); }
      else { document.getElementById('otp-err').textContent = 'That code is not right. Check WhatsApp.'; ins.forEach(x => { x.value = ''; }); ins[0].focus(); }
    }
  };

  /* ---------- home ---------- */
  SC.home = function () {
    const c = C(), s = S(), p = me();
    if (!p) return frame('<main><div class="card pad">No patients yet. Register one at reception first.</div></main>', '');
    if (!s.patientAuth[authKey(p)]) return frame(waChat(p), 'WhatsApp');
    const v = todayV(p);
    const d = v ? CD.doc(v.doc) : null;
    let top = '';
    if (v && v.status === 'waiting') {
      const w = CD.waiting(v.doc); const pos = w.indexOf(v) + (CD.inCabin(v.doc) ? 1 : 0);
      const mins = (pos) * 7 + (d.status === 'out' && d.out ? Math.max(0, d.out.until - s.clock) : 0);
      top = '<section class="card" style="padding:22px;background:var(--a);border:0;color:#FFFFFF"><div style="opacity:.8;font-size:15px">Your token today</div><div class="flex" style="align-items:baseline"><span style="font-size:52px;font-weight:700;line-height:1.05">' + esc(v.tok) + '</span><span style="font-size:20px;font-weight:600">' + (pos === 0 ? 'You\'re next' : pos + ' before you') + '</span></div><div style="opacity:.9;font-size:15px">' + esc(d.name) + ' · we\'ll message you when it\'s your turn</div></section>' +
        (d.status === 'out' && d.out ? '<div class="banner small">' + esc(d.short) + ' stepped out (' + esc(d.out.reason.toLowerCase()) + '). Back by ' + CD.t(d.out.until) + '. Your turn is safe.</div>' : '') +
        '<section class="card" style="padding:16px 16px 18px" aria-label="Live queue"><div class="muted small" style="margin-bottom:12px">Live queue · moving every ~7 min</div>' + CD.trainHtml(v.doc, p.id, true) + '<div style="margin-top:10px;font-size:15px">About <strong>' + Math.max(2, mins) + ' min</strong> to your turn · you can wait outside</div></section>';
    } else if (v && v.status === 'cabin') top = '<section class="card" style="padding:22px;background:var(--a);border:0;color:#FFFFFF"><div style="font-size:15px;opacity:.85">Token ' + esc(v.tok) + '</div><div style="font-size:30px;font-weight:700">It\'s your turn</div><div>Please go in to ' + esc(d.short) + '\'s cabin.</div></section>';
    else if (v && v.status === 'booked') top = '<section class="card pad"><div class="muted small">Booked today</div><div style="font-size:24px;font-weight:700">' + CD.tShort(v.booked) + ' with ' + esc(d.short) + '</div><div class="muted small">Token ' + esc(v.tok) + ' will start when you arrive.</div><button class="btn" style="margin-top:12px" data-a="pHere">I\'m at the clinic</button></section>';
    else if (v && v.status === 'done') top = '<section class="card pad soft"><div style="font-size:22px;font-weight:700">Seen today ✓</div><div class="muted small">Your prescription is in "My medicines".</div></section>';
    else {
      const ap = c.appts.filter(a => a.pid === p.id && a.date >= s.today).sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1)[0];
      top = ap ? '<section class="card pad"><div class="muted small">Your next visit</div><div style="font-size:22px;font-weight:700">' + (ap.date === s.today ? 'Today' : CD.day(ap.date)) + ' · ' + CD.tShort(ap.time) + '</div><div class="muted small">' + esc(CD.doc(ap.doc).name) + '</div></section>' : '<section class="card pad"><div style="font-size:20px;font-weight:600">Hello ' + esc(CD.first(p.name)) + '</div><div class="muted small">No visit booked right now.</div></section>';
    }
    const lastRx = c.rx.filter(r => r.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    const bills = c.bills.filter(b => b.pid === p.id);
    const unpaidV = v && !v.bill && CD.feeItems(p.id, v.kind, v.tr).length && v.status !== 'left';
    const slots = nextFree();
    const tiles = [
      ['book', '+', 'Book a visit', slots ? 'Next free: ' + slots : 'See free times'],
      ['rx', 'Rx', 'My medicines', lastRx ? lastRx.meds.length + ' from ' + CD.d(lastRx.date) : 'None yet'],
      ['bills', '₹', 'My bills', bills.some(b => !b.refund) ? (unpaidV ? 'To pay today' : 'All paid') : 'No bills yet']
    ];
    if (c.boxes.p_reports) tiles.push(['reports', '▤', 'My reports', c.reports.filter(r => r.pid === p.id).length + ' reports']);
    if (c.boxes.p_pay && unpaidV) tiles.push(['pay', '↗', 'Pay online', 'Pay ' + rs(CD.feeItems(p.id, v.kind, v.tr).reduce((x, i) => x + i.amt, 0)) + ' by UPI']);
    return frame('<main>' + top + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + tiles.map(([k, i, t, sub]) => '<button class="tile" data-a="nav" data-v="' + k + '"><span class="ic" aria-hidden="true" style="background:var(--at,#DFF0EE);color:var(--a)">' + i + '</span><span class="tt">' + t + '</span><span class="sb">' + esc(sub) + '</span></button>').join('') + '</div>' +
      '<div class="card flex" style="padding:16px 18px"><div class="grow"><div style="font-weight:600">Need help?</div><div class="muted small">Talk to the clinic</div></div><button class="ghost sm" data-a="pCall">Call</button></div></main>');
  };
  function nextFree() {
    const s = S(), c = C(); const p = me(); const d = CD.doc(p.doc && CD.doc(p.doc).from ? p.doc : (c.doctors[0] || {}).id);
    if (!d.from) return '';
    let day = CD.addDays(s.today, 1); if (CD.dow(day) === 0) day = CD.addDays(day, 1);
    const taken = c.appts.filter(a => a.doc === d.id && a.date === day).map(a => a.time);
    for (let t = d.from; t < d.to; t += 30) if (!taken.includes(t)) return 'tomorrow ' + CD.tShort(t);
    return '';
  }
  A.pHere = () => { const p = me(); const v = todayV(p); v.status = 'waiting'; v.arrived = S().clock; CD.toast('Reception knows you\'re here'); CD.render(); };
  A.pCall = () => CD.toast('Calling ' + C().name + '…');

  /* ---------- book ---------- */
  SC.book = function () {
    const s = S(), c = C(), p = me(); const f = UI.f;
    const dates = []; let x = s.today; while (dates.length < 4) { if (CD.dow(x) !== 0) dates.push(x); x = CD.addDays(x, 1); }
    f.day = f.day || dates[1]; f.doc = f.doc || (p.doc && c.doctors.some(d => d.id === p.doc) ? p.doc : (c.doctors[0] || {}).id);
    const d = CD.doc(f.doc);
    const onLeave = c.leaves.some(l => l.doc === d.id && l.date === f.day);
    const taken = c.appts.filter(a => a.doc === d.id && a.date === f.day).map(a => a.time);
    const slots = []; for (let t = d.from; t < d.to; t += 30) if (!(f.day === s.today && t <= s.clock + 15)) slots.push(t);
    const lv = CD.lastVisit(p.id, true);
    const free = lv && CD.daysAgo(lv.date) <= c.freeDays;
    return frame('<main>' + CD.backBtn() + '<h1 class="t">Book a visit</h1>' +
      (c.doctors.length > 1 ? '<div><div class="muted small" style="margin-bottom:8px">Doctor</div>' + CD.choices('doc', c.doctors.map(x => [x.id, x.short]), f.doc) + '</div>' : '') +
      '<div><div class="muted small" style="margin-bottom:8px">Day</div>' + CD.choices('day', dates.map(dt => [dt, dt === s.today ? 'Today' : dt === CD.addDays(s.today, 1) ? 'Tomorrow' : CD.day(dt).split(' ').slice(0, 2).join(' ')]), f.day) + '</div>' +
      (onLeave ? '<div class="banner small">' + esc(d.short) + ' is on leave that day. Please pick another day.</div>' : '<div><div class="muted small" style="margin-bottom:8px">Free times with ' + esc(d.short) + '</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + (slots.length ? slots.map(t => taken.includes(t) ? '<button class="choice" disabled style="opacity:.3;text-decoration:line-through">' + CD.tShort(t) + '</button>' : '<button class="choice' + (Number(f.t) === t ? ' on' : '') + '" data-a="pick" data-k="t" data-v="' + t + '">' + CD.tShort(t) + '</button>').join('') : '<span class="muted small">No times left.</span>') + '</div></div>') +
      '<div class="card pad small" style="color:#3A4458">' + (lv ? (free ? 'Follow-up · free, as it\'s within ' + c.freeDays + ' days' : 'Follow-up · ' + rs(c.fee) + ' (last visit was ' + CD.daysAgo(lv.date) + ' days ago)') : 'New visit · ' + rs(c.fee)) + '</div>' +
      '<button class="btn" data-a="pBook"' + (f.t && !onLeave ? '' : ' disabled') + '>' + (f.t ? 'Book ' + (f.day === s.today ? 'today' : CD.day(f.day)) + ' ' + CD.tShort(Number(f.t)) : 'Pick a time') + '</button></main>', 'Book');
  };
  A.pBook = () => { const f = UI.f, c = C(), p = me(); c.appts.push({ id: CD.uid('a'), date: f.day, time: Number(f.t), pid: p.id, doc: f.doc, src: 'Patient page' }); CD.send(p.id, 'booked', { doctor: CD.doc(f.doc).name, day: f.day === S().today ? 'today' : CD.day(f.day), time: CD.tShort(Number(f.t)) }, 'Booked'); CD.go('patient', 'home'); CD.toast('Booked · confirmation sent on WhatsApp · reception can see it', true); };

  /* ---------- medicines ---------- */
  SC.rx = function () {
    const c = C(), p = me();
    const rx = c.rx.filter(r => r.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    const r = rx[0];
    return frame('<main>' + CD.backBtn() + '<h1 class="t">My medicines</h1>' + (r ? '<div class="muted">From your visit on ' + CD.d(r.date) + ' · ' + esc(CD.doc(r.doc).short) + '</div>' + r.meds.map(m => '<div class="card" style="padding:16px 18px"><div style="font-size:17px;font-weight:600">' + esc(m.n) + '</div><div style="color:#3A4458">' + esc(m.how) + '</div></div>').join('') + (r.advice ? '<div class="card pad small soft">' + esc(r.advice) + '</div>' : '') + (r.follow ? '<div class="muted small">Next visit: around ' + CD.day(r.follow) + '</div>' : '') + '<button class="btn" style="background:#FFFFFF;color:var(--a);border:1.5px solid var(--a)" data-a="pRxPdf" data-id="' + r.id + '">Download prescription (PDF)</button>' + (rx.length > 1 ? '<div class="muted small">Older: ' + rx.slice(1, 5).map(x => CD.d(x.date)).join(' · ') + '</div>' : '') : '<div class="card pad">No prescription yet.</div>') + '</main>', 'Medicines');
  };
  A.pRxPdf = ds => { const r = C().rx.find(x => x.id === ds.id); CD.print('Prescription', CD.rxPrintHtml(CD.P(r.pid), r, CD.doc(r.doc))); };

  /* ---------- bills ---------- */
  SC.bills = function () {
    const c = C(), p = me();
    const bills = c.bills.filter(b => b.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    return frame('<main>' + CD.backBtn() + '<h1 class="t">My bills</h1>' + (bills.length ? bills.map(b => '<button class="card" style="padding:16px 18px;display:flex;align-items:center;gap:12px;text-align:left" data-a="pBill" data-no="' + b.no + '"><div class="grow"><div style="font-size:17px;font-weight:600">' + esc(b.items.map(i => i.n.split(' (')[0]).join(', ')) + '</div><div class="muted small">' + CD.d(b.date) + ' · ' + esc(b.mode) + '</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:700">' + rs(b.total) + '</div><span class="stamp ' + (b.refund ? 'bad' : 'ok') + '" style="font-size:12px;padding:1px 6px">' + (b.refund ? 'Refunded' : 'Paid') + '</span></div></button>').join('') : '<div class="card pad">No bills yet.</div>') + '</main>', 'Bills');
  };
  A.pBill = ds => { const b = C().bills.find(x => x.no === ds.no); CD.modal(CD.receiptHtml(b) + '<div class="flex"><button class="btn" data-a="printBill" data-no="' + b.no + '">Download</button><button class="txt" data-a="close">Close</button></div>'); };

  /* ---------- reports ---------- */
  SC.reports = function () {
    const c = C(), p = me();
    const reps = c.reports.filter(r => r.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    return frame('<main>' + CD.backBtn() + '<h1 class="t">My reports</h1>' + reps.map(r => '<div class="card" style="padding:16px 18px"><div style="font-size:17px;font-weight:600">' + esc(r.name) + '</div><div class="muted small">' + CD.d(r.date) + ' · ' + (r.seen ? 'seen by the doctor' : 'waiting for the doctor') + '</div></div>').join('') + '<label class="btn" style="display:flex;align-items:center;justify-content:center;cursor:pointer">Send a new report<input type="file" accept="image/*,.pdf" data-ac="pUpload" style="display:none"></label><div class="muted small">Or just send the photo on WhatsApp — it lands here too.</div></main>', 'Reports');
  };
  A.pUpload = (ds, el) => { const f = el.files && el.files[0]; if (!f) return; const p = me(); C().reports.push({ id: CD.uid('r'), pid: p.id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Report', date: S().today, time: S().clock, seen: false, values: [['File', f.name, 'Waiting for the doctor to read']] }); CD.toast('Sent to the doctor · she gets it in "New reports"'); CD.render(); };

  /* ---------- pay online ---------- */
  SC.pay = function () {
    const p = me(); const v = todayV(p);
    if (!v || v.bill) return frame('<main>' + CD.backBtn() + '<div class="card pad">Nothing to pay.</div></main>');
    const items = CD.feeItems(p.id, v.kind, v.tr); const amt = items.reduce((x, i) => x + i.amt, 0);
    return frame('<main>' + CD.backBtn() + '<h1 class="t">Pay ' + rs(amt) + '</h1><div class="muted">' + esc(items.map(i => i.n).join(', ')) + ' · token ' + esc(v.tok) + '</div>' + ['Google Pay', 'PhonePe', 'Paytm', 'Any UPI app'].map(a => '<button class="choice" style="text-align:left" data-a="pPay" data-v="' + a + '">' + a + '</button>').join('') + '<div class="muted small">Demo: no real money moves.</div></main>', 'Pay');
  };
  A.pPay = ds => { const p = me(); const v = todayV(p); const items = CD.feeItems(p.id, v.kind, v.tr); const b = CD.makeBill(p.id, items, 'UPI', { by: 'Patient (online · ' + ds.v + ')' }); v.bill = b.no; CD.send(p.id, 'receipt', { bill: b.no, amount: b.total, mode: 'UPI', link: CD.link(p.id, 'bills') }, 'Receipt'); CD.go('patient', 'home'); CD.toast('Paid ' + rs(b.total) + ' · reception sees it as paid', true); };
  Object.keys(SC).forEach(k => { const fn = SC[k]; SC[k] = () => me() ? fn() : frame('<main><div class="card pad">No patients yet. Register one at reception first, then their page shows here.</div></main>', ''); });
})();
