/* =========================================================
   Anthony Merlin · Portfolio · main.js
   Vanilla JavaScript, no library.
   Modules: theme, navigation, scroll-spy, reveal, images,
            filters, dialogs (projects + CV), terminal, contact form.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Storage (can throw in private mode, so always wrapped) ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* =========================================================
     LANGUAGE (English by default, French on demand)
     Every visible text and aria-label/alt/title is looked up in
     window.I18N_FR by its English wording. The English original
     is kept in memory so switching back restores it exactly.
     ========================================================= */
  var FR = window.I18N_FR || {};
  var lang = store.get('lang') === 'fr' ? 'fr' : 'en';
  var textOriginals = new WeakMap();
  var attrOriginals = new WeakMap();
  var I18N_ATTRS = ['aria-label', 'alt', 'title'];
  var titleOriginal = document.title;

  function norm(str) { return str.replace(/\s+/g, ' ').trim(); }

  // Translate a string used by the scripts. {name} placeholders are filled from vars.
  function t(en, vars) {
    var out = lang === 'fr' && FR[en] ? FR[en] : en;
    if (vars) Object.keys(vars).forEach(function (k) { out = out.split('{' + k + '}').join(vars[k]); });
    return out;
  }

  function translateTree(rootEl) {
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var parent = n.parentElement;
        if (!parent || parent.closest('script, style, [data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        return /[A-Za-zÀ-ÿ]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      if (!textOriginals.has(n)) textOriginals.set(n, n.nodeValue);
      var en = textOriginals.get(n);
      var fr = FR[norm(en)];
      if (lang === 'fr' && fr) {
        n.nodeValue = en.match(/^\s*/)[0] + fr + en.match(/\s*$/)[0];
      } else {
        n.nodeValue = en;
      }
    }
    $$('[aria-label], [alt], [title]', rootEl).forEach(function (el) {
      if (el.hasAttribute('data-i18n-noattr')) return;
      var saved = attrOriginals.get(el);
      if (!saved) {
        saved = {};
        I18N_ATTRS.forEach(function (a) { if (el.hasAttribute(a)) saved[a] = el.getAttribute(a); });
        attrOriginals.set(el, saved);
      }
      Object.keys(saved).forEach(function (a) {
        var fr = FR[saved[a]];
        el.setAttribute(a, lang === 'fr' && fr ? fr : saved[a]);
      });
    });
  }

  var langBtn = $('.lang-toggle');
  var langListeners = [];
  function onLangChange(fn) { langListeners.push(fn); }

  function setLang(next, save) {
    lang = next === 'fr' ? 'fr' : 'en';
    if (save) store.set('lang', lang);
    root.setAttribute('lang', lang);
    document.title = lang === 'fr' && FR[titleOriginal] ? FR[titleOriginal] : titleOriginal;
    translateTree(document.body);
    if (langBtn) {
      // The button always offers the other language, labelled in that language.
      langBtn.textContent = lang === 'fr' ? 'EN' : 'FR';
      langBtn.setAttribute('lang', lang === 'fr' ? 'en' : 'fr');
      langBtn.setAttribute('aria-label', lang === 'fr' ? 'Read this page in English' : 'Lire cette page en français');
    }
    langListeners.forEach(function (fn) { fn(lang); });
  }
  if (langBtn) {
    langBtn.setAttribute('data-i18n-noattr', '');
    langBtn.addEventListener('click', function () { setLang(lang === 'fr' ? 'en' : 'fr', true); });
  }

  /* =========================================================
     THEME
     ========================================================= */
  var themeBtn = $('.theme-toggle');

  function setTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    if (save) store.set('theme', theme);
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', t(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'));
    }
  }
  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  if (themeBtn) themeBtn.setAttribute('data-i18n-noattr', '');
  setTheme(currentTheme(), false);
  onLangChange(function () { setTheme(currentTheme(), false); });
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  }
  // Follow the system setting as long as the visitor has not chosen a theme.
  var lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  var onSystemTheme = function (e) { if (!store.get('theme')) setTheme(e.matches ? 'light' : 'dark', false); };
  if (lightQuery.addEventListener) lightQuery.addEventListener('change', onSystemTheme);

  /* =========================================================
     MOBILE NAVIGATION
     ========================================================= */
  var navToggle = $('.nav-toggle');
  var navList = $('#nav-list');

  function closeNav() {
    if (!navToggle) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navList.classList.remove('is-open');
  }
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navList.classList.toggle('is-open', !open);
    });
    $$('a', navList).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') { closeNav(); navToggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav')) closeNav();
    });
  }

  /* =========================================================
     SCROLL-SPY: highlight the menu link of the visible section
     ========================================================= */
  var navLinks = $$('.nav-list a');
  var spyMap = {
    about: 'about', skills: 'skills', experience: 'experience',
    portfolio: 'portfolio', interests: 'portfolio', contact: 'contact'
  };
  var sections = Object.keys(spyMap).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      sections.forEach(function (s) {
        if ((visible[s.id] || 0) > bestRatio) { bestRatio = visible[s.id]; best = s.id; }
      });
      if (best) setActive(spyMap[best]);
      else if (window.scrollY < 200) setActive('');
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .01, .25, .5, 1] });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* =========================================================
     REVEAL ON SCROLL
     ========================================================= */
  var revealEls = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); revealObs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  }

  /* =========================================================
     IMAGES: neat placeholder while a screenshot is missing
     ========================================================= */
  function watchImage(img) {
    var holder = img.parentElement;
    var mark = function () {
      holder.classList.add('is-missing');
      holder.setAttribute('data-label', img.getAttribute('data-fallback') || '');
    };
    if (img.complete && img.naturalWidth === 0) mark();
    else img.addEventListener('error', mark, { once: true });
  }
  $$('img[data-fallback]').forEach(watchImage);

  /* =========================================================
     PORTFOLIO FILTERS
     ========================================================= */
  var filterBtns = $$('.filter');
  var tiles = $$('.tile');
  var filterStatus = $('#filter-status');

  function tileHas(tile, f) { return f === 'all' || (' ' + tile.getAttribute('data-tech') + ' ').indexOf(' ' + f + ' ') > -1; }

  function plural(n) { return n + ' ' + t(n > 1 ? 'projects' : 'project'); }

  // Show how many projects use each technology.
  filterBtns.forEach(function (btn) {
    var f = btn.getAttribute('data-filter');
    var n = tiles.filter(function (tile) { return tileHas(tile, f); }).length;
    var c = document.createElement('span');
    c.className = 'count';
    c.textContent = n;
    c.setAttribute('aria-hidden', 'true');
    btn.appendChild(c);
    btn.setAttribute('data-count', n);
    btn.setAttribute('data-i18n-noattr', '');
  });
  function labelFilters() {
    filterBtns.forEach(function (btn) {
      btn.setAttribute('aria-label', btn.firstChild.textContent.trim() + ', ' + plural(+btn.getAttribute('data-count')));
    });
  }
  var currentFilter = 'all';

  function applyFilter(f) {
    currentFilter = f;
    var shown = 0;
    tiles.forEach(function (t) {
      var ok = tileHas(t, f);
      t.hidden = !ok;
      // The featured tile only spans two columns when everything is shown.
      t.classList.toggle('tile-featured', ok && f === 'all' && t.id === 'project-benevolt');
      if (ok) shown++;
    });
    filterBtns.forEach(function (b) {
      var on = b.getAttribute('data-filter') === f;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (filterStatus) {
      var label = f === 'all' ? t('all technologies') : $('.filter[data-filter="' + f + '"]').firstChild.textContent.trim();
      filterStatus.textContent = plural(shown) + ' · ' + label;
    }
  }
  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); });
  });
  if (filterStatus) filterStatus.setAttribute('data-i18n-skip', '');
  onLangChange(function () { labelFilters(); applyFilter(currentFilter); });

  /* =========================================================
     DIALOGS
     ========================================================= */
  var projectDialog = $('#project-dialog');
  var projectBody = $('#project-dialog-body');
  var projectCmd = $('#project-dialog-cmd');
  var cvDialog = $('#cv-dialog');
  var cvFrame = $('#cv-frame');
  var lastFocus = null;
  var supportsDialog = typeof HTMLDialogElement === 'function' && 'showModal' in document.createElement('dialog');

  function openDialog(dlg) {
    lastFocus = document.activeElement;
    if (supportsDialog) dlg.showModal(); else dlg.setAttribute('open', '');
    root.classList.add('modal-open');
  }
  function closeDialog(dlg) {
    if (supportsDialog && dlg.open) dlg.close(); else dlg.removeAttribute('open');
  }

  [projectDialog, cvDialog].forEach(function (dlg) {
    if (!dlg) return;
    dlg.addEventListener('close', function () {
      root.classList.remove('modal-open');
      if (dlg === projectDialog && location.hash.indexOf('#project-') === 0) {
        history.replaceState(null, '', location.pathname + location.search);
      }
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    });
    // Click on the backdrop closes the dialog.
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) closeDialog(dlg);
    });
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { closeDialog(dlg); }); });
  });

  var projectIds = ['benevolt', 'yaasystem', 'motorbike', 'portfolio', 'basicfit', 'matski', 'website'];

  function openProject(id) {
    var tpl = document.getElementById('tpl-' + id);
    if (!tpl || !projectDialog) return false;
    projectBody.innerHTML = '';
    projectBody.appendChild(tpl.content.cloneNode(true));
    projectCmd.innerHTML = '<span class="cmd-path">~/projects</span> $ cat ' + id + '.md';
    translateTree(projectBody);
    $$('img[data-fallback]', projectBody).forEach(watchImage);
    projectBody.scrollTop = 0;
    if (!projectDialog.open) openDialog(projectDialog);
    history.replaceState(null, '', '#project-' + id);
    return true;
  }

  function openCV() {
    if (!cvDialog) return;
    if (cvFrame && !cvFrame.getAttribute('src')) cvFrame.setAttribute('src', cvFrame.getAttribute('data-src'));
    openDialog(cvDialog);
  }

  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-open-project]');
    if (p) { e.preventDefault(); openProject(p.getAttribute('data-open-project')); return; }
    var c = e.target.closest('[data-open-cv]');
    if (c) { e.preventDefault(); openCV(); }
  });

  // Deep link: index.html#project-benevolt opens that project.
  if (location.hash.indexOf('#project-') === 0) {
    openProject(location.hash.replace('#project-', ''));
  }

  /* =========================================================
     TERMINAL
     ========================================================= */
  var out = $('#terminal-output');
  var body = $('#terminal-body');
  var form = $('#terminal-form');
  var input = $('#terminal-input');
  var history_ = [];
  var hIndex = 0;

  var projectNames = {
    benevolt: 'Benevolt, volunteering platform (SAÉ 3.01, case study)',
    yaasystem: 'YAASystem, WordPress on a Raspberry Pi',
    motorbike: 'MotorBike Highway, 2D game in C#',
    portfolio: 'This portfolio',
    basicfit: 'Class booking app (Basic-Fit clone)',
    matski: 'Matski, HR database',
    website: 'Personal site and custom domain'
  };

  var sectionsByCmd = {
    about: 'about', skills: 'skills', experience: 'experience', education: 'education',
    projects: 'portfolio', portfolio: 'portfolio', interests: 'interests',
    references: 'references', contact: 'contact'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function print(html, cls) {
    var p = document.createElement('div');
    p.className = 't-line' + (cls ? ' ' + cls : '');
    p.setAttribute('data-i18n-skip', '');
    p.innerHTML = html;
    out.appendChild(p);
    body.scrollTop = body.scrollHeight;
  }
  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }

  var commands = {
    help: {
      desc: 'list the commands',
      run: function () {
        var rows = Object.keys(commands).filter(function (k) { return !commands[k].hidden; }).map(function (k) {
          return '<span class="t-key">' + k + '</span><span class="t-muted">' + esc(t(commands[k].desc)) + '</span>';
        });
        print('<div class="t-table">' + rows.join('') + '</div>');
      }
    },
    whoami: {
      desc: 'who I am, in one line',
      run: function () { print(esc(t('Anthony Merlin. Second-year computer science student (BUT Informatique) at the IUT of Annecy, France. Looking for an internship from April 2027.'))); }
    },
    ls: {
      desc: 'list sections, or projects with "ls projects"',
      run: function (args) {
        if (args[0] === 'projects' || args[0] === 'projects/') {
          var rows = Object.keys(projectNames).map(function (k) {
            return '<span class="t-key">' + k + '</span><span class="t-muted">' + esc(t(projectNames[k])) + '</span>';
          });
          print('<div class="t-table">' + rows.join('') + '</div>');
          print(t('Type {cmd} to read one, e.g. {ex}.', { cmd: '<span class="t-accent">open &lt;' + (lang === 'fr' ? 'nom' : 'name') + '&gt;</span>', ex: '<span class="t-accent">open benevolt</span>' }), 't-muted');
        } else {
          print('about.md  skills.md  experience.log  <span class="t-accent">projects/</span>  interests.md  references.txt  contact.sh  cv.pdf');
        }
      }
    },
    open: {
      desc: 'open a project, e.g. "open benevolt"',
      run: function (args) {
        var id = (args[0] || '').toLowerCase().replace(/\.md$/, '');
        if (!id) { print(t('usage: open &lt;project&gt;. Try {ls}.', { ls: '<span class="t-accent">ls projects</span>' }), 't-muted'); return; }
        if (id === 'cv' || id === 'cv.pdf') { commands.cv.run(); return; }
        if (projectIds.indexOf(id) === -1) { print(t('open: no project called "{x}". Try {ls}.', { x: esc(id), ls: '<span class="t-accent">ls projects</span>' }), 't-err'); return; }
        print(t('Opening {x}…', { x: esc(t(projectNames[id])) }), 't-ok');
        openProject(id);
      }
    },
    cat: {
      desc: 'read a file, e.g. "cat about.md"',
      run: function (args) {
        var f = (args[0] || '').toLowerCase();
        if (f === 'cv.pdf') { commands.cv.run(); return; }
        var id = f.replace(/\.(md|log|txt|sh)$/, '').replace(/\/$/, '');
        if (id === 'contact') { commands.contact.run(); return; }
        if (sectionsByCmd[id]) { print('→ ' + esc(f), 't-ok'); goTo(sectionsByCmd[id]); return; }
        if (projectIds.indexOf(id) > -1) { commands.open.run([id]); return; }
        print(t('cat: {x}: no such file. Type {ls}.', { x: esc(f || '(nothing)'), ls: '<span class="t-accent">ls</span>' }), 't-err');
      }
    },
    about: { desc: 'jump to About', run: function () { print('→ about.md', 't-ok'); goTo('about'); } },
    skills: { desc: 'jump to Skills', run: function () { print('→ skills.md', 't-ok'); goTo('skills'); } },
    experience: { desc: 'jump to Experience and Education', run: function () { print('→ experience.log', 't-ok'); goTo('experience'); } },
    projects: { desc: 'jump to the Portfolio', run: function () { print('→ projects/', 't-ok'); goTo('portfolio'); } },
    cv: { desc: 'view my CV (PDF), then download it', run: function () { print(t('Opening cv.pdf…'), 't-ok'); openCV(); } },
    contact: {
      desc: 'write to me',
      run: function () {
        print('Email: <a href="mailto:Anthony.Merlin@etu.univ-smb.fr">Anthony.Merlin@etu.univ-smb.fr</a>');
        print(t('→ contact form'), 't-ok');
        goTo('contact');
        setTimeout(function () { var n = $('#c-name'); if (n) n.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 600);
      }
    },
    github: { desc: 'open my GitHub', run: function () { print('→ github.com/flashlefilou', 't-ok'); window.open('https://github.com/flashlefilou', '_blank', 'noopener'); } },
    linkedin: { desc: 'open my LinkedIn', run: function () { print('→ linkedin.com/in/anthony-merlin-8452ab316', 't-ok'); window.open('https://www.linkedin.com/in/anthony-merlin-8452ab316/', '_blank', 'noopener'); } },
    theme: {
      desc: 'switch theme: "theme", "theme light", "theme dark"',
      run: function (args) {
        var th = args[0] === 'light' || args[0] === 'dark' ? args[0] : (currentTheme() === 'dark' ? 'light' : 'dark');
        setTheme(th, true);
        print(t('Theme set to {x}.', { x: th }), 't-ok');
      }
    },
    lang: {
      desc: 'switch language: "lang fr", "lang en"',
      run: function (args) {
        var l = args[0] === 'fr' || args[0] === 'en' ? args[0] : (lang === 'fr' ? 'en' : 'fr');
        setLang(l, true);
        print(l === 'fr' ? 'Langue : français.' : 'Language set to English.', 't-ok');
      }
    },
    date: { desc: 'print the date', run: function () { print(new Date().toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'full', timeStyle: 'short' })); } },
    clear: { desc: 'clear the screen', run: function () { out.innerHTML = ''; } },
    sudo: {
      hidden: true,
      run: function (args) {
        if (args.join(' ').indexOf('hire') > -1) {
          print(t('Permission granted. Taking you to the contact form.'), 't-ok');
          commands.contact.run();
        } else {
          print(t('Nice try. You do not need root here: type {help}.', { help: '<span class="t-accent">help</span>' }), 't-muted');
        }
      }
    },
    exit: { hidden: true, run: function () { print(t('There is no exit. Only {contact}.', { contact: '<span class="t-accent">contact</span>' }), 't-muted'); } }
  };

  function run(raw) {
    var line = raw.trim();
    print('<span class="cmd-path">~</span>$ ' + esc(line), 't-cmd');
    if (!line) return;
    history_.push(line);
    hIndex = history_.length;
    var parts = line.split(/\s+/);
    var name = parts[0].toLowerCase();
    var args = parts.slice(1).map(function (a) { return a.toLowerCase(); });
    if (projectIds.indexOf(name) > -1 && !commands[name]) { commands.open.run([name]); return; }
    var cmd = commands[name];
    if (cmd) cmd.run(args);
    else print(t('command not found: {x}. Type {help}.', { x: esc(name), help: '<span class="t-accent">help</span>' }), 't-err');
  }

  if (form && input) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      run(input.value);
      input.value = '';
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        if (!history_.length) return;
        e.preventDefault();
        hIndex = Math.max(0, hIndex - 1);
        input.value = history_[hIndex];
      } else if (e.key === 'ArrowDown') {
        if (!history_.length) return;
        e.preventDefault();
        hIndex = Math.min(history_.length, hIndex + 1);
        input.value = history_[hIndex] || '';
      } else if (e.key === 'Tab') {
        // Tab completion on commands, then on project names after "open".
        var v = input.value.toLowerCase();
        if (!v) return;
        var m = v.match(/^(open|cat)\s+(\S*)$/);
        var pool, prefix, base;
        if (m) { pool = projectIds; prefix = m[2]; base = m[1] + ' '; }
        else if (v.indexOf(' ') === -1) { pool = Object.keys(commands).filter(function (k) { return !commands[k].hidden; }); prefix = v; base = ''; }
        else return;
        var hits = pool.filter(function (k) { return k.indexOf(prefix) === 0; });
        e.preventDefault();
        if (hits.length === 1) input.value = base + hits[0] + (base ? '' : ' ');
        else if (hits.length > 1) print(hits.join('  '), 't-muted');
      }
    });

    // Clicking anywhere in the terminal body focuses the prompt (without stealing text selection).
    body.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      if (window.getSelection && String(window.getSelection())) return;
      input.focus({ preventScroll: true });
    });
  }

  $$('.chip[data-cmd]').forEach(function (chip) {
    chip.addEventListener('click', function () { run(chip.getAttribute('data-cmd')); });
  });

  /* =========================================================
     CONTACT FORM → mailto (no back-end allowed)
     ========================================================= */
  var cform = $('#contact-form');
  var TO = 'Anthony.Merlin@etu.univ-smb.fr';

  var rules = {
    'c-name': function (v) { return v.length < 2 ? t('Please enter your name.') : ''; },
    'c-email': function (v) {
      if (!v) return t('Please enter your email address.');
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : t('This email address does not look right. Example: name@company.com');
    },
    'c-subject': function (v) { return v.length < 3 ? t('Please add a short subject.') : ''; },
    'c-message': function (v) { return v.length < 20 ? t('Your message is a bit short: at least 20 characters, please ({n} so far).', { n: v.length }) : ''; }
  };

  function check(field) {
    var msg = rules[field.id](field.value.trim());
    var err = document.getElementById(field.id + '-err');
    err.textContent = msg;
    if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    return !msg;
  }

  if (cform) {
    var fields = Object.keys(rules).map(function (id) { return document.getElementById(id); });
    $$('.field-error, .form-status', cform).forEach(function (el) { el.setAttribute('data-i18n-skip', ''); });
    onLangChange(function () {
      fields.forEach(function (f) { if (f.getAttribute('aria-invalid') === 'true') check(f); });
      var st = $('#form-status'); if (st) st.textContent = '';
    });
    // Validate on blur, then live once a field has been marked invalid.
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value.trim()) check(f); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') check(f); });
    });

    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('#form-status');
      status.textContent = '';
      var firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
      if (firstBad) { firstBad.focus(); return; }

      var name = $('#c-name').value.trim();
      var email = $('#c-email').value.trim();
      var subject = $('#c-subject').value.trim();
      var message = $('#c-message').value.trim();
      var bodyText = message + '\n\n--\n' + name + '\n' + email;
      var href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText);

      window.location.href = href;
      status.innerHTML = esc(t('Your email app should open with the message ready to send. If nothing happens, write to')) + ' <a href="mailto:' + TO + '">' + TO + '</a>.';
    });
  }

  /* ---------- Copy email ---------- */
  var copyBtn = $('#copy-email');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email');
      var done = function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = t('Copied');
        setTimeout(function () { copyBtn.textContent = old; }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, function () { window.prompt(t('Copy the address:'), email); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = email; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { window.prompt(t('Copy the address:'), email); }
        document.body.removeChild(ta);
      }
    });
  }

  /* ---------- Apply the language once everything is wired ---------- */
  setLang(lang, false);

  /* ---------- Footer year ---------- */
  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
