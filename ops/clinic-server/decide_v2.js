// Clinic bot brain v2 - languages (English / Hinglish), photo confirmation, location pin,
// doctor commands (TODAY, LATE 30, LEAVE <date>, HELP) and the 8 AM doctor summary.
// All clinic details live in the "Clinic Settings" node.
const S = $('Clinic Settings').first().json;
const TZ = 'Asia/Kolkata';
const now = DateTime.now().setZone(TZ);
const mem = $getWorkflowStaticData('global');
mem.lang = mem.lang || {}; mem.seen = mem.seen || {}; mem.svc = mem.svc || {};
let msg = null;
try { msg = $('Parse message').first().json; } catch (e) { msg = null; }
const mode = msg ? 'chat' : 'summary';

// ---------- helpers ----------
function normDate(v) {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  for (const f of ['d LLL yyyy', 'd LLLL yyyy', 'd-LLL-yyyy', 'LLL d, yyyy']) {
    const d = DateTime.fromFormat(s, f, { locale: 'en' });
    if (d.isValid) return d.toFormat('yyyy-MM-dd');
  }
  if (/^\d+(\.\d+)?$/.test(s)) return DateTime.fromObject({ year: 1899, month: 12, day: 30 }).plus({ days: Math.floor(Number(s)) }).toFormat('yyyy-MM-dd');
  return s;
}
function normTime(v) {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v).trim().toUpperCase();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!m) return s;
  let h = Number(m[1]);
  if (m[3] === 'PM' && h < 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
const get = (r, k) => { const key = Object.keys(r).find(x => x.trim().toLowerCase() === k); return key ? r[key] : ''; };
const digits = v => String(v || '').replace(/\D/g, '');
const same = (a, b) => digits(a).slice(-10) === digits(b).slice(-10);

// ---------- read the sheet ----------
const rows = $('Read appointments').all().map(i => i.json).filter(r => r && r.row_number && get(r, 'date') !== '').map(r => ({
  row_number: r.row_number,
  name: String(get(r, 'name') || ''),
  phone: digits(get(r, 'phone')),
  email: String(get(r, 'email') || ''),
  date: normDate(get(r, 'date')),
  time: normTime(get(r, 'time')),
  status: String(get(r, 'status') || '').trim().toLowerCase(),
  bookedAt: String(get(r, 'booked at') || ''),
  lang: String(get(r, 'lang') || '').trim().toLowerCase(),
  service: String(get(r, 'service') || ''),
}));
const holdFresh = r => { const b = DateTime.fromISO(r.bookedAt); return b.isValid && b.plus({ minutes: S.holdMinutes }) > DateTime.now(); };
const takesSlot = r => !['cancelled', 'rescheduled'].includes(r.status) && (r.status !== 'holding' || holdFresh(r));
const at = (d, t) => DateTime.fromISO(`${d}T${t}`, { zone: TZ });
const active = r => ['booked', 'confirmed', 'sent', ''].includes(r.status) && at(r.date, r.time).isValid;

let holidays = [];
try { holidays = (($('Read holidays').first().json.values) || []).map(v => normDate(v[0])).filter(Boolean); } catch (e) {}

function slotsFor(dateStr) {
  if (holidays.includes(dateStr)) return [];
  const d = DateTime.fromISO(dateStr, { zone: TZ });
  const ranges = (S.hours || {})[d.toFormat('ccc').toLowerCase()] || [];
  const out = [];
  for (const r of ranges) {
    const [a, b] = r.split('-');
    let t = at(dateStr, a.trim());
    const end = at(dateStr, b.trim());
    while (t.plus({ minutes: S.slotMinutes }) <= end) {
      const hhmm = t.toFormat('HH:mm');
      const taken = rows.filter(x => takesSlot(x) && x.date === dateStr && x.time === hhmm).length;
      if (taken < S.patientsPerSlot && t >= now.plus({ minutes: S.bookBeforeMinutes })) out.push(hhmm);
      t = t.plus({ minutes: S.slotMinutes });
    }
  }
  return out;
}

// ---------- dates in English and Hinglish ----------
const HDAY = { Mon: 'Somvar', Tue: 'Mangalvar', Wed: 'Budhvar', Thu: 'Guruvar', Fri: 'Shukravar', Sat: 'Shanivar', Sun: 'Ravivar' };
function partOfDay(dt) { const h = dt.hour; return h < 12 ? 'subah' : h < 16 ? 'dopahar' : h < 19 ? 'shaam' : 'raat'; }
function dayWord(d, lg) {
  const diff = Math.round(d.startOf('day').diff(now.startOf('day'), 'days').days);
  if (lg === 'hl') return diff === 0 ? 'Aaj' : diff === 1 ? 'Kal' : '';
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : '';
}
function whenText(dStr, tStr, lg) {
  const dt = at(dStr, tStr);
  const w = dayWord(dt, lg);
  if (lg === 'hl') return `${w ? w + ', ' : ''}${HDAY[dt.toFormat('ccc')]} ${dt.toFormat('d LLL')}, ${partOfDay(dt)} ${dt.toFormat('h:mm')}`;
  return `${w ? w + ', ' : ''}${dt.toFormat('ccc d LLL')} at ${dt.toFormat('h:mm a')}`;
}
function dateLabel(dStr, lg) {
  const d = DateTime.fromISO(dStr, { zone: TZ });
  const w = dayWord(d, lg);
  if (lg === 'hl') return `${w ? w + ', ' : HDAY[d.toFormat('ccc')] + ', '}${d.toFormat('d LLL')}`;
  return `${w ? w + ', ' : d.toFormat('ccc') + ', '}${d.toFormat('d LLL')}`;
}
const timeLabel = (dStr, tStr, lg) => { const dt = at(dStr, tStr); return lg === 'hl' ? `${partOfDay(dt)} ${dt.toFormat('h:mm')}` : dt.toFormat('h:mm a'); };
function timingsText(lg) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return days.map(k => {
    const label = lg === 'hl' ? HDAY[k[0].toUpperCase() + k.slice(1)] : k[0].toUpperCase() + k.slice(1);
    const r = (S.hours[k] || []);
    const v = r.length ? r.map(x => x.split('-').map(y => DateTime.fromFormat(y.trim(), 'HH:mm').toFormat('h:mm a')).join(' - ')).join(', ') : (lg === 'hl' ? 'Band' : 'Closed');
    return `${label}: ${v}`;
  }).join('\n');
}

// ---------- all patient-facing text ----------
const C = S.clinicName, D = S.doctorName;
const T = {
  en: {
    pickLang: `Hello, welcome to ${C}.\nPlease choose your language.\n\nNamaste, apni bhasha chuniye.`,
    welcome: n => `Hello ${n}, welcome to ${C}.\nI can help you book an appointment with ${D}.\n\nWhat would you like to book?`,
    pickDate: 'Please choose a date for your appointment.',
    pickSvc: 'What would you like to book?', svcBtn: 'Choose', svcTitle: 'Treatments',
    svcChosen: n => `${n}. Please choose a date.`,
    dateBtn: 'Choose date', datesTitle: 'Available dates', slotsFree: n => `${n} slot${n > 1 ? 's' : ''} available`,
    noSlots: `Sorry, there are no free slots in the next ${S.daysAhead} days. Please call us on ${S.clinicPhone}.`,
    dayFull: 'That day is now full. Please choose another date.',
    timesFor: d => `Available times on ${d}:`, timeBtn: 'Choose time', timesTitle: 'Available times', later: 'Later times',
    held: w => `${w} is reserved for you for ${S.holdMinutes} minutes.\n\nWho is the appointment for? Tap *Myself* or type the patient's name.`,
    selfBtn: 'Myself',
    askName: "Please type the patient's full name (for example: Riya Sharma), or tap *Myself*.",
    confirmed: (r, w) => `Your appointment is confirmed.\n\n*${D}*\n${C}\n\n📅 ${w}\n👤 ${r.name}${r.service ? `\n💆 ${r.service}` : ''}\n\nPlease arrive 10 minutes early and bring any previous reports or prescriptions. We will send you a reminder before your visit.`,
    changeBtn: 'Change time', cancelBtn: 'Cancel',
    holdCancelled: 'No problem, the slot has been released. Send *Hi* whenever you want to book again.',
    limit: n => `You already have ${n} upcoming appointments, which is the maximum. Please cancel one to book a new time.`,
    noUpcoming: "You don't have any upcoming appointments.",
    cancelQ: (r, w) => `Do you want to cancel this appointment?\n\n👤 ${r.name || 'Patient'}\n📅 ${w}`,
    yesCancel: 'Yes, cancel', keepBtn: 'No, keep it',
    whichCancel: 'Which appointment would you like to cancel?', chooseBtn: 'Choose', yourTitle: 'Your appointments',
    cancelled: w => `Your appointment on ${w} has been cancelled.\nSend *Hi* whenever you want to book again.`,
    gone: 'This appointment has already been cancelled or completed.',
    kept: 'Okay, your appointment remains as scheduled.',
    thanksConfirm: w => `Thank you for confirming. ${D} will see you on ${w}.`,
    reschedule: 'Sure. Your earlier slot has been released. Please choose a new date.',
    talk: `You can reach ${C} on ${S.clinicPhone}.\n\nClinic timings:\n${timingsText('en')}`,
    textOnly: 'Sorry, I can only read text messages. Please type your message or choose an option below.',
    yourAppts: (n, l) => `Hello ${n}, here are your upcoming appointments at ${C}:\n\n${l}`,
    bookBtn: 'Book appointment', anotherBtn: 'Book another', cancelBookingBtn: 'Cancel booking', talkBtn: 'Contact clinic',
    mcQ: 'Sure, please type your question here and the clinic will reply shortly.',
    mcCall: 'Thank you. The clinic will call you back shortly.',
    foot: 'Type TALK to contact the clinic',
    lateMsg: (m, t2) => `${D} is running about ${m} minutes late today. Your appointment may start at around ${t2}. We are sorry for the wait.`,
    leaveMsg: d => `${D} will not be available on ${d}. We are sorry for the inconvenience. Please choose a new time or cancel below.`,
    okBtn: 'Okay', newTimeBtn: 'Choose new time',
  },
  hl: {
    pickLang: `Namaste, ${C} mein aapka swagat hai.\nApni bhasha chuniye.\n\nHello, please choose your language.`,
    welcome: n => `Namaste ${n} ji, ${C} mein aapka swagat hai.\n${D} ke saath appointment book karne ke liye neeche treatment chuniye.`,
    pickDate: 'Appointment ke liye date chuniye.',
    pickSvc: 'Aap kis cheez ke liye appointment lena chahte hain?', svcBtn: 'Chuniye', svcTitle: 'Treatments',
    svcChosen: n => `${n}. Ab date chuniye.`,
    dateBtn: 'Date chuniye', datesTitle: 'Khaali dates', slotsFree: n => `${n} slot khaali`,
    noSlots: `Maaf kijiye, agle ${S.daysAhead} din mein koi slot khaali nahi hai. Kripya clinic ko call karein: ${S.clinicPhone}`,
    dayFull: 'Ye din ab full ho gaya hai. Kripya doosri date chuniye.',
    timesFor: d => `${d} ke khaali time:`, timeBtn: 'Time chuniye', timesTitle: 'Khaali time', later: 'Aur time',
    held: w => `${w} aapke liye ${S.holdMinutes} minute ke liye rok diya gaya hai.\n\nAppointment kiske liye hai? *Mere liye* dabaiye ya patient ka naam likhiye.`,
    selfBtn: 'Mere liye',
    askName: 'Kripya patient ka poora naam likhiye (jaise: Riya Sharma), ya *Mere liye* dabaiye.',
    confirmed: (r, w) => `Aapka appointment confirm ho gaya hai.\n\n*${D}*\n${C}\n\n📅 ${w}\n👤 ${r.name}${r.service ? `\n💆 ${r.service}` : ''}\n\nKripya 10 minute pehle aayein aur purani reports ya prescription saath layein. Visit se pehle hum aapko reminder bhejenge.`,
    changeBtn: 'Time badlein', cancelBtn: 'Cancel karein',
    holdCancelled: 'Koi baat nahi, slot chhod diya gaya hai. Jab chahein *Hi* bhejkar dobara book kar sakte hain.',
    limit: n => `Aapke ${n} appointment pehle se hain, jo maximum hai. Naya time lene ke liye pehle ek cancel karein.`,
    noUpcoming: 'Aapka koi upcoming appointment nahi hai.',
    cancelQ: (r, w) => `Kya aap ye appointment cancel karna chahte hain?\n\n👤 ${r.name || 'Patient'}\n📅 ${w}`,
    yesCancel: 'Haan, cancel karein', keepBtn: 'Nahi, rehne dein',
    whichCancel: 'Kaunsa appointment cancel karna hai?', chooseBtn: 'Chuniye', yourTitle: 'Aapke appointment',
    cancelled: w => `${w} wala appointment cancel ho gaya hai.\nJab chahein *Hi* bhejkar dobara book kar sakte hain.`,
    gone: 'Ye appointment pehle hi cancel ya poora ho chuka hai.',
    kept: 'Theek hai, aapka appointment jaisa tha waisa hi rahega.',
    thanksConfirm: w => `Confirm karne ke liye dhanyavaad. ${D} aapse ${w} milenge.`,
    reschedule: 'Zaroor. Aapka purana slot chhod diya gaya hai. Kripya nayi date chuniye.',
    talk: `${C} se baat karne ke liye call karein: ${S.clinicPhone}\n\nClinic ka samay:\n${timingsText('hl')}`,
    textOnly: 'Maaf kijiye, main sirf text message padh sakta hoon. Kripya likhkar bhejiye ya neeche se option chuniye.',
    yourAppts: (n, l) => `Namaste ${n} ji, ${C} mein aapke upcoming appointment:\n\n${l}`,
    bookBtn: 'Appointment lein', anotherBtn: 'Ek aur book karein', cancelBookingBtn: 'Cancel karein', talkBtn: 'Clinic se baat',
    mcQ: 'Zaroor, apna sawaal yahin likhiye. Clinic jaldi jawab dega.',
    mcCall: 'Dhanyavaad. Clinic aapko jaldi call karega.',
    foot: 'Clinic se baat ke liye TALK likhein',
    lateMsg: (m, t2) => `${D} aaj lagbhag ${m} minute late hain. Aapka appointment lagbhag ${t2} tak shuru hoga. Intezaar ke liye maafi chahte hain.`,
    leaveMsg: d => `${D} ${d} ko clinic mein nahi honge. Asuvidha ke liye maafi chahte hain. Kripya neeche se naya time chuniye ya cancel karein.`,
    okBtn: 'Theek hai', newTimeBtn: 'Naya time chuniye',
  },
};

// ---------- message builders (to = phone number) ----------
const textTo = (to, body) => ({ messaging_product: 'whatsapp', to, type: 'text', text: { body } });
const buttonsTo = (to, body, btns, header, footer) => {
  const p = { messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: { type: 'button', body: { text: body }, action: { buttons: btns.slice(0, 3).map(b => ({ type: 'reply', reply: { id: b[0], title: b[1].slice(0, 20) } })) } } };
  if (header) p.interactive.header = header;
  if (footer) p.interactive.footer = { text: footer.slice(0, 60) };
  return p;
};
const listTo = (to, body, button, title, rowsOut, lg) => ({ messaging_product: 'whatsapp', to, type: 'interactive',
  interactive: { type: 'list', header: { type: 'text', text: String(C).slice(0, 60) }, body: { text: body }, footer: { text: T[lg].foot },
    action: { button: button.slice(0, 20), sections: [{ title: title.slice(0, 24), rows: rowsOut.slice(0, 10) }] } } });
const locationTo = to => (S.location && S.location.lat) ? { messaging_product: 'whatsapp', to, type: 'location',
  location: { latitude: S.location.lat, longitude: S.location.lng, name: C, address: S.address } } : null;
const templateTo = (to, name, params, btnPayloads) => ({ messaging_product: 'whatsapp', to, type: 'template',
  template: { name, language: { code: S.templateLanguage || 'en' }, components: [
    { type: 'body', parameters: params.map(x => ({ type: 'text', text: String(x).replace(/\s*\n\s*/g, ' ').slice(0, 900) })) },
    ...(btnPayloads || []).map((pl, i) => ({ type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload: pl }] })),
  ] } });
const inWindow = to => { const s = mem.seen[digits(to)]; return s && DateTime.fromISO(s) > now.minus({ hours: 23 }); };
const langOf = (phone, rowLang) => mem.lang[digits(phone)] || (['en', 'hl'].includes(rowLang) ? rowLang : (S.defaultLang || 'hl'));

let action = 'reply', payload = null, rec = null, notify = false, holiday = null;
const more = [];

// ================= 8 AM doctor summary (no patient message in this run) =================
if (mode === 'summary') {
  const today = now.toFormat('yyyy-MM-dd');
  const list = rows.filter(r => r.date === today && active(r)).sort((a, b) => a.time.localeCompare(b.time));
  const lines = list.map(r => `${at(r.date, r.time).toFormat('h:mm a')}  ${r.name || 'Patient'}${r.status === 'confirmed' ? '  ✓' : ''}`);
  const dateTxt = now.toFormat('ccc, d LLL');
  for (const doc of (S.doctorNumbers || [])) {
    if (inWindow(doc)) {
      more.push(textTo(doc, list.length
        ? `Good morning ${D}.\nToday (${dateTxt}) you have ${list.length} appointment${list.length > 1 ? 's' : ''}:\n\n${lines.join('\n')}\n\n✓ = confirmed by patient\nReply LATE 30 or LEAVE TODAY if your plans change.`
        : `Good morning ${D}.\nThere are no appointments booked for today (${dateTxt}).`));
    } else {
      more.push(templateTo(doc, S.templates.summary, [D, dateTxt, String(list.length), lines.length ? lines.join(' · ') : 'No appointments booked'], []));
    }
  }
  if (!more.length) return [];
  payload = more.shift();
  return [{ json: { action: 'reply', payload, more, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
}

// ================= a message from WhatsApp =================
const me = digits(msg.from);
mem.seen[me] = now.toISO();
let id = String(msg.replyId || '').trim();
const raw = String(msg.text || '').trim();
const t = raw.toLowerCase();
const has = words => words.some(w => new RegExp(`(^|\\W)${w}(\\W|$)`, 'i').test(t));
const isAdmin = (S.adminNumbers || []).some(a => same(a, me));
const mine = rows.filter(r => same(r.phone, me));
const upcoming = mine.filter(r => active(r) && at(r.date, r.time) >= now).sort((a, b) => at(a.date, a.time) - at(b.date, b.time));
const holding = mine.filter(r => r.status === 'holding' && holdFresh(r)).sort((a, b) => b.row_number - a.row_number)[0];
const setStatus = (r, status, name) => { action = 'update'; rec = { ...r, status, name: name !== undefined ? name : r.name }; };
const byRow = n => mine.find(r => String(r.row_number) === String(n));

// language
if (id.startsWith('LANG|')) { mem.lang[me] = id.split('|')[1] === 'en' ? 'en' : 'hl'; }
if (id.startsWith('MC_') && !mem.lang[me]) mem.lang[me] = 'hl';
const lang = langOf(me, (mine[0] || {}).lang);
const L = T[lang];
const W = r => whenText(r.date, r.time, lang);
const text = body => textTo(msg.from, body);
const buttons = (body, btns, header, footer) => buttonsTo(msg.from, body, btns, header, footer);
const list = (body, button, title, rowsOut) => listTo(msg.from, body, button, title, rowsOut, lang);

const canBookMore = upcoming.length < S.maxBookingsPerPhone;
const menuBtns = () => [canBookMore ? ['NEW', upcoming.length ? L.anotherBtn : L.bookBtn] : null, upcoming.length ? ['CANCEL', L.cancelBookingBtn] : null, ['TALK', L.talkBtn]].filter(Boolean);
function dateList(intro) {
  const out = [];
  for (let i = 0; i <= S.daysAhead && out.length < 10; i++) {
    const d = now.plus({ days: i }).toFormat('yyyy-MM-dd');
    const n = slotsFor(d).length;
    if (n > 0) out.push({ id: `D|${d}`, title: dateLabel(d, lang).slice(0, 24), description: L.slotsFree(n) });
  }
  if (!out.length) return text(`${intro}\n\n${L.noSlots}`);
  return list(intro, L.dateBtn, L.datesTitle, out);
}
function timeList(d, after) {
  let s = slotsFor(d);
  if (after) s = s.filter(x => x > after);
  if (!s.length) return dateList(L.dayFull);
  let out;
  if (s.length > 10) {
    out = s.slice(0, 9).map(x => ({ id: `S|${d}|${x}`, title: timeLabel(d, x, lang) }));
    out.push({ id: `M|${d}|${s[8]}`, title: L.later });
  } else out = s.map(x => ({ id: `S|${d}|${x}`, title: timeLabel(d, x, lang) }));
  return list(L.timesFor(dateLabel(d, lang)), L.timeBtn, L.timesTitle, out);
}
const svcs = S.services || [];
const svcName = sid => { const x = svcs.find(v => v.id === sid); return x ? x.name : ''; };
function svcList(intro) {
  if (!svcs.length) return dateList(intro);
  return list(intro, L.svcBtn, L.svcTitle, svcs.slice(0, 10).map(v => ({ id: `TR|${v.id}`, title: v.name.slice(0, 24), description: (lang === 'hl' ? v.hl : v.en || '').slice(0, 72) })));
}
const cleanName = s => s.replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).replace(/\b\p{L}/gu, c => c.toUpperCase());
const confirmMsg = r => buttons(L.confirmed(r, W(r)), [[`RR|${r.row_number}`, L.changeBtn], [`RX|${r.row_number}`, L.cancelBtn]],
  S.confirmImage ? { type: 'image', image: { link: S.confirmImage } } : null, `${C} · ${S.clinicPhone}`);
const pin = () => { const p = locationTo(msg.from); if (p) more.push(p); };

// ---------- doctor / reception commands ----------
const cmd = raw.toUpperCase().replace(/\s+/g, ' ').trim();
const adminCmd = isAdmin && !id && /^(TODAY|AAJ|LATE\b|LEAVE\b|HELP|ADMIN)/.test(cmd);
function parseLeaveDate(s) {
  const x = s.replace(/^LEAVE\s*/, '').trim();
  if (!x || x === 'TODAY' || x === 'AAJ') return now.toFormat('yyyy-MM-dd');
  if (x === 'TOMORROW' || x === 'KAL') return now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
  let d = normDate(x);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  for (const f of ['d LLL', 'd LLLL', 'd MMM', 'd/M', 'd-M']) {
    const dt = DateTime.fromFormat(x, f, { locale: 'en', zone: TZ });
    if (dt.isValid) { let y = dt.set({ year: now.year }); if (y < now.startOf('day')) y = y.plus({ years: 1 }); return y.toFormat('yyyy-MM-dd'); }
  }
  return '';
}
function notifyPatient(r, bodyByLang, tplParams, btns) {
  const lg = langOf(r.phone, r.lang);
  const btnDefs = btns.map(([pl, key]) => [pl, T[lg][key]]);
  if (inWindow(r.phone)) more.push(buttonsTo(r.phone, bodyByLang(lg), btnDefs));
  else more.push(templateTo(r.phone, lg === 'hl' ? S.templates.updateHl : S.templates.updateEn,
    [r.name || 'Patient', C, whenText(r.date, r.time, lg), bodyByLang(lg)], btns.map(b => b[0])));
}

if (adminCmd) {
  const today = now.toFormat('yyyy-MM-dd');
  if (/^(TODAY|AAJ)/.test(cmd)) {
    const l = rows.filter(r => r.date === today && active(r)).sort((a, b) => a.time.localeCompare(b.time));
    payload = text(l.length ? `Today (${now.toFormat('ccc, d LLL')}): ${l.length} appointment${l.length > 1 ? 's' : ''}\n\n${l.map(r => `${at(r.date, r.time).toFormat('h:mm a')}  ${r.name || 'Patient'}  (+${r.phone})${r.status === 'confirmed' ? '  ✓' : ''}`).join('\n')}\n\n✓ = confirmed by patient`
      : `No appointments booked for today (${now.toFormat('ccc, d LLL')}).`);
  } else if (/^LATE/.test(cmd)) {
    const m = Number((cmd.match(/\d+/) || [])[0] || 0);
    if (!m) payload = text('Please send the delay in minutes, for example: LATE 30');
    else {
      const l = rows.filter(r => r.date === today && active(r) && at(r.date, r.time) >= now.minus({ minutes: 15 }));
      l.forEach(r => notifyPatient(r, lg => T[lg].lateMsg(m, at(r.date, r.time).plus({ minutes: m }).toFormat('h:mm a')), null, [[`UK|${r.row_number}`, 'okBtn'], [`RR|${r.row_number}`, 'changeBtn'], [`RX|${r.row_number}`, 'cancelBtn']]));
      payload = text(l.length ? `Done. ${l.length} patient${l.length > 1 ? 's' : ''} with an appointment later today ${l.length > 1 ? 'have' : 'has'} been told you are running about ${m} minutes late.` : 'There are no more appointments today, so nobody needed to be told.');
    }
  } else if (/^LEAVE/.test(cmd)) {
    const d = parseLeaveDate(cmd);
    if (!d) payload = text('I could not read that date. Examples: LEAVE TODAY, LEAVE TOMORROW, LEAVE 20 Nov');
    else {
      const l = rows.filter(r => r.date === d && active(r));
      l.forEach(r => notifyPatient(r, lg => T[lg].leaveMsg(dateLabel(d, lg)), null, [[`RR|${r.row_number}`, 'newTimeBtn'], [`RX|${r.row_number}`, 'cancelBtn']]));
      if (!holidays.includes(d)) holiday = [[d, 'Doctor on leave (set by WhatsApp)']];
      payload = text(`Done. ${DateTime.fromISO(d).toFormat('ccc, d LLL')} is now closed for new bookings.\n${l.length ? `${l.length} patient${l.length > 1 ? 's' : ''} booked on that day ${l.length > 1 ? 'have' : 'has'} been asked to choose a new time.` : 'Nobody was booked on that day.'}`);
    }
  } else {
    payload = text('Clinic commands (send from this number):\n\nTODAY - list of today\'s appointments\nLATE 30 - tell today\'s patients the doctor is 30 min late\nLEAVE TODAY / LEAVE TOMORROW / LEAVE 20 Nov - close that day and ask booked patients to choose a new time\n\nEvery morning at 8 AM you also get the day\'s list here.');
  }
}
// ---------- patients ----------
else if (id === 'MC_Q') { payload = text(L.mcQ); }
else if (id === 'MC_CALL') { notify = true; payload = text(L.mcCall); }
else if (!['text', 'interactive', 'button'].includes(msg.type)) { payload = buttons(L.textOnly, menuBtns()); }
else if (!mem.lang[me] && !id && !upcoming.length && !holding) {
  payload = buttons(T.en.pickLang, [['LANG|en', 'English'], ['LANG|hl', 'Hinglish']]);
}
else if (!id && has(['language', 'bhasha', 'lang'])) {
  payload = buttons(T.en.pickLang, [['LANG|en', 'English'], ['LANG|hl', 'Hinglish']]);
}
else if (holding && (id === 'SELF' || (!id && raw && !raw.includes('?') && raw.split(/\s+/).length <= 4 && !has(['cancel', 'hi', 'hello', 'menu', 'book', 'talk', 'help'])))) {
  const name = id === 'SELF' ? cleanName(msg.name) || 'Patient' : cleanName(raw);
  if (!name || name.length < 2) payload = buttons(L.askName, [['SELF', L.selfBtn]]);
  else { setStatus(holding, 'Booked', name); payload = confirmMsg({ ...holding, name }); pin(); }
}
else if (holding && has(['cancel'])) { setStatus(holding, 'Cancelled'); payload = text(L.holdCancelled); }
else if (id.startsWith('TR|')) { mem.svc[me] = id.split('|')[1]; payload = dateList(L.svcChosen(svcName(mem.svc[me]))); }
else if (id.startsWith('S|')) {
  const [, d, tm] = id.split('|');
  if (!canBookMore) payload = buttons(L.limit(upcoming.length), [['CANCEL', L.cancelBookingBtn], ['TALK', L.talkBtn]]);
  else if (!slotsFor(d).includes(tm)) payload = timeList(d);
  else {
    action = 'append';
    rec = { name: '', phone: me, email: '', date: d, time: tm, status: 'Holding', bookedAt: DateTime.now().toISO(), lang, service: svcName(mem.svc[me]) };
    payload = buttons(L.held(whenText(d, tm, lang)), [['SELF', L.selfBtn]]);
  }
}
else if (id.startsWith('M|')) { const [, d, after] = id.split('|'); payload = timeList(d, after); }
else if (id.startsWith('D|')) { payload = timeList(id.split('|')[1]); }
else if (id.startsWith('RC|')) {
  const r = byRow(id.split('|')[1]);
  if (r && active(r)) { setStatus(r, 'Confirmed'); payload = text(L.thanksConfirm(W(r))); pin(); } else payload = text(L.gone);
}
else if (id.startsWith('UK|')) { payload = text(L.kept); }
else if (id.startsWith('RR|')) {
  const r = byRow(id.split('|')[1]);
  if (r && active(r)) { const sv = svcs.find(v => v.name === r.service); if (sv) mem.svc[me] = sv.id; setStatus(r, 'Rescheduled'); payload = dateList(L.reschedule); } else payload = svcList(L.pickSvc);
}
else if (id.startsWith('RX|')) {
  const r = byRow(id.split('|')[1]);
  payload = (r && active(r)) ? buttons(L.cancelQ(r, W(r)), [[`CY|${r.row_number}`, L.yesCancel], ['KEEP', L.keepBtn]]) : text(L.gone);
}
else if (id === 'NEW' || id.startsWith('LANG|') || (!id && has(['book', 'booking', 'appointment']) && !has(['cancel']))) {
  if (id.startsWith('LANG|') && upcoming.length) payload = buttons(L.yourAppts(msg.name, upcoming.map(r => `• ${r.name || 'Patient'}: ${W(r)}`).join('\n')), menuBtns());
  else if (id.startsWith('LANG|')) payload = svcList(L.welcome(msg.name));
  else payload = canBookMore ? svcList(L.pickSvc) : buttons(L.limit(upcoming.length), [['CANCEL', L.cancelBookingBtn]]);
}
else if (id === 'CANCEL' || (!id && has(['cancel']))) {
  if (!upcoming.length) payload = buttons(L.noUpcoming, [['NEW', L.bookBtn]]);
  else if (upcoming.length === 1) { const r = upcoming[0]; payload = buttons(L.cancelQ(r, W(r)), [[`CY|${r.row_number}`, L.yesCancel], ['KEEP', L.keepBtn]]); }
  else payload = list(L.whichCancel, L.chooseBtn, L.yourTitle, upcoming.map(r => ({ id: `CX|${r.row_number}`, title: (r.name || 'Patient').slice(0, 24), description: W(r).slice(0, 72) })));
}
else if (id.startsWith('CX|')) {
  const r = upcoming.find(x => String(x.row_number) === id.split('|')[1]);
  payload = r ? buttons(L.cancelQ(r, W(r)), [[`CY|${r.row_number}`, L.yesCancel], ['KEEP', L.keepBtn]]) : text(L.gone);
}
else if (id.startsWith('CY|')) {
  const r = upcoming.find(x => String(x.row_number) === id.split('|')[1]);
  if (r) { setStatus(r, 'Cancelled'); payload = text(L.cancelled(W(r))); } else payload = text(L.gone);
}
else if (id === 'KEEP') { payload = text(L.kept); }
else if (id === 'CONFIRM' || (!id && ['confirm', 'yes', 'haan', 'ha'].includes(t))) {
  if (upcoming.length) { const r = upcoming[0]; setStatus(r, 'Confirmed'); payload = text(L.thanksConfirm(W(r))); pin(); }
  else payload = buttons(L.noUpcoming, [['NEW', L.bookBtn]]);
}
else if (id === 'TALK' || (!id && has(['talk', 'call', 'human', 'help', 'baat', 'emergency', 'address', 'location', 'kahan']))) {
  payload = text(L.talk); pin();
}
else {
  const faq = (S.faq || []).find(f => !id && f.keywords.some(k => has([k])));
  if (faq) {
    const answer = faq.answer === '{timings}' ? (lang === 'hl' ? 'Clinic ka samay:\n' : 'Clinic timings:\n') + timingsText(lang) : faq.answer;
    payload = buttons(answer, [['NEW', L.bookBtn], ['TALK', L.talkBtn]]);
  } else if (upcoming.length) {
    payload = buttons(L.yourAppts(msg.name, upcoming.map(r => `• ${r.name || 'Patient'}: ${W(r)}`).join('\n')), menuBtns());
  } else {
    payload = svcList(L.welcome(msg.name));
  }
}

// ---------- what to write in the sheet ----------
const tab = `'${S.sheetTab}'`;
let range = null, values = null;
if (rec) {
  if (action === 'append') { values = [[rec.name, rec.phone, rec.email, rec.date, rec.time, rec.status, rec.bookedAt, '', rec.lang, rec.service || '']]; range = `${tab}!A:J`; }
  else { values = [[rec.name, rec.phone, rec.email, rec.date, rec.time, rec.status, rec.bookedAt]]; range = `${tab}!A${rec.row_number}:G${rec.row_number}`; }
}
return [{ json: { action, payload, more, holiday, values, range: range ? encodeURIComponent(range) : null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify, from: msg.from, patientName: msg.name, clinicName: C } }];
