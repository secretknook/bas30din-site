// Clinic bot brain v2 - languages (English / Hinglish), photo confirmation, location pin,
// doctor commands (TODAY, LATE 30, LEAVE <date>, HELP) and the 8 AM doctor summary.
// All clinic details live in the "Clinic Settings" node.
const S = Object.assign({}, $('Clinic Settings').first().json);
const TZ = 'Asia/Kolkata';
const now = DateTime.now().setZone(TZ);
const mem = $getWorkflowStaticData('global');
for (const k of ['lang', 'seen', 'svc', 'wait', 'live', 'liveAdmin']) if (!mem[k]) mem[k] = {};
if (mem.cfg) Object.assign(S, mem.cfg);
const OWNERS = (S.staff || []).filter(x => x.role === 'owner');
if (Array.isArray(mem.team) && mem.team.length) {
  // the clinic owner (set in n8n) can never be removed or changed from the app
  const fixed = mem.team.filter(x => !OWNERS.some(o => String(o.phone).slice(-10) === String(x.phone).slice(-10))).concat(OWNERS.map(o => Object.assign({}, o)));
  if (JSON.stringify(fixed) !== JSON.stringify(mem.team)) mem.team = fixed;
  S.staff = fixed;
}
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
function finishCur(q, out) {
  const cur = servingOf(q); if (!cur) return;
  cur.st = 'd'; addVisit(cur); const m = DateTime.fromISO(cur.calledAt).isValid ? now.diff(DateTime.fromISO(cur.calledAt), 'minutes').minutes : 0; if (m > 1 && m < 90) q.durs = (q.durs || []).concat([Math.round(m)]).slice(-10);
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



// ---------- staff accounts: passwords (salted SHA-256, no plain text kept) ----------
function sha256(m) {
  const K = [], H = [1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225];
  let n = 2, c = 0; while (c < 64) { let p = true; for (let f = 2; f * f <= n; f++) if (n % f === 0) { p = false; break; } if (p) { K[c++] = (Math.pow(n, 1 / 3) * 4294967296) | 0; } n++; }
  const b = unescape(encodeURIComponent(m)); const L = b.length; const w = []; for (let i = 0; i < L; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
  w[L >> 2] |= 0x80 << (24 - (L % 4) * 8); w[(((L + 8) >> 6) << 4) + 15] = L * 8;
  const h = H.slice();
  for (let j = 0; j < w.length; j += 16) {
    const W = []; let [a, bb, cc, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      if (i < 16) W[i] = w[j + i] | 0;
      else { const x = W[i - 15], y = W[i - 2]; W[i] = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + W[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + W[i - 16] | 0; }
      const t1 = hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + W[i] | 0;
      const t2 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & bb) ^ (a & cc) ^ (bb & cc)) | 0;
      hh = g; g = f; f = e; e = d + t1 | 0; d = cc; cc = bb; bb = a; a = t1 + t2 | 0;
    }
    h[0] = h[0] + a | 0; h[1] = h[1] + bb | 0; h[2] = h[2] + cc | 0; h[3] = h[3] + d | 0; h[4] = h[4] + e | 0; h[5] = h[5] + f | 0; h[6] = h[6] + g | 0; h[7] = h[7] + hh | 0;
  }
  return h.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
}
const pwHash = (salt, pw) => { let x = salt + ':' + pw; for (let i = 0; i < 300; i++) x = sha256(salt + x); return x; };
const staffRec = p => (S.staff || []).find(x => String(x.phone || '').replace(/\D/g, '').slice(-10) === String(p || '').replace(/\D/g, '').slice(-10) && String(p || '').replace(/\D/g, '').length >= 10);
const PRESETS = {
  skin: { label: 'Skin & hair', services: ['Skin consultation', 'Acne treatment', 'Hair fall / PRP', 'Pigmentation & tan', 'Laser hair removal', 'HydraFacial / glow'], fee: 500 },
  dental: { label: 'Dental', services: ['Check-up', 'Cleaning', 'Filling', 'Root canal', 'Braces consult', 'Tooth pain'], fee: 300 },
  child: { label: 'Child', services: ['Check-up', 'Fever / cough', 'Vaccination', 'Growth review'], fee: 500 },
  general: { label: 'General', services: ['Consultation', 'Fever / cough', 'BP / sugar review', 'Report review'], fee: 300 },
  eye: { label: 'Eye', services: ['Eye check-up', 'Glasses power', 'Red / itchy eyes', 'Cataract consult'], fee: 400 },
  physio: { label: 'Physio', services: ['Back pain', 'Knee pain', 'Neck / shoulder', 'Post-surgery rehab'], fee: 500 },
};

const BILLDEF = {
  skin: [['Consultation', 500], ['Follow-up consult', 300], ['Chemical peel', 2500], ['Laser hair removal', 3000], ['PRP (hair)', 4500], ['HydraFacial', 3500], ['Acne scar treatment', 4000]],
  dental: [['Consultation', 300], ['Cleaning', 1200], ['Filling', 1500], ['Root canal', 5500], ['Extraction', 1000], ['X-ray', 300]],
  child: [['Consultation', 500], ['Vaccination', 1200], ['Nebulisation', 300]],
  general: [['Consultation', 300], ['Dressing', 200], ['Injection', 150], ['ECG', 400]],
  eye: [['Consultation', 400], ['Eye test', 300], ['Glasses fitting', 1500]],
  physio: [['Session', 500], ['10-session pack', 4500]],
};
const billList = () => { const L = (mem.cfg && Array.isArray(mem.cfg.bill) && mem.cfg.bill.length) ? mem.cfg.bill : (BILLDEF[(mem.cfg && mem.cfg.type) || 'skin'] || BILLDEF.skin).map(x => ({ n: x[0], p: x[0] === 'Consultation' && S.fee ? S.fee : x[1] })); return L; };
const seenBefore = ph => !!ph && Object.keys(mem.vis || {}).some(d => d < todayStr && (mem.vis[d] || []).some(v => v.ph === ph));
const SRC = { google: 'Google / Instagram', friend: 'Someone told them', board: 'Clinic board / poster', doctor: 'Another doctor', other: 'Other' };
function stSum(from, to) { const o = {}; for (const d of Object.keys(mem.st || {})) if (d >= from && d <= to) for (const k of Object.keys(mem.st[d])) o[k] = (o[k] || 0) + mem.st[d][k]; return o; }
const memSafe = () => { const o = {}; for (const k of Object.keys(mem)) if (!['sess', 'codes', 'otp', 'chat', 'seen'].includes(k)) o[k] = mem[k]; return o; };
function backupSnap() { const j = JSON.stringify(memSafe()); const parts = []; for (let i = 0; i < j.length; i += 45000) parts.push(j.slice(i, i + 45000)); return [now.toISO(), String(parts.length)].concat(parts); }
// patients who missed their follow-up: day after, 1 week, 1 month
function recallsDue() {
  if (!mem.rc) mem.rc = {}; const res0 = [];
  const last = {}; for (const d of Object.keys(mem.vis || {}).sort()) for (const v of mem.vis[d]) if (v.ph) last[v.ph] = Object.assign({ day: d }, v);
  for (const ph of Object.keys(last)) { const v = last[ph]; if (!v.fup || v.fup >= todayStr) continue;
    const gap = Math.floor(now.startOf('day').diff(DateTime.fromISO(v.fup, { zone: TZ }), 'days').days); if (gap < 1 || gap > 45) continue;
    const st = gap >= 30 ? 3 : gap >= 7 ? 2 : 1; let r = mem.rc[ph]; if (!r || r.fup !== v.fup) r = mem.rc[ph] = { fup: v.fup, n: 0, name: v.name };
    if (r.n < st && !(mem.q && (mem.q.list || []).some(t => t.phone === ph))) res0.push({ ph, name: v.name, st, r }); }
  return res0;
}
function reviewAsks() {
  if (!mem.rv) mem.rv = {}; const L = []; const seen = new Set();
  for (const v of (mem.vis || {})[todayStr] || []) { if (!v.ph || seen.has(v.ph) || !v.m) continue; seen.add(v.ph); const r = mem.rv[v.ph]; if (r && r.at > now.minus({ days: 60 }).toISO()) continue; if (DateTime.fromISO(v.out) > now.minus({ minutes: 45 })) continue; L.push(v); }
  return L;
}
const reviewBtns = lg => [['RV|5', lg === 'en' ? 'Very good 😊' : 'Bahut accha 😊'], ['RV|3', lg === 'en' ? 'It was okay' : 'Theek tha'], ['RV|1', lg === 'en' ? 'Not good' : 'Accha nahi']];

// ---------- demo data: a clinic that has been running for 2 months ----------
function seedDemo() {
  let sd = 11; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const NAMES = ['Riya Sharma', 'Aman Gupta', 'Sunita Devi', 'Mohd. Faizan', 'Kavya Nair', 'Rahul Yadav', 'Pooja Verma', 'Arjun Mehta', 'Neha Bansal', 'Vikas Malhotra', 'Shreya Kapoor', 'Ankit Tiwari', 'Priya Singh', 'Sanjay Kumar', 'Farah Ali', 'Rohit Jain', 'Gita Rani', 'Om Prakash', 'Simran Kaur', 'Deepak Rao',
    'Meera Joshi', 'Kabir Khan', 'Shalini Verma', 'Nikhil Arora', 'Ayesha Siddiqui', 'Manish Pandey', 'Tanya Chawla', 'Harsh Vardhan', 'Komal Saini', 'Yash Agarwal', 'Isha Goyal', 'Rajesh Kumar', 'Sneha Mishra', 'Varun Bhatia', 'Nidhi Sharma', 'Imran Qureshi', 'Payal Jain', 'Sameer Khan', 'Divya Rawat', 'Gaurav Saxena',
    'Muskan Gupta', 'Aditya Chauhan', 'Ritika Sood', 'Karan Malik', 'Anjali Thakur', 'Mohit Garg', 'Swati Dubey', 'Rakesh Yadav', 'Preeti Negi', 'Tushar Sethi', 'Bhavna Rathi', 'Sahil Ahuja', 'Jyoti Kumari', 'Akash Verma', 'Naina Kohli', 'Pankaj Mittal', 'Ruchi Bhardwaj', 'Vivek Shukla', 'Heena Parveen', 'Lokesh Bisht'];
  const PROBS = ['"Gaalon pe pimples, 2 hafte se"', 'Hair fall · PRP session', 'Follow-up', '"Baal bahut gir rahe hain"', '"Chehre pe daag, dhoop se"', 'Skin', '"Haathon pe khujli, 1 mahine se"', 'Laser · session 3 of 6', '"Dandruff nahi ja raha"', 'Hair', '"Forehead pe pimples, 3 mahine se"', ''];
  const NOTES = ['Acne grade 2. Started adapalene at night. Review in 2 weeks.', 'PRP 2 of 4 done. Good response, less shedding.', 'Melasma both cheeks. Sunscreen daily + cream at night.', 'Hand eczema. Steroid cream 1 week, then moisturiser only.', 'Laser full arms, session 3. Mild redness is normal.', 'Hair fall after fever (telogen). Minoxidil 5% + biotin.', 'Fungal infection groin. Antifungal 4 weeks, keep dry.', 'Dandruff + scalp itch. Ketoconazole shampoo twice a week.', 'Mild acne, oily skin. Face wash + gel. Avoid picking.', 'Post-acne marks. Start peel next visit.'];
  const pool = NAMES.map((n, i) => ({ name: n, ph: '9100000' + String(10000 + i * 137).slice(-5) }));
  const FIRST = ['Aarti', 'Ajay', 'Alka', 'Amit', 'Anil', 'Anita', 'Asha', 'Bharat', 'Chetan', 'Dinesh', 'Ekta', 'Geeta', 'Hemant', 'Jaya', 'Kamal', 'Kiran', 'Lata', 'Mahesh', 'Mamta', 'Naveen', 'Neelam', 'Prakash', 'Rekha', 'Ritu', 'Sachin', 'Sapna', 'Seema', 'Sunil', 'Usha', 'Vinod', 'Zoya', 'Arif', 'Rubina', 'Tarun', 'Pallavi', 'Gunjan', 'Hitesh', 'Mansi', 'Nitin', 'Sonal'];
  const LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Jain', 'Agarwal', 'Chauhan', 'Rawat', 'Saxena', 'Mishra', 'Tyagi', 'Bhatia', 'Khan', 'Ansari', 'Kumar', 'Rana', 'Negi', 'Malhotra', 'Bhardwaj'];
  let extra = 0; const newPatient = () => { const p = { name: FIRST[Math.floor(rnd() * FIRST.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)], ph: '9100001' + String(10000 + extra * 7).slice(-5) }; extra++; pool.push(p); return p; };
  const recName = ((S.staff || []).find(x => x.role === 'reception') || { name: 'Reception' }).name;
  const fees = () => { const r = rnd(); return r < 0.06 ? 2500 : r < 0.11 ? 3000 : (S.fee || 500); };
  const vis = {}; const start = now.minus({ days: 60 }).startOf('day');
  let kseq = 0; const key = () => 'dm' + (kseq++).toString(36) + rid(6);
  for (let d = start; d < now.startOf('day'); d = d.plus({ days: 1 })) {
    if (d.weekday === 7) continue;
    const day = d.toFormat('yyyy-MM-dd'); const n = 14 + Math.floor(rnd() * 13); const L = [];
    let t = d.set({ hour: 10, minute: 5 });
    for (let i = 0; i < n; i++) {
      const p = rnd() < 0.5 && pool.length > 70 ? pool[60 + Math.floor(rnd() * (pool.length - 60))] : rnd() < 0.12 ? pick(pool.slice(0, 60)) : newPatient();
      const len = 7 + Math.floor(rnd() * 9); const out = t.plus({ minutes: len });
      const r = rnd(); const m = r < 0.6 ? 'upi' : r < 0.95 ? 'cash' : r < 0.98 ? 'free' : null;
      const fu = m && rnd() < 0.3 ? pick([7, 14, 30]) : 0;
      L.push({ k: key(), tok: 'A-' + (i + 1), name: p.name, ph: p.ph, in: t.toISO(), out: out.toISO(), fee: m ? (m === 'free' ? 0 : fees()) : null, m, by: m ? (rnd() < 0.85 ? recName : S.doctorName) : undefined, at: m ? out.plus({ minutes: 2 }).toISO() : undefined, fup: fu ? d.plus({ days: fu }).toFormat('yyyy-MM-dd') : null });
      t = out.plus({ minutes: 2 + Math.floor(rnd() * 6) }); if (t.hour === 14 && t.minute < 20) t = t.set({ hour: 15, minute: 0 });
    }
    vis[day] = L;
  }
  const days = Object.keys(vis).sort();
  pool.slice(0, 60).forEach(p => { const k = 1 + Math.floor(rnd() * 3); for (let j = 0; j < k; j++) { const dd = days[Math.floor(rnd() * days.length)]; const base = DateTime.fromISO(dd, { zone: TZ }).set({ hour: 11 + j, minute: 10 });
    vis[dd].push({ k: key(), tok: 'A-' + (vis[dd].length + 1), name: p.name, ph: p.ph, in: base.toISO(), out: base.plus({ minutes: 11 }).toISO(), fee: fees(), m: rnd() < 0.6 ? 'upi' : 'cash', by: recName, at: base.plus({ minutes: 13 }).toISO(), fup: null }); } });
  // today: 11 seen, 1 with the doctor, 8 waiting
  const q = { date: todayStr, seq: 0, list: [], durs: [9, 12, 10, 11, 8] };
  const todayL = []; let t = now.startOf('day').set({ hour: 10, minute: 5 });
  const newTk = (p, st, extra) => { q.seq++; const tk = Object.assign({ tok: 'A-' + q.seq, n: q.seq, phone: p.ph, name: p.name, src: rnd() < 0.7 ? 'qr' : 'desk', st, at: t.minus({ minutes: 20 }).toISO(), key: rid(10), missed: 0, prob: pick(PROBS) }, extra || {}); q.list.push(tk); return tk; };
  const used = new Set(); const nextP = () => { let p; do { p = pick(pool); } while (used.has(p.name)); used.add(p.name); return p; };
  for (let i = 0; i < 11; i++) {
    const p = i < 3 ? pool[i + 4] : nextP(); used.add(p.name); const len = 8 + Math.floor(rnd() * 6);
    const tk = newTk(p, 'd', { calledAt: t.toISO() }); const out = t.plus({ minutes: len });
    const m = i === 10 ? null : (i === 6 ? 'free' : rnd() < 0.6 ? 'upi' : 'cash');
    todayL.push({ k: tk.key, tok: tk.tok, name: p.name, ph: p.ph, in: t.toISO(), out: out.toISO(), fee: m ? (m === 'free' ? 0 : fees()) : null, m, by: m ? recName : undefined, at: m ? out.plus({ minutes: 2 }).toISO() : undefined, fup: m && i % 3 === 0 ? now.plus({ days: 7 }).toFormat('yyyy-MM-dd') : null });
    t = out.plus({ minutes: 3 });
  }
  vis[todayStr] = todayL;
  const cur = newTk(pool[0], 's', { calledAt: now.minus({ minutes: 4 }).toISO(), prob: '"Gaalon pe pimples, 2 hafte se"', toldTurn: true });
  ['Aman Gupta', 'Sunita Devi', 'Mohd. Faizan', 'Shreya Kapoor', 'Ankit Tiwari', 'Meera Joshi', 'Kabir Khan', 'Nikhil Arora'].forEach((nm, i) => {
    const p = pool.find(x => x.name === nm); newTk(p, 'w', { here: i < 3, told2: i < 2, prob: ['Hair fall · PRP 3 of 4', 'Follow-up · eczema cream review', '"Forehead pe pimples, 3 mahine se"', 'Laser · session 3 of 6', '', '"Chehre pe daag, dhoop se"', 'Skin', '"Baal bahut gir rahe hain"'][i] });
  });
  // follow-ups: some due today, some missed
  const fixFup = (name, date) => { const p = pool.find(x => x.name === name); for (const dd of Object.keys(vis).sort().reverse()) { const v = vis[dd].find(x => x.ph === p.ph && x.m); if (v && dd < todayStr) { v.fup = date; return; } } };
  ['Riya Sharma', 'Sunita Devi', 'Vikas Malhotra'].forEach(n => fixFup(n, todayStr));
  [['Arjun Mehta', 9], ['Neha Bansal', 15], ['Rohit Jain', 4], ['Gita Rani', 21]].forEach(([n, ago]) => { const p = pool.find(x => x.name === n);
    for (const dd of Object.keys(vis)) if (dd < todayStr) vis[dd] = vis[dd].filter(v => !(v.ph === p.ph && dd > now.minus({ days: ago + 10 }).toFormat('yyyy-MM-dd')));
    const dd = now.minus({ days: ago + 12 }).toFormat('yyyy-MM-dd'); if (!vis[dd]) vis[dd] = [];
    vis[dd].push({ k: key(), tok: 'A-9', name: p.name, ph: p.ph, in: now.minus({ days: ago + 12 }).set({ hour: 11 }).toISO(), out: now.minus({ days: ago + 12 }).set({ hour: 11, minute: 12 }).toISO(), fee: S.fee || 500, m: 'upi', by: recName, at: now.minus({ days: ago + 12 }).toISO(), fup: now.minus({ days: ago }).toFormat('yyyy-MM-dd') });
  });
  mem.vis = vis; mem.q = q;
  mem.notes = {}; pool.slice(0, 30).forEach((p, i) => { mem.notes['p' + p.ph] = { t: NOTES[i % NOTES.length], at: now.toISO(), by: S.doctorName }; });
  mem.fup = [];
  for (const dd of Object.keys(vis)) for (const v of vis[dd]) if (v.fup && v.fup >= todayStr && v.ph) mem.fup.push({ k: v.k, ph: v.ph, name: v.name, date: v.fup, sent: v.fup === todayStr });
  mem.doc = { status: 'in', setAt: now.startOf('day').set({ hour: 9, minute: 58 }).toISO() };
  mem.mcalls = [{ ph: '910000077412', at: now.minus({ minutes: 47 }).toISO() }, { ph: pool[6].ph, at: now.minus({ minutes: 95 }).toISO() }, { ph: '910000070908', at: now.minus({ minutes: 160 }).toISO() }];
  mem.callbacks = [{ phone: '910000055120', name: 'Ramesh Gupta', at: now.minus({ minutes: 30 }).toISO() }, { phone: '910000055121', name: 'Anjali Singh', at: now.minus({ minutes: 85 }).toISO() }];
  const tm = now.plus({ days: 1 }).toFormat('yyyy-MM-dd'); mem.wait = Object.assign({}, mem.wait || {}); mem.wait[tm] = [{ phone: '910000055130', lang: 'hl', at: now.toISO() }, { phone: '910000055131', lang: 'en', at: now.toISO() }];
  mem.nightSent = '';
  mem.ev = {}; const evAt = (ph, minsAgo, k, t) => { if (!mem.ev[ph]) mem.ev[ph] = []; mem.ev[ph].push({ at: now.minus({ minutes: minsAgo }).toISO(), k, t }); };
  evAt('910000077412', 190, 'call', 'Called · nobody picked up'); evAt('910000077412', 190, 'bot', 'Bot sent a WhatsApp reply'); evAt('910000077412', 182, 'cb', 'Asked for a call back'); evAt('910000077412', 181, 'why', 'Reason: "Laser hair removal ka price kya hai, aur kitne session lagenge?"'); evAt('910000077412', 150, 'msg', 'Messaged: "Hello? Koi call nahi aaya"');
  evAt(pool[6].ph, 95, 'call', 'Called · nobody picked up'); evAt(pool[6].ph, 95, 'bot', 'Bot sent a WhatsApp reply'); evAt(pool[6].ph, 88, 'booked', 'Booked Thu 20 Nov, 4:30 PM');
  evAt('910000055120', 70, 'msg', 'Messaged: "Kal ki report dikhani hai, doctor kab milenge?"'); evAt('910000055120', 69, 'cb', 'Asked for a call back'); evAt('910000055120', 68, 'why', 'Reason: "Report dikhani hai, kal subah aa sakta hoon?"');
  evAt('910000055121', 140, 'cb', 'Asked for a call back'); evAt('910000055121', 139, 'why', 'Reason: "Bete ko chehre pe allergy ho gayi hai"'); evAt('910000055121', 60, 'done', 'Called back by ' + recName);
  evAt('910000070908', 30, 'call', 'Called · nobody picked up'); evAt('910000070908', 30, 'bot', 'Bot sent a WhatsApp reply');
  evAt(pool[11].ph, 50, 'msg', 'Messaged: "Hi"'); evAt(pool[11].ph, 48, 'token', 'Came to the clinic · token A16');
  mem.pname = { '910000055121': 'Anjali Singh', '910000055120': 'Ramesh Gupta' };
  evAt('910000055120', 40, 'try', 'Called by ' + recName); evAt('910000055120', 39, 'noans', 'No answer · ' + recName + ' will try again');
  evAt('910000063311', 60 * 26, 'msg', 'Messaged: "Sunday ko clinic khula hai?"'); evAt('910000063311', 60 * 26 - 2, 'bot', 'Bot sent clinic timings'); mem.pname['910000063311'] = 'Kavita Rao';
  evAt('910000063312', 60 * 28, 'call', 'Called · nobody picked up'); evAt('910000063312', 60 * 28, 'bot', 'Bot sent a WhatsApp reply'); evAt('910000063312', 60 * 27, 'booked', 'Booked Wed 18 Nov, 11:00 AM');
  mem.callbacks = [{ phone: '910000077412', name: '', at: now.minus({ minutes: 182 }).toISO(), reason: 'Laser hair removal ka price kya hai, aur kitne session lagenge?', pinged: now.toISO() }, { phone: '910000055120', name: 'Ramesh Gupta', at: now.minus({ minutes: 69 }).toISO(), reason: 'Report dikhani hai, kal subah aa sakta hoon?', noans: 1, pinged: now.toISO() }];
  mem.st = {}; for (let i = 6; i >= 0; i--) { const d = now.minus({ days: i }); if (d.weekday === 7) continue; mem.st[d.toFormat('yyyy-MM-dd')] = { chats: 8 + Math.floor(rnd() * 8), booked: 2 + Math.floor(rnd() * 4), qr: 10 + Math.floor(rnd() * 9), mcalls: 3 + Math.floor(rnd() * 4), reminders: 2 + Math.floor(rnd() * 4) }; }
  // money by service, cash check, reminders that worked, reviews, sources
  for (const d0 of Object.keys(mem.vis)) for (const v of mem.vis[d0]) { if (!v.fee) continue; if (v.fee === 2500) v.items = [{ n: 'Chemical peel', p: 2500 }]; else if (v.fee === 3000) v.items = [{ n: 'Laser hair removal', p: 3000 }]; else if (rnd() < 0.07) { v.fee = 4500; v.items = [{ n: 'PRP (hair)', p: 4500 }]; } else if (rnd() < 0.06) { v.fee = 3500; v.items = [{ n: 'HydraFacial', p: 3500 }]; } else v.items = [{ n: 'Consultation', p: v.fee }]; }
  { const tv = (mem.vis[todayStr] || []).filter(v => v.m); if (tv[2]) { tv[2].fee = 3000; tv[2].items = [{ n: 'Consultation', p: 500 }, { n: 'Chemical peel', p: 2500 }]; } if (tv[5]) { tv[5].fee = 4500; tv[5].items = [{ n: 'PRP (hair)', p: 4500 }]; } }
  { const R0 = regSum(todayStr, todayStr); mem.close = { [todayStr]: { cash: R0.cash - 500, upi: R0.upi, by: recName, at: now.minus({ minutes: 5 }).toISO() } }; }
  const m0 = now.startOf('month'); for (let d = m0; d <= now; d = d.plus({ days: 1 })) { if (d.weekday === 7) continue; const k = d.toFormat('yyyy-MM-dd'); const o = mem.st[k] || (mem.st[k] = {});
    o.recalls = 2 + Math.floor(rnd() * 3); o.recallBack = rnd() < 0.55 ? 1 : 0; o.recallMoney = o.recallBack ? 500 + (rnd() < 0.3 ? 2500 : 0) : 0; o.rvAsk = 4 + Math.floor(rnd() * 4); o.rvGood = 2 + Math.floor(rnd() * 3); o.rvMid = rnd() < 0.3 ? 1 : 0; o.rvLow = rnd() < 0.1 ? 1 : 0;
    for (const sk of ['google', 'google', 'friend', 'friend', 'friend', 'board', 'doctor']) if (rnd() < 0.35) o['src_' + sk] = (o['src_' + sk] || 0) + 1; }
  mem.fb = [{ ph: pool[3].ph, name: pool[3].name, r: 1, t: 'Bahut der wait karna pada, 1.5 ghanta. Token ka time sahi batana chahiye.', at: now.minus({ days: 2 }).toISO() }, { ph: pool[8].ph, name: pool[8].name, r: 3, t: 'Doctor acche hain par reception pe koi phone nahi uthata.', at: now.minus({ days: 5 }).toISO() }];
  mem.rc = {}; mem.src = {};
}

// ---------- register: every visit, every bill, patients, follow-ups ----------
const hm = iso => { const d = DateTime.fromISO(iso || ''); return d.isValid ? d.setZone(TZ).toFormat('h:mm a') : ''; };
const visOf = d => (mem.vis && mem.vis[d]) || [];
const staffOf2 = p => (S.staff || []).some(x => String(x.phone || '').replace(/\D/g, '').slice(-10) === String(p || '').slice(-10));
function ev(ph, k, t) {
  ph = String(ph || '').replace(/\D/g, ''); if (!ph) return; if (!mem.ev) mem.ev = {};
  if (msg && msg.name && String(msg.from || '').replace(/\D/g, '') === ph) { if (!mem.pname) mem.pname = {}; if (mem.pname[ph] !== msg.name) mem.pname[ph] = String(msg.name).slice(0, 40); }
  const l = mem.ev[ph] || (mem.ev[ph] = []); l.push({ at: now.toISO(), k, t: String(t || '').slice(0, 220) }); if (l.length > 15) mem.ev[ph] = l.slice(-15);
  const keys = Object.keys(mem.ev); if (keys.length > 400) { const cut = now.minus({ days: 3 }).toISO(); for (const x of keys) { const a = mem.ev[x]; if (!a.length || a[a.length - 1].at < cut) delete mem.ev[x]; } }
}
function bump(k, n) { if (!mem.st) mem.st = {}; const day = now.toFormat('yyyy-MM-dd'); if (!mem.st[day]) { mem.st[day] = {}; const cut = now.minus({ days: 90 }).toFormat('yyyy-MM-dd'); for (const d of Object.keys(mem.st)) if (d < cut) delete mem.st[d]; } mem.st[day][k] = (mem.st[day][k] || 0) + (n || 1); }
const patKey = (ph, name) => ph ? 'p' + ph : 'n' + String(name || '').trim().toLowerCase();
const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');
function addVisit(tk) {
  if (!mem.vis) mem.vis = {};
  const l = mem.vis[todayStr] || (mem.vis[todayStr] = []);
  if (l.some(v => v.k === tk.key)) return;
  { const rc = (mem.rc || {})[tk.phone]; if (rc && rc.n > 0 && !rc.back) { rc.back = todayStr; bump('recallBack'); } }
  l.push({ k: tk.key, tok: tk.tok, name: tk.name || 'Patient', ph: tk.phone || '', in: tk.calledAt || now.toISO(), out: now.toISO(), fee: null, m: null, fupSug: tk.fupDays || 0, prob: tk.prob || '' });
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
  const live = sess && DateTime.fromISO(sess.exp) > now && !!staffRec(sess.phone);
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
    if (S.hookKey && b.key === S.hookKey && digits(b.phone || '')) { if (!mem.mcalls) mem.mcalls = []; mem.mcalls = mem.mcalls.filter(x => x.at > now.minus({ days: 3 }).toISO()).concat([{ ph: digits(b.phone), at: now.toISO() }]).slice(-200); bump('mcalls'); ev(b.phone, 'call', 'Called · nobody picked up'); if (b.sent !== false && b.sent !== 'false') ev(b.phone, 'bot', 'Bot sent a WhatsApp reply'); res = { ok: true }; }
    else res = { ok: false };
  } else if (b.action === 'tv') {
    res = (b.k && b.k === S.tvKey) ? { ok: true, ...publicQ(qRead()), clinic, doc: docInfo(), cabin } : { ok: false };
  } else if (b.action === 'login') {
    const c = mem.codes && mem.codes[String(b.code || '').toLowerCase()];
    if (!c || DateTime.fromISO(c.exp) < now) res = { ok: false, error: 'This login link has expired. Send LOGIN on WhatsApp again.' };
    else { const sid = rid(28); if (!mem.sess) mem.sess = {}; mem.sess[sid] = { phone: c.phone, role: c.role, name: c.name, exp: now.plus({ days: 30 }).toISO() };
      delete mem.codes[String(b.code).toLowerCase()]; if (!mem.users) mem.users = {};
      const u = mem.users[c.phone] || (mem.users[c.phone] = {}); u.last = { at: now.toISO(), ua: String(b.ua || '').slice(0, 40) };
      res = { ok: true, sid, role: c.role, name: c.name, clinic, needPw: false }; }
  } else if (b.action === 'otp_send' || b.action === 'otp_verify') {
    let ph = String(b.phone || '').replace(/\D/g, ''); if (ph.length === 10) ph = '91' + ph;
    const st = staffRec(ph); if (!mem.otp) mem.otp = {};
    for (const k of Object.keys(mem.otp)) if (DateTime.fromISO(mem.otp[k].exp) < now.minus({ hours: 2 })) delete mem.otp[k];
    if (!st) res = { ok: false, error: 'This number is not added to any clinic yet. Ask your doctor to add you in Clinic → Team.' };
    else {
      const full = String(st.phone).replace(/\D/g, ''); const o = mem.otp[full] || {};
      if (b.action === 'otp_send') {
        const sends = (o.sends || []).filter(t => DateTime.fromISO(t) > now.minus({ hours: 1 }));
        if (o.last && DateTime.fromISO(o.last) > now.minus({ seconds: 30 })) res = { ok: false, error: 'Please wait 30 seconds before asking for a new code.' };
        else if (sends.length >= 5) res = { ok: false, error: 'Too many codes asked. Try again in an hour.' };
        else {
          const sentTo = '+' + full.slice(0, 2) + ' ••••• ' + full.slice(-5);
          if (inWindow(full) || (S.templates && S.templates.otp)) {
            const code = String(Math.floor(100000 + Math.random() * 900000)); const salt = rid(8);
            mem.otp[full] = { salt, h: sha256(salt + code), exp: now.plus({ minutes: 10 }).toISO(), tries: 0, last: now.toISO(), sends: sends.concat([now.toISO()]) };
            if (!inWindow(full)) out.push({ messaging_product: 'whatsapp', to: full, type: 'template', template: { name: S.templates.otp, language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }, { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }] } });
            else out.push(textTo(full, `*${code}* is your Clinic Desk login code.\nIt works for 10 minutes. Do not share it with anyone.`));
            res = { ok: true, sentTo, name: st.name };
          } else res = { ok: true, sentTo, name: st.name, viaWa: true };
        }
      } else {
        const c = String(b.code || '').replace(/\D/g, '');
        if (!o.h || DateTime.fromISO(o.exp) < now) res = { ok: false, error: 'This code has expired. Ask for a new one.' };
        else if ((o.tries || 0) >= 5) res = { ok: false, error: 'Too many wrong codes. Ask for a new one.' };
        else if (sha256(o.salt + c) !== o.h) { o.tries = (o.tries || 0) + 1; res = { ok: false, error: 'Wrong code. Check WhatsApp and try again.' }; }
        else {
          delete mem.otp[full];
          if (!mem.users) mem.users = {}; const u = mem.users[full] || (mem.users[full] = {}); u.last = { at: now.toISO(), ua: String(b.ua || '').slice(0, 40) };
          const sid = rid(28); if (!mem.sess) mem.sess = {};
          for (const k of Object.keys(mem.sess)) if (DateTime.fromISO(mem.sess[k].exp) < now) delete mem.sess[k];
          mem.sess[sid] = { phone: full, role: st.role || 'reception', name: st.name || 'Staff', exp: now.plus({ days: 60 }).toISO() };
          res = { ok: true, sid, role: st.role || 'reception', name: st.name || 'Staff', clinic };
        }
      }
    }
  } else if (b.action === 'pw_login') {
    let ph = String(b.phone || '').replace(/\D/g, ''); if (ph.length === 10) ph = '91' + ph;
    const st = staffRec(ph); if (!mem.users) mem.users = {};
    const u = st ? mem.users[String(st.phone).replace(/\D/g, '')] : null;
    if (u && u.lock && DateTime.fromISO(u.lock) > now) res = { ok: false, error: 'Too many wrong tries. Wait 15 minutes, or reset your password on WhatsApp.' };
    else if (!st || !u || !u.hash || pwHash(u.salt, String(b.pw || '')) !== u.hash) {
      if (u && u.hash) { u.fails = (u.fails || 0) + 1; if (u.fails >= 5) { u.lock = now.plus({ minutes: 15 }).toISO(); u.fails = 0; } }
      res = { ok: false, error: st && (!u || !u.hash) ? 'No password set yet. Use "First time? Get login link" below.' : 'Phone number or password is wrong.' };
    } else {
      u.fails = 0; u.lock = null; u.last = { at: now.toISO(), ua: String(b.ua || '').slice(0, 40) };
      const sid = rid(28); if (!mem.sess) mem.sess = {};
      for (const k of Object.keys(mem.sess)) if (DateTime.fromISO(mem.sess[k].exp) < now) delete mem.sess[k];
      mem.sess[sid] = { phone: String(st.phone).replace(/\D/g, ''), role: st.role || 'reception', name: st.name || 'Staff', exp: now.plus({ days: 30 }).toISO() };
      res = { ok: true, sid, role: st.role || 'reception', name: st.name || 'Staff', clinic };
    }
  } else if (!live) {
    res = { ok: false, auth: true, error: 'Please log in again.' };
  } else {
    if (mem.docPend && mem.docPend.due <= now.toISO()) { const pd = mem.docPend; delete mem.docPend; mem.doc = pd.prev; res.flushed = setDoc(pd.status, pd.mins, out); }
    if (!mem.docPend && mem.doc && (mem.doc.status === 'late' || mem.doc.status === 'away') && mem.doc.until && DateTime.fromISO(mem.doc.until) < now.minus({ minutes: 15 })) mem.doc = { status: 'in', setAt: now.toISO(), auto: true };
    const stNow = staffRec(sess.phone); const role = stNow.role || sess.role; const isDoc = role === 'doctor' || role === 'owner'; if (stNow.name && sess.name !== stNow.name) sess.name = stNow.name;
    const q0 = qRead();
    const callBy = S.callBy === 'reception' ? 'reception' : 'doctor';
    if (['call_next', 'finish', 'call_now'].includes(b.action) && role === 'reception' && callBy === 'doctor' && b.action !== 'finish') { res.error = 'The doctor calls the next patient in this clinic.'; }
    else if (['call_next', 'finish', 'call_now'].includes(b.action)) { const q = qWrite(); const cur = servingOf(q);
      if (cur && isDoc && b.forTok === cur.tok) {
        if (b.note && String(b.note).trim()) { if (!mem.notes) mem.notes = {}; mem.notes[patKey(cur.phone, cur.name)] = { t: String(b.note).trim().slice(0, 600), at: now.toISO(), by: sess.name }; }
        if (b.fup !== undefined) cur.fupDays = Math.max(0, Math.min(400, Number(b.fup) || 0));
      }
      if (b.action === 'call_now') { const tk = q.list.find(x => x.key === b.key && x.st === 'w');
        if (tk) { const rest = q.list.filter(x => x !== tk); const i = rest.findIndex(x => x.st === 'w'); rest.splice(i < 0 ? rest.length : i, 0, tk); q.list = rest; } }
      if (!mem.docPend && ['late', 'away'].includes(docRead().status)) res.backIn = setDoc('in', 0, out) + 1;
      if (b.action === 'finish' || (b.action === 'call_next' && isDoc && callBy === 'reception')) finishCur(q, out); else callNext(q, out); }
    else if (b.action === 'not_here') { const q = qWrite(); notHere(q, out); }
    else if (b.action === 'add_token') { const q = qWrite(); const ph = digits(b.phone || ''); const full = ph.length === 10 ? '91' + ph : ph;
      const tk = issueToken(q, full, String(b.name || 'Walk-in').slice(0, 40), b.src === 'book' ? 'book' : 'desk'); if (b.prob) tk.prob = String(b.prob).slice(0, 120); if (b.bookAt) tk.bookAt = String(b.bookAt).slice(0, 10);
      if (b.srcOf && SRC[b.srcOf]) { if (!mem.src) mem.src = {}; mem.src[full || ('n' + String(b.name || '').toLowerCase())] = { s: b.srcOf, at: now.toISO() }; bump('src_' + b.srcOf); }
      if (full && inWindow(full)) out.push(tokenMsg(q, tk, full)); res.added = tk.tok; }
    else if (b.action === 'remove_token') { const q = qWrite(); const tk = q.list.find(x => x.key === b.key); if (tk) tk.st = 'x'; }
    else if (b.action === 'set_status') { const st0 = ['in', 'late', 'away', 'leave'].includes(b.status) ? b.status : 'in'; const m0 = Number(b.mins) || 0;
      const prevDoc = mem.docPend ? mem.docPend.prev : docRead();
      mem.docPend = { status: st0, mins: m0, due: now.plus({ seconds: 10 }).toISO(), prev: prevDoc, by: sess.name };
      mem.doc = { status: st0, mins: m0, setAt: now.toISO(), until: (st0 === 'late' || st0 === 'away') && m0 ? now.plus({ minutes: m0 }).toISO() : null, told: [] };
      res.pending = true; res.willTell = st0 === 'in' ? (prevDoc.told || []).length : waitingOf(qRead()).filter(x => x.phone && inWindow(x.phone)).length; }
    else if (b.action === 'status_undo') { if (mem.docPend) { mem.doc = mem.docPend.prev; delete mem.docPend; res.undone = true; } }
    else if (b.action === 'chat_send' && !isDoc || (b.action === 'chat_send' && role === 'owner')) { const ph = digits(b.phone); if (ph && b.text) { out.push(textTo(ph, String(b.text).slice(0, 1000))); chatLog(ph, 'staff', b.text); if (mem.live[ph]) mem.live[ph].last = now.toISO(); } }
    else if (b.action === 'chat_end') { const ph = digits(b.phone); if (mem.live[ph]) { delete mem.live[ph]; const lg = langOf(ph, ''); out.push(textTo(ph, T[lg].liveOff)); chatLog(ph, 'bot', T[lg].liveOff); } }
    else if (b.action === 'set_pw') {
      const pw = String(b.pw || '');
      if (pw.length < 6) res.error = 'Password needs at least 6 characters.';
      else { if (!mem.users) mem.users = {}; const u = mem.users[sess.phone] || (mem.users[sess.phone] = {}); u.salt = rid(16); u.hash = pwHash(u.salt, pw); u.fails = 0; u.lock = null; u.setAt = now.toISO(); res.pwSet = true; }
    }
    else if (b.action === 'setup_save' && isDoc) {
      const c0 = b.cfg || {}; const cfg = Object.assign({}, mem.cfg || {});
      const str = (v, n) => String(v || '').trim().slice(0, n);
      if (c0.type && PRESETS[c0.type]) { if (cfg.type !== c0.type) cfg.services = PRESETS[c0.type].services; cfg.type = c0.type; }
      if (c0.clinicName) cfg.clinicName = str(c0.clinicName, 60);
      if (c0.doctorName) cfg.doctorName = str(c0.doctorName, 60);
      if (c0.address !== undefined) cfg.address = str(c0.address, 120);
      if (c0.fee !== undefined) cfg.fee = Math.max(0, Math.min(100000, Math.round(Number(c0.fee) || 0)));
      if (c0.upiId !== undefined) { cfg.upiId = str(c0.upiId, 60).replace(/\s/g, ''); cfg.upiName = cfg.clinicName || S.clinicName; }
      if (c0.open && c0.close && Array.isArray(c0.days)) {
        const ok = t => /^\d{2}:\d{2}$/.test(t); if (ok(c0.open) && ok(c0.close)) { const H = {}; ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(d => { H[d] = c0.days.includes(d) ? [`${c0.open}-${c0.close}`] : []; }); cfg.hours = H; cfg.open = c0.open; cfg.close = c0.close; cfg.days = c0.days.filter(d => H[d]); }
      }
      if (['doctor', 'reception'].includes(c0.callBy)) cfg.callBy = c0.callBy;
      if (c0.done) cfg.setupDone = true;
      mem.cfg = cfg; Object.assign(S, cfg); res.saved = true;
    }
    else if (b.action === 'team_add' && isDoc) {
      let ph = String(b.phone || '').replace(/\D/g, ''); if (ph.length === 10) ph = '91' + ph;
      if (ph.length < 12) res.error = 'Enter a 10-digit mobile number.';
      else if (OWNERS.some(o => String(o.phone).slice(-10) === ph.slice(-10))) res.error = 'This is the owner number. It always opens the doctor app.';
      else { const T = (Array.isArray(mem.team) && mem.team.length ? mem.team : (S.staff || [])).filter(x => String(x.phone).slice(-10) !== ph.slice(-10));
        T.push({ phone: ph, name: String(b.name || 'Staff').trim().slice(0, 40) || 'Staff', role: ['reception', 'doctor'].includes(b.role) ? b.role : 'reception' }); mem.team = T; S.staff = T; res.added = true; }
    }
    else if (b.action === 'team_remove' && isDoc) {
      const ph = String(b.phone || '').replace(/\D/g, '');
      const T = (Array.isArray(mem.team) && mem.team.length ? mem.team : (S.staff || []));
      const x = T.find(y => String(y.phone).slice(-10) === ph.slice(-10));
      if (!x || x.role === 'owner' || String(x.phone).slice(-10) === sess.phone.slice(-10)) res.error = 'This person can not be removed.';
      else { mem.team = T.filter(y => y !== x); S.staff = mem.team; for (const k of Object.keys(mem.sess || {})) if (mem.sess[k].phone.slice(-10) === ph.slice(-10)) delete mem.sess[k]; res.removed = true; }
    }
    else if (b.action === 'demo_seed' && role === 'owner') { seedDemo(); res.seeded = true; }
    else if (b.action === 'demo_clear' && role === 'owner') { for (const k of ['vis', 'q', 'notes', 'fup', 'mcalls', 'callbacks', 'st', 'otp', 'ev', 'pname', 'rc', 'rv', 'fb', 'src', 'close', 'regBk']) delete mem[k]; mem.wait = {}; mem.nightSent = ''; mem.doc = { status: 'in', setAt: now.toISO() }; res.cleared = true; }
    else if (b.action === 'bill') {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(b.day || '') ? b.day : todayStr;
      const v = visOf(day).find(x => x.k === b.k);
      if (!v) res.error = 'This visit was not found.';
      else {
        v.m = ['cash', 'upi', 'free'].includes(b.m) ? b.m : 'cash';
        v.fee = v.m === 'free' ? 0 : Math.max(0, Math.min(500000, Math.round(Number(b.fee) || 0)));
        if (Array.isArray(b.items)) { const BL = billList(); v.items = b.items.map(n => BL.find(x => x.n === n)).filter(Boolean).map(x => ({ n: x.n, p: x.p })).slice(0, 8); }
        { const rc = (mem.rc || {})[v.ph]; if (rc && rc.back === day && !rc.paid && v.fee) { rc.paid = v.fee; bump('recallMoney', v.fee); } }
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
    else if (b.action === 'close_day') { if (!mem.close) mem.close = {}; mem.close[todayStr] = { cash: Math.max(0, Math.round(Number(b.cash) || 0)), upi: Math.max(0, Math.round(Number(b.upi) || 0)), by: sess.name, at: now.toISO() }; res.closed = true; }
    else if (b.action === 'set_bill' && isDoc) { const L = (Array.isArray(b.bill) ? b.bill : []).map(x => ({ n: String(x.n || '').trim().slice(0, 40), p: Math.max(0, Math.min(500000, Math.round(Number(x.p) || 0))) })).filter(x => x.n).slice(0, 20); if (!mem.cfg) mem.cfg = {}; mem.cfg.bill = L; }
    else if (b.action === 'set_review' && isDoc) { const u = String(b.url || '').trim(); if (u && !/^https:\/\/(g\.page|maps\.app\.goo\.gl|goo\.gl|www\.google\.|search\.google\.|g\.co)/.test(u)) res.error = 'Paste the review link from your Google Business Profile.'; else { if (!mem.cfg) mem.cfg = {}; mem.cfg.googleReview = u; } }
    else if (b.action === 'backup_now' && role === 'owner') { res.backup = true; mem.bkAt = now.toISO(); }
    else if (b.action === 'download' && role === 'owner') { res.dump = JSON.stringify(memSafe()); }
    else if (b.action === 'cb_try') { const ph = digits(b.phone); const cb = (mem.callbacks || []).find(x => x.phone === ph); if (cb) { cb.tries = (cb.tries || 0) + 1; cb.tryAt = now.toISO(); cb.by = sess.name; ev(ph, 'try', 'Called by ' + sess.name); } }
    else if (b.action === 'cb_noans') { const ph = digits(b.phone); const cb = (mem.callbacks || []).find(x => x.phone === ph); if (cb) { cb.noans = (cb.noans || 0) + 1; cb.tryAt = null; ev(ph, 'noans', 'No answer · ' + sess.name + ' will try again'); } }
    else if (b.action === 'cb_done') { const ph = digits(b.phone); if ((mem.callbacks || []).some(x => x.phone === ph)) ev(ph, 'done', 'Talked · called back by ' + sess.name); mem.callbacks = (mem.callbacks || []).filter(x => x.phone !== ph); }
    // the state every screen needs
    const q = qRead();
    const cur = servingOf(q);
    res.me = { name: sess.name, role };
    res.clinic = clinic; res.doc = docInfo();
    res.queue = { now: cur ? { tok: cur.tok, name: cur.name, src: cur.src, key: cur.key, phone: isDoc ? '' : mask(cur.phone), since: DateTime.fromISO(cur.calledAt).setZone(TZ).toFormat('h:mm a') } : null,
      waiting: waitingOf(q).slice(0, 25).map(x => ({ tok: x.tok, name: x.name, src: x.src, bookAt: x.bookAt || '', key: x.key, missed: x.missed || 0, ahead: aheadOf(q, x), told2: !!x.told2, phone: isDoc ? '' : mask(x.phone), here: !!x.here })),
      done: q.list.filter(x => x.st === 'd').length, avg: avgMin(q), open: isOpenNow() };
    res.links = { tv: S.tvKey ? `${APP}?v=tv&k=${S.tvKey}` : '', qr, poster: `${APP}?v=qr&n=${S.botNumber || ''}&c=${encodeURIComponent(C)}` };
    res.fee = S.fee || 0; res.upi = S.upiId ? { id: S.upiId, name: S.upiName || C } : null; res.bill = billList(); res.dayClosed = !!(mem.close || {})[todayStr]; res.review = (mem.cfg || {}).googleReview || ''; res.bkAt = mem.bkAt ? DateTime.fromISO(mem.bkAt).setZone(TZ).toFormat('d LLL, h:mm a') : '';
    const todayV = visOf(todayStr);
    const freeDays = S.followFreeDays === undefined ? 7 : Number(S.followFreeDays) || 0;
    const lastPaid = (v) => { const key = patKey(v.ph, v.name); const days = Object.keys(mem.vis || {}).filter(d => d < todayStr && d >= now.minus({ days: freeDays }).toFormat('yyyy-MM-dd')).sort().reverse();
      for (const d of days) { const x = (mem.vis[d] || []).find(y => patKey(y.ph, y.name) === key && (y.m === 'cash' || y.m === 'upi')); if (x) return d; } return null; };
    res.toBill = todayV.filter(v => !v.m).map(v => { const lp = freeDays ? lastPaid(v) : null;
      return { k: v.k, tok: v.tok, name: v.name, seen: `${hm(v.in)} – ${hm(v.out)}`, fupSug: v.fupSug || 0, freeFollow: !!lp, lastPaid: lp ? DateTime.fromISO(lp).toFormat('d LLL') : '', prob: v.prob || '' }; });
    res.freeDays = freeDays; res.callBy = S.callBy === 'reception' ? 'reception' : 'doctor';
    res.today = { seen: todayV.length, waiting: waitingOf(q).length };
    if (isDoc) {
      const t0 = regSum(todayStr, todayStr); res.today.money = t0.money; res.today.nobill = t0.nobill;
      const inQ = ph => q.list.find(x => x.phone === ph && x.st !== 'x');
      res.fups = (mem.fup || []).filter(f => f.date === todayStr).map(f => { const t = inQ(f.ph); return { name: f.name, state: t ? (t.st === 'd' ? 'Visited' : 'In queue · ' + t.tok) : f.sent ? 'Reminded' : 'Not booked', c: t ? 'ok' : f.sent ? '' : 'warn' }; });
    }

    res.me.phone = sess.phone;
    res.setupDone = !!(mem.cfg && mem.cfg.setupDone);
    if (isDoc) {
      const cf = Object.assign({ type: 'skin' }, mem.cfg || {});
      res.cfg = { type: cf.type || 'skin', clinicName: S.clinicName, doctorName: S.doctorName, address: S.address || '', fee: S.fee || 0, upiId: S.upiId || '', open: cf.open || '10:00', close: cf.close || '20:00', days: cf.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], types: Object.keys(PRESETS).map(k => [k, PRESETS[k].label]) };
      res.team = (S.staff || []).map(x => { const u = (mem.users || {})[String(x.phone).replace(/\D/g, '')] || {}; const l = u.last ? DateTime.fromISO(u.last.at).setZone(TZ) : null;
        return { name: x.name, role: x.role, phone: '+' + String(x.phone).replace(/\D/g, ''), me: String(x.phone).slice(-10) === sess.phone.slice(-10), pw: !!u.hash, last: l ? (l > now.startOf('day') ? 'today ' + l.toFormat('h:mm a') : l.toFormat('d LLL, h:mm a')) + (u.last.ua ? ' · ' + u.last.ua : '') : 'never' }; });
      // what helps the doctor most, on one screen
      const P = allPatients(); const byKey = {}; P.forEach(p => { byKey[p.key] = p; });
      const hist = x => { const p = byKey[patKey(x.phone, x.name)]; const nt = (mem.notes || {})[patKey(x.phone, x.name)];
        const fu = p && p.fup && p.fup >= now.minus({ days: 5 }).toFormat('yyyy-MM-dd') && p.fup <= now.plus({ days: 3 }).toFormat('yyyy-MM-dd');
        return { visits: p ? p.n : 0, last: p ? (p.last === todayStr ? 'today' : DateTime.fromISO(p.last).toFormat('d LLL')) : '', note: nt ? nt.t : '', fu: !!fu, pk: p ? p.key : '' }; };
      const cur2 = servingOf(q); const w2 = waitingOf(q);
      res.boon = {
        now: cur2 ? Object.assign({ tok: cur2.tok, key: cur2.key, name: cur2.name, prob: cur2.prob || '' }, hist(cur2)) : null,
        next: w2.slice(0, 4).map(x => Object.assign({ tok: x.tok, key: x.key, name: x.name, prob: x.prob || '' }, hist(x))),
        done: q.list.filter(x => x.st === 'd').slice(-2).map(x => ({ tok: x.tok, name: x.name, pk: patKey(x.phone, x.name) })),
        more: Math.max(0, w2.length - 4),
        finish: (w2.length || cur2) ? now.plus({ minutes: (w2.length + (cur2 ? 0.5 : 0)) * avgMin(q) }).toFormat('h:mm a') : '',
        lost: P.filter(p => p.fup && p.fup < todayStr && p.fup >= now.minus({ days: 45 }).toFormat('yyyy-MM-dd')).sort((a, c) => c.fup.localeCompare(a.fup)).slice(0, 8)
          .map(p => ({ name: p.name, pk: p.key, due: DateTime.fromISO(p.fup).toFormat('d LLL'), wa: p.ph ? 'https://wa.me/' + p.ph : '' })),
      };
    }
    if (isDoc) {
      const st0 = (mem.st || {})[todayStr] || {}; const wk = {}; for (const d of Object.keys(mem.st || {})) if (d >= now.minus({ days: 6 }).toFormat('yyyy-MM-dd')) for (const k of Object.keys(mem.st[d])) wk[k] = (wk[k] || 0) + mem.st[d][k];
      const mcToday = (mem.mcalls || []).filter(x => x.at >= now.startOf('day').toISO());
      res.wa = { today: { chats: st0.chats || 0, booked: st0.booked || 0, qr: st0.qr || 0, mcalls: mcToday.length, mcBooked: mcToday.filter(x => rows.some(r => r.phone === x.ph && active(r))).length, reminders: st0.reminders || 0, callbacks: (mem.callbacks || []).length }, week: wk };
    }
    if (isDoc && (b.view === 'act' || b.view === undefined)) {
      const since = now.minus({ hours: 36 }).toISO(); const nameOf = ph => { if (mem.pname && mem.pname[ph]) return mem.pname[ph]; const c = (mem.callbacks || []).find(x => x.phone === ph); if (c && c.name) return c.name; const r = rows.find(x => x.phone === ph && x.name); if (r) return r.name; for (const d of Object.keys(mem.vis || {}).sort().reverse()) { const v = (mem.vis[d] || []).find(y => y.ph === ph); if (v) return v.name; } return ''; };
      const ago = iso => { const m = Math.max(0, Math.round(now.diff(DateTime.fromISO(iso), 'minutes').minutes)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 >= 10 && m < 600 ? ' ' + (m % 60) + ' min' : ''); };
      const feed = Object.keys(mem.ev || {}).map(ph => ({ ph, l: (mem.ev[ph] || []).filter(e => e.at >= since) })).filter(x => x.l.length).map(x => {
        const last = x.l[x.l.length - 1]; const cb = (mem.callbacks || []).find(c => c.phone === x.ph);
        let st;
        if (cb) st = { label: (cb.noans ? 'No answer ×' + cb.noans + ' · ' : 'Waiting ') + ago(cb.at), tone: 'bad' };
        else if (last.k === 'booked') st = { label: last.t + ' ✓', tone: 'ok' };
        else if (last.k === 'token') st = { label: 'Came to the clinic ✓', tone: 'ok' };
        else if (last.k === 'done') st = { label: last.t + ' ✓', tone: 'ok' };
        else if (last.k === 'bot' || last.k === 'call') st = { label: 'No reply to our WhatsApp', tone: 'mid' };
        else st = { label: 'Talking to the bot', tone: 'mid' };
        const lastDay = DateTime.fromISO(last.at).setZone(TZ).toFormat('yyyy-MM-dd'); return { ph: x.ph, day: lastDay === todayStr ? 'today' : 'before', tried: !!(cb && cb.tryAt), name: nameOf(x.ph), shown: '+' + x.ph.slice(0, 2) + ' ' + x.ph.slice(2, 7) + ' ' + x.ph.slice(7), call: '+' + x.ph, at: DateTime.fromISO(x.l[0].at).setZone(TZ).toFormat('h:mm a'), last: last.at, st, reason: cb ? cb.reason || '' : '', items: x.l.map(e => ({ t: DateTime.fromISO(e.at).setZone(TZ).toFormat('h:mm a'), k: e.k, txt: e.t })) };
      }).sort((a, c) => c.last.localeCompare(a.last)).slice(0, 40);
      res.act = { attention: feed.filter(x => x.st.tone === 'bad'), feed };
      { const m0 = now.startOf('month').toFormat('yyyy-MM-dd'); const T = stSum(m0, todayStr); const srcs = Object.keys(SRC).map(k => ({ k, label: SRC[k], n: T['src_' + k] || 0 })).filter(x => x.n).sort((a, c) => c.n - a.n);
        res.grow = { month: now.toFormat('LLLL'), recalls: T.recalls || 0, back: T.recallBack || 0, money: T.recallMoney || 0, good: T.rvGood || 0, mid: T.rvMid || 0, low: T.rvLow || 0, asked: T.rvAsk || 0, link: !!(mem.cfg || {}).googleReview, src: srcs,
          fb: (mem.fb || []).slice(-6).reverse().map(f => ({ name: f.name || ('+' + f.ph), r: f.r, t: f.t, at: DateTime.fromISO(f.at).setZone(TZ).toFormat('d LLL'), call: '+' + f.ph })) }; }
    }
    { const rg = ((S.hours || {})[now.toFormat('ccc').toLowerCase()] || []); const hm = now.toFormat('HH:mm'); const cur = rg.find(r => hm < r.split('-')[1].trim()) || rg[rg.length - 1]; const f = t => DateTime.fromFormat(t.trim(), 'HH:mm').toFormat('h:mm a').replace(':00', '');
      res.opd = cur ? { label: (+cur.split('-')[0].slice(0, 2) < 14 ? 'Morning OPD' : 'Evening OPD'), time: cur.split('-').map(f).join(' – ') } : { label: 'No OPD today', time: '' }; }
      // tell reception on WhatsApp once if a call back waits 30+ min (only reaches staff who messaged the bot in the last 24 h)
      for (const cb of (mem.callbacks || [])) if (!cb.pinged && cb.at < now.minus({ minutes: 30 }).toISO() && isOpenNow()) { cb.pinged = now.toISO(); for (const st of (S.staff || []).filter(x => x.role === 'reception' && inWindow(x.phone))) out.push(textTo(st.phone, '⏰ Call back pending 30+ min: ' + ((mem.pname || {})[cb.phone] || cb.name || '+' + cb.phone) + (cb.reason ? ' — "' + cb.reason + '"' : '') + '\nCall: +' + cb.phone)); }
    if (b.view === 'register' && isDoc) {
      const per = ['today', 'week', 'month'].includes(b.period) ? b.period : 'today';
      const from = per === 'today' ? todayStr : per === 'week' ? now.minus({ days: 6 }).toFormat('yyyy-MM-dd') : now.startOf('month').toFormat('yyyy-MM-dd');
      const R = regSum(from, todayStr);
      const dl = d => d === todayStr ? '' : DateTime.fromISO(d).toFormat('d LLL') + ', ';
      res.register = { period: per, seen: R.seen, money: R.money, cash: R.cash, upi: R.upi, free: R.free, nobill: R.nobill,
        flags: R.V.filter(v => !v.m || v.m === 'free').reverse().slice(0, 40).map(v => ({ name: (v.tok ? v.tok + ' · ' : '') + v.name, sub: v.m ? `Marked by ${v.by || 'staff'}, ${dl(v.day)}${hm(v.at)}` : `Seen ${dl(v.day)}${hm(v.in)} – ${hm(v.out)}`, tag: v.m ? 'No charge' : 'No bill', bad: !v.m })),
        calls: (mem.mcalls || []).filter(x => x.at >= DateTime.fromISO(from, { zone: TZ }).toISO()).length };
      { const E = {}; for (const v of R.V) { if (!v.fee || v.m === 'free') continue; if (v.items && v.items.length) { const tot = v.items.reduce((a, x) => a + x.p, 0) || 1; for (const it of v.items) { const e = E[it.n] || (E[it.n] = { n: it.n, money: 0, count: 0 }); e.money += Math.round(v.fee * it.p / tot); e.count++; } } else { const e = E['Consultation'] || (E['Consultation'] = { n: 'Consultation', money: 0, count: 0 }); e.money += v.fee; e.count++; } }
        res.register.earn = Object.values(E).sort((a, c) => c.money - a.money); }
      if (per === 'today') { const cl = (mem.close || {})[todayStr]; res.register.close = cl ? { cash: cl.cash, upi: cl.upi, by: cl.by, at: hm(cl.at), cashDiff: cl.cash - R.cash, upiDiff: cl.upi - R.upi } : null; }
    }
    if (b.view === 'patients') {
      const s0 = String(b.q || '').trim().toLowerCase(); const sd = digits(s0);
      let P = allPatients();
      const total = P.length;
      if (s0) P = P.filter(p => (p.name || '').toLowerCase().includes(s0) || (sd.length >= 3 && (p.ph || '').includes(sd)));
      P.sort((a, c) => c.last.localeCompare(a.last));
      res.patients = { total, list: P.slice(0, 80).map(p => { const t = fupTag(p); return { key: p.key, name: p.name, sub: (p.last === todayStr ? 'Today' : DateTime.fromISO(p.last).toFormat('d LLL')) + ' · ' + (p.n === 1 ? 'first visit' : p.n + ' visits'), tag: t[0], tc: t[1] }; }) };
    }
    if ((b.view === 'patient' || b.view === 'patients') && b.pk) {
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
      const inQueue = ph => q.list.some(x => x.phone === ph && x.st !== 'x');
      res.appts = mineToday.map(r => ({ here: inQueue(r.phone), ph: isDoc ? '' : r.phone, time: at(r.date, r.time).toFormat('h:mm a'), name: r.name || 'Patient', treat: r.service || 'Appointment', status: r.status, isNew: !seenBefore(r.phone), visits: rows.filter(x => x.phone === r.phone && x.date <= todayStr && ['booked', 'confirmed', 'sent'].includes(x.status)).length, phone: isDoc ? '' : mask(r.phone) }));
    }
    if (!isDoc || role === 'owner') {
      const lv = Object.keys(mem.live || {}).filter(p => DateTime.fromISO(mem.live[p].last) > now.minus({ hours: 2 }));
      const bookedAfter = (ph, iso) => rows.some(r => r.phone === ph && active(r) && r.date >= todayStr);
      res.inbox = {
        calls: (mem.mcalls || []).slice(-40).reverse().map(x => ({ phone: x.ph, shown: mask(x.ph), call: '+' + x.ph, at: DateTime.fromISO(x.at).setZone(TZ).toFormat(DateTime.fromISO(x.at) > now.startOf('day') ? 'h:mm a' : 'd LLL'), booked: bookedAfter(x.ph, x.at) })),
        live: lv.map(p => { const l = (mem.chat || {})[p] || []; const last = l[l.length - 1]; return { phone: p, shown: mask(p), name: mem.live[p].name || 'Patient', last: last ? last.t : '', at: last ? DateTime.fromISO(last.at).setZone(TZ).toFormat('h:mm a') : '' }; }),
        callbacks: (mem.callbacks || []).slice(-20).map(x => ({ phone: x.phone, shown: mask(x.phone), call: '+' + x.phone, name: (mem.pname || {})[x.phone] || x.name, reason: x.reason || '', tried: !!x.tryAt, noans: x.noans || 0, at: DateTime.fromISO(x.at).setZone(TZ).toFormat('h:mm a') })),
        wait: Object.keys(mem.wait || {}).filter(d => d >= todayStr).flatMap(d => (mem.wait[d] || []).map(w => ({ phone: w.phone, shown: mask(w.phone), call: '+' + w.phone, day: DateTime.fromISO(d).toFormat('ccc d LLL') }))),
      };
      if (b.chat) { const ph = digits(b.chat); res.chat = { phone: ph, shown: mask(ph), name: (mem.live[ph] || {}).name || 'Patient', open: !!mem.live[ph], msgs: ((mem.chat || {})[ph] || []).map(m => ({ who: m.who, t: m.t, at: DateTime.fromISO(m.at).setZone(TZ).toFormat('h:mm a') })) }; }
    }
  }
  res.sent = out.length;
  const first = out.shift() || null;
  const bk = res.backup ? { rows: [], snap: backupSnap() } : null; if (res.backup) res.backup = true;
  return [{ json: { action: first ? 'reply' : 'none', payload: first, more: out, desk: res, backup: bk, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
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
  const cl = (mem.close || {})[dk];
  const look = [R.nobill ? `${R.nobill} seen, no bill` : '', R.free ? `${R.free} marked No charge` : '', !cl ? 'Day not closed by reception' : (cl.cash - R.cash) < 0 ? `Cash ${rupees(R.cash - cl.cash)} short` : (cl.cash - R.cash) > 0 ? `Cash ${rupees(cl.cash - R.cash)} extra` : ''].filter(Boolean);
  const E = {}; for (const v of R.V) { if (!v.fee || v.m === 'free') continue; const its = v.items && v.items.length ? v.items : [{ n: 'Consultation', p: v.fee }]; const tot = its.reduce((a, x) => a + x.p, 0) || 1; for (const it of its) E[it.n] = (E[it.n] || 0) + Math.round(v.fee * it.p / tot); }
  const earn = Object.keys(E).sort((a, c) => E[c] - E[a]).slice(0, 4).map(k => `${k} ${rupees(E[k])}`).join('\n');
  const T = stSum(dk, dk); const pend = (mem.callbacks || []).length;
  const growTxt = [T.recallBack ? `${T.recallBack} came back after our reminder${T.recallMoney ? ' · ' + rupees(T.recallMoney) : ''}` : '', T.rvGood || T.rvLow || T.rvMid ? `Reviews: ${T.rvGood || 0} happy, ${(T.rvMid || 0) + (T.rvLow || 0)} not happy` : '', pend ? `${pend} still waiting for a call back` : ''].filter(Boolean);
  const backup = { rows: mem.regBk === dk ? [] : R.V.map(v => [dk, v.tok || '', v.name || '', v.ph ? '+' + v.ph : '', v.prob || '', (v.items || []).map(x => x.n).join(', '), v.fee == null ? '' : v.fee, v.m || 'not billed', v.by || '', v.fup || '', ((mem.notes || {})[patKey(v.ph, v.name)] || {}).t || '']), snap: null };
  mem.regBk = dk; mem.bkAt = now.toISO(); backup.snap = backupSnap();
  const body = `*${C} · ${day.toFormat('ccc d LLL')}*\n\nEarned: *${rupees(R.money)}* from ${R.seen} patient${R.seen === 1 ? '' : 's'}\nCash ${rupees(R.cash)} · UPI ${rupees(R.upi)}\n${earn ? '\n' + earn + '\n' : ''}\n` + (growTxt.length ? growTxt.join('\n') + '\n\n' : '') +
    (look.length ? `*Needs a look*\n${look.join('\n')}\n\n` : 'Every visit is billed ✓\n\n') +
    `Missed calls: ${calls.length}${calls.length ? ` · ${callsBooked} booked` : ''}\nFollow-ups tomorrow: ${fT}`;
  const to = [...new Set((S.doctorNumbers || []).concat((S.staff || []).filter(x => x.role === 'owner' || x.role === 'doctor').map(x => x.phone)).map(digits))];
  if (!mem.nightSent) mem.nightSent = '';
  const bkOut = [{ json: { action: 'none', payload: null, more: [], backup, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
  for (const v of reviewAsks()) { if (!inWindow(v.ph)) continue; const lg = langOf(v.ph, ''); mem.rv[v.ph] = { at: now.toISO(), r: 0 }; bump('rvAsk'); more.push(buttonsTo(v.ph, lg === 'en' ? `Hello ${v.name} 🙏 How was your visit to ${C} today?` : `Namaste ${v.name} 🙏 Aaj ${C} mein aapka experience kaisa raha?`, reviewBtns(lg))); }
  if (mem.nightSent === dk) { if (!more.length) return bkOut; payload = more.shift(); return [{ json: { action: 'reply', payload, more, backup, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }]; }
  for (const ph of to) {
    if (inWindow(ph)) more.push(ctaTo(ph, body, 'Open register', `${APP}`));
    else if (S.templates && S.templates.night) more.push(templateTo(ph, S.templates.night, [`${C}, ${day.toFormat('ccc d LLL')}`, String(R.seen), rupees(R.money), look.length ? look.join(', ') : 'nothing, every visit is billed'], []));
  }
  mem.nightSent = dk;
  if (!more.length) return bkOut;
  payload = more.shift();
  return [{ json: { action: 'reply', payload, more, backup, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
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
    if (inWindow(f.ph)) { more.push(buttonsTo(f.ph, msgTxt, [['NEW', lg === 'en' ? 'Book a time' : 'Time book karein']])); f.sent = true; bump('reminders'); }
    else if (S.templates && S.templates.followup) { more.push(templateTo(f.ph, S.templates.followup, [f.name, D, whenTxt], ['NEW'])); f.sent = true; }
  }
  for (const x of recallsDue()) { const lg = langOf(x.ph, '');
    const t = lg === 'en' ? [`Hello ${x.name} 🙏\n${D} had asked you to come back for a follow-up. It's not too late. Tap below to pick a time.`, `Hello ${x.name} 🙏\nIt has been a week since your follow-up date with ${D}. Stopping treatment early can bring the problem back. Tap below to book.`, `Hello ${x.name} 🙏\nIt's been a month. If you still have the problem, ${D} can see you this week. Tap below to book.`][x.st - 1]
      : [`Namaste ${x.name} 🙏\n${D} ne aapko follow-up ke liye bulaya tha. Abhi bhi aa sakte hain. Time book karne ke liye neeche dabaiye.`, `Namaste ${x.name} 🙏\nFollow-up ki date ko ek hafta ho gaya hai. Treatment beech mein chhodne se problem wapas aa sakti hai. Neeche dabakar time book kar lijiye.`, `Namaste ${x.name} 🙏\nEk mahina ho gaya hai. Agar problem abhi bhi hai, toh ${D} aapko is hafte dekh sakte hain. Neeche dabakar book kijiye.`][x.st - 1];
    if (inWindow(x.ph)) more.push(buttonsTo(x.ph, t, [['NEW', lg === 'en' ? 'Book a time' : 'Time book karein']]));
    else if (S.templates && S.templates.followup) more.push(templateTo(x.ph, S.templates.followup, [x.name, D, lg === 'en' ? 'this week' : 'is hafte'], ['NEW']));
    else continue;
    x.r.n = x.st; x.r.at = now.toISO(); bump('recalls'); ev(x.ph, 'recall', 'Reminded about missed follow-up' + (x.st > 1 ? ' (' + (x.st === 2 ? '1 week' : '1 month') + ' late)' : '')); }
  for (const v of reviewAsks()) { if (!inWindow(v.ph)) continue; const lg = langOf(v.ph, ''); mem.rv[v.ph] = { at: now.toISO(), r: 0 }; bump('rvAsk');
    more.push(buttonsTo(v.ph, lg === 'en' ? `Hello ${v.name} 🙏 How was your visit to ${C} today?` : `Namaste ${v.name} 🙏 Aaj ${C} mein aapka experience kaisa raha?`, reviewBtns(lg))); }
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
if (!mem.seen[me] || DateTime.fromISO(mem.seen[me]) < now.minus({ hours: 24 })) { if (!staffOf2(me)) { bump('chats'); if (msg.type === 'text' && msg.text) ev(me, 'msg', 'Messaged: "' + String(msg.text).slice(0, 90) + '"'); else if (msg.type !== 'interactive' && msg.type !== 'button') ev(me, 'msg', 'Started a WhatsApp chat'); } }
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
// the doctor (or owner) can change the clinic status in plain words from his own number
const isDocPh = isAdmin || (S.staff || []).some(x => (x.role === 'doctor' || x.role === 'owner') && same(x.phone, me));
let docIntent = null;
if (isDocPh && String(id || '').startsWith('DS|')) { const [, k, v] = id.split('|'); docIntent = { k, m: Number(v) || 0, d: k === 'leave' ? v : null, sure: true }; }
else if (isDocPh && !id && raw && raw.trim().split(/\s+/).length <= 9) {
  const low = raw.toLowerCase(); const hr = low.match(/(\d+(?:\.5)?)\s*(hr|hrs|hour|hours|ghanta|ghante)/); const mn = low.match(/(\d{1,3})\s*(m|min|mins|minute|minutes|minat)?\b/);
  const mins = hr ? Math.round(Number(hr[1]) * 60) : mn ? Number(mn[1]) : 0;
  if (/\b(leave|chhutti|chutti|chhuti|holiday)\b|nahi aa ?(unga|ungi|paunga|paungi|raha|rahi|sakta|sakti)|clinic (band|closed?)\b|not coming/.test(low)) {
    const d = /\b(kal|tomorrow)\b/.test(low) ? now.plus({ days: 1 }).toFormat('yyyy-MM-dd') : (parseLeaveDate('LEAVE ' + cmd.replace(/^LEAVE\s*/, '').replace(/\b(TODAY|AAJ|HAI|HOON|HU|I AM|ON|DOCTOR|DR)\b/g, '').trim()) || now.toFormat('yyyy-MM-dd'));
    docIntent = { k: 'leave', d };
  }
  else if (/\b(late|let|der|deri|delay|delayed|traffic)\b/.test(low)) docIntent = { k: 'late', m: mins };
  else if (/\b(away|bahar|break|surgery|ward|emergency|round|nikal)\b/.test(low)) docIntent = { k: 'away', m: mins };
  else if (/^(in|back|aa gaya|aa gayi|aagaya|aagayi|pahunch gaya|pahunch gayi|reached|in clinic|i am in|i'm in|im in|start|started|wapas|wapas aa gaya|wapas aa gayi)\b/.test(low)) docIntent = { k: 'in' };
}
const adminCmd = (isAdmin && !id && /^(TODAY|AAJ|HELP|ADMIN)/.test(cmd)) || !!docIntent;
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
const sysWord = /^(login|reset|code|token)$/i.test((raw || '').trim());
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
else if (!id && /^code$/i.test(raw) && staffOf(me)) {
  if (!mem.otp) mem.otp = {};
  const code = String(Math.floor(100000 + Math.random() * 900000)); const salt = rid(8); const o = mem.otp[me] || {};
  mem.otp[me] = { salt, h: sha256(salt + code), exp: now.plus({ minutes: 10 }).toISO(), tries: 0, last: now.toISO(), sends: (o.sends || []).concat([now.toISO()]).slice(-10) };
  payload = text(`*${code}* is your Clinic Desk login code.\nType it in the app. It works for 10 minutes. Do not share it with anyone.`);
}
else if (!id && /^(login|reset)$/i.test(raw) && staffOf(me)) {
  const st0 = staffOf(me); if (!mem.codes) mem.codes = {};
  const isReset = /^reset$/i.test(raw);
  for (const k of Object.keys(mem.codes)) if (DateTime.fromISO(mem.codes[k].exp) < now) delete mem.codes[k];
  const code = rid(8); mem.codes[code] = { phone: me, role: st0.role || 'reception', name: st0.name || 'Staff', reset: isReset, exp: now.plus({ minutes: 15 }).toISO() };
  payload = ctaTo(msg.from, isReset ? `Password reset for ${st0.name || 'you'}.\nTap below and set a new password. The link works once and expires in 15 minutes.\n\nDidn't ask for this? Ignore this message.`
    : `Clinic Desk login for ${st0.name || 'you'} (${st0.role || 'reception'}).\nThis link works once and expires in 15 minutes.`, isReset ? 'Set new password' : 'Open Clinic Desk', `${APP}?code=${code}`);
}
else if ((!id && /^token\b/i.test(raw)) || id === 'TQ|NEW') {
  const q0 = qRead(); const mineTk = q0.list.find(x => x.phone === me && ['w', 's'].includes(x.st));
  if (mineTk) payload = mineTk.st === 's' ? text(QT[lang].turn(cabin)) : tokenMsg(q0, mineTk, msg.from);
  else if (docRead().status === 'leave') payload = text(QT[lang].leave(D));
  else if (!isOpenNow() && !S.tokensAnytime) payload = text(QT[lang].closed);
  else { const q = qWrite(); const tk = issueToken(q, me, msg.name, 'qr'); payload = tokenMsg(q, tk, msg.from); bump('qr'); ev(me, 'token', 'Came to the clinic · token ' + tk.tok.replace('-', ''));
    more.push(buttonsTo(msg.from, lang === 'en' ? 'Want to tell the doctor what it is about? Pick one, or type it in your own words. (Optional)' : 'Doctor ko pehle se bata dein, kya problem hai? Neeche chuniye ya apne shabdon mein likh dijiye. (Zaroori nahi)',
      [['PB|Skin', lang === 'en' ? 'Skin' : 'Skin / chehra'], ['PB|Hair', lang === 'en' ? 'Hair' : 'Baal'], ['PB|Follow-up', 'Follow-up']])); }
}
else if (id.startsWith('PB|') || (!id && raw.split(/\s+/).length >= 3 && !has(['hi', 'hello', 'cancel', 'book', 'menu', 'token', 'doctor', 'dr', 'help', 'talk', 'chat']) && (() => { const q0 = qRead(); const tk = q0.list.find(x => x.phone === me && x.st === 'w'); return tk && !tk.prob; })())) {
  const q = qWrite(); const tk = q.list.find(x => x.phone === me && ['w', 's'].includes(x.st));
  if (tk) { tk.prob = id.startsWith('PB|') ? id.slice(3) : '"' + raw.slice(0, 120) + '"'; }
  payload = (!seenBefore(me) && !(mem.src || {})[me]) ? buttons((lang === 'en' ? 'Thanks 🙏 The doctor will see this.\n\nOne quick question: how did you find our clinic?' : 'Shukriya 🙏 Doctor ko bata diya gaya hai.\n\nEk chhota sawaal: aapko humare clinic ke baare mein kaise pata chala?'), [['SRC|google', 'Google / Instagram'], ['SRC|friend', lang === 'en' ? 'Someone told me' : 'Kisi ne bataya'], ['SRC|board', lang === 'en' ? 'Board / other' : 'Board / kuch aur']])
    : text(lang === 'en' ? 'Thanks 🙏 The doctor will see this.' : 'Shukriya 🙏 Doctor ko bata diya gaya hai.');
}
else if (String(id || '').startsWith('RV|')) {
  if (!mem.rv) mem.rv = {}; const r = Number(id.slice(3)) || 3; mem.rv[me] = { at: now.toISO(), r, wait: r < 5 ? now.toISO() : null }; const link = (mem.cfg || {}).googleReview || S.googleReview || '';
  bump(r >= 5 ? 'rvGood' : r >= 3 ? 'rvMid' : 'rvLow'); ev(me, 'review', r >= 5 ? 'Rated the visit: very good' : r >= 3 ? 'Rated the visit: okay' : 'Rated the visit: not good');
  if (r >= 5) payload = text((lang === 'en' ? 'Thank you so much 🙏' : 'Bahut shukriya 🙏') + (link ? (lang === 'en' ? '\n\nIf you have one minute, a Google review helps other patients find us:\n' : '\n\nAgar 1 minute ho, toh Google par review de dijiye. Isse doosre patients ko madad milti hai:\n') + link : ''));
  else payload = text(lang === 'en' ? 'Sorry about that 🙏 What could we do better? Write one line. Only the doctor reads it.' : 'Maaf kijiye 🙏 Kya behtar ho sakta tha? Ek line likh dijiye. Ise sirf doctor padhenge.');
}
else if (!id && msg.type === 'text' && raw.length >= 3 && mem.rv && mem.rv[me] && mem.rv[me].wait && mem.rv[me].wait > now.minus({ minutes: 60 }).toISO()) {
  const r = mem.rv[me]; r.wait = null; if (!mem.fb) mem.fb = []; mem.fb = mem.fb.concat([{ ph: me, name: (mem.pname || {})[me] || msg.name || '', r: r.r, t: raw.slice(0, 300), at: now.toISO() }]).slice(-50); ev(me, 'review', 'Feedback: "' + raw.slice(0, 140) + '"');
  const link = (mem.cfg || {}).googleReview || S.googleReview || '';
  payload = text((lang === 'en' ? 'Thank you. The doctor will read this personally.' : 'Shukriya. Doctor ise khud padhenge.') + (link ? (lang === 'en' ? '\n\nYou can also leave a public review on Google if you like:\n' : '\n\nAap chahein toh Google par bhi review likh sakte hain:\n') + link : ''));
}
else if (String(id || '').startsWith('SRC|')) {
  const k = id.slice(4); if (SRC[k]) { if (!mem.src) mem.src = {}; if (!mem.src[me]) { mem.src[me] = { s: k, at: now.toISO() }; bump('src_' + k); ev(me, 'src', 'Found us through: ' + SRC[k]); } }
  payload = text(lang === 'en' ? 'Thank you 🙏' : 'Shukriya 🙏');
}
else if ((String(id || '').startsWith('CBR|') || (!id && ['audio', 'voice'].includes(msg.type))) && (mem.callbacks || []).some(x => x.phone === me && !x.reason)) {
  const cb = mem.callbacks.find(x => x.phone === me && !x.reason); const isV = !id; cb.reason = isV ? 'Sent a voice note (ask on the call)' : id.slice(4); ev(me, 'why', isV ? 'Sent a voice note about it' : 'Reason: ' + id.slice(4));
  payload = text(lang === 'en' ? 'Thank you 🙏 Noted. The clinic will call you soon.' : 'Shukriya 🙏 Note kar liya hai. Clinic se jaldi call aayega.');
}
else if (!id && msg.type === 'text' && raw.length >= 3 && !/^(hi|hello|hey|ok|okay|thanks|thank you|haan|ha|yes|no|nahi|menu|token|login|code)$/i.test(raw.trim()) && (mem.callbacks || []).some(x => x.phone === me && !x.reason && x.at > now.minus({ minutes: 10 }).toISO())) {
  const cb = mem.callbacks.find(x => x.phone === me && !x.reason); cb.reason = raw.slice(0, 220); ev(me, 'why', 'Reason: "' + raw.slice(0, 160) + '"');
  payload = text(lang === 'en' ? 'Thank you 🙏 We have noted it. The clinic will call you soon.' : 'Shukriya 🙏 Note kar liya hai. Clinic se jaldi call aayega.');
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
  const nWait = () => waitingOf(qRead()).filter(x => x.phone).length;
  const sync = '\nReception app, TV screen and the WhatsApp bot now show this.';
  if (docIntent && docIntent.k === 'cancel') payload = text('Okay, nothing changed.');
  else if (docIntent && (docIntent.k === 'late' || docIntent.k === 'away') && !docIntent.m) {
    payload = docIntent.k === 'late' ? buttons('How late will you be?', [['DS|late|15', '15 min'], ['DS|late|30', '30 min'], ['DS|late|60', '1 hour']]) : buttons('Back in about?', [['DS|away|30', '30 min'], ['DS|away|60', '1 hour'], ['DS|away|120', '2 hours']]);
  }
  else if (docIntent && (docIntent.k === 'late' || docIntent.k === 'away')) {
    delete mem.docPend; const told = setDoc(docIntent.k, docIntent.m, more);
    const appts = docIntent.k === 'late' ? rows.filter(r => r.date === today && active(r) && at(r.date, r.time) >= now.minus({ minutes: 15 })) : [];
    appts.forEach(r => notifyPatient(r, lg => T[lg].lateMsg(docIntent.m, at(r.date, r.time).plus({ minutes: docIntent.m }).toFormat('h:mm a')), null, [[`UK|${r.row_number}`, 'okBtn'], [`RR|${r.row_number}`, 'changeBtn'], [`RX|${r.row_number}`, 'cancelBtn']]));
    const lab = docIntent.k === 'late' ? `Running ${docIntent.m} min late` : `Away · back by ${now.plus({ minutes: docIntent.m }).toFormat('h:mm a')}`;
    payload = buttons(`Done ✓ ${lab}.\n${told + appts.length ? `Told ${told ? told + ' waiting' : ''}${told && appts.length ? ' and ' : ''}${appts.length ? appts.length + ' booked' : ''} on WhatsApp.` : 'No WhatsApp needed to go out.'}${sync}\n\nWhen you reach, tap below or send "in".`, [['DS|in', "I'm in clinic"]]);
  }
  else if (docIntent && docIntent.k === 'in') {
    delete mem.docPend; const told = setDoc('in', 0, more);
    payload = text(`Done ✓ In clinic.${told ? `\n${told} patient${told > 1 ? 's' : ''} who were told you are late now know you are here.` : ''}${sync}`);
  }
  else if (docIntent && docIntent.k === 'leave' && !docIntent.sure) {
    const d = docIntent.d; const n = rows.filter(r => r.date === d && active(r)).length + (d === today ? nWait() : 0);
    payload = buttons(`Leave on ${DateTime.fromISO(d).toFormat('ccc, d LLL')}?\nNo new tokens or bookings that day.${n ? ` ${n} patient${n > 1 ? 's' : ''} will be told on WhatsApp.` : ''}`, [[`DS|leave|${d}`, 'Yes, leave'], ['DS|cancel', 'No']]);
  }
  else if (docIntent && docIntent.k === 'leave') {
    const d = docIntent.d; const l = rows.filter(r => r.date === d && active(r));
    l.forEach(r => notifyPatient(r, lg => T[lg].leaveMsg(dateLabel(d, lg)), null, [[`RR|${r.row_number}`, 'newTimeBtn'], [`RX|${r.row_number}`, 'cancelBtn']]));
    if (!holidays.includes(d)) holiday = [[d, 'Doctor on leave (set by WhatsApp)']];
    if (d === today) { delete mem.docPend; setDoc('leave', 0, more); }
    payload = text(`Done ✓ ${DateTime.fromISO(d).toFormat('ccc, d LLL')} is marked as leave.\n${l.length ? `${l.length} booked patient${l.length > 1 ? 's were' : ' was'} asked to pick a new time.` : 'Nobody was booked that day.'}${sync}`);
  }
  else if (/^(TODAY|AAJ)/.test(cmd)) {
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
    payload = text('You can tell the clinic bot in your own words, from this number:\n\n• "30 min late" / "aaj der hogi"\n• "away 1 hour" / "surgery hai"\n• "in" / "aa gaya"\n• "kal chutti" / "leave 25 Nov"\n• TODAY - today\'s bookings\n\nReception app, TV and waiting patients update by themselves.');
  }
}
// ---------- patients ----------
else if (id === 'MC_Q') { payload = text(L.mcQ); }
else if (id === 'MC_CALL') { notify = true; payload = buttons(L.mcCall + (lang === 'en' ? '\n\nWhat is it about? Tap one, or type it / send a voice note.' : '\n\nKis baare mein baat karni hai? Ek button dabaiye, ya likh kar / voice note bhej dijiye.'), lang === 'en' ? [['CBR|Price / fees', 'Price / fees'], ['CBR|Appointment', 'Appointment'], ['CBR|Show report', 'Show report']] : [['CBR|Price / fees', 'Price / fees'], ['CBR|Appointment', 'Appointment'], ['CBR|Report dikhani hai', 'Report dikhani hai']]); if (!mem.callbacks) mem.callbacks = []; mem.callbacks = mem.callbacks.filter(x => x.phone !== me).concat([{ phone: me, name: msg.name || '', at: now.toISO(), reason: '' }]).slice(-50); ev(me, 'cb', 'Asked for a call back'); }
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
  else { setStatus(holding, 'Booked', name); payload = confirmMsg({ ...holding, name }); pin(); bump('booked'); ev(me, 'booked', 'Booked ' + at(holding.date, holding.time).toFormat('ccc d LLL, h:mm a')); }
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
  mem.live[me] = { since: now.toISO(), last: now.toISO(), name: msg.name || '' }; ev(me, 'talk', 'Asked to talk to the clinic' + (raw && !id ? ': "' + raw.slice(0, 120) + '"' : ''));
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
