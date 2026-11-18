/* Clinic Desk — fake data that looks real. Everything here is made up. */
(function () {
  'use strict';

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const dow = s => fromIso(s).getDay();
  const noSun = s => dow(s) === 0 ? addDays(s, 1) : s;

  const TEMPLATES = {
    skin: {
      label: 'Skin & hair',
      fee: 600,
      treatments: [
        { id: 't_cons', n: 'Consultation', p: 600, cat: 'consult', gst: 0 },
        { id: 't_laser', n: 'Laser hair removal (session)', p: 2500, cat: 'procedure', gst: 18 },
        { id: 't_peel', n: 'Chemical peel', p: 3200, cat: 'procedure', gst: 18 },
        { id: 't_prp', n: 'PRP for hair', p: 4500, cat: 'procedure', gst: 18 },
        { id: 't_cryo', n: 'Wart removal (cryo)', p: 1500, cat: 'procedure', gst: 0 },
        { id: 't_micro', n: 'Microneedling', p: 3500, cat: 'procedure', gst: 18 },
        { id: 't_hydra', n: 'HydraFacial', p: 2800, cat: 'procedure', gst: 18 },
        { id: 't_patch', n: 'Patch test', p: 800, cat: 'procedure', gst: 0 },
        { id: 't_med', n: 'Medicines (counter)', p: 450, cat: 'medicine', gst: 0 }
      ],
      problems: ['acne', 'hair fall', 'melasma', 'eczema', 'pigmentation', 'fungal infection', 'psoriasis', 'warts', 'dandruff', 'dark circles', 'urticaria', 'vitiligo'],
      sets: [
        { n: 'Acne · grade 2', meds: [['Clindamycin 1% gel', 'Night · on spots · 6 weeks', 'Clindac A'], ['Adapalene 0.1% gel', 'Night · thin layer · 6 weeks', 'Deriva'], ['Salicylic acid 2% face wash', 'Twice a day · 6 weeks', 'Saslic DS']] },
        { n: 'Acne · grade 3', meds: [['Doxycycline 100 mg', '1 after dinner · 6 weeks'], ['Adapalene + BPO gel', 'Night · thin layer'], ['Salicylic face wash', 'Twice a day']] },
        { n: 'Hair fall · men', meds: [['Minoxidil 5% solution', '1 ml twice a day on scalp · 3 months', 'Tugain 5%'], ['Biotin 10 mg', '1 after breakfast · 3 months'], ['Ketoconazole 2% shampoo', 'Twice a week'], ['Iron + folic acid', '1 after lunch · 3 months']] },
        { n: 'Hair fall · women', meds: [['Minoxidil 2% solution', '1 ml twice a day'], ['Biotin 10 mg', '1 after breakfast'], ['Iron + folic acid', '1 after lunch']] },
        { n: 'Melasma', meds: [['Triple combination cream', 'Night · 2 weeks only'], ['Sunscreen SPF 50', 'Every 3 hours in the day'], ['Tranexamic acid 250 mg', '1 twice a day · 8 weeks']] },
        { n: 'Fungal infection', meds: [['Itraconazole 200 mg', '1 after lunch · 2 weeks'], ['Luliconazole 1% cream', 'Twice a day · 4 weeks'], ['Levocetirizine 5 mg', '1 at night for itching']] },
        { n: 'Eczema', meds: [['Mometasone cream', 'Twice a day · 1 week'], ['Moisturiser (ceramide)', '3 times a day'], ['Levocetirizine 5 mg', '1 at night']] },
        { n: 'Psoriasis', meds: [['Clobetasol + salicylic ointment', 'Night · on patches'], ['Coal tar shampoo', 'Twice a week'], ['Moisturiser', '3 times a day']] },
        { n: 'Dandruff', meds: [['Ketoconazole 2% shampoo', 'Twice a week · 4 weeks'], ['Zinc pyrithione lotion', 'Night on scalp']] },
        { n: 'Urticaria', meds: [['Levocetirizine 5 mg', '1 twice a day · 2 weeks'], ['Calamine lotion', 'On rash when itchy']] },
        { n: 'Pigmentation', meds: [['Azelaic acid 20% cream', 'Night'], ['Sunscreen SPF 50', 'Every 3 hours in the day'], ['Vitamin C serum', 'Morning']] },
        { n: 'Baby rash', meds: [['Calamine lotion', 'Twice a day'], ['Baby moisturiser (fragrance free)', 'After bath']] }
      ],
      words: {
        'acne': ['Cheeks pe daane 3 mahine se hain, period ke time zyada hote hain.', 'Face pe pimples hain, marks reh jaate hain.'],
        'hair fall': ['Baal bahut gir rahe hain, kanghi mein guchha aata hai.', 'Hair fall since 6 months, front se thin ho rahe hain.'],
        'melasma': ['Gaal pe bhure dhabbe hain, dhoop mein badh jaate hain.', 'Brown patches on face after pregnancy.'],
        'eczema': ['Haath pe khujli aur sukhapan hai, crack ho jaata hai.'],
        'pigmentation': ['Face pe dark spots hain, tan nahi ja raha.'],
        'fungal infection': ['Jangh ke paas gol daad hai, raat ko khujli hoti hai.', 'Ring jaisa rash hai, cream lagane se jaata nahi.'],
        'psoriasis': ['Kohni aur ghutne pe safed parat waale patches hain.'],
        'warts': ['Ungli pe massa hai, badh raha hai.'],
        'dandruff': ['Sir mein rusi aur khujli hai.'],
        'dark circles': ['Aankhon ke neeche kaale ghere hain.'],
        'urticaria': ['Body pe laal chakatte aa jaate hain, khujli hoti hai.'],
        'vitiligo': ['Haath pe safed daag aa rahe hain.']
      }
    },
    dental: {
      label: 'Dental', fee: 400,
      treatments: [
        { id: 't_cons', n: 'Consultation', p: 400, cat: 'consult', gst: 0 },
        { id: 't_clean', n: 'Scaling and cleaning', p: 1200, cat: 'procedure', gst: 0 },
        { id: 't_fill', n: 'Filling', p: 1500, cat: 'procedure', gst: 0 },
        { id: 't_rct', n: 'Root canal', p: 6500, cat: 'procedure', gst: 0 },
        { id: 't_xray', n: 'X-ray (IOPA)', p: 300, cat: 'procedure', gst: 0 },
        { id: 't_white', n: 'Teeth whitening', p: 8000, cat: 'procedure', gst: 18 }
      ],
      problems: ['tooth pain', 'cavity', 'bleeding gums', 'sensitivity', 'wisdom tooth'],
      sets: [
        { n: 'Tooth pain', meds: [['Amoxicillin 500 mg', '1 three times a day · 5 days'], ['Ibuprofen + paracetamol', '1 after food if pain']] },
        { n: 'Gum care', meds: [['Chlorhexidine mouthwash', 'Twice a day · 2 weeks'], ['Soft toothbrush', 'Twice a day']] }
      ],
      words: {}
    },
    gp: {
      label: 'General physician', fee: 400,
      treatments: [
        { id: 't_cons', n: 'Consultation', p: 400, cat: 'consult', gst: 0 },
        { id: 't_bp', n: 'BP and sugar check', p: 100, cat: 'procedure', gst: 0 },
        { id: 't_inj', n: 'Injection', p: 150, cat: 'procedure', gst: 0 },
        { id: 't_drs', n: 'Dressing', p: 200, cat: 'procedure', gst: 0 }
      ],
      problems: ['fever', 'cough', 'diabetes', 'BP', 'stomach pain'],
      sets: [
        { n: 'Viral fever', meds: [['Paracetamol 650 mg', '1 if fever · max 4 a day'], ['ORS', '1 packet in 1 litre water']] },
        { n: 'Cough and cold', meds: [['Levocetirizine 5 mg', '1 at night · 5 days'], ['Steam', 'Twice a day']] }
      ],
      words: {}
    },
    hospital: {
      label: 'Small hospital', fee: 500,
      treatments: [
        { id: 't_cons', n: 'OPD consultation', p: 500, cat: 'consult', gst: 0 },
        { id: 't_ipd', n: 'Bed charge (per day)', p: 2500, cat: 'procedure', gst: 0 },
        { id: 't_lab', n: 'Lab test (CBC)', p: 350, cat: 'procedure', gst: 0 },
        { id: 't_xr', n: 'X-ray', p: 600, cat: 'procedure', gst: 0 }
      ],
      problems: ['fever', 'injury', 'diabetes', 'BP', 'pregnancy check'],
      sets: [{ n: 'Viral fever', meds: [['Paracetamol 650 mg', '1 if fever · max 4 a day']] }],
      words: {}
    }
  };

  const MSG_EN = {
    token: '✅ You\'re booked, {name}.\n\nToken *{token}* · {doctor} · today\n\nSee your place in the queue live 👇\n{link}',
    turn: '🔔 {name}, it\'s almost your turn. Please come to the counter. Token {token}.',
    out: '{doctor} had to step out ({reason}). Back by *{until}*. Your turn is safe — we\'ll message you 10 minutes before.',
    receipt: '🧾 Bill {bill} · ₹{amount} paid by {mode}. Thank you!\n{link}',
    rx: '💊 Your prescription from {doctor} is ready.\n{link}',
    reminder: 'Hello {name}, your follow-up with {doctor} is due. Reply *1* to book, or tap: {link}',
    booked: '📅 Booked: {doctor}, {day} at {time}. Reply *C* to cancel.',
    leave: '{doctor} is on leave on {day}. Sorry! Tap to pick a new time: {link}'
  };
  const MSG_HL = {
    token: '✅ {name} ji, aapka token *{token}* hai · {doctor} · aaj\n\nLine mein aapki jagah live dekhiye 👇\n{link}',
    turn: '🔔 {name} ji, aapka number aane wala hai. Kripya counter par aa jaiye. Token {token}.',
    out: '{doctor} ko thodi der ke liye jaana pada ({reason}). *{until}* tak wapas aayengi. Aapki baari safe hai.',
    receipt: '🧾 Bill {bill} · ₹{amount} {mode} se mila. Dhanyavaad!\n{link}',
    rx: '💊 {doctor} ki parchi taiyaar hai.\n{link}',
    reminder: 'Namaste {name} ji, {doctor} se follow-up ka samay ho gaya hai. Book karne ke liye *1* likhiye: {link}',
    booked: '📅 Booked: {doctor}, {day} ko {time} baje. Cancel ke liye *C* likhiye.',
    leave: '{doctor} {day} ko chhutti par hain. Naya samay chuniye: {link}'
  };

  function blankClinic(id, name, tplKey, color, extra) {
    const T = TEMPLATES[tplKey];
    let n = 0;
    return Object.assign({
      id, name, short: name.split(' ')[0], tpl: tplKey, color: color || '#8A6A1F',
      logo: name[0].toUpperCase(), slug: id,
      gstin: '', billPrefix: name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() + '/',
      billNo: 1001, lang: 'en', fee: T.fee, freeDays: 30,
      timings: 'Mon–Sat · 10 am – 2 pm',
      treatments: JSON.parse(JSON.stringify(T.treatments)),
      sets: T.sets.map(s => ({ id: 's' + (++n), n: s.n, meds: s.meds.map(m => (m[2] ? { n: m[0], how: m[1], brand: m[2] } : { n: m[0], how: m[1] })), used: 0 })),
      float: 2000, expenses: [], rxLang: 'hi',
      doctors: [], staff: [], patients: [], visits: [], bills: [], rx: [], appts: [], calls: [], inbox: [], reports: [], cashDays: [], refs: [], leaves: [], log: [],
      perms: { discount: false, refund: true, editBill: false, money: false },
      boxes: { r_appt: true, r_close: true, d_sets: true, p_reports: true, p_pay: false },
      msgs: { en: Object.assign({}, MSG_EN), hl: Object.assign({}, MSG_HL) },
      status: 'Live', created: null
    }, extra || {});
  }

  function seedAarna(today) {
    const R = rng(20261119);
    const pick = a => a[Math.floor(R() * a.length)];
    const between = (a, b) => a + Math.floor(R() * (b - a + 1));
    const c = blankClinic('aarna', 'Aarna Skin & Hair Clinic', 'skin', '#8A6A1F', {
      short: 'Aarna', gstin: '09ABCDE1234F1Z5', address: 'B-14, Sector 18 Market, Noida 201301', phone: '0120 456 7890', billPrefix: 'AA/', billNo: 1001,
      timings: 'Mon–Sat · 10 am – 2 pm and 5 – 8 pm · Sunday off'
    });
    c.doctors = [
      { id: 'neha', name: 'Dr. Neha Verma', short: 'Dr. Neha', spec: 'Skin', she: true, from: 600, to: 840, days: 'Mon–Sat', status: 'in', out: null, share: 0.6, deg: 'MBBS, MD (Dermatology)', reg: 'DMC/R/48213', council: 'Delhi Medical Council' },
      { id: 'arjun', name: 'Dr. Arjun Mehta', short: 'Dr. Arjun', spec: 'Hair', she: false, from: 1020, to: 1200, days: 'Mon–Sat', status: 'later', out: null, share: 0.5, visiting: true, deg: 'MBBS, DNB (Dermatology)', reg: 'UPMC/61027', council: 'UP Medical Council' }
    ];
    c.staff = [
      { id: 'priya', name: 'Priya', role: 'Reception', since: '9:30' },
      { id: 'neha', name: 'Dr. Neha Verma', role: 'Doctor', since: '' },
      { id: 'arjun', name: 'Dr. Arjun Mehta', role: 'Doctor', since: '' }
    ];

    const fF = ['Riya', 'Ananya', 'Harpreet', 'Neelam', 'Sunita', 'Kavya', 'Tanvi', 'Meera', 'Sneha', 'Pooja', 'Anjali', 'Kiran', 'Shabana', 'Nisha', 'Priyanka', 'Ritu', 'Simran', 'Deepika', 'Farah', 'Shalini', 'Megha', 'Ayesha', 'Divya', 'Komal', 'Swati', 'Jyoti', 'Rashmi', 'Nandini', 'Ishita', 'Bhavna'];
    const fM = ['Pankaj', 'Ramesh', 'Harish', 'Imran', 'Vikram', 'Rohit', 'Arif', 'Sameer', 'Nikhil', 'Amit', 'Rahul', 'Sanjay', 'Deepak', 'Gurpreet', 'Manoj', 'Aakash', 'Faizan', 'Varun', 'Kunal', 'Ajay', 'Suresh', 'Tarun', 'Yash', 'Mohit', 'Irfan'];
    const sur = ['Sharma', 'Gupta', 'Kaur', 'Joshi', 'Devi', 'Iyer', 'Arora', 'Pillai', 'Kapoor', 'Rawat', 'Sinha', 'Malik', 'Begum', 'Yadav', 'Kumar', 'Malhotra', 'Qureshi', 'Rana', 'Bansal', 'Khan', 'Singh', 'Verma', 'Chauhan', 'Agarwal', 'Mishra', 'Tiwari', 'Saxena', 'Bhatia', 'Chopra', 'Nair'];
    const sources = ['WhatsApp bot', 'WhatsApp bot', 'WhatsApp bot', 'Missed call', 'Missed call', 'Walk-in', 'Walk-in', 'Referral', 'Instagram'];
    const T = TEMPLATES.skin;

    let pidN = 0;
    const used = new Set();
    function mkPatient(name, sex, age, extra) {
      const id = 'p' + (++pidN);
      let ph;
      do { ph = pick(['98', '97', '99', '96', '88', '70', '93', '81', '78', '95']) + String(between(10000000, 99999999)); } while (used.has(ph));
      used.add(ph);
      const problem = pick(T.problems);
      const p = Object.assign({ id, name, sex, age, phone: ph, rel: '', since: addDays(today, -between(1, 400)), source: pick(sources), problem, words: pick(T.words[problem] || ['—']), allergies: 'None told', outcome: pick(['Better', 'Better', 'Much better', 'Same', 'Lost']), doc: R() < 0.8 ? 'neha' : 'arjun' }, extra || {});
      c.patients.push(p);
      return p;
    }

    // Named patients from the approved mockups (kept consistent)
    const named = {};
    const N = (key, name, sex, age, extra) => { named[key] = mkPatient(name, sex, age, extra); };
    N('riya', 'Riya Sharma', 'F', 29, { rel: 'D/O Rajesh', problem: 'acne', words: 'Cheeks aur jaw pe daane, marks reh jaate hain.', since: addDays(today, -110), source: 'WhatsApp bot', outcome: 'Better', phone: '9781408816' });
    N('ananya', 'Ananya Gupta', 'F', 22, { problem: 'acne', words: 'Cheeks pe daane 3 mahine se hain, period ke time zyada hote hain.', since: today, source: 'WhatsApp bot' });
    N('harpreet', 'Harpreet Kaur', 'F', 45, { rel: 'W/O Gurdeep', problem: 'pigmentation', words: 'Gaal pe dark patches, 1 saal se.', since: today, source: 'Referral' });
    N('ramesh', 'Ramesh Kumar', 'M', 62, { rel: 'S/O Shiv Narayan', problem: 'eczema', words: 'Haath pe khujli aur crack.', since: addDays(today, -95) });
    N('neelam', 'Neelam Joshi', 'F', 38, { problem: 'hair fall', words: 'Baal bahut gir rahe hain.', since: today, source: 'WhatsApp bot' });
    N('harish', 'Harish Malhotra', 'M', 52, { problem: 'eczema', since: addDays(today, -120) });
    N('pankaj', 'Pankaj Yadav', 'M', 33, { problem: 'hair fall', words: 'Laser session 3.', since: addDays(today, -70) });
    N('sunita', 'Sunita Devi', 'F', 56, { rel: 'W/O Ram Prasad', problem: 'melasma', outcome: 'Much better', since: addDays(today, -160) });
    N('imran', 'Imran Qureshi', 'M', 36, { problem: 'hair fall', since: addDays(today, -60) });
    N('kavya', 'Kavya Iyer', 'F', 0, { rel: 'D/O Arvind', ageText: '7 m', problem: 'eczema', words: 'Baby ko rash hai.', since: addDays(today, -5) });
    N('tanvi', 'Tanvi Arora', 'F', 31, { problem: 'pigmentation', since: addDays(today, -80) });
    N('meera', 'Meera Pillai', 'F', 40, { problem: 'melasma', since: today, outcome: '' });
    N('nikhil', 'Nikhil Arora', 'M', 27, { problem: 'hair fall', since: today });
    N('shabana', 'Shabana Begum', 'F', 48, { problem: 'fungal infection', since: today });
    N('sneha', 'Sneha Kapoor', 'F', 26, { problem: 'acne', since: today, source: 'Missed call' });
    N('vikram', 'Vikram Rana', 'M', 41, { problem: 'hair fall', doc: 'arjun' });
    N('arif', 'Mohd. Arif', 'M', 41, { rel: 'S/O Ishaq', problem: 'hair fall' });
    N('sameer', 'Sameer Khan', 'M', 27, { problem: 'hair fall' });
    // duplicate entry (same phone) for "merge duplicates"
    const dup = mkPatient('Ramesh Kr.', 'M', 62, { phone: named.ramesh.phone, since: addDays(today, -40), problem: 'eczema', dupOf: named.ramesh.id });
    used.add(named.riya.phone);

    for (let i = 0; i < 70; i++) {
      const sex = R() < 0.6 ? 'F' : 'M';
      const name = (sex === 'F' ? pick(fF) : pick(fM)) + ' ' + pick(sur);
      mkPatient(name, sex, between(18, 64));
    }

    // ---------- past 90 days of visits and bills ----------
    const pool = c.patients.filter(p => !['ananya', 'harpreet', 'neelam', 'meera', 'nikhil', 'shabana', 'sneha'].some(k => named[k] && named[k].id === p.id) && !p.dupOf);
    let billNo = 1001;
    const procs = c.treatments.filter(t => t.cat === 'procedure');
    function addBill(date, time, p, items, mode, extra) {
      const total = items.reduce((s, x) => s + x.amt, 0);
      const b = Object.assign({ no: c.billPrefix + (billNo++), date, time, pid: p.id, items, total, mode, by: 'Priya', refund: null }, extra || {});
      c.bills.push(b);
      return b;
    }
    const lastVisit = {};
    for (let back = 90; back >= 1; back--) {
      const d = addDays(today, -back);
      if (dow(d) === 0) continue;
      const count = between(14, 26);
      for (let k = 0; k < count; k++) {
        let p;
        if (R() < 0.34) { const sx = R() < 0.6 ? 'F' : 'M'; p = mkPatient((sx === 'F' ? pick(fF) : pick(fM)) + ' ' + pick(sur), sx, between(16, 66), { since: d }); pool.push(p); }
        else p = pick(pool);
        const doc = p.doc;
        const t = doc === 'neha' ? between(600, 830) : between(1020, 1190);
        const prev = lastVisit[p.id];
        const kind = !prev ? (p.since >= addDays(d, -1) ? 'new' : 'follow') : (R() < 0.25 ? 'proc' : 'follow');
        c.visits.push({ date: d, time: t, pid: p.id, doc, kind, status: 'done' });
        const mode = R() < 0.5 ? 'UPI' : (R() < 0.85 ? 'Cash' : 'Card');
        let items = [];
        if (kind === 'new') items.push({ n: 'Consultation', amt: c.fee, cat: 'consult', gst: 0 });
        else if (kind === 'follow') { if (!prev || (fromIso(d) - fromIso(prev)) / 864e5 > c.freeDays) items.push({ n: 'Consultation (follow-up)', amt: c.fee, cat: 'consult', gst: 0 }); }
        else { const tr = pick(procs); items.push({ n: tr.n, amt: tr.p, cat: 'procedure', gst: tr.gst }); }
        if (R() < 0.35) items.push({ n: 'Medicines (counter)', amt: pick([250, 350, 450, 600, 850]), cat: 'medicine', gst: 0 });
        if (items.length) addBill(d, t + 4, p, items, mode);
        lastVisit[p.id] = d;
      }
    }
    // one refund last week + one changed bill
    const rb = c.bills[c.bills.length - 30];
    rb.refund = { amt: rb.total, reason: 'Patient left before seeing doctor', by: 'Priya', date: rb.date, time: rb.time + 40 };
    c.log.push({ date: rb.date, time: rb.time + 40, who: 'Priya', what: 'Refunded ' + rb.no + ' (₹' + rb.total + ')', why: rb.refund.reason });
    const cb = c.bills[c.bills.length - 12];
    c.log.push({ date: cb.date, time: cb.time + 15, who: 'Priya', what: 'Changed payment of ' + cb.no + ' from Cash to UPI', why: 'Patient paid by UPI later' });

    // Rx history: latest visit of each patient gets a prescription
    const setFor = prob => c.sets.find(s => s.n.toLowerCase().startsWith(prob.split(' ')[0])) || c.sets[0];
    const lastByP = {};
    c.visits.forEach(v => { lastByP[v.pid] = v; });
    Object.values(lastByP).forEach(v => {
      const p = c.patients.find(x => x.id === v.pid);
      const s = setFor(p.problem);
      s.used++;
      c.rx.push({ id: 'rx' + c.rx.length, pid: p.id, date: v.date, doc: v.doc, finding: p.problem[0].toUpperCase() + p.problem.slice(1), meds: s.meds.map(m => Object.assign({}, m)), advice: 'Follow the medicines as written. Avoid scratching.', follow: noSun(addDays(v.date, pick([14, 28, 28, 42]))) });
    });

    // Some patients stopped coming: their follow-ups are now overdue
    const quiet = pool.filter(p => !Object.values(named).includes(p)).slice(0, 18);
    quiet.forEach(p => {
      const cutoff = addDays(today, -between(20, 85));
      c.visits = c.visits.filter(v => !(v.pid === p.id && v.date > cutoff));
      c.bills = c.bills.filter(b => !(b.pid === p.id && b.date > cutoff));
      c.rx = c.rx.filter(r => r.pid !== p.id);
      const lv = c.visits.filter(v => v.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1)[0];
      if (!lv) return;
      const s = setFor(p.problem);
      c.rx.push({ id: 'rxq' + p.id, pid: p.id, date: lv.date, doc: lv.doc, finding: p.problem[0].toUpperCase() + p.problem.slice(1), meds: s.meds.map(m => Object.assign({}, m)), advice: 'Follow the medicines as written.', follow: noSun(addDays(lv.date, pick([14, 28, 28]))) });
      p.outcome = pick(['Lost', 'Better', 'Same']);
    });
    const quietIds = new Set(quiet.map(p => p.id));

    // Fix the story of named patients
    const setLast = (key, daysAgo, follow) => {
      const p = named[key];
      c.visits = c.visits.filter(v => !(v.pid === p.id && v.date > addDays(today, -daysAgo)));
      const v = { date: addDays(today, -daysAgo), time: 660, pid: p.id, doc: p.doc, kind: 'follow', status: 'done' };
      c.visits.push(v);
      c.rx = c.rx.filter(r => r.pid !== p.id);
      const s = setFor(p.problem);
      c.rx.push({ id: 'rx' + c.rx.length + key, pid: p.id, date: v.date, doc: p.doc, finding: p.problem[0].toUpperCase() + p.problem.slice(1), meds: s.meds.map(m => Object.assign({}, m)), advice: 'Follow the medicines as written.', follow: noSun(addDays(v.date, follow)) });
    };
    setLast('riya', 46, 28);
    setLast('harish', 77, 28);
    setLast('sunita', 49, 14);
    setLast('imran', 25, 28);
    setLast('kavya', 5, 10);
    setLast('tanvi', 21, 28);
    setLast('ramesh', 60, 30);
    setLast('pankaj', 28, 28);
    // Riya: acne grade 2 specifically
    const rr = c.rx.find(r => r.pid === named.riya.id); rr.finding = 'Acne vulgaris, grade 2 — cheeks and jaw'; rr.vitals = { wt: '58', bp: '112/74' }; rr.tests = ['Testosterone (total)', 'Fasting insulin']; named.riya.wt = '58'; rr.meds = c.sets[0].meds.map(m => Object.assign({}, m));
    c.bills.push({ no: c.billPrefix + (billNo++), date: addDays(today, -46), time: 672, pid: named.riya.id, items: [{ n: 'Consultation (follow-up)', amt: 600, cat: 'consult', gst: 0 }], total: 600, mode: 'UPI', by: 'Priya', refund: null });
    c.bills.push({ no: c.billPrefix + (billNo++), date: addDays(today, -60), time: 700, pid: named.riya.id, items: [{ n: 'Chemical peel', amt: 3200, cat: 'procedure', gst: 18 }], total: 3200, mode: 'Card', by: 'Priya', refund: null });

    // ---------- today ----------
    const others = pool.filter(p => !Object.values(named).includes(p) && !quietIds.has(p.id));
    let tok = 0;
    const visitToday = (p, time, kind, status, doc, billItems, mode, extra) => {
      tok++;
      const v = Object.assign({ date: today, time, pid: p.id, doc: doc || 'neha', kind, status, tok: 'A-' + tok }, extra || {});
      c.visits.push(v);
      if (billItems) { const b = addBill(today, time + 1, p, billItems, mode); v.bill = b.no; }
      return v;
    };
    const cons = [{ n: 'Consultation', amt: 600, cat: 'consult', gst: 0 }];
    const used2 = new Set();
    const nextOther = () => { if (used2.size >= others.length) used2.clear(); let p; do { p = pick(others); } while (used2.has(p.id)); used2.add(p.id); return p; };
    const startTimes = [602, 606, 611, 617, 622, 628, 633, 639, 641, 646, 651, 655, 659, 662, 664, 668, 671, 675];
    for (let i = 0; i < 16; i++) {
      const kind = R() < 0.4 ? 'new' : 'follow';
      let p;
      if (kind === 'new') { const sx = R() < 0.6 ? 'F' : 'M'; p = mkPatient((sx === 'F' ? pick(fF) : pick(fM)) + ' ' + pick(sur), sx, between(17, 60), { since: today }); }
      else p = nextOther();
      const items = kind === 'new' || R() < 0.5 ? cons.map(x => Object.assign({}, x)) : null;
      if (items && R() < 0.3) items.push({ n: 'Medicines (counter)', amt: pick([350, 450, 600]), cat: 'medicine', gst: 0 });
      visitToday(p, startTimes[i], kind, 'done', 'neha', items, R() < 0.5 ? 'UPI' : 'Cash');
    }
    visitToday(named.sameer, 651, 'new', 'left', 'neha', cons.map(x => Object.assign({}, x)), 'Cash');
    const sb = c.bills[c.bills.length - 1]; sb.refund = { amt: 600, reason: 'Could not wait, left for office', by: 'Priya', date: today, time: 718 };
    c.log.push({ date: today, time: 718, who: 'Priya', what: 'Refunded ' + sb.no + ' (₹600)', why: 'Could not wait, left for office' });
    visitToday(named.arif, 662, 'new', 'done', 'neha', cons.map(x => Object.assign({}, x)), 'Cash');
    visitToday(named.sunita, 669, 'follow', 'done', 'neha', cons.map(x => Object.assign({}, x)), 'Cash');
    visitToday(named.kavya, 675, 'new', 'done', 'neha', cons.map(x => Object.assign({}, x)), 'UPI');
    visitToday(named.tanvi, 680, 'proc', 'done', 'neha', [{ n: 'Chemical peel', amt: 3200, cat: 'procedure', gst: 18 }], 'Card');
    visitToday(named.pankaj, 681, 'proc', 'cabin', 'neha', [{ n: 'Laser hair removal (session)', amt: 2500, cat: 'procedure', gst: 18 }], 'UPI', { started: 696 });
    visitToday(named.ananya, 684, 'new', 'waiting', 'neha', cons.map(x => Object.assign({}, x)), 'UPI');
    visitToday(named.riya, 684, 'follow', 'waiting', 'neha', null);
    visitToday(named.harpreet, 691, 'new', 'waiting', 'neha', cons.map(x => Object.assign({}, x)), 'Cash');
    visitToday(named.ramesh, 693, 'follow', 'waiting', 'neha', null);
    visitToday(named.neelam, 698, 'new', 'waiting', 'neha', null, null, { booked: 720 });
    visitToday(named.harish, 735, 'follow', 'booked', 'neha', null, null, { booked: 735 });
    c.tokNext = tok + 1;

    // Appointments (future + today later)
    const A = (date, time, p, doc, src) => c.appts.push({ id: 'a' + c.appts.length, date, time, pid: p.id, doc, src });
    A(today, 1020, named.vikram, 'arjun', 'WhatsApp');
    A(today, 1050, nextOther(), 'arjun', 'Phone call');
    A(today, 1080, named.sneha, 'arjun', 'Missed call → WhatsApp');
    A(today, 1140, nextOther(), 'arjun', 'WhatsApp');
    A(today, 1110, named.imran, 'arjun', 'WhatsApp');
    const tmr = addDays(today, dow(addDays(today, 1)) === 0 ? 2 : 1);
    [[600, 'WhatsApp'], [630, 'WhatsApp'], [660, 'Phone call'], [720, 'WhatsApp'], [780, 'Walk-in call'], [1020, 'WhatsApp'], [1080, 'Missed call → WhatsApp'], [1140, 'WhatsApp']].forEach(([t, s]) => A(tmr, t, nextOther(), t >= 1020 ? 'arjun' : 'neha', s));
    A(tmr, 690, named.tanvi, 'neha', 'WhatsApp');
    for (let i = 2; i <= 9; i++) {
      const d = addDays(today, i); if (dow(d) === 0) continue;
      const n = between(3, 7);
      for (let k = 0; k < n; k++) { const t = pick([600, 630, 660, 690, 720, 750, 780, 1020, 1050, 1080, 1110, 1140]); A(d, t, nextOther(), t >= 1020 ? 'arjun' : 'neha', pick(['WhatsApp', 'WhatsApp', 'Phone call', 'Missed call → WhatsApp'])); }
    }

    // Calls to return
    c.calls = [
      { id: 'c1', pid: named.nikhil.id, name: 'Nikhil Arora', phone: named.nikhil.phone, why: 'Wants to know the price of laser hair removal', when: 691, how: 'on WhatsApp', done: false },
      { id: 'c2', pid: named.shabana.id, name: 'Shabana Begum', phone: named.shabana.phone, why: 'Sent a voice note the bot could not understand', when: 672, how: 'voice note · 0:42', done: false },
      { id: 'c3', pid: null, name: 'Unknown', phone: '9311061177', why: 'Missed call, did not reply to WhatsApp', when: 658, how: 'tried once', done: false },
      { id: 'c4', pid: named.meera.id, name: 'Meera Pillai', phone: named.meera.phone, why: 'Asked if a female doctor is available on Sunday', when: 640, how: 'on WhatsApp', done: false }
    ];

    // WhatsApp inbox (what the bot did today)
    const I = (time, pid, kind, text) => c.inbox.push({ date: today, time, pid, kind, text });
    I(602, null, 'Reminder', '14 patients reminded about today\'s appointments');
    I(620, named.sneha.id, 'Booked by bot', 'Missed call at 10:20 → WhatsApp → booked Dr. Arjun, today 6 pm');
    I(590, named.harpreet.id, 'Report received', 'Uploaded a thyroid report. Attached to her file for Dr. Neha.');
    I(640, named.meera.id, 'Question', '"Kya Sunday ko bhi khula hai?" Bot answered timings; she asked for a female doctor.');
    const tk = (pid, name, t) => c.inbox.push({ date: today, time: 684, pid, kind: 'Token sent', out: true, text: '✅ You\'re booked, ' + name + '.\n\nToken ' + t + ' · Dr. Neha Verma · today\n\nSee your place in the queue live 👇\ndesk.bas30din.com/aarna/' + name.toLowerCase() });
    tk(named.riya.id, 'Riya', 'A-24'); tk(named.ananya.id, 'Ananya', 'A-23');

    // Reports
    c.reports = [
      { id: 'r1', pid: named.harpreet.id, name: 'Thyroid test (TSH)', date: today, time: 590, seen: false, values: [['TSH', '6.8 mIU/L', 'High (normal 0.4–4.0)'], ['Free T4', '0.9 ng/dL', 'Normal'], ['Free T3', '2.9 pg/mL', 'Normal']] },
      { id: 'r2', pid: named.pankaj.id, name: 'Patch test photo', date: addDays(today, -1), time: 1100, seen: false, values: [['Reaction at 48 h', 'None', 'Safe to continue']] },
      { id: 'r3', pid: named.riya.id, name: 'Hormone test (PCOD)', date: addDays(today, -60), time: 700, seen: true, values: [['Testosterone', '52 ng/dL', 'Slightly high'], ['LH/FSH ratio', '2.4', 'High']] },
      { id: 'r4', pid: named.riya.id, name: 'Skin photo · before', date: addDays(today, -46), time: 660, seen: true, values: [['Photo', 'Cheeks and jaw', 'For before/after']] }
    ];

    // Expenses: petty cash from the drawer every day + monthly bills paid from the bank
    for (let back = 92; back >= 0; back--) {
      const d = addDays(today, -back); if (dow(d) === 0) continue;
      c.expenses.push({ id: 'e' + c.expenses.length, date: d, time: 660, amt: pick([120, 150, 180, 200]), what: 'Tea and snacks', from: 'drawer', by: 'Priya' });
      if (R() < 0.3) c.expenses.push({ id: 'e' + c.expenses.length, date: d, time: 900, amt: pick([60, 90, 120, 250]), what: pick(['Courier', 'Stationery', 'Cleaning supplies', 'Auto fare']), from: 'drawer', by: 'Priya' });
      const dd = Number(d.slice(8));
      const B = (what, amt) => c.expenses.push({ id: 'e' + c.expenses.length, date: d, time: 600, amt, what, from: 'bank', by: 'Owner' });
      const firstOpen = dd === 1 || (dd === 2 && dow(addDays(d, -1)) === 0);
      if (firstOpen) { B('Rent', 45000); B('Salaries (Priya, nurse, cleaner)', 38000); B('Clinic Desk + WhatsApp', 2999); }
      if (dd === 5 || (dd === 6 && dow(addDays(d, -1)) === 0)) B('Electricity', between(5800, 7400));
      if (dd === 10 || (dd === 11 && dow(addDays(d, -1)) === 0)) B('Consumables (peels, gels, gloves)', between(15000, 21000));
      if (dd === 15 || (dd === 16 && dow(addDays(d, -1)) === 0)) B('Laser machine EMI', 22000);
    }
    c.expenses = c.expenses.filter(x => !(x.date === today && x.time > 702));

    // Cash days (last 7 working days)
    let d = today, k = 0;
    while (k < 7) {
      d = addDays(d, -1); if (dow(d) === 0) continue;
      const petty = c.expenses.filter(x => x.date === d && x.from === 'drawer').reduce((s, x) => s + x.amt, 0);
      const expected = c.float + c.bills.filter(b => b.date === d && b.mode === 'Cash').reduce((s, b) => s + b.total - (b.refund ? b.refund.amt : 0), 0) - petty;
      const short = k === 0 ? 200 : 0;
      c.cashDays.push({ date: d, expected, counted: expected - short, diff: -short, note: short ? '₹200 change diya, bill nahi bana' : '', by: 'Priya', checked: !short });
      k++;
    }

    // Referrals this month
    c.refs = [
      { id: 'f1', name: 'Dr. Sanjay (GP, Sector 12)', what: '6 patients this month', amt: 2160, paid: false },
      { id: 'f2', name: 'City Path Lab', what: '9 tests sent', amt: 1350, paid: false },
      { id: 'f3', name: 'Raju (PRO)', what: '4 patients', amt: 1200, paid: false },
      { id: 'f4', name: 'Ambulance · Ravi', what: '2 trips', amt: 750, paid: false }
    ];
    c.billNo = billNo;
    c.created = addDays(today, -400);
    c.named = Object.fromEntries(Object.entries(named).map(([k, p]) => [k, p.id]));
    return c;
  }

  function seedAll() {
    const today = iso(new Date());
    const aarna = seedAarna(today);
    return {
      ver: 4, today, clock: 702,
      active: 'aarna',
      clinics: { aarna },
      patientAuth: {},
      dayClosed: {}
    };
  }

  function newClinic(id, name, tplKey, color, doctors, staff, phone, today) {
    const c = blankClinic(id, name, tplKey, color);
    c.doctors = doctors.map((d, i) => ({ id: 'd' + i, name: d.name, short: d.name.replace(/^Dr\.?\s*/, 'Dr. ').split(' ').slice(0, 2).join(' '), spec: d.spec || '', she: !!d.she, from: d.from || 600, to: d.to || 840, days: 'Mon–Sat', status: 'in', out: null, share: 0.6 }));
    c.staff = staff.map((s, i) => ({ id: 'st' + i, name: s.name, role: s.role, since: '' }));
    c.waPhone = phone;
    c.created = today;
    c.tokNext = 1;
    c.named = {};
    return c;
  }

  window.CD_DATA = { seedAll, newClinic, TEMPLATES, addDays, dow, fromIso, iso, MSG_EN, MSG_HL };
})();
