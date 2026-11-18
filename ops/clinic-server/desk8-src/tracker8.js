  function tracker(k) {
    var st = { d: null, at: null, err: false };
    var E = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    document.title = 'Your token';
    var css = document.createElement('style');
    css.textContent = "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap');" +
      'body{margin:0;background:#F6F2EA}' +
      '.pt{font-family:"IBM Plex Sans",system-ui,sans-serif;color:#16213A;max-width:480px;margin:0 auto;min-height:100vh;padding:calc(env(safe-area-inset-top) + 18px) 16px calc(env(safe-area-inset-bottom) + 28px);box-sizing:border-box;display:flex;flex-direction:column;gap:14px}' +
      '.pt *{box-sizing:border-box}.pt .sf{font-family:"Newsreader",Georgia,serif}' +
      '.pt .hd{display:flex;align-items:center;gap:12px}.pt .lg{width:42px;height:42px;border-radius:50%;border:1.5px solid var(--b);color:var(--b);display:flex;align-items:center;justify-content:center;font-family:"Newsreader",serif;font-size:21px;font-weight:600;background:#FFF}' +
      '.pt .cn{font-family:"Newsreader",serif;font-size:21px;font-weight:600;line-height:1.15}.pt .dn{font-size:14px;color:#5B6474}' +
      '.pt .card{background:#FFF;border:1px solid #E2DACB;border-radius:20px;padding:18px}' +
      '.pt .tk{text-align:center;padding:24px 18px 22px}.pt .tl{font-size:14px;color:#5B6474;letter-spacing:.3px}.pt .tn{font-family:"Newsreader",serif;font-size:76px;font-weight:600;line-height:1;margin:6px 0 10px;color:var(--b)}' +
      '.pt .stt{font-size:20px;font-weight:600;line-height:1.3}.pt .sts{font-size:15px;color:#5B6474;margin-top:4px}' +
      '.pt .go{background:#E8F5EE;border-color:#B7DEC8}.pt .go .tn,.pt .go .stt{color:#1D7A4C}' +
      '.pt .warn{background:#FFF6E5;border:1px solid #F1D49A;color:#7A4B00;border-radius:16px;padding:14px 16px;font-size:15px;line-height:1.45}' +
      '.pt .trw{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}.pt .tr{display:flex;align-items:flex-end;gap:6px;width:max-content;padding:4px 2px 0}' +
      '.pt .co{position:relative;min-width:52px;padding:0 6px;height:46px;border-radius:10px 10px 5px 5px;border:1.5px solid #D8D0C0;background:#FFF;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:#5B6474}' +
      '.pt .co:before,.pt .co:after{content:"";position:absolute;bottom:-5px;width:9px;height:9px;border-radius:50%;background:#16213A}.pt .co:before{left:9px}.pt .co:after{right:9px}' +
      '.pt .co.you{background:var(--b);border-color:var(--b);color:#FFF;flex-direction:column;line-height:1.1}.pt .co.you small{font-size:11px;font-weight:500;opacity:.9}' +
      '.pt .co.en{min-width:88px;height:58px;background:#16213A;border-color:#16213A;color:#FFF;flex-direction:column;border-radius:16px 22px 6px 6px;font-size:13px;line-height:1.15}.pt .co.en small{font-size:11px;opacity:.75;font-weight:500}' +
      '.pt .rail{height:2px;background:#CFC5B3;margin-top:8px;border-radius:2px}' +
      '.pt .lgd{display:flex;justify-content:space-between;font-size:12px;color:#8A8F99;margin-top:8px}' +
      '.pt .note{font-size:14px;color:#4A5468;line-height:1.5;display:flex;gap:10px;align-items:flex-start}' +
      '.pt .acts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pt .bt{height:50px;border-radius:14px;border:1.5px solid #D8D0C0;background:#FFF;color:#16213A;font:600 16px "IBM Plex Sans",sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;cursor:pointer}' +
      '.pt .bt.cx{grid-column:1/-1;color:#8E2A22;border-color:#E8B9B4;background:transparent}' +
      '.pt .ft{text-align:center;font-size:12px;color:#8A8F99}';
    document.head.appendChild(css);
    function draw() {
      var d = st.d;
      if (!d) { $app.innerHTML = '<div class="pt"><div class="card tk"><div class="tl">Loading…</div></div></div>'; return; }
      if (!d.ok) { $app.innerHTML = '<div class="pt"><div class="card tk"><div class="stt sf">Ye token ab active nahi hai</div><div class="sts">This token is no longer active. Send TOKEN on WhatsApp for a new one.</div></div></div>'; return; }
      var en = d.lang === 'en', b = d.brand || {}, a = d.ahead, T = function (e, h) { return en ? e : h; };
      var tok = String(d.tok || ''), cls = 'card tk', head, sub;
      if (d.st === 's') { cls += ' go'; head = T("It's your turn", 'Aapki baari aa gayi'); sub = T('Please go in to the doctor 🙏', 'Kripya doctor ke paas andar jaiye 🙏'); }
      else if (d.st === 'd') { head = T('Visit done', 'Aapka visit ho gaya'); sub = T('Thank you for visiting. Get well soon!', 'Aane ke liye dhanyavaad. Jaldi theek ho jaiye!'); }
      else if (d.st === 'x') { head = T('Token cancelled', 'Token cancel ho gaya'); sub = T('Send TOKEN on WhatsApp if you need a new one.', 'Naya token chahiye to WhatsApp par TOKEN bhejiye.'); }
      else if (a <= 1) { head = T('You are next', 'Agla number aapka hai'); sub = T('Please come to the waiting room now', 'Kripya abhi waiting room mein aa jaiye'); }
      else { head = T(a + ' patients before you', 'Aapse pehle ' + a + ' patients'); sub = (d.eta ? T('Your turn in ', 'Aapki baari ') + E(d.eta) + T('', ' mein') + ' · ' : '') + (a === 2 ? T('please start coming', 'clinic ki taraf aana shuru karein') : T('no need to wait here', 'yahan rukne ki zaroorat nahi')); }
      var banner = d.doc && d.doc.status && d.doc.status !== 'in' && d.st === 'w' ? '<div class="warn">' + E(d.doc.line) + '</div>' : '';
      var train = '';
      if (d.st === 'w') {
        var line = (d.line || []).slice(), i = line.indexOf(tok); if (i < 0) { line.push(tok); i = line.length - 1; }
        var show = i <= 3 ? line.slice(0, Math.min(line.length, i + 2)) : line.slice(0, 2).concat(['+' + (i - 2)], [tok]);
        show = show.reverse();
        var co = show.map(function (t) { return t === tok ? '<div class="co you">' + E(t) + '<small>' + T('You', 'Aap') + '</small></div>' : t.charAt(0) === '+' ? '<div class="co" style="border-style:dashed;min-width:48px">' + E(t) + '</div>' : '<div class="co">' + E(t) + '</div>'; }).join('');
        var out = d.doc && d.doc.status && d.doc.status !== 'in';
        var eng = '<div class="co en">' + (out ? T('Doctor out', 'Doctor bahar') : d.now ? E(d.now) : T('Free', 'Khali')) + '<small>' + T("Doctor's cabin", 'Doctor ka cabin') + '</small></div>';
        train = '<div class="card"><div class="tl" style="margin-bottom:10px">' + T('Live queue', 'Live line') + '</div><div class="trw" id="trw"><div class="tr">' + co + eng + '</div><div class="rail"></div></div><div class="lgd"><span>' + T('Last', 'Peeche') + '</span><span>' + T('Going in →', 'Andar ja rahe →') + '</span></div></div>';
      }
      var note = d.st === 'w' ? '<div class="note"><span>💬</span><span>' + T('We will message you on WhatsApp when 2 patients are ahead of you. You can wait outside.', 'Jab aapse pehle 2 patients rahenge, hum WhatsApp par bata denge. Aap bahar intezaar kar sakte hain.') + '</span></div>' : '';
      var acts = '<div class="acts">' + (b.phone ? '<a class="bt" href="tel:' + E(String(b.phone).replace(/[^\d+]/g, '')) + '">📞 ' + T('Call clinic', 'Call karein') + '</a>' : '') +
        (b.address ? '<a class="bt" target="_blank" rel="noopener" href="https://maps.google.com/?q=' + encodeURIComponent((d.clinic.name || '') + ' ' + b.address) + '">📍 ' + T('Directions', 'Raasta') + '</a>' : '') +
        (d.st === 'w' ? '<button class="bt cx" id="cx">' + T('Cancel my token', 'Token cancel karein') + '</button>' : '') + '</div>';
      var upd = st.at ? T('Updated ', 'Update: ') + st.at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) + (st.err ? T(' · no internet, retrying', ' · internet nahi, dobara try') : '') : '';
      $app.innerHTML = '<div class="pt" style="--b:' + E(b.color || '#8A6A1F') + '">' +
        '<div class="hd"><span class="lg">' + E(b.logo || 'C') + '</span><div><div class="cn">' + E(d.clinic.name) + '</div><div class="dn">' + E(d.clinic.doctor) + '</div></div></div>' +
        banner +
        '<div class="' + cls + '"><div class="tl">' + (d.me1 ? E(d.me1) + ' · ' : '') + T('Your token', 'Aapka token') + '</div><div class="tn">' + E(tok) + '</div><div class="stt">' + head + '</div><div class="sts">' + sub + '</div></div>' +
        train + note + acts + '<div class="ft">' + upd + '</div></div>';
      var w = document.getElementById('trw'); if (w) w.scrollLeft = w.scrollWidth;
      var cx = document.getElementById('cx');
      if (cx) cx.onclick = function () { if (confirm(en ? 'Cancel your token?' : 'Token cancel karna hai?')) post({ action: 'track', k: k, cancel: true }).then(function (r) { st.d = r; st.at = new Date(); draw(); }); };
    }
    function tick() { post({ action: 'track', k: k }).then(function (r) { st.d = r; st.at = new Date(); st.err = false; draw(); }).catch(function () { st.err = true; if (st.d) draw(); }); }
    draw(); tick(); setInterval(function () { if (!document.hidden) tick(); }, 12000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  }

