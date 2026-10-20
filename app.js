(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const darkMq = matchMedia('(prefers-color-scheme: dark)');
  const effTheme = () => root.dataset.theme || (darkMq.matches ? 'dark' : 'light');
  function applyTheme() {
    const eff = effTheme();
    root.dataset.eff = eff;
    $$('img[data-light]').forEach(img => {
      const src = eff === 'light' ? img.dataset.light : img.dataset.dark;
      if (img.getAttribute('src') !== src) img.src = src;
    });
  }
  $('#themeBtn').addEventListener('click', () => {
    root.dataset.theme = effTheme() === 'dark' ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
    applyTheme();
  });
  darkMq.addEventListener('change', applyTheme);
  applyTheme();

  /* ---------- language ---------- */
  const LANGS = ['en', 'uk', 'ru', 'tr'];
  const CODES = { en: 'EN', uk: 'UA', ru: 'RU', tr: 'TR' };
  const LOCALE = { en: 'en-US', uk: 'uk-UA', ru: 'ru-RU', tr: 'tr-TR' };
  const T = window.I18N || {};
  T.en = T.en || {};
  $$('[data-i18n]').forEach(el => { T.en[el.dataset.i18n] ??= el.innerHTML; });
  T.en._title ??= document.title;
  const t = (l, k) => (T[l] && T[l][k] != null) ? T[l][k] : T.en[k];

  // the visitor's system languages, most preferred first, e.g. ['ru-RU', 'en']
  const sysLocales = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map(x => x.toLowerCase());
  const LANG_ALIAS = { uk: 'uk', ua: 'uk', ru: 'ru', be: 'ru', kk: 'ru', tr: 'tr', en: 'en' };
  const browserLang = sysLocales.map(x => LANG_ALIAS[x.split('-')[0]]).find(Boolean);

  let lang = 'en';
  let curChosen = store.get('currency');

  function applyLang(l) {
    lang = l;
    $$('[data-i18n]').forEach(el => { const v = t(l, el.dataset.i18n); if (v != null) el.innerHTML = v; });
    document.documentElement.lang = l;
    document.title = t(l, '_title');
    $('#langCode').textContent = CODES[l];
    $$('#langMenu li').forEach(li => li.setAttribute('aria-selected', li.dataset.lang === l));
    $('#formLang').value = l;
    setCurrency(currency);
  }

  const langWrap = $('#lang'), langBtn = $('#langBtn');
  const closeLang = () => { langWrap.classList.remove('open'); langBtn.setAttribute('aria-expanded', 'false'); };
  langBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !langWrap.classList.contains('open');
    langWrap.classList.toggle('open', open);
    langBtn.setAttribute('aria-expanded', open);
    if (open) ($('#langMenu li[aria-selected="true"]') || $('#langMenu li')).focus();
  });
  $$('#langMenu li').forEach(li => {
    const pick = () => {
      store.set('lang', li.dataset.lang);
      applyLang(li.dataset.lang);
      const u = new URL(location.href); u.searchParams.set('lang', li.dataset.lang); history.replaceState(null, '', u);
      closeLang(); langBtn.focus();
    };
    li.addEventListener('click', pick);
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); (li.nextElementSibling || li.parentElement.firstElementChild).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (li.previousElementSibling || li.parentElement.lastElementChild).focus(); }
    });
  });
  document.addEventListener('click', e => { if (!langWrap.contains(e.target)) closeLang(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLang(); closeMenu(); closeLightbox(); } });

  /* ---------- currency ---------- */
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'UAH', 'RUB', 'TRY'];
  // fallback rates per 1 USD; replaced by live rates when available
  let RATES = { USD: 1, EUR: 0.86, GBP: 0.75, UAH: 41.5, RUB: 90, TRY: 45 };
  const EURO_REGIONS = 'at be cy de ee es fi fr gr hr ie it lt lu lv mt nl pt si sk me xk rs ba mk al'.split(' ');
  function localeCurrency() {
    for (const loc of sysLocales) {
      const [lng, region] = loc.split('-');
      if (region === 'gb') return 'GBP';
      if (region === 'ua') return 'UAH';
      if (region === 'ru') return 'RUB';
      if (region === 'tr') return 'TRY';
      if (region === 'us') return 'USD';
      if (EURO_REGIONS.includes(region)) return 'EUR';
      const byLang = { uk: 'UAH', ru: 'RUB', tr: 'TRY', de: 'EUR', fr: 'EUR', it: 'EUR', es: 'EUR', nl: 'EUR', pt: 'EUR', sr: 'EUR', hr: 'EUR', bs: 'EUR', me: 'EUR', cnr: 'EUR' }[lng];
      if (byLang) return byLang;
    }
    return 'USD';
  }
  let currency = CURRENCIES.includes(curChosen) ? curChosen : localeCurrency();

  function fmt(usd, cur) {
    const raw = usd * RATES[cur];
    const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(raw)) - 1)); // two significant digits
    const v = Math.round(raw / step) * step;
    return new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(v);
  }
  function setCurrency(cur) {
    currency = cur;
    $('#currency').value = cur;
    $$('[data-usd]').forEach(el => { el.textContent = fmt(+el.dataset.usd, cur); });
  }
  $('#currency').addEventListener('change', e => { curChosen = e.target.value; store.set('currency', curChosen); setCurrency(curChosen); });

  // live exchange rates, cached for 12 hours
  (async () => {
    try {
      const cached = JSON.parse(store.get('rates') || 'null');
      if (cached && Date.now() - cached.t < 12 * 3600e3) { RATES = { ...RATES, ...cached.r }; setCurrency(currency); return; }
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data && data.rates) {
        const r = {}; CURRENCIES.forEach(c => { if (data.rates[c]) r[c] = data.rates[c]; });
        RATES = { ...RATES, ...r }; store.set('rates', JSON.stringify({ t: Date.now(), r }));
        setCurrency(currency);
      }
    } catch (e) { /* keep fallback rates */ }
  })();

  /* ---------- start ---------- */
  const fromUrl = new URLSearchParams(location.search).get('lang');
  applyLang([fromUrl, store.get('lang'), browserLang].find(l => LANGS.includes(l)) || 'en');

  /* ---------- nav ---------- */
  const navEl = $('#nav'), burger = $('#burger');
  const onScroll = () => navEl.classList.toggle('scrolled', scrollY > 8);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  function closeMenu() { navEl.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  burger.addEventListener('click', () => {
    const open = !navEl.classList.contains('menu-open');
    navEl.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#links a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- hero parallax ---------- */
  const stage = $('#heroStage');
  const laptop = $('.laptop', stage), phone = $('.phone', stage);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    let ticking = false;
    const frame = () => {
      const p = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.9)));
      laptop.style.transform = `perspective(1600px) rotateX(${(1 - p) * 8}deg) scale(${0.96 + p * 0.04})`;
      phone.style.transform = `translateY(${-p * 70}px)`;
      ticking = false;
    };
    frame();
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  }

  /* ---------- gallery ---------- */
  const gallery = $('#gallery');
  const arrows = $$('.gallery-nav .round');
  const updateArrows = () => {
    arrows[0].disabled = gallery.scrollLeft < 8;
    arrows[1].disabled = gallery.scrollLeft + gallery.clientWidth > gallery.scrollWidth - 8;
  };
  arrows.forEach(b => b.addEventListener('click', () => {
    const card = $('.card-work', gallery);
    gallery.scrollBy({ left: +b.dataset.dir * (card.offsetWidth + 22), behavior: 'smooth' });
  }));
  gallery.addEventListener('scroll', updateArrows, { passive: true });
  addEventListener('resize', updateArrows); updateArrows();

  /* ---------- before / after ---------- */
  const compare = $('#compare'), range = $('#cmpRange');
  const setPos = v => compare.style.setProperty('--pos', v + '%');
  range.addEventListener('input', () => { compare.dataset.touched = '1'; setPos(range.value); });
  const hint = () => {
    if (reduce || compare.dataset.touched) return;
    const keys = [50, 22, 78, 50], dur = 2200, t0 = performance.now();
    const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const step = now => {
      if (compare.dataset.touched) return;
      const k = Math.min(1, (now - t0) / dur) * (keys.length - 1);
      const i = Math.min(keys.length - 2, Math.floor(k));
      const v = keys[i] + (keys[i + 1] - keys[i]) * ease(k - i);
      setPos(v); range.value = v;
      if (k < keys.length - 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- pricing tabs ---------- */
  const tabs = $$('#planTabs button');
  function showPlan(id) {
    tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.plan === id));
    $$('.plans').forEach(p => {
      const on = p.dataset.plan === id;
      p.hidden = !on;
      if (on) { p.classList.remove('swap'); void p.offsetWidth; p.classList.add('swap'); }
    });
  }
  tabs.forEach(b => b.addEventListener('click', () => showPlan(b.dataset.plan)));
  $$('.tile[data-plan]').forEach(tile => tile.addEventListener('click', () => showPlan(tile.dataset.plan)));

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    if (en.target === compare) setTimeout(hint, 500);
    io.unobserve(en.target);
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- contact form (Formspree) ---------- */
  const form = $('#contactForm'), status = $('#formStatus');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type="submit"]', form);
    const show = (key, ok) => { status.hidden = false; status.textContent = t(lang, key); status.classList.toggle('ok', !!ok); status.classList.toggle('err', !ok && key === 'f.err'); };
    if (form.action.includes('YOUR_FORM_ID')) {
      // form service not connected yet: fall back to a prefilled email
      const d = new FormData(form);
      const body = `${d.get('name')}\n${d.get('email_or_contact')}\n${d.get('service')}\n\n${d.get('message')}`;
      location.href = `mailto:danialkovalenko@gmail.com?subject=${encodeURIComponent('Website request')}&body=${encodeURIComponent(body)}`;
      return;
    }
    btn.disabled = true; show('f.sending');
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      form.reset(); $('#formLang').value = lang; show('f.ok', true);
    } catch (err) { show('f.err'); }
    btn.disabled = false;
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('img', lb);
  let lastFocus = null;
  function closeLightbox() {
    if (lb.hidden) return;
    lb.classList.remove('show');
    setTimeout(() => { lb.hidden = true; lbImg.src = ''; }, 250);
    if (lastFocus) lastFocus.focus();
  }
  $$('.cred-img[data-full]').forEach(btn => btn.addEventListener('click', () => {
    lastFocus = btn;
    lbImg.src = btn.dataset.full; lbImg.alt = $('img', btn).alt;
    lb.hidden = false; requestAnimationFrame(() => lb.classList.add('show'));
    $('button', lb).focus();
  }));
  lb.addEventListener('click', e => { if (e.target !== lbImg) closeLightbox(); });
})();
