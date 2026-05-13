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
      <a class="msc-btn msc-btn--wa" href="https://wa.me/5513996532915" target="_blank" rel="noopener" aria-label="${labels.wa}" data-track="click_whatsapp" data-contact-channel="whatsapp">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zM12.04 20.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.25-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.17 8.17 0 0 1 2.41 5.83c0 4.54-3.69 8.22-8.23 8.22zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z"/></svg>
        <span>WhatsApp</span>
      </a>
      <a class="msc-btn msc-btn--tg" href="${TELEGRAM_URL}" target="_blank" rel="noopener" aria-label="${labels.tg}" data-track="click_telegram" data-contact-channel="telegram">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
        <span>Telegram</span>
      </a>
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

  const revealNodes = document.querySelectorAll('.reveal, .reveal-up, .reveal-stagger, .h1-mask');
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
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
  }

  // Stagger initial hero reveals (no IO needed for above-the-fold)
  document.querySelectorAll('.hero .reveal-up').forEach((node, idx) => {
    node.style.transitionDelay = `${idx * 0.08}s`;
    requestAnimationFrame(() => node.classList.add('is-visible'));
  });

  // ---------- Legal TOC + scroll-spy ----------
  const toc = document.querySelector('[data-toc]');
  const legalContent = document.querySelector('.legal-content');
  if (toc && legalContent) {
    const tocLabels = {
      ru: 'Разделы',
      pt: 'Seções',
      en: 'Sections',
    };
    const label = tocLabels[docLangShort] || tocLabels.en;
    const slugify = (text) => text.toString().toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    const headings = Array.from(legalContent.querySelectorAll('h2'));
    if (headings.length) {
      const ol = document.createElement('ol');
      const labelEl = document.createElement('h4');
      labelEl.textContent = label;
      toc.appendChild(labelEl);
      toc.appendChild(ol);

      headings.forEach((h2, idx) => {
        if (!h2.id) h2.id = `section-${slugify(h2.textContent) || idx + 1}`;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${h2.id}`;
        // Strip leading "N. " from text to keep TOC clean (counter handles numbering)
        a.textContent = h2.textContent.replace(/^\s*\d+\.\s*/, '');
        li.appendChild(a);
        ol.appendChild(li);
      });

      const tocLinks = Array.from(toc.querySelectorAll('a'));
      const spyObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const id = entry.target.id;
            const link = tocLinks.find((a) => a.getAttribute('href') === `#${id}`);
            if (!link) return;
            if (entry.isIntersecting) {
              tocLinks.forEach((l) => l.classList.remove('active'));
              link.classList.add('active');
            }
          });
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      headings.forEach((h) => spyObserver.observe(h));
    }
  }

  // Retrofit metric-strip integers with data-count-to BEFORE the observer subscribes.
  // Without this, the metric-strip numbers under the hero (4 countries, 11 cities)
  // get data-count-to but the observer's static querySelectorAll snapshot from
  // earlier doesn't include them — and they stay at 0 forever.
  document.querySelectorAll('.metric-strip dd .num').forEach((el) => {
    const text = (el.textContent || '').trim();
    const match = text.match(/^(\d+)$/);
    if (match) {
      el.dataset.countTo = match[1];
      el.dataset.countDuration = '900';
      el.textContent = '0';
    }
  });

  // Count-up animation
  const countUpNodes = document.querySelectorAll('[data-count-to]');
  if (countUpNodes.length && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          countObserver.unobserve(el);
          const target = parseFloat(el.dataset.countTo);
          const duration = parseInt(el.dataset.countDuration || '1200', 10);
          const start = performance.now();
          const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(target * eased);
            el.textContent = value.toLocaleString();
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 }
    );
    countUpNodes.forEach((n) => {
      // Force-trigger immediately if element is already in viewport on load.
      // Hero metric-strip is above-the-fold — without this, IO sometimes
      // doesn't fire because it's not technically "entering" the viewport.
      const rect = n.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        countObserver.observe(n);
        // Manually trigger after a tiny delay so it counts up visibly on load
      } else {
        countObserver.observe(n);
      }
    });
  }

  const existingPreference = safeStorageGet(LANGUAGE_KEY);
  if (existingPreference && SUPPORTED_LANGUAGES.includes(existingPreference)) {
    document.documentElement.setAttribute('data-preferred-language', existingPreference);
  }

  // ---------- Sticky header shrinking + back-to-top ----------
  const SHRINK_AT = 60;
  const BACK_AT = 800;
  const backTopBtn = document.querySelector('[data-back-to-top]');
  let lastScrollY = 0;
  let scrollTicking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (Math.abs(y - lastScrollY) > 4) {
      document.body.classList.toggle('is-scrolled', y > SHRINK_AT);
      backTopBtn?.classList.toggle('is-visible', y > BACK_AT);
      lastScrollY = y;
    }
    scrollTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollTicking) { requestAnimationFrame(onScroll); scrollTicking = true; }
  }, { passive: true });
  backTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackEvent('back_to_top', { from_y: lastScrollY });
  });

  // ---------- Service worker registration (PWA) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/transferpages/sw.js').catch(() => { /* offline support unavailable */ });
    });
  }

  // ---------- Blog search (offline filter) ----------
  const blogSearch = document.querySelector('[data-blog-search]');
  if (blogSearch) {
    const list = document.querySelector('[data-blog-list]');
    const cards = Array.from(list?.querySelectorAll('.post-card') || []);
    const noResults = document.querySelector('[data-blog-no-results]');
    const filter = () => {
      const q = blogSearch.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach((c) => {
        const match = !q || (c.dataset.searchable || '').toLowerCase().includes(q);
        c.hidden = !match;
        if (match) visible += 1;
      });
      if (noResults) noResults.hidden = visible !== 0;
    };
    blogSearch.addEventListener('input', filter);
  }

  // ---------- Theme toggle (dark mode) ----------
  const THEME_KEY = 'preferredTheme';
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggle) {
      const isDark = theme === 'dark';
      themeToggle.setAttribute('aria-label',
        docLangShort === 'ru' ? (isDark ? 'Светлая тема' : 'Тёмная тема')
        : docLangShort === 'pt' ? (isDark ? 'Tema claro' : 'Tema escuro')
        : (isDark ? 'Light theme' : 'Dark theme'));
    }
  };
  const storedTheme = safeStorageGet(THEME_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    applyTheme(storedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }
  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    safeStorageSet(THEME_KEY, next);
    trackEvent('theme_toggle', { theme: next });
  });

  // ---------- Click-to-copy ----------
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      const value = btn.dataset.copy;
      const copyLabel = btn.dataset.copyLabel || 'Copy';
      const copiedLabel = btn.dataset.copiedLabel || 'Copied';
      try {
        await navigator.clipboard.writeText(value);
        btn.classList.add('is-copied');
        btn.setAttribute('aria-label', copiedLabel);
        const flash = btn.querySelector('.copy-flash');
        if (flash) flash.textContent = copiedLabel;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.setAttribute('aria-label', copyLabel);
        }, 1800);
      } catch (e) { /* ignore */ }
    });
  });

  // ---------- Article reading progress bar ----------
  const progressEl = document.querySelector('[data-reading-progress] > span');
  const article = document.querySelector('.blog-post');
  if (progressEl && article) {
    const update = () => {
      const rect = article.getBoundingClientRect();
      const total = article.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      progressEl.style.width = pct + '%';
    };
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
    }, { passive: true });
    update();
  }

  // ---------- Idle initialiser for non-critical interactive features ----------
  // These don't affect first-paint or core flows. Run them after idle so
  // hero render isn't blocked by setting up hover/pointer/audio plumbing.
  const idle = (cb) => ('requestIdleCallback' in window)
    ? window.requestIdleCallback(cb, { timeout: 1800 })
    : setTimeout(cb, 600);

  idle(() => {

  // ---------- Spotlight effect on bento cells ----------
  // Each cell tracks cursor position via CSS vars --mx --my (0–100%).
  // The CSS uses radial-gradient at that position for a soft glow.
  // Only attached on devices with hover + fine pointer (desktop).
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const spotlightCells = document.querySelectorAll('.bento-cell');
    spotlightCells.forEach((cell) => {
      let raf = 0;
      const update = (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = cell.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          cell.style.setProperty('--mx', x + '%');
          cell.style.setProperty('--my', y + '%');
          raf = 0;
        });
      };
      cell.addEventListener('pointerenter', () => cell.classList.add('has-spotlight'));
      cell.addEventListener('pointermove', update, { passive: true });
      cell.addEventListener('pointerleave', () => {
        cell.classList.remove('has-spotlight');
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      });
    });
  }

  // ---------- Magnetic CTA (primary buttons pull toward cursor) ----------
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.btn.btn-dark.btn-arrow, .cta-strip-actions .btn-dark').forEach((btn) => {
      let raf = 0;
      const onMove = (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = btn.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = (e.clientX - cx) * 0.18;
          const dy = (e.clientY - cy) * 0.22;
          btn.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
          raf = 0;
        });
      };
      const reset = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        btn.style.transform = '';
      };
      btn.addEventListener('pointerenter', () => btn.classList.add('is-magnetic'));
      btn.addEventListener('pointermove', onMove, { passive: true });
      btn.addEventListener('pointerleave', () => {
        btn.classList.remove('is-magnetic');
        reset();
      });
    });
  }

  // ---------- Haptic feedback on CTA tap (touch only) ----------
  if ('vibrate' in navigator && window.matchMedia('(hover: none)').matches) {
    document.addEventListener('click', (event) => {
      const cta = event.target.closest('.btn-dark, .btn-primary, .bento-cell, .copy-btn, [data-cmdk-trigger]');
      if (!cta) return;
      try { navigator.vibrate(12); } catch (e) { /* noop */ }
    }, { passive: true });
  }

  // ---------- Sound brand (opt-in via footer toggle) ----------
  // Uses Web Audio synthesis — no asset downloads. Tiny click on CTA submit.
  const SOUND_KEY = 'soundOn';
  const soundEnabled = () => safeStorageGet(SOUND_KEY) === '1';
  let audioCtx = null;
  const playClick = (freq = 880, duration = 0.08) => {
    if (!soundEnabled()) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      // Chrome/Safari suspend AudioContext until user gesture — resume on every play.
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      // Slight frequency dip for a "click" feel.
      osc.frequency.exponentialRampToValueAtTime(freq * 0.78, t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (e) { /* silently fail on unsupported devices */ }
  };
  const soundToggle = document.querySelector('[data-sound-toggle]');
  const soundLabel = soundToggle?.querySelector('[data-sound-label]');
  const updateSoundLabel = () => {
    if (!soundLabel) return;
    const on = soundEnabled();
    const labels = {
      ru: on ? 'Звуки вкл' : 'Звуки выкл',
      pt: on ? 'Som ligado' : 'Som desligado',
      en: on ? 'Sound on' : 'Sound off',
      es: on ? 'Sonido on' : 'Sonido off',
    };
    soundLabel.textContent = labels[docLangShort] || labels.en;
    soundToggle.setAttribute('aria-pressed', String(on));
  };
  updateSoundLabel();
  soundToggle?.addEventListener('click', () => {
    const next = soundEnabled() ? '0' : '1';
    safeStorageSet(SOUND_KEY, next);
    updateSoundLabel();
    if (next === '1') playClick(880, 0.05); // confirm-tick
  });
  // Hook into existing flows
  document.addEventListener('submit', (e) => {
    if (e.target.matches('[data-brief-form], [data-newsletter], [data-calculator]')) playClick(660, 0.08);
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cmdk-trigger], [data-theme-toggle], [data-back-to-top]')) playClick(1100, 0.04);
  });

  }); // end idle()

  // ---------- Route-row hover preview ----------
  document.querySelectorAll('.route-row').forEach((row) => {
    let tip = null;
    row.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: none)').matches) return;
      const name = row.querySelector('.route-name')?.textContent || '';
      const meta = row.querySelector('.route-meta')?.textContent || '';
      const dur = row.querySelector('.route-duration')?.textContent || '';
      tip = document.createElement('div');
      tip.className = 'route-tip';
      tip.innerHTML = `<strong>${name}</strong><br><span class="num">${meta}</span><br><span class="num">${dur}</span>`;
      document.body.appendChild(tip);
      const r = row.getBoundingClientRect();
      tip.style.top = (r.top + window.scrollY - tip.offsetHeight - 12) + 'px';
      tip.style.left = (r.left + r.width / 2 - tip.offsetWidth / 2) + 'px';
      requestAnimationFrame(() => tip.classList.add('is-visible'));
    });
    row.addEventListener('mouseleave', () => {
      if (tip) { tip.remove(); tip = null; }
    });
  });

  // ---------- UTM-aware hero personalisation ----------
  // ?utm_source=<partner> rewrites the hero kicker + lead. Mapping table is
  // intentionally small — add real partners here when onboarded.
  const utmParams = new URLSearchParams(window.location.search);
  const utmSource = (utmParams.get('utm_source') || '').toLowerCase();
  const utmMap = {
    marriott: {
      ru: { kicker: 'Для гостей Marriott', lead: 'Премиум-трансфер из/в отель с проверенным водителем. NF-e на компанию.' },
      pt: { kicker: 'Para hóspedes Marriott', lead: 'Transfer premium de/para o hotel com motorista verificado. NF-e para empresa.' },
      en: { kicker: 'For Marriott guests', lead: 'Premium transfer to/from the hotel with a verified driver. NF-e on the company.' },
      es: { kicker: 'Para huéspedes Marriott', lead: 'Transfer premium de/al hotel con conductor verificado. NF-e a la empresa.' },
    },
    hotel: {
      ru: { kicker: 'Для гостей отеля-партнёра', lead: 'Премиум-трансфер по preferred rate для гостей наших отелей-партнёров.' },
      pt: { kicker: 'Para hóspedes de hotel parceiro', lead: 'Transfer premium em tarifa preferencial para hóspedes de hotéis parceiros.' },
      en: { kicker: 'For partner hotel guests', lead: 'Premium transfer at preferred rate for guests of our partner hotels.' },
      es: { kicker: 'Para huéspedes de hotel asociado', lead: 'Transfer premium a tarifa preferente para huéspedes de hoteles asociados.' },
    },
    relocation: {
      ru: { kicker: 'Для тех, кто переезжает', lead: 'Транспортная часть релокации: длинные плечи с багажом, школой, банком и адаптацией первой недели.' },
      pt: { kicker: 'Para quem está se mudando', lead: 'O transporte da relocação: trechos longos com bagagem, escola, banco e adaptação da primeira semana.' },
      en: { kicker: 'For those relocating', lead: 'The transport leg of relocation: long routes with luggage, school, bank, and first-week onboarding.' },
      es: { kicker: 'Para quien se está mudando', lead: 'El transporte de la reubicación: rutas largas con equipaje, escuela, banco y primera semana.' },
    },
  };
  if (utmMap[utmSource]) {
    const seasonalHero = document.querySelector('[data-hero-seasonal]');
    if (seasonalHero) {
      const k = seasonalHero.querySelector('[data-season-kicker]');
      const l = seasonalHero.querySelector('[data-season-lead]');
      const v = utmMap[utmSource][docLangShort] || utmMap[utmSource].en;
      if (k && v.kicker) k.textContent = v.kicker;
      if (l && v.lead) l.textContent = v.lead;
      seasonalHero.dataset.utm = utmSource;
      trackEvent('utm_personalised', { utm_source: utmSource });
    }
  }

  // ---------- Time-of-day hero adaptation ----------
  // Subtle: between 22:00 and 5:00 in the user's local timezone, swap the
  // hero kicker for a night-flight friendly variant. Doesn't override UTM.
  if (!utmMap[utmSource]) {
    const hr = new Date().getHours();
    const isNight = hr >= 22 || hr < 5;
    if (isNight) {
      const seasonalHero = document.querySelector('[data-hero-seasonal]');
      const k = seasonalHero?.querySelector('[data-season-kicker]');
      const nightKicker = {
        ru: 'Ночной рейс? Подача за час до вылета.',
        pt: 'Voo noturno? Apresentação 1h antes da decolagem.',
        en: 'Night flight? Pickup an hour before departure.',
        es: 'Vuelo nocturno? Recogida una hora antes.',
      };
      if (k) {
        k.textContent = nightKicker[docLangShort] || nightKicker.en;
        trackEvent('hero_time_of_day', { period: 'night' });
      }
    }
  }

  // ---------- Returning visitor recognition ----------
  // Save the last calculator query so a return visit can offer one-tap re-run.
  // Lives in localStorage under 'lastQuote'.
  try {
    const lastQuoteRaw = window.localStorage.getItem('lastQuote');
    if (lastQuoteRaw) {
      const lastQuote = JSON.parse(lastQuoteRaw);
      const ageHrs = (Date.now() - (lastQuote.t || 0)) / 1000 / 3600;
      if (ageHrs < 168 && lastQuote.from && lastQuote.to) {
        // Show a soft banner above the calculator suggesting to re-run
        const calc = document.getElementById('calculator');
        if (calc && !calc.querySelector('.return-visitor-banner')) {
          const labels = {
            ru: { hi: 'С возвращением', cta: 'Повторить расчёт', sep: '→' },
            pt: { hi: 'De volta', cta: 'Repetir a estimativa', sep: '→' },
            en: { hi: 'Welcome back', cta: 'Re-run the quote', sep: '→' },
            es: { hi: 'Bienvenido', cta: 'Repetir la estimación', sep: '→' },
          };
          const l = labels[docLangShort] || labels.en;
          const banner = document.createElement('div');
          banner.className = 'return-visitor-banner';
          banner.innerHTML = `
            <span class="rvb-hi">${l.hi}.</span>
            <span class="rvb-route num">${lastQuote.from} ${l.sep} ${lastQuote.to}</span>
            <a class="rvb-cta" href="?from=${encodeURIComponent(lastQuote.from)}&to=${encodeURIComponent(lastQuote.to)}&pax=${lastQuote.pax || ''}&luggage=${lastQuote.luggage || ''}#calculator">${l.cta}</a>
          `;
          const container = calc.querySelector('.container');
          if (container) container.insertBefore(banner, container.firstChild);
          trackEvent('returning_visitor_banner', { age_hours: Math.round(ageHrs) });
        }
      }
    }
  } catch (e) { /* localStorage may be unavailable */ }

  // Hook into calculator submit to save the latest quote
  document.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-calculator]')) return;
    const fd = new FormData(e.target);
    const data = {
      from: fd.get('from'), to: fd.get('to'),
      pax: fd.get('pax'), luggage: fd.get('luggage'),
      t: Date.now(),
    };
    if (data.from && data.to) {
      try { window.localStorage.setItem('lastQuote', JSON.stringify(data)); } catch (e) {}
    }
  });

  // ---------- Save-and-resume brief form ----------
  // Persists field values to localStorage as user types. Restores on next visit
  // (within 7 days). Cleared after successful submit.
  const briefDraftKey = 'briefDraft';
  const briefDraftForm = document.querySelector('[data-brief-form]');
  if (briefDraftForm) {
    try {
      const raw = window.localStorage.getItem(briefDraftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        const ageHrs = (Date.now() - (draft.t || 0)) / 1000 / 3600;
        if (ageHrs < 168) {
          // Only fill empty fields (don't override URL prefill)
          Object.entries(draft.fields || {}).forEach(([name, value]) => {
            const el = briefDraftForm.querySelector(`[name="${name}"]`);
            if (!el || !value) return;
            if (el.type === 'checkbox') { if (value === 'true') el.checked = true; }
            else if (el.type === 'radio') {
              const r = briefDraftForm.querySelector(`[name="${name}"][value="${value}"]`);
              if (r) r.checked = true;
            } else if (!el.value) {
              el.value = value;
            }
          });
          // Show small note
          const note = document.createElement('p');
          note.className = 'brief-resume-note muted small';
          note.textContent = ({
            ru: 'Восстановлены данные из вашей прошлой заявки.',
            pt: 'Recuperamos os dados da sua última solicitação.',
            en: 'Restored fields from your last draft.',
            es: 'Restauramos los campos del último borrador.',
          })[docLangShort] || 'Restored fields from your last draft.';
          briefDraftForm.querySelector('.brief-head')?.appendChild(note);
        }
      }
    } catch (e) {}

    const saveDraft = () => {
      try {
        const fd = new FormData(briefDraftForm);
        const fields = {};
        fd.forEach((v, k) => { fields[k] = String(v); });
        // Also include checkboxes that are unchecked (they don't appear in FormData)
        briefDraftForm.querySelectorAll('input[type="checkbox"]').forEach((c) => {
          fields[c.name] = c.checked ? 'true' : 'false';
        });
        window.localStorage.setItem(briefDraftKey, JSON.stringify({ fields, t: Date.now() }));
      } catch (e) {}
    };
    let debounce;
    briefDraftForm.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(saveDraft, 400);
    });
    briefDraftForm.addEventListener('submit', () => {
      try { window.localStorage.removeItem(briefDraftKey); } catch (e) {}
    });
  }

  // ---------- Seasonal hero ----------
  const seasonalHero = document.querySelector('[data-hero-seasonal]');
  if (seasonalHero) {
    const dataNode = seasonalHero.querySelector('[data-season-data]');
    let seasons = null;
    try { seasons = JSON.parse(dataNode?.textContent || '{}'); } catch (e) {}
    if (seasons) {
      const m = new Date().getMonth() + 1;
      // Southern hemisphere: Dec(12), Jan(1), Feb(2), Mar(3) = high coast season
      const isSummer = m === 12 || m <= 3;
      const isWinter = m >= 5 && m <= 10;
      const pick = isSummer ? seasons.summer : isWinter ? seasons.winter : null;
      if (pick) {
        const kicker = seasonalHero.querySelector('[data-season-kicker]');
        const h1 = seasonalHero.querySelector('[data-season-h1]');
        const lead = seasonalHero.querySelector('[data-season-lead]');
        if (kicker) kicker.textContent = pick.kicker;
        if (h1) h1.innerHTML = pick.h1;
        if (lead) lead.textContent = pick.lead;
        seasonalHero.dataset.season = isSummer ? 'summer' : 'winter';
        trackEvent('hero_season', { season: isSummer ? 'summer' : 'winter', month: m });
      }
    }
  }

  // ---------- Newsletter form ----------
  const newsletterForm = document.querySelector('[data-newsletter]');
  if (newsletterForm) {
    const msgEl = newsletterForm.querySelector('[data-newsletter-msg]');
    const emailTo = newsletterForm.dataset.emailTo;
    const nlLang = newsletterForm.dataset.lang || 'en';
    const successByLang = {
      ru: 'Подписаны. Первое письмо — в начале сезона.',
      pt: 'Inscrito. Primeiro e-mail no início da temporada.',
      en: 'Subscribed. First email at the start of the season.',
    };
    newsletterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const fd = new FormData(newsletterForm);
      const email = (fd.get('email') || '').toString().trim();
      const consent = !!fd.get('consent');
      if (!email || !consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

      // No backend on GH Pages — escape hatch: open mailto so the email lands in the inbox.
      const subject = encodeURIComponent('Newsletter signup · ' + nlLang);
      const body = encodeURIComponent(`email: ${email}\nlang: ${nlLang}\nconsent: yes\nsource: ${window.location.href}`);
      window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;

      trackEvent('newsletter_signup', { language: nlLang });
      msgEl.hidden = false;
      msgEl.textContent = successByLang[nlLang] || successByLang.en;
      newsletterForm.querySelector('input[type="email"]').value = '';
    });
  }

  // ---------- GA4 scroll depth tracking ----------
  if (typeof window.gtag === 'function') {
    const milestones = [25, 50, 75, 100];
    const fired = new Set();
    let ticking = false;
    const checkScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const pct = Math.round((window.scrollY / docH) * 100);
      milestones.forEach((m) => {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          trackEvent('scroll_depth', { depth: m, page: window.location.pathname });
        }
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(checkScroll); ticking = true; }
    }, { passive: true });
  }

  // ---------- Driver tracking demo ----------
  const trackCard = document.querySelector('[data-track-card]');
  if (trackCard) {
    const bar = trackCard.querySelector('[data-track-bar]');
    const pct = trackCard.querySelector('[data-track-percent]');
    const eta = trackCard.querySelector('[data-track-eta]');
    const statusEl = trackCard.querySelector('[data-track-status]');
    const distEl = trackCard.querySelector('[data-track-distance]');
    const totalKm = 23;
    const totalMin = 28;
    const start = Date.now();
    const arrivedMs = totalMin * 60 * 1000;

    const fmtTime = (ms) => {
      const d = new Date(Date.now() + ms);
      return d.toTimeString().slice(0, 5);
    };

    const tick = () => {
      const elapsed = Date.now() - start;
      const fakeProgress = Math.min(0.96, (elapsed / 1000) * 0.012);
      const percent = Math.round(fakeProgress * 100);
      bar.style.width = percent + '%';
      pct.textContent = percent;
      const remaining = arrivedMs * (1 - fakeProgress);
      eta.textContent = fmtTime(remaining);
      distEl.textContent = `${Math.max(1, Math.round(totalKm * (1 - fakeProgress)))} ${distEl.textContent.split(' ').slice(1).join(' ')}`;
    };
    tick();
    setInterval(tick, 1500);
  }

  // ---------- Cursor follower (desktop only, opt-in via ?cursor=1 or .cursor-on body class) ----------
  // Disabled by default — kept rAF-per-frame work was a perceptible perf cost on mid-tier laptops.
  // Enable via URL ?cursor=1 or set body.cursor-on in HTML.
  const cursorEnabled = new URLSearchParams(window.location.search).has('cursor')
    || document.body.classList.contains('cursor-on');
  if (cursorEnabled
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-follow visible';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    let tx = 0, ty = 0, cx = 0, cy = 0, rafId = 0, active = false;
    const animate = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        rafId = requestAnimationFrame(animate);
      } else {
        active = false;
      }
    };
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!active) { active = true; rafId = requestAnimationFrame(animate); }
    }, { passive: true });
    document.querySelectorAll('a, button, summary, [data-map-city], [role="button"]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
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

      // Share-quote button + URL-params auto-fill
      const shareBtn = calculator.querySelector('[data-calc-share]');
      const shareDefault = shareBtn?.textContent || '';
      const buildShareUrl = () => {
        const u = new URL(window.location.href);
        u.searchParams.set('from', fromSel.value);
        u.searchParams.set('to', toSel.value);
        u.searchParams.set('pax', paxSel.value);
        u.searchParams.set('luggage', luggageSel.value);
        u.hash = 'calculator';
        return u.toString();
      };
      shareBtn?.addEventListener('click', async () => {
        const url = buildShareUrl();
        try {
          if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
            await navigator.share({ title: document.title, url });
          } else {
            await navigator.clipboard.writeText(url);
          }
          shareBtn.textContent = data.messages.shareCopied;
          trackEvent('calculator_share', { from: fromSel.value, to: toSel.value });
        } catch (e) {
          shareBtn.textContent = data.messages.shareFailed;
        }
        setTimeout(() => { shareBtn.textContent = shareDefault; }, 2500);
      });

      // URL-params auto-fill
      const urlParams = new URLSearchParams(window.location.search);
      const pFrom = urlParams.get('from');
      const pTo = urlParams.get('to');
      const pPax = urlParams.get('pax');
      const pLug = urlParams.get('luggage');
      if (pFrom && data.cities[pFrom]) fromSel.value = pFrom;
      if (pTo && data.cities[pTo]) toSel.value = pTo;
      if (pPax && /^\d+$/.test(pPax)) paxSel.value = pPax;
      if (pLug && ['standard', 'extra', 'oversized'].includes(pLug)) luggageSel.value = pLug;
      if (pFrom && pTo && pFrom !== pTo) {
        // auto-calc on landing with a route
        setTimeout(() => calculator.dispatchEvent(new Event('submit', { cancelable: true })), 150);
      }

      // Map highlight on city change
      const mapEl = document.querySelector('[data-calc-map]');
      const updateMap = () => {
        if (!mapEl) return;
        const from = fromSel.value;
        const to = toSel.value;
        mapEl.querySelectorAll('[data-map-city]').forEach((g) => {
          const id = g.dataset.mapCity;
          g.querySelector('.map-city').classList.toggle('active', id === from || id === to);
        });
        mapEl.querySelectorAll('.map-line').forEach((line) => {
          const [a, b] = line.dataset.mapLine.split('-');
          const match = (a === from && b === to) || (a === to && b === from);
          line.classList.toggle('active', !!(from && to && match));
        });
      };
      [fromSel, toSel].forEach((el) => el.addEventListener('change', updateMap));

      // Click city on map to fill nearest empty field
      mapEl?.querySelectorAll('[data-map-city]').forEach((g) => {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => {
          const id = g.dataset.mapCity;
          if (!fromSel.value) {
            fromSel.value = id;
          } else if (!toSel.value && fromSel.value !== id) {
            toSel.value = id;
          } else {
            // both filled — replace 'to'
            toSel.value = id;
          }
          updateMap();
        });
      });

      // Calculator PDF download
      const calcPdfBtn = calculator.querySelector('[data-calc-pdf]');
      let lastPair = null;
      const ensureJsPDFLocal = () => new Promise((resolve, reject) => {
        if (window.jspdf?.jsPDF) return resolve(window.jspdf);
        const existing = document.querySelector('script[data-jspdf]');
        if (existing) {
          existing.addEventListener('load', () => resolve(window.jspdf), { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
        s.async = true;
        s.dataset.jspdf = 'true';
        s.onload = () => resolve(window.jspdf);
        s.onerror = reject;
        document.head.appendChild(s);
      });

      calcPdfBtn?.addEventListener('click', async () => {
        if (!lastPair) return;
        calcPdfBtn.classList.add('is-loading');
        calcPdfBtn.disabled = true;
        try {
          const { jsPDF } = await ensureJsPDFLocal();
          const doc = new jsPDF({ unit: 'pt', format: 'a4' });
          const pageW = doc.internal.pageSize.getWidth();
          const margin = 56;
          const fromName = data.cities[fromSel.value];
          const toName = data.cities[toSel.value];

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(20);
          doc.text('Morrison Premium Transfer', margin, 64);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(110);
          const titleByLang = { ru: 'Ориентир по маршруту', pt: 'Estimativa de rota', en: 'Route reference' };
          doc.text(titleByLang[data.lang] || titleByLang.en, margin, 84);
          doc.setDrawColor(220);
          doc.line(margin, 100, pageW - margin, 100);

          doc.setTextColor(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18);
          doc.text(`${fromName}  →  ${toName}`, margin, 140);

          const labelsByLang = {
            ru: { dist: 'Расстояние', dur: 'Время в пути', price: 'Ориентир по цене', pax: 'Пассажиры', luggage: 'Багаж', note: 'Точная цена и класс машины — после согласования через WhatsApp.' },
            pt: { dist: 'Distância', dur: 'Duração', price: 'Preço de referência', pax: 'Passageiros', luggage: 'Bagagem', note: 'Preço exato e classe do veículo — após confirmação pelo WhatsApp.' },
            en: { dist: 'Distance', dur: 'Duration', price: 'Reference price', pax: 'Passengers', luggage: 'Luggage', note: 'Exact price and vehicle class — after WhatsApp confirmation.' },
          };
          const L = labelsByLang[data.lang] || labelsByLang.en;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          let y = 180;
          const rows = [
            [L.dist, `${lastPair.km} km`],
            [L.dur, `${Math.floor(lastPair.durationMin / 60)}h ${lastPair.durationMin % 60}min`],
            [L.price, `R$ ${lastPair.priceMin}–${lastPair.priceMax}`],
            [L.pax, paxSel.value],
            [L.luggage, luggageSel.value],
          ];
          rows.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), margin + 160, y);
            y += 22;
          });

          doc.setFontSize(10);
          doc.setTextColor(110);
          doc.text(doc.splitTextToSize(L.note, pageW - margin * 2), margin, y + 14);

          doc.setFontSize(9);
          doc.setTextColor(140);
          doc.text(`WhatsApp ${data.whatsapp.replace('https://wa.me/', '+')}`, margin, doc.internal.pageSize.getHeight() - 56);
          doc.text('Generated ' + new Date().toISOString().slice(0, 16).replace('T', ' '), margin, doc.internal.pageSize.getHeight() - 40);

          doc.save(`morrison-${lastPair.slug}.pdf`);
          trackEvent('calculator_pdf_download', { route: lastPair.slug });
        } catch (err) {
          console.error('Calc PDF failed', err);
        } finally {
          calcPdfBtn.classList.remove('is-loading');
          calcPdfBtn.disabled = false;
        }
      });

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
        lastPair = pair;
        showResult(pair);
        updateMap();
      });
    }
  }

  // ---------- Command-K palette ----------
  const cmdk = document.querySelector('[data-cmdk]');
  if (cmdk) {
    const triggers = document.querySelectorAll('[data-cmdk-trigger]');
    const input = cmdk.querySelector('[data-cmdk-input]');
    const list = cmdk.querySelector('[data-cmdk-list]');
    const items = Array.from(cmdk.querySelectorAll('[data-cmdk-item]'));
    const empty = cmdk.querySelector('[data-cmdk-empty]');
    const closeNodes = cmdk.querySelectorAll('[data-cmdk-close]');
    let active = -1;

    const visibleItems = () => items.filter((el) => !el.hidden);
    const setActive = (i) => {
      const vis = visibleItems();
      if (!vis.length) return;
      active = (i + vis.length) % vis.length;
      vis.forEach((el, idx) => el.classList.toggle('is-active', idx === active));
      vis[active]?.scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      cmdk.hidden = false;
      cmdk.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cmdk-open');
      requestAnimationFrame(() => {
        cmdk.classList.add('is-open');
        input?.focus();
      });
      trackEvent('cmdk_open', {});
    };
    const close = () => {
      cmdk.classList.remove('is-open');
      document.body.classList.remove('cmdk-open');
      setTimeout(() => {
        cmdk.hidden = true;
        cmdk.setAttribute('aria-hidden', 'true');
        if (input) input.value = '';
        items.forEach((el) => { el.hidden = false; el.classList.remove('is-active'); });
        active = -1;
        if (empty) empty.hidden = true;
        cmdk.querySelectorAll('.cmdk-section').forEach((s) => { s.hidden = false; });
      }, 180);
    };

    const filter = () => {
      const q = (input?.value || '').trim().toLowerCase();
      let total = 0;
      items.forEach((el) => {
        const match = !q || (el.dataset.search || '').toLowerCase().includes(q) || (el.textContent || '').toLowerCase().includes(q);
        el.hidden = !match;
        if (match) total += 1;
      });
      // Hide empty sections
      cmdk.querySelectorAll('.cmdk-section').forEach((sec) => {
        const visible = Array.from(sec.querySelectorAll('[data-cmdk-item]')).some((i) => !i.hidden);
        sec.hidden = !visible;
      });
      if (empty) empty.hidden = total !== 0;
      active = -1;
      items.forEach((el) => el.classList.remove('is-active'));
    };

    triggers.forEach((t) => t.addEventListener('click', open));
    closeNodes.forEach((n) => n.addEventListener('click', close));
    input?.addEventListener('input', filter);

    document.addEventListener('keydown', (event) => {
      const isOpen = !cmdk.hidden;
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        isOpen ? close() : open();
        return;
      }
      if (!isOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
      else if (event.key === 'Enter') {
        const vis = visibleItems();
        const target = active >= 0 ? vis[active] : vis[0];
        if (target) { event.preventDefault(); window.location.href = target.href; }
      }
    });
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

    const successEl = briefForm.querySelector('[data-brief-success]');
    const successTitleEl = briefForm.querySelector('[data-brief-success-title]');
    const successBodyEl = briefForm.querySelector('[data-brief-success-body]');
    const pdfBtn = briefForm.querySelector('[data-brief-pdf]');

    const ensureJsPDF = () => new Promise((resolve, reject) => {
      if (window.jspdf?.jsPDF) return resolve(window.jspdf);
      const existing = document.querySelector('script[data-jspdf]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.jspdf), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
      s.async = true;
      s.dataset.jspdf = 'true';
      s.onload = () => resolve(window.jspdf);
      s.onerror = reject;
      document.head.appendChild(s);
    });

    const buildBriefLines = (fd) => {
      const labels = {
        ru: {
          intro: 'Здравствуйте! Заявка с сайта:',
          fromCity: 'Откуда', toCity: 'Куда', service: 'Тип',
          date: 'Дата', time: 'Время', pax: 'Пассажиры', bags: 'Багаж',
          children: 'Дети до 10 лет', childSeat: 'Детское кресло',
          name: 'Имя', contact: 'Контакт', notes: 'Особое', yes: 'да',
        },
        pt: {
          intro: 'Olá! Solicitação pelo site:',
          fromCity: 'De', toCity: 'Para', service: 'Tipo',
          date: 'Data', time: 'Hora', pax: 'Passageiros', bags: 'Bagagem',
          children: 'Crianças <10', childSeat: 'Cadeirinha',
          name: 'Nome', contact: 'Contato', notes: 'Observações', yes: 'sim',
        },
        en: {
          intro: 'Hello! Request from the website:',
          fromCity: 'From', toCity: 'To', service: 'Service',
          date: 'Date', time: 'Time', pax: 'Passengers', bags: 'Luggage',
          children: 'Children <10', childSeat: 'Child seat',
          name: 'Name', contact: 'Contact', notes: 'Notes', yes: 'yes',
        },
      };
      const L = labels[lang] || labels.en;
      const rows = [];
      const add = (label, value) => { if (value) rows.push([label, String(value)]); };
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
      return { intro: L.intro, rows };
    };

    const generatePdf = async (fd) => {
      try {
        const { jsPDF } = await ensureJsPDF();
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 56;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Morrison Premium Transfer', margin, 64);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(110);
        doc.text(briefForm.dataset.pdfTitle || 'Transfer brief', margin, 84);

        doc.setDrawColor(220);
        doc.line(margin, 100, pageW - margin, 100);

        // Brief table
        const { rows } = buildBriefLines(fd);
        doc.setTextColor(20);
        let y = 140;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        rows.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label + ':', margin, y);
          doc.setFont('helvetica', 'normal');
          const wrapped = doc.splitTextToSize(value, pageW - margin * 2 - 140);
          doc.text(wrapped, margin + 140, y);
          y += 18 * Math.max(1, wrapped.length) + 6;
        });

        // Footer
        const cnpj = briefForm.dataset.cnpj || '';
        const stamp = (briefForm.dataset.pdfGenerated || 'Generated') + ' ' + new Date().toISOString().slice(0, 16).replace('T', ' ');
        doc.setFontSize(9);
        doc.setTextColor(140);
        doc.text(`CNPJ ${cnpj}  ·  WhatsApp ${whatsappBase.replace('https://wa.me/', '+')}`, margin, doc.internal.pageSize.getHeight() - 56);
        doc.text(stamp, margin, doc.internal.pageSize.getHeight() - 40);

        doc.save(`morrison-brief-${Date.now()}.pdf`);
        trackEvent('brief_pdf_download', { language: lang });
      } catch (err) {
        console.error('PDF generation failed', err);
      }
    };

    briefForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validateStep()) return;

      const fd = new FormData(briefForm);
      const { intro, rows } = buildBriefLines(fd);
      const message = [intro, '', ...rows.map(([l, v]) => `• ${l}: ${v}`)].join('\n');
      const url = `${whatsappBase}?text=${encodeURIComponent(message)}`;

      trackEvent('brief_form_submit', {
        service: fd.get('service') || '',
        language: lang,
      });

      window.open(url, '_blank', 'noopener');

      // Switch to success state
      steps.forEach((s) => { s.hidden = true; });
      backBtn.hidden = true;
      nextBtn.hidden = true;
      submitBtn.hidden = true;
      successEl.hidden = false;
      successTitleEl.textContent = briefForm.dataset.successTitle || '';
      successBodyEl.textContent = briefForm.dataset.successBody || '';
      pdfBtn.textContent = briefForm.dataset.downloadPdf || 'Download PDF';
      pdfBtn.onclick = async () => {
        pdfBtn.classList.add('is-loading');
        pdfBtn.disabled = true;
        try { await generatePdf(fd); }
        finally {
          pdfBtn.classList.remove('is-loading');
          pdfBtn.disabled = false;
        }
      };

      // Preload jsPDF in background
      ensureJsPDF().catch(() => { /* silent */ });
    });

    // ----- Smart prefill from URL params -----
    // Supports: ?from=X&to=Y&pax=N&service=Z&date=YYYY-MM-DD&case=<id>&vehicle=<id>
    const briefParams = new URLSearchParams(window.location.search);
    const setField = (name, value) => {
      if (!value) return;
      const el = briefForm.querySelector(`[name="${name}"]`);
      if (!el) return;
      if (el.type === 'radio') {
        const radio = briefForm.querySelector(`[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        el.value = value;
      }
    };
    const ucfirst = (s) => s ? s[0].toUpperCase() + s.slice(1) : '';
    const cityNames = window.__cityNames || null;
    setField('fromCity', briefParams.get('from') ? ucfirst(briefParams.get('from')) : null);
    setField('toCity', briefParams.get('to') ? ucfirst(briefParams.get('to')) : null);
    setField('service', briefParams.get('service'));
    setField('date', briefParams.get('date'));
    setField('time', briefParams.get('time'));
    setField('pax', briefParams.get('pax'));
    setField('bags', briefParams.get('bags'));

    // Case-id prefills service type and adds a note
    const caseId = briefParams.get('case');
    if (caseId) {
      const caseMap = {
        'business-sp-rio-day': { service: 'intercity', notesEn: 'Business day trip: SP↔Rio (matched from /cases/)' },
        'family-fln-bc-weekend': { service: 'airport', notesEn: 'Family weekend FLN→BC, 4 pax + child seat (matched from /cases/)' },
        'relocation-sp-curitiba': { service: 'intercity', notesEn: 'Relocation SP→Curitiba with luggage + pet (matched from /cases/)' },
        'corporate-iguazu': { service: 'intercity', notesEn: 'Corporate group 12pax Curitiba→Foz (matched from /cases/)' },
        'uruguay-couple': { service: 'international', notesEn: 'Couple trip POA→Punta del Este via Chuí (matched from /cases/)' },
      };
      const c = caseMap[caseId];
      if (c) {
        setField('service', c.service);
        setField('notes', c.notesEn);
      }
    }

    // Vehicle pre-selection — note in textarea
    const vehicleId = briefParams.get('vehicle');
    if (vehicleId) {
      const notesEl = briefForm.querySelector('[name="notes"]');
      if (notesEl && !notesEl.value) notesEl.value = `Requested vehicle class: ${vehicleId}`;
    }

    render();
  }
})();
