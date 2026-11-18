/* Clinic Desk — printed documents v3 (India-first).
   Prescription: A5 (Maharashtra model format minimum), 1-0-1 dosing, generic CAPITALS (NMC) + optional brand,
   total quantity for the chemist, Hindi line, UHID, vitals, tests, next visit, "Dispensed by".
   Receipt: amount in words, UHID, UPI ref, SAC codes, GST split.
   Day report: cash book (opening change + cash − drawer spends = should be in drawer → hand over), dues, payouts.
   Monthly summary: collected → paid out → what you kept; bot impact; follow-up return; GST with SAC. */
(function () {
  'use strict';
  const CD = window.CD;
  const esc = CD.esc, rs = CD.rs;
  const S = () => CD.S, C = () => CD.C();
  const docs = CD.docs = {};

  const CSS = '<style>' +
    '.doc{font-family:"IBM Plex Sans","IBM Plex Sans Devanagari",system-ui,sans-serif;color:#16213A;font-size:11.5px;line-height:1.45;max-width:780px;margin:0 auto}' +
    '.doc *{box-sizing:border-box}' +
    '.doc .mut{color:#5B6474}.doc .sm{font-size:10px}.doc .ok{color:#24563A}.doc .bad{color:#A3271F}.doc .b{font-weight:700}' +
    '.doc .lh{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:10px;border-bottom:3px solid var(--k)}' +
    '.doc .cn{font-family:"Newsreader",Georgia,serif;font-size:24px;font-weight:600;line-height:1.1;display:flex;align-items:center;gap:9px}' +
    '.doc .lg{width:32px;height:32px;border-radius:16px;border:2px solid var(--k);color:var(--k);display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;flex:none}' +
    '.doc .rule2{height:1px;background:var(--k);opacity:.35;margin:2px 0 12px}' +
    '.doc .lab{font-size:8.5px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#5B6474;margin-bottom:2px}' +
    '.doc .strip{display:grid;border:1px solid #DDD5C6;border-radius:8px;overflow:hidden;margin-bottom:10px}' +
    '.doc .strip>div{padding:6px 10px;border-right:1px solid #EEE7DA;border-bottom:1px solid #EEE7DA}' +
    '.doc .val{font-size:12.5px;font-weight:600}' +
    '.doc table{border-collapse:collapse;width:100%}' +
    '.doc th{font-size:8.5px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:#5B6474;text-align:left;padding:5px 7px;border-bottom:1.5px solid #16213A;vertical-align:bottom}' +
    '.doc td{padding:6px 7px;border-bottom:1px solid #EEE7DA;vertical-align:top}' +
    '.doc .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.doc .ctr{text-align:center}' +
    '.doc .box{border:1px solid #DDD5C6;border-radius:8px;padding:9px 11px}' +
    '.doc .tint{background:var(--t);border-color:transparent}' +
    '.doc .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.doc .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.doc .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}' +
    '.doc .big{font-size:38px;font-weight:700;line-height:1;letter-spacing:-.5px;font-variant-numeric:tabular-nums}' +
    '.doc .mid{font-size:19px;font-weight:700;font-variant-numeric:tabular-nums}' +
    '.doc .bar{height:8px;border-radius:4px;background:#F1EADA;overflow:hidden}.doc .bar i{display:block;height:8px;background:var(--k);border-radius:4px}.doc .bar.neg i{background:#C98A84}' +
    '.doc .stamp{display:inline-block;white-space:nowrap;font-weight:700;letter-spacing:2px;text-transform:uppercase;border:2.5px solid currentColor;border-radius:5px;padding:2px 9px;transform:rotate(-5deg);font-size:12px}' +
    '.doc .sec{font-size:10.5px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;margin:14px 0 7px;display:flex;align-items:center;gap:10px}.doc .sec::after{content:"";flex:1;height:1px;background:#DDD5C6}' +
    '.doc .foot{margin-top:14px;padding-top:7px;border-top:1px solid #DDD5C6;font-size:9px;color:#5B6474;display:flex;justify-content:space-between;gap:12px}' +
    '.doc .sig{font-family:"Caveat",cursive;font-size:28px;color:var(--k);line-height:1}' +
    '.doc .dstamp{border:2px solid var(--k);color:var(--k);border-radius:6px;padding:4px 9px;font-size:8px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;line-height:1.35;transform:rotate(-4deg);display:inline-block;opacity:.85}' +
    '.doc .strike td{color:#9AA1AE;text-decoration:line-through}' +
    '.doc .tot td{border-top:1.5px solid #16213A;border-bottom:0;font-weight:700}' +
    '.doc .sigline{border-top:1px solid #16213A;padding-top:4px;margin-top:26px;font-size:10px;color:#5B6474}' +
    '.doc .chip{display:inline-block;border:1px solid #C5DBCF;background:#F1F7F3;border-radius:12px;padding:2px 9px;margin:0 5px 4px 0;font-weight:600}' +
    '.doc.a5{max-width:540px;font-size:10.5px}' +
    '.doc.a5 .cn{font-size:20px}.doc.a5 .val{font-size:11.5px}' +
    '.doc .rxs{font-family:"Newsreader",Georgia,serif;font-size:28px;font-weight:600;line-height:1;color:var(--k)}' +
    '.doc .gen{font-weight:700;letter-spacing:.2px;font-size:11.5px}' +
    '.doc .brand{font-size:9.5px;color:#3A4458}' +
    '.doc .hi{font-size:10.5px;color:#1E5B46;margin-top:2px;font-weight:500}' +
    '.doc .dose{font-size:15px;font-weight:700;text-align:center;white-space:nowrap;letter-spacing:1px;font-variant-numeric:tabular-nums}' +
    '.doc .dk{display:flex;justify-content:center;gap:9px;color:#5B6474}' +
'.doc.a5 .lh{padding-bottom:7px}.doc.a5 .rule2{margin:2px 0 8px}.doc.a5 .strip{margin-bottom:6px}.doc.a5 .strip>div{padding:4px 9px}' + '.doc.a5 td{padding:4px 6px}.doc.a5 th{padding:4px 6px}.doc.a5 .box{padding:6px 9px}.doc.a5 .mid{font-size:16px}.doc.a5 .sig{font-size:21px;white-space:nowrap}' + '.doc.a5 .dstamp{font-size:7px;padding:3px 7px}.doc.a5 .foot{margin-top:7px;padding-top:5px}.doc.a5 .chip{padding:1px 8px}.doc.a5 .rxs{font-size:24px}' +
        '@media print{.doc{max-width:none}.doc .avoid{break-inside:avoid}}' +
    '</style>';
  const page = sz => '<style>body{margin:0!important}@page{size:' + sz + ';margin:' + (sz === 'A5' ? '8mm 9mm' : sz === 'A4 landscape' ? '9mm 10mm' : '11mm 12mm') + '}</style>';

  const ic = {
    sun: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>',
    half: '<svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    moon: '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>'
  };
  const clinicLine = c => esc(c.address || 'Clinic address') + ' · ' + esc(c.phone || '');
  const head = (c, right, sub) => '<div class="lh"><div><div class="cn"><span class="lg">' + esc(c.logo) + '</span>' + esc(c.name) + '</div><div class="mut sm" style="margin-top:3px">' + clinicLine(c) + (sub ? '<br>' + sub : '') + '</div></div><div style="text-align:right">' + right + '</div></div><div class="rule2"></div>';

  /* ---------------- medicine line → Indian schedule ---------------- */
  const HI = { Subah: 'सुबह', Dopahar: 'दोपहर', Raat: 'रात', aur: 'और', 'khaane ke baad': 'खाने के बाद', 'khaane se pehle': 'खाने से पहले', 'twacha par patli parat lagaayein': 'त्वचा पर पतली परत लगाएँ', 'sirf daano par lagaayein': 'सिर्फ़ दानों पर लगाएँ', 'is se chehra dhoyein': 'इससे चेहरा धोएँ', 'sir ki twacha par lagaayein': 'सिर की त्वचा पर लगाएँ', 'shampoo karein': 'शैम्पू करें', 'kulla karein': 'कुल्ला करें', 'Zaroorat ho tabhi': 'ज़रूरत हो तभी', 'hafte mein 2 baar': 'हफ़्ते में 2 बार', 'paani mein ghol kar': 'पानी में घोल कर', hafte: 'हफ़्ते', din: 'दिन', mahine: 'महीने' };
  function parse(m, lang) {
    const name = (m.n || '').trim(), how = (m.how || '').toLowerCase();
    const sp = name.match(/^([^\d(]+?)\s*((?:\d|\().*)?$/);
    let gen = (sp ? sp[1] : name).trim(), detail = (sp && sp[2] ? sp[2] : '').trim();
    const formRe = /\b(foaming face wash|face wash|gel|cream|lotion|ointment|wash|shampoo|solution|serum|sunscreen|moisturiser|mouthwash|tablet|capsule|syrup|drops|powder|spray)\b/i;
    const fw = gen.match(formRe); if (fw && !/\d/.test(detail)) { detail = (detail ? detail + ' ' : '') + fw[0].toLowerCase(); gen = gen.replace(formRe, '').trim() || gen; }
    const topical = /(gel|cream|lotion|ointment|wash|shampoo|solution|serum|sunscreen|moistur|mouthwash|steam)/i.test(name);
    const scalp = /shampoo|minoxidil/i.test(name) || /scalp/.test(how);
    const wash = /wash/i.test(name) && !/mouth/i.test(name);
    const shampoo = /shampoo/i.test(name);
    const sos = /(if fever|if pain|when itchy|if needed|on rash|sos)/.test(how);
    const weekly = /twice a week/.test(how);
    let M = 0, A = 0, N = 0;
    if (/three times|3 times/.test(how)) M = A = N = 1;
    if (/twice a day|2 times|morning and (night|evening)|twice daily/.test(how)) { M = 1; N = 1; }
    if (/morning|after breakfast/.test(how)) M = 1;
    if (/after lunch|afternoon|noon/.test(how)) A = 1;
    if (/night|after dinner|bedtime|evening/.test(how)) N = 1;
    if (/in the day|every 3 hours/.test(how)) { M = 1; A = 1; }
    if (!M && !A && !N && !sos && !weekly) { if (topical) N = 1; else M = 1; }
    if (weekly || sos) { M = A = N = 0; }
    const qm = how.match(/^(\d+(?:\.\d+)?|½)\s/); const q = qm ? qm[1] : '1';
    const dose = sos ? 'SOS' : weekly ? '2× / week' : [M, A, N].map(v => v ? q : '0').join('-');
    const dm = how.match(/(\d+)\s*(week|day|month)s?/);
    const days = dm ? Number(dm[1]) * ({ week: 7, day: 1, month: 30 })[dm[2]] : 0;
    const dur = dm ? dm[1] + ' ' + dm[2] + (dm[1] === '1' ? '' : 's') : '';
    let when = topical ? (shampoo ? 'Shampoo, leave 5 min, rinse' : wash ? 'Wash face, pat dry' : scalp ? 'On scalp' : /mouthwash/i.test(name) ? 'Rinse mouth' : (/on spots/.test(how) ? 'Only on spots' : 'Thin layer on skin')) : (/before food|empty/.test(how) ? 'Before food' : /\bors\b/i.test(name) ? 'Dissolve in water' : 'After food');
    if (/1 ml/.test(how)) when = '1 ml on scalp';
    if (/every 3 hours/.test(how)) when += ', every 3 hours in the day';
    if (/2 weeks only/.test(how)) when += ' · max 2 weeks';
    if (sos) when = 'Only when needed';
    const perDay = (M + A + N) * (Number(q) || 1);
    let qty = '';
    if (topical) { const months = dm && dm[2] === 'month' ? Number(dm[1]) : 1; qty = (/gel|cream|ointment/i.test(name) ? months + ' tube' : months + ' bottle') + (months > 1 ? 's' : ''); }
    else if (sos) qty = '10 ' + (/cap/i.test(name) ? 'caps' : 'tabs');
    else if (days && perDay) qty = (days * perDay) + ' ' + (/capsule|cap\b/i.test(name) ? 'caps' : /syrup/i.test(name) ? 'ml' : 'tabs');
    const hT = []; if (M) hT.push('Subah'); if (A) hT.push('Dopahar'); if (N) hT.push('Raat');
    const hR = sos ? 'Zaroorat ho tabhi' : topical ? (shampoo ? 'shampoo karein' : wash ? 'is se chehra dhoyein' : scalp ? 'sir ki twacha par lagaayein' : /mouthwash/i.test(name) ? 'kulla karein' : /on spots/.test(how) ? 'sirf daano par lagaayein' : 'twacha par patli parat lagaayein') : (/before food|empty/.test(how) ? 'khaane se pehle' : /\bors\b/i.test(name) ? 'paani mein ghol kar' : 'khaane ke baad');
    const unit = dm ? ({ week: 'hafte', day: 'din', month: 'mahine' })[dm[2]] : '';
    const roman = (weekly ? 'hafte mein 2 baar · ' : '') + (hT.length ? hT.join(' aur ') + ' · ' : '') + hR + (dm ? ' · ' + dm[1] + ' ' + unit : '');
    const toHi = t => t.split(' · ').map(seg => { if (HI[seg]) return HI[seg]; if (/ aur /.test(seg)) return seg.split(' aur ').map(x => HI[x] || x).join(' ' + HI.aur + ' '); const mm = seg.match(/^(\d+) (hafte|din|mahine)$/); if (mm) return mm[1] + ' ' + HI[mm[2]]; return seg; }).join(' · ');
    const english = (weekly ? 'Twice a week · ' : '') + (hT.length ? hT.map(x => ({ Subah: 'Morning', Dopahar: 'Afternoon', Raat: 'Night' })[x]).join(' and ') + ' · ' : '') + when.toLowerCase() + (dur ? ' · ' + dur : '');
    const line = lang === 'en' ? english : lang === 'hl' ? roman : toHi(roman);
    return { gen: gen.toUpperCase(), detail, brand: m.brand || '', dose, when, dur, qty, line };
  }
  docs.parse = parse;

  /* ---------------- PRESCRIPTION (A5) — classic Indian pad ---------------- */
  const PAD = '<style>' +
    '.pad{font-family:"IBM Plex Sans","IBM Plex Sans Devanagari",system-ui,sans-serif;color:#16213A;font-size:11px;line-height:1.45;max-width:540px;margin:0 auto;display:flex;flex-direction:column;min-height:192mm}' +
    '.pad *{box-sizing:border-box}' +
    '.pad .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:8px}' +
    '.pad .dn{font-family:"Newsreader",Georgia,serif;font-size:22px;font-weight:700;color:#1E5B46;line-height:1.05}' +
    '.pad .dd{font-size:10px;font-weight:600;margin-top:2px}.pad .dm{font-size:9.5px;color:#3A4458}' +
    '.pad .cl{text-align:right;font-size:9.5px;color:#3A4458;line-height:1.5}.pad .cl b{font-family:"Newsreader",Georgia,serif;font-size:13px;color:#16213A}' +
    '.pad .band{height:4px;background:#1E5B46;border-radius:2px}.pad .band2{height:1px;background:#1E5B46;opacity:.4;margin:2px 0 8px}' +
    '.pad .pl{display:flex;gap:14px;font-size:11px;margin:4px 0}.pad .pl span{white-space:nowrap}.pad .pl .u{display:inline-block;border-bottom:1px dotted #8A93A3;min-width:40px;padding:0 4px;font-weight:600}' +
    '.pad .body{display:flex;flex:1;margin-top:6px;border-top:1px solid #C5DBCF}' +
    '.pad .side{width:31%;border-right:1px solid #C5DBCF;padding:8px 9px 8px 0;font-size:10px}' +
    '.pad .side .h{font-weight:700;font-size:9.5px;color:#1E5B46;margin-top:8px}.pad .side .h:first-child{margin-top:0}' +
    '.pad .main{flex:1;padding:6px 0 8px 12px}' +
    '.pad .rx{font-family:"Newsreader",Georgia,serif;font-size:30px;font-weight:600;color:#1E5B46;line-height:1;margin-bottom:6px}' +
    '.pad ol{margin:0;padding-left:16px}.pad li{margin-bottom:9px;padding-left:2px}' +
    '.pad .m1{font-size:11.5px}.pad .m1 b{letter-spacing:.2px}.pad .br{color:#3A4458}' +
    '.pad .m2{display:flex;justify-content:space-between;gap:8px;margin-top:1px}.pad .dose{font-weight:700;font-size:12.5px;letter-spacing:1.5px}' +
    '.pad .m3{color:#1E5B46;font-size:10.5px}.pad .ins{font-size:11px;margin-top:1px}' +
    '.pad .adv{margin-top:6px;font-size:10.5px}.pad .adv b{color:#1E5B46}' +
    '.pad .rev{margin-top:8px;font-size:11.5px}.pad .rev b{font-size:12.5px}' +
    '.pad .sg{display:flex;justify-content:flex-end;align-items:flex-end;gap:10px;margin-top:6px}' +
    '.pad .sig{font-family:"Caveat",cursive;font-size:22px;color:#1E5B46;line-height:1;white-space:nowrap}' +
    '.pad .ft{border-top:4px solid #1E5B46;padding-top:5px;font-size:9px;color:#3A4458;display:flex;justify-content:space-between;gap:10px}' +
    '</style>';
  const dmy = s => s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  const formOf = (name, detail) => { const t = (name + ' ' + detail).toLowerCase(); if (/face wash|wash/.test(t)) return 'Face wash'; if (/shampoo/.test(t)) return 'Shampoo'; if (/\bgel\b/.test(t)) return 'Gel'; if (/cream/.test(t)) return 'Cream'; if (/ointment/.test(t)) return 'Oint.'; if (/lotion/.test(t)) return 'Lotion'; if (/solution/.test(t)) return 'Sol.'; if (/serum/.test(t)) return 'Serum'; if (/sunscreen/.test(t)) return 'Sunscreen'; if (/syrup/.test(t)) return 'Syp.'; if (/capsule|cap\b/.test(t)) return 'Cap.'; if (/moistur/.test(t)) return 'Lotion'; if (/mouthwash/.test(t)) return 'Mouthwash'; return 'Tab.'; };

  /* how a doctor writes the instruction, in English and Hindi */
  function instr(m, lang) {
    const name = (m.n || '').toLowerCase(), how = (m.how || '').toLowerCase();
    const t = { m: /morning|after breakfast|twice a day|2 times|three times|in the day|every 3 hours/.test(how), a: /after lunch|afternoon|three times|in the day|every 3 hours/.test(how), n: /night|after dinner|bedtime|evening|twice a day|2 times|three times/.test(how) };
    const sos = /(if fever|if pain|when itchy|if needed|on rash|sos)/.test(how);
    const weekly = /twice a week/.test(how);
    const dm = how.match(/(\d+)\s*(week|day|month)s?/);
    const durE = dm ? dm[1] + ' ' + dm[2] + (dm[1] === '1' ? '' : 's') : '';
    const durH = dm ? dm[1] + ' ' + ({ week: 'हफ़्ते', day: 'दिन', month: 'महीने' })[dm[2]] : '';
    const durR = dm ? dm[1] + ' ' + ({ week: 'hafte', day: 'din', month: 'mahine' })[dm[2]] : '';
    const whenE = t.m && t.a && t.n ? 'three times a day' : t.m && t.n ? 'morning and night' : t.m && t.a ? 'in the day' : t.m ? 'in the morning' : t.a ? 'in the afternoon' : 'at night';
    const whenH = t.m && t.a && t.n ? 'दिन में 3 बार' : t.m && t.n ? 'सुबह और रात' : t.m && t.a ? 'दिन में' : t.m ? 'सुबह' : t.a ? 'दोपहर' : 'रात को';
    const whenR = t.m && t.a && t.n ? 'din mein 3 baar' : t.m && t.n ? 'subah aur raat' : t.m && t.a ? 'din mein' : t.m ? 'subah' : t.a ? 'dopahar' : 'raat ko';
    let e, h, r;
    if (/shampoo/.test(name)) { e = 'Shampoo twice a week, leave 5 minutes, then rinse'; h = 'हफ़्ते में 2 बार शैम्पू करें, 5 मिनट रखकर धोएँ'; r = 'hafte mein 2 baar shampoo karein, 5 minute rakh kar dhoyein'; }
    else if (/face wash|wash/.test(name) && !/mouth/.test(name)) { e = 'Wash face ' + whenE; h = whenH + ' इससे चेहरा धोएँ'; r = whenR + ' is se chehra dhoyein'; }
    else if (/sunscreen/.test(name)) { e = 'Apply before going out, again every 3 hours'; h = 'धूप में जाने से पहले लगाएँ, हर 3 घंटे में दोबारा'; r = 'dhoop mein jaane se pehle lagaayein, har 3 ghante mein dobara'; }
    else if (/minoxidil|scalp/.test(name + how)) { e = 'Apply 1 ml on the scalp ' + whenE; h = whenH + ' 1 ml सिर की त्वचा पर लगाएँ'; r = whenR + ' 1 ml sir ki twacha par lagaayein'; }
    else if (/gel|cream|ointment|lotion|serum|moistur/.test(name)) {
      const where = /on spots/.test(how) ? ['only on pimples', 'सिर्फ़ दानों पर', 'sirf daano par'] : /on patches/.test(how) ? ['on the patches', 'दाग/पपड़ी पर', 'daag par'] : /on rash/.test(how) ? ['on the rash', 'दानों/रैश पर', 'rash par'] : ['a thin layer on the affected area', 'पतली परत प्रभावित जगह पर', 'patli parat prabhavit jagah par'];
      if (sos) { e = 'Apply ' + where[0] + ' when itchy'; h = 'खुजली हो तब ' + where[1] + ' लगाएँ'; r = 'khujli ho tab ' + where[2] + ' lagaayein'; }
      else { e = 'Apply ' + where[0] + ' ' + whenE; h = whenH + ' ' + where[1] + ' लगाएँ'; r = whenR + ' ' + where[2] + ' lagaayein'; }
    } else if (/mouthwash/.test(name)) { e = 'Rinse mouth ' + whenE; h = whenH + ' कुल्ला करें'; r = whenR + ' kulla karein'; }
    else {
      const q = (how.match(/^(\d+)\s/) || [0, '1'])[1];
      const food = /before food|empty/.test(how) ? ['before food', 'खाने से पहले', 'khaane se pehle'] : ['after food', 'खाने के बाद', 'khaane ke baad'];
      const unit = /cap/.test(name) ? ['capsule', 'कैप्सूल', 'capsule'] : ['tablet', 'गोली', 'goli'];
      if (sos) { e = q + ' ' + unit[0] + ' only when needed (SOS)'; h = 'ज़रूरत हो तभी ' + q + ' ' + unit[1]; r = 'zaroorat ho tabhi ' + q + ' ' + unit[2]; }
      else { const pat = [t.m, t.a, t.n].map(x => x ? q : '0').join('-'); e = pat + ' · ' + food[0]; h = whenH + ' ' + food[1] + ' ' + q + ' ' + unit[1]; r = whenR + ' ' + food[2] + ' ' + q + ' ' + unit[2]; }
    }
    if (weekly && !/shampoo/.test(name)) { e = e.replace(whenE, 'twice a week'); }
    if (/2 weeks only/.test(how)) { e += ' (not more than 2 weeks)'; }
    const local = lang === 'en' ? '' : (lang === 'hl' ? r + (durR ? ', ' + durR : '') : h + (durH ? ', ' + durH : ''));
    return { e: e + (durE ? ' — ' + durE : ''), local };
  }
  docs.rx = function (p, r, d) {
    const c = C(); d = d || CD.doc(r.doc);
    const lang = c.rxLang || 'hi';
    const vt = r.vitals || {};
    const lines = (r.meds || []).map(m => { const l = parse(m, lang); const form = formOf(m.n || '', l.detail); const strength = l.detail.replace(/\b(foaming face wash|face wash|gel|cream|lotion|ointment|wash|shampoo|solution|serum|sunscreen|moisturiser|mouthwash|tablet|capsule|syrup)\b/ig, '').trim(); return Object.assign(l, { form, strength }); });
    const doseTxt = l => /^\d/.test(l.dose) ? l.dose.split('-').join(' — ') : l.dose;
    const meds = '<ol>' + lines.map((l, i) => { const ins = instr(r.meds[i], lang); return '<li><div class="m2"><span class="m1">' + esc(l.form) + ' <b>' + esc(l.gen) + '</b>' + (l.strength ? ' ' + esc(l.strength) : '') + (l.brand ? ' <span class="br">(' + esc(l.brand) + ')</span>' : '') + '</span><span class="br" style="font-size:9.5px;white-space:nowrap">' + esc(l.qty ? 'Qty ' + l.qty : '') + '</span></div>' +
      '<div class="ins">' + esc(ins.e) + '</div>' + (ins.local ? '<div class="m3">' + esc(ins.local) + '</div>' : '') + '</li>'; }).join('') + '</ol>';
    const side = '<div class="side">' +
      '<div class="h">C/O</div><div>' + (p.words ? esc(p.words) : esc(p.problem || '—')) + '</div>' +
      '<div class="h">O/E</div><div>Wt: ' + esc(vt.wt ? vt.wt + ' kg' : '____') + '<br>BP: ' + esc(vt.bp || '____') + '</div>' +
      '<div class="h">Dx</div><div><b>' + esc(r.finding || '—') + '</b></div>' +
      ((r.tests && r.tests.length) ? '<div class="h">Inv. advised</div><div>' + r.tests.map(t => '• ' + esc(t)).join('<br>') + '</div>' : '') +
      '<div class="h">Allergy</div><div>' + esc(p.allergies || 'NKDA') + '</div></div>';
    const adv = (r.advice ? '<div class="adv"><b>Adv:</b> ' + esc(r.advice) + '</div>' : '') +
      '<div class="rev">' + (r.follow ? '<b>Review on ' + dmy(r.follow) + '</b> (' + CD.day(r.follow).split(' ')[0] + ') · with this paper &amp; reports' : '<b>Review:</b> SOS') + '</div>' +
      '<div class="sm" style="font-size:9.5px;color:#3A4458;margin-top:2px">' + (lang === 'en' ? 'Reply 1 on WhatsApp to book' : 'Booking ke liye WhatsApp par 1 likhein') + ' · ' + esc(p.id ? CD.link(p.id) : '') + '</div>';
    const sign = '<div class="sg"><div style="text-align:right"><div class="sig">' + esc(d.name) + '</div><div style="border-top:1px solid #16213A;padding-top:2px;font-size:9px"><b>' + esc(d.name) + '</b><br>Reg. No. ' + esc(d.reg || '—') + '</div></div></div>';
    const top = '<div class="top"><div><div class="dn">' + esc(d.name) + '</div><div class="dd">' + esc(d.deg || 'MBBS') + '</div><div class="dm">' + esc(d.spec ? 'Consultant ' + ({ Skin: 'Dermatologist', Hair: 'Trichologist' }[d.spec] || d.spec) : '') + '<br>Reg. No. ' + esc(d.reg || '—') + ' (' + esc(d.council || '') + ')</div></div>' +
      '<div class="cl"><b>' + esc(c.name) + '</b><br>' + esc(c.timings || '') + '<br>☎ ' + esc(c.phone || '') + '</div></div><div class="band"></div><div class="band2"></div>';
    const pline = '<div class="pl"><span>Name: <span class="u" style="min-width:120px">' + esc(p.name) + '</span></span><span>Age/Sex: <span class="u">' + esc(CD.age(p).replace(' y', '')) + '/' + esc(p.sex || '') + '</span></span><span>Date: <span class="u">' + dmy(r.date) + '</span></span></div>' +
      '<div class="pl" style="color:#3A4458;font-size:10px"><span>UHID: <b>' + esc(CD.uhid(p)) + '</b></span><span>Ph: ' + (p.phone ? CD.phoneFmt(p.phone) : '—') + '</span></div>';
    const main = '<div class="main"><div class="rx">℞</div>' + meds + adv + sign + '</div>';
    const foot = '<div class="ft"><span>' + esc(c.address || '') + '</span><span>Generic names as per NMC · Not valid for medico-legal purposes</span></div>';
    return page('A5') + PAD + '<div class="pad">' + top + pline + '<div class="body">' + side + main + '</div>' + foot + '</div>';
  };
  CD.rxPrintHtml = docs.rx;

  /* ---------------- RECEIPT (A5) ---------------- */
  const SAC = it => it.cat === 'medicine' ? 'HSN 3004' : it.cat === 'consult' ? 'SAC 999312' : (it.gst ? 'SAC 999722' : 'SAC 999312');
  const ref = b => { let h = 7; String(b.no).split('').forEach(ch => { h = (h * 131 + ch.charCodeAt(0)) % 1e12; }); return String(h).padStart(12, '4'); };
  docs.receipt = function (b) {
    const c = C(), p = CD.P(b.pid) || { name: '' };
    let gstTotal = 0;
    const rows = b.items.map(it => { const r = it.gst || 0; const base = r ? it.amt / (1 + r / 100) : it.amt; gstTotal += it.amt - base; return '<tr><td>' + esc(it.n) + '<div class="sm mut">' + SAC(it) + (r ? ' · GST ' + r + '%' : ' · exempt') + '</div></td><td class="num">' + rs(base) + '</td></tr>'; }).join('');
    const pay = b.mode === 'UPI' ? 'UPI · ref ' + ref(b) : b.mode === 'Card' ? 'Card · auth ' + ref(b).slice(0, 6) : 'Cash';
    const stamp = b.refund ? '<span class="stamp bad">Refunded</span>' : '<span class="stamp ok">Paid · ' + esc(b.mode) + '</span>';
    const right = '<div style="font-size:13px;font-weight:700;letter-spacing:1px">RECEIPT</div><div class="mut sm">No. ' + esc(b.no) + '<br>' + CD.d(b.date) + ' ' + b.date.slice(0, 4) + ' · ' + CD.t(b.time) + '</div>';
    const body = '<div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:10px"><div style="font-size:12px;line-height:1.6">Received with thanks from <b>' + esc(p.name) + '</b> (UHID ' + esc(CD.uhid(p)) + ')<br>the sum of <b>Rupees ' + CD.words(b.total) + ' Only</b> (' + rs(b.total) + ')<br>by <b>' + esc(pay) + '</b></div>' + stamp + '</div>' +
      '<table><thead><tr><th>Towards</th><th class="num">₹</th></tr></thead><tbody>' + rows +
      (b.discount ? '<tr><td>Concession</td><td class="num">− ' + rs(b.discount) + '</td></tr>' : '') +
      (gstTotal > 0.5 ? '<tr><td>CGST 9%</td><td class="num">' + rs(gstTotal / 2) + '</td></tr><tr><td>SGST 9%</td><td class="num">' + rs(gstTotal / 2) + '</td></tr>' : '') +
      '<tr class="tot"><td>Total paid</td><td class="num" style="font-size:14px">' + rs(b.total) + '</td></tr></tbody></table>' +
      (b.refund ? '<div class="bad" style="margin-top:6px">Refunded ' + rs(b.refund.amt) + ' on ' + CD.d(b.refund.date) + ' · ' + esc(b.refund.reason) + '</div>' : '');
    const foot = '<div class="foot"><span>Computer-generated receipt, no signature needed. Consultations are exempt from GST.' + (c.gstin ? ' GSTIN ' + esc(c.gstin) : '') + '</span><span>Received by ' + esc(b.by || 'Reception') + '</span></div>';
    return page('A5') + CSS + '<div class="doc a5" style="--k:#16213A;--t:#F2F6FC">' + head(c, right) + body + foot + '</div>';
  };

  /* ---------------- TOKEN SLIP (80 mm) ---------------- */
  docs.token = function (v) {
    const c = C(), p = CD.P(v.pid) || {}; const d = CD.doc(v.doc);
    const ahead = CD.waiting(v.doc).filter(x => CD.tokN(x) < CD.tokN(v)).length + (CD.inCabin(v.doc) ? 1 : 0);
    return '<style>@page{size:80mm 120mm;margin:4mm}</style>' + CSS + '<div class="doc" style="max-width:290px;text-align:center;--k:#1F3A68"><div style="font-family:Newsreader,serif;font-size:16px;font-weight:600">' + esc(c.name) + '</div><div class="sm mut">' + esc(CD.day(v.date)) + ' · ' + CD.t(v.time) + '</div><div style="border-top:1px dashed #999;margin:8px 0"></div><div class="lab">Token · टोकन</div><div style="font-size:64px;font-weight:700;line-height:1">' + esc(v.tok) + '</div><div style="font-size:13px;font-weight:600;margin-top:4px">' + esc(p.name) + '</div><div class="sm">' + esc(d.name) + '</div><div style="margin:8px 0;font-size:12px"><b>' + ahead + '</b> before you · आपसे पहले <b>' + ahead + '</b> लोग</div><div class="sm mut">Track your turn on WhatsApp:<br>' + esc(CD.link(p.id)) + '</div><div style="border-top:1px dashed #999;margin:8px 0"></div><div class="sm">Please keep this slip · कृपया यह पर्ची रखें</div></div>';
  };

  /* ---------------- OPD REGISTER (A4 landscape) ---------------- */
  docs.register = function (date) {
    const c = C(), s = S(); date = date || s.today;
    const vs = c.visits.filter(v => v.date === date && v.tok && v.tok !== 'Rx').sort((a, b) => CD.tokN(a) - CD.tokN(b));
    const isOld = v => c.visits.some(x => x.pid === v.pid && x.date < date);
    const rows = vs.map(v => { const p = CD.P(v.pid) || {}; const b = v.bill ? c.bills.find(x => x.no === v.bill) : null; const rx = c.rx.find(r => r.pid === v.pid && r.date === date);
      return '<tr' + (v.status === 'left' ? ' class="strike"' : '') + '><td class="b">' + esc(v.tok) + '</td><td class="mut">' + esc(CD.uhid(p)) + '</td><td>' + CD.tShort(v.time) + '</td><td class="b">' + esc(p.name || '') + (p.rel ? '<div class="sm mut" style="font-weight:400">' + esc(p.rel) + '</div>' : '') + '</td><td>' + esc(CD.age(p)) + ' / ' + esc(p.sex || '') + '</td><td>' + CD.mask(p.phone) + '</td><td>' + (isOld(v) ? 'Old' : '<b>New</b>') + '</td><td>' + esc(CD.doc(v.doc).short) + '</td><td>' + esc(rx ? rx.finding : (p.problem || '')) + '</td><td class="num">' + (b ? rs(b.total) : '—') + '</td><td>' + (b ? esc(b.mode) : v.status === 'booked' ? 'Not arrived' : CD.feeItems(v.pid, v.kind, v.tr).length && !(v.status === 'done' && v.date < S().today) ? '<span class="bad">Unpaid</span>' : 'Free follow-up') + '</td><td>' + esc(v.status === 'done' ? 'Seen' : v.status === 'cabin' ? 'With doctor' : v.status === 'left' ? 'Left' : v.status === 'booked' ? 'Booked' : 'Waiting') + '</td></tr>'; }).join('');
    const tot = vs.reduce((x, v) => { const b = v.bill ? c.bills.find(y => y.no === v.bill) : null; return x + (b ? CD.netOf(b) : 0); }, 0);
    const nNew = vs.filter(v => !isOld(v)).length;
    const right = '<div style="font-size:14px;font-weight:700">OPD Register</div><div class="mut sm">' + CD.day(date) + ' ' + date.slice(0, 4) + '</div><div class="sm">' + vs.length + ' patients · ' + nNew + ' new · ' + (vs.length - nNew) + ' old</div>';
    return page('A4 landscape') + CSS + '<div class="doc" style="max-width:none;--k:#1F3A68;--t:#F2F6FC">' + head(c, right) + '<table><thead><tr><th>OPD no.</th><th>UHID</th><th>Time</th><th>Patient</th><th>Age / Sex</th><th>Phone</th><th>New / Old</th><th>Doctor</th><th>Complaint / Diagnosis</th><th class="num">Fee</th><th>Mode</th><th>Status</th></tr></thead><tbody>' + rows + '<tr class="tot"><td colspan="9">Total collected from OPD</td><td class="num">' + rs(tot) + '</td><td colspan="2"></td></tr></tbody></table><div class="g2"><div class="sigline">Reception</div><div class="sigline">Doctor</div></div></div>';
  };

  /* ---------------- money helpers ---------------- */
  const net = bs => bs.reduce((x, b) => x + CD.netOf(b), 0);
  const fullRef = b => b.refund && b.refund.amt === b.total;
  const catSum = (bs, k) => bs.reduce((x, b) => x + (fullRef(b) ? 0 : b.items.filter(i => i.cat === k).reduce((y, i) => y + i.amt, 0)), 0);
  const gstOf = bs => bs.reduce((x, b) => x + (fullRef(b) ? 0 : b.items.reduce((y, i) => y + (i.gst ? i.amt - i.amt / (1 + i.gst / 100) : 0), 0)), 0);
  const pct = (a, b) => b ? Math.round((a - b) / b * 100) : 0;
  const delta = (a, b, label) => { if (!b) return '<span class="mut">No data for ' + label + '</span>'; const d = a - b; if (Math.abs(pct(a, b)) < 1) return '<span class="mut">Same as ' + label + '</span>'; return '<span class="' + (d >= 0 ? 'ok' : 'bad') + '">' + (d >= 0 ? '▲ ' : '▼ ') + rs(Math.abs(d)) + ' (' + Math.abs(pct(a, b)) + '%)</span> <span class="mut">vs ' + label + '</span>'; };
  const barRow = (label, v, max, sub, neg) => '<tr><td style="width:40%">' + esc(label) + (sub ? '<div class="sm mut">' + esc(sub) + '</div>' : '') + '</td><td><div class="bar' + (neg || v < 0 ? ' neg' : '') + '"><i style="width:' + (max ? Math.max(2, Math.round(Math.abs(v) / max * 100)) : 0) + '%"></i></div></td><td class="num" style="width:22%;font-weight:600' + (v < 0 ? ';color:#A3271F' : '') + '">' + rs(v) + '</td></tr>';
  const vdMap = () => { const m = {}; C().visits.forEach(v => { m[v.pid + v.date] = v.doc; }); return m; };
  const fromBot = p => p && /WhatsApp|Missed/.test(p.source || '');

  /* ---------------- DAY REPORT ---------------- */
  docs.daily = function (date) {
    const c = C(), s = S(); date = date || s.today;
    const bills = c.bills.filter(b => b.date === date).sort((a, b) => a.time - b.time);
    const lastWk = c.bills.filter(b => b.date === CD.addDays(date, -7));
    const tot = net(bills);
    const mode = m => { const bs = bills.filter(b => b.mode === m); return [net(bs), bs.length]; };
    const cd = c.cashDays.find(x => x.date === date);
    const closedAt = date === s.today ? s.dayClosed[c.id] : (cd ? 1215 : null);
    const vis = c.visits.filter(v => v.date === date);
    const seen = vis.filter(v => v.status === 'done'), left = vis.filter(v => v.status === 'left');
    const isOld = v => c.visits.some(x => x.pid === v.pid && x.date < date);
    const refunds = bills.filter(b => b.refund);
    const petty = (c.expenses || []).filter(x => x.date === date && x.from === 'drawer');
    const pettyT = petty.reduce((x, e) => x + e.amt, 0);
    const float = c.float || 0;
    const cashIn = mode('Cash')[0];
    const shouldBe = float + cashIn - pettyT;
    const vd = vdMap();
    const payouts = c.doctors.filter(d => d.visiting).map(d => { const v = net(bills.filter(b => vd[b.pid + b.date] === d.id)); return [d, v, Math.round(v * (d.share || .5))]; }).filter(x => x[1] > 0);
    const dues = vis.filter(v => !v.bill && v.status !== 'left' && v.status !== 'booked' && CD.feeItems(v.pid, v.kind, v.tr).length);
    const conc = bills.filter(b => b.discount);
    const bot = bills.filter(b => fromBot(CD.P(b.pid)));
    const right = '<div style="font-size:14px;font-weight:700">Day report</div><div class="mut sm">' + CD.day(date) + ' ' + date.slice(0, 4) + '</div><div class="sm ' + (closedAt ? 'ok' : 'mut') + '">' + (closedAt ? 'Closed by ' + esc(cd ? cd.by : CD.meName()) + (date === s.today ? ' at ' + CD.t(closedAt) : '') : 'Not closed yet · printed ' + CD.t(s.clock)) + '</div>';
    const spot = '<div class="box tint" style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:13px 16px"><div><div class="lab">Net collected today</div><div class="big">' + rs(tot) + '</div><div class="sm" style="margin-top:4px">' + delta(tot, net(lastWk), 'last ' + CD.day(date).split(' ')[0]) + '</div></div><div class="sm" style="text-align:right;line-height:1.7">' + bills.length + ' bills · ' + seen.length + ' patients seen<br><span class="ok b">' + rs(net(bot)) + '</span> from WhatsApp / missed-call patients</div></div>';
    const modes = '<div class="g3" style="margin-top:9px">' + ['Cash', 'UPI', 'Card'].map(m => { const [v, n] = mode(m); return '<div class="box"><div class="lab">' + m + '</div><div class="mid">' + rs(v) + '</div><div class="sm mut">' + n + ' bill' + (n === 1 ? '' : 's') + ' · ' + (tot ? Math.round(v / tot * 100) : 0) + '%</div></div>'; }).join('') + '</div>';
    const cashbook = '<div class="box avoid"><div class="lab">Cash book</div><table>' +
      '<tr><td>Opening change in drawer</td><td class="num">' + rs(float) + '</td></tr>' +
      '<tr><td>+ Cash taken today</td><td class="num">' + rs(cashIn) + '</td></tr>' +
      '<tr><td>− Spent from drawer' + (petty.length ? '<div class="sm mut">' + esc(petty.map(e => e.what + ' ' + rs(e.amt)).join(' · ')) + '</div>' : '') + '</td><td class="num">' + (pettyT ? '− ' + rs(pettyT) : '–') + '</td></tr>' +
      '<tr class="tot"><td>Should be in drawer</td><td class="num">' + rs(shouldBe) + '</td></tr>' +
      (cd ? '<tr><td>Counted by ' + esc(cd.by) + '</td><td class="num">' + rs(cd.counted) + '</td></tr>' : '') + '</table>' +
      '<div style="margin-top:7px;display:flex;justify-content:space-between;align-items:center;gap:8px">' + (cd ? (cd.diff === 0 ? '<span class="stamp ok">Matched</span>' : '<span class="stamp bad">' + (cd.diff < 0 ? 'Short ' : 'Extra ') + rs(Math.abs(cd.diff)) + '</span>') + '<span class="sm" style="text-align:right">Hand to owner <b>' + rs(cd.handed != null ? cd.handed : Math.max(0, cd.counted - float)) + '</b><br><span class="mut">keep ' + rs(float) + ' change</span></span>' : '<span class="sm mut">Not counted yet — count in "Close the day".</span>') + '</div></div>';
    const pts = '<div class="box avoid"><div class="lab">Patients</div><table><tr><td>Seen</td><td class="num b">' + seen.length + '</td></tr><tr><td>New · Old</td><td class="num">' + seen.filter(v => !isOld(v)).length + ' · ' + seen.filter(isOld).length + '</td></tr><tr><td>Procedures done</td><td class="num">' + seen.filter(v => v.kind === 'proc').length + '</td></tr>' +
      c.doctors.map(d => [d.short, vis.filter(v => v.doc === d.id && v.status === 'done').length]).filter(x => x[1]).map(([n, v]) => '<tr><td>' + esc(n) + '</td><td class="num">' + v + '</td></tr>').join('') +
      '<tr><td>Left without seeing doctor</td><td class="num ' + (left.length ? 'bad' : '') + '">' + left.length + '</td></tr><tr><td>Still waiting</td><td class="num">' + vis.filter(v => v.status === 'waiting' || v.status === 'cabin').length + '</td></tr></table></div>';
    const owe = '<div class="sec">To settle</div><div class="g3">' +
      '<div class="box"><div class="lab">Pay-later dues</div>' + (dues.length ? dues.map(v => { const p = CD.P(v.pid); return '<div style="display:flex;justify-content:space-between;gap:6px"><span>' + esc(p.name) + '</span><b>' + rs(CD.feeItems(v.pid, v.kind, v.tr).reduce((x, i) => x + i.amt, 0)) + '</b></div>'; }).join('') : '<div class="mut">None</div>') + '</div>' +
      '<div class="box"><div class="lab">Visiting doctor payout</div>' + (payouts.length ? payouts.map(([d, v, sh]) => '<div style="display:flex;justify-content:space-between;gap:6px"><span>' + esc(d.short) + ' · ' + Math.round((d.share || .5) * 100) + '% of ' + rs(v) + '</span><b>' + rs(sh) + '</b></div>').join('') : '<div class="mut">None</div>') + '</div>' +
      '<div class="box"><div class="lab">Concessions given</div>' + (conc.length ? conc.map(b => '<div style="display:flex;justify-content:space-between;gap:6px"><span>' + esc((CD.P(b.pid) || {}).name) + ' · by ' + esc(b.by) + '</span><b>' + rs(b.discount) + '</b></div>').join('') : '<div class="mut">None</div>') + '</div></div>';
    const cats = [['Consultations', catSum(bills, 'consult')], ['Procedures', catSum(bills, 'procedure')], ['Medicines', catSum(bills, 'medicine')]];
    const mx = Math.max(1, ...cats.map(x => x[1]));
    const refT = refunds.reduce((x, b) => x + b.refund.amt, 0);
    const where = '<div class="sec">Where the money came from</div><table>' + cats.map(([k, v]) => barRow(k, v, mx)).join('') + (refunds.length ? barRow('Refunds', -refT, mx, refunds.map(b => (CD.P(b.pid) || {}).name + ': ' + b.refund.reason).join(' · ')) : '') + '<tr class="tot"><td>Net</td><td></td><td class="num">' + rs(tot) + '</td></tr></table>';
    const sign = '<div class="g2 avoid"><div class="sigline">Reception (' + esc(cd ? cd.by : CD.meName()) + ') — cash handed over</div><div class="sigline">Owner — cash received</div></div>';
    const list = '<div class="sec" style="break-before:page">Every bill · ' + bills.length + '</div><table><thead><tr><th>Time</th><th>Bill</th><th>Patient</th><th>For</th><th>Mode</th><th class="num">₹</th></tr></thead><tbody>' +
      bills.map(b => { const p = CD.P(b.pid) || {}; return '<tr' + (b.refund ? ' class="strike"' : '') + '><td class="mut" style="white-space:nowrap">' + CD.tShort(b.time) + '</td><td class="mut">' + esc(b.no) + '</td><td>' + esc(p.name || '') + '</td><td>' + esc(b.items.map(i => i.n.replace(' (counter)', '').replace(' (session)', '')).join(' + ')) + '</td><td>' + esc(b.mode) + '</td><td class="num">' + rs(b.total) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td colspan="5">Total after refunds</td><td class="num">' + rs(tot) + '</td></tr></tbody></table>';
    const foot = '<div class="foot"><span>' + esc(c.name) + ' · Day report · Clinic Desk</span><span>' + (c.gstin ? 'GSTIN ' + esc(c.gstin) : '') + '</span></div>';
    return page('A4') + CSS + '<div class="doc" style="--k:#8A6A1F;--t:#FBF5E7">' + head(c, right) + spot + modes + '<div class="g2" style="margin-top:9px">' + cashbook + pts + '</div>' + owe + where + sign + list + foot + '</div>';
  };

  /* ---------------- MONTHLY SUMMARY ---------------- */
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  docs.monthly = function (date) {
    const c = C(), s = S(); date = date || s.today;
    const ms = date.slice(0, 8) + '01'; const upto = Number(date.slice(8));
    const pmEnd = CD.addDays(ms, -1); const pms = pmEnd.slice(0, 8) + '01';
    const pmSame = pms.slice(0, 8) + String(Math.min(upto, Number(pmEnd.slice(8)))).padStart(2, '0');
    const inM = x => x.date >= ms && x.date <= date, inP = x => x.date >= pms && x.date <= pmSame;
    const bills = c.bills.filter(inM), prev = c.bills.filter(inP);
    const tot = net(bills), ptot = net(prev);
    const visits = c.visits.filter(v => inM(v) && v.status === 'done'), pvisits = c.visits.filter(v => inP(v) && v.status === 'done');
    const newP = c.patients.filter(p => !p.merged && p.since >= ms && p.since <= date), pnewP = c.patients.filter(p => !p.merged && p.since >= pms && p.since <= pmSame);
    const avg = bills.length ? tot / bills.length : 0, pavg = prev.length ? ptot / prev.length : 0;
    const vd = vdMap();
    const payouts = c.doctors.filter(d => d.visiting).map(d => { const v = net(bills.filter(b => vd[b.pid + b.date] === d.id)); return [d.name + ' (' + Math.round((d.share || .5) * 100) + '%)', Math.round(v * (d.share || .5))]; });
    const refsT = (c.refs || []).reduce((x, r) => x + r.amt, 0);
    const exps = (c.expenses || []).filter(inM);
    const groups = {}; exps.forEach(e => { const k = e.from === 'drawer' ? 'Petty cash (tea, courier, etc.)' : e.what; groups[k] = (groups[k] || 0) + e.amt; });
    const outs = payouts.map(([k, v]) => ['Doctor payout · ' + k, v]).concat(refsT ? [['Referral commissions', refsT]] : []).concat(Object.entries(groups).sort((a, b) => b[1] - a[1]));
    const outT = outs.reduce((x, o) => x + o[1], 0);
    const kept = tot - outT;
    const mName = MON[Number(ms.slice(5, 7)) - 1] + ' ' + ms.slice(0, 4);
    const partial = date === s.today && upto < 28;
    const right = '<div style="font-size:14px;font-weight:700">Monthly summary</div><div class="mut sm">' + mName + '</div><div class="mut sm">' + (partial ? '1–' + upto + ' ' + MON[Number(ms.slice(5, 7)) - 1].slice(0, 3) + ' (month so far)' : 'Full month') + '</div>';
    const spot = '<div class="g2"><div class="box tint" style="padding:13px 16px"><div class="lab">Collected</div><div class="big">' + rs(tot) + '</div><div class="sm" style="margin-top:4px">' + delta(tot, ptot, 'same days of ' + MON[Number(pms.slice(5, 7)) - 1]) + '</div></div>' +
      '<div class="box" style="padding:13px 16px;border-color:var(--k);border-width:1.5px"><div class="lab">What you kept</div><div class="big' + (kept < 0 ? ' bad' : '') + '">' + rs(kept) + '</div><div class="sm mut" style="margin-top:4px">after payouts, commissions and expenses of ' + rs(outT) + '</div></div></div>';
    const botNew = newP.filter(fromBot); const botMoney = net(bills.filter(b => fromBot(CD.P(b.pid))));
    const kpi = (l, v, pv, fmt) => '<div class="box"><div class="lab">' + l + '</div><div class="mid">' + fmt(v) + '</div><div class="sm ' + (Math.abs(pct(v, pv)) < 1 ? 'mut' : v >= pv ? 'ok' : 'bad') + '">' + (pv ? (Math.abs(pct(v, pv)) < 1 ? 'Same as' : (v >= pv ? '▲ ' : '▼ ') + Math.abs(pct(v, pv)) + '%') : '—') + ' <span class="mut">last month ' + fmt(pv) + '</span></div></div>';
    const kpis = '<div class="g4" style="margin-top:9px">' + kpi('Visits', visits.length, pvisits.length, String) + kpi('New patients', newP.length, pnewP.length, String) + kpi('Average bill', avg, pavg, rs) + '<div class="box"><div class="lab">From WhatsApp bot</div><div class="mid ok">' + botNew.length + ' new</div><div class="sm mut">' + rs(botMoney) + ' billed to bot patients</div></div></div>';
    const omx = Math.max(1, tot);
    const outTable = '<div class="sec">Money in → money out</div><table>' + barRow('Collected (after refunds)', tot, omx) + outs.map(([k, v]) => barRow(k, -v, omx, '', true)).join('') + '<tr class="tot"><td>What you kept</td><td></td><td class="num' + (kept < 0 ? ' bad' : '') + '">' + rs(kept) + '</td></tr></table><div class="sm mut" style="margin-top:3px">Margin ' + (tot ? Math.round(kept / tot * 100) : 0) + '% so far this month. Expenses as entered in Clinic Desk — your CA\'s books are final.</div>';
    const days = []; const last = partial ? upto : Number(CD.addDays(CD.addDays(ms, 32).slice(0, 8) + '01', -1).slice(8));
    for (let i = 1; i <= last; i++) { const d = ms.slice(0, 8) + String(i).padStart(2, '0'); days.push([d, net(bills.filter(b => b.date === d))]); }
    const dmax = Math.max(1, ...days.map(x => x[1])); const open = days.filter(x => x[1] > 0); const davg = open.length ? open.reduce((x, y) => x + y[1], 0) / open.length : 0;
    const W = 740, H = 90, bw = W / Math.max(days.length, 1), ay = H - davg / dmax * H;
    const chart = '<div class="sec">Day by day</div><svg width="100%" viewBox="0 0 ' + W + ' ' + (H + 16) + '" style="display:block">' + days.map(([d, v], i) => { const h = Math.round(v / dmax * H); return '<rect x="' + (i * bw + 2) + '" y="' + (H - h) + '" width="' + Math.max(2, bw - 4) + '" height="' + h + '" rx="2" fill="' + (d === date ? '#16213A' : '#8A6A1F') + '"></rect>' + ((i + 1) % 5 === 0 || i === 0 ? '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 12) + '" font-size="9" text-anchor="middle" fill="#5B6474">' + (i + 1) + '</text>' : ''); }).join('') + '<line x1="0" x2="' + W + '" y1="' + ay + '" y2="' + ay + '" stroke="#16213A" stroke-dasharray="3 3"></line><text x="2" y="' + (ay - 4) + '" font-size="9" fill="#16213A" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">average day ' + rs(davg) + '</text></svg>';
    const cats = [['Consultations', catSum(bills, 'consult')], ['Procedures', catSum(bills, 'procedure')], ['Medicines', catSum(bills, 'medicine')]];
    const cmx = Math.max(1, ...cats.map(x => x[1]));
    const docR = c.doctors.map(d => [d.name, net(bills.filter(b => vd[b.pid + b.date] === d.id)), visits.filter(x => x.doc === d.id).length + ' visits']);
    const dmx = Math.max(1, ...docR.map(x => x[1]));
    const modes = ['Cash', 'UPI', 'Card'].map(m => [m, net(bills.filter(b => b.mode === m))]);
    const col = { Cash: '#8A6A1F', UPI: '#16213A', Card: '#B9AE99' };
    const stack = '<div style="display:flex;height:13px;border-radius:7px;overflow:hidden;margin:4px 0 7px">' + modes.map(([m, v]) => '<i style="display:block;width:' + (tot ? v / tot * 100 : 0) + '%;background:' + col[m] + '"></i>').join('') + '</div>' + modes.map(([m, v]) => '<div style="display:flex;justify-content:space-between"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + col[m] + ';margin-right:6px"></span>' + m + '</span><span class="num">' + rs(v) + ' · ' + (tot ? Math.round(v / tot * 100) : 0) + '%</span></div>').join('');
    const tr = {}; bills.forEach(b => { if (fullRef(b)) return; b.items.forEach(i => { if (i.cat !== 'procedure') return; const k = i.n.replace(' (session)', ''); tr[k] = tr[k] || [0, 0]; tr[k][0]++; tr[k][1] += i.amt; }); });
    const top = Object.entries(tr).sort((a, b) => b[1][1] - a[1][1]).slice(0, 5);
    const oldV = visits.filter(v => c.visits.some(x => x.pid === v.pid && x.date < v.date)).length;
    const retPct = visits.length ? Math.round(oldV / visits.length * 100) : 0;
    const latest = {}; c.rx.forEach(r => { if (!latest[r.pid] || latest[r.pid].date < r.date) latest[r.pid] = r; });
    const lastV = {}; c.visits.forEach(v => { if (!lastV[v.pid] || lastV[v.pid] < v.date) lastV[v.pid] = v.date; });
    const overdue = Object.values(latest).filter(r => r.follow && r.follow < date && r.follow >= CD.addDays(date, -45) && !(lastV[r.pid] > r.date)).length;
    const gst = gstOf(bills);
    const taxable = bills.reduce((x, b) => x + (fullRef(b) ? 0 : b.items.reduce((y, i) => y + (i.gst ? i.amt / (1 + i.gst / 100) : 0), 0)), 0);
    const exempt = bills.reduce((x, b) => x + (fullRef(b) ? 0 : b.items.reduce((y, i) => y + (i.gst ? 0 : i.amt), 0)), 0);
    const grid = '<div class="g2">' +
      '<div class="avoid"><div class="sec">By service</div><table>' + cats.map(([k, v]) => barRow(k, v, cmx)).join('') + '</table></div>' +
      '<div class="avoid"><div class="sec">By doctor</div><table>' + docR.map(([k, v, sub]) => barRow(k, v, dmx, sub)).join('') + '</table></div>' +
      '<div class="avoid"><div class="sec">How patients paid</div>' + stack + '</div>' +
      '<div class="avoid"><div class="sec">Patients coming back</div><div style="display:flex;align-items:baseline;gap:10px"><span class="mid">' + retPct + '%</span><span class="sm">of visits were old patients coming back (' + oldV + ' of ' + visits.length + ')</span></div><div class="bar" style="margin-top:6px"><i style="width:' + retPct + '%"></i></div><div class="sm ' + (overdue ? 'bad' : 'mut') + '" style="margin-top:4px">' + overdue + ' patients missed a follow-up in the last 45 days — WhatsApp reminders go out automatically.</div></div>' +
      '<div class="avoid"><div class="sec">Top treatments</div><table>' + (top.length ? top.map(([k, v], i) => '<tr><td class="mut" style="width:16px">' + (i + 1) + '</td><td>' + esc(k) + '</td><td class="num mut">' + v[0] + '×</td><td class="num b">' + rs(v[1]) + '</td></tr>').join('') : '<tr><td class="mut">No procedures yet.</td></tr>') + '</table></div>' +
      '<div class="avoid"><div class="sec">GST for your CA</div><table><tr><td>Exempt · consultations (SAC 999312), medicines</td><td class="num">' + rs(exempt) + '</td></tr><tr><td>Taxable · cosmetic procedures (SAC 999722)</td><td class="num">' + rs(taxable) + '</td></tr><tr><td>CGST 9% + SGST 9%</td><td class="num">' + rs(gst / 2) + ' + ' + rs(gst / 2) + '</td></tr><tr class="tot"><td>GST to pay</td><td class="num">' + rs(gst) + '</td></tr></table>' + (c.gstin ? '<div class="sm mut">GSTIN ' + esc(c.gstin) + '</div>' : '') + '</div></div>';
    const dayRows = days.filter(x => c.bills.some(b => b.date === x[0]));
    const tbl = '<div class="sec">Every day</div><table><thead><tr><th>Date</th><th class="num">Bills</th><th class="num">Cash</th><th class="num">UPI</th><th class="num">Card</th><th class="num">Refunds</th><th class="num">Spent from drawer</th><th class="num">Net</th></tr></thead><tbody>' +
      dayRows.map(([d]) => { const bs = bills.filter(b => b.date === d); const m = k => net(bs.filter(b => b.mode === k)); const z = v => v ? rs(v) : '<span class="mut">–</span>'; const rf = bs.reduce((x, b) => x + (b.refund ? b.refund.amt : 0), 0); const pt = exps.filter(e => e.date === d && e.from === 'drawer').reduce((x, e) => x + e.amt, 0); return '<tr><td>' + CD.day(d) + '</td><td class="num">' + bs.length + '</td><td class="num">' + z(m('Cash')) + '</td><td class="num">' + z(m('UPI')) + '</td><td class="num">' + z(m('Card')) + '</td><td class="num' + (rf ? ' bad' : '') + '">' + (rf ? '− ' + rs(rf) : '<span class="mut">–</span>') + '</td><td class="num">' + (pt ? rs(pt) : '<span class="mut">–</span>') + '</td><td class="num b">' + rs(net(bs)) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>Total</td><td class="num">' + bills.length + '</td>' + modes.map(([, v]) => '<td class="num">' + rs(v) + '</td>').join('') + '<td class="num bad">− ' + rs(bills.reduce((x, b) => x + (b.refund ? b.refund.amt : 0), 0)) + '</td><td class="num">' + rs(exps.filter(e => e.from === 'drawer').reduce((x, e) => x + e.amt, 0)) + '</td><td class="num">' + rs(tot) + '</td></tr></tbody></table>';
    const foot = '<div class="foot"><span>' + esc(c.name) + ' · Monthly summary · generated by Clinic Desk on ' + CD.day(s.today) + '</span><span>Amounts are after refunds</span></div>';
    return page('A4') + CSS + '<div class="doc" style="--k:#8A6A1F;--t:#FBF5E7">' + head(c, right) + spot + kpis + outTable + chart + grid + tbl + foot + '</div>';
  };
})();
