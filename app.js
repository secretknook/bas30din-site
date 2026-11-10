/* Bas 30 Din site. Picture-first design approved 8 Nov 2026 (home v3).
   All content comes from site-data.js. No inline styles: the site's security policy blocks them. */
(function () {
  var S = window.SITE, view = document.getElementById('view');
  // Paused challenges stay in site-data.js but are not shown anywhere on the site (Alok, 8 Nov 2026).
  S.challenges = S.challenges.filter(function (c) { return c.status !== 'archive' && c.status !== 'paused'; });
  ['yt', 'yt2'].forEach(function (id) { var a = document.getElementById(id); if (a) a.href = S.youtube; });
  ['ig', 'ig2'].forEach(function (id) { var a = document.getElementById(id); if (a) a.href = S.instagram; });
  if (S.email) { var m2 = document.getElementById('mail2'); if (m2) { m2.href = 'mailto:' + S.email; m2.title = S.email; m2.hidden = false; } }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (s) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; };
  var byId = {}; S.challenges.forEach(function (c) { byId[c.id] = c; });
  var embed = /(^|\.)bas30din\.com$/.test(location.hostname);
  var PHOTO = 'assets/alok-540.webp';

  /* ---------- icons (Lucide, inline, aria-hidden) ---------- */
  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3"/><polygon points="10 9 15 12 10 15 10 9"/></svg>',
    notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 7 13.5 15.5l-5-5L2 17"/><path d="M16 7h6v6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000"/><polygon points="10 8.5 16 12 10 15.5" fill="#fff"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#1E1E1E" stroke="none"/></svg>'
  };

  /* ---------- day logic ---------- */
  function days(c) { return (c.days || []).slice().sort(function (a, b) { return a.day - b.day; }); }
  function dayOf(c, n) { return (c.days || []).filter(function (x) { return x.day === n; })[0]; }
  function hasVideo(d) { return d && d.video; }
  // The live day moves on by itself from `started` (Day 1) for a running challenge.
  function liveDay(c) {
    if (c.status !== 'now' || !c.started) return -1;
    var start = new Date(c.started + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
    var n = Math.floor((t - start) / 864e5) + 1;
    return Math.max(1, Math.min(c.totalDays || 30, n));
  }
  function dayState(c, n) {
    var live = liveDay(c), d = dayOf(c, n);
    if (n === live) return 'live';
    if (live > 0) return n < live ? (d ? 'done' : 'missed') : (n === live + 1 ? 'next' : 'later');
    return d ? 'done' : 'later';
  }
  function yt(d) { return 'https://www.youtube.com/' + (d.short ? 'shorts/' : 'watch?v=') + d.video; }
  function earned(c) { var L = c.ledger || {}; return L.earned == null ? 0 : L.earned; }
  function inr(x) { return '₹' + Number(x).toLocaleString('en-IN'); }

  /* ---------- shared blocks ---------- */
  function liveDot() { return '<span class="ldot" aria-hidden="true"></span>'; }

  // Story circles: the day menu, like Instagram stories.
  function stories(c, current) {
    var total = c.totalDays || 30, live = liveDay(c), first = dayOf(c, 0) ? 0 : 1, out = '';
    for (var n = first; n <= total; n++) {
      var st = dayState(c, n), d = dayOf(c, n), open = d || st === 'live';
      var face = st === 'done' || st === 'live'
        ? '<span class="st__ring"><img src="' + (d && d.thumb ? 'assets/thumbs/' + esc(d.thumb) : PHOTO) + '" alt="" loading="lazy"></span>'
        : '<span class="st__ring st__ring--off">' + I.lock + '</span>';
      var lab = 'Day ' + n + (st === 'done' ? ' ✓' : '');
      var cls = 'st st--' + st + (n === current ? ' is-here' : '');
      out += open
        ? '<a class="' + cls + '" href="#d-' + c.id + '-' + n + '"' + (n === current ? ' aria-current="page"' : '') + '>' + face + (st === 'live' ? '<b class="st__tag">LIVE</b>' : '') + '<span class="st__l">' + lab + '</span></a>'
        : '<span class="' + cls + '">' + face + '<span class="st__l">' + lab + '</span></span>';
    }
    return '<nav class="stories" aria-label="Days">' + out + '</nav>';
  }

  // Claim VS me. Real claim post on the left, Alok's live result on the right.
  function vs(c, n) {
    if (!c.claim) return '';
    var day = n || liveDay(c);
    return '<section class="vs" aria-label="The claim versus my result">' +
      '<div class="vs__claim"><img src="' + esc(c.claim.img) + '" alt="' + esc('Real post: ' + (c.claim.says || '') + ' (' + c.claim.by + ')') + '"></div>' +
      '<div class="vs__me"><img src="' + PHOTO + '" alt="Alok" width="540" height="545">' +
        '<div class="vs__res"><b>' + liveDot() + esc(inr(earned(c))) + '</b><span>DAY ' + day + '/' + (c.totalDays || 30) + '</span></div></div>' +
      '<span class="vs__vs" aria-hidden="true">VS</span></section>';
  }

  // All 30 days as tiles (Day 30 = the verdict).
  function grid(c) {
    var total = c.totalDays || 30, live = liveDay(c), cells = '';
    for (var n = 1; n <= total; n++) {
      var st = dayState(c, n), d = dayOf(c, n), last = n === total;
      if (st === 'live') {
        cells += '<a class="tile tile--live" href="#d-' + c.id + '-' + n + '"><img src="' + (d && d.thumb ? 'assets/thumbs/' + esc(d.thumb) : PHOTO) + '" alt=""><b class="tile__tag">LIVE</b><span class="tile__n">DAY ' + n + '</span></a>';
      } else if (st === 'done') {
        cells += '<a class="tile tile--done" href="#d-' + c.id + '-' + n + '">' + (d.thumb ? '<img src="assets/thumbs/' + esc(d.thumb) + '" alt="">' : '') + '<span class="tile__n">DAY ' + n + '</span></a>';
      } else if (last) {
        cells += '<span class="tile tile--verdict"><b>' + n + '</b><small>VERDICT</small></span>';
      } else if (st === 'next') {
        cells += '<span class="tile tile--next"><b>' + n + '</b><small>TOMORROW</small></span>';
      } else {
        cells += '<span class="tile tile--later"><b>' + n + '</b>' + I.lock + '</span>';
      }
    }
    var shown = live > 0 ? live : (c.days || []).length;
    return '<section class="card g30"><div class="g30__h"><h2>All ' + total + ' days</h2>' + (live > 0 ? '<span class="g30__c">' + liveDot() + shown + ' / ' + total + '</span>' : '') + '</div>' +
      '<div class="g30__g">' + cells + '</div>' +
      '<div class="g30__k"><span class="k k--live">Live</span><span class="k k--next">Tomorrow</span><span class="k k--end">The answer</span></div></section>';
  }

  function inboxBox(where, title) {
    var B = S.inbox; if (!B || !B.on || !B.sheetUrl) return '';
    return '<section class="card inbox2" id="inbox-' + where + '"><form class="inbox2__f" data-inbox novalidate>' +
      '<label for="em-' + where + '">' + esc(title || B.title) + '</label>' +
      '<div class="inbox2__row"><input id="em-' + where + '" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="your email">' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">' +
      '<button type="submit">Send</button></div></form>' +
      '<p class="inbox__msg" aria-live="polite"></p><small>' + esc(B.small) + '</small></section>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.matches || !f.matches('form[data-inbox]')) return;
    e.preventDefault();
    var box = f.closest('section'), msg = box.querySelector('.inbox__msg'), btn = f.querySelector('button');
    var email = f.email.value.trim();
    msg.classList.remove('is-err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'That email looks off. Try once more?'; msg.classList.add('is-err'); return; }
    btn.disabled = true; msg.textContent = 'One sec...';
    fetch(S.inbox.sheetUrl, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email: email, website: f.website.value, source: 'bas30din.com/' + (box.id || '') }) })
      .then(function () { box.classList.add('is-done'); msg.textContent = S.inbox.done; f.reset(); })
      .catch(function () { msg.textContent = "That didn't go through. Try once more?"; msg.classList.add('is-err'); })
      .then(function () { btn.disabled = false; });
  });

  /* ---------- NOW (home) ---------- */
  function now() {
    var c = byId[S.current] || S.challenges[0];
    var live = liveDay(c), T = c.trailer || {};
    var tHref = T.video ? yt(T) : '#d-' + c.id + '-' + (live > 0 ? live : 1);
    var tExt = T.video ? ' target="_blank" rel="noopener"' : '';
    var trailer = '<a class="ttile" href="' + esc(tHref) + '"' + tExt + '>' +
      (T.thumb ? '<img src="assets/thumbs/' + esc(T.thumb) + '" alt="">' : '<img class="ttile__face" src="' + PHOTO + '" alt="">') +
      '<span class="ttile__go">' + I.play + '</span>' +
      '<span class="ttile__l">' + (T.video ? 'Watch' + (T.length ? ' · ' + esc(T.length) : '') : 'Watch Day ' + (live > 0 ? live : 1)) + '</span></a>';
    return '<div class="home">' + stories(c) + vs(c) +
      '<h1 class="home__q">Is it true? Watch me find out.</h1>' + trailer + grid(c) +
      '<section class="gets"><div>' + I.video + '<span>Daily video</span></div><div>' + I.notes + '<span>My notes</span></div><div>' + I.down + '<span>Files</span></div></section>' +
      '<p class="gets__s">All free. No course to sell.</p>' +
      inboxBox('main', 'Get the answer on Day ' + (c.totalDays || 30)) + '</div>';
  }

  /* ---------- DAY page ---------- */
  function notesHTML(t) {
    return t.split(/\n\s*\n/).map(function (b) {
      var ls = b.split('\n');
      if (ls.every(function (l) { return /^\s*-\s+/.test(l); })) return '<ul class="ticks">' + ls.map(function (l) { return '<li>' + esc(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + esc(b) + '</p>';
    }).join('');
  }
  function ext(u) { var m = /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(u || ''); return /drive\.google|docs\.google/.test(u || '') ? 'LINK' : (m ? m[1].toUpperCase() : 'FILE'); }
  function fileTile(f, dayN, isLive) {
    return '<a class="ftile" href="' + esc(f.url) + '" target="_blank" rel="noopener"><span class="ftile__ic">' + esc(ext(f.url)) + '</span>' +
      '<span class="ftile__n">' + esc(f.name) + '</span><span class="ftile__f">' + (dayN != null ? '<b class="' + (isLive ? 'is-live' : '') + '">DAY ' + dayN + '</b>' : '<i></i>') + I.down + '</span></a>';
  }
  function lesson(c, n) {
    var d = dayOf(c, n) || { day: n, title: '', video: '', files: [] }, st = dayState(c, n), list = days(c);
    var player;
    if (hasVideo(d)) {
      player = embed
        ? '<div class="player' + (d.short ? ' player--short' : '') + '"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(d.video) + '?rel=0" title="' + esc(d.title || 'Day ' + n) + '" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>'
        : '<a class="player' + (d.short ? ' player--short' : '') + '" href="' + esc(yt(d)) + '" target="_blank" rel="noopener">' + (d.thumb ? '<img src="assets/thumbs/' + esc(d.thumb) + '" alt="">' : '') + '<span class="player__go"><i></i>Watch on YouTube</span></a>';
    } else {
      player = '<div class="player player--soon"><img src="' + PHOTO + '" alt=""><span class="player__soon">' + (st === 'live' ? liveDot() + 'Day ' + n + ' video goes up today' : 'Coming on Day ' + n) + '</span></div>';
    }
    var L = c.ledger || {};
    var nums = c.ledger ? '<section class="nums">' +
      '<div><b>' + (L.hours == null ? '—' : esc(L.hours) + 'h') + '</b>' + I.clock + '<span class="sr-only">hours so far</span></div>' +
      '<div><b>' + (L.spent == null ? '—' : esc(inr(L.spent))) + '</b>' + I.wallet + '<span class="sr-only">money spent so far</span></div>' +
      '<div class="is-earn"><b>' + esc(inr(earned(c))) + '</b>' + I.up + '<span class="sr-only">money earned so far</span></div></section>' : '';
    var pics = (d.pictures || []).filter(function (p) { return p && p.img; });
    var picsHTML = pics.length ? '<section class="pics"><h2>Today in ' + pics.length + ' picture' + (pics.length === 1 ? '' : 's') + '</h2>' +
      pics.map(function (p, i) { return '<div class="pic"><span class="pic__img"><img src="' + esc(p.img) + '" alt="" loading="lazy"><b>' + (i + 1) + '</b></span><span>' + esc(p.text) + '</span></div>'; }).join('') + '</section>' : '';
    var files = (d.files || []);
    var filesHTML = files.length ? '<section class="ftiles">' + files.map(function (f) { return fileTile(f, null); }).join('') + '</section>' : '';
    var k = list.indexOf(d), prev = k > 0 ? list[k - 1] : null;
    var nextN = n + 1, nextD = dayOf(c, nextN), nextOpen = nextD && (hasVideo(nextD) || dayState(c, nextN) === 'live');
    var tomorrow = (c.status === 'now' && !nextOpen && n < (c.totalDays || 30))
      ? '<section class="card tmrw"><span class="tmrw__ic">' + I.lock + '<b>DAY ' + nextN + '</b></span>' + inboxBox('day', 'Tomorrow. Get it first?').replace('<section class="card inbox2"', '<section class="inbox2 inbox2--bare"') + '</section>'
      : '';
    return '<a class="back" href="' + (c.id === S.current ? '#now' : '#c-' + c.id) + '">' + esc(c.id === S.current ? 'Home' : c.title) + '</a>' +
      '<div class="day">' + stories(c, n) + vs(c, n) + player +
      '<h1 class="day__t">' + (d.title ? 'Day ' + n + ' · ' + esc(d.title) : 'Day ' + n) + '</h1>' +
      (hasVideo(d) ? '<div class="meta">' + (d.date ? '<span>' + esc(fmt(d.date)) + '</span>' : '') + (d.length ? '<span>' + esc(d.length) + '</span>' : '') + '<a href="' + esc(yt(d)) + '" target="_blank" rel="noopener">Open on YouTube</a></div>' : '') +
      (c.status === 'now' ? nums : '') + picsHTML + filesHTML +
      (d.notes ? '<section class="card dnotes"><h2>My notes</h2>' + notesHTML(d.notes) + '</section>' : '') +
      tomorrow +
      '<div class="pager">' + (prev ? '<a class="pager__b" href="#d-' + c.id + '-' + prev.day + '">‹ Day ' + prev.day + '</a>' : '<span></span>') +
        (nextOpen ? '<a class="pager__b pager__b--go" href="#d-' + c.id + '-' + nextN + '">Day ' + nextN + ' ›</a>' : '') + '</div>' +
      '</div>';
  }

  /* ---------- CLASSROOM ---------- */
  function coverHTML(c) {
    return '<div class="cv cv--' + (c.cover || 'coral') + '"><b>' + esc(c.coverTitle || c.title) + '</b>' +
      (c.photo ? '<img src="' + PHOTO + '" alt="" width="540" height="545" loading="lazy">' : '') + '</div>';
  }
  function bars(c) {
    var total = c.totalDays || 30, live = liveDay(c), out = '';
    for (var n = 1; n <= total; n++) out += '<i class="' + (n < live ? 'is-done' : n === live ? 'is-live' : '') + '"></i>';
    return '<span class="bars" aria-hidden="true">' + out + '</span>';
  }
  function classroom() {
    var live = S.challenges.filter(function (c) { return c.status === 'now'; });
    var past = S.challenges.filter(function (c) { return c.status === 'archive' || c.status === 'done' || c.status === 'paused'; });
    var soon = S.challenges.filter(function (c) { return c.status === 'soon'; });
    return '<div class="room"><h1 class="ptitle">Classroom</h1>' +
      live.map(function (c) {
        return '<a class="room__live" href="#now">' + coverHTML(c) + '<span class="chip">' + liveDot() + '<b>LIVE</b> · DAY ' + liveDay(c) + '/' + (c.totalDays || 30) + '</span>' + bars(c) + '</a>';
      }).join('') +
      (past.length ? '<h2 class="room__h">Watch any time</h2><div class="room__past">' + past.map(function (c) {
        var n = (c.days || []).filter(hasVideo).length;
        return '<a class="room__tile" href="#c-' + c.id + '" aria-label="' + esc(c.title + ', ' + n + ' videos') + '">' + coverHTML(c) + '<span class="cnt">' + I.play + n + '</span></a>';
      }).join('') + '</div>' : '') +
      (soon.length ? '<h2 class="room__h">Next</h2>' + soon.map(function (c) {
        return '<div class="room__soon">' + coverHTML(c) + '<span class="chip chip--soon">' + I.clock + 'COMING SOON</span></div>';
      }).join('') : '') + '</div>';
  }

  /* ---------- one earlier challenge ---------- */
  function course(c) {
    if (c.id === S.current) return now();
    var list = days(c).filter(hasVideo);
    return '<a class="back" href="#classroom">Classroom</a><div class="past">' + coverHTML(c) +
      '<h1 class="ptitle ptitle--s">' + esc(c.title) + '</h1>' +
      '<div class="past__g">' + list.map(function (d) {
        return '<a class="pcard" href="#d-' + c.id + '-' + d.day + '">' + (d.thumb ? '<img src="assets/thumbs/' + esc(d.thumb) + '" alt="" loading="lazy">' : '<span class="pcard__ph"></span>') +
          '<span class="pcard__d">DAY ' + d.day + '</span><span class="pcard__t">' + esc(d.title) + '</span></a>';
      }).join('') + '</div></div>';
  }

  /* ---------- FILES ---------- */
  function filesPage() {
    var all = [];
    S.challenges.forEach(function (c) {
      days(c).forEach(function (d) { (d.files || []).forEach(function (f) { all.push({ c: c, d: d, f: f }); }); });
    });
    var used = S.challenges.filter(function (c) { return all.some(function (x) { return x.c === c; }); });
    var chips = used.length > 1 ? '<div class="fchips" role="group" aria-label="Filter files"><button type="button" class="is-on" data-f="">All</button>' +
      used.map(function (c) { return '<button type="button" data-f="' + esc(c.id) + '">' + esc(c.coverTitle || c.title) + '</button>'; }).join('') + '</div>' : '';
    return '<div class="files2"><div class="files2__h"><h1 class="ptitle">Files</h1><span>FREE · NO SIGN-UP</span></div>' + chips +
      (all.length ? '<div class="ftiles ftiles--page">' + all.map(function (x) {
        return fileTile(x.f, x.d.day, dayState(x.c, x.d.day) === 'live').replace('<a class="ftile"', '<a class="ftile" data-c="' + esc(x.c.id) + '"');
      }).join('') + '</div>' : '<div class="card empty">' + I.down + '<p>Every day\'s files land here, free.</p></div>') + '</div>';
  }
  view.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.fchips button'); if (!b) return;
    var f = b.getAttribute('data-f');
    view.querySelectorAll('.fchips button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    view.querySelectorAll('.ftiles--page .ftile').forEach(function (t) { t.hidden = !!f && t.getAttribute('data-c') !== f; });
  });

  /* ---------- ABOUT ---------- */
  function about() {
    var c = byId[S.current] || S.challenges[0], mini = '';
    for (var i = 0; i < 24; i++) mini += '<i class="' + (i < 2 ? 'is-done' : i === 2 ? 'is-live' : '') + '"></i>';
    var first = S.challenges.filter(function (x) { return x.started; }).map(function (x) { return x.started; }).sort()[0];
    var since = first ? new Date(first + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
    return '<div class="about2">' +
      '<section class="poster"><img src="' + PHOTO + '" alt="Alok Mishra" width="540" height="545"><h1>Hi, I\'m<br>Alok.</h1></section>' +
      (S.story && S.story.length ? '<section class="card story"><h2>My story</h2>' + S.story.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        '<div class="story__sign"><img src="' + PHOTO + '" alt="">Alok</div></section>' : '') +
      '<section class="facts">' +
        (since ? '<div>' + I.cal + '<span>In public since ' + esc(since) + '</span></div>' : '') +
        '<div><b>30</b><span>days per claim</span></div>' +
        '<div>' + I.no + '<span>No course to sell</span></div></section>' +
      '<section class="how"><h2>How it works</h2><div class="how__g">' +
        '<div><span class="how__p how__p--claim">' + (c.claim ? '<img src="' + esc(c.claim.img) + '" alt="A real claim post">' : '') + '</span><b>1 · A claim</b></div>' +
        '<div><span class="how__p how__p--grid">' + mini + '</span><b>2 · 30 days, live</b></div>' +
        '<div><span class="how__p how__p--end"><strong>TRUE?</strong><small>VERDICT</small></span><b>3 · The truth</b></div>' +
      '</div></section>' +
      '<section class="reach"><a href="' + esc(S.youtube) + '" target="_blank" rel="noopener">' + I.yt + '<span>YouTube</span></a>' +
        '<a href="' + esc(S.instagram) + '" target="_blank" rel="noopener">' + I.ig + '<span>Instagram</span></a>' +
        (S.email ? '<a href="mailto:' + esc(S.email) + '">' + I.mail + '<span>Collabs</span></a>' : '') + '</section>' +
      '</div>';
  }

  /* ---------- routing ---------- */
  function route() {
    var h = (location.hash || '#now').slice(1), html, tab = 'now', m;
    if (h === 'classroom') { html = classroom(); tab = 'classroom'; }
    else if (h === 'files') { html = filesPage(); tab = 'files'; }
    else if (h === 'about') { html = about(); tab = 'about'; }
    else if ((m = h.match(/^c-([a-z0-9-]+)$/)) && byId[m[1]]) { html = course(byId[m[1]]); tab = byId[m[1]].id === S.current ? 'now' : 'classroom'; }
    else if ((m = h.match(/^d-([a-z0-9-]+)-(\d+)$/)) && byId[m[1]]) {
      var c = byId[m[1]], n = +m[2], d = dayOf(c, n);
      if (d || dayState(c, n) === 'live') { html = lesson(c, n); tab = c.id === S.current ? 'now' : 'classroom'; } else html = now();
    }
    else html = now();
    view.innerHTML = html;
    document.querySelectorAll('[data-tab]').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var here = view.querySelector('.st.is-here'); if (here && here.scrollIntoView) here.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  addEventListener('hashchange', function () { route(); scrollTo(0, 0); view.focus({ preventScroll: true }); });
  route();
})();
