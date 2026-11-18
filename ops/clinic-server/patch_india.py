import re
p = '/home/claude/clinic-server/decide_v2.js'
s = open(p).read()
open('/home/claude/clinic-server/decide_v2_before_india.js', 'w').write(s)


def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:90], s.count(a))
    s = s.replace(a, b)


# ---------- 1) everyday copy in T (line by line) ----------
A = r"${S.address ? ', ' + S.address : ''}"
EN = {
 'pickLang': r"""    pickLang: `🙏 Which language would you like to chat in?\nAap kis bhasha mein baat karna chahenge?`,""",
 'welcome': r"""    welcome: (n, back) => (`${n ? 'Hi ' + n : 'Hi'} 👋\n\n${back ? 'Good to hear from you again.' : `Welcome to *${C}*.`} You can book a time with ${D} right here, it takes a minute. Got a question about fees, timings or a treatment? Just type it.\n\n${isOpenNow() ? 'Coming in today? Type *TOKEN* to get your token here, no standing in line.\n' : ''}${S.clinicPhone ? `Prefer to talk? 📞 ${S.clinicPhone}` : ''}`).trim(),""",
 'pickDate': r"""    pickDate: '📅 Which day suits you?',""",
 'svcChosen': r"""    svcChosen: n => `*${n}*, noted 👍\nNow pick a day.`,""",
 'waitPick': r"""    waitPick: "Which day would you like? If a spot opens up that day, we'll message you straight away.",""",
 'waitDone': r"""    waitDone: d => `✅ You're on the waiting list for *${d}*.\nIf a spot opens, you'll hear from us right here.`,""",
 'slotOpen': r"""    slotOpen: (d) => `A spot just opened up on *${d}* 🙂\nThese go quickly, so book now if you'd like it.`, bookIt: 'Book this time',""",
 'feeLine': r"""    feeLine: f => `\n*Fee:* ₹${f}, paid at the clinic. No booking charge.`,""",
 'liveOff': r"""    liveOff: 'Thank you 🙏 Message us here anytime.',""",
 'noSlots': r"""    noSlots: `Sorry, we're fully booked for the next ${S.daysAhead} days 🙏\n\nIf it's urgent, call us on 📞 ${S.clinicPhone} and we'll try to fit you in. Or join the waiting list below.`,""",
 'dayFull': r"""    dayFull: 'That day just filled up. Please pick another one.',""",
 'timesFor': r"""    timesFor: d => `⏰ Free times on *${d}*:`, timeBtn: 'Choose time', timesTitle: 'Available times', later: 'Later times',""",
 'held': r"""    held: w => `⏳ *${w}* is held for you for ${S.holdMinutes} minutes.\n\nWho is the appointment for? Tap *Myself*, or type the patient's name.`,""",
 'askName': r"""    askName: "Please type the patient's name (e.g. Riya Sharma), or tap *Myself*.",""",
 'confirmed': r"""    confirmed: (r, w) => `✅ *You're booked*\n\n*Patient:* ${r.name}\n*When:* ${w}\n*Doctor:* ${D}${r.service ? `\n*For:* ${r.service}` : ''}${S.fee ? T.en.feeLine(S.fee) : ''}\n*Booking ID:* ${bookingId(r)}\n\n📍 ${C}""" + A + r"""\n\nPlease come 10 minutes early and bring any old prescriptions or reports. We'll remind you a day before. Plans change? Use the buttons below.`,""",
 'holdCancelled': r"""    holdCancelled: "No problem, the time is released. Message us whenever you're ready.",""",
 'noUpcoming': r"""    noUpcoming: "You don't have any upcoming appointments. Type *Book* whenever you'd like one.",""",
 'cancelled': r"""    cancelled: w => `Your visit on ${w} is cancelled.\n\nHope all is well 🙏 Whenever you'd like to see ${D}, just message us here.`,""",
 'kept': r"""    kept: '👍 Done, your appointment stays as it is. See you then!',""",
 'thanksConfirm': r"""    thanksConfirm: w => `✅ Thanks for confirming. ${D} will see you on *${w}*.\n\n📍 ${C}""" + A + r"""\nPlease come 10 minutes early.`,""",
 'reschedule': r"""    reschedule: 'No problem 👍 Your old time is released. Pick a new day.',""",
 'talk': r"""    talk: `📞 You can call us on *${S.clinicPhone}*.\n\n*Clinic timings*\n${timingsText('en')}\n\nCan't talk right now? Tap the button below and we'll call you.`,""",
 'textOnly': r"""    textOnly: "Sorry, we can only read typed messages here 🙏 Type a line or pick an option below.",""",
 'yourAppts': r"""    yourAppts: (n, l) => `${n}, here are your booked visits:\n\n${l}`,""",
 'mcQ': r"""    mcQ: "Sure ✍️ Type your question here and our team will reply soon.",""",
 'mcCall': r"""    mcCall: "✅ Done, we'll call you shortly 📞",""",
 'lateMsg': r"""    lateMsg: (m, t2) => `⏳ *A quick heads-up*\n\n${D} is running about *${m} minutes* late today (an earlier case took longer).\nYour turn should now come around *${t2}*.\n\nNo need to rush or wait at the clinic. Sorry for the delay 🙏`,""",
 'leaveMsg': r"""    leaveMsg: d => `Sorry 🙏 ${D} won't be in the clinic on *${d}*.\n\nPlease pick a new time below and we'll fit you in as early as we can.`,""",
}
HL = {
 'pickLang': EN['pickLang'],
 'welcome': r"""    welcome: (n, back) => (`Namaste${n ? ' ' + n + ' ji' : ''} 🙏\n\n${back ? 'Aapse phir baat karke accha laga.' : `*${C}* mein aapka swagat hai.`} ${D} se milne ka time yahin 1 minute mein book ho jaata hai. Fees, timing ya treatment ka koi bhi sawaal ho, seedha likh dijiye.\n\n${isOpenNow() ? 'Aaj hi aana hai? *TOKEN* likhiye, line mein khade nahi rehna padega.\n' : ''}${S.clinicPhone ? `Baat karni ho toh 📞 ${S.clinicPhone}` : ''}`).trim(),""",
 'pickDate': r"""    pickDate: '📅 Kis din aana theek rahega?',""",
 'svcChosen': r"""    svcChosen: n => `*${n}* 👍\nAb din chun lijiye.`,""",
 'waitPick': r"""    waitPick: 'Kis din aana hai? Us din jagah khulte hi hum turant message kar denge.',""",
 'waitDone': r"""    waitDone: d => `✅ *${d}* ki waiting list mein aapka naam likh liya.\nJagah khulte hi yahin message aa jayega.`,""",
 'slotOpen': r"""    slotOpen: (d) => `*${d}* ko ek jagah khali hui hai 🙂\nJaldi bhar jaati hai, chahiye toh abhi book kar lijiye.`, bookIt: 'Ye time book karein',""",
 'feeLine': r"""    feeLine: f => `\n*Fees:* ₹${f}, clinic par hi dena hai. Booking ka koi charge nahi.`,""",
 'liveOff': r"""    liveOff: 'Shukriya 🙏 Kabhi bhi zaroorat ho, yahin message kar dijiye.',""",
 'noSlots': r"""    noSlots: `Sorry 🙏 agle ${S.daysAhead} din sab booked hai.\n\nUrgent ho toh 📞 ${S.clinicPhone} par call kijiye, hum koshish karenge. Ya neeche waiting list mein naam daal dijiye.`,""",
 'dayFull': r"""    dayFull: 'Ye din abhi-abhi bhar gaya. Koi aur din chun lijiye.',""",
 'timesFor': r"""    timesFor: d => `⏰ *${d}* ko ye time khali hain:`, timeBtn: 'Time chunein', timesTitle: 'Khali time', later: 'Aur time dekhein',""",
 'held': r"""    held: w => `⏳ *${w}* aapke liye ${S.holdMinutes} minute tak rok liya hai.\n\nAppointment kiske liye hai? Apne liye ho toh *Mere liye* dabaiye, nahi toh patient ka naam likh dijiye.`,""",
 'askName': r"""    askName: 'Patient ka naam likh dijiye (jaise: Riya Sharma), ya apne liye ho toh *Mere liye* dabaiye.',""",
 'confirmed': r"""    confirmed: (r, w) => `✅ *Appointment pakka ho gaya*\n\n*Patient:* ${r.name}\n*Kab:* ${w}\n*Doctor:* ${D}${r.service ? `\n*Kis liye:* ${r.service}` : ''}${S.fee ? T.hl.feeLine(S.fee) : ''}\n*Booking ID:* ${bookingId(r)}\n\n📍 ${C}""" + A + r"""\n\n10 minute pehle aa jaiye, aur purani parchi ya report ho toh saath le aaiye. Ek din pehle hum yaad dila denge. Plan badle toh neeche se badal sakte hain.`,""",
 'changeBtn': r"""    changeBtn: 'Time badlein', cancelBtn: 'Cancel karein',""",
 'holdCancelled': r"""    holdCancelled: 'Theek hai, time chhod diya. Jab mann ho, yahin message kar dijiye.',""",
 'noUpcoming': r"""    noUpcoming: 'Abhi aapka koi appointment book nahi hai. Chahiye toh *Book* likh dijiye.',""",
 'cancelled': r"""    cancelled: w => `Aapka ${w} ka appointment cancel ho gaya.\n\nAsha hai sab theek hai 🙏 Jab bhi ${D} ko dikhana ho, yahin message kar dijiye.`,""",
 'kept': r"""    kept: '👍 Theek hai, appointment waise hi hai. Milte hain!',""",
 'thanksConfirm': r"""    thanksConfirm: w => `✅ Shukriya! ${D} aapse *${w}* ko milenge.\n\n📍 ${C}""" + A + r"""\n10 minute pehle aa jaiye.`,""",
 'reschedule': r"""    reschedule: 'Koi baat nahi 👍 Purana time chhod diya. Naya din chun lijiye.',""",
 'talk': r"""    talk: `📞 *${S.clinicPhone}* par seedha call kar sakte hain.\n\n*Clinic ka time*\n${timingsText('hl')}\n\nAbhi baat nahi ho paa rahi? Neeche button dabaiye, hum khud call karenge.`,""",
 'textOnly': r"""    textOnly: 'Sorry, yahan sirf likha hua message padh paate hain 🙏 Ek line likh dijiye ya neeche se chuniye.',""",
 'yourAppts': r"""    yourAppts: (n, l) => `${n} ji, aapke booked appointments:\n\n${l}`,""",
 'mcQ': r"""    mcQ: 'Zaroor ✍️ Apna sawaal yahin likh dijiye, humari team jaldi jawab degi.',""",
 'mcCall': r"""    mcCall: '✅ Theek hai, hum aapko jaldi call karenge 📞',""",
 'lateMsg': r"""    lateMsg: (m, t2) => `⏳ *Ek zaroori baat*\n\nAaj ${D} lagbhag *${m} minute* late chal rahe hain (pichhla case lamba chala).\nAapka number ab lagbhag *${t2}* tak aayega.\n\nAaram se aaiye, clinic mein baith kar wait nahi karna padega. Sorry 🙏`,""",
 'leaveMsg': r"""    leaveMsg: d => `Sorry 🙏 ${D} *${d}* ko clinic mein nahi honge.\n\nNeeche se naya time chun lijiye, hum jaldi se jaldi time denge.`,""",
}
t0 = s.index('const T = {'); t1 = s.index('\n  hl: {', t0); t2 = s.index('\n};', t1)


def fix_block(block, D):
    lines = block.split('\n')
    done = set()
    for i, ln in enumerate(lines):
        m = re.match(r'^    (\w+): ', ln)
        if m and m.group(1) in D:
            lines[i] = D[m.group(1)]; done.add(m.group(1))
    miss = set(D) - done
    assert not miss, miss
    return '\n'.join(lines)


s = s[:t0] + fix_block(s[t0:t1], EN) + fix_block(s[t1:t2], HL) + s[t2:]

# ---------- 2) welcome: real first name, returning patient, language hint ----------
rep("""  return buttonsTo(msg.from, L.welcome(msg.name), [""",
    """  const fn = (cleanName(msg.name || '').split(' ')[0] || ''); const fn2 = fn.length >= 2 && !/^(dr|mr|mrs|ms)$/i.test(fn) ? fn : '';
  return buttonsTo(msg.from, L.welcome(fn2, mine.length > 0 || seenBefore(me)), [""")
i = s.index("function welcomeCard() {"); j = s.index("});", s.index("welcome.jpg", i))
seg = s[i:j + 3]
assert seg.endswith("} });"), seg[-40:]
seg2 = seg[:-3] + "}, lang === 'en' ? 'Hindi mein baat? Type: Hindi' : 'English mein chahiye? Likhiye: English');"
s = s[:i] + seg2 + s[j + 3:]

# ---------- 3) language: guess from their first message (no picker step) ----------
rep("""if (id.startsWith('LANG|')) { mem.lang[me] = id.split('|')[1] === 'en' ? 'en' : 'hl'; }""",
    """if (id.startsWith('LANG|')) { mem.lang[me] = id.split('|')[1] === 'en' ? 'en' : 'hl'; }
const swTxt = msg.type === 'text' ? String(msg.text || '').trim() : '';
const langSwitch = !id && /^(english|in english|hindi|hinglish|हिंदी|हिन्दी)$/i.test(swTxt);
if (langSwitch) mem.lang[me] = /^(english|in english)$/i.test(swTxt) ? 'en' : 'hl';
else if (!mem.lang[me] && !id && swTxt) { const hiW = /[\\u0900-\\u097F]/.test(swTxt) || /\\b(namaste|namaskar|ji|hai|hain|kya|kaise|kaisa|karna|chahiye|mujhe|mera|meri|aap|kab|kitna|kitne|kitni|dikhana|sahab|bhai|bhaiya|haan|nahi|nhi|hu|hoon|kal|aaj)\\b/i.test(swTxt);
  const enW = !hiW && swTxt.split(/\\s+/).length >= 3 && /\\b(i|my|want|need|would|like|appointment|please|can|is|the|book|doctor|what|when|how)\\b/i.test(swTxt); mem.lang[me] = enW ? 'en' : 'hl'; }""")
rep("""else if (!id && has(['language', 'bhasha', 'lang'])) {""",
    """else if (langSwitch) { payload = welcomeCard(); }
else if (!id && has(['language', 'bhasha', 'lang'])) {""")

# ---------- 4) voice notes and photos are welcome (Indians send them a lot) ----------
rep("""else if (!['text', 'interactive', 'button'].includes(msg.type)) { payload = buttons(L.textOnly, menuBtns()); }""",
    """else if (['audio', 'voice', 'image', 'document', 'video'].includes(msg.type)) { notify = true; const isV = ['audio', 'voice'].includes(msg.type); const why = isV ? 'Sent a voice note' : 'Sent a photo / file';
  if (!mem.callbacks) mem.callbacks = []; mem.callbacks = mem.callbacks.filter(x => x.phone !== me).concat([{ phone: me, name: msg.name || '', at: now.toISO(), reason: why }]).slice(-50); mem.cbLog = (mem.cbLog || []).concat([{ ph: me, at: now.toISO() }]).slice(-500); ev(me, 'cb', why);
  payload = buttons(lang === 'en' ? (isV ? '🎙️ Got your voice note. Someone from our team will listen to it and call you back shortly.' : '📎 Got it. Our team will have a look and call you back shortly.') + '\\n\\nWant to book a time meanwhile?' : (isV ? '🎙️ Aapka voice note mil gaya. Humari team sunkar aapko jaldi call karegi.' : '📎 Mil gaya. Humari team dekh kar aapko jaldi call karegi.') + '\\n\\nTab tak time book karna ho toh neeche dabaiye.', [['NEW', L.bookBtn]]); }
else if (!['text', 'interactive', 'button'].includes(msg.type)) { payload = buttons(L.textOnly, menuBtns()); }""")
rep("""'\\n\\n💬 So the right person can help you on the call, what is it about?\\nTap an option below, or type a line / send a voice note.'""",
    """'\\n\\nWhat is it about? Tap below, or type a line / send a voice note.'""")
rep("""'\\n\\n💬 Taaki call par sahi vyakti aapki madad kar sake, bataiye kis baare mein baat karni hai?\\nNeeche option dabaiye, ya ek line likhiye / voice note bhejiye.'""",
    """'\\n\\nBas bata dijiye baat kis baare mein hai. Neeche dabaiye, ya ek line likh dijiye / voice note bhej dijiye.'""")

# ---------- 5) reminders: short, clean, one look ----------
i = s.index("    const body = stage === 'tomorrow'"); j = s.index("    const btns = [[`RC|${r.row_number}`", i)
s = s[:i] + r"""    const nmH = r.name ? r.name + ' ji' : 'Namaste'; const nmE = r.name ? 'Hi ' + r.name : 'Hi';
    const body = stage === 'tomorrow'
      ? (lg === 'en' ? `⏰ *See you tomorrow*\n\n${nmE}, a quick reminder of your visit.\n\n*When:* ${whenText(r.date, r.time, 'en')}\n*Doctor:* ${D}\n*Booking ID:* ${bookingId(r)}\n${where}\n\nTap *Confirm* and we'll keep your time ready. Plans changed? Reschedule in one tap.`
        : `⏰ *Kal aapka appointment hai*\n\n${nmH}, bas yaad dila rahe the.\n\n*Kab:* ${whenText(r.date, r.time, 'hl')}\n*Doctor:* ${D}\n*Booking ID:* ${bookingId(r)}\n${where}\n\nAa rahe hain toh *Confirm karein* dabaiye, hum aapka time ready rakhenge. Plan badla ho toh ek tap mein time badal sakte hain.`)
      : (lg === 'en' ? `☀️ *Good morning, your visit is today*\n\n*Time:* ${timeLabel(r.date, r.time, 'en')}\n*Doctor:* ${D}\n${where}\n\nPlease come 10 minutes early and bring old prescriptions or reports. Tap *Confirm* so we know you're coming.`
        : `☀️ *Good morning! Aaj aapka appointment hai*\n\n*Time:* ${timeLabel(r.date, r.time, 'hl')}\n*Doctor:* ${D}\n${where}\n\n10 minute pehle aa jaiye, purani parchi ya report saath le aaiye. Aa rahe hain toh *Confirm karein* dabaiye.`);
""" + s[j:]
rep("""lg === 'en' ? 'Reschedule' : 'Samay badlein'""", """lg === 'en' ? 'Reschedule' : 'Time badlein'""")

# ---------- 6) plain everyday words everywhere else ----------
for a, b in [
    ("Asuvidha ke liye kshama chahte hain.", "Sorry."),
    ("Aapke dhairya ke liye dhanyavaad.", "Aapke patience ke liye shukriya."),
    ("Anumaanit intezaar", "Lagbhag wait"),
    ("Aapka naya anumaanit samay", "Ab aapka time lagbhag"),
    ("apni suvidha ka samay", "apna time"),
    ("Clinic khulne par *TOKEN* bhejiye, ya appointment book karne ke liye *Hi* bhejiye.", "Clinic khulne par *TOKEN* likhiye, ya abhi kisi aur din ka time book kar lijiye."),
    ("Agle din ke liye appointment book karne ke liye *Hi* bhejiye.", "Kisi aur din ka appointment chahiye toh *Book* likhiye."),
    ("Dhanyavaad", "Shukriya"), ("dhanyavaad", "shukriya"),
]:
    s = s.replace(a, b)
s = re.sub(r"Kripya (\w)", lambda m: m.group(1).upper(), s)
s = re.sub(r"Send \*Hi\* to b", "Type *Book* to b", s)

# ---------- 7) missed call: honest, short, human ----------
a = s.index("function missedCallMsg(to) {"); b = s.index("const IMG = S.imgBase ||")
s = s[:a] + r"""function missedCallMsg(to) {
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
""" + s[b:]
open(p, 'w').write(s)
print('ok')
