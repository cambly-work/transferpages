(() => {
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const year = document.querySelector('[data-year]');

  if (toggle && nav) {
    const navList = nav.querySelector('.nav-list');
    if (navList && !navList.id) navList.id = 'primary-nav-list';
    if (navList) toggle.setAttribute('aria-controls', navList.id);

    const openLabel = toggle.getAttribute('aria-label') || 'Open menu';
    const closeLabel = openLabel.includes('Abrir') ? 'Fechar menu' : openLabel.includes('Открыть') ? 'Закрыть меню' : 'Close menu';

    const closeNav = () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', openLabel);
    };

    const openNav = () => {
      nav.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', closeLabel);
    };

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeNav();
      } else {
        openNav();
      }
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeNav();
    });
  }

  if (year) year.textContent = new Date().getFullYear();

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a').forEach((link) => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  const shouldRenderStickyCta = window.matchMedia('(max-width: 768px)').matches;
  if (shouldRenderStickyCta) {
    const stickyCta = document.createElement('div');
    stickyCta.className = 'mobile-sticky-cta';
    stickyCta.setAttribute('aria-label', 'Быстрые контакты');
    stickyCta.innerHTML = `
      <a class="btn btn-primary" href="https://wa.me/5513996532915" target="_blank" rel="noopener" aria-label="Написать в WhatsApp">WhatsApp</a>
      <a class="btn btn-secondary" href="https://t.me/morrison_tim" target="_blank" rel="noopener" aria-label="Написать в Telegram">Telegram</a>
    `;

    document.body.appendChild(stickyCta);
    document.body.classList.add('has-mobile-cta');
  }
})();
