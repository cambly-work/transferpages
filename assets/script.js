(() => {
  const LANGUAGE_KEY = 'preferredLanguage';
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

    const isPrimaryCta = link.classList.contains('btn-primary') || /contact\.html$/i.test(href);
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

  if (window.matchMedia('(max-width: 768px)').matches) {
    const labels = docLang.startsWith('pt')
      ? { area: 'Contatos rápidos', wa: 'Falar no WhatsApp', tg: 'Falar no Telegram' }
      : docLang.startsWith('ru')
      ? { area: 'Быстрые контакты', wa: 'Написать в WhatsApp', tg: 'Написать в Telegram' }
      : { area: 'Quick contacts', wa: 'Message on WhatsApp', tg: 'Message on Telegram' };

    const stickyCta = document.createElement('div');
    stickyCta.className = 'mobile-sticky-cta';
    stickyCta.setAttribute('aria-label', labels.area);
    stickyCta.innerHTML = `
      <a class="btn btn-primary" href="https://wa.me/5513996532915" target="_blank" rel="noopener" aria-label="${labels.wa}" data-track="click_whatsapp" data-contact-channel="whatsapp">WhatsApp</a>
      <a class="btn btn-secondary" href="${TELEGRAM_URL}" target="_blank" rel="noopener" aria-label="${labels.tg}" data-track="click_telegram" data-contact-channel="telegram">Telegram</a>
    `;

    document.body.appendChild(stickyCta);
    document.body.classList.add('has-mobile-cta');
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
})();
