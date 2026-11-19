/* Clinic Desk v4 — the phone mockups, working on real data.
   Screens are drawn exactly like the v4 mockups; every button uses the same actions the desk already had,
   so nothing is lost and the live server sync keeps working. */
(function () {
  'use strict';
  const CD = window.CD, A = CD.A, UI = CD.UI, R = CD.R;
  const esc = CD.esc, rs = CD.rs;
  const S = () => CD.S, C = () => CD.C();
  const first = n => String(n || '').split(' ')[0];
  const J = o => esc(JSON.stringify(o));
  const G = '#22C55E', AM = '#F59E0B', RD = '#EF4444', GR = '#A1A1AA';
  const dot = c => '<b style="background:' + c + '"></b>';
  const KIND = { new: 'new', follow: 'follow-up', proc: 'procedure' };
  const SEX = { F: 'Female', M: 'Male', O: 'Other' };
  const ageSex = p => [p.age ? p.age + ' y' : '', SEX[p.sex] || ''].filter(Boolean).join(' · ');

  const I = {
    opd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/></svg>',
    pts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14c2.6 0 4.4 1.4 5 4"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    fup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/></svg>',
    rep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
  };

  /* ---------- shell: tabs + top ---------- */
  const myDoc = () => { const c = C(); const id = S().docId && c.doctors.some(d => d.id === S().docId) ? S().docId : (c.doctors[0] || {}).id; return CD.doc(id); };
  const openCalls = () => C().calls.filter(x => !x.done);
  const myReps = () => { const d = myDoc(); const mine = new Set(C().visits.filter(v => v.doc === d.id).map(v => v.pid)); return C().reports.filter(r => !r.seen && mine.has(r.pid)); };
  const TABS = {
    reception: [['OPD', 'opd', 'home', ['home', 'queue', 'newp', 'pay', 'status']], ['Inbox', 'inbox', 'inbox', ['inbox', 'calls', 'appt'], () => openCalls().length], ['Patients', 'pts', 'patients', ['patients', 'patient']], ['Money', 'money', 'close', ['close', 'bills', 'more']]],
    doctor: [['Today', 'today', 'home', ['home', 'consult', 'today', 'out', 'search', 'patient', 'photos']], ['Follow-ups', 'fup', 'follow', ['follow']], ['Reports', 'rep', 'reports', ['reports'], () => myReps().length], ['More', 'more', 'more', ['more', 'sets', 'leave', 'earn', 'letter']]],
    owner: [['Today', 'today', 'home', ['home', 'cash', 'growth']], ['Money', 'money', 'money', ['money', 'refs', 'reports']], ['Staff', 'staff', 'staff', ['staff']], ['Settings', 'set', 'settings', ['settings']]]
  };
  function tabs() {
    const T = TABS[UI.app]; if (!T) return '';
    return '<nav class="ktabs no-print"><div class="kti">' + T.map(([l, ic, scr, grp, bd]) => { const n = bd ? bd() : 0; return '<button class="ktab' + (grp.includes(UI.scr) ? ' on' : '') + '" data-a="nav" data-v="' + scr + '">' + (n ? '<span class="kbadge">' + n + '</span>' : '') + I[ic] + l + '</button>'; }).join('') + '</div></nav>';
  }
  CD.wrapBody = body => {
    const T = TABS[UI.app]; if (!T) return body;
    if (T.some(t => t[2] === UI.scr)) body = body.replace(/<button class="back"[^>]*>[^<]*<\/button>/, '');
    else body = body.replace(/(<button class="back"[^>]*>)[^<]*(<\/button>)/, '$1‹ Back$2');
    return body + tabs();
  };
  const ini = n => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const top = (title, right, clin) => '<div class="ktop"><div><div class="kclin">' + esc(clin || C().name) + '</div><div class="klt">' + title + '</div></div>' + (right == null ? '<button class="kdots" data-a="kmenu">···</button>' : right) + '</div>';
  const topBack = (back, title, right) => '<div class="ktop" style="padding-top:8px"><div><button class="kback" data-a="nav" data-v="' + back[1] + '">‹ ' + esc(back[0]) + '</button><div class="klt" style="font-size:24px">' + title + '</div></div>' + (right || '') + '</div>';
  const sec = (t, r) => '<div class="ksec">' + t + (r != null && r !== '' ? ' <span>' + r + '</span>' : '') + '</div>';
  const page = inner => '<div class="kph">' + inner + '</div>';
  CD.header = () => '';
  const kseg = (k, opts, cur, act) => '<div class="kseg">' + opts.map(([v, l]) => '<button class="' + (String(cur) === String(v) ? 'on' : '') + '" data-a="' + (act || 'pick') + '" data-k="' + k + '" data-v="' + esc(v) + '">' + l + '</button>').join('') + '</div>';
  const kchips = (k, opts, cur, act) => '<div class="kchips">' + opts.map(([v, l]) => '<button class="kchip' + (String(cur) === String(v) ? ' on' : '') + '" data-a="' + (act || 'pick') + '" data-k="' + k + '" data-v="' + esc(v) + '">' + l + '</button>').join('') + '</div>';
  const sheetHead = (t, cancel) => '<div class="ksh"><h3>' + t + '</h3><button class="klink" data-a="close">' + (cancel || 'Cancel') + '</button></div>';
  CD.ksheetHead = sheetHead;

  A.kmenu = () => {
    const apps = [['reception', 'Reception'], ['doctor', 'Doctor'], ['owner', 'Owner']].filter(a => !CD.allowApp || CD.allowApp(a[0]));
    const row = (a, v, t, sub) => '<button class="krow" data-a="' + a + '" data-v="' + v + '"><span class="kg"><span class="knm">' + t + '</span>' + (sub ? '<span class="ksm">' + sub + '</span>' : '') + '</span><span class="kchev">›</span></button>';
    CD.modal(sheetHead('Menu', 'Done') +
      (apps.length > 1 ? '<div class="kcard">' + apps.map(([id, l]) => '<button class="krow" data-a="app" data-v="' + id + '"><span class="kg"><span class="knm">' + l + ' app</span></span>' + (UI.app === id ? '<span class="ktag" style="background:#E8F7EE;color:#15803D">Open</span>' : '<span class="kchev">›</span>') + '</button>').join('') + '</div>' : '') +
      '<div class="kcard">' + (UI.app === 'reception' ? row('nav', 'queue', 'Queue train', 'What patients see on their phone') + row('nav', 'more', 'Print and export', 'OPD register, Excel') : '') +
      (UI.app === 'owner' ? row('nav', 'growth', 'Patients and growth') + row('nav', 'cash', 'Cash check') + row('nav', 'refs', 'Referral payouts') : '') +
      (UI.app === 'doctor' ? row('nav', 'search', 'Search patients') : '') + '</div>' +
      (CD.liveMenuRows ? '<div class="kcard">' + CD.liveMenuRows() + '</div>' : ''));
  };

  /* ---------- doctor status pills (shared) ---------- */
  function pills(d) {
    const L = [['in', 'In clinic', G], ['later', 'Late', AM], ['out', 'Away', RD], ['gone', 'Leave', GR]];
    return '<div class="kpills">' + L.map(([v, l, c]) => '<button class="kpill' + (d.status === v ? ' on ' + v : '') + '" data-a="' + (v === 'out' ? 'kaway' : 'setDocStatus') + '" data-id="' + d.id + '" data-v="' + v + '">' + dot(c) + l + '</button>').join('') + '</div>';
  }
  A.kaway = ds => {
    const d = CD.doc(ds.id); UI.f.awm = UI.f.awm || '30'; UI.f.awr = UI.f.awr || 'Emergency'; UI.f.awd = d.id;
    CD.modal(() => { const m = Number(UI.f.awm); const n = CD.waiting(d.id).length; return sheetHead('Step out') +
      '<div class="klbl">Back in</div>' + kchips('awm', [['15', '15 min'], ['30', '30 min'], ['60', '1 hour'], ['120', '2 hours']], UI.f.awm, 'kpk') +
      '<div class="klbl">Reason patients see</div>' + kchips('awr', [['Emergency', 'Emergency'], ['Hospital round', 'Hospital round'], ['Short break', 'Short break'], ["Don't say", "Don't say"]], UI.f.awr, 'kpk') +
      '<div class="kcard kpad" style="font-size:14px;line-height:1.5;background:#FFFBEB;border-color:#FDE68A">' + n + ' waiting patient' + (n === 1 ? '' : 's') + ' get a WhatsApp now: <i>"' + esc(d.short) + (UI.f.awr === "Don't say" ? ' thodi der ke liye bahar gaye hain' : ' ' + UI.f.awr.toLowerCase() + ' ke liye gaye hain') + ', ' + CD.t(S().clock + m) + ' tak wapas aa jayenge."</i></div>' +
      '<button class="kbtn" data-a="kawayGo">Step out · back ' + CD.t(S().clock + m) + '</button>'; });
  };
  A.kpk = ds => { UI.f[ds.k] = ds.v; CD.renderModal(); };
  A.kawayGo = () => {
    const d = CD.doc(UI.f.awd); const m = Number(UI.f.awm) || 30; const why = UI.f.awr === "Don't say" ? 'Short break' : UI.f.awr;
    const cab = CD.inCabin(d.id); if (cab) cab.status = 'waiting';
    d.status = 'out'; d.out = { until: S().clock + m, reason: why, told: CD.waiting(d.id).length };
    CD.waiting(d.id).forEach(v => CD.send(v.pid, 'out', { doctor: d.short, reason: why.toLowerCase(), until: CD.t(d.out.until) }, 'Doctor out'));
    CD.closeModal(); CD.toast(d.short + ' away till ' + CD.t(d.out.until) + ' · patients told', true); CD.render();
  };

  /* ====================================================================================
     RECEPTION
     ==================================================================================== */
  const RS = CD.apps.reception.screens;
  const feeDue = v => (v.bill ? 0 : CD.feeItems(v.pid, v.kind, v.tr).reduce((s, x) => s + x.amt, 0));
  const unpaid = () => CD.todays().filter(v => ['waiting', 'cabin', 'booked', 'done'].includes(v.status) && !v.bill && !v.payLaterOk && feeDue(v) > 0);
  const peekTok = () => { const c = C(); const nums = CD.todays().map(CD.tokN).filter(x => x < 900); return 'A-' + Math.max(c.tokNext || 1, ...(nums.length ? nums.map(x => x + 1) : [1])); };
  const activeDoc = () => { const c = C(); const act = c.doctors.filter(d => d.status === 'in' || d.status === 'out' || CD.todays().some(v => v.doc === d.id && ['waiting', 'cabin'].includes(v.status))); const pick = UI.f.rdoc && act.some(d => d.id === UI.f.rdoc) ? CD.doc(UI.f.rdoc) : (act[0] || c.doctors[0]); return [pick, act]; };

  RS.home = function () {
    const c = C(), s = S();
    const [d, act] = activeDoc();
    const cab = CD.inCabin(d.id), wait = CD.waiting(d.id), nx = wait[0];
    const docSeg = act.length > 1 ? kseg('rdoc', act.map(x => [x.id, esc(x.short)]), d.id) : '';
    const outW = d.status === 'out' && d.out ? '<div class="kwarn"><b>' + esc(d.short) + ' stepped out</b> · back by ' + CD.t(d.out.until) + ' · ' + d.out.told + ' waiting patients were told on WhatsApp</div>' : '';
    const sendBtn = nx ? '<button class="kbtn" data-a="sendNext" data-doc="' + d.id + '"' + (d.status === 'in' ? '' : ' disabled') + '>Send next · ' + esc(nx.tok.replace('-', '')) + ' ' + esc(first(CD.P(nx.pid).name)) + '</button>' : '';
    let card;
    if (cab) {
      const p = CD.P(cab.pid); const tk = cab.tok.split('-');
      card = '<div class="kcard kpad kcol"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="ksm" style="margin:0">With doctor · ' + Math.max(1, s.clock - (cab.started || s.clock)) + ' min</div>' +
        '<div style="display:flex;align-items:baseline;gap:6px;margin-top:2px"><span style="font-size:22px;font-weight:700;color:#9CA3AF">' + esc(tk[0]) + '</span><span class="kbig">' + esc(tk[1] || cab.tok) + '</span></div>' +
        '<div class="knm" style="font-size:18px;margin-top:4px">' + esc(p.name) + '</div><div class="ksm">' + esc([ageSex(p), p.problem ? p.problem.charAt(0).toUpperCase() + p.problem.slice(1) : KIND[cab.kind], cab.bill ? 'Paid ' + rs(CD.billOf(cab).total) : (feeDue(cab) ? 'Not paid' : '')].filter(Boolean).join(' · ')) + '</div></div>' +
        '<button class="kbtn3" data-a="knotHere" data-tok="' + cab.tok + '">Not here</button></div>' +
        (sendBtn || '<button class="kbtn2" data-a="finishCabinAndNext" data-doc="' + d.id + '">' + esc(first(p.name)) + ' is done</button>') + '</div>';
    } else {
      card = '<div class="kcard kpad kcol"><div><div class="ksm" style="margin:0">' + esc(d.short) + '</div><div class="knm" style="font-size:20px;margin-top:2px">' + (d.status === 'out' ? 'Doctor is out' : d.status === 'later' ? 'Not in yet · from ' + CD.tShort(d.from) : d.status === 'gone' ? 'On leave today' : 'Cabin is free') + '</div></div>' + sendBtn + '</div>';
    }
    const toBill = unpaid().filter(v => v.status === 'done' || v.status === 'cabin');
    const tb = toBill.length ? sec('To bill', toBill.length) + '<div class="kcard">' + toBill.map(v => { const p = CD.P(v.pid); return '<button class="krow" data-a="kpay" data-id="' + p.id + '"><span class="ktk">' + esc(v.tok.replace('-', '')) + '</span><span class="kg"><span class="knm">' + esc(p.name) + '</span><span class="ksm">' + (v.status === 'cabin' ? 'With doctor now' : 'Seen ' + CD.tShort(v.started || v.time) + (v.ended ? ' – ' + CD.tShort(v.ended) : '')) + (p.problem ? ' · ' + esc(p.problem) : '') + '</span></span><span class="klink">Take ' + rs(feeDue(v)) + '</span><span class="kchev">›</span></button>'; }).join('') + '</div>' : '';
    const q = CD.queue(d.id);
    const rows = q.map(v => {
      const p = CD.P(v.pid); const due = feeDue(v);
      const st = v.status === 'booked' ? dot(GR) + 'Not arrived' : (due > 0 && !v.payLaterOk) ? dot(AM) + 'Not paid' : dot(G) + 'In waiting room';
      return '<button class="krow" data-a="krowSheet" data-tok="' + v.tok + '"><span class="ktk">' + esc(v.tok.replace('-', '')) + '</span><span class="kg"><span class="knm">' + esc(p.name) + '</span><span class="ksm">' + esc([(p.source === 'WhatsApp bot' ? 'WhatsApp' : p.source || 'Walk-in'), v.status === 'booked' && v.booked ? 'booked ' + CD.tShort(v.booked) : KIND[v.kind]].filter(Boolean).join(' · ')) + '</span></span><span class="kst">' + st + '</span></button>';
    }).join('');
    return page(top('OPD') + docSeg + pills(d) + outW + card + tb +
      sec('Up next', wait.length + ' waiting · ~10 min each') +
      '<div class="kcard"><button class="krow" data-a="knew" style="color:var(--a);font-weight:600;font-size:16px"><span style="font-size:22px;width:40px;text-align:center">+</span>New patient / walk-in</button>' + rows + '</div>');
  };
  A.knotHere = ds => { const v = CD.todays().find(x => x.tok === ds.tok); v.status = 'waiting'; v.started = null; CD.toast(first(CD.P(v.pid).name) + ' moved back to the waiting list'); CD.render(); };

  /* row sheet: everything you can do with one patient in the queue */
  A.krowSheet = ds => {
    CD.modal(() => {
      const v = CD.todays().find(x => x.tok === ds.tok); if (!v) return sheetHead('Gone', 'Close') + '<div class="kempty">This patient is no longer in the queue.</div>';
      const p = CD.P(v.pid); const due = feeDue(v); const d = CD.doc(v.doc); const cab = CD.inCabin(v.doc);
      const row = (a, t, sub, extra, col) => '<button class="krow" data-a="' + a + '" ' + (extra || '') + '><span class="kg"><span class="knm" style="font-size:16px' + (col ? ';color:' + col : '') + '">' + t + '</span>' + (sub ? '<span class="ksm">' + sub + '</span>' : '') + '</span><span class="kchev">›</span></button>';
      return sheetHead(esc(v.tok.replace('-', '')) + ' · ' + esc(p.name), 'Close') +
        '<div class="kcard kpad"><div class="ksm" style="margin:0">' + esc([ageSex(p), CD.phoneFmt(p.phone), d.short, KIND[v.kind]].filter(Boolean).join(' · ')) + '</div>' + (p.words ? '<div class="kquote" style="margin-top:8px">"' + esc(String(p.words).replace(/^["“]+|["”]+$/g, '')) + '"</div>' : '') + '</div>' +
        '<div class="kcard">' +
        (due > 0 && !v.bill ? row('kpay', 'Take payment · ' + rs(due), '', 'data-id="' + p.id + '"') : '') +
        (v.status === 'booked' ? row('arrived', 'Mark arrived', 'Token link goes on WhatsApp', 'data-tok="' + v.tok + '"') : '') +
        (v.status === 'waiting' && !cab && d.status === 'in' ? row('sendAnyway', 'Send in now', 'Skips the line', 'data-tok="' + v.tok + '"') : '') +
        (v.status === 'waiting' ? row('moveEnd', 'Not here — move to the end', 'New token goes on WhatsApp', 'data-tok="' + v.tok + '"') : '') +
        row('printTok', 'Print token slip', '', 'data-tok="' + v.tok + '"') +
        row('openP', 'Open patient', 'History, bills, prescriptions', 'data-id="' + p.id + '"') +
        (v.bill ? row('leftRefund', 'Left — refund ' + rs(CD.billOf(v).total), '', 'data-tok="' + v.tok + '"', '#B91C1C') : '') +
        row('leftNoRefund', 'Left without seeing the doctor', '', 'data-tok="' + v.tok + '"', '#B91C1C') + '</div>';
    });
  };

  /* new patient sheet */
  A.knew = () => {
    const c = C(); const inDoc = c.doctors.find(d => d.status === 'in') || c.doctors[0];
    UI.f = { init: 1, sex: 'F', kind: 'new', mode: 'Cash', src: 'Walk-in', doc: (activeDoc()[0] || inDoc).id };
    CD.modal(newSheet);
  };
  function newSheet() {
    const f = UI.f, c = C();
    const docs = c.doctors.filter(d => d.status !== 'gone');
    const procs = c.treatments.filter(t => t.cat === 'procedure');
    const ff = CD.visitFee(f.pid, 'follow');
    return sheetHead('New patient') +
      '<div class="kfld"><div class="kfl"><label>Mobile</label><input data-f="phone" data-u="kmatch,kgive" inputmode="numeric" maxlength="10" value="' + esc(f.phone || '') + '" placeholder="10-digit number"></div>' +
      '<div class="kfl"><label>Name</label><input data-f="name" data-u="kgive" value="' + esc(f.name || '') + '" placeholder="Full name"></div>' +
      '<div class="kfl"><label>Age</label><input data-f="age" inputmode="numeric" maxlength="3" value="' + esc(f.age || '') + '" placeholder="Years"></div></div>' +
      CD.region('kmatch') +
      '<div class="klbl">Sex</div>' + kseg('sex', [['M', 'Male'], ['F', 'Female'], ['O', 'Other']], f.sex) +
      '<div class="klbl">Visit</div>' + kseg('kind', [['new', 'New'], ['follow', 'Follow-up' + (f.pid && !ff ? ' · free' : '')], ['proc', 'Procedure']], f.kind) +
      (f.kind === 'proc' ? kchips('tr', procs.map(t => [t.id, esc(t.n) + ' · ' + rs(t.p)]), f.tr || '') : '') +
      (docs.length > 1 ? '<div class="klbl">Doctor</div>' + kchips('doc', docs.map(d => [d.id, esc(d.short) + (d.status === 'in' ? ' · now' : d.status === 'out' && d.out ? ' · back ' + CD.tShort(d.out.until) : ' · from ' + CD.tShort(d.from))]), f.doc) : '') +
      (!f.pid ? '<div class="klbl">Came from</div>' + kchips('src', [['Walk-in', 'Walk-in'], ['Google', 'Google'], ['Instagram', 'Instagram'], ['Referral', 'Friend'], ['Another doctor', 'Doctor'], ['WhatsApp bot', 'WhatsApp']], f.src) : '') +
      CD.region('kgive');
  }
  R.kmatch = () => {
    const f = UI.f; const ph = (f.phone || '').replace(/\D/g, ''); if (ph.length < 10) return '';
    if (f.pid) { const p = CD.P(f.pid); if (p && p.phone === ph) return '<div class="kcard kpad" style="display:flex;gap:10px;align-items:center;background:var(--as);border-color:var(--al)"><div class="kg"><div class="knm" style="font-size:15px">Old patient · ' + esc(p.name) + '</div><div class="ksm">' + esc(ageSex(p)) + ' · ' + C().visits.filter(v => v.pid === p.id).length + ' visits</div></div><button class="klink" data-a="unuseP">Not them?</button></div>'; }
    const p = C().patients.find(x => x.phone === ph && !x.merged); if (!p) return '';
    const lv = CD.lastVisit(p.id);
    return '<button class="kcard kpad kplain" style="width:100%;display:flex;gap:10px;align-items:center;background:var(--as);border-color:var(--al)" data-a="useP" data-id="' + p.id + '"><div class="kg"><div class="knm" style="font-size:15px">Came before · ' + esc(p.name) + '</div><div class="ksm">' + (lv ? 'Last visit ' + CD.d(lv.date) : 'No visits yet') + ' · tap to use</div></div><span class="kchev">›</span></button>';
  };
  R.kgive = () => {
    const f = UI.f; const items = CD.feeItems(f.pid || null, f.kind, f.tr); const fee = items.reduce((s, x) => s + x.amt, 0);
    const m = f.mode || 'Cash';
    return '<div class="klbl" style="margin-bottom:8px">Fee ' + rs(fee) + ' · pay now?</div>' + kseg('mode', [['Cash', 'Cash'], ['UPI', 'UPI'], ['Card', 'Card'], ['later', 'Later']], m) +
      '<div id="np-err" class="kerr" style="margin-bottom:8px"></div><button class="kbtn" data-a="registerP">Give token ' + peekTok() + (fee && m !== 'later' ? ' · ' + rs(fee) + ' ' + m.toLowerCase() : '') + '</button><div class="ksm" style="text-align:center;margin-top:8px">Token and live queue link go on WhatsApp</div>';
  };

  /* take payment sheet */
  A.kpay = ds => {
    const v = CD.todays().find(x => x.pid === ds.id && !x.bill);
    UI.f = { init: 1, mode: 'UPI', wa: true, pid: ds.id, items: v ? CD.feeItems(ds.id, v.kind, v.tr) : [], disc: '' };
    CD.modal(paySheet);
  };
  function paySheet() {
    const f = UI.f, c = C(); const p = CD.P(f.pid); if (!p) return sheetHead('Take payment') + '<div class="kempty">Patient not found.</div>';
    const v = CD.todays().find(x => x.pid === p.id && !x.bill) || CD.todays().find(x => x.pid === p.id);
    const items = f.items || [];
    return sheetHead('Take payment') +
      '<div class="kcard kpad" style="display:flex;justify-content:space-between;align-items:center"><div><div class="knm">' + esc(p.name) + (v ? ' · ' + esc(v.tok.replace('-', '')) : '') + '</div><div class="ksm">' + (v ? 'Seen by ' + esc(CD.doc(v.doc).short) + ' · ' + KIND[v.kind] : 'Not in today\'s queue') + '</div></div><span class="ktag" style="background:#FEF3C7;color:#92400E">Not paid</span></div>' +
      '<div class="kfld">' + items.map((it, i) => '<div class="kfl"><span class="v">' + esc(it.n) + '</span><span class="kmono">' + rs(it.amt) + '</span><button class="kchev" style="border:0;background:none;font-size:18px;padding:0 0 0 6px" data-a="rmItem" data-i="' + i + '" aria-label="Remove">×</button></div>').join('') +
      '<div class="kfl"><select data-ac="addItem" style="color:var(--a);font-weight:600"><option value="">+ Add medicine / treatment</option>' + c.treatments.map(t => '<option value="' + t.id + '">' + esc(t.n) + ' · ' + rs(t.p) + '</option>').join('') + '</select></div>' +
      (c.perms.discount ? '<div class="kfl"><label>Discount</label><input data-f="disc" data-u="kpaytot" inputmode="numeric" value="' + esc(f.disc || '') + '" placeholder="₹0"></div>' : '') + '</div>' +
      CD.region('kpaytot');
  }
  R.kpaytot = () => {
    const f = UI.f; const items = f.items || []; const sub = items.reduce((s, x) => s + x.amt, 0); const disc = Math.min(sub, Number(f.disc) || 0); const tot = sub - disc;
    return '<div class="ktot" style="margin-bottom:12px"><span>Total' + (disc ? ' <span class="ksm" style="display:inline">(' + rs(disc) + ' off)</span>' : '') + '</span><b class="kmono">' + rs(tot) + '</b></div>' + kseg('mode', [['Cash', 'Cash'], ['UPI', 'UPI'], ['Card', 'Card']], f.mode) +
      '<button class="kbtn" data-a="markPaid"' + (items.length ? '' : ' disabled') + '>Paid ' + rs(tot) + ' by ' + esc(f.mode) + '</button><div class="ksm" style="text-align:center;margin-top:8px">Receipt goes on WhatsApp' + (C().gstin ? ' · GST bill' : '') + '</div>';
  };

  /* ---------- Inbox: WhatsApp · Missed · Call back · Booked ---------- */
  const isMissed = x => /missed/i.test((x.how || '') + ' ' + (x.why || ''));
  RS.inbox = RS.calls = RS.appt = function () {
    const c = C(), s = S();
    const tab = UI.scr === 'calls' ? (UI.f.ib === 'missed' ? 'missed' : 'cb') : UI.scr === 'appt' ? 'booked' : 'wa';
    const missed = openCalls().filter(isMissed), cb = openCalls().filter(x => !isMissed(x));
    const tmr = CD.addDays(s.today, 1);
    const booked = c.appts.filter(a => a.date >= s.today).sort((a, b) => a.date === b.date ? a.time - b.time : a.date < b.date ? -1 : 1);
    const segB = '<div class="kseg">' + [['wa', 'WhatsApp'], ['missed', 'Missed' + (missed.length ? ' ' + missed.length : '')], ['cb', 'Call back' + (cb.length ? ' ' + cb.length : '')], ['booked', 'Booked' + (booked.length ? ' ' + booked.length : '')]].map(([v, l]) => '<button class="' + (tab === v ? 'on' : '') + '" data-a="kib" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
    let body = '';
    if (tab === 'wa') {
      const msgs = c.inbox.filter(m => m.date === s.today).slice().sort((a, b) => b.time - a.time).slice(0, 60);
      body = msgs.length ? sec('Today', msgs.length) + '<div class="kcard">' + msgs.map(m => { const p = m.pid ? CD.P(m.pid) : null; const t = CD.tShort(m.time).split(' '); return '<div class="krow" style="align-items:flex-start"><div style="width:52px;flex:none"><div style="font-weight:700">' + t[0] + '</div><div class="ksm">' + (t[1] || '') + '</div></div><div class="kg"><div class="knm">' + esc(p ? p.name : 'Many patients') + ' <span class="ktag" style="background:' + (m.out ? 'var(--at);color:var(--a)' : '#F3F4F6;color:#374151') + '">' + esc(m.kind) + '</span></div><div class="ksm" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(m.text) + '</div></div></div>'; }).join('') + '</div>' : '<div class="kcard kempty">No WhatsApp messages yet today.</div>';
    } else if (tab === 'missed' || tab === 'cb') {
      const list = tab === 'missed' ? missed : cb;
      body = list.length ? sec(tab === 'missed' ? 'Missed calls' : 'Waiting for a call', list.length) + '<div class="kcard">' + list.map(x => '<div class="krow" style="align-items:flex-start;flex-wrap:wrap"><div class="kg"><div class="knm">' + esc(x.name) + (x.phone ? ' · <span class="kmono">' + esc(CD.phoneFmt(x.phone)) + '</span>' : '') + '</div><div class="ksm">' + esc(x.why) + '</div><div class="ksm">' + CD.tShort(x.when) + (x.how ? ' · ' + esc(x.how) : '') + '</div></div>' +
        '<div style="display:flex;gap:8px;width:100%;padding-top:6px"><a class="kbtn3" style="display:flex;align-items:center;text-decoration:none;color:var(--a)" href="tel:' + esc(x.phone) + '">Call</a><button class="kbtn3" data-a="callRes" data-id="' + x.id + '" data-r="talked">Talked</button><button class="kbtn3" data-a="callRes" data-id="' + x.id + '" data-r="noans">No answer</button><button class="kbtn3" data-a="callRes" data-id="' + x.id + '" data-r="booked">Booked</button></div></div>').join('') + '</div><div class="ksm" style="margin:10px 4px 0">Tap Call, then Talked or No answer. The doctor sees both.</div>' : '<div class="kcard kempty">No ' + (tab === 'missed' ? 'missed calls' : 'call-backs') + ' waiting.</div>';
    } else {
      const grp = (title, rows, today) => rows.length ? sec(title, rows.length) + '<div class="kcard">' + rows.map(a => { const p = CD.P(a.pid) || { name: 'Patient' }; const t = CD.tShort(a.time).split(' '); return '<div class="krow"><div style="width:52px;flex:none"><div style="font-weight:700">' + t[0] + '</div><div class="ksm">' + (t[1] || '') + '</div></div><button class="kg kplain" data-a="kappt" data-id="' + a.id + '"><span class="knm">' + esc(p.name) + '</span><span class="ksm">' + esc(a.src || 'Reception') + (C().doctors.length > 1 ? ' · ' + esc(CD.doc(a.doc).short) : '') + '</span></button>' + (today ? '<button class="kbtn3" data-a="apArrived" data-id="' + a.id + '">Arrived</button>' : '<span class="kchev">›</span>') + '</div>'; }).join('') + '</div>' : '';
      const later = booked.filter(a => a.date > tmr);
      body = (grp('Today', booked.filter(a => a.date === s.today), true) + grp('Tomorrow', booked.filter(a => a.date === tmr)) + grp('Later', later)) || '<div class="kcard kempty">No appointments booked.</div>';
      body += '<div style="margin-top:14px"><button class="kbtn2" style="width:100%;color:var(--a)" data-a="kbook">+ Book appointment</button></div>';
    }
    return page(top('Inbox') + segB + body);
  };
  A.kib = ds => { UI.f.ib = ds.v; CD.go('reception', ds.v === 'booked' ? 'appt' : (ds.v === 'missed' || ds.v === 'cb') ? 'calls' : 'inbox', {}, true); };
  A.kappt = ds => CD.modal(() => { const a = C().appts.find(x => x.id === ds.id); if (!a) return sheetHead('Appointment', 'Close') + '<div class="kempty">Not found.</div>'; const p = CD.P(a.pid) || {};
    return sheetHead(esc(p.name || 'Appointment'), 'Close') + '<div class="kcard kpad"><div class="knm">' + CD.day(a.date) + ' · ' + CD.tShort(a.time) + '</div><div class="ksm">' + esc(a.src || '') + (p.phone ? ' · ' + esc(CD.phoneFmt(p.phone)) : '') + '</div></div>' +
      '<div class="kcard">' + (a.date === S().today ? '<button class="krow" data-a="apArrived" data-id="' + a.id + '"><span class="kg"><span class="knm">Mark arrived</span><span class="ksm">Gives a token</span></span><span class="kchev">›</span></button>' : '') + '<button class="krow" data-a="kbook" data-move="' + a.id + '"><span class="kg"><span class="knm">Move to another time</span></span><span class="kchev">›</span></button><button class="krow" data-a="apCancelYes" data-id="' + a.id + '"><span class="kg"><span class="knm" style="color:#B91C1C">Cancel appointment</span><span class="ksm">Patient gets a WhatsApp</span></span><span class="kchev">›</span></button></div>'; });
  /* book appointment */
  A.kbook = ds => {
    const c = C(); const a = ds && ds.move ? c.appts.find(x => x.id === ds.move) : null; const p = a ? CD.P(a.pid) : null;
    UI.f.bk = { pid: a ? a.pid : '', name: p ? p.name : '', phone: p ? p.phone : '', date: S().today, time: '', doc: a ? a.doc : (activeDoc()[0] || c.doctors[0]).id, moving: a ? a.id : '' };
    if (S().clock > 19 * 60) UI.f.bk.date = CD.addDays(S().today, 1);
    CD.modal(bookSheet);
  };
  A.kbk = ds => { UI.f.bk[ds.k] = ds.k === 'time' ? Number(ds.v) : ds.v; if (ds.k !== 'time') UI.f.bk.time = ''; CD.renderModal(); };
  A.kbkSet = (ds, el) => { UI.f.bk[ds.k] = el.value; if (ds.k === 'phone' && el.value.replace(/\D/g, '').length === 10) { const p = C().patients.find(x => x.phone === el.value.replace(/\D/g, '') && !x.merged); if (p) { UI.f.bk.pid = p.id; UI.f.bk.name = p.name; CD.renderModal(); } } };
  function bookSheet() {
    const bk = UI.f.bk, c = C(), s = S(); const d = CD.doc(bk.doc);
    const days = []; for (let i = 0; i < 9 && days.length < 6; i++) { const dt = CD.addDays(s.today, i); if (CD.dow(dt) !== 0) days.push(dt); }
    const leave = c.leaves.some(l => l.doc === d.id && l.date === bk.date);
    const taken = new Set(c.appts.filter(a => a.date === bk.date && a.doc === d.id && a.id !== bk.moving).map(a => a.time));
    const slots = []; for (let m = Math.ceil((d.from || 600) / 15) * 15; m < (d.to || 1200); m += 15) if (!taken.has(m) && (bk.date !== s.today || m > s.clock)) slots.push(m);
    return sheetHead(bk.moving ? 'Move appointment' : 'Book appointment') +
      (bk.pid ? '<div class="kcard kpad"><div class="knm">' + esc(bk.name) + '</div><div class="ksm">' + esc(CD.phoneFmt(bk.phone)) + '</div></div>' : '<div class="kfld"><div class="kfl"><label>Mobile</label><input data-ai="kbkSet" data-k="phone" inputmode="numeric" maxlength="10" value="' + esc(bk.phone) + '" placeholder="10-digit number"></div><div class="kfl"><label>Name</label><input data-ai="kbkSet" data-k="name" value="' + esc(bk.name) + '" placeholder="Full name"></div></div>') +
      (c.doctors.length > 1 ? '<div class="klbl">Doctor</div><div class="kchips">' + c.doctors.map(x => '<button class="kchip' + (x.id === bk.doc ? ' on' : '') + '" data-a="kbk" data-k="doc" data-v="' + x.id + '">' + esc(x.short) + '</button>').join('') + '</div>' : '') +
      '<div class="klbl">Day</div><div class="kchips">' + days.map(dt => '<button class="kchip' + (dt === bk.date ? ' on' : '') + '" data-a="kbk" data-k="date" data-v="' + dt + '">' + (dt === s.today ? 'Today' : dt === CD.addDays(s.today, 1) ? 'Tomorrow' : CD.day(dt).slice(0, 6)) + '</button>').join('') + '</div>' +
      '<div class="klbl">Time</div>' + (leave ? '<div class="kwarn">' + esc(d.short) + ' is on leave that day.</div>' : slots.length ? '<div class="kchips">' + slots.slice(0, 24).map(m => '<button class="kchip' + (m === bk.time ? ' on' : '') + '" data-a="kbk" data-k="time" data-v="' + m + '">' + CD.tShort(m) + '</button>').join('') + '</div>' : '<div class="kempty">No free time left that day.</div>') +
      '<div id="bk-err" class="kerr"></div><button class="kbtn" data-a="bkSave"' + (leave ? ' disabled' : '') + '>' + (bk.time ? (bk.moving ? 'Move to ' : 'Book ') + (bk.date === s.today ? 'today' : CD.day(bk.date)) + ' · ' + CD.tShort(bk.time) : 'Pick a time') + '</button><div class="ksm" style="text-align:center">Patient gets the booking on WhatsApp</div>';
  }

  /* ---------- Patients ---------- */
  RS.patients = function () {
    const c = C(); const all = c.patients.filter(p => !p.merged);
    const dupN = (() => { const seen = {}; let n = 0; all.forEach(p => { if (seen[p.phone]) n++; else seen[p.phone] = 1; }); return n; })();
    return page(top('Patients') + '<label class="ksearch">' + I.search + '<input data-f="pq" data-u="kplist" value="' + esc(UI.f.pq || '') + '" placeholder="Name or phone" autocomplete="off"></label>' +
      (dupN ? '<button class="kcard kpad kplain" style="width:100%;display:flex;gap:10px;align-items:center;margin-bottom:4px;background:#FFFBEB;border-color:#FDE68A" data-a="kdups"><span class="kg"><span class="knm" style="font-size:15px">' + dupN + ' possible duplicate' + (dupN > 1 ? 's' : '') + '</span><span class="ksm">Same phone number, two names · tap to merge</span></span><span class="kchev">›</span></button>' : '') +
      CD.region('kplist'));
  };
  A.kdups = () => CD.modal(() => { const seen = {}, dups = []; C().patients.filter(p => !p.merged).forEach(p => { if (seen[p.phone]) dups.push([seen[p.phone], p]); else seen[p.phone] = p; });
    return sheetHead('Possible duplicates', 'Close') + (dups.length ? '<div class="kcard">' + dups.map(([a, b]) => '<div class="krow"><div class="kg"><div class="knm">' + esc(a.name) + ' & ' + esc(b.name) + '</div><div class="ksm">Same phone ' + esc(CD.phoneFmt(a.phone)) + '</div></div><button class="kbtn3" data-a="merge" data-a1="' + a.id + '" data-b1="' + b.id + '">Merge</button></div>').join('') + '</div><div class="ksm" style="text-align:center">Merging keeps all visits, bills and prescriptions under one name</div>' : '<div class="kcard kempty">No duplicates left ✓</div>'); });
  R.kplist = () => {
    const c = C(); const q = (UI.f.pq || '').trim().toLowerCase(); const dig = q.replace(/\D/g, '');
    let list = c.patients.filter(p => !p.merged);
    const total = list.length;
    if (q.length >= 2) list = list.filter(p => p.name.toLowerCase().includes(q) || (dig.length >= 3 && p.phone.includes(dig)) || (p.problem || '').toLowerCase().includes(q));
    const lastOf = {}, cnt = {}; c.visits.forEach(v => { cnt[v.pid] = (cnt[v.pid] || 0) + 1; if (!lastOf[v.pid] || v.date > lastOf[v.pid].date) lastOf[v.pid] = v; });
    list = list.slice().sort((a, b) => ((lastOf[b.id] || {}).date || '') < ((lastOf[a.id] || {}).date || '') ? -1 : 1).slice(0, 60);
    const fu = {}; c.rx.forEach(r => { if (r.follow && r.follow >= S().today && (!fu[r.pid] || r.follow < fu[r.pid])) fu[r.pid] = r.follow; });
    return sec(q.length >= 2 ? 'Found' : 'Recent', total + ' patients') + (list.length ? '<div class="kcard">' + list.map(p => { const lv = lastOf[p.id];
      return '<button class="krow" data-a="openP" data-id="' + p.id + '"><span class="kg"><span class="knm">' + esc(p.name) + '</span><span class="ksm">' + (lv ? CD.rel(lv.date) : 'No visits yet') + ' · ' + (cnt[p.id] || 0) + ' visit' + ((cnt[p.id] || 0) === 1 ? '' : 's') + '</span></span>' + (fu[p.id] ? '<span class="ksm" style="margin:0 2px 0 0">Follow-up ' + CD.d(fu[p.id]) + '</span>' : '') + '<span class="kchev">›</span></button>'; }).join('') + '</div>' : '<div class="kcard kempty">No one found. <button class="klink" data-a="knew">Register as new patient</button></div>');
  };

  /* ---------- Money ---------- */
  const NOTES = [500, 200, 100, 50, 20, 10];
  const cashCalc = () => { const t = S().today, c = C(); const bills = c.bills.filter(b => b.date === t); const by = m => bills.filter(b => b.mode === m).reduce((s, b) => s + CD.netOf(b), 0); const petty = (c.expenses || []).filter(x => x.date === t && x.from === 'drawer'); const pt = petty.reduce((s, x) => s + x.amt, 0); const fl = c.float || 0; return { cash: by('Cash'), upi: by('UPI'), card: by('Card'), petty, pt, fl, should: fl + by('Cash') - pt, total: bills.reduce((s, b) => s + CD.netOf(b), 0), n: bills.length }; };
  RS.close = function () {
    const c = C(), s = S(); const k = cashCalc(); const closed = s.dayClosed[c.id]; const cd = c.cashDays.find(x => x.date === s.today);
    return page(top('Money', '<span class="ksm" style="margin-bottom:6px">' + CD.day(s.today) + '</span>') +
      '<div class="kcard kpad"><div class="ksm" style="margin:0">Collected today</div><div class="kbig" style="margin:6px 0 10px">' + rs(k.total) + '</div><div style="display:flex;gap:8px">' +
      [['Cash', k.cash], ['UPI', k.upi], ['Card', k.card]].map(([a, b]) => '<div class="kmini"><div class="ksm" style="margin:0">' + a + '</div><div style="font-weight:700" class="kmono">' + rs(b) + '</div></div>').join('') + '</div></div>' +
      sec('Cash in drawer') + '<div class="kcard">' +
      '<div class="krow"><div class="kg">Opening cash</div><span class="kmono">' + rs(k.fl) + '</span></div>' +
      '<div class="krow"><div class="kg">+ Cash taken</div><span class="kmono">' + rs(k.cash) + '</span></div>' +
      '<div class="krow"><div class="kg">− Taken out' + (k.petty.length ? '<span class="ksm">' + esc(k.petty.map(x => x.what.split(' ')[0] + ' ' + rs(x.amt)).join(' · ')) + '</span>' : '') + '</div><span class="kmono">' + (k.pt ? '−' + rs(k.pt) : rs(0)) + '</span></div>' +
      '<div class="krow"><div class="kg" style="font-weight:700">Should be in drawer</div><span class="kmono" style="font-weight:700">' + rs(k.should) + '</span></div></div>' +
      '<div style="display:flex;gap:10px;margin-top:12px"><button class="kbtn2" style="flex:1" data-a="kpetty">− Took money out</button><button class="kbtn2" style="flex:1" data-a="kbills">Bills today · ' + k.n + '</button></div>' +
      (closed ? '<div class="kcard kpad" style="margin-top:12px;background:#E8F7EE;border-color:#A7E3C0"><div class="knm" style="color:#15803D">Day closed at ' + CD.t(closed) + ' ✓</div><div class="ksm">' + (cd ? 'Counted ' + rs(cd.counted) + (cd.diff ? ' · ' + (cd.diff < 0 ? 'short ' : 'extra ') + rs(Math.abs(cd.diff)) : ' · matched') + ' · hand over ' + rs(cd.handed) : '') + '</div><div style="display:flex;gap:10px;margin-top:10px"><button class="kbtn2" style="flex:1" data-a="printDay">Print day report</button><button class="kbtn2" style="flex:1" data-a="reopenDay">Reopen</button></div></div>'
        : '<div style="margin-top:12px"><button class="kbtn" data-a="kclose">Close the day</button></div><div class="ksm" style="text-align:center;margin-top:8px">Count the notes, hand over, owner gets a WhatsApp summary</div>'));
  };
  A.kpetty = () => { UI.f.pt = { amt: '', what: 'Tea and snacks' }; CD.modal(() => sheetHead('Took money out') + '<div class="kfld"><div class="kfl"><label>Amount</label><input data-ai="ptSet" data-k="amt" inputmode="numeric" value="' + esc(UI.f.pt.amt) + '" placeholder="₹"></div></div><div class="klbl">For what</div><div class="kchips">' + ['Tea and snacks', 'Courier', 'Cleaning', 'Stationery', 'Medicine stock', 'Other'].map(w => '<button class="kchip' + (UI.f.pt.what === w ? ' on' : '') + '" data-a="kptw" data-v="' + w + '">' + w + '</button>').join('') + '</div><button class="kbtn" data-a="ptSave">Save · comes out of the drawer</button><div class="ksm" style="text-align:center">The owner sees every entry</div>'); };
  A.kptw = ds => { UI.f.pt.what = ds.v; CD.renderModal(); };
  A.kbills = () => CD.modal(() => { const bills = C().bills.filter(b => b.date === S().today).slice().sort((a, b) => b.time - a.time);
    return sheetHead('Bills today', 'Close') + (bills.length ? '<div class="kcard">' + bills.map(b => { const p = CD.P(b.pid) || {}; return '<button class="krow" data-a="kbill" data-no="' + esc(b.no) + '"><span class="kg"><span class="knm">' + esc(p.name || '') + '</span><span class="ksm">' + esc(b.no) + ' · ' + CD.tShort(b.time) + ' · ' + esc(b.mode) + (b.refund ? ' · refunded ' + rs(b.refund.amt) : '') + '</span></span><span class="kmono" style="font-weight:600' + (b.refund ? ';text-decoration:line-through;color:#9CA3AF' : '') + '">' + rs(b.total) + '</span><span class="kchev">›</span></button>'; }).join('') + '</div>' : '<div class="kcard kempty">No bills yet today.</div>') +
      '<button class="kbtn2" style="width:100%" data-a="nav" data-v="bills">Older bills</button>'; });
  A.kbill = ds => { UI.f.rf = null; CD.modal(() => { const c = C(); const b = c.bills.find(x => x.no === ds.no); const p = CD.P(b.pid) || {};
    const rf = UI.f.rf;
    if (rf) return sheetHead('Refund ' + esc(b.no)) + '<div class="kfld"><div class="kfl"><label>Amount</label><input data-ai="krfSet" data-k="amt" inputmode="numeric" value="' + esc(rf.amt) + '"></div></div><div class="klbl">Why</div><div class="kchips">' + ['Left before seeing the doctor', 'Charged twice', 'Wrong amount', 'Procedure not done', 'Doctor said no charge'].map(w => '<button class="kchip' + (rf.why === w ? ' on' : '') + '" data-a="krfw" data-v="' + esc(w) + '">' + w + '</button>').join('') + '</div><button class="kbtn" style="background:#B91C1C" data-a="rfDo" data-no="' + esc(b.no) + '">Refund</button><div class="ksm" style="text-align:center">The owner sees who refunded and why</div>';
    return sheetHead(esc(b.no), 'Close') + '<div class="kcard kpad"><div class="knm">' + esc(p.name || '') + '</div><div class="ksm">' + CD.day(b.date) + ' · ' + CD.tShort(b.time) + ' · ' + esc(b.mode) + (b.by ? ' · by ' + esc(b.by) : '') + '</div></div><div class="kfld">' + b.items.map(it => '<div class="kfl"><span class="v">' + esc(it.n) + '</span><span class="kmono">' + rs(it.amt) + '</span></div>').join('') + (b.discount ? '<div class="kfl"><span class="v">Discount</span><span class="kmono">−' + rs(b.discount) + '</span></div>' : '') + '</div>' +
      '<div class="ktot"><span>Total</span><b class="kmono">' + rs(b.total) + '</b></div>' + (b.refund ? '<div class="kwarn" style="margin:0">Refunded ' + rs(b.refund.amt) + ' · ' + esc(b.refund.reason) + '</div>' : '') +
      '<div style="display:flex;gap:10px"><button class="kbtn2" style="flex:1" data-a="printBill" data-no="' + esc(b.no) + '">Print receipt</button>' + (c.perms.editBill ? '<button class="kbtn2" style="flex:1" data-a="changeMode" data-no="' + esc(b.no) + '">Change mode</button>' : '') + '</div>' +
      (!b.refund && c.perms.refund !== false ? '<button class="kbtn2" style="width:100%;color:#B91C1C" data-a="krfStart" data-no="' + esc(b.no) + '">Refund</button>' : ''); }); };
  A.krfStart = ds => { const b = C().bills.find(x => x.no === ds.no); UI.f.rf = { amt: String(b.total), why: '' }; CD.renderModal(); };
  A.krfSet = (ds, el) => { UI.f.rf[ds.k] = el.value; };
  A.krfw = ds => { UI.f.rf.why = ds.v; CD.renderModal(); };
  A.kclose = () => { NOTES.forEach(n => { UI.f['n' + n] = UI.f['n' + n] || ''; }); UI.f.coins = UI.f.coins || ''; UI.f.cnote = UI.f.cnote || ''; CD.modal(closeSheet); };
  function closeSheet() {
    return sheetHead('Close the day') + '<div class="ksm" style="margin:-6px 2px 0">Count the notes in the drawer</div><div class="kfld">' + NOTES.map(n => '<div class="kfl"><label>₹' + n + ' ×</label><input data-f="n' + n + '" data-u="kcnt" inputmode="numeric" value="' + esc(UI.f['n' + n]) + '" placeholder="0"></div>').join('') + '<div class="kfl"><label>Coins ₹</label><input data-f="coins" data-u="kcnt" inputmode="numeric" value="' + esc(UI.f.coins) + '" placeholder="0"></div></div>' + CD.region('kcnt');
  }
  R.kcnt = () => {
    const k = cashCalc(); let tot = Number(UI.f.coins) || 0; NOTES.forEach(n => { tot += (Number(UI.f['n' + n]) || 0) * n; }); const diff = tot - k.should;
    const col = diff === 0 ? '#15803D' : '#B91C1C';
    return '<div class="kcard"><div class="krow"><div class="kg">Counted</div><b class="kmono">' + rs(tot) + '</b></div><div class="krow"><div class="kg">Should be</div><span class="kmono">' + rs(k.should) + '</span></div><div class="krow"><div class="kg" style="font-weight:700;color:' + col + '">' + (diff === 0 ? 'Matched ✓' : diff < 0 ? 'Short' : 'Extra') + '</div><b class="kmono" style="color:' + col + '">' + (diff === 0 ? '' : rs(Math.abs(diff))) + '</b></div></div>' +
      (diff !== 0 ? '<div class="kfld" style="margin-top:12px"><div class="kfl"><label>Why?</label><input data-f="cnote" value="' + esc(UI.f.cnote) + '" placeholder="The owner will see this"></div></div>' : '') +
      '<button class="kbtn" style="margin-top:12px" data-a="closeDay">Close day · hand over ' + rs(Math.max(0, tot - k.fl)) + '</button>';
  };

  /* ====================================================================================
     DOCTOR
     ==================================================================================== */
  const DS = CD.apps.doctor.screens;
  DS.home = function () {
    const c = C(), s = S(), d = myDoc();
    const cab = CD.inCabin(d.id), wait = CD.waiting(d.id); const nv = cab || wait[0]; const p = nv && CD.P(nv.pid);
    let warn = '';
    if (d.status === 'out' && d.out) warn = '<div class="kwarn"><b>' + (s.clock >= d.out.until ? 'Your break is over — are you back?' : 'You stepped out · back by ' + CD.t(d.out.until)) + '</b><br>' + d.out.told + ' waiting patients were told.<div style="display:flex;gap:10px;margin-top:10px"><button class="kbtn" style="height:42px;flex:1" data-a="imBack">I\'m back</button><button class="kbtn2" style="flex:1" data-a="outMore">15 more min</button></div></div>';
    let card;
    if (nv) {
      const last = c.rx.filter(r => r.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1)[0];
      const prev = c.visits.filter(v => v.pid === p.id && v.date < s.today).length;
      const ord = n => n + (n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
      card = '<div class="kcard" style="overflow:hidden"><div class="kpad kcol"><div style="display:flex;justify-content:space-between"><span class="ksm" style="margin:0">' + (cab ? 'With you · ' + esc(nv.tok.replace('-', '')) + ' · ' + Math.max(1, s.clock - (nv.started || s.clock)) + ' min' : 'Next · ' + esc(nv.tok.replace('-', '')) + ' · waiting ' + Math.max(1, s.clock - nv.time) + ' min') + '</span><span class="ktag" style="background:' + (prev ? '#E8F6EF;color:#0F8A5F' : '#EFF5FF;color:#2563EB') + '">' + (prev ? ord(prev + 1) + ' visit' : 'New') + '</span></div>' +
        '<div class="knm" style="font-size:22px">' + esc(p.name) + '</div><div class="ksm" style="margin:0">' + esc([ageSex(p), p.wt ? p.wt + ' kg' : '', 'Allergy: ' + ((p.allergies || '').replace(/None told/i, 'none') || 'none')].filter(Boolean).join(' · ')) + '</div>' +
        (p.words || last ? '<div class="kquote">' + (p.words ? '<b>Says:</b> "' + esc(String(p.words).replace(/^["“]+|["”]+$/g, '')) + '"' : '') + (last ? (p.words ? '<br>' : '') + '<span class="ksm" style="display:inline">Last visit ' + CD.d(last.date) + ': ' + esc(last.finding || '') + (last.meds.length ? ' · ' + esc(last.meds.slice(0, 2).map(m => m.n.split(/[ ·]/)[0].toLowerCase().replace(/^\w/, x => x.toUpperCase())).join(', ')) : '') + '</span>' : '') + '</div>' : '') +
        '<div style="display:flex;gap:10px"><button class="kbtn" style="flex:1.4" data-a="startConsult"' + (cab ? '' : ' data-tok="' + nv.tok + '"') + '>' + (cab ? 'Write prescription' : 'Call in & start') + '</button>' + (last ? '<button class="kbtn2" style="flex:1" data-a="krepeat" data-tok="' + nv.tok + '" data-id="' + last.id + '">Repeat last</button>' : '<button class="kbtn2" style="flex:1" data-a="nav" data-v="patient" data-p=\'' + J({ id: p.id }) + '\'>History</button>') + '</div></div></div>';
    } else card = '<div class="kcard kpad kcol"><div class="knm" style="font-size:18px">No one is waiting for you.</div><button class="kbtn2" data-a="walkIn">Write a prescription for someone</button></div>';
    const rest = cab ? wait : wait.slice(1);
    const rows = rest.map(v => { const q = CD.P(v.pid); const prev = c.visits.some(x => x.pid === q.id && x.date < s.today); return '<button class="krow" data-a="nav" data-v="patient" data-p=\'' + J({ id: q.id }) + '\'><span class="ktk">' + esc(v.tok.replace('-', '')) + '</span><span class="kg"><span class="knm">' + esc(q.name) + '</span><span class="ksm">' + esc([ageSex(q), q.problem].filter(Boolean).join(' · ')) + '</span></span><span class="ktag" style="background:' + (prev ? '#F3F4F6;color:#374151' : '#EFF5FF;color:#2563EB') + '">' + (prev ? 'Follow' : 'New') + '</span></button>'; }).join('');
    return page(top('Today', '<button class="kdots" style="background:#E8F6EF;color:#0F8A5F" data-a="kmenu">' + esc(ini(d.name.replace(/^Dr\.?\s*/, ''))) + '</button>', d.name) + pills(d) + warn + card +
      sec('Next', rest.length + ' waiting · ~' + rest.length * 7 + ' min') + (rows ? '<div class="kcard">' + rows + '</div>' : '') +
      (d.status === 'in' ? '<div style="margin-top:12px"><button class="kbtn2" style="width:100%" data-a="kaway" data-id="' + d.id + '">Step out for a while</button></div>' : ''));
  };
  A.krepeat = ds => { A.startConsult({ tok: ds.tok }); if (A.repeatRx) A.repeatRx({ id: ds.id }); };

  /* prescription (D2) — same fields the old consult used, so Finish / Print / Save as set keep working */
  DS.consult = function () {
    const c = C(), s = S();
    const v = UI.prm.tok ? CD.todays().find(x => x.tok === UI.prm.tok) : null;
    const p = CD.P(v ? v.pid : UI.prm.pid);
    if (!p) return page(topBack(['Today', 'home'], 'Patient not found'));
    const f = UI.f;
    if (f.init !== 1) { f.init = 1; f.finding = ''; f.meds = []; f.advice = ''; f.follow = '28'; f.set = ''; f.wt = p.wt || ''; f.bp = ''; f.tests = ''; }
    const fdate = n => { let dt = CD.addDays(s.today, n); if (CD.dow(dt) === 0) dt = CD.addDays(dt, 1); return dt; };
    const follow = [['7', '7 days'], ['14', '15 days'], ['28', '1 month'], ['0', 'Only if needed']];
    return page(topBack(['Today', 'home'], esc(p.name) + (v ? ' · ' + esc(v.tok.replace('-', '')) : ''), '<span class="ksm" style="margin-bottom:4px">' + esc(ageSex(p)) + '</span>') +
      '<div class="kfld"><div class="kfl"><label>Weight</label><input data-f="wt" inputmode="decimal" value="' + esc(f.wt) + '" placeholder="kg" style="width:60px;flex:1"><label style="width:30px">BP</label><input data-f="bp" value="' + esc(f.bp) + '" placeholder="120/80" style="flex:1"></div>' +
      '<div class="kfl"><label>Finding</label><input data-f="finding" value="' + esc(f.finding) + '" placeholder="What you found"></div>' +
      '<div class="kfl"><label>Tests</label><input data-f="tests" value="' + esc(f.tests) + '" placeholder="Optional · CBC, Vit D"></div></div>' +
      '<div class="klbl" style="margin-top:12px;margin-bottom:6px">Quick sets</div><div class="kchips">' + c.sets.slice().sort((a, b) => b.used - a.used).slice(0, 8).map(st => '<button class="kchip' + (f.set === st.id ? ' on' : '') + '" data-a="useSet" data-id="' + st.id + '">' + esc(st.n) + '</button>').join('') + '<button class="kchip" data-a="saveAsSet">+ Save as set</button></div>' +
      '<div class="ksec" style="margin-top:14px">Medicines <button class="klink" data-a="kmedAdd" style="font-size:13px">+ Add</button></div>' + CD.region('kmeds') +
      '<div class="kfld" style="margin-top:10px"><div class="kfl"><label>Advice</label><input data-f="advice" value="' + esc(f.advice) + '" placeholder="Wash face twice a day…"></div></div>' +
      '<div class="klbl" style="margin-top:12px;margin-bottom:6px">Come back</div><div class="kchips">' + follow.map(([n, l]) => '<button class="kchip' + (String(f.follow) === n ? ' on' : '') + '" data-a="kfollow" data-v="' + n + '">' + l + (String(f.follow) === n && n !== '0' ? ' · ' + CD.day(fdate(Number(n))) : '') + '</button>').join('') + '</div>' +
      '<div id="rx-err" class="kerr" style="margin-top:8px"></div><div style="display:flex;gap:10px;margin-top:14px"><button class="kbtn2" style="flex:1" data-a="printRx">Print</button><button class="kbtn" style="flex:2.2" data-a="finishRx">Finish · send on WhatsApp</button></div>');
  };
  R.kmeds = () => { const meds = UI.f.meds || []; return '<div class="kfld">' + (meds.length ? meds.map((m, i) => '<div class="kfl" style="padding:8px 14px;align-items:flex-start"><div class="kg"><input data-ai="medSet" data-i="' + i + '" data-k="n" value="' + esc(m.n) + '" placeholder="Medicine" style="height:26px;font-weight:600;font-size:15px;width:100%"><input data-ai="medSet" data-i="' + i + '" data-k="how" value="' + esc(m.how) + '" placeholder="How to take it" style="height:22px;font-size:13px;color:#6B7280;font-weight:400;width:100%"></div><button class="kchev" style="border:0;background:none;font-size:18px" data-a="kmedRm" data-i="' + i + '" aria-label="Remove">×</button></div>').join('') : '<div class="kempty">Tap a quick set, or + Add</div>') + '</div>'; };
  const syncF = () => document.querySelectorAll('[data-f]').forEach(el => { if (el.dataset.f && el.type !== 'checkbox') UI.f[el.dataset.f] = el.value; });
  A.kmedAdd = () => { (UI.f.meds = UI.f.meds || []).push({ n: '', how: '' }); CD.upd('kmeds'); const ins = document.querySelectorAll('#rg-kmeds input[data-k=n]'); if (ins.length) ins[ins.length - 1].focus(); };
  A.kmedRm = ds => { UI.f.meds.splice(Number(ds.i), 1); CD.upd('kmeds'); };
  A.kfollow = ds => { syncF(); UI.f.follow = ds.v; CD.render(); };
  A.useSet = ds => { syncF(); const st = C().sets.find(x => x.id === ds.id); if (!st) return; UI.f.set = st.id; UI.f.meds = st.meds.map(m => Object.assign({}, m)); if (!(UI.f.finding || '').trim()) UI.f.finding = st.n.replace(' · ', ', '); CD.render(); };

  DS.more = function () {
    const c = C(), d = myDoc(), s = S(); const lv = c.leaves.filter(l => l.doc === d.id && l.date >= s.today).sort((a, b) => a.date < b.date ? -1 : 1);
    const row = (scr, t, sub, a) => '<button class="krow" data-a="' + (a || 'nav') + '" data-v="' + scr + '"><span class="kg"><span class="knm">' + t + '</span><span class="ksm">' + sub + '</span></span><span class="kchev">›</span></button>';
    return page(top('More', '<button class="kdots" style="background:#E8F6EF;color:#0F8A5F" data-a="kmenu">' + esc(ini(d.name.replace(/^Dr\.?\s*/, ''))) + '</button>', d.name) + '<div class="kcard">' +
      row('', 'Write a prescription', 'For a walk-in or phone patient', 'walkIn') + row('today', 'Waiting list', CD.waiting(d.id).length + ' waiting now') +
      (c.boxes.d_sets ? row('sets', 'My medicine sets', c.sets.length + ' ready sets') : '') + row('leave', 'Timings and leave', lv.length ? 'Next leave: ' + CD.day(lv[0].date) : CD.tShort(d.from) + ' – ' + CD.tShort(d.to) + ' · no leave planned') +
      row('search', 'Search patients', 'Name, phone or problem') + row('photos', 'Before / after photos', 'Progress photos') + row('earn', 'My earnings', 'Today and this month') + row('letter', 'Letterhead', 'Name, degree, registration on the prescription') + '</div>');
  };

  /* ====================================================================================
     OWNER
     ==================================================================================== */
  const OS = CD.apps.owner.screens;
  OS.home = function () {
    const c = C(), s = S();
    const net = (a, b) => c.bills.filter(x => x.date >= a && x.date <= b).reduce((t, x) => t + CD.netOf(x), 0);
    const today = net(s.today, s.today), lw = net(CD.addDays(s.today, -7), CD.addDays(s.today, -7)), diff = today - lw;
    const tv = CD.todays(); const seen = tv.filter(v => v.status === 'done').length; const nw = tv.filter(v => v.kind === 'new').length;
    const fromWa = tv.filter(v => { const p = CD.P(v.pid); return p && /WhatsApp|Missed/.test(p.source); }).length;
    const days = []; for (let i = 6; i >= 0; i--) { const dd = CD.addDays(s.today, -i); days.push([dd, net(dd, dd)]); }
    const mx = Math.max(1, ...days.map(x => x[1]));
    const alerts = [];
    c.cashDays.filter(x => x.diff !== 0 && !x.checked).forEach(x => alerts.push(['!', '#FEE2E2', '#B91C1C', 'Cash ' + (x.diff < 0 ? 'short ' : 'extra ') + rs(Math.abs(x.diff)) + ' ' + CD.rel(x.date).toLowerCase(), x.note ? x.by + ': "' + x.note + '"' : 'No reason written', 'cash']));
    const ch = c.log.filter(l => l.date === s.today);
    if (ch.length) alerts.push(['₹', '#FEF3C7', '#92400E', ch.length + ' bill change' + (ch.length > 1 ? 's' : '') + ' today', ch[0].what + ' · by ' + ch[0].who, 'staff']);
    const refDue = c.refs.filter(r => !r.paid).reduce((x, r) => x + r.amt, 0);
    if (refDue) alerts.push(['⇄', '#EEF0F5', '#1F2A44', rs(refDue) + ' referral payouts due', 'Pay doctors who sent patients', 'refs']);
    const fuLate = c.patients.filter(p => { const r = c.rx.filter(x => x.pid === p.id && x.follow).sort((a, b) => a.date < b.date ? 1 : -1)[0]; return r && r.follow < s.today && !c.visits.some(v => v.pid === p.id && v.date >= r.follow); }).length;
    const wait = tv.filter(v => v.status === 'waiting').length;
    const own = (S().me && S().me.name) || ((c.staff.find(x => x.role === 'Owner') || {}).name) || 'Owner';
    return page(top('Today', '<button class="kdots" style="background:#EEF0F5;color:#1F2A44" data-a="kmenu">' + esc(ini(own)) + '</button>') +
      '<div class="kcard kpad"><div class="ksm" style="margin:0">Earned today so far</div><div style="display:flex;align-items:baseline;gap:10px;margin:6px 0 4px;flex-wrap:wrap"><span class="kbig kmono">' + rs(today) + '</span>' + (lw ? '<span class="ktag" style="background:' + (diff >= 0 ? '#E8F7EE;color:#15803D' : '#FEE2E2;color:#B91C1C') + '">' + (diff >= 0 ? '↑ ' : '↓ ') + rs(Math.abs(diff)) + ' vs last ' + CD.day(s.today).slice(0, 3) + '</span>' : '') + '</div>' +
      '<div class="ksm">' + seen + ' patients · ' + nw + ' new · ' + fromWa + ' came from WhatsApp</div>' +
      '<div class="kbars">' + days.map(([dd, v], i) => '<div><i style="height:' + Math.max(3, Math.round(v / mx * 44)) + 'px;' + (i === 6 ? 'background:#1F2A44' : '') + '"></i><span>' + CD.day(dd).slice(0, 1) + '</span></div>').join('') + '</div></div>' +
      sec('Needs you', alerts.length || '') + (alerts.length ? '<div class="kcard">' + alerts.map(([ic, bg, fg, t, sub, scr]) => '<button class="krow" data-a="nav" data-v="' + scr + '"><span class="kic" style="background:' + bg + ';color:' + fg + '">' + ic + '</span><span class="kg"><span class="knm" style="font-size:15px">' + esc(t) + '</span><span class="ksm">' + esc(sub) + '</span></span><span class="kchev">›</span></button>').join('') + '</div>' : '<div class="kcard kempty">Nothing needs you right now ✓</div>') +
      sec('Right now') + '<div class="kcard">' + c.doctors.map(d => '<div class="krow"><div class="kg">' + esc(d.short) + '</div><span class="kst">' + dot(d.status === 'in' ? G : d.status === 'out' ? RD : GR) + (d.status === 'in' ? 'In clinic' + (CD.inCabin(d.id) ? ' · ' + CD.inCabin(d.id).tok.replace('-', '') : '') : d.status === 'out' ? 'Away' : d.status === 'later' ? 'From ' + CD.tShort(d.from) : 'Off today') + '</span></div>').join('') +
      '<div class="krow"><div class="kg">Waiting</div><span class="kmono" style="font-weight:600">' + wait + ' · ~' + wait * 7 + ' min</span></div>' +
      '<button class="krow" data-a="nav" data-v="growth"><div class="kg">Follow-ups overdue</div><span class="klink">' + fuLate + ' ›</span></button></div>');
  };
  OS.staff = function () {
    const c = C(), s = S(); const perms = c.perms;
    const ROLEC = { Owner: ['#EEF0F5', '#1F2A44'], Doctor: ['#E8F6EF', '#0F8A5F'], Reception: ['#EFF5FF', '#2563EB'] };
    const me = S().me && S().me.role === 'owner' ? [{ name: S().me.name, role: 'Owner', phone: S().me.phone || '' }] : (c.staff.some(x => x.role === 'Owner') ? [] : [{ name: 'Owner (you)', role: 'Owner', phone: '' }]);
    const ppl = me.concat(c.doctors.map(d => ({ name: d.name, role: 'Doctor', phone: d.phone || '' }))).concat(c.staff.map(x => ({ name: x.name, role: x.role || 'Reception', phone: x.phone || '' })));
    const nk = n => String(n || '').toLowerCase().replace(/^dr\.?\s*/, '').trim(); const people0 = []; ppl.forEach(x => { const k = nk(x.name); const dup = people0.find(y => nk(y.name) === k || nk(y.name).startsWith(k + ' ') || k.startsWith(nk(y.name) + ' ')); if (dup) { if (!dup.phone && x.phone) dup.phone = x.phone; } else people0.push(Object.assign({}, x)); }); const people = people0.sort((a, b) => (a.role === 'Owner' ? -1 : b.role === 'Owner' ? 1 : 0));
    const P = [['discount', 'Give discounts', 'Off: only the doctor can'], ['refund', 'Refund money', 'Reason is always asked'], ['editBill', 'Change a bill after paid', 'Every change shows here'], ['money', 'See money reports', 'Month totals and profit']];
    const ch = c.log.filter(l => l.date === s.today);
    return page(top('Staff') + '<div class="kcard">' + people.map(x => { const col = ROLEC[x.role] || ROLEC.Reception; return '<div class="krow"><span class="kav" style="background:' + col[0] + ';color:' + col[1] + '">' + esc(ini(x.name.replace(/^Dr\.?\s*/, ''))) + '</span><div class="kg"><div class="knm">' + esc(x.name) + '</div><div class="ksm">' + esc(x.role) + (x.phone ? ' · ' + esc(CD.phoneFmt(x.phone)) : '') + '</div></div></div>'; }).join('') +
      '<button class="krow" data-a="kstaffAdd" style="color:var(--a);font-weight:600"><span style="width:38px;text-align:center;font-size:22px">+</span>Add staff</button></div>' +
      sec('What reception can do') + '<div class="kcard">' + P.map(([k, t, sub]) => '<div class="krow"><div class="kg"><div style="font-weight:500">' + t + '</div><div class="ksm">' + sub + '</div></div><button class="ktgl' + (perms[k] ? '' : ' off') + '" data-a="togglePerm" data-k="' + k + '" role="switch" aria-checked="' + !!perms[k] + '" aria-label="' + t + '"></button></div>').join('') + '</div>' +
      sec('Changes today', ch.length || '') + (ch.length ? '<div class="kcard">' + ch.slice().reverse().map(l => '<div class="krow"><div class="kg"><div style="font-weight:500">' + esc(l.what) + '</div><div class="ksm">' + esc(l.who) + ' · ' + CD.tShort(l.time) + (l.why ? ' · "' + esc(l.why) + '"' : '') + '</div></div></div>').join('') + '</div>' : '<div class="kcard kempty">No bill changes today ✓</div>'));
  };
  A.kstaffAdd = () => { UI.f.ns = { name: '', phone: '', role: 'Reception' }; CD.modal(() => sheetHead('Add staff') + '<div class="kfld"><div class="kfl"><label>Name</label><input data-ai="nsSet" data-k="name" value="' + esc(UI.f.ns.name) + '" placeholder="Full name"></div><div class="kfl"><label>Mobile</label><input data-ai="nsSet" data-k="phone" inputmode="numeric" maxlength="10" value="' + esc(UI.f.ns.phone) + '" placeholder="10-digit number"></div></div><div class="klbl">Role</div><div class="kseg">' + ['Reception', 'Doctor'].map(r => '<button class="' + (UI.f.ns.role === r ? 'on' : '') + '" data-a="knsr" data-v="' + r + '">' + r + '</button>').join('') + '</div><button class="kbtn" data-a="nsSave">Add · they log in with this number</button>'); };
  A.knsr = ds => { UI.f.ns.role = ds.v; CD.renderModal(); };
  if (!A.nsSet) A.nsSet = (ds, el) => { UI.f.ns[ds.k] = el.value; };
})();
