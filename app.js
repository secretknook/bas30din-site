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
      (onNow ? '<a class="tlink" href="#classroom">See all challenges</a>' :
        (first ? '<a class="btn" href="#d-' + c.id + '-' + first.day + '">Start from Day ' + first.day + '</a>' : '<a class="btn" href="#classroom">See all challenges</a>')) +
      '</div>' + (onNow ? '' : inboxBox('sidebar')) + '</aside>';
  }
  function inboxBox(where) {
    var I = S.inbox; if (!I || !I.on || !I.url) return '';
    return '<section class="inbox inbox--' + where + '" id="inbox-' + where + '"><h3>' + esc(I.title) + '</h3><p>' + esc(I.text) + '</p>' +
      '<iframe class="signup-frame" src="' + esc(I.url.replace('/serve/', '/v2/serve/')) + '" title="Subscribe to Bas 30 Din updates" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      '<small><a href="' + esc(I.url) + '" target="_blank" rel="noopener">Open signup form</a>. Confirm your email to join. Unsubscribe any time.</small></section>';
  }
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
    if (c.status === 'soon' && S.inbox && S.inbox.on && S.inbox.url)
      return '<div class="hero-cta"><a class="btn" href="#now" data-jump="inbox-main">Get Day 0 in your inbox</a><small>Free. Confirm your email once. Unsubscribe any time.</small></div>';
    var l = last(c);
    if (l) return '<div class="hero-cta"><a class="btn" href="#d-' + c.id + '-' + l.day + '">Watch Day ' + l.day + '</a><small>Free. Notes and files included.</small></div>';
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

  /* CLASSROOM: every challenge as a course */
  function classroom() {
    var order = { now: 0, paused: 1, done: 2, soon: 3 };
    var list = S.challenges.slice().sort(function (a, b) { return order[a.status] - order[b.status]; });
    return '<div class="head"><h1>Classroom</h1><p>Every challenge, day by day. All free.</p></div><div class="cgrid">' +
      list.map(function (c) {
        var n = (c.days || []).length, tag = c.status === 'soon' ? 'Season 1' : n + ' lesson' + (n === 1 ? '' : 's') + (c.tools && c.tools[0] ? ' · ' + c.tools[0] : '');
        var pct = c.totalDays ? Math.min(100, Math.round(n / (c.totalDays + 1) * 100)) : 0;
        var inner = cover(c, true) + '<div class="course__b"><h2>' + esc(c.title) + '</h2><p>' + esc(c.oneLine) + '</p>' +
          '<div class="prog" role="img" aria-label="' + n + ' of ' + ((c.totalDays || 0) + 1) + ' days"><i data-pct="' + pct + '"></i></div><div class="course__f"><span>' + esc(tag) + '</span>' + stateHTML(c) + '</div></div>';
        return c.status === 'soon' ? '<div class="card course">' + inner + '</div>' : '<a class="card course" href="#c-' + c.id + '">' + inner + '</a>';
      }).join('') + '</div>';
  }

  /* COURSE overview */
  function course(c) {
    return '<a class="back" href="#classroom">Classroom</a><div class="split"><article class="card main">' + cover(c) +
      kicker() + '<h1>' + esc(c.title) + '</h1>' + metaHTML(c) + board(c) + '<div class="prose">' +
        (c.about ? sec('About this challenge', '<p>' + esc(c.about) + '</p>') : '') +
        (c.learn && c.learn.length ? sec("What you'll learn", ticks(c.learn)) : '') +
        (c.tools && c.tools.length ? sec('Tools', chips(c.tools)) : '') +
        sec('Lessons', dayRows(c, true)) +
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
    return '<a class="back" href="#c-' + c.id + '">' + esc(c.title) + '</a><div class="lgrid">' +
      '<nav class="card mods" aria-label="Days"><h3>' + esc(c.title) + '</h3>' + mods + '</nav>' +
      '<article class="card lesson">' + player +
        '<h1>Day ' + d.day + ' · ' + esc(d.title) + '</h1>' +
        '<div class="meta"><span>' + esc(fmt(d.date)) + '</span>' + (d.length ? '<span class="dot" aria-hidden="true"></span><span>' + esc(d.length) + '</span>' : '') + '<span class="dot" aria-hidden="true"></span><a href="' + esc(yt) + '" target="_blank" rel="noopener">Open on YouTube</a></div>' +
        '<div class="prose">' +
          sec('Notes', d.notes ? notes(d.notes) : '<p class="muted">Notes for this day are on the way.</p>') +
          (files.length ? sec('Files', '<ul class="files">' + files.map(function (f) { return fileRow(f); }).join('') + '</ul>') : '') +
        '</div>' +
        '<div class="pager">' + (prev ? '<a class="prev" href="#d-' + c.id + '-' + prev.day + '">‹ Day ' + prev.day + '</a>' : '<span></span>') +
          (next ? '<a class="btn" href="#d-' + c.id + '-' + next.day + '">Day ' + next.day + ' ›</a>' : '<a class="btn btn--line" href="#c-' + c.id + '">All lessons</a>') + '</div>' +
      '</article></div>';
  }

  /* FILES */
  function filesPage() {
    var groups = S.challenges.map(function (c) {
      var rows = days(c).filter(function (d) { return (d.files || []).length; }).map(function (d) {
        return d.files.map(function (f) { return fileRow(f, 'Day ' + d.day + (f.note ? ' · ' + f.note : '')); }).join('');
      }).join('');
      return rows ? '<section class="card fgroup"><h2>' + esc(c.title) + '</h2><ul class="files">' + rows + '</ul></section>' : '';
    }).join('');
    return '<div class="head"><h1>Files</h1><p>Every file from every challenge, in one place.</p></div>' +
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
    if (h === 'classroom') { html = classroom(); tab = 'classroom'; }
    else if (h === 'files') { html = filesPage(); tab = 'files'; }
    else if (h === 'about') { html = about(); tab = 'about'; }
    else if ((m = h.match(/^c-([a-z0-9-]+)$/)) && byId[m[1]]) { html = course(byId[m[1]]); tab = 'classroom'; }
    else if ((m = h.match(/^d-([a-z0-9-]+)-(\d+)$/)) && byId[m[1]]) {
      var c = byId[m[1]], d = (c.days || []).filter(function (x) { return x.day === +m[2]; })[0];
      if (d) { html = lesson(c, d); tab = c.id === S.current ? 'now' : 'classroom'; } else html = now();
    }
    else html = now();
    view.innerHTML = html;
    // widths set from script: the site's security policy blocks inline style="" attributes
    view.querySelectorAll('[data-pct]').forEach(function (el) { el.style.width = el.dataset.pct + '%'; });
    document.querySelectorAll('[data-tab]').forEach(function (a) { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  view.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-jump]'); if (!a) return;
    var t = document.getElementById(a.dataset.jump); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  addEventListener('hashchange', function () { route(); scrollTo(0, 0); view.focus({ preventScroll: true }); });
  route();
})();
