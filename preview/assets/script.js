(() => {
  const LANGUAGE_KEY = 'preferredLanguage';
  const CONSENT_KEY = 'cookie_consent';
  const SUPPORTED_LANGUAGES = ['ru', 'pt', 'en'];
  const TELEGRAM_URL = 'https://t.me/premium_transfer_latam';

  const safeStorageGet = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };

  const safeStorageSet = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore quota/privacy mode restrictions.
    }
  };

  const trackEvent = (eventName, eventParams = {}) => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, eventParams);
  };


  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const year = document.querySelector('[data-year]');
  const docLang = document.documentElement.lang || 'en';
  const docLangShort = docLang.startsWith('pt') ? 'pt' : docLang.startsWith('ru') ? 'ru' : 'en';

  if (toggle && nav) {
    const navList = nav.querySelector('.nav-list');
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    if (navList && !navList.id) navList.id = 'primary-nav-list';
    if (navList) toggle.setAttribute('aria-controls', navList.id);

    const openLabel = toggle.getAttribute('aria-label') || 'Open menu';
    const closeLabel = docLang.startsWith('pt') ? 'Fechar menu' : docLang.startsWith('ru') ? 'Закрыть меню' : 'Close menu';
    let scrollPosition = 0;

    const lockScroll = () => {
      if (!window.matchMedia('(max-width: 768px)').matches || document.body.classList.contains('menu-open')) return;
      scrollPosition = window.scrollY || window.pageYOffset;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.classList.add('menu-open');
    };

    const unlockScroll = () => {
      if (!document.body.classList.contains('menu-open')) return;
      document.body.classList.remove('menu-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPosition);
    };

    const closeNav = () => {
      nav.classList.remove('open');
      overlay.classList.remove('active');
      unlockScroll();
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', openLabel);
    };

    const openNav = () => {
      nav.classList.add('open');
      overlay.classList.add('active');
      lockScroll();
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', closeLabel);
    };

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      expanded ? closeNav() : openNav();
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
    });
    overlay.addEventListener('click', closeNav);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeNav();
    });
  }

  if (year) year.textContent = new Date().getFullYear();

  const normalizePath = (path) => {
    if (!path) return '/';
    return path.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
  };

  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-list a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    const normalizedHref = normalizePath(new URL(href, window.location.origin).pathname);
    if (normalizedHref === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('.lang-switch a').forEach((link) => {
    const path = new URL(link.getAttribute('href'), window.location.origin).pathname;
    const langCode = path.split('/').filter(Boolean)[0];
    if (SUPPORTED_LANGUAGES.includes(langCode)) {
      link.dataset.track = 'language_switch';
      link.dataset.language = langCode;
    }

    link.addEventListener('click', () => {
      if (SUPPORTED_LANGUAGES.includes(langCode)) {
        safeStorageSet(LANGUAGE_KEY, langCode);
        trackEvent('language_switch', {
          selected_language: langCode,
          page_language: docLang,
          location_path: window.location.pathname,
        });
      }
    });
  });

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = (link.getAttribute('href') || '').trim();
    if (!href) return;

    if (href.includes('wa.me/')) {
      link.dataset.track = link.dataset.track || 'click_whatsapp';
      link.dataset.contactChannel = 'whatsapp';
    } else if (href.includes('t.me/')) {
      link.setAttribute('href', TELEGRAM_URL);
      link.dataset.track = link.dataset.track || 'click_telegram';
      link.dataset.contactChannel = 'telegram';
    }

    const isPrimaryCta = link.classList.contains('btn-primary') || /contact\/?$/i.test(href);
    if (isPrimaryCta && !link.dataset.track) {
      link.dataset.track = 'booking_cta_click';
    }
  });

  document.addEventListener('click', (event) => {
    const trackedLink = event.target.closest('a[data-track]');
    if (!trackedLink) return;

    trackEvent(trackedLink.dataset.track, {
      link_url: trackedLink.href,
      link_text: (trackedLink.textContent || '').trim().slice(0, 120),
      language: docLang,
      target_language: trackedLink.dataset.language || '',
      channel: trackedLink.dataset.contactChannel || '',
      page_path: window.location.pathname,
    });
  });

  const mobileCtaMedia = window.matchMedia('(max-width: 768px)');
  let stickyCta = null;
  let ctaResizeObserver = null;

  const syncMobileCtaOffset = () => {
    if (!stickyCta) return;
    const height = Math.ceil(stickyCta.getBoundingClientRect().height || 0);
    document.documentElement.style.setProperty('--mobile-cta-height', `${height}px`);
  };

  const teardownMobileCta = () => {
    if (!stickyCta) return;
    ctaResizeObserver?.disconnect();
    window.removeEventListener('orientationchange', syncMobileCtaOffset);
    window.visualViewport?.removeEventListener('resize', syncMobileCtaOffset);
    stickyCta.remove();
    stickyCta = null;
    ctaResizeObserver = null;
    document.body.classList.remove('has-mobile-cta');
    document.documentElement.style.removeProperty('--mobile-cta-height');
  };

  const setupMobileCta = () => {
    if (!mobileCtaMedia.matches || stickyCta) return;
    const labels = docLang.startsWith('pt')
      ? { area: 'Contatos rápidos', wa: 'Falar no WhatsApp', tg: 'Falar no Telegram' }
      : docLang.startsWith('ru')
      ? { area: 'Быстрые контакты', wa: 'Написать в WhatsApp', tg: 'Написать в Telegram' }
      : { area: 'Quick contacts', wa: 'Message on WhatsApp', tg: 'Message on Telegram' };

    stickyCta = document.createElement('div');
    stickyCta.className = 'mobile-sticky-cta';
    stickyCta.setAttribute('aria-label', labels.area);
    stickyCta.innerHTML = `
      <a class="btn btn-primary" href="https://wa.me/5513996532915" target="_blank" rel="noopener" aria-label="${labels.wa}" data-track="click_whatsapp" data-contact-channel="whatsapp">WhatsApp</a>
      <a class="btn btn-secondary" href="${TELEGRAM_URL}" target="_blank" rel="noopener" aria-label="${labels.tg}" data-track="click_telegram" data-contact-channel="telegram">Telegram</a>
    `;

    document.body.appendChild(stickyCta);
    document.body.classList.add('has-mobile-cta');
    syncMobileCtaOffset();

    if ('ResizeObserver' in window) {
      ctaResizeObserver = new ResizeObserver(syncMobileCtaOffset);
      ctaResizeObserver.observe(stickyCta);
    }
    window.addEventListener('orientationchange', syncMobileCtaOffset, { passive: true });
    window.visualViewport?.addEventListener('resize', syncMobileCtaOffset, { passive: true });
  };

  const handleMobileCtaMedia = () => {
    if (mobileCtaMedia.matches) {
      setupMobileCta();
      syncMobileCtaOffset();
      return;
    }
    teardownMobileCta();
  };

  handleMobileCtaMedia();
  if (typeof mobileCtaMedia.addEventListener === 'function') {
    mobileCtaMedia.addEventListener('change', handleMobileCtaMedia);
  } else if (typeof mobileCtaMedia.addListener === 'function') {
    mobileCtaMedia.addListener(handleMobileCtaMedia);
  }

  const routeButtons = document.querySelectorAll('[data-route-target]');
  if (routeButtons.length) {
    const routeFields = {
      route: document.querySelector('[data-route-field="route"]'),
      type: document.querySelector('[data-route-field="type"]'),
      scenario: document.querySelector('[data-route-field="scenario"]'),
      format: document.querySelector('[data-route-field="format"]'),
    };
    const routeLines = document.querySelectorAll('[data-route-line]');

    const activateRoute = (button) => {
      routeButtons.forEach((item) => item.classList.toggle('active', item === button));
      routeLines.forEach((line) => line.classList.toggle('active', line.dataset.routeLine === button.dataset.routeTarget));
      if (routeFields.route) routeFields.route.textContent = button.dataset.routeName || '';
      if (routeFields.type) routeFields.type.textContent = button.dataset.routeType || '';
      if (routeFields.scenario) routeFields.scenario.textContent = button.dataset.routeScenario || '';
      if (routeFields.format) routeFields.format.textContent = button.dataset.routeFormat || '';
    };

    routeButtons.forEach((button, index) => {
      button.addEventListener('click', () => activateRoute(button));
      if (index === 0) activateRoute(button);
    });
  }

  document.querySelectorAll('[data-step-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const card = trigger.closest('.process-step, .scenario-card');
      if (!card) return;
      const scope = card.parentElement?.querySelectorAll(`.${card.classList.contains('scenario-card') ? 'scenario-card' : 'process-step'}`);
      scope?.forEach((item) => item.classList.remove('active'));
      card.classList.add('active');
    });
  });

  const revealNodes = document.querySelectorAll('.reveal');
  if (revealNodes.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
  }

  const existingPreference = safeStorageGet(LANGUAGE_KEY);
  if (existingPreference && SUPPORTED_LANGUAGES.includes(existingPreference)) {
    document.documentElement.setAttribute('data-preferred-language', existingPreference);
  }

  // ---------- Cookie consent banner ----------
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    const storedConsent = safeStorageGet(CONSENT_KEY);
    const grantAnalytics = () => {
      if (typeof window.gtag !== 'function') return;
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    };
    const denyAnalytics = () => {
      if (typeof window.gtag !== 'function') return;
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    };

    if (storedConsent === 'all') {
      grantAnalytics();
    } else if (storedConsent === 'essential') {
      denyAnalytics();
    } else {
      banner.hidden = false;
      requestAnimationFrame(() => banner.classList.add('is-visible'));
    }

    const setConsent = (mode) => {
      safeStorageSet(CONSENT_KEY, mode);
      banner.classList.remove('is-visible');
      setTimeout(() => { banner.hidden = true; }, 280);
      if (mode === 'all') {
        grantAnalytics();
        trackEvent('cookie_consent', { decision: 'all' });
      } else {
        denyAnalytics();
        trackEvent('cookie_consent', { decision: 'essential' });
      }
    };

    banner.querySelector('[data-cookie-action="accept"]')?.addEventListener('click', () => setConsent('all'));
    banner.querySelector('[data-cookie-action="reject"]')?.addEventListener('click', () => setConsent('essential'));
  }

  // ---------- Quote calculator ----------
  const calculator = document.querySelector('[data-calculator]');
  if (calculator) {
    const dataNode = calculator.querySelector('[data-calc-data]');
    let data = null;
    try { data = JSON.parse(dataNode?.textContent || '{}'); } catch (e) { data = null; }

    if (data && Array.isArray(data.pairs)) {
      const fromSel = calculator.querySelector('[data-calc-from]');
      const toSel = calculator.querySelector('[data-calc-to]');
      const paxSel = calculator.querySelector('[data-calc-pax]');
      const luggageSel = calculator.querySelector('[data-calc-luggage]');
      const result = calculator.querySelector('[data-calc-result]');
      const stateError = calculator.querySelector('[data-calc-state-error]');
      const stateOk = calculator.querySelector('[data-calc-state-ok]');
      const routeNameEl = calculator.querySelector('[data-calc-route-name]');
      const distEl = calculator.querySelector('[data-calc-distance]');
      const durEl = calculator.querySelector('[data-calc-duration]');
      const priceEl = calculator.querySelector('[data-calc-price]');
      const confirmBtn = calculator.querySelector('[data-calc-confirm]');

      const formatDuration = (mins, lang) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (lang === 'ru') return `${h ? h + ' ч ' : ''}${m ? m + ' мин' : ''}`.trim();
        return `${h ? h + 'h ' : ''}${m ? m + 'min' : ''}`.trim();
      };

      const findPair = (a, b) =>
        data.pairs.find((p) => (p.from === a && p.to === b) || (p.from === b && p.to === a));

      const showError = (msg) => {
        result.hidden = false;
        stateError.hidden = false;
        stateError.textContent = msg;
        stateOk.hidden = true;
      };

      const showResult = (pair) => {
        result.hidden = false;
        stateError.hidden = true;
        stateOk.hidden = false;
        const fromName = data.cities[fromSel.value];
        const toName = data.cities[toSel.value];
        routeNameEl.textContent = `${fromName} → ${toName}`;
        distEl.textContent = `${pair.km} km`;
        durEl.textContent = formatDuration(pair.durationMin, data.lang);
        priceEl.textContent = `R$ ${pair.priceMin}–${pair.priceMax}`;

        const msg = data.lang === 'pt'
          ? `Olá! Quero um orçamento para ${fromName} → ${toName}. ${paxSel.value} passageiro(s), bagagem ${luggageSel.value}.`
          : data.lang === 'ru'
          ? `Здравствуйте! Прошу расчёт на маршрут ${fromName} → ${toName}. Пассажиров: ${paxSel.value}, багаж: ${luggageSel.value}.`
          : `Hello! I'd like a quote for ${fromName} → ${toName}. ${paxSel.value} passenger(s), luggage: ${luggageSel.value}.`;
        confirmBtn.href = `${data.whatsapp}?text=${encodeURIComponent(msg)}`;

        trackEvent('calculator_estimate', {
          route_slug: pair.slug,
          from: fromSel.value,
          to: toSel.value,
          pax: paxSel.value,
          luggage: luggageSel.value,
        });
      };

      calculator.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!fromSel.value || !toSel.value) {
          showError(data.messages.pickFirst);
          return;
        }
        if (fromSel.value === toSel.value) {
          showError(data.messages.sameCity);
          return;
        }
        const pair = findPair(fromSel.value, toSel.value);
        if (!pair) {
          showError(data.messages.notFound);
          return;
        }
        showResult(pair);
      });
    }
  }

  // ---------- Multi-step brief form ----------
  const briefForm = document.querySelector('[data-brief-form]');
  if (briefForm) {
    const lang = briefForm.dataset.lang || 'en';
    const whatsappBase = briefForm.dataset.whatsapp;
    const steps = Array.from(briefForm.querySelectorAll('[data-brief-step]'));
    const totalEl = briefForm.querySelector('[data-brief-step-total]');
    const currentEl = briefForm.querySelector('[data-brief-step-current]');
    const progressEl = briefForm.querySelector('[data-brief-progress]');
    const backBtn = briefForm.querySelector('[data-brief-back]');
    const nextBtn = briefForm.querySelector('[data-brief-next]');
    const submitBtn = briefForm.querySelector('[data-brief-submit]');
    const errorEl = briefForm.querySelector('[data-brief-error]');
    const total = steps.length;
    let index = 0;

    if (totalEl) totalEl.textContent = String(total);

    const i18nMsg = (key) => {
      const dict = {
        ru: { fillRequired: 'Заполните обязательные поля', consentRequired: 'Необходимо согласие на обработку данных' },
        pt: { fillRequired: 'Preencha os campos obrigatórios', consentRequired: 'É necessário concordar com o tratamento dos dados' },
        en: { fillRequired: 'Please fill in required fields', consentRequired: 'Consent is required to process your data' },
      };
      return (dict[lang] || dict.en)[key];
    };

    const render = () => {
      steps.forEach((step, i) => {
        const active = i === index;
        step.hidden = !active;
        step.setAttribute('aria-hidden', String(!active));
      });
      currentEl.textContent = String(index + 1);
      progressEl.style.width = `${((index + 1) / total) * 100}%`;
      backBtn.hidden = index === 0;
      const last = index === total - 1;
      nextBtn.hidden = last;
      submitBtn.hidden = !last;
      errorEl.hidden = true;
    };

    const showError = (msg) => {
      errorEl.hidden = false;
      errorEl.textContent = msg;
    };

    const validateStep = () => {
      const step = steps[index];
      const required = step.querySelectorAll('[data-brief-required]');
      let valid = true;
      let radioGroupsChecked = new Set();

      required.forEach((field) => {
        if (field.type === 'radio') {
          const group = briefForm.querySelectorAll(`[name="${field.name}"]`);
          const anyChecked = Array.from(group).some((r) => r.checked);
          if (!anyChecked) valid = false;
          radioGroupsChecked.add(field.name);
        } else if (field.type === 'checkbox') {
          if (!field.checked) valid = false;
        } else if (!field.value.trim()) {
          valid = false;
        }
      });

      if (!valid) {
        const hasConsent = step.querySelector('[name="consent"]');
        showError(hasConsent && !hasConsent.checked ? i18nMsg('consentRequired') : i18nMsg('fillRequired'));
      }
      return valid;
    };

    nextBtn?.addEventListener('click', () => {
      if (!validateStep()) return;
      if (index < total - 1) {
        index += 1;
        render();
      }
    });

    backBtn?.addEventListener('click', () => {
      if (index > 0) {
        index -= 1;
        render();
      }
    });

    briefForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validateStep()) return;

      const fd = new FormData(briefForm);
      const labels = {
        ru: {
          intro: 'Здравствуйте! Заявка с сайта:',
          fromCity: 'Откуда', toCity: 'Куда', service: 'Тип',
          date: 'Дата', time: 'Время', pax: 'Пассажиры', bags: 'Багаж',
          children: 'Дети до 10 лет', childSeat: 'Детское кресло',
          name: 'Имя', contact: 'Контакт', notes: 'Особое',
          yes: 'да',
        },
        pt: {
          intro: 'Olá! Solicitação pelo site:',
          fromCity: 'De', toCity: 'Para', service: 'Tipo',
          date: 'Data', time: 'Hora', pax: 'Passageiros', bags: 'Bagagem',
          children: 'Crianças <10', childSeat: 'Cadeirinha',
          name: 'Nome', contact: 'Contato', notes: 'Observações',
          yes: 'sim',
        },
        en: {
          intro: 'Hello! Request from the website:',
          fromCity: 'From', toCity: 'To', service: 'Service',
          date: 'Date', time: 'Time', pax: 'Passengers', bags: 'Luggage',
          children: 'Children <10', childSeat: 'Child seat',
          name: 'Name', contact: 'Contact', notes: 'Notes',
          yes: 'yes',
        },
      };
      const L = labels[lang] || labels.en;

      const lines = [L.intro, ''];
      const add = (label, value) => { if (value) lines.push(`• ${label}: ${value}`); };
      add(L.fromCity, fd.get('fromCity'));
      add(L.toCity, fd.get('toCity'));
      add(L.service, fd.get('service'));
      add(L.date, fd.get('date'));
      add(L.time, fd.get('time'));
      add(L.pax, fd.get('pax'));
      add(L.bags, fd.get('bags'));
      if (fd.get('children')) add(L.children, L.yes);
      if (fd.get('childSeat')) add(L.childSeat, L.yes);
      add(L.name, fd.get('name'));
      add(L.contact, fd.get('contact'));
      add(L.notes, fd.get('notes'));

      const message = lines.join('\n');
      const url = `${whatsappBase}?text=${encodeURIComponent(message)}`;

      trackEvent('brief_form_submit', {
        service: fd.get('service') || '',
        language: lang,
      });

      window.open(url, '_blank', 'noopener');
    });

    render();
  }
})();
