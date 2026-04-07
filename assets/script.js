(() => {
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

    const closeNav = () => {
      nav.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', openLabel);
    };

    const openNav = () => {
      nav.classList.add('open');
      overlay.classList.add('active');
      if (window.matchMedia('(max-width: 768px)').matches) document.body.classList.add('menu-open');
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

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.nav-list a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    const normalizedHref = new URL(href, window.location.origin).pathname.replace(/\/$/, '');
    if (normalizedHref === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
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
      <a class="btn btn-primary" href="https://wa.me/5513996532915" target="_blank" rel="noopener" aria-label="${labels.wa}">WhatsApp</a>
      <a class="btn btn-secondary" href="https://t.me/morrison_tim" target="_blank" rel="noopener" aria-label="${labels.tg}">Telegram</a>
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
})();
