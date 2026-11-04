(function () {
  var S = window.SITE, view = document.getElementById('view');
  ['yt', 'yt2'].forEach(function (id) { document.getElementById(id).href = S.youtube; });
  ['ig', 'ig2'].forEach(function (id) { document.getElementById(id).href = S.instagram; });
  if (S.email) { var m2 = document.getElementById('mail2'); m2.href = 'mailto:' + S.email; m2.title = S.email; m2.hidden = false; }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (s) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; };
  var byId = {}; S.challenges.forEach(function (c) { byId[c.id] = c; });
  var embed = /(^|\.)bas30din\.com$/.test(location.hostname);
  var label = { now: 'Happening now', paused: 'Paused', done: 'Finished', soon: 'Coming soon' };

  function days(c) { return (c.days || []).slice().sort(function (a, b) { return a.day - b.day; }); }
  function last(c) { var d = days(c); return d.length ? d[d.length - 1] : null; }
  function stateHTML(c) {
    var t = label[c.status] || '';
    if (c.status === 'paused' && last(c)) t = 'Paused at Day ' + last(c).day;
    return '<span class="state state--' + c.status + '"><i></i>' + esc(t) + '</span>';
  }
  function cover(c, small) {
    var d = last(c), tag = c.status === 'soon' ? 'Coming soon' : (d ? 'Day ' + d.day + (c.totalDays ? ' of ' + c.totalDays : '') : '');
    return '<div class="cover cover--' + (c.cover || 'coral') + ' is-' + c.status + '"><div class="cover__t">' +
      (small || c.status === 'soon' ? '' : '<small>' + esc(label[c.status] || '') + '</small>') +
      '<b>' + esc(c.coverTitle || c.title) + '</b>' + (tag && !small ? '<span>' + esc(tag) + '</span>' : '') + '</div>' +
      (c.photo ? '<img src="assets/alok-540.webp" width="540" height="545" alt="">' : '') + motif(c.motif) + '</div>';
  }
  function motif(m) {
    var svg = {
      rupee: '<span class="motif motif--rupee" aria-hidden="true">₹</span>',
      flow: '<svg class="motif motif--flow" viewBox="0 0 220 150" aria-hidden="true"><path d="M58 40 H110 V110 H162" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 12"/><rect x="14" y="16" width="56" height="48" rx="12"/><rect x="82" y="86" width="56" height="48" rx="12"/><rect x="150" y="86" width="56" height="48" rx="12" class="on"/><circle cx="42" cy="40" r="7" class="dot"/><circle cx="110" cy="110" r="7" class="dot"/><path d="M168 110 l8 8 l16 -16" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" class="tick"/></svg>'
    };
    return svg[m] || '';
  }
  function metaHTML(c) {
    var bits = [stateHTML(c), '<span>Free</span>'];
    if (c.started) bits.push('<span>Started ' + esc(fmt(c.started)) + '</span>');
    bits.push('<span class="by"><img src="assets/pfp.jpg" alt="">By Alok Mishra</span>');
    return '<div class="meta">' + bits.join('<span class="dot" aria-hidden="true"></span>') + '</div>';
  }
  function dayRows(c, withNext) {
    var list = days(c);
    var rows = list.map(function (d) {
      return '<a class="drow" href="#d-' + c.id + '-' + d.day + '"><span class="drow__n">DAY ' + d.day + '</span><span class="drow__t">' + esc(d.title) + '</span><span class="drow__d">' + esc(fmt(d.date)) + '</span></a>';
    }).join('');
    var l = last(c);
    if (withNext && c.status === 'now' && l && (!c.totalDays || l.day < c.totalDays)) rows += '<div class="drow drow--next"><span class="drow__n">DAY ' + (l.day + 1) + '</span><span class="drow__t">Coming next</span><span class="drow__d"></span></div>';
    return rows ? '<div class="daylist">' + rows + '</div>' : '<p class="muted">Day 1 goes up soon.</p>';
  }
  function sideCard(c, onNow) {
    var posted = S.challenges.reduce(function (t, x) { return t + (x.days || []).length; }, 0);
    var running = S.challenges.filter(function (x) { return x.status !== 'soon'; }).length;
    var first = days(c)[0];
    return '<aside class="card side"><div class="side__cover"><img src="assets/alok-540.webp" width="540" height="545" alt="Alok Mishra"></div><div class="side__in">' +
      '<h3>' + esc(S.name) + '</h3><div class="url">' + esc(S.domain) + '</div>' +
      '<p>I learn one skill at a time, in public. You get the shortcut, free.</p>' +
      '<div class="links"><a href="' + esc(S.youtube) + '" target="_blank" rel="noopener">YouTube</a><a href="' + esc(S.instagram) + '" target="_blank" rel="noopener">Instagram</a></div>' +
      '<div class="stats"><div><b>' + posted + '</b><small>days posted</small></div><div><b>' + running + '</b><small>challenges</small></div><div><b>₹0</b><small>always free</small></div></div>' +
      (onNow ? '<a class="tlink" href="#tests">See all tests</a>' :
        (first ? '<a class="btn" href="#d-' + c.id + '-' + first.day + '">Start from Day ' + first.day + '</a>' : '<a class="btn" href="#tests">See all tests</a>')) +
      '</div>' + (onNow ? '' : inboxBox('sidebar')) + '</aside>';
  }
  function inboxBox(where) {
    var I = S.inbox; if (!I || !I.on || !I.sheetUrl) return '';
    return '<section class="inbox inbox--' + where + '" id="inbox-' + where + '"><h3>' + esc(I.title) + '</h3><p>' + esc(I.text) + '</p>' +
      '<form class="inbox__row" data-inbox novalidate><label class="sr-only" for="em-' + where + '">Your email</label>' +
      '<input id="em-' + where + '" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="your email">' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">' +
      '<button class="btn" type="submit">' + esc(I.button) + '</button></form>' +
      '<p class="inbox__msg" aria-live="polite"></p><small>' + esc(I.small) + '</small></section>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.matches || !f.matches('form[data-inbox]')) return;
    e.preventDefault();
    var box = f.closest('.inbox'), msg = box.querySelector('.inbox__msg'), btn = f.querySelector('button');
    var email = f.email.value.trim();
    msg.classList.remove('is-err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'That email looks off. Try once more?'; msg.classList.add('is-err'); return; }
    btn.disabled = true; msg.textContent = 'One sec...';
    fetch(S.inbox.sheetUrl, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email: email, website: f.website.value, source: 'bas30din.com/' + (box.id || '') }) })
      .then(function () { box.classList.add('is-done'); msg.textContent = S.inbox.done; f.reset(); })
      .catch(function () { msg.textContent = "That didn't go through. Try once more?"; msg.classList.add('is-err'); })
      .then(function () { btn.disabled = false; });
  });
  function board(c) {
    var total = c.totalDays || 30, have = {}, l = last(c);
    (c.days || []).forEach(function (d) { have[d.day] = d; });
    var next = c.status === 'now' && l ? l.day + 1 : (c.status === 'soon' ? 0 : -1);
    var cells = '';
    for (var i = 0; i <= total; i++) {
      var d = have[i], cls = d ? 'is-done' : (i === next ? 'is-next' : '');
      var inner = '<span>' + i + '</span>';
      cells += d ? '<a class="bd ' + cls + '" href="#d-' + c.id + '-' + i + '" title="Day ' + i + ': ' + esc(d.title) + '">' + inner + '</a>'
                 : '<span class="bd ' + cls + '" title="Day ' + i + '">' + inner + '</span>';
    }
    var posted = (c.days || []).length;
    var cap = c.status === 'soon' ? 'Day 0 is coming soon.' : posted + ' of ' + (total + 1) + ' days posted' + (c.status === 'paused' ? ' · paused' : '');
    return '<section class="board"><div class="board__h"><h2>The ' + total + '-day board</h2><small>' + esc(cap) + '</small></div><div class="board__g">' + cells + '</div>' + receipt(c) + '</section>';
  }
  function receipt(c) {
    var L = c.ledger; if (!L) return '';
    var v = function (x, pre) { return x == null ? '—' : (pre || '') + Number(x).toLocaleString('en-IN'); };
    var started = L.hours != null || L.spent != null || L.earned != null;
    return '<div class="receipt"><div><b>' + v(L.hours) + '</b><small>hours spent</small></div><div><b>' + v(L.spent, '₹') + '</b><small>money spent</small></div><div><b>' + v(L.earned, '₹') + '</b><small>money earned</small></div>' +
      '<p>' + (started ? 'Every hour and every rupee goes on screen.' : 'Starts Day 0. Every hour and every rupee goes on screen.') + '</p></div>';
  }
  var STAMP = { pending: 'Verdict pending', works: 'It works', no: "It doesn't work", depends: 'It depends' };
  function stamp(c, big) {
    var v = c.verdict || { stamp: 'pending' }, k = STAMP[v.stamp] ? v.stamp : 'pending';
    return '<span class="stamp stamp--' + k + (big ? ' stamp--big' : '') + '">' + esc(STAMP[k]) + '</span>';
  }
  function verdictBlock(c) {
    var v = c.verdict || {};
    return '<section class="verdict"><div class="verdict__h"><h2>The verdict</h2>' + stamp(c, true) + '</div>' +
      (v.line ? '<p class="verdict__line">' + esc(v.line) + '</p>' : '') +
      (v.soFar ? '<div class="sofar"><h3>What\'s true so far</h3><p>' + esc(v.soFar) + '</p></div>' : '<p class="muted">No verdict until the test is done. Real numbers only.</p>') +
      '</section>';
  }
  /* "done" ticks for lessons, saved only in this viewer's browser */
  var DONE_KEY = 'b30d-done';
  function doneGet() { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function doneSet(k, on) { var d = doneGet(); if (on) d[k] = 1; else delete d[k]; try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) {} }
  function kicker() { return S.kicker ? '<div class="kicker">' + esc(S.kicker) + '</div>' : ''; }
  function sec(title, inner) { return '<section><h2>' + esc(title) + '</h2>' + inner + '</section>'; }
  function ticks(a) { return '<ul class="ticks">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function chips(a) { return '<div class="chips">' + a.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>'; }

  /* NOW: the current challenge only */
  function noteHTML() {
    var n = S.nowNote; if (!n || !n.length) return '';
    return '<section class="note">' + n.map(function (p, i) { return '<p' + (i === 0 ? ' class="note__hi"' : '') + '>' + esc(p) + '</p>'; }).join('') + '<div class="note__sign"><img src="assets/pfp.jpg" alt="">Alok</div></section>';
  }
  function heroCTA(c) {
    if (c.status === 'soon' && S.inbox && S.inbox.on && S.inbox.sheetUrl)
      return '<div class="hero-cta" id="hero-cta"><a class="btn" href="#now" data-jump="inbox-main">Get Day 0 in your inbox</a><small>Free. No spam.</small></div>';
    var l = last(c);
    if (l) return '<div class="hero-cta" id="hero-cta"><a class="btn" href="#d-' + c.id + '-' + l.day + '">Watch Day ' + l.day + '</a><small>Free. Notes and files included.</small></div>';
    return '';
  }
  function now() {
    var c = byId[S.current] || S.challenges[0];
    if (c.status === 'soon') {
      return '<div class="split"><article class="card main">' +
        cover(c) + kicker() +
        '<h1>' + esc(c.title) + '</h1>' + metaHTML(c) + heroCTA(c) + board(c) +
        '<div class="prose">' + noteHTML() + inboxBox('main') +
          (c.learn && c.learn.length ? sec("What I'm going to find out", ticks(c.learn)) : '') +
          sec('Files', '<p class="muted">Coming soon. Every day\'s notes and files will be here, free.</p>') +
        '</div></article>' + sideCard(c, true) + '</div>';
    }
    return '<div class="split"><article class="card main">' + cover(c) +
      kicker() + '<h1>' + esc(c.title) + '</h1>' + metaHTML(c) + heroCTA(c) + board(c) +
      '<div class="prose">' +
        (c.about ? sec("What's happening", '<p>' + esc(c.about) + '</p>') : '') +
        sec('What you get, free', ticks(['Every day as a short lesson, in order', 'My notes: what worked and what didn\'t', 'The files I used, ready to open'])) +
        sec('The challenge so far', dayRows(c, true)) +
        (c.tools && c.tools.length ? sec('Tools', chips(c.tools)) : '') +
        sec("Why I'm doing this", '<p>' + esc(S.why) + '</p>') +
      '</div></article>' + sideCard(c, true) + '</div>';
  }

  /* TESTS: every challenge, with its verdict stamp */
  function tests() {
    var order = { now: 0, paused: 1, done: 2, soon: 3 };
    var list = S.challenges.slice().sort(function (a, b) { return order[a.status] - order[b.status]; });
    return '<div class="head"><h1>Tests</h1><p>' + esc(S.kicker || '') + ' Every day, every rupee, and an honest verdict at the end.</p></div><div class="cgrid">' +
      list.map(function (c) {
        var n = (c.days || []).length, tag = c.status === 'soon' ? 'Season 1' : n + ' day' + (n === 1 ? '' : 's') + ' posted' + (c.tools && c.tools[0] ? ' · ' + c.tools[0] : '');
        var pct = c.totalDays ? Math.min(100, Math.round(n / (c.totalDays + 1) * 100)) : 0;
        var inner = cover(c, true) + '<div class="course__b"><h2>' + esc(c.title) + '</h2><p>' + esc(c.oneLine) + '</p>' +
          '<div class="prog" role="img" aria-label="' + n + ' of ' + ((c.totalDays || 0) + 1) + ' days"><i data-pct="' + pct + '"></i></div><div class="course__f"><span>' + esc(tag) + '</span>' + stamp(c) + '</div></div>';
        return c.status === 'soon' ? '<div class="card course">' + inner + '</div>' : '<a class="card course" href="#t-' + c.id + '">' + inner + '</a>';
      }).join('') + '</div>';
  }

  /* TEST page */
  function testPage(c) {
    return '<a class="back" href="#tests">Tests</a><div class="split"><article class="card main">' + cover(c) +
      kicker() + '<h1>' + esc(c.title) + '</h1>' + metaHTML(c) + board(c) + '<div class="prose">' +
        (c.about ? sec('About this challenge', '<p>' + esc(c.about) + '</p>') : '') +
        (c.learn && c.learn.length ? sec("What you'll learn", ticks(c.learn)) : '') +
        (c.tools && c.tools.length ? sec('Tools', chips(c.tools)) : '') +
        sec('Every day', dayRows(c, true)) + verdictBlock(c) + courseLink(c) +
      '</div></article>' + sideCard(c) + '</div>';
  }

  /* LESSON */
  function notes(t) {
    return t.split(/\n\s*\n/).map(function (b) {
      var ls = b.split('\n');
      if (ls.every(function (l) { return /^\s*-\s+/.test(l); })) return '<ul class="ticks">' + ls.map(function (l) { return '<li>' + esc(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + esc(b) + '</p>';
    }).join('');
  }
  function ext(u) { var m = /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(u || ''); return /drive\.google|docs\.google/.test(u || '') ? 'LINK' : (m ? m[1].toUpperCase() : 'FILE'); }
  function fileRow(f, sub) {
    return '<li class="file"><span class="file__ic">' + esc(ext(f.url)) + '</span><span class="file__n">' + esc(f.name) + '<small>' + esc(sub || f.note || '') + '</small></span><a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a></li>';
  }
  function lesson(c, d) {
    var list = days(c), k = list.indexOf(d), prev = list[k - 1], next = list[k + 1];
    var yt = 'https://www.youtube.com/' + (d.short ? 'shorts/' : 'watch?v=') + d.video;
    var player = embed
      ? '<div class="player' + (d.short ? ' player--short' : '') + '"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(d.video) + '?rel=0" title="' + esc(d.title) + '" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>'
      : '<a class="player' + (d.short ? ' player--short' : '') + '" href="' + esc(yt) + '" target="_blank" rel="noopener">' + (d.thumb ? '<img src="assets/thumbs/' + esc(d.thumb) + '" alt="">' : '') + '<span class="player__go"><i></i>Watch on YouTube</span></a>';
    var mods = list.map(function (x) {
      return '<a class="mi" href="#d-' + c.id + '-' + x.day + '"' + (x === d ? ' aria-current="page"' : '') + '><b>DAY ' + x.day + '</b><span>' + esc(x.title) + '</span></a>';
    }).join('');
    var l = last(c);
    if (c.status === 'now' && l && (!c.totalDays || l.day < c.totalDays)) mods += '<div class="mi mi--next"><b>DAY ' + (l.day + 1) + '</b><span>Coming next</span></div>';
    var files = d.files || [];
    return '<a class="back" href="#t-' + c.id + '">' + esc(c.title) + '</a><div class="lgrid">' +
      '<nav class="card mods" aria-label="Days"><h3>' + esc(c.title) + '</h3>' + mods + '</nav>' +
      '<article class="card lesson">' + player +
        '<h1>Day ' + d.day + ' · ' + esc(d.title) + '</h1>' +
        '<div class="meta"><span>' + esc(fmt(d.date)) + '</span>' + (d.length ? '<span class="dot" aria-hidden="true"></span><span>' + esc(d.length) + '</span>' : '') + '<span class="dot" aria-hidden="true"></span><a href="' + esc(yt) + '" target="_blank" rel="noopener">Open on YouTube</a></div>' +
        '<div class="prose">' +
          sec('Notes', d.notes ? notes(d.notes) : '<p class="muted">Notes for this day are on the way.</p>') +
          (files.length ? sec('Files', '<ul class="files">' + files.map(function (f) { return fileRow(f); }).join('') + '</ul>') : '') +
        '</div>' +
        '<div class="pager">' + (prev ? '<a class="prev" href="#d-' + c.id + '-' + prev.day + '">‹ Day ' + prev.day + '</a>' : '<span></span>') +
          (next ? '<a class="btn" href="#d-' + c.id + '-' + next.day + '">Day ' + next.day + ' ›</a>' : '<a class="btn btn--line" href="#t-' + c.id + '">All days</a>') + '</div>' +
      '</article></div>';
  }

  /* CLASSROOM: clean courses, made from the weekly teach videos */
  var courses = (S.courses || []).filter(function (k) { return (k.lessons || []).length >= 3; });
  var courseById = {}; courses.forEach(function (k) { courseById[k.id] = k; });
  function courseLink(c) {
    var k = courses.filter(function (x) { return x.fromTest === c.id; })[0];
    return k ? '<a class="ccard" href="#course-' + k.id + '"><small>The clean version</small><b>' + esc(k.title) + '</b><span>' + k.lessons.length + ' lessons in Classroom</span></a>' : '';
  }
  function doneCount(k) { var d = doneGet(); return k.lessons.filter(function (l) { return d[k.id + ':' + l.n]; }).length; }
  function classroom() {
    var cards = courses.map(function (k) {
      var n = k.lessons.length, done = doneCount(k), first = k.lessons[0];
      return '<a class="card kcard" href="#course-' + k.id + '">' +
        '<div class="kcard__thumb">' + (first.thumb ? '<img src="assets/thumbs/' + esc(first.thumb) + '" alt="" loading="lazy">' : '') + '<span>' + n + ' lessons</span></div>' +
        '<div class="kcard__b"><h2>' + esc(k.title) + '</h2><p>' + esc(k.oneLine) + '</p>' +
        '<div class="prog"><i data-pct="' + Math.round(done / n * 100) + '"></i></div>' +
        '<div class="course__f"><span>' + (done ? done + ' of ' + n + ' done' : 'Start with lesson 1') + '</span><span class="tlink">Open</span></div></div></a>';
    }).join('');
    return '<div class="head"><h1>Classroom</h1><p>' + esc(S.taught || 'I learn it in 30 days. You learn it in 10 minutes.') + '</p></div>' +
      (cards ? '<div class="kgrid">' + cards + '</div>' : '<div class="card empty">The first course is being made from this season\'s teach videos.</div>');
  }
  function coursePage(k) {
    var d = doneGet(), done = doneCount(k), n = k.lessons.length;
    var next = k.lessons.filter(function (l) { return !d[k.id + ':' + l.n]; })[0] || k.lessons[0];
    var rows = k.lessons.map(function (l) {
      var on = d[k.id + ':' + l.n];
      return '<a class="lrow' + (on ? ' is-done' : '') + '" href="#l-' + k.id + '-' + l.n + '"><span class="lrow__n">' + (on ? '✓' : l.n) + '</span><span class="lrow__t">' + esc(l.title) + '</span><span class="lrow__d">' + esc(l.length || '') + '</span></a>';
    }).join('');
    var t = byId[k.fromTest];
    return '<a class="back" href="#classroom">Classroom</a><div class="split"><article class="card main">' +
      '<div class="khero"><small>Course · ' + n + ' lessons · free</small><h1>' + esc(k.title) + '</h1><p>' + esc(k.oneLine) + '</p>' +
      '<div class="hero-cta"><a class="btn" href="#l-' + k.id + '-' + next.n + '">' + (done && done < n ? 'Continue: lesson ' + next.n : 'Start lesson ' + next.n) + '</a>' +
      '<small>' + (done ? done + ' of ' + n + ' done on this phone' : 'No login. Your ticks stay on this device.') + '</small></div>' +
      '<div class="prog prog--big"><i data-pct="' + Math.round(done / n * 100) + '"></i></div></div>' +
      '<div class="prose">' + sec('Lessons', '<div class="lessons">' + rows + '</div>') +
        (k.tools && k.tools.length ? sec('Tools', chips(k.tools)) : '') +
        (t ? sec('Where this comes from', '<p>The messy version, day by day: <a class="tlink" href="#t-' + t.id + '">' + esc(t.title) + '</a></p>') : '') +
        (k.playlist ? sec('On YouTube', '<p><a class="tlink" href="' + esc(k.playlist) + '" target="_blank" rel="noopener">Watch the whole playlist</a></p>') : '') +
      '</div></article>' + sideCard(byId[S.current] || S.challenges[0], true) + '</div>';
  }
  function lessonPage(k, l) {
    var i = k.lessons.indexOf(l), prev = k.lessons[i - 1], next = k.lessons[i + 1], key = k.id + ':' + l.n, on = doneGet()[key];
    var yt = 'https://www.youtube.com/watch?v=' + l.video;
    var player = embed
      ? '<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(l.video) + '?rel=0" title="' + esc(l.title) + '" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>'
      : '<a class="player" href="' + esc(yt) + '" target="_blank" rel="noopener">' + (l.thumb ? '<img src="assets/thumbs/' + esc(l.thumb) + '" alt="">' : '') + '<span class="player__go"><i></i>Watch on YouTube</span></a>';
    var mods = k.lessons.map(function (x) {
      var d = doneGet()[k.id + ':' + x.n];
      return '<a class="mi' + (d ? ' is-done' : '') + '" href="#l-' + k.id + '-' + x.n + '"' + (x === l ? ' aria-current="page"' : '') + '><b>' + (d ? '✓' : x.n) + '</b><span>' + esc(x.title) + '</span></a>';
    }).join('');
    return '<a class="back" href="#course-' + k.id + '">' + esc(k.title) + '</a><div class="lgrid">' +
      '<nav class="card mods" aria-label="Lessons"><h3>' + esc(k.title) + '</h3>' + mods + '</nav>' +
      '<article class="card lesson">' + player +
        '<h1>Lesson ' + l.n + ' · ' + esc(l.title) + '</h1>' +
        '<div class="meta"><span>' + esc(l.length || '') + '</span><span class="dot" aria-hidden="true"></span><a href="' + esc(yt) + '" target="_blank" rel="noopener">Open on YouTube</a></div>' +
        '<div class="prose">' +
          sec('Steps', l.steps && l.steps.length ? '<ol class="steps-ol">' + l.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '<p class="muted">Steps for this lesson are on the way.</p>') +
          ((l.files || []).length ? sec('Files', '<ul class="files">' + l.files.map(function (f) { return fileRow(f); }).join('') + '</ul>') : '') +
        '</div>' +
        '<button class="donebtn' + (on ? ' is-on' : '') + '" type="button" data-done="' + esc(key) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + (on ? '✓ Done' : 'Mark as done') + '</button>' +
        '<div class="pager">' + (prev ? '<a class="prev" href="#l-' + k.id + '-' + prev.n + '">‹ Lesson ' + prev.n + '</a>' : '<span></span>') +
          (next ? '<a class="btn" href="#l-' + k.id + '-' + next.n + '">Lesson ' + next.n + ' ›</a>' : '<a class="btn btn--line" href="#course-' + k.id + '">Course page</a>') + '</div>' +
      '</article></div>';
  }
  view.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-done]'); if (!b) return;
    var on = b.getAttribute('aria-pressed') !== 'true'; doneSet(b.dataset.done, on);
    var pos = scrollY; route(); scrollTo(0, pos);
  });

  /* TOOLKIT (was Files) */
  function filesPage() {
    var groups = S.challenges.map(function (c) {
      var rows = days(c).filter(function (d) { return (d.files || []).length; }).map(function (d) {
        return d.files.map(function (f) { return fileRow(f, 'Day ' + d.day + (f.note ? ' · ' + f.note : '')); }).join('');
      }).join('');
      return rows ? '<section class="card fgroup"><h2>' + esc(c.title) + '</h2><ul class="files">' + rows + '</ul></section>' : '';
    }).join('');
    var cgroups = courses.map(function (k) {
      var rows = k.lessons.filter(function (l) { return (l.files || []).length; }).map(function (l) { return l.files.map(function (f) { return fileRow(f, 'Lesson ' + l.n + (f.note ? ' · ' + f.note : '')); }).join(''); }).join('');
      return rows ? '<section class="card fgroup"><h2>' + esc(k.title) + '</h2><ul class="files">' + rows + '</ul></section>' : '';
    }).join('');
    groups = cgroups + groups;
    return '<div class="head"><h1>Toolkit</h1><p>Every file and template, from every test and course, in one place.</p></div>' +
      (groups || '<div class="card empty">Files show up here as soon as a day has them. The first ones come with the next AI Automation lessons.</div>');
  }

  /* ABOUT */
  function about() {
    return '<article class="card about"><div class="about__pic"><img src="assets/alok-540.webp" width="540" height="545" alt="Alok Mishra"></div><div>' +
      '<h1>Hi, I\'m Alok</h1>' +
      '<p class="lead">For years I was the guy who started everything and finished nothing. New skill, new plan, new excitement, and then I\'d quit in a week.</p>' +
      '<div class="steps">' +
        '<div class="step"><b>1</b><p>I pick one skill and give it a fixed number of days.</p></div>' +
        '<div class="step"><b>2</b><p>I do it on camera, so I can\'t quit quietly.</p></div>' +
        '<div class="step"><b>3</b><p>Whatever works, I put here as short lessons, notes and files. Free.</p></div>' +
      '</div>' +
      '<p class="lead">The internet says a lot. I test it myself.</p>' +
      '<div class="contact"><a class="btn" href="' + esc(S.youtube) + '" target="_blank" rel="noopener">Watch on YouTube</a><a class="btn btn--line" href="' + esc(S.instagram) + '" target="_blank" rel="noopener">Instagram</a>' +
      (S.email ? '<a class="mail" href="mailto:' + esc(S.email) + '">Collabs: ' + esc(S.email) + '</a>' : '') + '</div>' + inboxBox('about') +
      '</div></article>';
  }

  function route() {
    var h = (location.hash || '#now').slice(1), html, tab = 'now', m;
    if (h === 'tests') { html = tests(); tab = 'tests'; }
    else if (h === 'classroom') { html = classroom(); tab = 'classroom'; }
    else if ((m = h.match(/^course-([a-z0-9-]+)$/)) && courseById[m[1]]) { html = coursePage(courseById[m[1]]); tab = 'classroom'; }
    else if ((m = h.match(/^l-([a-z0-9-]+)-(\d+)$/)) && courseById[m[1]]) {
      var k = courseById[m[1]], l = k.lessons.filter(function (x) { return x.n === +m[2]; })[0];
      html = l ? lessonPage(k, l) : coursePage(k); tab = 'classroom';
    }
    else if (h === 'toolkit' || h === 'files') { html = filesPage(); tab = 'toolkit'; }
    else if (h === 'about') { html = about(); tab = 'about'; }
    else if ((m = h.match(/^[ct]-([a-z0-9-]+)$/)) && byId[m[1]]) { html = testPage(byId[m[1]]); tab = 'tests'; }
    else if ((m = h.match(/^d-([a-z0-9-]+)-(\d+)$/)) && byId[m[1]]) {
      var c = byId[m[1]], d = (c.days || []).filter(function (x) { return x.day === +m[2]; })[0];
      if (d) { html = lesson(c, d); tab = c.id === S.current ? 'now' : 'tests'; } else html = now();
    }
    else html = now();
    view.innerHTML = html;
    // widths set from script: the site's security policy blocks inline style="" attributes
    view.querySelectorAll('[data-pct]').forEach(function (el) { el.style.width = el.dataset.pct + '%'; });
    actionBar(tab === 'now' && !/^d-/.test(h));
    document.querySelectorAll('[data-tab]').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  view.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-jump]'); if (!a) return;
    var t = document.getElementById(a.dataset.jump); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  var bar = document.getElementById('actionbar'), io;
  function actionBar(on) {
    if (!bar) return; bar.hidden = true; if (io) io.disconnect();
    var hero = document.getElementById('hero-cta'), box = document.getElementById('inbox-main');
    if (!on || !hero || !('IntersectionObserver' in window)) return;
    var a = hero.querySelector('a'); bar.querySelector('a').textContent = a.textContent;
    bar.querySelector('a').setAttribute('href', a.getAttribute('href'));
    if (a.dataset.jump) bar.querySelector('a').dataset.jump = a.dataset.jump; else delete bar.querySelector('a').dataset.jump;
    var heroGone = false, boxSeen = false;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.target === hero) heroGone = !x.isIntersecting && x.boundingClientRect.top < 0; else boxSeen = x.isIntersecting; });
      bar.hidden = !(heroGone && !boxSeen);
    });
    io.observe(hero); if (box) io.observe(box);
  }
  if (bar) bar.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-jump]'); if (!a) return; var t = document.getElementById(a.dataset.jump); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  addEventListener('hashchange', function () { route(); scrollTo(0, 0); view.focus({ preventScroll: true }); });
  route();
})();
