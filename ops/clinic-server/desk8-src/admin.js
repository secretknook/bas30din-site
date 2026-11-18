/* Clinic Desk — My clinics (Alok's admin): every clinic is just settings */
(function () {
  'use strict';
  const CD = window.CD, A = CD.A, UI = CD.UI, D = window.CD_DATA;
  const esc = CD.esc;
  const S = () => CD.S;
  const SC = {};
  CD.apps.admin = { screens: SC };
  const COLORS = ['#8A6A1F', '#1F3A68', '#1E5B46', '#0F6B66', '#7A2E4F', '#A3271F'];

  const hdr = () => '<header class="hdr"><span class="serif nm">Clinic Desk</span><span class="who">· My clinics (only you see this)</span><span class="sp"></span><span class="muted">Alok</span></header>';

  SC.home = function () {
    const s = S(); const list = Object.values(s.clinics);
    const W = UI.f.w;
    return hdr() + '<main class="pg" style="max-width:1240px"><div class="flex wrap" style="align-items:flex-start;gap:28px">' +
      '<section style="flex:1 1 440px;display:flex;flex-direction:column;gap:14px"><h1 class="t">My clinics · ' + list.length + '</h1>' +
      list.map(c => { const today = c.visits.filter(v => v.date === s.today).length; return '<div class="card list-card" style="padding:18px 22px"><span class="logo" style="--brand:' + c.color + ';width:44px;height:44px;font-size:21px">' + esc(c.logo) + '</span><div class="grow"><div style="font-size:19px;font-weight:600">' + esc(c.name) + '</div><div class="muted" style="font-size:15px">' + esc(D.TEMPLATES[c.tpl].label) + ' · ' + c.doctors.length + ' doctor' + (c.doctors.length === 1 ? '' : 's') + ' · ' + today + ' patients today<br>desk.bas30din.com/' + esc(c.slug) + '</div></div><span class="badge b-ok">' + esc(c.status) + '</span><button class="ghost sm" data-a="openClinic" data-id="' + c.id + '">Open</button></div>'; }).join('') +
      '<div class="card pad" style="color:#3A4458;font-size:16px"><strong>One code for every clinic.</strong> Each clinic is only a set of settings — name, colour, doctors, timings, fees, treatments, home boxes, language and WhatsApp words. Changing one clinic never touches another, and a fix you make reaches all of them.</div></section>' +
      '<section class="card" style="flex:1.3 1 560px;padding:26px 30px;display:flex;flex-direction:column;gap:16px">' + (W ? wizard() : '<h2 class="t">Add a clinic</h2><div class="muted">About 10 minutes, sitting with the owner. 5 steps.</div><button class="btn big" data-a="wStart">Start</button>') + '</section></div></main>';
  };
  A.openClinic = ds => { S().active = ds.id; CD.go('owner', 'home'); CD.toast('Now showing ' + S().clinics[ds.id].name); };

  const STEPS = ['Start from a ready setup', 'Name, logo and colour', 'Doctors and timings', 'Staff logins', 'WhatsApp number and go live'];
  A.wStart = () => { UI.f.w = { step: 1, tpl: 'dental', name: '', color: COLORS[3], doctors: [{ name: '', spec: '', from: 600, to: 840 }], staff: [{ name: '', role: 'Reception' }], phone: '' }; CD.render(); };
  function wizard() {
    const w = UI.f.w;
    if (w.done) { const c = S().clinics[w.done]; return '<h2 class="t">' + esc(c.name) + ' is live ✓</h2><div class="card pad soft">Their link: <strong>desk.bas30din.com/' + esc(c.slug) + '</strong><br><span class="muted small">Staff got login links on WhatsApp. Patients get the patient page from every message.</span></div><div class="flex wrap"><button class="btn" data-a="openClinic" data-id="' + c.id + '">Open its owner app</button><button class="ghost" data-a="wReset">Add another clinic</button></div>'; }
    const steps = STEPS.map((t, i) => '<div class="flex" style="gap:10px;opacity:' + (i + 1 === w.step ? 1 : .55) + '"><span class="badge ' + (i + 1 < w.step ? 'b-ok' : i + 1 === w.step ? 'b-ink' : 'b-a') + '" style="width:30px;justify-content:center">' + (i + 1 < w.step ? '✓' : i + 1) + '</span><span' + (i + 1 === w.step ? ' style="font-weight:600"' : '') + '>' + t + '</span></div>').join('');
    let body = '';
    if (w.step === 1) body = '<div class="choices">' + Object.entries(D.TEMPLATES).map(([k, t]) => '<button class="choice' + (w.tpl === k ? ' on' : '') + '" data-a="wSet" data-k="tpl" data-v="' + k + '">' + esc(t.label) + '</button>').join('') + '</div><div class="muted small">Fills treatments (' + D.TEMPLATES[w.tpl].treatments.length + '), fees (₹' + D.TEMPLATES[w.tpl].fee + '), Rx sets (' + D.TEMPLATES[w.tpl].sets.length + ') and WhatsApp messages for that kind of clinic. The owner can change anything later.</div>';
    if (w.step === 2) body = '<div><span class="flbl">Clinic name</span><input class="field" value="' + esc(w.name) + '" data-ai="wIn" data-k="name" placeholder="e.g. Smile Dental Care" data-autofocus></div><div><span class="flbl">Colour</span><div class="flex" style="gap:12px">' + COLORS.map(col => '<button aria-label="Colour" data-a="wSet" data-k="color" data-v="' + col + '" style="width:40px;height:40px;border-radius:20px;border:0;background:' + col + ';outline:' + (w.color === col ? '2px solid #16213A' : 'none') + ';outline-offset:3px"></button>').join('') + '</div></div><div class="muted small">Logo: the first letter for now. Upload a real logo later in Clinic settings.</div>';
    if (w.step === 3) body = w.doctors.map((d, i) => '<div style="display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr;gap:10px"><input class="field" value="' + esc(d.name) + '" placeholder="Dr. name" data-ai="wDoc" data-i="' + i + '" data-k="name"><input class="field" value="' + esc(d.spec) + '" placeholder="Speciality" data-ai="wDoc" data-i="' + i + '" data-k="spec">' + tsel(i, 'from', d.from) + tsel(i, 'to', d.to) + '</div>').join('') + '<button class="txt" data-a="wAddDoc">+ Add another doctor</button>';
    if (w.step === 4) body = w.staff.map((st, i) => '<div class="flex" style="gap:10px"><input class="field" value="' + esc(st.name) + '" placeholder="Name" data-ai="wStaff" data-i="' + i + '" data-k="name"><select class="field" style="width:180px" data-ai="wStaff" data-i="' + i + '" data-k="role">' + ['Reception', 'Nurse', 'Manager'].map(r => '<option' + (st.role === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></div>').join('') + '<button class="txt" data-a="wAddStaff">+ Add another person</button><div class="muted small">Owner and doctors get logins automatically.</div>';
    if (w.step === 5) body = '<div><span class="flbl">Clinic WhatsApp number</span><input class="field" inputmode="numeric" maxlength="10" value="' + esc(w.phone) + '" data-ai="wIn" data-k="phone" placeholder="10-digit number"></div><div class="card pad soft small">In the real setup this connects their number to the WhatsApp Business API (the clinic owner logs in to Meta themselves). In the demo, nothing is sent.</div><div class="card pad"><strong>' + esc(w.name) + '</strong> · ' + esc(D.TEMPLATES[w.tpl].label) + '<br><span class="muted small">' + w.doctors.filter(d => d.name.trim()).map(d => esc(d.name)).join(', ') + ' · link: desk.bas30din.com/' + esc(slugify(w.name)) + '</span></div>';
    return '<h2 class="t">Add a clinic</h2><div style="display:flex;flex-direction:column;gap:8px">' + steps + '</div><div class="dash"></div>' + body + '<div id="w-err" class="bad small"></div><div class="flex">' + (w.step > 1 ? '<button class="ghost" data-a="wBack">Back</button>' : '<button class="txt" data-a="wReset">Cancel</button>') + '<span class="grow"></span><button class="btn" data-a="wNext">' + (w.step === 5 ? 'Go live' : 'Next: ' + STEPS[w.step].toLowerCase()) + '</button></div>';
  }
  function tsel(i, k, v) { const o = []; for (let t = 420; t <= 1320; t += 30) o.push(t); return '<select class="field" data-ai="wDoc" data-i="' + i + '" data-k="' + k + '">' + o.map(t => '<option value="' + t + '"' + (t === v ? ' selected' : '') + '>' + CD.tShort(t) + '</option>').join('') + '</select>'; }
  const slugify = n => (n || 'clinic').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'clinic';
  A.wSet = ds => { UI.f.w[ds.k] = ds.v; CD.render(); };
  A.wIn = (ds, el) => { UI.f.w[ds.k] = el.value; };
  A.wDoc = (ds, el) => { UI.f.w.doctors[Number(ds.i)][ds.k] = (ds.k === 'from' || ds.k === 'to') ? Number(el.value) : el.value; };
  A.wStaff = (ds, el) => { UI.f.w.staff[Number(ds.i)][ds.k] = el.value; };
  A.wAddDoc = () => { UI.f.w.doctors.push({ name: '', spec: '', from: 600, to: 840 }); CD.render(); };
  A.wAddStaff = () => { UI.f.w.staff.push({ name: '', role: 'Reception' }); CD.render(); };
  A.wBack = () => { UI.f.w.step--; CD.render(); };
  A.wReset = () => { delete UI.f.w; CD.render(); };
  A.wNext = () => {
    const w = UI.f.w; const err = m => { document.getElementById('w-err').textContent = m; };
    if (w.step === 2 && !w.name.trim()) return err('Write the clinic name.');
    if (w.step === 3 && !w.doctors.some(d => d.name.trim())) return err('Add at least one doctor.');
    if (w.step === 3 && w.doctors.some(d => d.name.trim() && d.to <= d.from)) return err('End time must be after start time.');
    if (w.step === 5) {
      if (!/^\d{10}$/.test(w.phone)) return err('Enter the 10-digit WhatsApp number.');
      let id = slugify(w.name); while (S().clinics[id]) id += '-2';
      const c = D.newClinic(id, w.name.trim(), w.tpl, w.color, w.doctors.filter(d => d.name.trim()).map(d => ({ name: /^dr/i.test(d.name.trim()) ? d.name.trim() : 'Dr. ' + d.name.trim(), spec: d.spec, from: d.from, to: d.to })), [{ name: 'Owner', role: 'Owner' }].concat(w.staff.filter(x => x.name.trim())), w.phone, S().today);
      S().clinics[id] = c;
      w.done = id; CD.render(); CD.toast(c.name + ' is live'); return;
    }
    w.step++; CD.render();
  };
  document.addEventListener('change', e => { const el = e.target; if (el.tagName === 'SELECT' && el.dataset && (el.dataset.ai === 'wDoc' || el.dataset.ai === 'wStaff')) A[el.dataset.ai](el.dataset, el); });
})();
