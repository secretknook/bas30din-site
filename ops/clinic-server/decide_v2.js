// Clinic bot brain v2 - languages (English / Hinglish), photo confirmation, location pin,
// doctor commands (TODAY, LATE 30, LEAVE <date>, HELP) and the 8 AM doctor summary.
// All clinic details live in the "Clinic Settings" node.
const S = $('Clinic Settings').first().json;
const TZ = 'Asia/Kolkata';
const now = DateTime.now().setZone(TZ);
const mem = $getWorkflowStaticData('global');
for (const k of ['lang', 'seen', 'svc', 'wait', 'live', 'liveAdmin']) if (!mem[k]) mem[k] = {};
let deskReq = null;
try { deskReq = $('Desk API (POST)').first().json.body || {}; } catch (e) { deskReq = null; }
let msg = null;
if (!deskReq) { try { msg = $('Parse message').first().json; } catch (e) { msg = null; } }
const mode = deskReq ? 'desk' : msg ? 'chat' : 'summary';

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
let sheetRows = [];
try { sheetRows = $('Read appointments').all(); } catch (e) { sheetRows = []; }
const rows = sheetRows.map(i => i.json).filter(r => r && r.row_number && get(r, 'date') !== '').map(r => ({
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
  if (lg === 'hl') return `${w ? w + ', ' : ''}${dt.toFormat('ccc d LLL')}, ${dt.toFormat('h:mm a')}`;
  return `${w ? w + ', ' : ''}${dt.toFormat('ccc d LLL')} at ${dt.toFormat('h:mm a')}`;
}
function dateLabel(dStr, lg) {
  const d = DateTime.fromISO(dStr, { zone: TZ });
  const w = dayWord(d, lg);
  return `${w ? w + ', ' : d.toFormat('ccc') + ', '}${d.toFormat('d LLL')}`;
}
const timeLabel = (dStr, tStr, lg) => { const dt = at(dStr, tStr); return dt.toFormat('h:mm a'); };
function timingsText(lg) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return days.map(k => {
    const label = k[0].toUpperCase() + k.slice(1);
    const r = (S.hours[k] || []);
    const v = r.length ? r.map(x => x.split('-').map(y => DateTime.fromFormat(y.trim(), 'HH:mm').toFormat('h:mm a')).join(' - ')).join(', ') : 'Closed';
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
    earliest: 'Earliest free slot', waitRow: 'None of these work?', waitRowD: 'Join the waitlist for a day',
    waitPick: 'Which day do you want? If a slot opens up that day, we will message you right away.',
    waitDone: d => `Done. You are on the waitlist for ${d}. The moment a slot opens, we will message you here.`,
    slotOpen: (d) => `Good news: a slot just opened on ${d}. Tap below to book it before someone else does.`, bookIt: 'Book this slot',
    feeLine: f => `\n💰 Consultation fee ₹${f}, pay at the clinic. No booking charge.`,
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
    liveRow: 'Live Chat', liveRowD: 'Chat with the clinic team',
    liveOn: open => open ? 'You are now on live chat with the clinic team. They will reply here shortly.\n\nType *END* anytime to go back to booking.' : `You are now on live chat. The clinic is closed right now, so the team will reply when it opens.\n\nClinic timings:\n${timingsText('en')}\n\nType *END* anytime to go back to booking.`,
    liveOff: 'Live chat ended. Thank you! Send *Hi* anytime to book an appointment.',
    livePhoto: 'Photos can not be shared on live chat yet. Please describe it in text, or the team can call you.',
    dateBtn: 'Choose date', datesTitle: 'Available dates', slotsFree: n => `${n} slot${n > 1 ? 's' : ''} available`,
    noSlots: `Sorry, there are no free slots in the next ${S.daysAhead} days. Please call us on ${S.clinicPhone}.`,
    dayFull: 'That day is now full. Please choose another date.',
    timesFor: d => `Available times on ${d}:`, timeBtn: 'Choose time', timesTitle: 'Available times', later: 'Later times',
    held: w => `${w} is reserved for you for ${S.holdMinutes} minutes.\n\nWho is the appointment for? Tap *Myself* or type the patient's name.`,
    selfBtn: 'Myself',
    askName: "Please type the patient's full name (for example: Riya Sharma), or tap *Myself*.",
    confirmed: (r, w) => `Your appointment is confirmed.\n\n*${D}*\n${C}\n\n📅 ${w}\n👤 ${r.name}${r.service ? `\n💆 ${r.service}` : ''}${S.fee ? T.en.feeLine(S.fee) : ''}\n\nPlease arrive 10 minutes early and bring any previous reports or prescriptions. We will send you a reminder before your visit.`,
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
    bookBtn: 'Book appointment', anotherBtn: 'Book another', cancelBookingBtn: 'Cancel booking', talkBtn: 'Live Chat',
    mcQ: 'Sure, please type your question here and the clinic will reply shortly.',
    mcCall: 'Thank you. The clinic will call you back shortly.',
    foot: 'Need help? Tap Live Chat',
    lateMsg: (m, t2) => `${D} is running about ${m} minutes late today. Your appointment may start at around ${t2}. We are sorry for the wait.`,
    leaveMsg: d => `${D} will not be available on ${d}. We are sorry for the inconvenience. Please choose a new time or cancel below.`,
    okBtn: 'Okay', newTimeBtn: 'Choose new time',
  },
  hl: {
    pickLang: `Namaste 🙏 ${C} mein aapka swagat hai.\nAap kis language mein baat karna chahenge?\n\nHello! Please choose your language.`,
    welcome: n => `Namaste ${n} ji 🙏\n${C} mein aapka swagat hai. Yahan aap ${D} ke saath appointment book kar sakte hain.\n\nBataiye, aapko kis cheez ke liye milna hai?`,
    pickDate: 'Aap kis din aana chahenge?',
    pickSvc: 'Bataiye, aapko kis cheez ke liye appointment chahiye?', svcBtn: 'Select karein', svcTitle: 'Treatments',
    svcChosen: n => `${n} 👍\nAb bataiye, aap kis din aana chahenge?`,
    earliest: 'Sabse pehla free slot', waitRow: 'Koi time suit nahi?', waitRowD: 'Waitlist mein naam daalein',
    waitPick: 'Aapko kis din chahiye? Us din koi slot khulte hi hum aapko turant message karenge.',
    waitDone: d => `Ho gaya. ${d} ki waitlist mein aapka naam add ho gaya hai. Slot khulte hi hum yahin message karenge.`,
    slotOpen: (d) => `Good news: ${d} ka ek slot abhi khula hai. Kisi aur ke lene se pehle neeche dabakar book kar lijiye.`, bookIt: 'Ye slot book karein',
    feeLine: f => `\n💰 Consultation fee ₹${f}, clinic par dena hai. Koi booking charge nahi.`,
    morning: 'Subah', afternoon: 'Dopahar', evening: 'Shaam',
    liveRow: 'Live Chat', liveRowD: 'Clinic team se chat karein',
    liveOn: open => open ? 'Aap live chat par clinic team se jud gaye hain. Team yahin jaldi reply karegi.\n\nBooking par wapas jaane ke liye kabhi bhi *END* likhein.' : `Aap live chat par jud gaye hain. Clinic abhi band hai, team clinic khulte hi reply karegi.\n\nClinic timings:\n${timingsText('hl')}\n\nBooking par wapas jaane ke liye kabhi bhi *END* likhein.`,
    liveOff: 'Live chat band ho gayi. Thank you! Appointment ke liye kabhi bhi *Hi* bhej dijiye.',
    livePhoto: 'Live chat par abhi photo share nahi ho sakti. Please text mein likh dijiye, ya team aapko call kar legi.',
    dateBtn: 'Date select karein', datesTitle: 'Available dates', slotsFree: n => `${n} slot${n > 1 ? 's' : ''} available`,
    noSlots: `Sorry, agle ${S.daysAhead} din ke saare slots full hain. Please clinic ko call kar lijiye: ${S.clinicPhone}`,
    dayFull: 'Sorry, ye din full ho gaya hai. Please koi aur date select karein.',
    timesFor: d => `${d} ke available slots 👇`, timeBtn: 'Time select karein', timesTitle: 'Available slots', later: 'Aur slots dekhein',
    held: w => `${w} ka slot aapke liye ${S.holdMinutes} minute ke liye hold kar diya hai.\n\nAppointment kiske liye hai? Apne liye hai toh *Mere liye* dabaiye, warna patient ka naam likh dijiye.`,
    selfBtn: 'Mere liye',
    askName: 'Please patient ka poora naam likh dijiye (jaise: Riya Sharma), ya *Mere liye* dabaiye.',
    confirmed: (r, w) => `Aapka appointment confirm ho gaya hai ✅\n\n*${D}*\n${C}\n\n📅 ${w}\n👤 ${r.name}${r.service ? `\n💆 ${r.service}` : ''}${S.fee ? T.hl.feeLine(S.fee) : ''}\n\nPlease 10 minute pehle aa jaiye. Koi purani report ya prescription ho toh saath le aaiye. Visit se pehle hum aapko reminder bhej denge.`,
    changeBtn: 'Time change karein', cancelBtn: 'Cancel karein',
    holdCancelled: 'Koi baat nahi, slot cancel kar diya hai. Jab bhi book karna ho, bas *Hi* bhej dijiye.',
    limit: n => `Aapke already ${n} appointments booked hain. Naya book karne ke liye pehle ek cancel karna hoga.`,
    noUpcoming: 'Abhi aapka koi appointment booked nahi hai.',
    cancelQ: (r, w) => `Kya aap ye appointment cancel karna chahte hain?\n\n👤 ${r.name || 'Patient'}\n📅 ${w}`,
    yesCancel: 'Haan, cancel karein', keepBtn: 'Nahi, rehne dein',
    whichCancel: 'Kaunsa appointment cancel karna hai?', chooseBtn: 'Select karein', yourTitle: 'Aapke appointments',
    cancelled: w => `Aapka ${w} ka appointment cancel ho gaya hai.\nDobara book karna ho toh bas *Hi* bhej dijiye.`,
    gone: 'Ye appointment pehle hi cancel ya complete ho chuka hai.',
    kept: 'Theek hai, aapka appointment waise hi rahega 👍',
    thanksConfirm: w => `Confirm karne ke liye thank you 🙏\n${D} aapse ${w} milenge.`,
    reschedule: 'Ho jayega. Aapka purana slot cancel kar diya hai, ab nayi date select kar lijiye.',
    talk: `${C} se baat karne ke liye call karein: ${S.clinicPhone}\n\nClinic timings:\n${timingsText('hl')}`,
    textOnly: 'Sorry, abhi hum sirf text message hi padh paate hain. Please likh kar bhejiye ya neeche se option select karein.',
    yourAppts: (n, l) => `Namaste ${n} ji 🙏\nAapke upcoming appointments:\n\n${l}`,
    bookBtn: 'Book appointment', anotherBtn: 'Ek aur book karein', cancelBookingBtn: 'Cancel karein', talkBtn: 'Live Chat',
    mcQ: 'Zaroor, apna sawaal yahin likh dijiye. Clinic jaldi reply karega.',
    mcCall: 'Thank you 🙏 Clinic aapko jaldi call back karega.',
    foot: 'Madad chahiye? Live Chat dabaiye',
    lateMsg: (m, t2) => `Namaste 🙏 Aaj ${D} thoda late hain, lagbhag ${m} minute. Aapka appointment ab lagbhag ${t2} tak shuru hoga. Wait karwane ke liye sorry.`,
    leaveMsg: d => `Namaste 🙏 ${D} ${d} ko clinic mein available nahi honge, asuvidha ke liye sorry. Please neeche se naya time select karein ya appointment cancel kar dijiye.`,
    okBtn: 'Theek hai', newTimeBtn: 'Naya time chunein',
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
const sectionsTo = (to, body, button, sections, lg) => ({ messaging_product: 'whatsapp', to, type: 'interactive',
  interactive: { type: 'list', header: { type: 'text', text: String(C).slice(0, 60) }, body: { text: body }, footer: { text: T[lg].foot },
    action: { button: button.slice(0, 20), sections: sections.filter(x => x.rows.length).map(x => ({ title: x.title.slice(0, 24), rows: x.rows })) } } });
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

// ================= Clinic Desk: token queue, doctor status, staff login, app API =================
const todayStr = now.toFormat('yyyy-MM-dd');
const APP = S.appUrl || 'https://bot.bas30din.com/webhook/desk';
const rid = n => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const emptyQ = () => ({ date: todayStr, seq: 0, list: [], durs: [] });
const qRead = () => (mem.q && mem.q.date === todayStr) ? mem.q : emptyQ();
const qWrite = () => { if (!mem.q || mem.q.date !== todayStr) mem.q = emptyQ(); return mem.q; };
const servingOf = q => q.list.find(x => x.st === 's') || null;
const waitingOf = q => q.list.filter(x => x.st === 'w');
const aheadOf = (q, tk) => { const w = waitingOf(q); const i = w.findIndex(x => x.key === tk.key); return (i < 0 ? 0 : i) + (servingOf(q) ? 1 : 0); };
const avgMin = q => { const d = (q.durs || []).slice(-5); return d.length ? Math.max(4, Math.round(d.reduce((a, b) => a + b, 0) / d.length)) : (S.avgConsultMin || 10); };
const r5 = x => Math.max(5, Math.round(x / 5) * 5);
const etaText = (q, n, lg) => { if (n <= 0) return ''; const a = avgMin(q); return `${lg === 'en' ? 'about' : 'lagbhag'} ${r5(n * a * 0.8)}–${r5(n * a * 1.2) + 5} min`; };
const trackUrl = tk => `${APP}?v=t&k=${tk.key}`;
const ctaTo = (to, body, label, url) => ({ messaging_product: 'whatsapp', to, type: 'interactive',
  interactive: { type: 'cta_url', body: { text: body }, action: { name: 'cta_url', parameters: { display_text: label.slice(0, 20), url } } } });
const isOpenNow = () => { const k = now.toFormat('ccc').toLowerCase(); const hm = now.toFormat('HH:mm');
  return ((S.hours || {})[k] || []).some(r => { const [a, b] = r.split('-').map(x => x.trim()); return hm >= a && hm < b; }) && !holidays.includes(todayStr); };
const docRead = () => mem.doc || { status: 'in' };
const docLine = (lg) => {
  const d = docRead(); const D2 = S.doctorName;
  const until = d.until ? DateTime.fromISO(d.until).setZone(TZ).toFormat('h:mm a') : '';
  if (d.status === 'late') return lg === 'en' ? `${D2} is running about ${d.mins} min late today.` : `${D2} aaj lagbhag ${d.mins} min late hain.`;
  if (d.status === 'away') return lg === 'en' ? `${D2} has stepped out and should be back by about ${until}.` : `${D2} thodi der ke liye clinic se bahar hain, lagbhag ${until} tak wapas aayenge.`;
  if (d.status === 'leave') return lg === 'en' ? `${D2} is on leave today.` : `${D2} aaj chhutti par hain.`;
  return lg === 'en' ? `${D2} is in the clinic.` : `${D2} clinic mein hain.`;
};
const QT = {
  hl: {
    token: (tk, n, eta) => `Aapka token *${tk.tok}* hai ✅\n${n ? `Aapse pehle ${n} ${n > 1 ? 'patients hain' : 'patient hai'} · ${eta}.` : 'Aap agle hain.'}\n\nAap bahar wait kar sakte hain, baari aane se pehle hum yahin bata denge.`,
    live: 'Live status dekhein',
    two: n => n <= 1 ? 'Aap agle hain! Waiting room mein aa jaiye 🙏' : `Ab ${n} patients aapse pehle hain. Clinic ke paas aa jaiye 🙏`,
    turn: c => `Aapki baari aa gayi! ${c} mein aaiye.`,
    missed: 'Aapko bulaya gaya tha par aap nahi mile. Aapko 2 number baad bulayenge.',
    here: 'Main aa gaya', hereOk: 'Theek hai 🙏 Aapka number thodi der mein aayega.',
    closed: 'Clinic abhi band hai, isliye abhi token nahi mil sakta. Clinic ke samay mein dobara TOKEN bhejiye.',
    leave: d => `Maaf kijiye, ${d} aaj chhutti par hain, isliye aaj token nahi mil sakta.`,
    back: d => `${d} clinic wapas aa gaye hain ✅ Aapka number jaldi aayega.`,
    moved: (line, eta) => `Namaste 🙏 ${line}${eta ? ` Aapka number ab ${eta} mein aa sakta hai.` : ''} Intezaar ke liye sorry.`,
  },
  en: {
    token: (tk, n, eta) => `Your token is *${tk.tok}* ✅\n${n ? `${n} ${n > 1 ? 'people are' : 'person is'} ahead of you · ${eta}.` : 'You are next.'}\n\nYou can wait outside; we will message you here before your turn.`,
    live: 'See live status',
    two: n => n <= 1 ? 'You are next! Please come to the waiting room 🙏' : `${n} people are ahead of you now. Please come near the clinic 🙏`,
    turn: c => `It's your turn! Please come to ${c}.`,
    missed: 'We called your token but could not find you. We will call you again after 2 more patients.',
    here: "I'm here", hereOk: 'Thank you 🙏 You will be called shortly.',
    closed: 'The clinic is closed right now, so tokens are not available. Please send TOKEN again during clinic hours.',
    leave: d => `Sorry, ${d} is on leave today, so tokens are not available today.`,
    back: d => `${d} is back in the clinic ✅ Your turn will come soon.`,
    moved: (line, eta) => `Hello 🙏 ${line}${eta ? ` Your turn may now come in ${eta}.` : ''} Sorry for the wait.`,
  },
};
const cabin = S.cabin || 'Cabin 1';
// messages that go out when the queue moves
function queueNotify(q, out) {
  const cur = servingOf(q);
  if (cur && cur.phone && !cur.toldTurn && inWindow(cur.phone)) { const lg = langOf(cur.phone, ''); out.push(textTo(cur.phone, QT[lg].turn(cabin))); cur.toldTurn = true; }
  for (const w of waitingOf(q)) {
    const n = aheadOf(q, w);
    if (n <= 2 && !w.told2 && w.phone && inWindow(w.phone)) { const lg = langOf(w.phone, ''); out.push(textTo(w.phone, QT[lg].two(n))); w.told2 = true; }
  }
}
function callNext(q, out) {
  const cur = servingOf(q);
  if (cur) { cur.st = 'd'; addVisit(cur); const m = DateTime.fromISO(cur.calledAt).isValid ? now.diff(DateTime.fromISO(cur.calledAt), 'minutes').minutes : 0; if (m > 1 && m < 90) q.durs = (q.durs || []).concat([Math.round(m)]).slice(-10); }
  const nx = waitingOf(q)[0];
  if (nx) { nx.st = 's'; nx.calledAt = now.toISO(); }
  queueNotify(q, out);
}
function notHere(q, out) {
  const cur = servingOf(q); if (!cur) return callNext(q, out);
  cur.st = 'w'; cur.missed = (cur.missed || 0) + 1; cur.toldTurn = false; cur.told2 = true;
  const rest = q.list.filter(x => x !== cur);
  const w = rest.filter(x => x.st === 'w');
  const after = w[Math.min(1, w.length - 1)];
  const pos = after ? rest.indexOf(after) + 1 : rest.length;
  rest.splice(pos, 0, cur); q.list = rest;
  if (cur.phone && inWindow(cur.phone)) { const lg = langOf(cur.phone, ''); out.push(buttonsTo(cur.phone, QT[lg].missed, [['TQ|HERE', QT[lg].here]])); }
  const nx = waitingOf(q).find(x => x !== cur) || cur;
  nx.st = 's'; nx.calledAt = now.toISO();
  queueNotify(q, out);
}
function issueToken(q, phone, name, src) {
  q.seq = (q.seq || 0) + 1;
  const tk = { tok: `${S.tokenPrefix || 'A'}-${q.seq}`, n: q.seq, phone: phone || '', name: name || 'Patient', src, st: 'w', at: now.toISO(), key: rid(10), missed: 0 };
  q.list.push(tk);
  if (!servingOf(q) && waitingOf(q).length === 1 && S.autoServeFirst) { tk.st = 's'; tk.calledAt = now.toISO(); }
  return tk;
}
const tokenMsg = (q, tk, to) => { const lg = langOf(to, ''); const n = aheadOf(q, tk); const extra = docRead().status !== 'in' ? `\n\n${docLine(lg)}` : '';
  return ctaTo(to, QT[lg].token(tk, n, etaText(q, n, lg)) + extra, QT[lg].live, trackUrl(tk)); };
function setDoc(status, mins, out) {
  const prev = docRead();
  const d = { status, mins: Number(mins) || 0, setAt: now.toISO(), until: (status === 'away' || status === 'late') && mins ? now.plus({ minutes: Number(mins) }).toISO() : null, told: [] };
  const q = qRead();
  if (status === 'late' || status === 'away') {
    mem.doc = d;
    const people = waitingOf(q).concat(servingOf(q) ? [] : []).filter(x => x.phone);
    const soon = rows.filter(r => r.date === todayStr && active(r) && at(r.date, r.time) >= now && at(r.date, r.time) <= now.plus({ hours: 2 }));
    const targets = {};
    people.forEach(x => { targets[x.phone] = aheadOf(q, x); });
    soon.forEach(r => { if (!(r.phone in targets)) targets[r.phone] = null; });
    for (const ph of Object.keys(targets)) {
      if (!inWindow(ph)) continue;
      const lg = langOf(ph, '');
      const n = targets[ph];
      const eta = n === null ? '' : etaText(q, n + Math.ceil((Number(mins) || 0) / avgMin(q)), lg);
      out.push(textTo(ph, QT[lg].moved(docLine(lg), eta))); d.told.push(ph);
    }
    mem.doc = d;
    return d.told.length;
  }
  if (status === 'in') {
    for (const ph of (prev.told || [])) { if (!inWindow(ph)) continue; const lg = langOf(ph, ''); out.push(textTo(ph, QT[lg].back(S.doctorName))); }
    mem.doc = { status: 'in', setAt: now.toISO() };
    return (prev.told || []).length;
  }
  mem.doc = d; return 0;
}
const mask = p => p ? `+${String(p).slice(0, 4)}••• ••${String(p).slice(-3)}` : '';
const chatLog = (phone, who, txt) => { if (!mem.chat) mem.chat = {}; const l = mem.chat[phone] || []; l.push({ who, t: String(txt).slice(0, 500), at: now.toISO() }); mem.chat[phone] = l.slice(-40); };


// ---------- register: every visit, every bill, patients, follow-ups ----------
const hm = iso => { const d = DateTime.fromISO(iso || ''); return d.isValid ? d.setZone(TZ).toFormat('h:mm a') : ''; };
const visOf = d => (mem.vis && mem.vis[d]) || [];
const patKey = (ph, name) => ph ? 'p' + ph : 'n' + String(name || '').trim().toLowerCase();
const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');
function addVisit(tk) {
  if (!mem.vis) mem.vis = {};
  const l = mem.vis[todayStr] || (mem.vis[todayStr] = []);
  if (l.some(v => v.k === tk.key)) return;
  l.push({ k: tk.key, tok: tk.tok, name: tk.name || 'Patient', ph: tk.phone || '', in: tk.calledAt || now.toISO(), out: now.toISO(), fee: null, m: null });
  const cut = now.minus({ days: 400 }).toFormat('yyyy-MM-dd');
  for (const d of Object.keys(mem.vis)) if (d < cut) delete mem.vis[d];
}
function visitsBetween(from, to) { const r = []; for (const d of Object.keys(mem.vis || {}).sort()) if (d >= from && d <= to) for (const v of mem.vis[d]) r.push(Object.assign({ day: d }, v)); return r; }
function regSum(from, to) {
  const V = visitsBetween(from, to);
  const sum = m => V.filter(v => v.m === m).reduce((a, v) => a + (v.fee || 0), 0);
  return { seen: V.length, cash: sum('cash'), upi: sum('upi'), money: sum('cash') + sum('upi'), free: V.filter(v => v.m === 'free').length, nobill: V.filter(v => !v.m).length, V };
}
function allPatients() {
  const P = {};
  for (const d of Object.keys(mem.vis || {}).sort()) for (const v of mem.vis[d]) {
    const key = patKey(v.ph, v.name);
    const p = P[key] || (P[key] = { key, name: v.name, ph: v.ph, first: d, last: d, n: 0, paid: 0, fup: null });
    p.name = v.name || p.name; p.last = d; p.n++; if (v.m === 'cash' || v.m === 'upi') p.paid += v.fee || 0; if (v.fup) p.fup = v.fup; else if (v.m) p.fup = null;
  }
  return Object.values(P);
}
const fupTag = p => { if (!p.fup) return ['', '']; if (p.fup === todayStr) return ['Follow-up due today', 'warn']; if (p.fup < todayStr) return ['Missed follow-up', 'bad'];
  return ['Follow-up ' + DateTime.fromISO(p.fup).toFormat('d LLL'), '']; };

// ---------- the app (and the live tracker / TV) talk to this ----------
if (mode === 'desk') {
  const b = deskReq || {};
  const out = [];
  let res = { ok: true };
  const sess = b.sid && mem.sess && mem.sess[b.sid];
  const live = sess && DateTime.fromISO(sess.exp) > now;
  const qr = `https://wa.me/${S.botNumber || ''}?text=TOKEN`;
  const publicQ = (q) => { const cur = servingOf(q); const w = waitingOf(q); return { now: cur ? cur.tok : null, next: w.slice(0, 3).map(x => x.tok), waiting: w.length, avg: avgMin(q) }; };
  const docInfo = () => { const d = docRead(); return { status: d.status || 'in', mins: d.mins || 0, until: d.until ? DateTime.fromISO(d.until).setZone(TZ).toFormat('h:mm a') : null, setAt: d.setAt ? DateTime.fromISO(d.setAt).setZone(TZ).toFormat('h:mm a') : null, told: (d.told || []).length, line: docLine('en') }; };
  const clinic = { name: C, doctor: D, address: S.address || '', qr, botNumber: S.botNumber || '' };
  if (b.action === 'track') {
    const q = qRead(); const tk = q.list.find(x => x.key === b.k);
    if (!tk) res = { ok: false, gone: true, clinic };
    else { if (b.cancel && tk.st === 'w') { qWrite(); tk.st = 'x'; }
      const n = aheadOf(q, tk); res = { ok: true, tok: tk.tok, st: tk.st, ahead: tk.st === 'w' ? n : 0, eta: tk.st === 'w' ? etaText(q, n, 'hl') : '', now: (servingOf(q) || {}).tok || null, missed: tk.missed || 0, clinic, doc: Object.assign(docInfo(), { line: docLine(langOf(tk.phone, '')) }), lang: langOf(tk.phone, '') }; }
  } else if (b.action === 'mc_log') {
    if (S.hookKey && b.key === S.hookKey && digits(b.phone || '')) { if (!mem.mcalls) mem.mcalls = []; mem.mcalls = mem.mcalls.filter(x => x.at > now.minus({ days: 3 }).toISO()).concat([{ ph: digits(b.phone), at: now.toISO() }]).slice(-200); res = { ok: true }; }
    else res = { ok: false };
  } else if (b.action === 'tv') {
    res = (b.k && b.k === S.tvKey) ? { ok: true, ...publicQ(qRead()), clinic, doc: docInfo(), cabin } : { ok: false };
  } else if (b.action === 'login') {
    const c = mem.codes && mem.codes[String(b.code || '').toLowerCase()];
    if (!c || DateTime.fromISO(c.exp) < now) res = { ok: false, error: 'This login link has expired. Send LOGIN on WhatsApp again.' };
    else { const sid = rid(28); if (!mem.sess) mem.sess = {}; mem.sess[sid] = { phone: c.phone, role: c.role, name: c.name, exp: now.plus({ days: 30 }).toISO() };
      delete mem.codes[String(b.code).toLowerCase()]; res = { ok: true, sid, role: c.role, name: c.name, clinic }; }
  } else if (!live) {
    res = { ok: false, auth: true, error: 'Please log in again.' };
  } else {
    const role = sess.role; const isDoc = role === 'doctor' || role === 'owner';
    const q0 = qRead();
    if (b.action === 'call_next') { const q = qWrite(); callNext(q, out); }
    else if (b.action === 'not_here') { const q = qWrite(); notHere(q, out); }
    else if (b.action === 'add_token') { const q = qWrite(); const ph = digits(b.phone || ''); const full = ph.length === 10 ? '91' + ph : ph;
      const tk = issueToken(q, full, String(b.name || 'Walk-in').slice(0, 40), 'desk'); if (full && inWindow(full)) out.push(tokenMsg(q, tk, full)); res.added = tk.tok; }
    else if (b.action === 'remove_token') { const q = qWrite(); const tk = q.list.find(x => x.key === b.key); if (tk) tk.st = 'x'; }
    else if (b.action === 'set_status') { res.told = setDoc(String(b.status || 'in'), b.mins, out); }
    else if (b.action === 'chat_send' && !isDoc || (b.action === 'chat_send' && role === 'owner')) { const ph = digits(b.phone); if (ph && b.text) { out.push(textTo(ph, String(b.text).slice(0, 1000))); chatLog(ph, 'staff', b.text); if (mem.live[ph]) mem.live[ph].last = now.toISO(); } }
    else if (b.action === 'chat_end') { const ph = digits(b.phone); if (mem.live[ph]) { delete mem.live[ph]; const lg = langOf(ph, ''); out.push(textTo(ph, T[lg].liveOff)); chatLog(ph, 'bot', T[lg].liveOff); } }
    else if (b.action === 'bill') {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(b.day || '') ? b.day : todayStr;
      const v = visOf(day).find(x => x.k === b.k);
      if (!v) res.error = 'This visit was not found.';
      else {
        v.m = ['cash', 'upi', 'free'].includes(b.m) ? b.m : 'cash';
        v.fee = v.m === 'free' ? 0 : Math.max(0, Math.min(500000, Math.round(Number(b.fee) || 0)));
        v.by = sess.name; v.at = now.toISO();
        const days = Math.max(0, Math.min(400, Number(b.fup) || 0));
        v.fup = days ? now.plus({ days }).toFormat('yyyy-MM-dd') : null;
        mem.fup = (mem.fup || []).filter(f => f.k !== v.k && f.date >= todayStr);
        if (v.fup && v.ph) mem.fup.push({ k: v.k, ph: v.ph, name: v.name, date: v.fup, sent: false });
        res.billed = v.tok;
      }
    }
    else if (b.action === 'note' && isDoc) { const pk = String(b.pk || ''); if (!mem.notes) mem.notes = {}; mem.notes[pk] = { t: String(b.text || '').slice(0, 600), at: now.toISO(), by: sess.name }; }
    else if (b.action === 'mc_done') { mem.mcalls = (mem.mcalls || []).filter(x => x.ph !== digits(b.phone)); }
    else if (b.action === 'wl_done') { for (const d of Object.keys(mem.wait || {})) mem.wait[d] = (mem.wait[d] || []).filter(w => w.phone !== digits(b.phone)); }
    else if (b.action === 'cb_done') { mem.callbacks = (mem.callbacks || []).filter(x => x.phone !== digits(b.phone)); }
    // the state every screen needs
    const q = qRead();
    const cur = servingOf(q);
    res.me = { name: sess.name, role };
    res.clinic = clinic; res.doc = docInfo();
    res.queue = { now: cur ? { tok: cur.tok, name: cur.name, src: cur.src, key: cur.key, phone: isDoc ? '' : mask(cur.phone), since: DateTime.fromISO(cur.calledAt).setZone(TZ).toFormat('h:mm a') } : null,
      waiting: waitingOf(q).slice(0, 25).map(x => ({ tok: x.tok, name: x.name, src: x.src, key: x.key, missed: x.missed || 0, ahead: aheadOf(q, x), told2: !!x.told2, phone: isDoc ? '' : mask(x.phone), here: !!x.here })),
      done: q.list.filter(x => x.st === 'd').length, avg: avgMin(q), open: isOpenNow() };
    res.links = { tv: S.tvKey ? `${APP}?v=tv&k=${S.tvKey}` : '', qr, poster: `${APP}?v=qr&n=${S.botNumber || ''}&c=${encodeURIComponent(C)}` };
    res.fee = S.fee || 0; res.upi = S.upiId ? { id: S.upiId, name: S.upiName || C } : null;
    const todayV = visOf(todayStr);
    res.toBill = todayV.filter(v => !v.m).map(v => ({ k: v.k, tok: v.tok, name: v.name, seen: `${hm(v.in)} – ${hm(v.out)}` }));
    res.today = { seen: todayV.length, waiting: waitingOf(q).length };
    if (isDoc) {
      const t0 = regSum(todayStr, todayStr); res.today.money = t0.money; res.today.nobill = t0.nobill;
      const inQ = ph => q.list.find(x => x.phone === ph && x.st !== 'x');
      res.fups = (mem.fup || []).filter(f => f.date === todayStr).map(f => { const t = inQ(f.ph); return { name: f.name, state: t ? (t.st === 'd' ? 'Visited' : 'In queue · ' + t.tok) : f.sent ? 'Reminded' : 'Not booked', c: t ? 'ok' : f.sent ? '' : 'warn' }; });
    }
    if (b.view === 'register' && isDoc) {
      const per = ['today', 'week', 'month'].includes(b.period) ? b.period : 'today';
      const from = per === 'today' ? todayStr : per === 'week' ? now.minus({ days: 6 }).toFormat('yyyy-MM-dd') : now.startOf('month').toFormat('yyyy-MM-dd');
      const R = regSum(from, todayStr);
      const dl = d => d === todayStr ? '' : DateTime.fromISO(d).toFormat('d LLL') + ', ';
      res.register = { period: per, seen: R.seen, money: R.money, cash: R.cash, upi: R.upi, free: R.free, nobill: R.nobill,
        flags: R.V.filter(v => !v.m || v.m === 'free').reverse().slice(0, 40).map(v => ({ name: (v.tok ? v.tok + ' · ' : '') + v.name, sub: v.m ? `Marked by ${v.by || 'staff'}, ${dl(v.day)}${hm(v.at)}` : `Seen ${dl(v.day)}${hm(v.in)} – ${hm(v.out)}`, tag: v.m ? 'No charge' : 'No bill', bad: !v.m })),
        calls: (mem.mcalls || []).filter(x => x.at >= DateTime.fromISO(from, { zone: TZ }).toISO()).length };
    }
    if (b.view === 'patients') {
      const s0 = String(b.q || '').trim().toLowerCase(); const sd = digits(s0);
      let P = allPatients();
      const total = P.length;
      if (s0) P = P.filter(p => (p.name || '').toLowerCase().includes(s0) || (sd.length >= 3 && (p.ph || '').includes(sd)));
      P.sort((a, c) => c.last.localeCompare(a.last));
      res.patients = { total, list: P.slice(0, 80).map(p => { const t = fupTag(p); return { key: p.key, name: p.name, sub: (p.last === todayStr ? 'Today' : DateTime.fromISO(p.last).toFormat('d LLL')) + ' · ' + (p.n === 1 ? 'first visit' : p.n + ' visits'), tag: t[0], tc: t[1] }; }) };
    }
    if (b.view === 'patient' && b.pk) {
      const p = allPatients().find(x => x.key === b.pk);
      if (p) {
        const V = visitsBetween('0000', '9999').filter(v => patKey(v.ph, v.name) === p.key).reverse();
        const nt = (mem.notes || {})[p.key];
        res.patient = { key: p.key, name: p.name, phone: isDoc ? (p.ph ? '+' + p.ph : '') : mask(p.ph), call: p.ph ? '+' + p.ph : '', since: DateTime.fromISO(p.first).toFormat('LLL yyyy'), paid: p.paid, n: p.n,
          fup: p.fup ? DateTime.fromISO(p.fup).toFormat('ccc, d LLL') : '', fupTag: fupTag(p)[1],
          note: nt ? nt.t : '', visits: V.map(v => ({ date: v.day === todayStr ? 'Today' : DateTime.fromISO(v.day).toFormat('d LLL yyyy'), time: hm(v.in), amt: v.m ? rupees(v.fee) : '—', method: v.m === 'free' ? `No charge · by ${v.by || 'staff'}` : v.m === 'upi' ? 'UPI' : v.m === 'cash' ? 'Cash' : 'Not billed', flag: !v.m || v.m === 'free' })) };
      }
    }
    if (b.needAppts) {
      const mineToday = rows.filter(r => r.date === todayStr && ['booked', 'confirmed', 'sent', 'holding'].includes(r.status) && at(r.date, r.time).isValid).sort((a, c) => a.time.localeCompare(c.time));
      const seenBefore = ph => rows.some(r => r.phone === ph && r.date < todayStr && ['booked', 'confirmed', 'sent'].includes(r.status));
      res.appts = mineToday.map(r => ({ time: at(r.date, r.time).toFormat('h:mm a'), name: r.name || 'Patient', treat: r.service || 'Appointment', status: r.status, isNew: !seenBefore(r.phone), visits: rows.filter(x => x.phone === r.phone && x.date <= todayStr && ['booked', 'confirmed', 'sent'].includes(x.status)).length, phone: isDoc ? '' : mask(r.phone) }));
    }
    if (!isDoc || role === 'owner') {
      const lv = Object.keys(mem.live || {}).filter(p => DateTime.fromISO(mem.live[p].last) > now.minus({ hours: 2 }));
      const bookedAfter = (ph, iso) => rows.some(r => r.phone === ph && active(r) && r.date >= todayStr);
      res.inbox = {
        calls: (mem.mcalls || []).slice(-40).reverse().map(x => ({ phone: x.ph, shown: mask(x.ph), call: '+' + x.ph, at: DateTime.fromISO(x.at).setZone(TZ).toFormat(DateTime.fromISO(x.at) > now.startOf('day') ? 'h:mm a' : 'd LLL'), booked: bookedAfter(x.ph, x.at) })),
        live: lv.map(p => { const l = (mem.chat || {})[p] || []; const last = l[l.length - 1]; return { phone: p, shown: mask(p), name: mem.live[p].name || 'Patient', last: last ? last.t : '', at: last ? DateTime.fromISO(last.at).setZone(TZ).toFormat('h:mm a') : '' }; }),
        callbacks: (mem.callbacks || []).slice(-20).map(x => ({ phone: x.phone, shown: mask(x.phone), call: '+' + x.phone, name: x.name, at: DateTime.fromISO(x.at).setZone(TZ).toFormat('h:mm a') })),
        wait: Object.keys(mem.wait || {}).filter(d => d >= todayStr).flatMap(d => (mem.wait[d] || []).map(w => ({ phone: w.phone, shown: mask(w.phone), call: '+' + w.phone, day: DateTime.fromISO(d).toFormat('ccc d LLL') }))),
      };
      if (b.chat) { const ph = digits(b.chat); res.chat = { phone: ph, shown: mask(ph), name: (mem.live[ph] || {}).name || 'Patient', open: !!mem.live[ph], msgs: ((mem.chat || {})[ph] || []).map(m => ({ who: m.who, t: m.t, at: DateTime.fromISO(m.at).setZone(TZ).toFormat('h:mm a') })) }; }
    }
  }
  res.sent = out.length;
  const first = out.shift() || null;
  return [{ json: { action: first ? 'reply' : 'none', payload: first, more: out, desk: res, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
}

// ================= 8 AM doctor summary (no patient message in this run) =================
if (mode === 'summary' && (now.hour >= 20 || now.hour < 3)) {
  // ---- 9 PM: the day's register to the doctor ----
  const day = now.hour < 3 ? now.minus({ days: 1 }) : now; const dk = day.toFormat('yyyy-MM-dd');
  const R = regSum(dk, dk);
  const tomorrow = day.plus({ days: 1 }).toFormat('yyyy-MM-dd');
  const fT = (mem.fup || []).filter(f => f.date === tomorrow).length;
  const calls = (mem.mcalls || []).filter(x => DateTime.fromISO(x.at).setZone(TZ).toFormat('yyyy-MM-dd') === dk);
  const callsBooked = calls.filter(x => rows.some(r => r.phone === x.ph && active(r))).length;
  const look = [R.nobill ? `${R.nobill} seen, no bill` : '', R.free ? `${R.free} marked No charge` : ''].filter(Boolean);
  const body = `*${C} · ${day.toFormat('ccc d LLL')}*\n\nSeen: *${R.seen} patient${R.seen === 1 ? '' : 's'}*\nRecorded: *${rupees(R.money)}*\nCash ${rupees(R.cash)} · UPI ${rupees(R.upi)}\n\n` +
    (look.length ? `*Needs a look*\n${look.join('\n')}\n\n` : 'Every visit is billed ✓\n\n') +
    `Missed calls: ${calls.length}${calls.length ? ` · ${callsBooked} booked` : ''}\nFollow-ups tomorrow: ${fT}`;
  const to = [...new Set((S.doctorNumbers || []).concat((S.staff || []).filter(x => x.role === 'owner' || x.role === 'doctor').map(x => x.phone)).map(digits))];
  if (!mem.nightSent) mem.nightSent = '';
  if (mem.nightSent === dk) return [];
  for (const ph of to) {
    if (inWindow(ph)) more.push(ctaTo(ph, body, 'Open register', `${APP}`));
    else if (S.templates && S.templates.night) more.push(templateTo(ph, S.templates.night, [`${C}, ${day.toFormat('ccc d LLL')}`, String(R.seen), rupees(R.money), look.length ? look.join(', ') : 'nothing, every visit is billed'], []));
  }
  mem.nightSent = dk;
  if (!more.length) return [];
  payload = more.shift();
  return [{ json: { action: 'reply', payload, more, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
}
if (mode === 'summary' && now.hour >= 16) {
  // ---- 6 PM: follow-up reminders for tomorrow ----
  const tomorrow = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
  const due = (mem.fup || []).filter(f => f.date === tomorrow && !f.sent);
  const whenTxt = DateTime.fromISO(tomorrow).toFormat('ccc, d LLL');
  for (const f of due) {
    const lg = langOf(f.ph, '');
    const hasBooking = rows.some(r => r.phone === f.ph && active(r) && r.date === tomorrow);
    if (hasBooking) { f.sent = true; continue; }
    const msgTxt = lg === 'en' ? `Hello ${f.name} 🙏\n${D} had asked you to come back for a follow-up tomorrow, ${whenTxt}.\n\nTap below to pick a time, or just come and send TOKEN at the clinic.`
      : `Namaste ${f.name} 🙏\n${D} ne aapko kal, ${whenTxt}, follow-up ke liye bulaya hai.\n\nTime book karne ke liye neeche dabaiye, ya seedha clinic aakar TOKEN bhejiye.`;
    if (inWindow(f.ph)) { more.push(buttonsTo(f.ph, msgTxt, [['NEW', lg === 'en' ? 'Book a time' : 'Time book karein']])); f.sent = true; }
    else if (S.templates && S.templates.followup) { more.push(templateTo(f.ph, S.templates.followup, [f.name, D, whenTxt], ['NEW'])); f.sent = true; }
  }
  if (!more.length) return [];
  payload = more.shift();
  return [{ json: { action: 'reply', payload, more, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
}
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
for (const k of Object.keys(mem.wait)) if (k < now.toFormat('yyyy-MM-dd')) delete mem.wait[k];
if (!mem.seen[me] || DateTime.fromISO(mem.seen[me]) < now.minus({ minutes: 20 })) mem.seen[me] = now.toISO();
let id = String(msg.replyId || '').trim();
const raw = String(msg.text || '').trim();
const t = raw.toLowerCase();
const has = words => words.some(w => new RegExp(`(^|\\W)${w}(\\W|$)`, 'i').test(t));
const isAdmin = (S.adminNumbers || []).some(a => same(a, me));
const mine = rows.filter(r => same(r.phone, me));
const upcoming = mine.filter(r => active(r) && at(r.date, r.time) >= now).sort((a, b) => at(a.date, a.time) - at(b.date, b.time));
const holding = mine.filter(r => r.status === 'holding' && holdFresh(r)).sort((a, b) => b.row_number - a.row_number)[0];
const setStatus = (r, status, name) => {
  action = 'update'; rec = { ...r, status, name: name !== undefined ? name : r.name };
  if (['Cancelled', 'Rescheduled'].includes(status) && r.status !== 'holding' && at(r.date, r.time) > now) {
    for (const w of (mem.wait[r.date] || [])) {
      if (w.phone === me || !inWindow(w.phone)) continue;
      const lg = ['en', 'hl'].includes(w.lang) ? w.lang : 'hl';
      more.push(buttonsTo(w.phone, T[lg].slotOpen(whenText(r.date, r.time, lg)), [[`S|${r.date}|${r.time}`, T[lg].bookIt]]));
    }
  }
};
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
  const out = []; let first = null;
  for (let i = 0; i <= S.daysAhead && out.length < 8; i++) {
    const d = now.plus({ days: i }).toFormat('yyyy-MM-dd');
    const sl = slotsFor(d);
    if (sl.length > 0) { if (!first) first = [d, sl[0]]; out.push({ id: `D|${d}`, title: dateLabel(d, lang).slice(0, 24), description: L.slotsFree(sl.length) }); }
  }
  if (!out.length) return buttons(`${intro}\n\n${L.noSlots}`, [['WL', L.waitRowD.slice(0, 20)], ['TALK', L.talkBtn]]);
  const sections = [
    { title: L.earliest, rows: [{ id: `S|${first[0]}|${first[1]}`, title: `${dateLabel(first[0], lang)} · ${timeLabel(first[0], first[1], lang)}`.slice(0, 24), description: L.earliest }] },
    { title: L.datesTitle, rows: out },
    { title: L.waitRow, rows: [{ id: 'WL', title: L.waitRow.slice(0, 24), description: L.waitRowD }] },
  ];
  return sectionsTo(msg.from, intro, L.dateBtn, sections, lang);
}
function timeList(d, after) {
  let sl = slotsFor(d);
  if (after) sl = sl.filter(x => x > after);
  if (!sl.length) return dateList(L.dayFull);
  const show = sl.length > 10 ? sl.slice(0, 9) : sl;
  const part = x => { const h = Number(x.slice(0, 2)); return h < 12 ? 'morning' : h < 16 ? 'afternoon' : 'evening'; };
  const sections = ['morning', 'afternoon', 'evening'].map(k => ({ title: L[k], rows: show.filter(x => part(x) === k).map(x => ({ id: `S|${d}|${x}`, title: timeLabel(d, x, lang) })) }));
  if (sl.length > 10) sections.push({ title: L.later, rows: [{ id: `M|${d}|${sl[8]}`, title: L.later }] });
  return sectionsTo(msg.from, L.timesFor(dateLabel(d, lang)), L.timeBtn, sections, lang);
}
const svcs = S.services || [];
const svcName = sid => { const x = svcs.find(v => v.id === sid); return x ? x.name : ''; };
function svcList(intro) {
  if (!svcs.length) return dateList(intro);
  return sectionsTo(msg.from, intro, L.svcBtn, [{ title: L.svcTitle, rows: svcs.slice(0, 9).map(v => ({ id: `TR|${v.id}`, title: v.name.slice(0, 24), description: (lang === 'hl' ? v.hl : v.en || '').slice(0, 72) })) }, { title: L.liveRow, rows: [{ id: 'LIVE', title: L.liveRow, description: L.liveRowD }] }], lang);
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

const liveOpen = p => { const l = mem.live[p]; return l && DateTime.fromISO(l.last) > now.minus({ hours: 2 }); };
const adminTarget = isAdmin ? mem.liveAdmin[me] : null;
let liveHandled = false;
const sysWord = /^(login|token)$/i.test((raw || '').trim());
if (!adminCmd && !sysWord && isAdmin && adminTarget && liveOpen(adminTarget) && !id) {
  liveHandled = true;
  const pl = langOf(adminTarget, '');
  if (cmd === 'END') {
    delete mem.live[adminTarget]; delete mem.liveAdmin[me];
    payload = textTo(adminTarget, T[pl].liveOff);
    more.push(text('Live chat closed.'));
  } else if (raw) {
    mem.live[adminTarget].last = now.toISO();
    chatLog(adminTarget, 'staff', raw);
    payload = textTo(adminTarget, raw);
  } else payload = text('Only text can be sent on live chat for now.');
}
else if (!isAdmin && !sysWord && liveOpen(me) && !id) {
  liveHandled = true;
  const admins = (S.adminNumbers || []).map(digits);
  if (cmd === 'END') {
    delete mem.live[me];
    admins.forEach(a => { if (mem.liveAdmin[a] === me) delete mem.liveAdmin[a]; more.push(textTo(a, `Live chat with ${msg.name || 'patient'} (+${me}) was ended by the patient.`)); });
    payload = menuBtns().length ? buttons(L.liveOff, menuBtns()) : text(L.liveOff);
  } else if (msg.type !== 'text') {
    payload = text(L.livePhoto);
  } else {
    mem.live[me].last = now.toISO();
    chatLog(me, 'patient', raw);
    admins.forEach(a => { mem.liveAdmin[a] = me; });
    const first = admins[0];
    payload = textTo(first, `${msg.name || 'Patient'} (+${me}): ${raw}`);
    admins.slice(1).forEach(a => more.push(textTo(a, `${msg.name || 'Patient'} (+${me}): ${raw}`)));
  }
}
const staffOf = p => (S.staff || []).find(x => same(x.phone, p));
const docAsk = !id && has(['doctor', 'dr', 'daktar', 'doc']) && has(['aa', 'aaye', 'aayi', 'aaya', 'gaye', 'gayi', 'hai', 'hain', 'kab', 'kahan', 'late', 'available', 'here', 'in']);
if (liveHandled) {}
else if (!id && /^login$/i.test(raw) && staffOf(me)) {
  const st0 = staffOf(me); if (!mem.codes) mem.codes = {};
  for (const k of Object.keys(mem.codes)) if (DateTime.fromISO(mem.codes[k].exp) < now) delete mem.codes[k];
  const code = rid(8); mem.codes[code] = { phone: me, role: st0.role || 'reception', name: st0.name || 'Staff', exp: now.plus({ minutes: 15 }).toISO() };
  payload = ctaTo(msg.from, `Clinic Desk login for ${st0.name || 'you'} (${st0.role || 'reception'}).\nThis link works once and expires in 15 minutes.`, 'Open Clinic Desk', `${APP}?code=${code}`);
}
else if ((!id && /^token\b/i.test(raw)) || id === 'TQ|NEW') {
  const q0 = qRead(); const mineTk = q0.list.find(x => x.phone === me && ['w', 's'].includes(x.st));
  if (mineTk) payload = mineTk.st === 's' ? text(QT[lang].turn(cabin)) : tokenMsg(q0, mineTk, msg.from);
  else if (docRead().status === 'leave') payload = text(QT[lang].leave(D));
  else if (!isOpenNow() && !S.tokensAnytime) payload = text(QT[lang].closed);
  else { const q = qWrite(); const tk = issueToken(q, me, msg.name, 'qr'); payload = tokenMsg(q, tk, msg.from); }
}
else if (id === 'TQ|HERE') {
  const q0 = qRead(); const tk = q0.list.find(x => x.phone === me && x.st === 'w');
  if (tk) { qWrite(); tk.here = true; }
  payload = text(QT[lang].hereOk);
}
else if (docAsk) {
  const q0 = qRead(); const tk = q0.list.find(x => x.phone === me && x.st === 'w');
  payload = text(docLine(lang) + (tk ? (lang === 'en' ? ` ${aheadOf(q0, tk)} ahead of you (${etaText(q0, aheadOf(q0, tk), 'en')}).` : ` Aapse pehle ${aheadOf(q0, tk)} patient (${etaText(q0, aheadOf(q0, tk), 'hl')}).`) : ''));
}
else if (adminCmd) {
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
else if (id === 'MC_CALL') { notify = true; payload = text(L.mcCall); if (!mem.callbacks) mem.callbacks = []; mem.callbacks = mem.callbacks.filter(x => x.phone !== me).concat([{ phone: me, name: msg.name || '', at: now.toISO() }]).slice(-50); }
else if (!['text', 'interactive', 'button'].includes(msg.type)) { payload = buttons(L.textOnly, menuBtns()); }
else if (!mem.lang[me] && !id && !upcoming.length && !holding) {
  payload = buttons(T.en.pickLang, [['LANG|en', 'English'], ['LANG|hl', 'Hinglish'], ['LIVE', 'Live Chat']]);
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
else if (id === 'WL') {
  const rowsW = [];
  for (let i = 0; i <= S.daysAhead && rowsW.length < 10; i++) { const d = now.plus({ days: i }).toFormat('yyyy-MM-dd'); if (!holidays.includes(d) && ((S.hours || {})[DateTime.fromISO(d).toFormat('ccc').toLowerCase()] || []).length) rowsW.push({ id: `WD|${d}`, title: dateLabel(d, lang).slice(0, 24) }); }
  payload = list(L.waitPick, L.dateBtn, L.datesTitle, rowsW);
}
else if (id.startsWith('WD|')) {
  const d = id.split('|')[1];
  mem.wait[d] = (mem.wait[d] || []).filter(w => w.phone !== me);
  mem.wait[d].push({ phone: me, lang, at: now.toISO() });
  payload = text(L.waitDone(dateLabel(d, lang)));
}
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
else if (!id && has(['address', 'location', 'kahan', 'timing', 'timings'])) {
  payload = buttons(L.talk, [['NEW', L.bookBtn], ['LIVE', L.talkBtn]]); pin();
}
else if (id === 'TALK' || id === 'LIVE' || (!id && has(['talk', 'human', 'help', 'baat', 'live', 'chat', 'emergency', 'call']))) {
  const admins = (S.adminNumbers || []).map(digits).filter(a => a.slice(-10) !== me.slice(-10));
  const dnow = now.toFormat('ccc').toLowerCase(); const hm = now.toFormat('HH:mm');
  const open = ((S.hours || {})[dnow] || []).some(r => { const [a, b] = r.split('-').map(x => x.trim()); return hm >= a && hm < b; }) && !holidays.includes(now.toFormat('yyyy-MM-dd'));
  mem.live[me] = { since: now.toISO(), last: now.toISO(), name: msg.name || '' };
  chatLog(me, 'bot', 'Patient asked for live chat' + (raw && !id ? `: "${raw}"` : ''));
  admins.forEach(a => { mem.liveAdmin[a] = me; });
  payload = text(L.liveOn(open));
  notify = true;
  admins.forEach(a => more.push(textTo(a, `💬 Live chat request\n${msg.name || 'Patient'} (+${me})${raw && !id ? `\n"${raw}"` : ''}\n\nJust reply to this chat and your message goes to the patient. Send END to close the chat.`)));
}
else {
  const faq = (S.faq || []).find(f => !id && f.keywords.some(k => has([k])));
  if (faq) {
    const answer = faq.answer === '{timings}' ? 'Clinic timings:\n' + timingsText(lang) : faq.answer;
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
