// Clinic bot brain v2 - languages (English / Hinglish), photo confirmation, location pin,
// doctor commands (TODAY, LATE 30, LEAVE <date>, HELP) and the 8 AM doctor summary.
// All clinic details live in the "Clinic Settings" node.

// ================= Message safety: every WhatsApp the bot sends passes through here =================
// 1. Night quiet: no automatic patient messages from 9 PM to 8 AM (replies to a patient who just wrote are fine).
// 2. No repeats: the same message to the same patient is never sent twice within 12 hours.
// 3. Daily cap: at most 6 automatic messages to one patient in a day.
// Staff and doctors are never blocked. Blocked messages are listed for the owner (mem.held).
function __guard(result) {
  try {
    const mem = $getWorkflowStaticData('global'); const S0 = Object.assign({}, $('Clinic Settings').first().json, mem.cfg || {});
    const now = DateTime.now().setZone('Asia/Kolkata'); const d10 = v => String(v || '').replace(/\D/g, '').slice(-10);
    const staff = new Set([].concat(S0.staff || [], mem.team || []).map(x => d10(x.phone)).concat([].concat(S0.doctorNumbers || [], S0.adminNumbers || []).map(d10)).filter(Boolean));
    let deskReq = null; try { deskReq = $('Desk API (POST)').first().json.body || {}; } catch (e) {}
    let msg = null; if (!deskReq) { try { msg = $('Parse message').first().json; } catch (e) {} }
    const mode = deskReq ? 'desk' : msg ? 'chat' : 'summary';
    const from = msg ? d10(msg.from) : '';
    const qFrom = Number(S0.quietFrom == null ? 21 : S0.quietFrom), qTo = Number(S0.quietTo == null ? 8 : S0.quietTo);
    const quiet = now.hour >= qFrom || now.hour < qTo;
    const day = now.toFormat('yyyy-MM-dd'); if (!mem.sentLog || mem.sentLog.day !== day) mem.sentLog = { day, n: {}, h: (mem.sentLog && mem.sentLog.h) || {} };
    const cut = now.minus({ hours: 12 }).toISO(); for (const k of Object.keys(mem.sentLog.h)) if (mem.sentLog.h[k] < cut) delete mem.sentLog.h[k];
    const hash = m => { const c = Object.assign({}, m); delete c.to; let x = JSON.stringify(c), h = 2166136261; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
    const hold = (m, why) => { mem.held = (mem.held || []).concat([{ at: now.toISO(), to: d10(m.to), why, what: String((m.text && m.text.body) || (m.interactive && m.interactive.body && m.interactive.body.text) || (m.template && m.template.name) || m.type).slice(0, 80) }]).slice(-100); };
    const ok = m => {
      if (!m || !m.to) return true; const t = d10(m.to);
      if (staff.has(t)) return true;
      const isReply = mode === 'chat' && t === from;
      if (isReply) return true;
      if (mem.optout && mem.optout[String(m.to).replace(/\D/g, '')] && !(m.type === 'template' && /otp|login/i.test((m.template || {}).name || ''))) { hold(m, 'patient said STOP'); return false; }
      if (quiet && mode === 'summary') { hold(m, 'night'); return false; }
      const hk = t + ':' + hash(m);
      if (mem.sentLog.h[hk]) { hold(m, 'repeat'); return false; }
      const n = mem.sentLog.n[t] || 0; if (n >= Number(S0.maxAutoPerDay || 6)) { hold(m, 'daily limit'); return false; }
      mem.sentLog.h[hk] = now.toISO(); mem.sentLog.n[t] = n + 1; return true;
    };
    for (const it of result || []) {
      const j = it && it.json; if (!j) continue;
      const all = [j.payload].concat(j.more || []).filter(Boolean).filter(ok);
      j.payload = all.shift() || null; j.more = all;
      if (!j.payload && j.action === 'reply') j.action = 'none';
      if (j.desk && typeof j.desk === 'object') j.desk.sent = (j.payload ? 1 : 0) + all.length;
    }
  } catch (e) { /* never block the bot because of the guard */ }
  return result;
}
return __guard((() => {
const S = Object.assign({}, $('Clinic Settings').first().json);
const TZ = 'Asia/Kolkata';
const now = DateTime.now().setZone(TZ);
const mem = $getWorkflowStaticData('global');
if (!mem.mig600) { mem.mig600 = true; if (mem.cfg) { mem.cfg.fee = 600; if (Array.isArray(mem.cfg.bill)) mem.cfg.bill.forEach(x => { if (/^consult/i.test(x.n)) x.p = 600; }); } mem.lang = {}; }
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
  const f = t => { const d = DateTime.fromFormat(t.trim(), 'HH:mm'); return d.toFormat(d.minute ? 'h:mm a' : 'h a'); };
  const val = k => { const r = (S.hours[k] || []); return r.length ? r.map(x => x.split('-').map(f).join(' – ')).join(', ') : (lg === 'en' ? 'Closed' : 'Band'); };
  const out = []; let i = 0;
  while (i < 7) { let j = i; while (j + 1 < 7 && val(days[j + 1]) === val(days[i])) j++;
    const lab = d => d[0].toUpperCase() + d.slice(1); out.push(`${i === j ? lab(days[i]) : lab(days[i]) + '–' + lab(days[j])}: ${val(days[i])}`); i = j + 1; }
  return out.join('\n');
}

// ---------- all patient-facing text ----------
const C = S.clinicName, D = S.doctorName;
const bookingId = r => (String(C).match(/\b[A-Za-z]/g) || ['C']).join('').slice(0, 3).toUpperCase() + '-' + String(r && r.row_number || 0).padStart(4, '0');
function missedCallMsg(to) {
  const lg = (mem.lang || {})[to] || S.defaultLang || 'hl'; const first = (mem.pname || {})[to] ? String(mem.pname[to]).split(' ')[0] : '';
  const callAt = now.toFormat('h:mm a'); const dShort = 'Dr. ' + String(D).replace(/^Dr\.?\s*/i, '').split(' ')[0];
  const q = (typeof qRead === 'function') ? qRead() : null; const wN = q ? waitingOf(q).length : 0; const dc = docRead(); const open = isOpenNow();
  let nf = ''; for (let i = 0; i <= (S.daysAhead || 7) && !nf; i++) { const d = now.plus({ days: i }).toFormat('yyyy-MM-dd'); if (holidays.includes(d)) continue; const sl = slotsFor(d); if (sl && sl.length) nf = whenText(d, sl[0], lg); }
  // only say WHY when we actually know it; never guess
  const why = dc.status === 'late' ? (lg === 'en' ? `${dShort} is running a little late today, so the desk is busy.` : `Aaj ${dShort} thoda late hain, isliye desk par bheed hai.`)
    : dc.status === 'away' ? (lg === 'en' ? `${dShort} has stepped out for an urgent case.` : `${dShort} ek urgent case ke liye bahar gaye hain.`)
    : dc.status === 'leave' ? (lg === 'en' ? `${dShort} is on leave today.` : `${dShort} aaj chhutti par hain.`)
    : !open ? (lg === 'en' ? 'The clinic is closed right now.' : 'Clinic abhi band hai.') : '';
  const live = open && dc.status !== 'leave' ? (lg === 'en' ? (wN ? `*Right now:* ${wN} ${wN > 1 ? 'people' : 'person'} waiting` : '*Right now:* no queue') : (wN ? `*Abhi:* ${wN} log wait kar rahe hain` : '*Abhi:* koi line nahi')) : '';
  const lines = [nf ? (lg === 'en' ? `*Next free time:* ${nf}` : `*Agla khali time:* ${nf}`) : '', live, S.fee ? (lg === 'en' ? `*Fee:* ₹${S.fee}` : `*Fees:* ₹${S.fee}`) : ''].filter(Boolean).join('\n');
  const body = lg === 'en'
    ? `Hi${first ? ' ' + first : ''} 🙏\n\nYou called us at *${callAt}* and we couldn't pick up. Sorry about that.${why ? ' ' + why : ''}\n\n${lines}\n\nWant to book? Tap below, it takes a minute. Want to talk? Tap *Call me back* and we'll ring you ourselves.\n\n— ${C}`
    : `Namaste${first ? ' ' + first + ' ji' : ''} 🙏\n\nAapne *${callAt}* par call kiya tha, hum utha nahi paaye. Sorry.${why ? ' ' + why : ''}\n\n${lines}\n\nBook karna ho toh neeche dabaiye, 1 minute lagega. Baat karni ho toh *Mujhe call karein* dabaiye, hum khud call karenge.\n\n— ${C}`;
  return buttonsTo(to, body, [['MC_BOOK', lg === 'en' ? 'Book a visit' : 'Time book karein'], ['MC_CALL', lg === 'en' ? 'Call me back' : 'Mujhe call karein'], ['MC_Q', lg === 'en' ? 'Ask a question' : 'Sawaal poochhein']], { type: 'image', image: { link: S.missedImage || IMG + 'missed.jpg' } });
}
const IMG = S.imgBase || 'https://raw.githubusercontent.com/secretknook/bas30din-site/clinic-server-setup/ops/clinic-server/img/';
const T = {
  en: {
    pickLang: `🙏 Which language would you like to chat in?\nAap kis bhasha mein baat karna chahenge?`,
    welcome: (n, back) => (`${n ? 'Hi ' + n : 'Hi'} 👋\n\n${back ? 'Good to hear from you again.' : `Welcome to *${C}*.`} You can book a time with ${D} right here, it takes a minute. Got a question about fees, timings or a treatment? Just type it.\n\n${isOpenNow() ? 'Coming in today? Type *TOKEN* to get your token here, no standing in line.\n' : ''}${S.clinicPhone ? `Prefer to talk? 📞 ${S.clinicPhone}` : ''}`).trim(),
    pickDate: '📅 Which day suits you?',
    pickSvc: 'What would you like to visit for?', svcBtn: 'Choose', svcTitle: 'Treatments',
    svcChosen: n => `*${n}*, noted 👍\nNow pick a day.`,
    earliest: 'Earliest free slot', waitRow: 'None of these work?', waitRowD: 'Join the waitlist for a day',
    waitPick: "Which day would you like? If a spot opens up that day, we'll message you straight away.",
    waitDone: d => `✅ You're on the waiting list for *${d}*.\nIf a spot opens, you'll hear from us right here.`,
    slotOpen: (d) => `A spot just opened up on *${d}* 🙂\nThese go quickly, so book now if you'd like it.`, bookIt: 'Book this time',
    feeLine: f => `\n*Fee:* ₹${f}, paid at the clinic. No booking charge.`,
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
    liveRow: 'Talk to clinic', liveRowD: 'Call us or request a call back',
    liveOn: () => `📞 Please call us on ${S.clinicPhone}.`,
    liveOff: 'Thank you 🙏 Message us here anytime.',
    livePhoto: 'Thank you for sharing. Our team will look at this when they call you.',
    dateBtn: 'Choose date', datesTitle: 'Available dates', slotsFree: n => `${n} slot${n > 1 ? 's' : ''} available`,
    noSlots: `Sorry, we're fully booked for the next ${S.daysAhead} days 🙏\n\nIf it's urgent, call us on 📞 ${S.clinicPhone} and we'll try to fit you in. Or join the waiting list below.`,
    dayFull: 'That day just filled up. Please pick another one.',
    timesFor: d => `⏰ Free times on *${d}*:`, timeBtn: 'Choose time', timesTitle: 'Available times', later: 'Later times',
    held: w => `⏳ *${w}* is held for you for ${S.holdMinutes} minutes.\n\n👤 Who is the appointment for?`,
    selfBtn: 'Myself',
    askName: "Please type the patient's name (e.g. Riya Sharma), or tap *Myself*.",
    confirmed: (r, w) => `✅ *You're booked*\n\n*Patient:* ${r.name}\n*When:* ${w}\n*Doctor:* ${D}${r.service ? `\n*For:* ${r.service}` : ''}${S.fee ? T.en.feeLine(S.fee) : ''}\n*Booking ID:* ${bookingId(r)}\n\n📍 ${C}${S.address ? ', ' + S.address : ''}\n\nPlease come 10 minutes early and bring any old prescriptions or reports. We'll remind you a day before. Plans change? Use the buttons below.`,
    changeBtn: 'Change time', cancelBtn: 'Cancel',
    holdCancelled: "No problem, the time is released. Message us whenever you're ready.",
    limit: n => `You already have ${n} upcoming appointments with us, which is the maximum we can hold at a time.\n\nTo book a new time, please cancel one of them first.`,
    noUpcoming: "You don't have any upcoming appointments. Type *Book* whenever you'd like one.",
    cancelQ: (r, w) => `Would you like to cancel this appointment?\n\n👤 ${r.name || 'Patient'}\n📅 ${w}`,
    yesCancel: 'Yes, cancel', keepBtn: 'No, keep it',
    whichCancel: 'Which appointment would you like to cancel?', chooseBtn: 'Choose', yourTitle: 'Your appointments',
    cancelled: w => `Your visit on ${w} is cancelled.\n\nHope all is well 🙏 Whenever you'd like to see ${D}, just message us here.`,
    gone: 'This appointment has already been cancelled or completed.',
    kept: '👍 Done, your appointment stays as it is. See you then!',
    thanksConfirm: w => `✅ Thanks for confirming. ${D} will see you on *${w}*.\n\n📍 ${C}${S.address ? ', ' + S.address : ''}\nPlease come 10 minutes early.`,
    reschedule: 'No problem 👍 Your old time is released. Pick a new day.',
    talk: `📞 You can call us on *${S.clinicPhone}*.\n\n*Clinic timings*\n${timingsText('en')}\n\nCan't talk right now? Tap the button below and we'll call you.`,
    textOnly: "Sorry, we can only read typed messages here 🙏 Type a line or pick an option below.",
    yourAppts: (n, l) => `${n}, here are your booked visits:\n\n${l}`,
    bookBtn: 'Book appointment', anotherBtn: 'Book another', cancelBookingBtn: 'Cancel booking', talkBtn: 'Talk to clinic',
    mcQ: "Sure ✍️ Type your question here and our team will reply soon.",
    mcCall: "✅ Done, we'll call you shortly 📞",
    foot: C,
    lateMsg: (m, t2) => `⏳ *A quick heads-up*\n\n${D} is running about *${m} minutes* late today (an earlier case took longer).\nYour turn should now come around *${t2}*.\n\nNo need to rush or wait at the clinic. Sorry for the delay 🙏`,
    leaveMsg: d => `Sorry 🙏 ${D} won't be in the clinic on *${d}*.\n\nPlease pick a new time below and we'll fit you in as early as we can.`,
    okBtn: 'Okay', newTimeBtn: 'Choose new time',
  },
  hl: {
    pickLang: `🙏 Which language would you like to chat in?\nAap kis bhasha mein baat karna chahenge?`,
    welcome: (n, back) => (`Namaste${n ? ' ' + n + ' ji' : ''} 🙏\n\n${back ? 'Aapse phir baat karke accha laga.' : `*${C}* mein aapka swagat hai.`} ${D} se milne ka time yahin 1 minute mein book ho jaata hai. Fees, timing ya treatment ka koi bhi sawaal ho, seedha likh dijiye.\n\n${isOpenNow() ? 'Aaj hi aana hai? *TOKEN* likhiye, line mein khade nahi rehna padega.\n' : ''}${S.clinicPhone ? `Baat karni ho toh 📞 ${S.clinicPhone}` : ''}`).trim(),
    pickDate: '📅 Kis din aana theek rahega?',
    pickSvc: 'Aap kis cheez ke liye milna chahte hain?', svcBtn: 'Chunein', svcTitle: 'Treatments',
    svcChosen: n => `*${n}* 👍\nAb din chun lijiye.`,
    earliest: 'Sabse pehla khaali slot', waitRow: 'Koi samay theek nahi?', waitRowD: 'Waitlist mein naam daalein',
    waitPick: 'Kis din aana hai? Us din jagah khulte hi hum turant message kar denge.',
    waitDone: d => `✅ *${d}* ki waiting list mein aapka naam likh liya.\nJagah khulte hi yahin message aa jayega.`,
    slotOpen: (d) => `*${d}* ko ek jagah khali hui hai 🙂\nJaldi bhar jaati hai, chahiye toh abhi book kar lijiye.`, bookIt: 'Ye time book karein',
    feeLine: f => `\n*Fees:* ₹${f}, clinic par hi dena hai. Booking ka koi charge nahi.`,
    morning: 'Subah', afternoon: 'Dopahar', evening: 'Shaam',
    liveRow: 'Clinic se baat', liveRowD: 'Call karein ya call back maangein',
    liveOn: () => `📞 Humein ${S.clinicPhone} par call karein.`,
    liveOff: 'Shukriya 🙏 Kabhi bhi zaroorat ho, yahin message kar dijiye.',
    livePhoto: 'Bhejne ke liye shukriya. Humari team call par ise dekh legi.',
    dateBtn: 'Date chunein', datesTitle: 'Available dates', slotsFree: n => `${n} slot${n > 1 ? 's' : ''} khaali`,
    noSlots: `Sorry 🙏 agle ${S.daysAhead} din sab booked hai.\n\nUrgent ho toh 📞 ${S.clinicPhone} par call kijiye, hum koshish karenge. Ya neeche waiting list mein naam daal dijiye.`,
    dayFull: 'Ye din abhi-abhi bhar gaya. Koi aur din chun lijiye.',
    timesFor: d => `⏰ *${d}* ko ye time khali hain:`, timeBtn: 'Time chunein', timesTitle: 'Khali time', later: 'Aur time dekhein',
    held: w => `⏳ *${w}* aapke liye ${S.holdMinutes} minute tak rok liya hai.\n\n👤 Appointment kiske liye hai?`,
    selfBtn: 'Mere liye',
    askName: 'Patient ka naam likh dijiye (jaise: Riya Sharma), ya apne liye ho toh *Mere liye* dabaiye.',
    confirmed: (r, w) => `✅ *Appointment pakka ho gaya*\n\n*Patient:* ${r.name}\n*Kab:* ${w}\n*Doctor:* ${D}${r.service ? `\n*Kis liye:* ${r.service}` : ''}${S.fee ? T.hl.feeLine(S.fee) : ''}\n*Booking ID:* ${bookingId(r)}\n\n📍 ${C}${S.address ? ', ' + S.address : ''}\n\n10 minute pehle aa jaiye, aur purani parchi ya report ho toh saath le aaiye. Ek din pehle hum yaad dila denge. Plan badle toh neeche se badal sakte hain.`,
    changeBtn: 'Time badlein', cancelBtn: 'Cancel karein',
    holdCancelled: 'Theek hai, time chhod diya. Jab mann ho, yahin message kar dijiye.',
    limit: n => `Aapke ${n} appointments pehle se booked hain, jo ek samay mein sabse zyada hain.\n\nNaya samay book karne ke liye pehle ek appointment cancel kijiye.`,
    noUpcoming: 'Abhi aapka koi appointment book nahi hai. Chahiye toh *Book* likh dijiye.',
    cancelQ: (r, w) => `Kya aap ye appointment cancel karna chahte hain?\n\n👤 ${r.name || 'Patient'}\n📅 ${w}`,
    yesCancel: 'Haan, cancel karein', keepBtn: 'Nahi, rehne dein',
    whichCancel: 'Kaunsa appointment cancel karna hai?', chooseBtn: 'Chunein', yourTitle: 'Aapke appointments',
    cancelled: w => `Aapka ${w} ka appointment cancel ho gaya.\n\nAsha hai sab theek hai 🙏 Jab bhi ${D} ko dikhana ho, yahin message kar dijiye.`,
    gone: 'Ye appointment pehle hi cancel ya poora ho chuka hai.',
    kept: '👍 Theek hai, appointment waise hi hai. Milte hain!',
    thanksConfirm: w => `✅ Shukriya! ${D} aapse *${w}* ko milenge.\n\n📍 ${C}${S.address ? ', ' + S.address : ''}\n10 minute pehle aa jaiye.`,
    reschedule: 'Koi baat nahi 👍 Purana time chhod diya. Naya din chun lijiye.',
    talk: `📞 *${S.clinicPhone}* par seedha call kar sakte hain.\n\n*Clinic ka time*\n${timingsText('hl')}\n\nAbhi baat nahi ho paa rahi? Neeche button dabaiye, hum khud call karenge.`,
    textOnly: 'Sorry, yahan sirf likha hua message padh paate hain 🙏 Ek line likh dijiye ya neeche se chuniye.',
    yourAppts: (n, l) => `${n} ji, aapke booked appointments:\n\n${l}`,
    bookBtn: 'Book appointment', anotherBtn: 'Ek aur book karein', cancelBookingBtn: 'Cancel karein', talkBtn: 'Clinic se baat',
    mcQ: 'Zaroor ✍️ Apna sawaal yahin likh dijiye, humari team jaldi jawab degi.',
    mcCall: '✅ Theek hai, hum aapko jaldi call karenge 📞',
    foot: C,
    lateMsg: (m, t2) => `⏳ *Ek zaroori baat*\n\nAaj ${D} lagbhag *${m} minute* late chal rahe hain (pichhla case lamba chala).\nAapka number ab lagbhag *${t2}* tak aayega.\n\nAaram se aaiye, clinic mein baith kar wait nahi karna padega. Sorry 🙏`,
    leaveMsg: d => `Sorry 🙏 ${D} *${d}* ko clinic mein nahi honge.\n\nNeeche se naya time chun lijiye, hum jaldi se jaldi time denge.`,
    okBtn: 'Theek hai', newTimeBtn: 'Naya samay chunein',
  },
};

// ---------- message builders (to = phone number) ----------
const textTo = (to, body) => ({ messaging_product: 'whatsapp', to, type: 'text', text: { body } });
const buttonsTo = (to, body, btns, header, footer) => {
  const p = { messaging_product: 'whatsapp', to, type: 'interactive',
    interactive: { type: 'button', body: { text: body }, action: { buttons: btns.slice(0, 3).map(b => ({ type: 'reply', reply: { id: b[0], title: b[1].slice(0, 20) } })) } } };
  if (header) p.interactive.header = header;
  p.interactive.footer = { text: String(footer || C).slice(0, 60) };
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
const APP = S.appUrl || 'https://api.okaybridge.com/webhook/desk';
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
  interactive: { type: 'cta_url', body: { text: body }, footer: { text: String(C).slice(0, 60) }, action: { name: 'cta_url', parameters: { display_text: label.slice(0, 20), url } } } });
const isOpenNow = () => { const k = now.toFormat('ccc').toLowerCase(); const hm = now.toFormat('HH:mm');
  return ((S.hours || {})[k] || []).some(r => { const [a, b] = r.split('-').map(x => x.trim()); return hm >= a && hm < b; }) && !holidays.includes(todayStr); };
const docRead = () => mem.doc || { status: 'in' };
const docLine = (lg) => {
  const d = docRead(); const D2 = S.doctorName;
  const until = d.until ? DateTime.fromISO(d.until).setZone(TZ).toFormat('h:mm a') : '';
  if (d.status === 'late') return lg === 'en' ? `${D2} is running about ${d.mins} minutes behind schedule today.` : `Aaj ${D2} lagbhag ${d.mins} minute late chal rahe hain.`;
  if (d.status === 'away') return lg === 'en' ? `${D2} has stepped out for an urgent case and should be back by about ${until}.` : `${D2} ek zaroori case ke liye thodi der bahar gaye hain, lagbhag ${until} tak wapas aa jayenge.`;
  if (d.status === 'leave') return lg === 'en' ? `${D2} is on leave today.` : `${D2} aaj chhutti par hain.`;
  return lg === 'en' ? `${D2} is in the clinic.` : `${D2} clinic mein hain.`;
};
const QT = {
  hl: {
    token: (tk, n, eta) => `🎫 *Aapka token number: ${String(tk.tok).replace('-', '')}*\n\n${n ? `👥 Aapse pehle *${n} ${n > 1 ? 'patients' : 'patient'}* hain\n⏳ Lagbhag wait: *${eta}*` : '⏩ *Agla number aapka hai!*'}\n\nAapko line mein khade rehne ki zaroorat nahi. Aap aaram se bahar ya gaadi mein intezaar kar sakte hain. Aapki baari se pehle hum yahin message kar denge. 😊`,
    live: 'Live status dekhein',
    two: n => n <= 1 ? `🔔 *Agla number aapka hai!*\n\nAb waiting area mein aa jaiye. Doctor aapko bas kuch hi der mein bulayenge. 🙏` : `🔔 *Aapki baari kareeb hai*\n\nAapse pehle ab sirf *${n} patients* hain. Clinic ki taraf aana shuru kar dijiye. 🚶`,
    turn: c => `🟢 *Aapki baari aa gayi hai!*\n\nAb *${c}* mein aaiye. Doctor aapka intezaar kar rahe hain. 🙏`,
    missed: `⏸️ *Aapka number nikal gaya*\n\nAapka token bulaya gaya tha, par aap waiting area mein nahi the. Chinta mat kijiye, aapka number gaya nahi hai. Agle 2 patients ke baad aapko dobara bulaya jayega.\n\nAa gaye hon toh neeche *Main aa gaya* dabaiye.`,
    here: 'Main aa gaya', hereOk: '✅ *Shukriya, humne note kar liya hai*\n\nAapko thodi hi der mein bulaya jayega. 🙏',
    closed: `🕘 *Clinic abhi band hai*\n\nIs samay token nahi mil sakta.\n\n*Clinic ka samay*\n${timingsText('hl')}\n\nClinic khulne par *TOKEN* likhiye, ya abhi kisi aur din ka time book kar lijiye. 😊`,
    leave: d => `📢 *Aaj OPD band hai*\n\n${d} aaj chhutti par hain, isliye aaj token nahi mil sakta. Sorry. 🙏\n\nKisi aur din ka appointment chahiye toh *Book* likhiye.`,
    back: d => `✅ *${d} clinic mein wapas aa gaye hain*\n\nConsultation dobara shuru ho gaye hain. Aapki baari jaldi aayegi, hum aapko yahin bata denge. 😊`,
    moved: (line, eta) => `⏳ *Aapki baari ke baare mein update*\n\n${line}${eta ? `\n\n🕒 Ab aapka time lagbhag: *${eta}*` : ''}\n\nAap apna samay us hisaab se plan kar sakte hain. Aapke patience ke liye shukriya. 🙏`,
  },
  en: {
    token: (tk, n, eta) => `🎫 *Your token number: ${String(tk.tok).replace('-', '')}*\n\n${n ? `👥 *${n} ${n > 1 ? 'patients are' : 'patient is'}* ahead of you\n⏳ Estimated wait: *${eta}*` : '⏩ *You are next!*'}\n\nThere's no need to stand in line. You can wait comfortably outside or in your car, and we'll message you here before it's your turn. 😊`,
    live: 'Track live status',
    two: n => n <= 1 ? `🔔 *You're next!*\n\nPlease come to the waiting area now. The doctor will see you in just a few minutes. 🙏` : `🔔 *Your turn is coming up*\n\nOnly *${n} patients* are ahead of you now. Please start making your way to the clinic. 🚶`,
    turn: c => `🟢 *It's your turn!*\n\nPlease come to *${c}* now. The doctor is ready to see you. 🙏`,
    missed: `⏸️ *We missed you*\n\nYour token was called, but you weren't in the waiting area. Don't worry, you haven't lost your place. We'll call you again after the next 2 patients.\n\nIf you've arrived, tap *I'm here* below.`,
    here: "I'm here", hereOk: "✅ *Thank you, we've noted that you're here*\n\nYou'll be called in just a little while. 🙏",
    closed: `🕘 *The clinic is closed right now*\n\nTokens aren't available at this time.\n\n*Clinic timings*\n${timingsText('en')}\n\nSend *TOKEN* once the clinic opens, or send *Hi* to book an appointment. 😊`,
    leave: d => `📢 *OPD is closed today*\n\n${d} is on leave today, so tokens aren't available. We're sorry for the inconvenience. 🙏\n\nType *Book* to book an appointment for another day.`,
    back: d => `✅ *${d} is back in the clinic*\n\nConsultations have resumed. Your turn will come shortly, and we'll let you know right here. 😊`,
    moved: (line, eta) => `⏳ *An update about your turn*\n\n${line}${eta ? `\n\n🕒 Your new estimated wait: *${eta}*` : ''}\n\nYou can plan your time accordingly. Thank you for your patience. 🙏`,
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
const gstGuess = n => /laser hair|hair removal|botox|filler|anti.?ag|hair transplant|whitening|smile design|cosmetic|carbon peel|hydrafacial|facial/i.test(n) ? 18 : 0;
const billList = () => { const L = (mem.cfg && Array.isArray(mem.cfg.bill) && mem.cfg.bill.length) ? mem.cfg.bill : (BILLDEF[(mem.cfg && mem.cfg.type) || 'skin'] || BILLDEF.skin).map(x => ({ n: x[0], p: x[0] === 'Consultation' && S.fee ? S.fee : x[1] })); return L.map(x => ({ n: x.n, p: x.p, g: x.g == null ? gstGuess(x.n) : x.g })); };
const BIZ = () => Object.assign({ legal: C, address: S.address || '', phone: S.clinicPhone || '', email: '', gstin: '', reg: '', state: 'Uttar Pradesh', prefix: (String(C).match(/\b[A-Za-z]/g) || ['C']).join('').slice(0, 3).toUpperCase() }, (mem.cfg || {}).biz || {});
const fyOf = d => { const dt = DateTime.fromISO(d); const y = dt.month >= 4 ? dt.year : dt.year - 1; return String(y).slice(2) + '-' + String(y + 1).slice(2); };
const invNo = v => BIZ().prefix + '/' + fyOf(DateTime.fromISO(v.in || v.at || now.toISO()).setZone(TZ).toFormat('yyyy-MM-dd')) + '/' + String(v.inv || 0).padStart(4, '0');
const uhidOf = v => { if (!mem.uhid) mem.uhid = {}; const k = patKey(v.ph, v.name); if (!mem.uhid[k]) { mem.uhidSeq = (mem.uhidSeq || 0) + 1; mem.uhid[k] = mem.uhidSeq; } return BIZ().prefix + '-' + String(mem.uhid[k]).padStart(6, '0'); };
function inWords(n) { n = Math.round(n); if (!n) return 'Zero'; const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts = []; const cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, rest = n % 1000;
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (rest) parts.push(three(rest)); return parts.join(' '); }
const seenBefore = ph => !!ph && Object.keys(mem.vis || {}).some(d => d < todayStr && (mem.vis[d] || []).some(v => v.ph === ph));
const SRC = { google: 'Google / Instagram', friend: 'Someone told them', board: 'Clinic board / poster', doctor: 'Another doctor', other: 'Other' };
function stSum(from, to) { const o = {}; for (const d of Object.keys(mem.st || {})) if (d >= from && d <= to) for (const k of Object.keys(mem.st[d])) o[k] = (o[k] || 0) + mem.st[d][k]; return o; }
// ---------- monthly results report for the owner: what the system brought in ----------
function monthReport(from, to, label, lg) {
  const R = regSum(from, to); const T = stSum(from, to); const en = lg !== 'hl';
  const paid = R.V.filter(v => v.m && v.m !== 'free' && v.fee);
  const avg = paid.length ? Math.round(paid.reduce((a, v) => a + v.fee, 0) / paid.length) : Number(S.fee || 0);
  const mc = T.mcalls || 0, mcB = T.mcBooked || 0, night = T.bookedNight || 0, wa = T.booked || 0;
  const back = T.recallBack || 0, backMoney = T.recallMoney || 0;
  const extra = (mcB + night) * avg + backMoney;
  const rv = (T.rvGood || 0) + (T.rvMid || 0) + (T.rvLow || 0);
  const calls = wa + (T.reminders || 0) + (T.recalls || 0);
  const L = en ? [
    `📊 *${C} · ${label}*`, '',
    `*Extra income from the system: about ${rupees(extra)}*`,
    `(patients who would likely have been missed, at your average fee of ${rupees(avg)}, plus follow-ups that came back)`, '',
    `📞 Missed calls answered on WhatsApp: *${mc}*${mc ? ` · ${mcB} booked` : ''}`,
    `🌙 Booked at night, when the clinic was closed: *${night}*`,
    `📅 Appointments booked on WhatsApp: *${wa}*`,
    `⏰ Reminders sent: *${T.reminders || 0}*${T.confirmed ? ` · ${T.confirmed} confirmed` : ''}`,
    `🔁 Follow-up reminders: *${T.recalls || 0}* · ${back} came back${backMoney ? ` (${rupees(backMoney)})` : ''}`,
    `🌟 Feedback: *${rv}* · ${T.rvGood || 0} happy, ${(T.rvMid || 0) + (T.rvLow || 0)} not happy${T.rvGood && ((mem.cfg || {}).googleReview || S.googleReview) ? ' (happy ones were sent your Google review link)' : ''}`, '',
    `🏥 Clinic this month: ${R.seen} patients · ${rupees(R.money)} collected`,
    `🙋 Calls and messages your staff did not have to handle: about *${calls}*`]
  : [
    `📊 *${C} · ${label}*`, '',
    `*System se extra kamaai: lagbhag ${rupees(extra)}*`,
    `(woh patients jo shayad chhoot jaate, aapki average fees ${rupees(avg)} ke hisaab se, aur wapas aaye follow-up)`, '',
    `📞 Missed calls ko WhatsApp gaya: *${mc}*${mc ? ` · ${mcB} ne booking ki` : ''}`,
    `🌙 Raat ko booking (clinic band thi): *${night}*`,
    `📅 WhatsApp se appointment: *${wa}*`,
    `⏰ Reminder bheje: *${T.reminders || 0}*${T.confirmed ? ` · ${T.confirmed} ne confirm kiya` : ''}`,
    `🔁 Follow-up reminder: *${T.recalls || 0}* · ${back} wapas aaye${backMoney ? ` (${rupees(backMoney)})` : ''}`,
    `🌟 Feedback: *${rv}* · ${T.rvGood || 0} khush, ${(T.rvMid || 0) + (T.rvLow || 0)} naakhush`, '',
    `🏥 Is mahine clinic: ${R.seen} patients · ${rupees(R.money)} collection`,
    `🙋 Staff ko jo calls/messages nahi karne pade: lagbhag *${calls}*`];
  return { text: L.join('\n'), extra, avg, R, T };
}
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
const q0Has = ph => { const q = mem.q && mem.q.date === todayStr ? mem.q : null; return !!(q && q.list.some(t => t.phone === ph && ['w', 's'].includes(t.st))); };
const reviewBtns = lg => [['RV|5', lg === 'en' ? 'Excellent' : 'Bahut accha'], ['RV|3', lg === 'en' ? 'Good' : 'Theek tha'], ['RV|1', lg === 'en' ? 'Needs improvement' : 'Sudhaar chahiye']];

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
  { mem.invSeq = 0; for (const d of Object.keys(mem.vis).sort()) for (const v of mem.vis[d]) if (v.m) { mem.invSeq++; v.inv = mem.invSeq; v.ik = sha256(v.k + d).slice(0, 12); if (!v.at) v.at = v.out || v.in; } }
  { const tv = (mem.vis[todayStr] || []).filter(v => v.m && v.m !== 'free'); const e1 = tv[1], e2 = tv[4]; mem.edits = [];
    if (e1) { mem.edits.push({ at: now.minus({ minutes: 50 }).toISO(), by: recName, day: todayStr, k: e1.k, inv: e1.inv, name: e1.name, from: { fee: 800, m: 'cash' }, to: { fee: e1.fee, m: e1.m } }); e1.edited = 1; }
    const yd = now.minus({ days: 2 }).toFormat('yyyy-MM-dd'); const e3 = (mem.vis[yd] || []).find(v => v.m === 'cash');
    if (e3) { mem.edits.push({ at: now.minus({ days: 2, hours: -3 }).toISO(), by: recName, day: yd, k: e3.k, inv: e3.inv, name: e3.name, from: { fee: e3.fee, m: 'cash' }, to: { fee: Math.max(0, e3.fee - 300), m: 'cash' } }); e3.fee = Math.max(0, e3.fee - 300); e3.edited = 1; } }
  if (!mem.cfg) mem.cfg = {}; if (!mem.cfg.docp) mem.cfg.docp = { qual: 'MBBS, MD (Dermatology)', yrs: '9', langs: 'Hindi, English', about: 'Treats acne, hair fall, pigmentation and skin allergies. Known for explaining every step patiently.' };
  if (!mem.cfg.biz) mem.cfg.biz = { legal: 'Aarna Skin & Hair Clinic (Sample)', address: 'Shop 12, Knowledge Park II, Greater Noida, UP 201310', phone: '+91 98100 00000', email: 'care@aarnaclinic.example', gstin: '09ABCDE1234F1Z5', reg: 'UPMC Reg. No. 00000 (sample)', state: 'Uttar Pradesh', prefix: 'ASH', sample: true };
  mem.cbLog = [{ ph: '910000055121', at: now.minus({ minutes: 140 }).toISO(), done: now.minus({ minutes: 60 }).toISO(), by: recName, reason: 'Bete ko chehre pe allergy ho gayi hai' }, { ph: '910000077412', at: now.minus({ minutes: 182 }).toISO() }, { ph: '910000055120', at: now.minus({ minutes: 69 }).toISO() },
    { ph: '910000063320', at: now.minus({ days: 3, hours: 2 }).toISO(), done: now.minus({ days: 3, hours: 1, minutes: 40 }).toISO(), by: recName, reason: 'Price / fees' }, { ph: '910000063321', at: now.minus({ days: 5, hours: 4 }).toISO(), done: now.minus({ days: 5, hours: 1 }).toISO(), by: recName, reason: 'Appointment' }];
  mem.pname['910000063320'] = 'Deepak Yadav'; mem.pname['910000063321'] = 'Sana Khan';
  mem.rv = {}; (mem.fb || []).forEach(f => { mem.rv[f.ph] = { at: f.at, r: f.r }; }); mem.rv['910000063311'] = { at: now.minus({ days: 1 }).toISO(), r: 5 };
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
function bookedExtra(ph) { if ((mem.mcalls || []).some(x => x.ph === ph && x.at > now.minus({ days: 3 }).toISO())) bump('mcBooked'); if (now.hour >= 21 || now.hour < 8) bump('bookedNight'); }
const patKey = (ph, name) => ph ? 'p' + ph : 'n' + String(name || '').trim().toLowerCase();
const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');
function addVisit(tk) {
  if (!mem.vis) mem.vis = {};
  const l = mem.vis[todayStr] || (mem.vis[todayStr] = []);
  if (l.some(v => v.k === tk.key)) return;
  { const rc = (mem.rc || {})[tk.phone]; if (rc && rc.n > 0 && !rc.back) { rc.back = todayStr; bump('recallBack'); } }
  l.push({ k: tk.key, tok: tk.tok, name: tk.name || 'Patient', ph: tk.phone || '', tin: tk.at || '', in: tk.calledAt || now.toISO(), out: now.toISO(), fee: null, m: null, fupSug: tk.fupDays || 0, prob: tk.prob || '' });
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

// ================= Clinic Desk v8: the four-app design (owner, doctor, reception, patient) =================
// Everything the new app needs comes from v8State(); every change goes through v8Act().
const V8_SRC = { walkin: 'Walk-in', wa: 'WhatsApp bot', mc: 'Missed call', ref: 'Referral', ig: 'Instagram', google: 'Google', friend: 'Someone told them', board: 'Clinic board / poster', doctor: 'Another doctor', other: 'Other' };
const v8min = iso => { const d = DateTime.fromISO(iso || ''); if (!d.isValid) return now.hour * 60 + now.minute; const z = d.setZone(TZ); return z.hour * 60 + z.minute; };
const v8ph10 = ph => String(ph || '').replace(/\D/g, '').slice(-10);
const v8full = ph => { const d = String(ph || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
const v8cat = n => /medicine|tablet|cream|gel|lotion|shampoo|sunscreen|pharmacy/i.test(n) ? 'medicine' : /consult|follow-up|check-up|session|opd/i.test(n) ? 'consult' : 'procedure';
const v8mode = m => m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Cash';
const v8hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function v8pinfo(pk) { if (!mem.pinfo) mem.pinfo = {}; return mem.pinfo[pk] || (mem.pinfo[pk] = {}); }
function v8cfg() { if (!mem.cfg) mem.cfg = {}; return mem.cfg; }
function v8hoursOf() { const cf = v8cfg(); const o = cf.open || '10:00', c = cf.close || '20:00'; const t = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }; return [t(o), t(c)]; }
function v8visit(day, k) { return visOf(day).find(x => x.k === k); }
function v8ensureVisit(tk) {
  if (!mem.vis) mem.vis = {};
  const l = mem.vis[todayStr] || (mem.vis[todayStr] = []);
  let v = l.find(x => x.k === tk.key);
  if (!v) { v = { k: tk.key, tok: tk.tok, name: tk.name || 'Patient', ph: tk.phone || '', tin: tk.at || '', in: '', out: '', fee: null, m: null, fupSug: 0, prob: tk.prob || '', pre: true }; l.push(v); }
  return v;
}
function v8bill(v, items, m, disc, by, sendWa, out) {
  const was = v.m ? { fee: v.fee || 0, m: v.m } : null;
  const list = (items || []).map(x => ({ n: String(x.n || '').slice(0, 60), p: Math.max(0, Math.round(Number(x.p) || 0)), g: [0, 5, 12, 18].includes(Number(x.g)) ? Number(x.g) : 0 })).filter(x => x.n).slice(0, 12);
  const tot = list.reduce((a, x) => a + x.p, 0);
  v.items = list; v.m = ['cash', 'upi', 'card', 'free'].includes(m) ? m : 'cash';
  v.fee = v.m === 'free' ? 0 : Math.max(0, tot - Math.max(0, Math.min(tot, Math.round(Number(disc) || 0))));
  if (was && (was.fee !== v.fee || was.m !== v.m)) { v.edited = (v.edited || 0) + 1; mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: todayStr, k: v.k, inv: v.inv || 0, name: v.name, from: was, to: { fee: v.fee, m: v.m } }]).slice(-400); }
  if (!v.inv) { mem.invSeq = (mem.invSeq || 0) + 1; v.inv = mem.invSeq; v.ik = sha256(v.k + now.toISO() + Math.random()).slice(0, 12); }
  if (!was) { v.by = by; v.at = now.toISO(); } else { v.eby = by; v.eat = now.toISO(); }
  if (sendWa !== false && v.ph && v.m !== 'free' && inWindow(v.ph)) {
    const day = DateTime.fromISO(v.at).setZone(TZ).toFormat('yyyy-MM-dd');
    const url = (S.appUrl || 'https://clinic.okaybridge.com/') + '?inv=' + day + '.' + v.k + '.' + v.ik;
    out.push(ctaTo(v.ph, (langOf(v.ph, '') === 'en' ? `🧾 *Payment received${was ? ' (revised bill)' : ''}, thank you!*\n\nDear ${v.name}, ${rupees(v.fee)} received by ${v8mode(v.m)}.\n\n🧾 *Invoice no:* ${invNo(v)}` : `🧾 *Payment mil gaya${was ? ' (revised bill)' : ''}, dhanyavaad!*\n\n${v.name} ji, ${rupees(v.fee)} ${v8mode(v.m)} se mil gaye.\n\n🧾 *Invoice no:* ${invNo(v)}`), langOf(v.ph, '') === 'en' ? 'View invoice' : 'Invoice dekhein', url));
  }
  return v;
}
function v8state(role, isDoc, sess) {
  const q = qRead(); const cf = v8cfg(); const Z = BIZ();
  const [h0, h1] = v8hoursOf();
  const dr = docRead();
  const dstat = dr.status === 'in' ? 'in' : (dr.status === 'away' || dr.status === 'late') ? 'out' : dr.status === 'leave' ? 'gone' : 'in';
  const docp = cf.docp || {};
  const doctors = [{ id: 'd0', name: S.doctorName || 'Doctor', short: String(S.doctorName || 'Doctor').split(' ').slice(0, 2).join(' '), spec: docp.spec || '', she: true, from: h0, to: h1, days: (cf.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']).length === 6 ? 'Mon–Sat' : (cf.days || []).map(d => d[0].toUpperCase() + d.slice(1)).join(', '),
    status: dstat, out: dstat === 'out' ? { until: dr.until ? v8min(dr.until) : (now.hour * 60 + now.minute + (dr.mins || 15)), reason: dr.reason || (dr.status === 'late' ? 'Running late' : 'Stepped out'), told: (dr.told || []).length } : null,
    deg: docp.qual || '', reg: docp.reg || Z.reg || '', council: docp.council || '', share: 1, visiting: false }];
  // patients
  const P = {}; const addP = (pk, name, ph, since) => { if (!pk) return null; const p = P[pk] || (P[pk] = { id: pk, name: name || 'Patient', phone: v8ph10(ph), since: since || todayStr, source: '', problem: '', words: '', allergies: '', outcome: '', doc: 'd0', sex: '', age: 0 }); if (name && (!p.name || p.name === 'Patient')) p.name = name; if (since && since < p.since) p.since = since; return p; };
  const days = Object.keys(mem.vis || {}).sort();
  for (const d of days) for (const v of mem.vis[d]) { const p = addP(patKey(v.ph, v.name), v.name, v.ph, d); if (v.prob) { p.problem = v.prob; p.words = v.prob; } }
  for (const tk of q.list) { const p = addP(patKey(tk.phone, tk.name), tk.name, tk.phone, todayStr); if (tk.prob) { p.problem = tk.prob; p.words = tk.prob; } }
  for (const r of rows) if (r.phone && r.date >= now.minus({ days: 60 }).toFormat('yyyy-MM-dd')) { const p = addP(patKey(r.phone, r.name), r.name, r.phone, r.date); if (!p.problem && r.service) p.problem = r.service; }
  for (const a of (mem.appts || [])) addP(a.pid, a.name, a.phone, a.date);
  for (const pk of Object.keys(P)) { const p = P[pk]; const inf = (mem.pinfo || {})[pk] || {}; Object.assign(p, { sex: inf.sex || '', age: inf.age || 0, rel: inf.rel || '', allergies: inf.allergies || '', wt: inf.wt || '' }); if (inf.name) p.name = inf.name;
    const full = v8full(p.phone); const s0 = (mem.src || {})[full]; p.source = s0 ? (V8_SRC[s0.s] || SRC[s0.s] || s0.s) : ((mem.ev || {})[full] ? 'WhatsApp bot' : 'Walk-in'); p.uhid = (mem.uhid || {})[pk] ? Z.prefix + '-' + String(mem.uhid[pk]).padStart(6, '0') : ''; }
  // visits + bills
  const visits = [], bills = [];
  const tkByKey = {}; q.list.forEach(t => { tkByKey[t.key] = t; });
  const firstDay = {}; for (const d of days) for (const v of mem.vis[d]) { const pk = patKey(v.ph, v.name); if (!firstDay[pk]) firstDay[pk] = d; }
  for (const d of days) for (const v of mem.vis[d]) {
    const pk = patKey(v.ph, v.name); const tk = d === todayStr ? tkByKey[v.k] : null;
    let st = v.out ? 'done' : 'waiting'; if (tk) st = tk.st === 's' ? 'cabin' : tk.st === 'd' ? 'done' : tk.st === 'x' ? 'left' : 'waiting';
    const kind = v.kind || (firstDay[pk] === d ? 'new' : 'follow');
    const vv = { date: d, time: v8min(v.tin || v.in || v.at), pid: pk, doc: 'd0', kind, status: st, tok: v.tok || '', k: v.k, prob: v.prob || '' };
    if (tk) { vv.key = tk.key; vv.missed = tk.missed || 0; if (tk.src === 'book' && !tk.here && tk.st === 'w') { vv.status = 'booked'; vv.booked = tk.bookAt ? (Number(String(tk.bookAt).slice(0, 2)) * 60 + Number(String(tk.bookAt).slice(3, 5)) || null) : null; } }
    if (v.m && v.m !== 'free') {
      const its = (v.items && v.items.length ? v.items : [{ n: 'Consultation', p: v.fee || 0, g: 0 }]);
      const listTot = its.reduce((a, x) => a + x.p, 0);
      const b = { no: invNo(v), date: d, time: v8min(v.at), pid: pk, items: its.map(x => ({ n: x.n, amt: x.p, cat: v8cat(x.n), gst: x.g || 0 })), total: v.fee || 0, mode: v8mode(v.m), by: v.by || '', refund: v.refund || null, k: v.k, day: d, inv: v.ik ? (d + '.' + v.k + '.' + v.ik) : '' };
      if (listTot > (v.fee || 0)) b.discount = listTot - (v.fee || 0);
      bills.push(b); vv.bill = b.no;
    }
    if (v.m === 'free') { vv.free = true; vv.payLaterOk = true; }
    visits.push(vv);
  }
  for (const tk of q.list) { if (visits.some(x => x.date === todayStr && x.k === tk.key)) continue; const pk = patKey(tk.phone, tk.name);
    let st = tk.st === 's' ? 'cabin' : tk.st === 'd' ? 'done' : tk.st === 'x' ? 'left' : 'waiting';
    const vv = { date: todayStr, time: v8min(tk.at), pid: pk, doc: 'd0', kind: tk.kind || (firstDay[pk] && firstDay[pk] < todayStr ? 'follow' : 'new'), status: st, tok: tk.tok, k: tk.key, key: tk.key, missed: tk.missed || 0, prob: tk.prob || '', src: tk.src };
    if (tk.src === 'book' && !tk.here && tk.st === 'w') vv.status = 'booked';
    if (tk.payLater) vv.payLaterOk = true;
    if (tk.tr) vv.tr = tk.tr;
    visits.push(vv); }
  for (const vv of visits) if (vv.date === todayStr && tkByKey[vv.k]) { const tk = tkByKey[vv.k]; if (tk.kind) vv.kind = tk.kind; if (tk.payLater) vv.payLaterOk = true; if (tk.started) vv.started = tk.started; }
  // appointments: WhatsApp bookings in the sheet + desk bookings
  const hide = mem.apptHide || {};
  const appts = rows.filter(r => r.date >= todayStr && active(r) && !hide['s' + r.row_number] && !q.list.some(t => t.phone === r.phone && t.st !== 'x' && r.date === todayStr))
    .map(r => { const t = at(r.date, r.time); return { id: 's' + r.row_number, date: r.date, time: t.hour * 60 + t.minute, pid: patKey(r.phone, r.name), doc: 'd0', src: 'WhatsApp' + (r.service ? ' · ' + r.service : '') }; })
    .concat((mem.appts || []).filter(a => a.date >= todayStr && !a.done).map(a => ({ id: a.id, date: a.date, time: a.time, pid: a.pid, doc: 'd0', src: a.src || 'Reception' })));
  // calls to return: call-back requests + missed calls not yet handled
  const calls = (mem.callbacks || []).map(c => ({ id: 'cb:' + c.phone, kind: 'cb', pid: patKey(c.phone, c.name), name: (mem.pname || {})[c.phone] || c.name || 'Unknown', phone: v8ph10(c.phone), why: c.reason || 'Asked for a call back', when: v8min(c.at), how: c.noans ? 'no answer ×' + c.noans : (c.tryAt ? 'calling…' : 'on WhatsApp'), done: false }))
    .concat((mem.mcalls || []).filter(x => x.at >= now.startOf('day').toISO() && !(mem.callbacks || []).some(c => c.phone === x.ph) && !rows.some(r => r.phone === x.ph && active(r)) && !q.list.some(t => t.phone === x.ph))
      .map(x => ({ id: 'mc:' + x.ph, kind: 'mc', pid: patKey(x.ph, ''), name: (mem.pname || {})[x.ph] || 'Unknown', phone: v8ph10(x.ph), why: 'Missed call · WhatsApp sent, no booking yet', when: v8min(x.at), how: 'missed call', done: false })));
  for (const c of calls) if (!P[c.pid]) addP(c.pid, c.name, c.phone, todayStr);
  const cbDone = (mem.cbLog || []).filter(x => x.done && x.done >= now.startOf('day').toISO()).map(x => ({ id: 'cbd:' + x.ph + x.done, name: (mem.pname || {})[x.ph] || 'Patient', phone: v8ph10(x.ph), why: x.reason || '', when: v8min(x.at), done: true, result: 'Called back' }));
  // inbox: what the bot did today
  const inbox = [];
  for (const ph of Object.keys(mem.ev || {})) for (const e of mem.ev[ph]) if (e.at >= now.startOf('day').toISO()) inbox.push({ date: todayStr, time: v8min(e.at), pid: patKey(ph, ''), kind: ({ token: 'Token', booked: 'Booked by bot', talk: 'Asked to talk', cb: 'Call back', msg: 'Message', why: 'Message', recall: 'Reminder', try: 'Called', noans: 'No answer', done: 'Done', bot: 'Bot reply', call: 'Missed call' })[e.k] || e.k, text: e.t || '', out: ['bot', 'recall'].includes(e.k) });
  for (const x of inbox) if (!P[x.pid]) { const ph = x.pid.slice(1); addP(x.pid, (mem.pname || {})[ph] || ('+' + ph), ph, todayStr); }
  // cash days, expenses, refs, prescriptions
  const fl = Number(cf.float == null ? 2000 : cf.float) || 0;
  const cashDays = Object.keys(mem.close || {}).sort().reverse().slice(0, 30).map(d => { const c = mem.close[d]; const R = regSum(d, d); const petty = (mem.exp || []).filter(e => e.date === d && e.from === 'drawer').reduce((a, e) => a + e.amt, 0);
    const exp = c.expected != null ? c.expected : (c.v8 ? fl + R.cash - petty : R.cash); const counted = c.cash || 0; return { date: d, expected: exp, counted, diff: counted - exp, note: c.note || '', by: c.by || '', checked: !!c.checked || counted === exp, handed: c.handed != null ? c.handed : Math.max(0, counted - (c.v8 ? fl : 0)) }; });
  const rx = []; for (const pk of Object.keys(mem.rx || {})) for (const r of mem.rx[pk]) rx.push(Object.assign({ pid: pk }, r));
  const log = (mem.edits || []).slice(-200).map(x => { const d = DateTime.fromISO(x.at).setZone(TZ); return { date: d.toFormat('yyyy-MM-dd'), time: d.hour * 60 + d.minute, who: x.by, what: x.what || ('Changed bill of ' + x.name + ': ' + rupees(x.from.fee) + ' ' + v8mode(x.from.m) + ' → ' + rupees(x.to.fee) + ' ' + v8mode(x.to.m)), why: x.why || '' }; });
  const treat = billList().map((x, i) => ({ id: 't' + i, n: x.n, p: x.p, cat: v8cat(x.n), gst: x.g || 0 }));
  const clinic = {
    id: 'live', live: true, name: S.clinicName || C, short: String(S.clinicName || C).split(' ')[0], logo: cf.logo || String(S.clinicName || C)[0].toUpperCase(), color: cf.color || '#8A6A1F', slug: cf.slug || 'clinic',
    address: S.address || Z.address || '', phone: Z.phone || S.clinicPhone || '', gstin: Z.gstin || '', billPrefix: Z.prefix + '/', timings: cf.timings || timingsText('en').replace(/\n/g, ' · '),
    lang: S.defaultLang || 'en', rxLang: cf.rxLang || 'hi', fee: S.fee || 0, freeDays: S.followFreeDays === undefined ? 7 : Number(S.followFreeDays) || 0, float: fl,
    treatments: treat, sets: cf.rxsets || null, doctors, staff: (S.staff || []).map(x => ({ id: v8ph10(x.phone), name: x.name, role: x.role === 'owner' ? 'Owner' : x.role === 'doctor' ? 'Doctor' : 'Reception', phone: v8ph10(x.phone), since: '' })),
    patients: Object.values(P), visits, bills, rx, appts, calls: calls.concat(cbDone), inbox, reports: mem.preports || [], cashDays, refs: mem.refs || [], leaves: (mem.leaves || []).map(d => ({ doc: 'd0', date: d, moved: 0 })), log,
    expenses: mem.exp || [], perms: Object.assign({ discount: false, refund: true, editBill: false, money: false }, cf.perms || {}), boxes: Object.assign({ r_appt: true, r_close: true, d_sets: true, p_reports: true, p_pay: false }, cf.boxes || {}),
    msgs: null, named: {}, tokNext: (q.seq || 0) + 1, status: 'Live', tpl: cf.type || 'skin', callBy: S.callBy === 'reception' ? 'reception' : 'doctor', upi: S.upiId || '', bot: S.botNumber || '', links: { tv: S.tvKey ? `${APP}?v=tv&k=${S.tvKey}` : '' }
  };
  { const cutD = now.minus({ days: role === 'reception' ? 35 : 62 }).toFormat('yyyy-MM-dd');
    clinic.visits = clinic.visits.filter(v => v.date >= cutD).map(v => { const o = Object.assign({}, v); if (o.key === o.k) delete o.key; if (o.doc === 'd0') delete o.doc; if (!o.missed) delete o.missed; if (!o.prob) delete o.prob; return o; });
    clinic.bills = clinic.bills.filter(b => b.date >= cutD).map(b => { const o = Object.assign({}, b); delete o.day; if (!o.refund) delete o.refund; o.items = o.items.map(x => { const y = { n: x.n, amt: x.amt }; if (x.gst) y.gst = x.gst; return y; }); return o; });
    const used = {}; clinic.visits.forEach(v => { used[v.pid] = 1; }); clinic.appts.forEach(a => { used[a.pid] = 1; }); clinic.calls.forEach(c => { used[c.pid] = 1; }); clinic.inbox.forEach(x => { used[x.pid] = 1; }); clinic.rx.forEach(x => { used[x.pid] = 1; });
    clinic.patients = clinic.patients.filter(p => used[p.id] || role !== 'reception').map(p => { const o = {}; for (const k of Object.keys(p)) if (p[k] !== '' && p[k] !== 0 && !(k === 'doc' && p[k] === 'd0')) o[k] = p[k]; return o; });
    clinic.rx = clinic.rx.filter(r => r.date >= now.minus({ days: 400 }).toFormat('yyyy-MM-dd')); }
  return { ver: 'live', today: todayStr, clock: now.hour * 60 + now.minute, active: 'live', clinics: { live: clinic }, dayClosed: (mem.close || {})[todayStr] ? { live: v8min((mem.close[todayStr] || {}).at) } : {}, patientAuth: {}, me: { name: sess.name, role, phone: v8ph10(sess.phone) } };
}
function v8act(b, sess, role, isDoc, out, res) {
  const a = String(b.action || ''); const by = sess.name || 'Staff'; const q = qWrite(); const cf = v8cfg();
  const findTk = key => q.list.find(x => x.key === key);
  const ownerOnly = role === 'owner'; const docOnly = isDoc;
  const fail = m => { res.error = m; };
  if (a === 'v8_register') {
    const full = v8full(b.phone); if (full && full.length !== 12) return fail('Enter a 10-digit mobile number.');
    const name = String(b.name || '').trim().slice(0, 40); if (!name) return fail('Write the patient name.');
    if (q.list.some(t => t.phone && t.phone === full && ['w', 's'].includes(t.st))) return fail('This number already has a token today.');
    const tk = issueToken(q, full, name, 'desk'); tk.kind = ['new', 'follow', 'proc'].includes(b.kind) ? b.kind : 'new'; if (b.prob) tk.prob = String(b.prob).slice(0, 120); if (b.tr) tk.tr = String(b.tr).slice(0, 60);
    const pk = patKey(full, name); const inf = v8pinfo(pk); if (b.age) inf.age = Math.max(0, Math.min(120, Number(b.age) || 0)); if (b.sex) inf.sex = String(b.sex).slice(0, 1); inf.name = name;
    if (b.src && !(mem.src || {})[full || ('n' + name.toLowerCase())]) { if (!mem.src) mem.src = {}; const sk = Object.keys(V8_SRC).find(k => V8_SRC[k] === b.src) || 'other'; mem.src[full || ('n' + name.toLowerCase())] = { s: sk, at: now.toISO() }; bump('src_' + sk); }
    if (b.mode && b.mode !== 'later' && Array.isArray(b.items) && b.items.length) { const v = v8ensureVisit(tk); v8bill(v, b.items, String(b.mode).toLowerCase(), 0, by, true, out); }
    if (b.mode === 'later') tk.payLater = true;
    if (full && inWindow(full)) out.push(tokenMsg(q, tk, full));
    res.added = tk.tok; res.key = tk.key; res.sent = !!(full && inWindow(full)); res.ahead = aheadOf(q, tk);
  } else if (a === 'v8_pay') {
    let v = null; if (b.day && b.k) v = v8visit(b.day, b.k); if (!v && b.key) { const tk = findTk(b.key); if (tk) v = v8ensureVisit(tk); }
    if (!v && b.pid) { // a bill for someone not in today's queue (medicines, procedure)
      const ph = b.pid[0] === 'p' ? b.pid.slice(1) : ''; const nm = (b.name || '').trim() || ((mem.pinfo || {})[b.pid] || {}).name || 'Patient';
      if (!mem.vis) mem.vis = {}; const l = mem.vis[todayStr] || (mem.vis[todayStr] = []); v = { k: rid(10), tok: '', name: nm, ph, tin: now.toISO(), in: now.toISO(), out: now.toISO(), fee: null, m: null, fupSug: 0, prob: '', counter: true }; l.push(v); }
    if (!v) return fail('This visit was not found.');
    if (v.m && !b.edit) return fail('Already paid. Open the bill to change it.');
    if (Number(b.disc) > 0 && !(cf.perms || {}).discount && !isDoc) return fail('Discounts are turned off by the owner.');
    v8bill(v, b.items, String(b.mode || 'cash').toLowerCase(), b.disc, by, b.wa !== false, out); res.billed = invNo(v);
    const tk = findTk(v.k); if (tk) tk.payLater = false;
  } else if (a === 'v8_refund') {
    const v = v8visit(b.day, b.k); if (!v || !v.m) return fail('Bill not found.');
    if (!isDoc && (cf.perms || {}).refund === false) return fail('Refunds are turned off by the owner.');
    const amt = Math.max(1, Math.min(v.fee || 0, Math.round(Number(b.amt) || 0))); const why = String(b.reason || '').trim().slice(0, 120); if (!why) return fail('Write the reason.');
    v.refund = { amt, reason: why, by, date: todayStr, time: now.hour * 60 + now.minute };
    mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: b.day, k: v.k, inv: v.inv, name: v.name, from: { fee: v.fee, m: v.m }, to: { fee: v.fee - amt, m: v.m }, what: 'Refunded ' + rupees(amt) + ' on ' + invNo(v) + ' (' + v.name + ')', why }]).slice(-400);
    if (v.ph && inWindow(v.ph)) out.push(textTo(v.ph, `${rupees(amt)} refunded for invoice ${invNo(v)}. If you paid by UPI, it reaches your account in 2–3 days.`));
  } else if (a === 'v8_mode') {
    if (!isDoc && !(cf.perms || {}).editBill) return fail('Bill changes are turned off by the owner.');
    const v = v8visit(b.day, b.k); if (!v || !v.m) return fail('Bill not found.'); const m = String(b.m || '').toLowerCase(); if (!['cash', 'upi', 'card'].includes(m) || m === v.m) return;
    mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: b.day, k: v.k, inv: v.inv, name: v.name, from: { fee: v.fee, m: v.m }, to: { fee: v.fee, m } }]).slice(-400); v.m = m; v.edited = (v.edited || 0) + 1;
  } else if (a === 'v8_next') {
    if (role === 'reception' && S.callBy !== 'reception' && !b.force) return fail('In this clinic the doctor calls the next patient. Use "Send in" only if the doctor asked.');
    const cur = servingOf(q); if (cur && !b.finishCur) return fail('CABIN_BUSY');
    if (!mem.docPend && ['late', 'away'].includes(docRead().status)) return fail(S.doctorName + ' has stepped out.');
    if (b.key) { const tk = findTk(b.key); if (tk && tk.st === 'w') { const rest = q.list.filter(x => x !== tk); const i = rest.findIndex(x => x.st === 'w'); rest.splice(i < 0 ? rest.length : i, 0, tk); q.list = rest; } }
    callNext(q, out); const nx = servingOf(q); if (nx) { nx.started = now.hour * 60 + now.minute; res.sentIn = nx.tok; }
  } else if (a === 'v8_start') {
    if (!isDoc) return fail('Only the doctor starts a consult.');
    const tk = b.key ? findTk(b.key) : waitingOf(q)[0]; const cur = servingOf(q);
    if (cur && (!tk || cur.key === tk.key)) { res.key = cur.key; return; }
    if (!tk || tk.st !== 'w') return fail('No one is waiting.');
    if (cur) { cur.st = 'w'; cur.calledAt = null; }
    tk.st = 's'; tk.calledAt = now.toISO(); tk.started = now.hour * 60 + now.minute; queueNotify(q, out); res.key = tk.key;
    if (['late', 'away'].includes(docRead().status)) setDoc('in', 0, out);
  } else if (a === 'v8_finish') {
    if (!isDoc) return fail('Only the doctor finishes a consult.');
    const r0 = b.rx || {}; const cur = b.key ? findTk(b.key) : servingOf(q);
    const pk = cur ? patKey(cur.phone, cur.name) : String(b.pid || ''); if (!pk) return fail('Patient not found.');
    const rec = { id: rid(8), date: todayStr, doc: 'd0', finding: String(r0.finding || '').slice(0, 160), meds: (Array.isArray(r0.meds) ? r0.meds : []).slice(0, 15).map(m => ({ n: String(m.n || '').slice(0, 80), how: String(m.how || '').slice(0, 120), brand: m.brand ? String(m.brand).slice(0, 40) : undefined })).filter(m => m.n), advice: String(r0.advice || '').slice(0, 400), vitals: { wt: String((r0.vitals || {}).wt || '').slice(0, 6), bp: String((r0.vitals || {}).bp || '').slice(0, 9) }, tests: (r0.tests || []).slice(0, 10).map(t => String(t).slice(0, 60)), follow: /^\d{4}-\d{2}-\d{2}$/.test(r0.follow || '') ? r0.follow : null };
    if (!mem.rx) mem.rx = {}; mem.rx[pk] = (mem.rx[pk] || []).concat([rec]).slice(-30);
    if (rec.vitals.wt) v8pinfo(pk).wt = rec.vitals.wt;
    if (cur && cur.st === 's') { cur.fupDays = rec.follow ? Math.round(DateTime.fromISO(rec.follow).diff(now.startOf('day'), 'days').days) : 0; finishCur(q, out);
      const v = v8visit(todayStr, cur.key); if (v) { v.prob = v.prob || rec.finding; if (rec.follow) { v.fup = rec.follow; mem.fup = (mem.fup || []).filter(f => f.k !== v.k); if (v.ph) mem.fup.push({ k: v.k, ph: v.ph, name: v.name, date: rec.follow, sent: false }); } } }
    else if (!cur) { if (!mem.vis) mem.vis = {}; const l = mem.vis[todayStr] || (mem.vis[todayStr] = []); const ph = pk[0] === 'p' ? pk.slice(1) : ''; l.push({ k: rid(10), tok: 'Rx', name: (v8pinfo(pk).name) || b.name || 'Patient', ph, tin: now.toISO(), in: now.toISO(), out: now.toISO(), fee: null, m: 'free', fupSug: 0, prob: rec.finding, rxOnly: true }); }
    const ph2 = pk[0] === 'p' ? pk.slice(1) : '';
    if (ph2 && inWindow(ph2)) out.push(ctaTo(ph2, (langOf(ph2, '') === 'en' ? `💊 *Your prescription from ${S.doctorName} is ready.*\n\nTap below to see your medicines and how to take them.` : `💊 *${S.doctorName} ki parchi taiyaar hai.*\n\nDawai aur lene ka tareeka dekhne ke liye neeche tap karein.`), langOf(ph2, '') === 'en' ? 'View prescription' : 'Parchi dekhein', `${APP}?v=p&k=${rec.id}.${sha256(pk + rec.id).slice(0, 10)}`));
    res.rx = rec.id;
  } else if (a === 'v8_left') {
    const tk = findTk(b.key); if (!tk) return fail('Token not found.'); tk.st = 'x';
    if (b.refund) { const v = v8visit(todayStr, tk.key); if (v && v.m) { v.refund = { amt: v.fee, reason: 'Left before seeing the doctor', by, date: todayStr, time: now.hour * 60 + now.minute }; mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: todayStr, k: v.k, inv: v.inv, name: v.name, from: { fee: v.fee, m: v.m }, to: { fee: 0, m: v.m }, what: 'Refunded ' + rupees(v.fee) + ' (' + v.name + ' left)', why: 'Left before seeing the doctor' }]); } }
    queueNotify(q, out);
  } else if (a === 'v8_back_q') { const tk = findTk(b.key); if (tk && tk.st === 's') { tk.st = 'w'; tk.calledAt = null; } }
  else if (a === 'v8_moveend') { const tk = findTk(b.key); if (tk && tk.st === 'w') { q.list = q.list.filter(x => x !== tk).concat([tk]); tk.told2 = false; queueNotify(q, out); } }
  else if (a === 'v8_arrived') { const tk = findTk(b.key); if (tk) { tk.here = true; if (tk.phone && inWindow(tk.phone)) out.push(tokenMsg(q, tk, tk.phone)); } }
  else if (a === 'v8_pinfo') { const pk = String(b.pid || ''); if (!pk) return; const inf = v8pinfo(pk); const p = b.p || {}; if (p.name) inf.name = String(p.name).slice(0, 40); if (p.age !== undefined) inf.age = Math.max(0, Math.min(120, Number(p.age) || 0)); if (p.sex) inf.sex = String(p.sex).slice(0, 1); if (p.rel !== undefined) inf.rel = String(p.rel).slice(0, 40); if (p.allergies !== undefined) inf.allergies = String(p.allergies).slice(0, 80); }
  else if (a === 'v8_out') { if (!isDoc && role !== 'reception') return; const mins = Math.max(5, Math.min(240, Number(b.mins) || 30)); const cur = servingOf(q); if (cur) { cur.st = 'w'; cur.calledAt = null; } const n = setDoc('away', mins, out); mem.doc.reason = String(b.reason || 'Stepped out').slice(0, 40); res.told = n; }
  else if (a === 'v8_in') { res.told = setDoc('in', 0, out); }
  else if (a === 'v8_docstatus') { const s0 = b.status === 'gone' ? 'leave' : b.status === 'later' ? 'late' : 'in'; if (s0 === 'in') setDoc('in', 0, out); else mem.doc = { status: s0, mins: 0, setAt: now.toISO(), told: [] }; }
  else if (a === 'v8_more') { const d = docRead(); if (d.until) { d.until = DateTime.fromISO(d.until).plus({ minutes: 15 }).toISO(); d.mins = (d.mins || 0) + 15; } }
  else if (a === 'v8_leave') { if (!isDoc) return fail('Only the doctor can mark leave.'); const d0 = String(b.date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) return; mem.leaves = (mem.leaves || []).filter(x => x !== d0); if (b.on !== false) mem.leaves.push(d0);
    let told = 0; if (b.on !== false) { for (const r of rows.filter(r => r.date === d0 && active(r))) if (inWindow(r.phone)) { out.push(textTo(r.phone, (langOf(r.phone, '') === 'en' ? `${S.doctorName} is on leave on ${DateTime.fromISO(d0).toFormat('ccc d LLL')}. Sorry! Please reply *NEW* to pick another time.` : `${S.doctorName} ${DateTime.fromISO(d0).toFormat('ccc d LLL')} ko chhutti par hain. Kshama karein! Naya samay chunne ke liye *NEW* likhiye.`))); told++; } for (const a2 of (mem.appts || []).filter(x => x.date === d0)) { if (a2.phone && inWindow(a2.phone)) { out.push(textTo(a2.phone, `${S.doctorName} is on leave on ${DateTime.fromISO(d0).toFormat('ccc d LLL')}. We will call you to move your visit.`)); told++; } } }
    res.told = told; }
  else if (a === 'v8_timings') { if (!isDoc) return; const ok = t => /^\d{2}:\d{2}$/.test(t); if (ok(b.open) && ok(b.close) && b.close > b.open) { const days0 = cf.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']; const H = {}; ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(d => { H[d] = days0.includes(d) ? [`${b.open}-${b.close}`] : []; }); cf.hours = H; cf.open = b.open; cf.close = b.close; cf.days = days0; Object.assign(S, cf); } else fail('End time must be after start time.'); }
  else if (a === 'v8_cb') { const ph = v8full(b.phone); const r0 = b.r;
    if (String(b.id || '').startsWith('mc:')) { if (r0 !== 'noans') mem.mcalls = (mem.mcalls || []).filter(x => x.ph !== ph); ev(ph, r0 === 'noans' ? 'noans' : 'done', r0 === 'noans' ? 'No answer · ' + by : 'Called back by ' + by); }
    else { const cb = (mem.callbacks || []).find(x => x.phone === ph); if (!cb) return;
      if (r0 === 'noans') { cb.noans = (cb.noans || 0) + 1; cb.tryAt = null; ev(ph, 'noans', 'No answer · ' + by + ' will try again'); }
      else { ev(ph, 'done', 'Talked · called back by ' + by); if (!mem.cbLog) mem.cbLog = []; mem.cbLog.push({ ph, at: cb.at, done: now.toISO(), by, reason: cb.reason || '' }); mem.cbLog = mem.cbLog.slice(-300); mem.callbacks = mem.callbacks.filter(x => x !== cb); } } }
  else if (a === 'v8_appt_add') { const full = v8full(b.phone); const name = String(b.name || '').trim().slice(0, 40); if (!name) return fail('Write the name.'); if (full && full.length !== 12) return fail('Enter a 10-digit mobile number.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !(Number(b.time) >= 0)) return fail('Pick a day and time.');
    if ((mem.leaves || []).includes(b.date)) return fail('The doctor is on leave that day.');
    if (b.moving) { if (String(b.moving).startsWith('s')) { if (!mem.apptHide) mem.apptHide = {}; mem.apptHide[b.moving] = 1; } else mem.appts = (mem.appts || []).filter(x => x.id !== b.moving); }
    const pk = b.pid || patKey(full, name); const ap = { id: 'a' + rid(8), date: b.date, time: Number(b.time), pid: pk, name, phone: full, src: b.src || 'Reception', by, at: now.toISO() };
    mem.appts = (mem.appts || []).filter(x => x.date >= todayStr).concat([ap]).slice(-500); v8pinfo(pk).name = v8pinfo(pk).name || name;
    if (full && inWindow(full)) out.push(textTo(full, (langOf(full, '') === 'en' ? `📅 *Booked:* ${S.doctorName}, ${DateTime.fromISO(b.date).toFormat('ccc d LLL')} at ${DateTime.fromFormat(v8hm(ap.time), 'HH:mm').toFormat('h:mm a')}.\n${C}` : `📅 *Booking ho gayi:* ${S.doctorName}, ${DateTime.fromISO(b.date).toFormat('ccc d LLL')} ko ${DateTime.fromFormat(v8hm(ap.time), 'HH:mm').toFormat('h:mm a')} baje.\n${C}`)));
    res.appt = ap.id; }
  else if (a === 'v8_appt_cancel') { const id = String(b.id || ''); let ph = '';
    if (id.startsWith('s')) { if (!mem.apptHide) mem.apptHide = {}; mem.apptHide[id] = 1; const r = rows.find(x => 's' + x.row_number === id); ph = r ? r.phone : ''; }
    else { const ap = (mem.appts || []).find(x => x.id === id); if (ap) ph = ap.phone; mem.appts = (mem.appts || []).filter(x => x.id !== id); }
    if (ph && inWindow(ph)) out.push(textTo(ph, `Your appointment at ${C} is cancelled. Reply *NEW* any time to book again.`)); }
  else if (a === 'v8_appt_arrived') { const id = String(b.id || ''); let name = 'Patient', ph = '';
    if (id.startsWith('s')) { const r = rows.find(x => 's' + x.row_number === id); if (r) { name = r.name || name; ph = r.phone; } if (!mem.apptHide) mem.apptHide = {}; mem.apptHide[id] = 1; }
    else { const ap = (mem.appts || []).find(x => x.id === id); if (ap) { name = ap.name; ph = ap.phone; ap.done = true; } }
    const tk = issueToken(q, ph, name, 'desk'); tk.here = true; tk.kind = seenBefore(ph) ? 'follow' : 'new'; if (ph && inWindow(ph)) out.push(tokenMsg(q, tk, ph)); res.added = tk.tok; }
  else if (a === 'v8_petty') { const amt = Math.round(Number(b.amt) || 0); if (amt <= 0 || amt > 50000) return fail('Enter the amount.'); mem.exp = (mem.exp || []).concat([{ id: rid(8), date: todayStr, time: now.hour * 60 + now.minute, amt, what: String(b.what || 'Other').slice(0, 40), from: 'drawer', by }]).slice(-3000);
    mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: todayStr, k: '', inv: 0, name: '', from: { fee: 0, m: 'cash' }, to: { fee: 0, m: 'cash' }, what: 'Took ' + rupees(amt) + ' from the drawer', why: String(b.what || '') }]).slice(-400); }
  else if (a === 'v8_close') { const R = regSum(todayStr, todayStr); const fl = Number(cf.float == null ? 2000 : cf.float) || 0; const petty = (mem.exp || []).filter(e => e.date === todayStr && e.from === 'drawer').reduce((x, e) => x + e.amt, 0);
    const expected = fl + R.cash - (R.V.filter(v => v.m === 'cash' && v.refund).reduce((x, v) => x + v.refund.amt, 0)) - petty; const counted = Math.max(0, Math.round(Number(b.counted) || 0)); const diff = counted - expected;
    if (diff !== 0 && !String(b.note || '').trim()) return fail('Write why the cash is ' + (diff < 0 ? 'short.' : 'extra.'));
    if (!mem.close) mem.close = {}; mem.close[todayStr] = { cash: counted, upi: R.upi, by, at: now.toISO(), v8: true, expected, note: String(b.note || '').slice(0, 160), handed: Math.max(0, counted - fl), notes: b.notes || null, checked: diff === 0 };
    for (const o of OWNERS) if (inWindow(o.phone) && o.phone !== sess.phone) out.push(textTo(o.phone, `📒 *Day closed* by ${by} at ${now.toFormat('h:mm a')}\nCollected: ${rupees(R.money - R.V.reduce((x, v) => x + (v.refund ? v.refund.amt : 0), 0))} (cash ${rupees(R.cash)}, UPI ${rupees(R.upi)})\nCash: ${diff === 0 ? 'matched ✅' : (diff < 0 ? 'SHORT ' : 'extra ') + rupees(Math.abs(diff)) + (b.note ? ' · "' + String(b.note).slice(0, 80) + '"' : '')}\nHand over: ${rupees(Math.max(0, counted - fl))}\nPatients seen: ${R.V.filter(v => v.out).length}`));
    res.closed = true; }
  else if (a === 'v8_reopen') { if (mem.close) delete mem.close[todayStr]; }
  else if (a === 'v8_cash_ok') { if (!ownerOnly) return fail('Only the owner can mark this.'); const c = (mem.close || {})[b.date]; if (c) c.checked = true; }
  else if (a === 'v8_sets') { if (!isDoc) return; cf.rxsets = (Array.isArray(b.sets) ? b.sets : []).slice(0, 80).map(s => ({ id: String(s.id || rid(6)).slice(0, 12), n: String(s.n || '').slice(0, 50), used: Number(s.used) || 0, meds: (s.meds || []).slice(0, 12).map(m => ({ n: String(m.n || '').slice(0, 80), how: String(m.how || '').slice(0, 120), brand: m.brand ? String(m.brand).slice(0, 40) : undefined })) })).filter(s => s.n); }
  else if (a === 'v8_rep_seen') { const r = (mem.preports || []).find(x => x.id === b.id); if (r) r.seen = true; if (b.reply && r) { const ph = r.pid[0] === 'p' ? r.pid.slice(1) : ''; if (ph && inWindow(ph)) out.push(textTo(ph, S.doctorName + ': ' + String(b.reply).slice(0, 300))); } }
  else if (a === 'v8_remind') { const pk = String(b.pid || ''); const ph = pk[0] === 'p' ? pk.slice(1) : ''; if (ph && inWindow(ph)) { out.push(textTo(ph, (langOf(ph, '') === 'en' ? `Hello, your follow-up with ${S.doctorName} is due. Reply *NEW* to book a time.` : `Namaste, ${S.doctorName} se follow-up ka samay ho gaya hai. Booking ke liye *NEW* likhiye.`))); res.sent = true; } else res.error = 'This patient has not messaged in the last 24 hours, so WhatsApp only allows an approved template. Ask reception to call instead.'; v8pinfo(pk).asked = todayStr; }
  else if (a === 'v8_askcall') { const pk = String(b.pid || ''); const ph = pk[0] === 'p' ? pk.slice(1) : ''; if (!ph) return; if (!mem.callbacks) mem.callbacks = []; if (!mem.callbacks.some(c => c.phone === ph)) mem.callbacks.push({ phone: ph, name: b.name || '', at: now.toISO(), reason: by + ' asked: follow-up is due', pinged: now.toISO() }); v8pinfo(pk).asked = todayStr; }
  else if (a === 'v8_exp') { if (!ownerOnly) return fail('Only the owner adds expenses.'); const amt = Math.round(Number(b.amt) || 0); if (amt <= 0) return fail('Enter the amount.'); mem.exp = (mem.exp || []).concat([{ id: rid(8), date: /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : todayStr, time: 600, amt, what: String(b.what || 'Other').slice(0, 60), from: 'bank', by }]); }
  else if (a === 'v8_exp_del') { if (!ownerOnly) return; mem.exp = (mem.exp || []).filter(x => x.id !== b.id); }
  else if (a === 'v8_ref') { if (!ownerOnly) return; if (b.id) { const r = (mem.refs || []).find(x => x.id === b.id); if (r) { r.paid = !r.paid; r.paidOn = r.paid ? todayStr : null; } } else { const amt = Math.round(Number(b.amt) || 0); if (!String(b.name || '').trim() || amt <= 0) return fail('Fill name and amount.'); mem.refs = (mem.refs || []).concat([{ id: rid(8), name: String(b.name).slice(0, 60), what: String(b.what || '').slice(0, 60), amt, paid: false, month: now.toFormat('yyyy-MM') }]); } }
  else if (a === 'v8_perm') { if (!ownerOnly) return fail('Only the owner can change this.'); cf.perms = Object.assign({ discount: false, refund: true, editBill: false, money: false }, cf.perms || {}); if (b.k in cf.perms) cf.perms[b.k] = !cf.perms[b.k]; }
  else if (a === 'v8_box') { if (!ownerOnly) return; cf.boxes = Object.assign({ r_appt: true, r_close: true, d_sets: true, p_reports: true, p_pay: false }, cf.boxes || {}); if (b.k in cf.boxes) cf.boxes[b.k] = !cf.boxes[b.k]; }
  else if (a === 'v8_apikey') { if (!ownerOnly) return fail('Only the owner can turn on the connector.'); if (b.off) { delete mem.apiKey; res.apiKey = null; } else if (b.peek && !mem.apiKey) { res.apiKey = null; } else { if (!mem.apiKey || b.reset) mem.apiKey = 'ck_' + sha256(now.toISO() + Math.random() + Math.random()).slice(0, 32); res.apiKey = mem.apiKey; res.apiLog = (mem.apiLog || []).slice(-30).reverse(); } }
  else if (a === 'v8_cfg') { if (!ownerOnly && !isDoc) return fail('Only the owner can change settings.'); const c0 = b.cfg || {}; const str = (v, n) => String(v || '').trim().slice(0, n);
    if (c0.name) { cf.clinicName = str(c0.name, 60); S.clinicName = cf.clinicName; } if (c0.logo) cf.logo = str(c0.logo, 2).toUpperCase(); if (c0.color && /^#[0-9A-Fa-f]{6}$/.test(c0.color)) cf.color = c0.color;
    if (c0.timings !== undefined) cf.timings = str(c0.timings, 120); if (c0.rxLang && ['hi', 'hl', 'en'].includes(c0.rxLang)) cf.rxLang = c0.rxLang; if (c0.lang && ['en', 'hl'].includes(c0.lang)) { cf.defaultLang = c0.lang; S.defaultLang = c0.lang; }
    if (c0.fee !== undefined) { cf.fee = Math.max(0, Math.min(100000, Math.round(Number(c0.fee) || 0))); S.fee = cf.fee; } if (c0.freeDays !== undefined) { cf.followFreeDays = Math.max(0, Math.min(90, Number(c0.freeDays) || 0)); S.followFreeDays = cf.followFreeDays; }
    if (c0.float !== undefined) cf.float = Math.max(0, Math.min(50000, Math.round(Number(c0.float) || 0)));
    if (c0.address !== undefined) { cf.address = str(c0.address, 120); S.address = cf.address; }
    if (c0.biz) { const z = c0.biz; const g = String(z.gstin || '').toUpperCase().replace(/\s/g, ''); if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return fail('GSTIN should be 15 characters, like 09ABCDE1234F1Z5.'); cf.biz = Object.assign({}, cf.biz || {}, { gstin: g }, z.prefix ? { prefix: str(z.prefix, 4).toUpperCase().replace(/[^A-Z]/g, '') } : {}, z.phone !== undefined ? { phone: str(z.phone, 20) } : {}); }
    if (c0.doc) { const z = c0.doc; cf.docp = Object.assign({}, cf.docp || {}, { qual: str(z.deg, 80), reg: str(z.reg, 40), council: str(z.council, 60), spec: str(z.spec, 40) }); if (z.name) { cf.doctorName = str(z.name, 60); S.doctorName = cf.doctorName; } }
    if (Array.isArray(c0.treatments)) cf.bill = c0.treatments.map(x => ({ n: str(x.n, 40), p: Math.max(0, Math.min(500000, Math.round(Number(x.p) || 0))), g: [0, 5, 12, 18].includes(Number(x.gst)) ? Number(x.gst) : 0 })).filter(x => x.n).slice(0, 40);
    Object.assign(S, cf); res.saved = true; }
  else if (a === 'v8_preport') { /* patient page upload (name only for now) */ const pk = String(b.pid || ''); if (!pk) return; mem.preports = (mem.preports || []).concat([{ id: rid(8), pid: pk, name: String(b.name || 'Report').slice(0, 60), date: todayStr, time: now.hour * 60 + now.minute, seen: false, values: [['File', String(b.name || '').slice(0, 60), 'Waiting for the doctor']] }]).slice(-300); }
  else if (a === 'v8_staff') { if (!ownerOnly) return fail('Only the owner adds staff.'); let ph = v8full(b.phone); if (ph.length !== 12) return fail('Enter a 10-digit mobile number.'); const T = (Array.isArray(mem.team) && mem.team.length ? mem.team : (S.staff || [])).filter(x => String(x.phone).slice(-10) !== ph.slice(-10)); T.push({ phone: ph, name: String(b.name || 'Staff').trim().slice(0, 40) || 'Staff', role: ['reception', 'doctor'].includes(b.role) ? b.role : 'reception' }); mem.team = T; S.staff = T; res.added = true; }
  else if (a === 'v8_staff_rm') { if (!ownerOnly) return; const ph = v8ph10(b.phone); const T = (Array.isArray(mem.team) && mem.team.length ? mem.team : (S.staff || [])); const x = T.find(y => String(y.phone).slice(-10) === ph); if (!x || x.role === 'owner') return fail('This person can not be removed.'); mem.team = T.filter(y => y !== x); S.staff = mem.team; for (const k of Object.keys(mem.sess || {})) if (mem.sess[k].phone.slice(-10) === ph) delete mem.sess[k]; }
}

// ================= Connector API: lets any clinic software (BS Infosystems etc.) use our WhatsApp =================
// Their software sends a small message to /api with the clinic's secret key; we do all the WhatsApp work.
function extApi(b, out) {
  const fail = (code, msg) => ({ ok: false, code, error: msg });
  if (!mem.apiKey) return fail('no_key', 'Connector is not switched on. The owner turns it on in Settings › Connect your software.');
  if (String(b.key || '') !== mem.apiKey) return fail('bad_key', 'Wrong key.');
  // nothing is saved unless the call really changes something: a save from a read-only or failed call
  // could land after (and wipe) a save from the call just before it
  const minute = now.toFormat('yyyy-MM-dd HH:mm'); const used = (mem.apiRate && mem.apiRate.m === minute) ? mem.apiRate.n : 0;
  if (used >= 120) return fail('slow_down', 'Too many requests this minute. Try again in a minute.');
  const a = String(b.action || '').slice(4);
  const ph = v8full(b.phone); const name = String(b.name || '').trim().slice(0, 40);
  const needPhone = () => { if (ph.length !== 12) return fail('bad_phone', 'Send a 10-digit Indian mobile number (or 91 + 10 digits).'); return null; };
  // which message type we could send: rich (patient wrote to us in the last 24 h) or an approved template, or nothing
  const reach = (tplKey) => inWindow(ph) ? 'whatsapp' : (S.templates && S.templates[tplKey]) ? 'template' : 'none';
  const log = (what, sent) => { mem.apiRate = { m: minute, n: used + 1 }; if (!mem.apiLog) mem.apiLog = []; mem.apiLog.push({ at: now.toISO(), a, ph: ph ? ph.slice(-4) : '', what, sent }); mem.apiLog = mem.apiLog.slice(-300); bump('api_' + a); };
  const q = a === 'token' ? qWrite() : qRead();
  const findTk = () => q.list.find(x => (b.ref && x.extRef === String(b.ref)) || (ph && x.phone === ph && ['w', 's'].includes(x.st)));
  if (a === 'ping') return { ok: true, clinic: C, doctor: D, time: now.toISO(), version: 'connector-1' };
  if (a === 'status') { const cur = servingOf(q); return { ok: true, now: cur ? cur.tok : null, waiting: waitingOf(q).length, doctor: docRead().status || 'in' }; }
  if (a === 'token') {
    const e = needPhone(); if (e) return e;
    let tk = findTk();
    if (!tk) { tk = issueToken(q, ph, name || 'Patient', 'ext'); if (b.ref) tk.extRef = String(b.ref).slice(0, 40); if (b.token) tk.tok = String(b.token).slice(0, 12); tk.kind = ['new', 'follow', 'proc'].includes(b.kind) ? b.kind : 'new'; }
    const r = reach('token');
    if (r === 'whatsapp') out.push(tokenMsg(q, tk, ph));
    else if (r === 'template') { const n = aheadOf(q, tk); out.push(templateTo(ph, S.templates.token, [name || 'there', String(tk.tok).replace('-', ''), String(n), C], [])); }
    log('token ' + tk.tok, r);
    return { ok: true, token: tk.tok, ref: tk.extRef || tk.key, ahead: aheadOf(q, tk), track_url: trackUrl(tk), whatsapp: r };
  }
  if (a === 'call') { // the patient is called in to the doctor
    const tk = findTk(); if (!tk) return fail('not_found', 'No waiting token for this patient. If you sent the token just now, try again in 5 seconds.');
    const cur = servingOf(q); if (cur && cur !== tk) { cur.st = 'd'; addVisit(cur); }
    tk.st = 's'; tk.calledAt = now.toISO();
    const r = reach('turn'); if (r === 'whatsapp') { const lg = langOf(ph || tk.phone, ''); out.push(textTo(tk.phone, lg === 'en' ? `🔔 *It's your turn!*\n\nPlease go in to ${D} now. Token *${String(tk.tok).replace('-', '')}*.` : `🔔 *Aapki baari aa gayi!*\n\nKripya abhi ${D} ke paas andar jaiye. Token *${String(tk.tok).replace('-', '')}*.`)); }
    else if (r === 'template') out.push(templateTo(tk.phone, S.templates.turn, [String(tk.tok).replace('-', ''), D], []));
    queueNotify(q, out); log('call ' + tk.tok, r);
    return { ok: true, token: tk.tok, whatsapp: r, waiting: waitingOf(q).length };
  }
  if (a === 'done') { const tk = findTk(); if (!tk) return fail('not_found', 'Token not found. If you sent it just now, try again in 5 seconds.'); if (tk.st !== 'd') { tk.st = 'd'; addVisit(tk); } queueNotify(q, out); log('done ' + tk.tok, '-'); return { ok: true }; }
  if (a === 'cancel') { const tk = findTk(); if (!tk) return fail('not_found', 'Token not found. If you sent it just now, try again in 5 seconds.'); tk.st = 'x'; queueNotify(q, out); log('cancel ' + tk.tok, '-'); return { ok: true }; }
  if (a === 'bill') {
    const e = needPhone(); if (e) return e;
    const amt = Math.round(Number(b.amount) || 0); if (amt <= 0) return fail('bad_amount', 'Send the amount in rupees.');
    const mode = ['cash', 'upi', 'card'].includes(String(b.mode || '').toLowerCase()) ? String(b.mode).toLowerCase() : 'cash';
    let url = /^https:\/\//.test(b.invoice_url || '') ? String(b.invoice_url) : '';
    let no = String(b.bill_no || '').slice(0, 30);
    if (!url) { // make our own GST invoice page from their items
      if (!mem.vis) mem.vis = {}; const l = mem.vis[todayStr] || (mem.vis[todayStr] = []);
      const tk = findTk(); let v = tk ? l.find(x => x.k === tk.key) : null;
      if (!v) { v = { k: tk ? tk.key : rid(10), tok: tk ? tk.tok : '', name: name || (tk && tk.name) || 'Patient', ph, tin: now.toISO(), in: now.toISO(), out: now.toISO(), fee: null, m: null, fupSug: 0, prob: '', ext: true }; l.push(v); }
      const items = Array.isArray(b.items) && b.items.length ? b.items.map(x => ({ n: x.name || x.n, p: x.amount != null ? x.amount : x.p, g: x.gst || x.g || 0 })) : [{ n: 'Consultation', p: amt, g: 0 }];
      const tot = items.reduce((s0, x) => s0 + (Math.round(Number(x.p)) || 0), 0);
      v8bill(v, items, mode, Math.max(0, tot - amt), 'Software', false, []);
      url = (S.appUrl || 'https://clinic.okaybridge.com/') + '?inv=' + todayStr + '.' + v.k + '.' + v.ik; no = no || invNo(v);
    }
    const r = reach('bill'); const lg = langOf(ph, '');
    if (r === 'whatsapp') out.push(ctaTo(ph, lg === 'en' ? `🧾 *Payment received, thank you!*\n\n${name ? 'Dear ' + name + ', ' : ''}${rupees(amt)} received by ${v8mode(mode)}.${no ? `\n\n*Bill no:* ${no}` : ''}` : `🧾 *Payment mil gaya, dhanyavaad!*\n\n${name ? name + ' ji, ' : ''}${rupees(amt)} ${v8mode(mode)} se mil gaye.${no ? `\n\n*Bill no:* ${no}` : ''}`, lg === 'en' ? 'View bill' : 'Bill dekhein', url));
    else if (r === 'template') out.push(templateTo(ph, S.templates.bill, [name || 'there', rupees(amt), no || '-', C], []));
    log('bill ' + rupees(amt), r);
    return { ok: true, invoice_url: url, bill_no: no, whatsapp: r };
  }
  if (a === 'rx') {
    const e = needPhone(); if (e) return e;
    let url = /^https:\/\//.test(b.pdf_url || '') ? String(b.pdf_url) : '';
    if (!url) {
      const meds = (Array.isArray(b.medicines) ? b.medicines : []).slice(0, 15).map(m => ({ n: String(m.name || m.n || '').slice(0, 80), how: String(m.how || m.dose || '').slice(0, 120) })).filter(m => m.n);
      if (!meds.length) return fail('no_rx', 'Send pdf_url, or a medicines list.');
      const pk = patKey(ph, name); const rec = { id: rid(8), date: todayStr, doc: 'd0', finding: String(b.diagnosis || '').slice(0, 160), meds, advice: String(b.advice || '').slice(0, 400), vitals: {}, tests: [], follow: /^\d{4}-\d{2}-\d{2}$/.test(b.follow_up || '') ? b.follow_up : null, src: 'software' };
      if (!mem.rx) mem.rx = {}; mem.rx[pk] = (mem.rx[pk] || []).concat([rec]).slice(-30);
      if (rec.follow) { mem.fup = (mem.fup || []).concat([{ k: rec.id, ph, name: name || 'Patient', date: rec.follow, sent: false }]); }
      url = `${APP}?v=p&k=${rec.id}.${sha256(pk + rec.id).slice(0, 10)}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(b.follow_up || '')) mem.fup = (mem.fup || []).concat([{ k: rid(8), ph, name: name || 'Patient', date: b.follow_up, sent: false }]);
    const r = reach('rx'); const lg = langOf(ph, '');
    if (r === 'whatsapp') out.push(ctaTo(ph, lg === 'en' ? `💊 *Your prescription from ${D} is ready.*\n\nTap below to see your medicines and how to take them.` : `💊 *${D} ki parchi taiyaar hai.*\n\nDawai aur lene ka tareeka dekhne ke liye neeche tap karein.`, lg === 'en' ? 'View prescription' : 'Parchi dekhein', url));
    else if (r === 'template') out.push(templateTo(ph, S.templates.rx, [name || 'there', D], []));
    log('rx', r);
    return { ok: true, url, whatsapp: r };
  }
  if (a === 'appointment') {
    const e = needPhone(); if (e) return e;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !/^\d{2}:\d{2}$/.test(b.time || '')) return fail('bad_time', 'Send date as YYYY-MM-DD and time as HH:MM (24 hour).');
    const tm = Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3, 5));
    const pk = patKey(ph, name); const ap = { id: 'a' + rid(8), date: b.date, time: tm, pid: pk, name: name || 'Patient', phone: ph, src: 'Software', by: 'Software', at: now.toISO(), extRef: b.ref ? String(b.ref).slice(0, 40) : '' };
    mem.appts = (mem.appts || []).filter(x => x.date >= todayStr && !(ap.extRef && x.extRef === ap.extRef)).concat([ap]).slice(-500);
    const when = DateTime.fromISO(b.date).toFormat('ccc d LLL') + ', ' + DateTime.fromFormat(b.time, 'HH:mm').toFormat('h:mm a');
    const r = reach('appt'); const lg = langOf(ph, '');
    if (r === 'whatsapp') out.push(textTo(ph, lg === 'en' ? `📅 *Appointment confirmed*\n\n${name ? 'Dear ' + name + ', y' : 'Y'}our visit with ${D} is on *${when}*.\n📍 ${C}${S.address ? ', ' + S.address : ''}\n\nWe will remind you a day before. Reply *NEW* to change the time.` : `📅 *Appointment pakka*\n\n${name ? name + ' ji, a' : 'A'}apka ${D} ke saath appointment *${when}* ko hai.\n📍 ${C}${S.address ? ', ' + S.address : ''}\n\nEk din pehle hum yaad dila denge. Time badalna ho toh *NEW* likhiye.`));
    else if (r === 'template') out.push(templateTo(ph, S.templates.appt, [name || 'there', D, when, C], []));
    log('appointment ' + when, r);
    return { ok: true, id: ap.id, whatsapp: r };
  }
  if (a === 'doctor') {
    const st = { in: 'in', late: 'late', away: 'away', leave: 'leave' }[String(b.status || '')]; if (!st) return fail('bad_status', 'status must be in, late, away or leave.');
    const told = setDoc(st, Number(b.minutes) || 0, out); log('doctor ' + st, 'whatsapp');
    return { ok: true, told: told || 0 };
  }
  if (a === 'missed_call') { // their phone system can report a missed call; we send the booking WhatsApp
    const e = needPhone(); if (e) return e;
    if (!mem.mcalls) mem.mcalls = []; mem.mcalls.push({ ph, at: now.toISO(), src: 'software' }); mem.mcalls = mem.mcalls.slice(-500);
    log('missed call', reach('missed'));
    return { ok: true, note: 'Saved. The WhatsApp goes from the missed-call flow when the patient can be reached.' };
  }
  return fail('unknown', 'Unknown action. Use ext_ping, ext_token, ext_call, ext_done, ext_cancel, ext_bill, ext_rx, ext_appointment, ext_doctor, ext_status, ext_missed_call.');
}

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
  if (String(b.action || '').startsWith('ext_')) {
    try { res = extApi(b, out); } catch (e) { res = { ok: false, code: 'server', error: 'Something went wrong on our side.' }; }
  } else if (b.action === 'track') {
    const q = qRead(); const tk = q.list.find(x => x.key === b.k);
    if (!tk) res = { ok: false, gone: true, clinic };
    else { if (b.cancel && tk.st === 'w') { qWrite(); tk.st = 'x'; }
      const n = aheadOf(q, tk); const cf8 = mem.cfg || {}; res = { ok: true, line: waitingOf(q).slice(0, 12).map(x => x.tok), me1: String(tk.name || '').split(' ')[0].slice(0, 20), brand: { color: cf8.color || '#8A6A1F', logo: cf8.logo || String(C)[0], phone: (cf8.biz || {}).phone || S.clinicPhone || '', address: S.address || '' }, tok: tk.tok, st: tk.st, ahead: tk.st === 'w' ? n : 0, eta: tk.st === 'w' ? etaText(q, n, 'hl') : '', now: (servingOf(q) || {}).tok || null, missed: tk.missed || 0, clinic, doc: Object.assign(docInfo(), { line: docLine(langOf(tk.phone, '')) }), lang: langOf(tk.phone, '') }; }
  } else if (b.action === 'inv') {
    const [d0, k0, ik0] = String(b.id || '').split('.'); const v = /^\d{4}-\d{2}-\d{2}$/.test(d0 || '') ? ((mem.vis || {})[d0] || []).find(x => x.k === k0) : null;
    if (!v || !v.ik || v.ik !== ik0 || !v.m) res = { ok: false, clinic };
    else {
      const Z = BIZ(); const its = (v.items && v.items.length ? v.items : [{ n: 'Consultation', p: v.fee || 0, g: 0 }]);
      const listTot = its.reduce((a, x) => a + x.p, 0); const disc = Math.max(0, listTot - (v.fee || 0)); let left = disc;
      const lines = its.map((x, i) => { const dsc = i === its.length - 1 ? left : Math.round(disc * x.p / (listTot || 1)); left -= dsc; const amt = x.p - dsc; const g = Z.gstin ? (x.g == null ? gstGuess(x.n) : x.g) : 0; const tv = Math.round(amt * 10000 / (100 + g)) / 100; const tax = Math.round((amt - tv) * 100) / 100;
        return { n: x.n, sac: '999312', q: 1, rate: x.p, disc: dsc, taxable: tv, g, cgst: Math.round(tax * 50) / 100, sgst: Math.round((tax - Math.round(tax * 50) / 100) * 100) / 100, amt }; });
      const taxable = lines.reduce((a, x) => a + x.taxable, 0), cg = lines.reduce((a, x) => a + x.cgst, 0), sg = lines.reduce((a, x) => a + x.sgst, 0);
      const anyTax = lines.some(x => x.g > 0);
      res = { ok: true, clinic, biz: Z, kind: Z.gstin ? (anyTax ? 'TAX INVOICE' : 'BILL OF SUPPLY') : 'INVOICE', no: invNo(v), date: DateTime.fromISO(d0).toFormat('dd LLL yyyy'), time: v.at ? DateTime.fromISO(v.at).setZone(TZ).toFormat('h:mm a') : '',
        patient: { name: v.name || 'Patient', phone: v.ph ? '+' + v.ph.slice(0, 2) + ' ' + v.ph.slice(2, 7) + ' ' + v.ph.slice(7) : '', uhid: uhidOf(v), visit: 'OPD · token ' + String(v.tok || '').replace('-', '') },
        doctor: D, lines, sub: listTot, disc, taxable: Math.round(taxable * 100) / 100, cgst: Math.round(cg * 100) / 100, sgst: Math.round(sg * 100) / 100, total: v.fee || 0, words: 'Rupees ' + inWords(v.fee || 0) + ' Only',
        m: v.m, by: v.by || '', paidAt: v.at ? DateTime.fromISO(v.at).setZone(TZ).toFormat('dd LLL yyyy, h:mm a') : '', revised: !!v.edited,
        note: Z.gstin ? (anyTax ? 'Healthcare services are exempt from GST (Notification 12/2017-Central Tax (Rate), Sl. No. 74). Cosmetic services are taxable at the rate shown.' : 'Healthcare services exempt from GST under Notification 12/2017-Central Tax (Rate), Sl. No. 74.') : '' };
    }
  } else if (b.action === 'mc_log') {
    if (S.hookKey && b.key === S.hookKey && digits(b.phone || '')) { if (!mem.mcalls) mem.mcalls = []; mem.mcalls = mem.mcalls.filter(x => x.at > now.minus({ days: 3 }).toISO()).concat([{ ph: digits(b.phone), at: now.toISO(), night: b.night === true || b.night === 'true' }]).slice(-200); bump('mcalls'); ev(b.phone, 'call', 'Called · nobody picked up'); const mcRich = (b.send === true || b.send === 'true') && inWindow(digits(b.phone)); if (mcRich) out.push(missedCallMsg(digits(b.phone))); if (b.sent !== false && b.sent !== 'false') ev(b.phone, 'bot', 'Bot sent a WhatsApp reply'); res = { ok: true, handled: !!mcRich }; }
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
    if (String(b.action || '').startsWith('v8_') && b.rq && (mem.rq || []).includes(String(b.rq))) { res.dup = true; }
    else if (String(b.action || '').startsWith('v8_')) { try { if (b.rq) mem.rq = (mem.rq || []).concat([String(b.rq).slice(0, 24)]).slice(-300); v8act(b, sess, role, isDoc, out, res); } catch (e) { res.error = 'Something went wrong. Please try again.'; res.v8err = String(e && e.stack || e).slice(0, 400); } }
    else if (['call_next', 'finish', 'call_now'].includes(b.action) && role === 'reception' && callBy === 'doctor' && b.action !== 'finish') { res.error = 'The doctor calls the next patient in this clinic.'; }
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
      if (full && inWindow(full)) out.push(tokenMsg(q, tk, full)); res.added = tk.tok; res.slip = APP + '?v=slip&k=' + tk.key; res.sent = !!(full && inWindow(full)); }
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
        const was = v.m ? { fee: v.fee || 0, m: v.m } : null;
        v.m = ['cash', 'upi', 'free'].includes(b.m) ? b.m : 'cash';
        v.fee = v.m === 'free' ? 0 : Math.max(0, Math.min(500000, Math.round(Number(b.fee) || 0)));
        if (Array.isArray(b.items)) { const BL = billList(); v.items = b.items.map(n => BL.find(x => x.n === n)).filter(Boolean).map(x => ({ n: x.n, p: x.p, g: x.g || 0 })).slice(0, 8); }
        { const rc = (mem.rc || {})[v.ph]; if (rc && rc.back === day && !rc.paid && v.fee) { rc.paid = v.fee; bump('recallMoney', v.fee); } }
        if (was && (was.fee !== v.fee || was.m !== v.m)) { v.edited = (v.edited || 0) + 1; mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by: sess.name, day, k: v.k, inv: v.inv || 0, name: v.name, from: was, to: { fee: v.fee, m: v.m } }]).slice(-400); }
        if (!v.inv) { mem.invSeq = (mem.invSeq || 0) + 1; v.inv = mem.invSeq; v.ik = sha256(v.k + now.toISO() + Math.random()).slice(0, 12); }
        if (!was) { v.by = sess.name; v.at = now.toISO(); } else { v.eby = sess.name; v.eat = now.toISO(); }
        const invUrl = (S.appUrl || 'https://clinic.okaybridge.com/') + '?inv=' + day + '.' + v.k + '.' + v.ik; res.inv = { no: String(v.inv).padStart(4, '0'), url: invUrl };
        if (v.ph && v.m !== 'free' && inWindow(v.ph)) { out.push(ctaTo(v.ph, (langOf(v.ph, '') === 'en' ? `🧾 *Payment received${was ? ' (revised bill)' : ''}, thank you!*\n\nDear ${v.name}, thank you for visiting ${C} today. We wish you a speedy recovery. 💙\n\n🧾 *Invoice no:* ${invNo(v)}\n📅 *Date:* ${now.toFormat('d LLL yyyy')}\n💳 *Amount paid:* ₹${Number(v.fee).toLocaleString('en-IN')} (${v.m === 'upi' ? 'UPI' : 'Cash'})\n\nYour invoice is ready. Tap below to view or download it anytime.` : `🧾 *Payment mil gaya hai${was ? ' (badla hua bill)' : ''}, shukriya!*\n\n${v.name} ji, aaj ${C} aane ke liye shukriya. Aap jaldi swasth ho jaayein. 💙\n\n🧾 *Invoice no:* ${invNo(v)}\n📅 *Date:* ${now.toFormat('d LLL yyyy')}\n💳 *Amount:* ₹${Number(v.fee).toLocaleString('en-IN')} (${v.m === 'upi' ? 'UPI' : 'Cash'})\n\nAapka invoice taiyaar hai. Neeche dabakar kabhi bhi dekh ya download kar sakte hain.`), langOf(v.ph, '') === 'en' ? 'View invoice' : 'Invoice dekhein', invUrl)); v.sent = now.toISO(); res.inv.sent = true; }
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
    else if (b.action === 'set_bill' && isDoc) { const L = (Array.isArray(b.bill) ? b.bill : []).map(x => ({ n: String(x.n || '').trim().slice(0, 40), p: Math.max(0, Math.min(500000, Math.round(Number(x.p) || 0))), g: [0, 5, 12, 18].includes(Number(x.g)) ? Number(x.g) : 0 })).filter(x => x.n).slice(0, 20); if (!mem.cfg) mem.cfg = {}; mem.cfg.bill = L; }
    else if (b.action === 'set_biz' && isDoc) { const z = b.biz || {}; const g = String(z.gstin || '').toUpperCase().replace(/\s/g, '');
      if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) res.error = 'GSTIN should be 15 characters, like 09ABCDE1234F1Z5.';
      else { if (!mem.cfg) mem.cfg = {}; mem.cfg.biz = { legal: String(z.legal || '').slice(0, 80), address: String(z.address || '').slice(0, 200), phone: String(z.phone || '').slice(0, 20), email: String(z.email || '').slice(0, 60), gstin: g, reg: String(z.reg || '').slice(0, 60), state: String(z.state || '').slice(0, 30), prefix: String(z.prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || BIZ().prefix }; res.saved = true; } }
    else if (b.action === 'set_docp' && isDoc) { const z = b.docp || {}; if (!mem.cfg) mem.cfg = {}; mem.cfg.docp = { qual: String(z.qual || '').slice(0, 80), yrs: String(z.yrs || '').replace(/\D/g, '').slice(0, 2), langs: String(z.langs || '').slice(0, 60), about: String(z.about || '').slice(0, 200) }; res.saved = true; }
    else if (b.action === 'set_review' && isDoc) { const u = String(b.url || '').trim(); if (u && !/^https:\/\/(g\.page|maps\.app\.goo\.gl|goo\.gl|www\.google\.|search\.google\.|g\.co)/.test(u)) res.error = 'Paste the review link from your Google Business Profile.'; else { if (!mem.cfg) mem.cfg = {}; mem.cfg.googleReview = u; } }
    else if (b.action === 'backup_now' && role === 'owner') { res.backup = true; mem.bkAt = now.toISO(); }
    else if (b.action === 'download' && role === 'owner') { res.dump = JSON.stringify(memSafe()); }
    else if (b.action === 'cb_try') { const ph = digits(b.phone); const cb = (mem.callbacks || []).find(x => x.phone === ph); if (cb) { cb.tries = (cb.tries || 0) + 1; cb.tryAt = now.toISO(); cb.by = sess.name; ev(ph, 'try', 'Called by ' + sess.name); } }
    else if (b.action === 'cb_noans') { const ph = digits(b.phone); const cb = (mem.callbacks || []).find(x => x.phone === ph); if (cb) { cb.noans = (cb.noans || 0) + 1; cb.tryAt = null; ev(ph, 'noans', 'No answer · ' + sess.name + ' will try again'); } }
    else if (b.action === 'cb_done') { const ph = digits(b.phone); if ((mem.callbacks || []).some(x => x.phone === ph)) { ev(ph, 'done', 'Talked · called back by ' + sess.name); const lg0 = (mem.cbLog || []).filter(x => x.ph === ph && !x.done).pop(); if (lg0) { lg0.done = now.toISO(); lg0.by = sess.name; lg0.reason = ((mem.callbacks || []).find(x => x.phone === ph) || {}).reason || ''; } } mem.callbacks = (mem.callbacks || []).filter(x => x.phone !== ph); }
    // the state every screen needs
    const q = qRead();
    const cur = servingOf(q);
    res.me = { name: sess.name, role };
    res.clinic = clinic; res.doc = docInfo();
    res.queue = { now: cur ? { tok: cur.tok, name: cur.name, src: cur.src, key: cur.key, phone: isDoc ? '' : mask(cur.phone), since: DateTime.fromISO(cur.calledAt).setZone(TZ).toFormat('h:mm a') } : null,
      waiting: waitingOf(q).slice(0, 25).map(x => ({ tok: x.tok, name: x.name, src: x.src, bookAt: x.bookAt || '', key: x.key, missed: x.missed || 0, ahead: aheadOf(q, x), told2: !!x.told2, phone: isDoc ? '' : mask(x.phone), here: !!x.here })),
      done: q.list.filter(x => x.st === 'd').length, avg: avgMin(q), open: isOpenNow() };
    res.links = { tv: S.tvKey ? `${APP}?v=tv&k=${S.tvKey}` : '', qr, poster: `${APP}?v=qr&n=${S.botNumber || ''}&c=${encodeURIComponent(C)}` };
    res.fee = S.fee || 0; res.upi = S.upiId ? { id: S.upiId, name: S.upiName || C } : null; res.bill = billList(); if (isDoc) { res.biz = BIZ(); res.docp = (mem.cfg || {}).docp || {}; } res.dayClosed = !!(mem.close || {})[todayStr]; res.review = (mem.cfg || {}).googleReview || ''; res.bkAt = mem.bkAt ? DateTime.fromISO(mem.bkAt).setZone(TZ).toFormat('d LLL, h:mm a') : '';
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
      const fmt2 = r => r.split('-').map(f).join(' – '); const over = rg.length && hm >= rg[rg.length - 1].split('-')[1].trim();
      res.opd = !rg.length ? { label: 'No OPD today', time: '' } : over ? { label: 'OPD over for today', time: '' } : rg.length === 1 ? { label: 'OPD today', time: fmt2(cur) } : { label: (+cur.split('-')[0].slice(0, 2) < 14 ? 'Morning OPD' : 'Evening OPD'), time: fmt2(cur) }; }      // tell reception on WhatsApp once if a call back waits 30+ min (only reaches staff who messaged the bot in the last 24 h)
      for (const cb of (mem.callbacks || [])) if (!cb.pinged && cb.at < now.minus({ minutes: 30 }).toISO() && isOpenNow()) { cb.pinged = now.toISO(); for (const st of (S.staff || []).filter(x => x.role === 'reception' && inWindow(x.phone))) out.push(textTo(st.phone, '⏰ Call back pending 30+ min: ' + ((mem.pname || {})[cb.phone] || cb.name || '+' + cb.phone) + (cb.reason ? ' — "' + cb.reason + '"' : '') + '\nCall: +' + cb.phone)); }
    if (b.view === 'report' && isDoc) {
      const RANGES = { today: [0, 0], yday: [1, 1], d7: [6, 0], month: null, lmonth: null };
      const rg = RANGES.hasOwnProperty(b.range) ? b.range : 'today'; let from, to;
      if (rg === 'month') { from = now.startOf('month'); to = now; } else if (rg === 'lmonth') { from = now.minus({ months: 1 }).startOf('month'); to = now.minus({ months: 1 }).endOf('month'); } else { from = now.minus({ days: RANGES[rg][0] }); to = now.minus({ days: RANGES[rg][1] }); }
      const F = from.toFormat('yyyy-MM-dd'), Tt = to.toFormat('yyyy-MM-dd'), FI = from.startOf('day').toISO(), TI = to.endOf('day').toISO();
      const label = { today: 'Today', yday: 'Yesterday', d7: 'Last 7 days', month: now.toFormat('LLLL yyyy'), lmonth: now.minus({ months: 1 }).toFormat('LLLL yyyy') }[rg];
      const R0 = regSum(F, Tt), V = R0.V; const pk = v => patKey(v.ph, v.name); const dOf = v => DateTime.fromISO(v.in || v.at).setZone(TZ);
      const R = n => Math.round(n); const fmtD = d => DateTime.fromISO(d).toFormat('dd LLL'); const ph = x => x ? '+' + x.slice(0, 2) + ' ' + x.slice(2, 7) + ' ' + x.slice(7) : '';
      const firstSeen = {}; for (const d of Object.keys(mem.vis || {}).sort()) for (const v of mem.vis[d]) if (!firstSeen[pk(v)]) firstSeen[pk(v)] = d;
      const days = []; for (let d = from.startOf('day'); d <= to.startOf('day'); d = d.plus({ days: 1 })) days.push(d.toFormat('yyyy-MM-dd'));
      const invUrl = v => v.ik ? APP + '?inv=' + dOf(v).toFormat('yyyy-MM-dd') + '.' + v.k + '.' + v.ik : '';
      const edits = (mem.edits || []).filter(x => x.at >= FI && x.at <= TI); const nob = V.filter(v => !v.m && v.out);
      const cbs = (mem.cbLog || []).filter(x => x.at >= FI && x.at <= TI);
      const list = [
        { g: 'Collections', id: 'daybook', t: 'Day book', d: 'Daily collection by cash and UPI, with the cash count' },
        { g: 'Collections', id: 'invoices', t: 'Invoice register', d: 'Every invoice issued, with revised ones marked' },
        { g: 'Collections', id: 'services', t: 'Income by service', d: 'Which services bring in the money' },
        { g: 'Collections', id: 'staff', t: 'Collection by staff', d: 'Who received how much' },
        { g: 'Patients', id: 'opd', t: 'OPD register', d: 'Every patient seen, new or returning' },
        { g: 'Patients', id: 'followup', t: 'Follow-up report', d: 'Follow-ups due, came, or still pending' },
        { g: 'Patients', id: 'source', t: 'Referral source', d: 'How new patients heard about the clinic' },
        { g: 'Patients', id: 'feedback', t: 'Patient feedback', d: 'Ratings and comments after visits' },
        { g: 'Front desk', id: 'calls', t: 'Calls & call backs', d: 'Call back requests, reasons and response time' },
        { g: 'Audit', id: 'audit', t: 'Revised invoices', d: 'Invoices changed after they were issued', n: edits.length },
        { g: 'Audit', id: 'nobill', t: 'Visits without invoice', d: 'Patients seen but not billed', n: nob.length },
      ];
      const out2 = { range: rg, label, from: F, to: Tt, list, kpi: { money: R0.money, seen: R0.seen, inv: V.filter(v => v.m && v.m !== 'free').length, avg: V.filter(v => v.fee).length ? R(R0.money / V.filter(v => v.fee).length) : 0, cash: R0.cash, upi: R0.upi } };
      const id = String(b.rid || '');
      let rep0 = null;
      if (id === 'daybook') { const rows = days.slice().reverse().map(d => { const r = regSum(d, d); const c = (mem.close || {})[d]; const diff = c ? (c.cash - r.cash) + (c.upi - r.upi) : null; return [fmtD(d), r.seen, r.V.filter(v => v.m && v.m !== 'free').length, r.cash, r.upi, r.free, r.money, c ? c.cash + c.upi : '—', diff == null ? 'Not counted' : diff === 0 ? 'Matched' : (diff < 0 ? 'Short ' : 'Extra ') + rupees(Math.abs(diff))]; }).filter(r => r[1] || r[7] !== '—');
        rep0 = { cols: ['Date', 'Patients', 'Invoices', 'Cash ₹', 'UPI ₹', 'Free', 'Total ₹', 'Counted ₹', 'Cash check'], money: [3, 4, 6, 7], rows, total: ['Total', R0.seen, out2.kpi.inv, R0.cash, R0.upi, R0.free, R0.money, '', ''] }; }
      if (id === 'invoices') { const rows = V.filter(v => v.m).slice().reverse().map(v => [invNo(v), dOf(v).toFormat('dd LLL, h:mm a'), v.name, uhidOf(v), (v.items && v.items.length ? v.items.map(i => i.n).join(', ') : 'Consultation'), v.m === 'upi' ? 'UPI' : v.m === 'free' ? 'Free' : 'Cash', v.fee || 0, v.edited ? 'Revised' : 'Issued', { link: invUrl(v) }]);
        rep0 = { cols: ['Invoice no.', 'Date', 'Patient', 'UHID', 'Items', 'Mode', 'Amount ₹', 'Status', ''], money: [6], rows, total: ['Total', '', rows.length + ' invoices', '', '', '', R0.money, '', ''] }; }
      if (id === 'services') { const E = {}; for (const v of V) { if (!v.fee || v.m === 'free') continue; const its = v.items && v.items.length ? v.items : [{ n: 'Consultation', p: v.fee }]; const tot = its.reduce((a, x) => a + x.p, 0) || 1; for (const it of its) { const k = it.n; if (!E[k]) E[k] = { n: 0, m: 0 }; E[k].n++; E[k].m += v.fee * it.p / tot; } }
        const rows = Object.entries(E).sort((a, c) => c[1].m - a[1].m).map(([k, x]) => [k, x.n, R(x.m), R0.money ? Math.round(x.m / R0.money * 1000) / 10 + '%' : '—']);
        rep0 = { cols: ['Service', 'Times', 'Amount ₹', 'Share'], money: [2], rows, total: ['Total', rows.reduce((a, r) => a + r[1], 0), R0.money, '100%'] }; }
      if (id === 'staff') { const E = {}; for (const v of V) { if (!v.m) continue; const k = v.by || '—'; if (!E[k]) E[k] = { n: 0, c: 0, u: 0, f: 0 }; E[k].n++; if (v.m === 'cash') E[k].c += v.fee || 0; else if (v.m === 'upi') E[k].u += v.fee || 0; else E[k].f++; }
        const rows = Object.entries(E).map(([k, x]) => [k, x.n, x.c, x.u, x.f, x.c + x.u]);
        rep0 = { cols: ['Received by', 'Invoices', 'Cash ₹', 'UPI ₹', 'Free', 'Total ₹'], money: [2, 3, 5], rows, total: ['Total', rows.reduce((a, r) => a + r[1], 0), R0.cash, R0.upi, R0.free, R0.money] }; }
      if (id === 'opd') { const rows = V.slice().reverse().map(v => [dOf(v).toFormat('dd LLL'), String(v.tok || '').replace('-', ''), v.name, ph(v.ph), firstSeen[pk(v)] >= dOf(v).toFormat('yyyy-MM-dd') ? 'New' : 'Revisit', (v.prob || '').replace(/"/g, ''), v.m ? (v.m === 'free' ? 'Free' : v.fee) : 'Not billed', { pk: pk(v) }]);
        const nw = V.filter(v => firstSeen[pk(v)] >= dOf(v).toFormat('yyyy-MM-dd')).length;
        rep0 = { cols: ['Date', 'Token', 'Patient', 'Phone', 'Type', 'Complaint', 'Bill ₹', ''], money: [6], rows, total: ['Total', '', rows.length + ' visits', '', nw + ' new · ' + (rows.length - nw) + ' revisit', '', R0.money, ''] }; }
      if (id === 'followup') { const VA = []; for (const d of Object.keys(mem.vis || {}).sort()) for (const v of mem.vis[d]) VA.push({ d, v });
        const rows = VA.filter(x => x.v.fup && x.v.fup >= F && x.v.fup <= Tt).map(x => { const came = VA.find(y => y.d > x.d && y.d >= DateTime.fromISO(x.v.fup).minus({ days: 3 }).toFormat('yyyy-MM-dd') && pk(y.v) === pk(x.v)); const rc = (mem.rc || {})[x.v.ph];
          return [x.v.name, ph(x.v.ph), fmtD(x.d), fmtD(x.v.fup), came ? 'Came ' + fmtD(came.d) : x.v.fup < todayStr ? 'Overdue' : 'Due', rc && rc.fup === x.v.fup ? rc.n : 0, { pk: pk(x.v) }]; });
        rep0 = { cols: ['Patient', 'Phone', 'Last visit', 'Due on', 'Status', 'Reminders', ''], rows, total: ['Total', '', '', rows.length + ' due', rows.filter(r => r[4].startsWith('Came')).length + ' came', '', ''] }; }
      if (id === 'source') { const E = {}; for (const d of days) for (const [k, n] of Object.entries((mem.st || {})[d] || {})) if (k.startsWith('src_')) E[k.slice(4)] = (E[k.slice(4)] || 0) + n; const tot = Object.values(E).reduce((a, c) => a + c, 0);
        const rows = Object.entries(E).sort((a, c) => c[1] - a[1]).map(([k, n]) => [SRC[k] || k, n, tot ? Math.round(n / tot * 100) + '%' : '—']);
        rep0 = { cols: ['Source', 'New patients', 'Share'], rows, total: ['Total', tot, tot ? '100%' : ''] }; }
      if (id === 'feedback') { const rows = (mem.fb || []).filter(f => f.at >= FI && f.at <= TI).reverse().map(f => [DateTime.fromISO(f.at).setZone(TZ).toFormat('dd LLL'), f.name || ph(f.ph), f.r >= 4 ? 'Excellent' : f.r >= 3 ? 'Good' : 'Needs improvement', f.t || '']);
        const T0 = {}; for (const d of days) for (const [k, n] of Object.entries((mem.st || {})[d] || {})) T0[k] = (T0[k] || 0) + n;
        rep0 = { cols: ['Date', 'Patient', 'Rating', 'Comment'], rows, total: ['Ratings', (T0.rvGood || 0) + ' excellent', (T0.rvMid || 0) + ' good · ' + (T0.rvLow || 0) + ' needs improvement', ''] }; }
      if (id === 'calls') { const nm = x => (mem.pname || {})[x] || ph(x); const pend = (mem.callbacks || []).filter(x => x.at >= FI && x.at <= TI);
        const mins = (a, c) => Math.max(0, Math.round(DateTime.fromISO(c).diff(DateTime.fromISO(a), 'minutes').minutes)); const dur = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
        const rows = cbs.slice().sort((x, y) => y.at.localeCompare(x.at)).map(x => { const p0 = pend.find(c => c.phone === x.ph && !x.done); return [DateTime.fromISO(x.at).setZone(TZ).toFormat('dd LLL, h:mm a'), nm(x.ph), x.reason || (p0 && p0.reason) || '—', x.done ? 'Called' : p0 && p0.noans ? 'No answer ×' + p0.noans : 'Pending', x.done ? x.by : '—', x.done ? dur(mins(x.at, x.done)) : dur(mins(x.at, now.toISO())) + ' so far']; });
        const T0 = {}; for (const d of days) for (const [k, n] of Object.entries((mem.st || {})[d] || {})) T0[k] = (T0[k] || 0) + n;
        rep0 = { cols: ['Requested', 'Patient', 'Reason', 'Status', 'Called by', 'Response time'], rows, total: ['Total', rows.length + ' requests', (T0.mcalls || 0) + ' missed calls', rows.filter(r => r[3] === 'Called').length + ' called', '', ''] }; }
      if (id === 'audit') { const rows = edits.slice().reverse().map(x => [DateTime.fromISO(x.at).setZone(TZ).toFormat('dd LLL, h:mm a'), x.inv ? BIZ().prefix + '/' + fyOf(x.day) + '/' + String(x.inv).padStart(4, '0') : '—', x.name, x.by, rupees(x.from.fee) + ' ' + x.from.m, rupees(x.to.fee) + ' ' + x.to.m, x.to.fee - x.from.fee]);
        rep0 = { cols: ['Changed on', 'Invoice no.', 'Patient', 'Changed by', 'Before', 'After', 'Difference ₹'], money: [6], rows, total: ['Total', rows.length + ' revised', '', '', '', '', rows.reduce((a, r) => a + r[6], 0)] }; }
      if (id === 'nobill') { const rows = nob.slice().reverse().map(v => [dOf(v).toFormat('dd LLL'), String(v.tok || '').replace('-', ''), v.name, ph(v.ph), v.out ? DateTime.fromISO(v.out).setZone(TZ).toFormat('h:mm a') : '—', { pk: pk(v) }]);
        rep0 = { cols: ['Date', 'Token', 'Patient', 'Phone', 'Seen at', ''], rows, total: ['Total', '', rows.length + ' visits', '', '', ''] }; }
      if (rep0) { const meta = list.find(x => x.id === id); rep0.id = id; rep0.t = meta.t; rep0.d = meta.d; rep0.rows = rep0.rows.slice(0, 500); out2.rep = rep0; }
      res.report = out2;
    }
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
      res.register.invoices = R.V.filter(v => v.m).slice().reverse().slice(0, 300).map(v => ({ no: invNo(v), at: DateTime.fromISO(v.at || v.in).setZone(TZ).toFormat(per === 'today' ? 'h:mm a' : 'd LLL, h:mm a'), name: v.name, items: v.items && v.items.length ? v.items.map(i => i.n).join(', ') : 'Consultation', m: v.m, fee: v.fee || 0, by: v.by || '', revised: !!v.edited, url: v.ik ? APP + '?inv=' + DateTime.fromISO(v.in || v.at).setZone(TZ).toFormat('yyyy-MM-dd') + '.' + v.k + '.' + v.ik : '' }));
      res.register.edits = (mem.edits || []).filter(x => x.at >= DateTime.fromISO(from, { zone: TZ }).toISO()).reverse().map(x => ({ name: x.name, by: x.by, at: DateTime.fromISO(x.at).setZone(TZ).toFormat('d LLL, h:mm a'), from: x.from, to: x.to }));
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
    {
      const showPh = x => isDoc ? '+' + x.slice(0, 2) + ' ' + x.slice(2, 7) + ' ' + x.slice(7) : mask(x);
      const nmOf = x => (mem.pname || {})[x] || '';
      const bookedAfter = (ph, iso) => rows.some(r => r.phone === ph && active(r) && r.date >= todayStr);
      const tm = iso => { const d = DateTime.fromISO(iso).setZone(TZ); return d.toFormat(d >= now.startOf('day') ? 'h:mm a' : 'd LLL, h:mm a'); };
      const story = ph => ((mem.ev || {})[ph] || []).filter(e => e.at >= now.minus({ days: 2 }).startOf('day').toISO()).map(e => ({ t: tm(e.at), k: e.k, txt: e.t }));
      // WhatsApp: everyone who wrote to the clinic number in the last 2 days
      const wa = Object.keys(mem.ev || {}).map(ph => { const l = (mem.ev[ph] || []).filter(e => e.at >= now.minus({ days: 1 }).startOf('day').toISO()); return { ph, l }; })
        .filter(x => x.l.some(e => ['msg', 'token', 'booked', 'talk', 'cb', 'why', 'recall'].includes(e.k))).map(x => {
          const ks = x.l.map(e => e.k), first = x.l.find(e => e.k === 'msg' || e.k === 'why') || x.l[0], last = x.l[x.l.length - 1];
          const cbw = (mem.callbacks || []).find(c => c.phone === x.ph);
          const out = cbw ? ['Wants a call back', 'bad'] : ks.includes('booked') ? [(x.l.filter(e => e.k === 'booked').pop().t || 'Booked'), 'ok'] : ks.includes('token') ? ['Came · ' + (x.l.filter(e => e.k === 'token').pop().t.split('token ')[1] || 'token'), 'ok'] : ks.includes('done') ? ['Called back', 'ok'] : ['Only asked', 'mid'];
          return { phone: x.ph, name: nmOf(x.ph) || showPh(x.ph), shown: showPh(x.ph), call: '+' + x.ph, at: tm(last.at), day: DateTime.fromISO(last.at).setZone(TZ).toFormat('yyyy-MM-dd') === todayStr ? 'today' : 'yday', said: first.t.replace(/^Messaged: |^Reason: /, ''), out, story: story(x.ph), last: last.at };
        }).sort((x, y) => y.last.localeCompare(x.last)).slice(0, 60);
      res.inbox = {
        wa,
        calls: (mem.mcalls || []).slice(-40).reverse().map(x => ({ phone: x.ph, shown: showPh(x.ph), name: nmOf(x.ph), call: '+' + x.ph, at: tm(x.at), booked: bookedAfter(x.ph, x.at), story: story(x.ph) })),
        live: [],
        callbacks: (mem.callbacks || []).slice(-20).map(x => ({ phone: x.phone, shown: showPh(x.phone), call: '+' + x.phone, name: nmOf(x.phone) || x.name, reason: x.reason || '', tried: !!x.tryAt, noans: x.noans || 0, at: tm(x.at), wait: (m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min')(Math.max(0, Math.round(now.diff(DateTime.fromISO(x.at), 'minutes').minutes))) })),
        wait: Object.keys(mem.wait || {}).filter(d => d >= todayStr).flatMap(d => (mem.wait[d] || []).map(w => ({ phone: w.phone, shown: showPh(w.phone), call: '+' + w.phone, day: DateTime.fromISO(d).toFormat('ccc d LLL') }))),
      };
    }
    if (b.v8) { try { res.v8 = v8state(role, isDoc, sess); const j = JSON.stringify(Object.assign({}, res.v8, { clock: 0 })); let h = 2166136261; for (let i = 0; i < j.length; i++) { h ^= j.charCodeAt(i); h = Math.imul(h, 16777619); } res.v8h = (h >>> 0).toString(36) + j.length.toString(36); if (b.v8h && b.v8h === res.v8h) { delete res.v8; res.v8same = true; } } catch (e) { res.v8err = String(e && e.stack || e).slice(0, 400); } }
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
    `Missed calls: ${calls.length}${calls.length ? ` · ${callsBooked} booked` : ''}\nFollow-ups tomorrow: ${fT}` + (() => { const w = R.V.filter(v => v.tin && v.in).map(v => DateTime.fromISO(v.in).diff(DateTime.fromISO(v.tin), 'minutes').minutes).filter(m => m >= 0 && m < 300); return w.length ? `\nAverage wait: ${Math.round(w.reduce((a, c) => a + c, 0) / w.length)} min` : ''; })();
  const to = [...new Set((S.doctorNumbers || []).concat((S.staff || []).filter(x => x.role === 'owner' || x.role === 'doctor').map(x => x.phone)).map(digits))];
  if (!mem.nightSent) mem.nightSent = '';
  const bkOut = [{ json: { action: 'none', payload: null, more: [], backup, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
  for (const v of reviewAsks()) { if (!inWindow(v.ph)) { if (S.templates && S.templates.review && !(mem.optout || {})[v.ph]) { mem.rv[v.ph] = { at: now.toISO(), r: 0 }; bump('rvAsk'); more.push(templateTo(v.ph, S.templates.review, [v.name || 'there', C], ['RV|5', 'RV|3', 'RV|1'])); } continue; } const lg = langOf(v.ph, ''); mem.rv[v.ph] = { at: now.toISO(), r: 0 }; bump('rvAsk'); more.push(buttonsTo(v.ph, lg === 'en' ? `🌟 *How was your visit today?*\n\nDear ${v.name}, thank you for trusting ${C} with your care. We hope you are feeling better already.\n\nWould you tell us how your visit went? It takes just one tap, and it helps us look after you and every patient better. 🙏` : `🌟 *Aaj aapka anubhav kaisa raha?*\n\n${v.name} ji, apne ilaaj ke liye ${C} par bharosa karne ke liye shukriya. Ummeed hai aap behtar mehsoos kar rahe hain.\n\nKya aap bata sakte hain ki aapka visit kaisa raha? Bas ek tap, aur isse hum aapki aur har patient ki behtar dekhbhaal kar paate hain. 🙏`, reviewBtns(lg))); }
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
if (mode === 'summary' && (now.hour < 12 || (now.hour >= 16 && now.hour < 20))) {
  // 1st of the month, morning: last month's results to the owner and doctors
  if (now.day === 1 && now.hour >= 9 && now.hour < 12 && mem.monthSent !== now.toFormat('yyyy-MM')) {
    const lm = now.minus({ months: 1 }); const f = lm.startOf('month').toFormat('yyyy-MM-dd'), t = lm.endOf('month').toFormat('yyyy-MM-dd');
    const to = [...new Set((S.doctorNumbers || []).concat((S.staff || []).filter(x => x.role === 'owner' || x.role === 'doctor').map(x => x.phone)).map(digits))].filter(Boolean);
    for (const ph of to) { const rep = monthReport(f, t, lm.toFormat('LLLL yyyy'), langOf(ph, ''));
      if (inWindow(ph)) more.push(ctaTo(ph, rep.text, 'Open register', `${APP}`));
      else if (S.templates && S.templates.monthly) more.push(templateTo(ph, S.templates.monthly, [C, lm.toFormat('LLLL yyyy'), rupees(rep.extra), String(rep.T.mcalls || 0), String(rep.T.booked || 0), String(rep.T.recallBack || 0)], [])); }
    mem.monthSent = now.toFormat('yyyy-MM'); }
  // missed calls that came at night: the WhatsApp waits until the 8 AM run (never at night)
  if (now.hour >= 8 && now.hour < 12) { if (!mem.mcMorn) mem.mcMorn = {};
    for (const x of (mem.mcalls || []).filter(x => x.night && !x.done && x.at > now.minus({ hours: 14 }).toISO())) { x.done = true;
      const last = mem.mcMorn[x.ph]; if (last && last > now.minus({ days: 7 }).toISO()) continue;
      if ((mem.callbacks || []).some(c => c.phone === x.ph) || q0Has(x.ph)) continue;
      more.push(inWindow(x.ph) ? missedCallMsg(x.ph) : templateTo(x.ph, S.missedTemplate || 'missed_call_help', [C], ['MC_BOOK', 'MC_Q', 'MC_CALL'])); mem.mcMorn[x.ph] = now.toISO(); ev(x.ph, 'call', 'Night missed call · WhatsApp sent in the morning'); } }
  if (!mem.remSent) mem.remSent = {};
  const stage = now.hour < 12 ? 'today' : 'tomorrow'; const dRem = now.plus({ days: stage === 'today' ? 0 : 1 }).toFormat('yyyy-MM-dd');
  for (const r of rows.filter(x => x.date === dRem && active(x) && x.phone)) {
    const key = `${r.row_number}|${r.date}|${stage}`; if (mem.remSent[key]) continue;
    if (stage === 'today' && at(r.date, r.time) < now.plus({ minutes: 60 })) continue;
    const lg = langOf(r.phone, r.lang); const nm = r.name || (lg === 'en' ? 'there' : 'ji');
    const where = `📍 ${C}${S.address ? ', ' + S.address : ''}`;
    const nmH = r.name ? r.name + ' ji' : 'Namaste'; const nmE = r.name ? 'Hi ' + r.name : 'Hi';
    const body = stage === 'tomorrow'
      ? (lg === 'en' ? `⏰ *See you tomorrow*\n\n${nmE}, a quick reminder of your visit.\n\n*When:* ${whenText(r.date, r.time, 'en')}\n*Doctor:* ${D}\n*Booking ID:* ${bookingId(r)}\n${where}\n\nTap *Confirm* and we'll keep your time ready. Plans changed? Reschedule in one tap.`
        : `⏰ *Kal aapka appointment hai*\n\n${nmH}, bas yaad dila rahe the.\n\n*Kab:* ${whenText(r.date, r.time, 'hl')}\n*Doctor:* ${D}\n*Booking ID:* ${bookingId(r)}\n${where}\n\nAa rahe hain toh *Confirm karein* dabaiye, hum aapka time ready rakhenge. Plan badla ho toh ek tap mein time badal sakte hain.`)
      : (lg === 'en' ? `☀️ *Good morning, your visit is today*\n\n*Time:* ${timeLabel(r.date, r.time, 'en')}\n*Doctor:* ${D}\n${where}\n\nPlease come 10 minutes early and bring old prescriptions or reports. Tap *Confirm* so we know you're coming.`
        : `☀️ *Good morning! Aaj aapka appointment hai*\n\n*Time:* ${timeLabel(r.date, r.time, 'hl')}\n*Doctor:* ${D}\n${where}\n\n10 minute pehle aa jaiye, purani parchi ya report saath le aaiye. Aa rahe hain toh *Confirm karein* dabaiye.`);
    const btns = [[`RC|${r.row_number}`, lg === 'en' ? 'Confirm' : 'Confirm karein'], [`RR|${r.row_number}`, lg === 'en' ? 'Reschedule' : 'Time badlein'], [`RX|${r.row_number}`, lg === 'en' ? 'Cancel' : 'Cancel karein']];
    if (inWindow(r.phone)) more.push(buttonsTo(r.phone, body, btns));
    else if (S.templates && S.templates.reminder) more.push(templateTo(r.phone, S.templates.reminder, [nm, C, DateTime.fromISO(r.date).toFormat('ccc, d LLL'), timeLabel(r.date, r.time, 'en')], btns.map(b => b[0])));
    else continue;
    mem.remSent[key] = now.toISO(); bump('reminders');
  }
  for (const k of Object.keys(mem.remSent)) if (mem.remSent[k] < now.minus({ days: 3 }).toISO()) delete mem.remSent[k];
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
    const msgTxt = lg === 'en' ? `🗓️ *Your follow-up visit is tomorrow*\n\nDear ${f.name},\nthis is a gentle reminder that ${D} would like to see you for your follow-up on *${whenTxt}*. Coming on time helps us check your progress and adjust your treatment if needed. 👩‍⚕️\n\nTap below to book a convenient time, or simply visit the clinic and send *TOKEN*.`
      : `🗓️ *Kal aapka follow-up visit hai*\n\n${f.name} ji,\nyaad dilana chahte hain ki ${D} aapko *${whenTxt}* follow-up ke liye dekhna chahte hain. Samay par aane se doctor aapki progress dekh kar zaroorat ho toh treatment badal sakte hain. 👩‍⚕️\n\nNeeche dabakar apna time book kijiye, ya seedha clinic aakar *TOKEN* bhejiye.`;
    if (inWindow(f.ph)) { more.push(buttonsTo(f.ph, msgTxt, [['NEW', lg === 'en' ? 'Book a time' : 'Time book karein']])); f.sent = true; bump('reminders'); }
    else if (S.templates && S.templates.followup) { more.push(templateTo(f.ph, S.templates.followup, [f.name, D, whenTxt], ['NEW'])); f.sent = true; }
  }
  for (const x of recallsDue()) { const lg = langOf(x.ph, '');
    const t = lg === 'en' ? [`🗓️ *Your follow-up is due*\n\nDear ${x.name},\n${D} had advised a follow-up visit, and it is now due. Completing your follow-up helps your treatment work the way it was planned. 👩‍⚕️\n\nTap below to book a time that suits you.`, `🗓️ *We missed you at your follow-up*\n\nDear ${x.name},\nit has been a week since your follow-up date with ${D}. Stopping treatment midway can sometimes bring the problem back, so a quick check-up is worth it. 💙\n\nTap below to book a time that suits you.`, `💙 *Checking in on you*\n\nDear ${x.name},\nit has been a month since your follow-up was due, and we wanted to know how you are doing. If the problem is still there, ${D} can see you this week.\n\nTap below to book a time that suits you.`][x.st - 1]
      : [`🗓️ *Aapka follow-up due hai*\n\n${x.name} ji,\n${D} ne aapko follow-up ke liye bulaya tha, aur ab uska samay ho gaya hai. Follow-up poora karne se aapka treatment waise hi kaam karta hai jaise plan kiya gaya tha. 👩‍⚕️\n\nNeeche dabakar apna time book kijiye.`, `🗓️ *Aap follow-up par nahi aa paaye*\n\n${x.name} ji,\n${D} ke saath follow-up ki date ko ek hafta ho gaya hai. Treatment beech mein chhodne se kabhi kabhi problem wapas aa jaati hai, isliye ek chhota check-up zaroori hai. 💙\n\nNeeche dabakar apna time book kijiye.`, `💙 *Aapka haal jaanna chahte the*\n\n${x.name} ji,\nfollow-up ki date ko ek mahina ho gaya hai, aur hum jaanna chahte the ki aap kaise hain. Agar problem abhi bhi hai, toh ${D} aapko is hafte dekh sakte hain.\n\nNeeche dabakar apna time book kijiye.`][x.st - 1];
    if (inWindow(x.ph)) more.push(buttonsTo(x.ph, t, [['NEW', lg === 'en' ? 'Book a time' : 'Time book karein']]));
    else if (S.templates && S.templates.followup) more.push(templateTo(x.ph, S.templates.followup, [x.name, D, lg === 'en' ? 'this week' : 'is hafte'], ['NEW']));
    else continue;
    x.r.n = x.st; x.r.at = now.toISO(); bump('recalls'); ev(x.ph, 'recall', 'Reminded about missed follow-up' + (x.st > 1 ? ' (' + (x.st === 2 ? '1 week' : '1 month') + ' late)' : '')); }
  for (const v of reviewAsks()) { if (!inWindow(v.ph)) { if (S.templates && S.templates.review && !(mem.optout || {})[v.ph]) { mem.rv[v.ph] = { at: now.toISO(), r: 0 }; bump('rvAsk'); more.push(templateTo(v.ph, S.templates.review, [v.name || 'there', C], ['RV|5', 'RV|3', 'RV|1'])); } continue; } const lg = langOf(v.ph, ''); mem.rv[v.ph] = { at: now.toISO(), r: 0 }; bump('rvAsk');
    more.push(buttonsTo(v.ph, lg === 'en' ? `🌟 *How was your visit today?*\n\nDear ${v.name}, thank you for trusting ${C} with your care. We hope you are feeling better already.\n\nWould you tell us how your visit went? It takes just one tap, and it helps us look after you and every patient better. 🙏` : `🌟 *Aaj aapka anubhav kaisa raha?*\n\n${v.name} ji, apne ilaaj ke liye ${C} par bharosa karne ke liye shukriya. Ummeed hai aap behtar mehsoos kar rahe hain.\n\nKya aap bata sakte hain ki aapka visit kaisa raha? Bas ek tap, aur isse hum aapki aur har patient ki behtar dekhbhaal kar paate hain. 🙏`, reviewBtns(lg))); }
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
if (!mem.seen[me] || DateTime.fromISO(mem.seen[me]) < now.minus({ hours: 24 })) { { if (!staffOf2(me)) bump('chats'); if (msg.type === 'text' && msg.text) ev(me, 'msg', 'Messaged: "' + String(msg.text).slice(0, 90) + '"'); else if (msg.type !== 'interactive' && msg.type !== 'button') ev(me, 'msg', 'Started a WhatsApp chat'); } }
if (!mem.seen[me] || DateTime.fromISO(mem.seen[me]) < now.minus({ minutes: 20 })) mem.seen[me] = now.toISO();
let id = String(msg.replyId || '').trim();
const raw = String(msg.text || '').trim();
const t = raw.toLowerCase();
const has = words => words.some(w => new RegExp(`(^|\\W)${w}(\\W|$)`, 'i').test(t));
const isAdmin = (S.adminNumbers || []).some(a => same(a, me));
// ---------- lab report / document from clinic staff: forward it to the patient on WhatsApp ----------
// Staff send the PDF or photo to the clinic's bot number with the patient's mobile number in the caption.
if (msg.media && msg.media.id && (staffRec(me) || isAdmin)) {
  const num = raw.replace(/\D/g, ''); const m10 = num.length >= 10 ? num.slice(-10) : '';
  const out0 = t0 => [{ json: { action: 'reply', payload: textTo(me, t0), more: [], holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
  if (!m10) return out0('To send this report to a patient, forward it again with the patient\'s 10-digit mobile number in the caption.\nExample caption: 9876543210');
  const to = '91' + m10; let nm = '';
  for (const d of Object.keys(mem.vis || {}).sort()) for (const v of mem.vis[d]) if (v.ph === to && v.name) nm = v.name;
  if (!nm) { const r0 = rows.filter(r => r.phone === to && r.name).pop(); if (r0) nm = r0.name; }
  const first = String(nm || '').split(' ')[0]; const lg = langOf(to, ''); const en = lg === 'en';
  const inW = inWindow(to); const tpl = S.templates && S.templates.report;
  if ((mem.optout || {})[to]) return out0(`+${to} has asked not to get messages, so the report was not sent. Please hand it over at the clinic.`);
  if (!inW && !tpl) return out0(`Could not send yet: +${to} has not messaged the clinic in the last 24 hours, and the "report ready" template is not approved yet.\nAsk the patient to send "Hi" to this number, then forward the report again.`);
  const caption = en ? `🧾 *Your report is ready${first ? ', ' + first : ''}*\n\nHere is your report from ${C}. ${D} will go through it at your next visit.\nTo book a visit, just reply here.`
    : `🧾 *Aapki report aa gayi hai${first ? ', ' + first + ' ji' : ''}*\n\n${C} se aapki report yeh rahi. ${D} agle visit mein ise dekhenge.\nVisit book karne ke liye yahin reply kijiye.`;
  if (!mem.labs) mem.labs = []; mem.labs = mem.labs.concat([{ to, by: me, at: now.toISO(), name: nm || '' }]).slice(-300); bump('labSent'); ev(to, 'report', 'Report sent on WhatsApp');
  const labfwd = { media: msg.media.id, mime: msg.media.mime || 'application/pdf', filename: msg.media.filename || (msg.media.kind === 'image' ? 'report.jpg' : 'report.pdf'), kind: msg.media.kind || 'document', to, caption, name: first || 'there', clinic: C, template: inW ? null : tpl, tplLang: S.templateLang || 'en' };
  return [{ json: { action: 'reply', payload: textTo(me, `✅ Sending the report to ${nm || 'the patient'} (+${to})${inW ? '' : ' using the report template'}.`), more: [], labfwd, holiday: null, values: null, range: null, sheetId: S.sheetId, phoneNumberId: S.phoneNumberId, notify: false } }];
}
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
const swTxt = msg.type === 'text' ? String(msg.text || '').trim() : '';
const langSwitch = !id && /^(english|in english|hindi|hinglish|हिंदी|हिन्दी)$/i.test(swTxt);
if (langSwitch) mem.lang[me] = /^(english|in english)$/i.test(swTxt) ? 'en' : 'hl';
else if (!mem.lang[me] && !id && swTxt) { const hiW = /[\u0900-\u097F]/.test(swTxt) || /\b(namaste|namaskar|ji|hai|hain|kya|kaise|kaisa|karna|chahiye|mujhe|mera|meri|aap|kab|kitna|kitne|kitni|dikhana|sahab|bhai|bhaiya|haan|nahi|nhi|hu|hoon|kal|aaj)\b/i.test(swTxt);
  const enW = !hiW && swTxt.split(/\s+/).length >= 3 && /\b(i|my|want|need|would|like|appointment|please|can|is|the|book|doctor|what|when|how)\b/i.test(swTxt); mem.lang[me] = /[\u0900-\u097F]/.test(swTxt) ? 'hl' : (S.defaultLang || 'en'); }
if (id.startsWith('MC_') && !mem.lang[me]) mem.lang[me] = S.defaultLang || 'en';
const lang = langOf(me, (mine[0] || {}).lang);
const L = T[lang];
const W = r => whenText(r.date, r.time, lang);
const text = body => textTo(msg.from, body);
const buttons = (body, btns, header, footer) => buttonsTo(msg.from, body, btns, header, footer);
// ---------- advance payment by UPI: QR made from the clinic's own UPI ID, money goes straight to the clinic ----------
const advAmt = () => Number(((mem.cfg || {}).advance != null ? mem.cfg.advance : S.advance) || 0);
const upiOf = () => String((mem.cfg || {}).upiId || S.upiId || '').trim();
function payAsk(bk) {
  const amt = advAmt(), upi = upiOf(); if (!amt || !upi || !bk) return null; const en = lang === 'en';
  const note = 'Advance ' + bookingId(bk);
  const qr = 'https://quickchart.io/qr?size=600&margin=2&text=' + encodeURIComponent(`upi://pay?pa=${upi}&pn=${C}&am=${amt}&cu=INR&tn=${note}`);
  const body = en ? `💳 *Pay ₹${amt} advance to hold your time*\n\nScan this QR with any UPI app (GPay, PhonePe, Paytm), or pay to *${upi}*.\nThe ₹${amt} is adjusted in your bill at the clinic.\n\nAfter paying, tap the button below.`
    : `💳 *₹${amt} advance dekar apna time pakka kijiye*\n\nKisi bhi UPI app (GPay, PhonePe, Paytm) se yeh QR scan kijiye, ya *${upi}* pe pay kijiye.\nYeh ₹${amt} clinic ke bill mein kam ho jayega.\n\nPay karne ke baad neeche button dabaiye.`;
  return buttonsTo(msg.from, body, [[`PAID|${bk.row_number}`, en ? 'I have paid' : 'Maine pay kiya']], { type: 'image', image: { link: qr } });
}
// ---------- festival greetings to all patients (owner/doctor only, max 2 a month) ----------
const GREET = {
  DIWALI: { en: n => `🪔 *Happy Diwali${n ? ', ' + n : ''}!*\n\nWishing you and your family good health, light and happiness this Diwali.\n\nWarm wishes,\n${D}\n${C}`, hl: n => `🪔 *Shubh Deepawali${n ? ', ' + n + ' ji' : ''}!*\n\nAapko aur aapke parivaar ko achhi sehat, roshni aur khushiyon bhari Diwali ki shubhkamnayein.\n\n${D}\n${C}` },
  HOLI: { en: n => `🎨 *Happy Holi${n ? ', ' + n : ''}!*\n\nPlay safe with colours and keep your skin and eyes protected. Wishing you a joyful Holi.\n\n${D}\n${C}`, hl: n => `🎨 *Holi ki shubhkamnayein${n ? ', ' + n + ' ji' : ''}!*\n\nRangon se surakshit kheliye, skin aur aankhon ka dhyan rakhiye. Khushiyon bhari Holi!\n\n${D}\n${C}` },
  NEWYEAR: { en: n => `🎉 *Happy New Year${n ? ', ' + n : ''}!*\n\nThank you for trusting us with your care. Wishing you a healthy year ahead.\n\n${D}\n${C}`, hl: n => `🎉 *Naya saal mubarak${n ? ', ' + n + ' ji' : ''}!*\n\nHum par bharosa karne ke liye dhanyavaad. Aane wala saal sehat se bhara ho.\n\n${D}\n${C}` }
};
function greetList() {
  const staff = new Set((S.staff || []).map(x => digits(x.phone)).concat((S.doctorNumbers || []).map(digits)));
  const P = {}; for (const d of Object.keys(mem.vis || {})) for (const v of mem.vis[d]) if (v.ph) P[v.ph] = v.name || P[v.ph] || '';
  for (const r of rows) if (r.phone) P[r.phone] = P[r.phone] || r.name || '';
  return Object.keys(P).filter(ph => ph.length >= 11 && !staff.has(ph) && !(mem.optout || {})[ph]).map(ph => ({ ph, name: String(P[ph] || '').split(' ')[0] }));
}
const greetCount = () => (mem.bcLog || []).filter(x => x.at > now.minus({ days: 30 }).toISO()).length;

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
const svcBase = ($('Clinic Settings').first().json.services || []).filter(v => v && typeof v === 'object');
const svcs = (S.services || []).map((v, i) => { if (v && typeof v === 'object' && v.name) return v; const n = String(v || '').trim(); const b0 = svcBase.find(x => x.name.toLowerCase() === n.toLowerCase()); return b0 || { id: 's' + i + '-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12), name: n, en: '', hl: '' }; }).filter(v => v.name);
const svcName = sid => { const x = svcs.find(v => v.id === sid); return x ? x.name : ''; };
function welcomeCard() {
  const fn = (cleanName(msg.name || '').split(' ')[0] || ''); const nm = fn.length >= 2 && !/^(dr|mr|mrs|ms)$/i.test(fn) ? fn : '';
  const en = lang === 'en';
  const body = en
    ? `${nm ? `Hello ${nm}` : 'Hello'} 👋\n\nWelcome to *${C}*.\n\n👇 What would you like to visit for? Choose below and we'll show you the next available times.`
    : `Namaste${nm ? ' ' + nm + ' ji' : ''} 👋\n\n*${C}* mein aapka swagat hai.\n\n👇 Bataiye, aap kis cheez ke liye milna chahte hain? Hum aapko agle khaali samay dikha denge.`;
  // one message: photo on top, the welcome words, and 3 buttons. Treatment cards come only when they ask for them.
  return buttons(body, [['NEW', en ? 'Book appointment' : 'Appointment book'], ['SVC', en ? 'Treatments & fees' : 'Treatments aur fees'], ['LIVE', en ? 'Talk to clinic' : 'Clinic se baat']], { type: 'image', image: { link: S.welcomeImage || IMG + 'welcome_v3.jpg' } });
}
function mainMenu() {
  const en = lang === 'en'; const open = isOpenNow() && docRead().status !== 'leave';
  const R = (id, t, d) => ({ id, title: t.slice(0, 24), description: d.slice(0, 72) });
  const rows = [
    R('NEW', en ? 'Book an appointment' : 'Appointment book karein', en ? 'Pick a day and time that suits you' : 'Apni suvidha ka din aur time chunein'),
    open ? R('TQ|NEW', en ? "Get today's token" : 'Aaj ka token lein', en ? 'No standing in line. We message you before your turn' : 'Line mein khade nahi rehna. Baari se pehle message aayega') : null,
    R('MYAPPT', en ? 'My appointments' : 'Mere appointments', en ? 'See, change or cancel a booking' : 'Dekhein, badlein ya cancel karein'),
    R('SVC', en ? 'Treatments & fees' : 'Treatments aur fees', en ? 'Every treatment with its price' : 'Har treatment aur uski fees'),
    R('DOC', en ? 'Meet the doctor' : 'Doctor se miliye', en ? 'Qualifications, experience, next free time' : 'Degree, anubhav, agla khali time'),
    R('LOCATE', en ? 'Timings & location' : 'Timing aur location', en ? 'Clinic hours and a map pin' : 'Clinic ka samay aur map'),
    R('MC_CALL', en ? 'Request a call back' : 'Call back maangein', en ? 'Our team will call you shortly' : 'Humari team aapko jaldi call karegi'),
  ].filter(Boolean);
  return list(en ? 'Choose what you need. Everything happens right here on WhatsApp.' : 'Jo chahiye wo chuniye. Sab kuch yahin WhatsApp par.', en ? 'View options' : 'Options dekhein', en ? 'How can we help?' : 'Kaise madad karein?', rows);
}
const svcImg = n => { n = String(n).toLowerCase(); return IMG + (/acne|pimple/.test(n) ? 'svc_acne' : /hair|prp/.test(n) && !/laser/.test(n) ? 'svc_hair' : /pigment|tan|melasma/.test(n) ? 'svc_pigment' : /laser/.test(n) ? 'svc_laser' : /hydra|glow|facial|peel/.test(n) ? 'svc_glow' : 'svc_consult') + '.jpg'; };
const svcPrice = n => { const BL = billList(); const w = String(n).toLowerCase().split(/[^a-z]+/).filter(x => x.length > 3); const hit = BL.find(x => x.n.toLowerCase() === String(n).toLowerCase()) || BL.find(x => w.some(k => x.n.toLowerCase().includes(k))); return hit ? hit.p : (S.fee || 0); };
function svcCarousel(introText) {
  const L0 = svcs.slice(0, 10); if (L0.length < 2) return svcList(introText || L.pickSvc);
  return { messaging_product: 'whatsapp', to: msg.from, type: 'interactive', interactive: { type: 'carousel',
    body: { text: introText ? introText : lang === 'en' ? `🩺 *Our treatments*\n\nSwipe to see everything ${D} treats 👉\nPrices shown are starting fees. The doctor confirms your plan after seeing you, with no hidden charges.` : `🩺 *Humare treatments*\n\nSwipe karke dekhiye ${D} kin cheezon ka ilaaj karte hain 👉\nYe shuruaati fees hain. Doctor aapko dekhkar plan confirm karenge, koi chhupa charge nahi.` },
    action: { cards: L0.map((v, i) => { const pr = svcPrice(v.name); const d0 = String((lang === 'hl' ? v.hl : v.en) || v.en || v.hl || '').slice(0, 80);
      return { card_index: i, type: 'cta_url', header: { type: 'image', image: { link: svcImg(v.name) } }, body: { text: `*${String(v.name).slice(0, 40)}*${d0 ? '\n' + d0 : ''}${pr ? `\n${lang === 'en' ? 'From' : 'Shuru'} ₹${Number(pr).toLocaleString('en-IN')}` : ''}`.slice(0, 160) },
        action: { buttons: [{ type: 'quick_reply', quick_reply: { id: `TR|${v.id}`, title: lang === 'en' ? 'Book this' : 'Ye book karein' } }] } }; }) } } };
}
function nextFree() { for (let i = 0; i <= (S.daysAhead || 7); i++) { const d = now.plus({ days: i }).toFormat('yyyy-MM-dd'); if (holidays.includes(d)) continue; const sl = slotsFor(d); if (sl && sl.length) return whenText(d, sl[0], lang); } return ''; }
function doctorCard() {
  const P = Object.assign({ qual: '', yrs: '', langs: '', about: '' }, (mem.cfg || {}).docp || {});
  const nf = nextFree();
  const body = lang === 'en'
    ? `👩‍⚕️ *${D}*${P.qual ? '\n' + P.qual : ''}${P.yrs ? ` · ${P.yrs}+ years of experience` : ''}\n\n${P.about ? P.about + '\n\n' : ''}${P.langs ? `🗣️ *Speaks:* ${P.langs}\n` : ''}${S.fee ? `💳 *Consultation:* ₹${S.fee}\n` : ''}${nf ? `🗓️ *Next free slot:* ${nf}\n` : ''}📍 ${C}${S.address ? ', ' + S.address : ''}\n\nTap below to book your visit with ${D}.`
    : `👩‍⚕️ *${D}*${P.qual ? '\n' + P.qual : ''}${P.yrs ? ` · ${P.yrs}+ saal ka anubhav` : ''}\n\n${P.about ? P.about + '\n\n' : ''}${P.langs ? `🗣️ *Bhasha:* ${P.langs}\n` : ''}${S.fee ? `💳 *Consultation:* ₹${S.fee}\n` : ''}${nf ? `🗓️ *Agla khaali slot:* ${nf}\n` : ''}📍 ${C}${S.address ? ', ' + S.address : ''}\n\n${D} ke saath visit book karne ke liye neeche dabaiye.`;
  const first = String(D).replace(/^Dr\.?\s*/i, '').split(' ')[0];
  return buttonsTo(msg.from, body, [['NEW', ('Book with Dr. ' + first).slice(0, 20)], ['SVC', 'Treatments & fees']], { type: 'image', image: { link: S.doctorImage || IMG + 'doctor_v2.jpg' } });
}
function svcList(intro) {
  if (!svcs.length) return dateList(intro);
  return sectionsTo(msg.from, intro, L.svcBtn, [{ title: L.svcTitle, rows: svcs.slice(0, 9).map(v => ({ id: `TR|${v.id}`, title: String(v.name).slice(0, 24), description: String((lang === 'hl' ? v.hl : v.en) || v.en || v.hl || '').slice(0, 72) })) }, { title: L.liveRow, rows: [{ id: 'LIVE', title: L.liveRow, description: L.liveRowD }] }], lang);
}
const cleanName = s => s.replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).replace(/\b\p{L}/gu, c => c.toUpperCase());
const confirmMsg = r => buttons(L.confirmed(r, W(r)), [[`RR|${r.row_number}`, L.changeBtn], [`RX|${r.row_number}`, L.cancelBtn]],
  S.confirmImage ? { type: 'image', image: { link: S.confirmImage } } : null, `${C} · ${S.clinicPhone}`);
const pin = () => { const p = locationTo(msg.from); if (p) more.push(p); };
// the "slot held" message: a WhatsApp form (Flow) once Meta allows it for this number, else the one-message details ask
const heldMsg = (d, tm) => S.bookFlowId ? { messaging_product: 'whatsapp', to: msg.from, type: 'interactive', interactive: { type: 'flow',
    body: { text: lang === 'en' ? `⏳ *${whenText(d, tm, 'en')}* is held for you for ${S.holdMinutes} minutes.\n\nTap below and fill the patient details once. That's all we need.` : `⏳ *${whenText(d, tm, 'hl')}* aapke liye ${S.holdMinutes} minute tak rok liya hai.\n\nNeeche dabakar patient ki details ek baar bhar dijiye. Bas itna hi chahiye.` },
    footer: { text: String(C).slice(0, 60) }, action: { name: 'flow', parameters: { flow_message_version: '3', flow_token: 'bk-' + rid(10), flow_id: String(S.bookFlowId), flow_cta: lang === 'en' ? 'Fill details' : 'Details bharein', flow_action: 'navigate',
      flow_action_payload: { screen: 'DETAILS', data: { slot: at(d, tm).toFormat('ccc, d LLL') + ' at ' + at(d, tm).toFormat('h:mm a'), clinic: String(C) } } } } } }
  : buttons(L.held(whenText(d, tm, lang)), [['SELF', L.selfBtn], ['OTHER', lang === 'en' ? 'Someone else' : 'Kisi aur ke liye']]);
// the WhatsApp form for one day: free times as chips + patient details (needs S.bookFlowId, a published Flow)
function dayFlow(d, note) {
  const sl = slotsFor(d); if (!sl.length) return dateList(L.dayFull);
  const en = lang === 'en'; const sv = svcName(mem.svc[me] || '');
  return { messaging_product: 'whatsapp', to: msg.from, type: 'interactive', interactive: { type: 'flow',
    body: { text: (note ? note + '\n\n' : '') + (en ? `📅 *${dateLabel(d, 'en')}*${sv ? ' · ' + sv : ''}\n\n${sl.length} times are free. Tap below to pick one and fill the patient details. It takes 20 seconds.` : `📅 *${dateLabel(d, 'hl')}*${sv ? ' · ' + sv : ''}\n\n${sl.length} time khaali hain. Neeche dabakar time chuniye aur patient ki details bhariye. Bas 20 second.`) },
    footer: { text: String(C).slice(0, 60) }, action: { name: 'flow', parameters: { flow_message_version: '3', flow_token: 'day-' + rid(10), flow_id: String(S.bookFlowId), flow_cta: en ? 'Pick a time' : 'Time chunein', flow_action: 'navigate',
      flow_action_payload: { screen: 'BOOK', data: { day: dateLabel(d, 'en'), d, svc: String(mem.svc[me] || ''), times: sl.slice(0, 20).map(x => ({ id: x, title: timeLabel(d, x, 'en') })) } } } } } };
}
const parseDetails = s0 => { let s1 = ' ' + String(s0 || '') + ' '; let sex = '';
  const g = s1.match(/[\s,;](male|female|other|m|f|ladka|ladki|purush|mahila|aurat|boy|girl|man|woman|lady|gents)(?=[\s,;.])/i);
  if (g) { const w = g[1].toLowerCase(); sex = /^(f|female|ladki|mahila|aurat|girl|woman|lady)$/.test(w) ? 'Female' : w === 'other' ? 'Other' : 'Male'; s1 = s1.replace(g[0], ' '); }
  const a = s1.match(/(\d{1,3})\s*(y|yr|yrs|year|years|saal|sal)?(?=[\s,;.])/i); const age = a && +a[1] > 0 && +a[1] < 111 ? +a[1] : 0; if (a) s1 = s1.replace(a[0], ' ');
  const name = cleanName(s1.replace(/\b(age|gender|name|naam|umar|sex)\b\s*[:=-]?/gi, ' ').replace(/[,;|/:]+/g, ' '));
  return { name, age, sex }; };
// booking receipt as a PDF on WhatsApp (the PDF is made by the "Booking receipt" page of this workflow)
function receiptDoc(r, pd) {
  if (S.receiptPdf === false) return null;
  if (!mem.bkr) mem.bkr = {}; const keys = Object.keys(mem.bkr); if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete mem.bkr[k];
  const k = r.row_number + '.' + sha256(String(r.row_number) + now.toISO() + Math.random()).slice(0, 12);
  mem.bkr[k] = { id: bookingId(r), name: pd.name, age: pd.age || 0, sex: pd.sex || '', area: pd.area || '', phone: digits(pd.ph2 || '') || digits(me), date: r.date, time: r.time, svc: r.service || '', made: now.toISO(),
    clinic: C, doctor: D, address: S.address || '', cphone: S.clinicPhone || '', fee: Number(S.fee || 0), when: at(r.date, r.time).toFormat('ccc, d LLL yyyy, h:mm a') };
  const base = S.receiptUrl || 'https://api.okaybridge.com/webhook/receipt';
  return { messaging_product: 'whatsapp', to: msg.from, type: 'document', document: { link: `${base}?b=${k}`, filename: `Booking ${bookingId(r)}.pdf`, caption: lang === 'en' ? '🧾 Your booking receipt. Show it at the reception.' : '🧾 Aapki booking ki receipt. Reception par dikha dijiye.' } };
}


// ---------- doctor / reception commands ----------
const cmd = raw.toUpperCase().replace(/\s+/g, ' ').trim();
// the doctor (or owner) can change the clinic status in plain words from his own number
const isDocPh = isAdmin || (S.staff || []).some(x => (x.role === 'doctor' || x.role === 'owner') && same(x.phone, me));
let docIntent = null;
if (isDocPh && String(id || '').startsWith('DS|')) { const [, k, v] = id.split('|'); docIntent = { k, m: Number(v) || 0, d: k === 'leave' ? v : null, sure: true }; }
else if (isDocPh && !id && raw && raw.trim().split(/\s+/).length <= 6) {
  const low = raw.toLowerCase(); const hr = low.match(/(\d+(?:\.5)?)\s*(hr|hrs|hour|hours|ghanta|ghante)/); const mn = low.match(/(\d{1,3})\s*(m|min|mins|minute|minutes|minat)?\b/);
  const mins = hr ? Math.round(Number(hr[1]) * 60) : mn ? Number(mn[1]) : 0;
  if (/\b(leave|chhutti|chutti|chhuti|holiday)\b|nahi aa ?(unga|ungi|paunga|paungi|raha|rahi|sakta|sakti)|clinic (band|closed?)\b|not coming/.test(low)) {
    const d = /\b(kal|tomorrow)\b/.test(low) ? now.plus({ days: 1 }).toFormat('yyyy-MM-dd') : (parseLeaveDate('LEAVE ' + cmd.replace(/^LEAVE\s*/, '').replace(/\b(TODAY|AAJ|HAI|HOON|HU|I AM|ON|DOCTOR|DR)\b/g, '').trim()) || now.toFormat('yyyy-MM-dd'));
    docIntent = { k: 'leave', d };
  }
  else if (/\b(late|let|der|deri|delay|delayed|traffic)\b/.test(low)) docIntent = { k: 'late', m: mins };
  else if (mins && /\b(min|mins|minute|minutes|minat|hr|hour|ghanta|ghante)\b/.test(low) && /\b(mein|me|main|in|reach|reaching|pahunch|pahunchunga|pahunchungi|aa raha|aa rahi|aaunga|aaungi|coming|be there|nikal)\b/.test(low)) docIntent = { k: 'late', m: mins };
  else if (/\b(away|bahar|surgery|ward|ot mein|nikal raha|nikal rahi)\b/.test(low)) docIntent = { k: 'away', m: mins };
  else if (/^(in|back|aa gaya|aa gayi|aagaya|aagayi|pahunch gaya|pahunch gayi|reached|in clinic|i am in|i'm in|im in|start|started|wapas|wapas aa gaya|wapas aa gayi)\b/.test(low)) docIntent = { k: 'in' };
}
const repCmd = isDocPh && !id && /^(REPORT|RIPORT|HISAAB|HISAB)$/.test(cmd);
const greetCmd = isDocPh && ((!id && /^(GREET|GREETING|WISH)\b/.test(cmd)) || String(id || '').startsWith('GR|'));
const advCmd = isDocPh && !id && /^ADVANCE\b/.test(cmd);
const adminCmd = (isAdmin && !id && /^(TODAY|AAJ|HELP|ADMIN)/.test(cmd)) || repCmd || greetCmd || advCmd || !!docIntent;
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
// live chat is switched off: everyone who messages the clinic number (staff included) gets the normal patient flow
const adminTarget = null; if (mem.live && Object.keys(mem.live).length) mem.live = {};
let liveHandled = false;
const sysWord = /^(login|reset|code|token)$/i.test((raw || '').trim());
if (adminCmd) {
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
  else if (advCmd) {
    const m0 = cmd.match(/\d+/); if (!mem.cfg) mem.cfg = {};
    if (/OFF|BAND|0\b/.test(cmd) && !(m0 && Number(m0[0]) > 0)) { mem.cfg.advance = 0; payload = text('Done ✓ Advance payment is off. Patients will book without paying.'); }
    else if (m0) { const a0 = Math.min(5000, Number(m0[0])); if (!upiOf()) payload = text('First add your clinic UPI ID in the Clinic Desk settings, then send ADVANCE ' + a0 + ' again.'); else { mem.cfg.advance = a0; payload = text(`Done ✓ After booking, patients will now get a UPI QR to pay ₹${a0} advance to ${upiOf()}.\nReception gets a message when someone says they paid.\nTo stop: ADVANCE OFF`); } }
    else payload = text(`Advance now: ${advAmt() ? '₹' + advAmt() : 'off'}.\nSend ADVANCE 100 to ask ₹100 after booking, or ADVANCE OFF.`);
  }
  else if (greetCmd) {
    const gr = String(id || '').startsWith('GR|'); const k = gr ? (GREET[id.slice(3)] ? id.slice(3) : null) : ['DIWALI', 'HOLI', 'NEWYEAR'].find(x => cmd.replace(/\s|-/g, '').includes(x)); const custom = gr ? '' : raw.replace(/^\s*(greet(ing)?|wish)\s*/i, '').trim();
    const n0 = greetList().length;
    if (!k && custom.length < 15) payload = buttons(`Which greeting should go to your ${n0} patients?\n\nOr write your own: GREET <your message>`, [['GR|DIWALI', 'Diwali'], ['GR|HOLI', 'Holi'], ['GR|NEWYEAR', 'New Year']]);
    else { if (!mem.bcPend) mem.bcPend = {}; mem.bcPend[me] = { k: k || '', text: k ? '' : custom + `\n\n${D}\n${C}`, at: now.toISO() };
      const prev = k ? GREET[k].en('Riya') : custom;
      payload = buttons(`*Preview*\n\n${prev}\n\nThis goes to *${Math.min(n0, 300)}* patients (each in their own language). Send now?`, [['BC|yes', 'Send'], ['BC|no', 'Cancel']]); }
  }
  else if (repCmd) {
    const f = now.startOf('month').toFormat('yyyy-MM-dd');
    payload = text(monthReport(f, today, now.toFormat('LLLL yyyy') + ' (so far)', langOf(me, '')).text);
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
else if (!adminCmd && !sysWord && isAdmin && adminTarget && liveOpen(adminTarget) && !id) {
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
if (liveHandled || adminCmd) {}
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
else if (!id && /^(stop|unsubscribe|band karo|band kar do|message band|msg band)$/i.test(raw.trim())) {
  if (!mem.optout) mem.optout = {}; mem.optout[me] = now.toISO(); ev(me, 'note', 'Asked to stop messages');
  payload = text(lang === 'en' ? `Done. ${C} will not send you reminders or updates any more.\n\nYou can still message us any time. To start again, send *START*.` : `Theek hai. ${C} ab aapko reminder ya update nahi bhejega.\n\nAap kabhi bhi humein message kar sakte hain. Dobara shuru karne ke liye *START* bhejiye.`);
}
else if (!id && /^start$/i.test(raw.trim()) && mem.optout && mem.optout[me]) {
  delete mem.optout[me]; payload = text(lang === 'en' ? `Welcome back! You will get reminders and updates from ${C} again.` : `Wapas swagat hai! Ab aapko ${C} se reminder aur update phir se milenge.`);
}
else if (!id && /kitna|kitni der|kitni deri|kab tak|kab aayega|kab ayega|number kab|how long|wait time|kitne log|kitne patient/i.test(raw) && qRead().list.some(x => x.phone === me && ['w', 's'].includes(x.st))) {
  const q0 = qRead(); const mineTk = q0.list.find(x => x.phone === me && ['w', 's'].includes(x.st));
  payload = mineTk.st === 's' ? text(QT[lang].turn(cabin)) : tokenMsg(q0, mineTk, msg.from);
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
else if (id.startsWith('PB|') || (!id && raw.split(/\s+/).length >= 3 && !/\?|\b(fee|fees|price|address|kahan|timing|kitna|kitni|kab|kaise)\b/i.test(raw) && !has(['hi', 'hello', 'cancel', 'book', 'menu', 'token', 'doctor', 'dr', 'help', 'talk', 'chat']) && (() => { const q0 = qRead(); const tk = q0.list.find(x => x.phone === me && x.st === 'w'); return tk && !tk.prob; })())) {
  const q = qWrite(); const tk = q.list.find(x => x.phone === me && ['w', 's'].includes(x.st));
  if (tk) { tk.prob = id.startsWith('PB|') ? id.slice(3) : '"' + raw.slice(0, 120) + '"'; }
  payload = (!seenBefore(me) && !(mem.src || {})[me]) ? buttons((lang === 'en' ? '✅ *Thank you, noted*\nThe doctor will read this before your consultation, so you will not need to repeat it. 👩‍⚕️\n\nOne quick question, it helps us a lot: how did you hear about us?' : '✅ *Shukriya, note kar liya*\nDoctor consultation se pehle ise padh lenge, aapko dobara batana nahi padega. 👩‍⚕️\n\nEk chhota sawaal, isse humein bahut madad milti hai: aapko humare baare mein kaise pata chala?'), [['SRC|google', 'Google / Instagram'], ['SRC|friend', lang === 'en' ? 'Someone told me' : 'Kisi ne bataya'], ['SRC|board', lang === 'en' ? 'Board / other' : 'Board / kuch aur']])
    : text(lang === 'en' ? '✅ *Thank you, noted*\nThe doctor will read this before your consultation, so you will not need to repeat it. 👩‍⚕️' : '✅ *Shukriya, note kar liya*\nDoctor consultation se pehle ise padh lenge, aapko dobara batana nahi padega. 👩‍⚕️');
}
else if (String(id || '').startsWith('RV|')) {
  if (!mem.rv) mem.rv = {}; const r = Number(id.slice(3)) || 3; mem.rv[me] = { at: now.toISO(), r, wait: r < 5 ? now.toISO() : null }; const link = (mem.cfg || {}).googleReview || S.googleReview || '';
  bump(r >= 5 ? 'rvGood' : r >= 3 ? 'rvMid' : 'rvLow'); ev(me, 'review', r >= 5 ? 'Rated the visit: very good' : r >= 3 ? 'Rated the visit: okay' : 'Rated the visit: not good');
  if (r >= 5) payload = link ? ctaTo(msg.from, lang === 'en' ? '💙 *Thank you, that means a lot to us!*\n\nIf you have one minute, would you share your experience on Google? Your review helps other patients find the right care with confidence. ⭐' : '💙 *Shukriya, ye humare liye bahut maayne rakhta hai!*\n\nAgar ek minute ho, toh kya aap Google par apna anubhav share karenge? Aapka review doosre patients ko bharose ke saath sahi ilaaj dhoondhne mein madad karta hai. ⭐', lang === 'en' ? 'Write a review' : 'Review likhein', link) : text(lang === 'en' ? '💙 *Thank you for your kind words!*\nWe look forward to seeing you again. Take care. 🙏' : '💙 *Aapke pyaare shabdon ke liye shukriya!*\nAapse dobara milne ka intezaar rahega. Apna khayal rakhiye. 🙏');
  else payload = text(lang === 'en' ? '🙏 *We are truly sorry we did not meet your expectations*\n\nYour experience matters to us. Could you tell us in one line what we could have done better? This goes directly and privately to the doctor, and we will work on it.' : '🙏 *Humein sach mein khed hai ki aapka anubhav accha nahi raha*\n\nAapka anubhav humare liye bahut maayne rakhta hai. Kya aap ek line mein bata sakte hain ki hum kya behtar kar sakte the? Ye seedha aur privately doctor tak jayega, aur hum ispar kaam karenge.');
}
else if (!id && msg.type === 'text' && raw.length >= 3 && mem.rv && mem.rv[me] && mem.rv[me].wait && mem.rv[me].wait > now.minus({ minutes: 60 }).toISO()) {
  const r = mem.rv[me]; r.wait = null; if (!mem.fb) mem.fb = []; mem.fb = mem.fb.concat([{ ph: me, name: (mem.pname || {})[me] || msg.name || '', r: r.r, t: raw.slice(0, 300), at: now.toISO() }]).slice(-50); ev(me, 'review', 'Feedback: "' + raw.slice(0, 140) + '"');
  const link = (mem.cfg || {}).googleReview || S.googleReview || '';
  payload = text((lang === 'en' ? 'Thank you. The doctor will read this personally.' : 'Shukriya. Doctor ise khud padhenge.') + (link ? (lang === 'en' ? '\n\nYou can also leave a public review on Google if you like:\n' : '\n\nAap chahein toh Google par bhi review likh sakte hain:\n') + link : ''));
}
else if (String(id || '').startsWith('SRC|')) {
  const k = id.slice(4); if (SRC[k]) { if (!mem.src) mem.src = {}; if (!mem.src[me]) { mem.src[me] = { s: k, at: now.toISO() }; bump('src_' + k); ev(me, 'src', 'Found us through: ' + SRC[k]); } }
  payload = text(lang === 'en' ? '✅ *Thank you for telling us*\n\nYour feedback has reached the doctor personally. We are sorry again, and we will do better. 🙏' : '✅ *Batane ke liye shukriya*\n\nAapka feedback seedha doctor tak pahunch gaya hai. Hum dobara kshama chahte hain, aur behtar karenge. 🙏');
}
else if ((String(id || '').startsWith('CBR|') || (!id && ['audio', 'voice'].includes(msg.type))) && (mem.callbacks || []).some(x => x.phone === me && !x.reason)) {
  const cb = mem.callbacks.find(x => x.phone === me && !x.reason); const isV = !id; cb.reason = isV ? 'Sent a voice note (ask on the call)' : id.slice(4); ev(me, 'why', isV ? 'Sent a voice note about it' : 'Reason: ' + id.slice(4));
  payload = text(lang === 'en' ? '✅ *Thank you, we have noted it*\n\nOur team will call you shortly with the right information. 📞\n\nIf it is urgent, you can also call us on ' + S.clinicPhone + '.' : '✅ *Shukriya, humne note kar liya hai*\n\nHumari team sahi jaankari ke saath aapko jaldi call karegi. 📞\n\nZaroori ho toh aap humein ' + S.clinicPhone + ' par call bhi kar sakte hain.');
}
else if (!id && msg.type === 'text' && raw.length >= 3 && !/^(hi|hello|hey|ok|okay|thanks|thank you|haan|ha|yes|no|nahi|menu|token|login|code)$/i.test(raw.trim()) && (mem.callbacks || []).some(x => x.phone === me && !x.reason && x.at > now.minus({ minutes: 10 }).toISO())) {
  const cb = mem.callbacks.find(x => x.phone === me && !x.reason); cb.reason = raw.slice(0, 220); ev(me, 'why', 'Reason: "' + raw.slice(0, 160) + '"');
  payload = text(lang === 'en' ? '✅ *Thank you, we have noted it*\n\nOur team will call you shortly with the right information. 📞\n\nIf it is urgent, you can also call us on ' + S.clinicPhone + '.' : '✅ *Shukriya, humne note kar liya hai*\n\nHumari team sahi jaankari ke saath aapko jaldi call karegi. 📞\n\nZaroori ho toh aap humein ' + S.clinicPhone + ' par call bhi kar sakte hain.');
}
else if (id === 'TQ|HERE') {
  const q0 = qRead(); const tk = q0.list.find(x => x.phone === me && x.st === 'w');
  if (tk) { qWrite(); tk.here = true; }
  payload = text(QT[lang].hereOk);
}
else if (docAsk && has(['kal', 'tomorrow', 'parso'])) {
  const d1 = now.plus({ days: has(['parso']) ? 2 : 1 }); const ds = d1.toFormat('yyyy-MM-dd'); const dayW = has(['parso']) ? (lang === 'en' ? 'the day after tomorrow' : 'parso') : (lang === 'en' ? 'tomorrow' : 'kal');
  const openD = ((S.hours || {})[d1.toFormat('ccc').toLowerCase()] || []).length > 0 && !holidays.includes(ds); const sl = openD ? (slotsFor(ds) || []) : [];
  let nf = ''; for (let i = 1; i <= (S.daysAhead || 7) && !nf; i++) { const d = now.plus({ days: i }).toFormat('yyyy-MM-dd'); if (holidays.includes(d)) continue; const x = slotsFor(d); if (x && x.length) nf = whenText(d, x[0], lang); }
  const body = openD && sl.length ? (lang === 'en' ? `Yes, ${D} is in the clinic ${dayW} 🙂
First free time: *${whenText(ds, sl[0], 'en')}*

Shall we book it for you?` : `Haan, ${D} ${dayW} clinic mein hain 🙂
Pehla khali time: *${whenText(ds, sl[0], 'hl')}*

Book kar dein?`)
    : openD ? (lang === 'en' ? `${D} is in ${dayW}, but all times are booked.${nf ? `
Next free time: *${nf}*` : ''}` : `${D} ${dayW} hain, par saare time book ho chuke hain.${nf ? `
Agla khali time: *${nf}*` : ''}`)
    : (lang === 'en' ? `${D} isn't in the clinic ${dayW}.${nf ? `
Next free time: *${nf}*` : ''}` : `${D} ${dayW} clinic mein nahi hain.${nf ? `
Agla khali time: *${nf}*` : ''}`);
  payload = buttons(body, [['NEW', L.bookBtn]]);
}
else if (docAsk) {
  const q0 = qRead(); const tk = q0.list.find(x => x.phone === me && x.st === 'w');
  payload = buttons(docLine(lang) + (tk ? (lang === 'en' ? ` ${aheadOf(q0, tk)} ahead of you (${etaText(q0, aheadOf(q0, tk), 'en')}).` : ` Aapse pehle ${aheadOf(q0, tk)} patient (${etaText(q0, aheadOf(q0, tk), 'hl')}).`) : (isOpenNow() ? (lang === 'en' ? '\n\nComing in today? Type *TOKEN* for your token.' : '\n\nAaj aana hai? *TOKEN* likhiye, token yahin mil jayega.') : '')), [['NEW', L.bookBtn]]);
}
// ---------- patients ----------
else if (id === 'MC_Q') { payload = text(L.mcQ); }
else if (id === 'MENU' || (!id && /^(menu|options|main menu|start)$/i.test(raw))) { payload = mainMenu(); }
else if (id === 'LOCATE') { payload = buttons(L.talk, [['NEW', L.bookBtn], ['MC_CALL', lang === 'en' ? 'Request a call' : 'Call request karein']]); pin(); }
else if (id === 'MYAPPT') { payload = upcoming.length ? buttons(L.yourAppts(msg.name, upcoming.map(r => `• ${r.name || 'Patient'}: ${W(r)}`).join('\n')), menuBtns()) : buttons(L.noUpcoming, [['NEW', L.bookBtn]]); }
else if (id === 'MC_CALL') { notify = true; payload = buttons(L.mcCall + (lang === 'en' ? '\n\nWhat is it about? Tap below, or type a line / send a voice note.' : '\n\nBas bata dijiye baat kis baare mein hai. Neeche dabaiye, ya ek line likh dijiye / voice note bhej dijiye.'), lang === 'en' ? [['CBR|Price / fees', 'Price / fees'], ['CBR|Appointment', 'Appointment'], ['CBR|Show report', 'Show report']] : [['CBR|Price / fees', 'Price / fees'], ['CBR|Appointment', 'Appointment'], ['CBR|Report dikhani hai', 'Report dikhani hai']]); if (!mem.callbacks) mem.callbacks = []; mem.callbacks = mem.callbacks.filter(x => x.phone !== me).concat([{ phone: me, name: msg.name || '', at: now.toISO(), reason: '' }]).slice(-50); mem.cbLog = (mem.cbLog || []).concat([{ ph: me, at: now.toISO() }]).slice(-500); ev(me, 'cb', 'Asked for a call back'); }
else if (['audio', 'voice', 'image', 'document', 'video'].includes(msg.type)) { notify = true; const isV = ['audio', 'voice'].includes(msg.type); const why = isV ? 'Sent a voice note' : 'Sent a photo / file';
  if (!mem.callbacks) mem.callbacks = []; mem.callbacks = mem.callbacks.filter(x => x.phone !== me).concat([{ phone: me, name: msg.name || '', at: now.toISO(), reason: why }]).slice(-50); mem.cbLog = (mem.cbLog || []).concat([{ ph: me, at: now.toISO() }]).slice(-500); ev(me, 'cb', why);
  payload = buttons(lang === 'en' ? (isV ? '🎙️ Got your voice note. Someone from our team will listen to it and call you back shortly.' : '📎 Got it. Our team will have a look and call you back shortly.') + '\n\nWant to book a time meanwhile?' : (isV ? '🎙️ Aapka voice note mil gaya. Humari team sunkar aapko jaldi call karegi.' : '📎 Mil gaya. Humari team dekh kar aapko jaldi call karegi.') + '\n\nTab tak time book karna ho toh neeche dabaiye.', [['NEW', L.bookBtn]]); }
else if (!['text', 'interactive', 'button'].includes(msg.type)) { payload = buttons(L.textOnly, menuBtns()); }
else if (!mem.lang[me] && !id && !upcoming.length && !holding) {
  payload = buttons(T.en.pickLang, [['LANG|en', 'English'], ['LANG|hl', 'Hinglish']]);
}
else if (langSwitch) { payload = welcomeCard(); }
else if (!id && has(['language', 'bhasha', 'lang'])) {
  payload = buttons(T.en.pickLang, [['LANG|en', 'English'], ['LANG|hl', 'Hinglish']]);
}
else if (id === 'FLOW' && !holding) {
  // the WhatsApp form came back with a time and the patient's details: book straight away
  let f = {}; try { f = JSON.parse(raw || '{}'); } catch (e) {}
  const d = String(f.d || ''), tm = String(Array.isArray(f.time) ? f.time[0] || '' : f.time || ''); if (Array.isArray(f.sex)) f.sex = f.sex[0]; if (Array.isArray(f.who)) f.who = f.who[0]; const en = lang === 'en';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !slotsFor(d).includes(tm)) payload = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? dayFlow(d, en ? 'Sorry, that time was just taken. Please pick another one.' : 'Maaf kijiye, woh time abhi kisi ne le liya. Doosra time chuniye.') : dateList(L.pickSvc);
  else {
    const pd = { self: f.who === 'self', name: cleanName(String(f.name || (f.who === 'self' ? msg.name : '') || '')) || cleanName(msg.name || '') || 'Patient', age: Number(f.age) > 0 && Number(f.age) < 111 ? Number(f.age) : 0, sex: ['Male', 'Female', 'Other'].includes(f.sex) ? f.sex : '', area: String(f.area || '').slice(0, 60), ph2: digits(f.phone || '').slice(-10), prob: String(f.prob || '').slice(0, 200) };
    const svc = svcName(String(f.svc || mem.svc[me] || ''));
    action = 'append'; rec = { name: pd.name, phone: me, email: '', date: d, time: tm, status: 'Booked', bookedAt: DateTime.now().toISO(), lang, service: svc };
    const rowNo = rows.reduce((m0, r0) => Math.max(m0, Number(r0.row_number) || 0), 1) + 1; const bk = { ...rec, row_number: rowNo };
    const pi = v8pinfo(patKey(me, '')); if (pd.self || !pi.name) { if (pd.age) pi.age = pd.age; if (pd.sex) pi.sex = pd.sex; if (pd.area) pi.area = pd.area; pi.name = pi.name || pd.name; }
    if (!mem.bkd) mem.bkd = {}; mem.bkd[rowNo] = { ...pd, at: now.toISO() };
    payload = confirmMsg({ ...bk, name: pd.name + (pd.age || pd.sex ? ` (${[pd.age ? pd.age + (en ? ' yrs' : ' saal') : '', pd.sex].filter(Boolean).join(', ')})` : '') }); const rd = receiptDoc(bk, pd); if (rd) more.push(rd); { const pa = payAsk(bk); if (pa) more.push(pa); } pin(); bump('booked'); bookedExtra(me);
    ev(me, 'booked', 'Booked ' + at(d, tm).toFormat('ccc d LLL, h:mm a') + ' · ' + pd.name + (pd.age ? ', ' + pd.age : '') + (pd.sex ? ', ' + pd.sex : ''));
  }
}
else if (holding && (['SELF', 'OTHER', 'FLOW'].includes(id) || id.startsWith('SEX|') || (!id && raw && !raw.includes('?') && raw.split(/\s+/).length <= 8 && !has(['cancel', 'hi', 'hello', 'menu', 'book', 'talk', 'help'])))) {
  if (!mem.pend) mem.pend = {}; for (const k of Object.keys(mem.pend)) if (mem.pend[k].at < now.minus({ hours: 2 }).toISO()) delete mem.pend[k];
  const pd = (mem.pend[me] && mem.pend[me].row === holding.row_number) ? mem.pend[me] : { row: holding.row_number, at: now.toISO() };
  const en = lang === 'en';
  if (id === 'FLOW') { try { const f = JSON.parse(raw || '{}'); pd.self = f.who === 'self'; pd.name = cleanName(String(f.name || (pd.self ? msg.name : '') || '')); pd.age = Number(f.age) > 0 && Number(f.age) < 111 ? Number(f.age) : 0; pd.sex = ['Male', 'Female', 'Other'].includes(f.sex) ? f.sex : ''; pd.area = String(f.area || '').slice(0, 60); pd.ph2 = digits(f.phone || '').slice(-10); pd.prob = String(f.prob || '').slice(0, 200); pd.ageTries = 9; } catch (e) {} }
  else if (id === 'SELF') { pd.self = true; pd.other = false; pd.name = cleanName(msg.name || '') || ''; }
  else if (id === 'OTHER') { pd.self = false; pd.other = true; pd.name = ''; pd.named = false; }
  else if (id.startsWith('SEX|')) pd.sex = id.slice(4);
  else { const x = parseDetails(raw); if (x.name && (!pd.name || (pd.other && !pd.named))) { pd.name = x.name; pd.named = true; } if (x.age) pd.age = x.age; if (x.sex) pd.sex = x.sex; if (!x.age && pd.name && pd.sex && !pd.age) pd.ageTries = (pd.ageTries || 0) + 1; }
  mem.pend[me] = pd;
  const who = pd.self ? (en ? 'your' : 'aapki') : (en ? 'the patient\'s' : 'patient ki');
  if (!pd.name || pd.name.length < 2) payload = pd.other ? text(en ? "✍️ Please type the *patient's full name*.\nExample: _Riya Sharma_" : '✍️ Patient ka *poora naam* likh dijiye.\nJaise: _Riya Sharma_') : buttons(L.held(whenText(holding.date, holding.time, lang)), [['SELF', L.selfBtn], ['OTHER', en ? 'Someone else' : 'Kisi aur ke liye']]);
  else if (!pd.sex) payload = buttons(en ? `${pd.self ? 'Thank you' : 'Got it, *' + pd.name + '*'}. Please choose ${who} gender:` : `${pd.self ? 'Shukriya' : 'Theek hai, *' + pd.name + '*'}. Gender chuniye:`, [['SEX|Male', 'Male'], ['SEX|Female', 'Female'], ['SEX|Other', 'Other']]);
  else if (!pd.age && (pd.ageTries || 0) < 2) payload = text(en ? `🎂 And ${who} *age* in years?\nJust type the number, like _32_` : `🎂 Aur ${who} *umar* kitni hai?\nBas number likhiye, jaise _32_`);
  else {
    setStatus(holding, 'Booked', pd.name); const bk = { ...holding, name: pd.name };
    const pi = v8pinfo(patKey(me, '')); if (pd.self || !pi.name) { if (pd.age) pi.age = pd.age; if (pd.sex) pi.sex = pd.sex; if (pd.area) pi.area = pd.area; pi.name = pi.name || pd.name; }
    if (!mem.bkd) mem.bkd = {}; mem.bkd[holding.row_number] = { name: pd.name, age: pd.age || 0, sex: pd.sex || '', area: pd.area || '', ph2: pd.ph2 || '', prob: pd.prob || '', self: !!pd.self, at: now.toISO() };
    delete mem.pend[me];
    payload = confirmMsg({ ...bk, name: pd.name + (pd.age || pd.sex ? ` (${[pd.age ? pd.age + (en ? ' yrs' : ' saal') : '', pd.sex].filter(Boolean).join(', ')})` : '') }); const rd = receiptDoc(bk, pd); if (rd) more.push(rd); { const pa = payAsk(bk); if (pa) more.push(pa); } pin(); bump('booked'); bookedExtra(me);
    ev(me, 'booked', 'Booked ' + at(holding.date, holding.time).toFormat('ccc d LLL, h:mm a') + ' · ' + pd.name + (pd.age ? ', ' + pd.age : '') + (pd.sex ? ', ' + pd.sex : ''));
  }
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
    payload = heldMsg(d, tm);
  }
}
else if (id.startsWith('M|')) { const [, d, after] = id.split('|'); payload = timeList(d, after); }
else if (id.startsWith('D|')) { const d0 = id.split('|')[1]; payload = S.bookFlowId && canBookMore ? dayFlow(d0) : timeList(d0); }
else if (id.startsWith('PAID|')) {
  const rn = id.split('|')[1]; const r = byRow(rn); if (!mem.adv) mem.adv = {};
  if (r && !mem.adv[rn]) { mem.adv[rn] = { ph: me, amt: advAmt(), at: now.toISO(), st: 'claimed' }; bump('advClaimed'); ev(me, 'pay', 'Says advance ₹' + advAmt() + ' paid · check UPI');
    for (const st of (S.staff || []).filter(x => x.role === 'reception' || x.role === 'owner')) if (inWindow(digits(st.phone))) more.push(textTo(digits(st.phone), `💳 ${r.name || 'A patient'} says ₹${advAmt()} advance is paid (${bookingId(r)}, ${W(r)}). Please check your UPI app.`)); }
  payload = text(lang === 'en' ? '🙏 Thank you! The clinic will check the payment, and ₹' + advAmt() + ' will be adjusted in your bill.' : '🙏 Dhanyavaad! Clinic payment check kar lega, aur ₹' + advAmt() + ' aapke bill mein kam ho jayega.');
}
else if (id.startsWith('BC|')) {
  const p0 = (mem.bcPend || {})[me]; if (mem.bcPend) delete mem.bcPend[me];
  if (id !== 'BC|yes' || !p0 || p0.at < now.minus({ minutes: 30 }).toISO()) payload = text('Okay, nothing was sent.');
  else if (greetCount() >= 2) payload = text('Two greetings have already gone out in the last 30 days. To protect your WhatsApp number, the next one can go later.');
  else { const L0 = greetList().slice(0, 300); let n = 0, skip = 0;
    for (const p of L0) { const lg = langOf(p.ph, ''); const body = (GREET[p0.k] ? GREET[p0.k][lg === 'en' ? 'en' : 'hl'](p.name) : p0.text) + (lg === 'en' ? '\n\n_Reply STOP to stop messages._' : '\n\n_Messages band karne ke liye STOP likhiye._');
      if (inWindow(p.ph)) { more.push(textTo(p.ph, body)); n++; } else if (S.templates && S.templates.greeting) { more.push(templateTo(p.ph, S.templates.greeting, [p.name || 'there', C], [])); n++; } else skip++; }
    if (!mem.bcLog) mem.bcLog = []; mem.bcLog = mem.bcLog.concat([{ at: now.toISO(), k: p0.k, n, by: me }]).slice(-24); bump('greetSent', n);
    payload = text(`Done ✓ Greeting sent to ${n} patient${n === 1 ? '' : 's'}.` + (skip ? `\n${skip} could not get it yet: they have not messaged in 24 hours and the greeting template is not approved yet.` : '')); }
}
else if (id.startsWith('RC|')) {
  const r = byRow(id.split('|')[1]);
  if (r && active(r)) { setStatus(r, 'Confirmed'); payload = text(L.thanksConfirm(W(r))); pin(); bump('confirmed'); } else payload = text(L.gone);
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
else if (id === 'SVC' || (!id && has(['price', 'prices', 'fees', 'fee', 'charges', 'treatment', 'treatments', 'services', 'kitna', 'kitni', 'paise', 'charge']))) {
  const fee = Number(S.fee || 0), free = Number(S.freeDays || 0);
  const feeTxt = fee ? (lang === 'en' ? `💰 *Consultation fee: ₹${fee}*${free ? `\nFollow-up within ${free} days is free.` : ''}\nPaid at the clinic. No booking charge.` : `💰 *Consultation fee: ₹${fee}*${free ? `\n${free} din ke andar follow-up free hai.` : ''}\nPaisa clinic par dena hai. Booking ka koi charge nahi.`) : '';
  if (feeTxt && svcs.length >= 2) { payload = text(feeTxt); more.push(svcCarousel()); }
  else payload = feeTxt ? buttons(feeTxt, [['NEW', L.bookBtn], ['LIVE', L.talkBtn]]) : svcCarousel();
}
else if (id === 'DOC' || (!id && has(['doctor', 'dr', 'qualification', 'experience']) && !has(['late', 'leave']))) { payload = doctorCard(); }
else if (id === 'NEW' || id === 'MC_BOOK' || id.startsWith('LANG|') || (!id && has(['book', 'booking', 'appointment']) && !has(['cancel']))) {
  if (id.startsWith('LANG|') && upcoming.length) payload = buttons(L.yourAppts(msg.name, upcoming.map(r => `• ${r.name || 'Patient'}: ${W(r)}`).join('\n')), menuBtns());
  else if (id.startsWith('LANG|')) payload = welcomeCard();
  else payload = canBookMore ? svcCarousel(lang === 'en' ? '🩺 *What would you like to visit for?*\n\nSwipe the cards and tap *Book this* on the one you need 👉' : '🩺 *Aap kis cheez ke liye milna chahte hain?*\n\nCards swipe karke jo chahiye uspe *Ye book karein* dabaiye 👉') : buttons(L.limit(upcoming.length), [['CANCEL', L.cancelBookingBtn]]);
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
else if (!id && has(['address', 'location', 'kahan', 'timing', 'timings', 'where', 'map', 'pata'])) {
  payload = buttons((S.address ? `📍 *${C}*\n${S.address}\n\n` : '') + L.talk, [['NEW', L.bookBtn], ['LIVE', L.talkBtn]]); pin();
}
else if (id === 'TALK' || id === 'LIVE' || (!id && has(['talk', 'human', 'help', 'baat', 'live', 'chat', 'emergency', 'call']))) {
  ev(me, 'talk', 'Asked to talk to the clinic' + (raw && !id ? ': "' + raw.slice(0, 120) + '"' : ''));
  payload = buttons(L.talk, [['MC_CALL', lang === 'en' ? 'Request a call' : 'Call request karein'], ['NEW', L.bookBtn]]);
}
else {
  const faq = (S.faq || []).find(f => !id && f.keywords.some(k => has([k])));
  if (faq) {
    const answer = faq.answer === '{timings}' ? 'Clinic timings:\n' + timingsText(lang) : faq.answer;
    payload = buttons(answer, [['NEW', L.bookBtn], ['TALK', L.talkBtn]]);
  } else if (upcoming.length) {
    payload = buttons(L.yourAppts(msg.name, upcoming.map(r => `• ${r.name || 'Patient'}: ${W(r)}`).join('\n')), menuBtns());
  } else {
    payload = welcomeCard();
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
})());
