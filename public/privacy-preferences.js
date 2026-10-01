(() => {
  const config = document.currentScript?.dataset;
  const key = 'metin2bazar.statistics.v1';
  const lifetime = 365 * 24 * 60 * 60 * 1000;
  let loaded = false;
  let expiryTimer;
  const read = () => {
    try {
      const choice = JSON.parse(localStorage.getItem(key) || 'null');
      if (choice && ['allow', 'deny'].includes(choice.value) &&
          Number.isFinite(choice.at) && choice.at <= Date.now() &&
          Date.now() - choice.at < lifetime) return choice;
      localStorage.removeItem(key);
    } catch {}
    return null;
  };
  const render = () => {
    const choice = read();
    document.querySelectorAll('[data-statistics-status]').forEach(node => {
      node.textContent = choice?.value === 'allow' ? 'Twój wybór: statystyki włączone.' : 'Twój wybór: statystyki wyłączone.';
    });
    document.querySelectorAll('[data-statistics-choice]').forEach(node => {
      node.setAttribute('aria-pressed', String(choice?.value === node.dataset.statisticsChoice));
    });
    return choice;
  };
  const start = () => {
    const choice = render();
    if (loaded || choice?.value !== 'allow' || config?.enabled !== 'true' || location.hostname !== config.domain) return;
    const script = document.createElement('script');
    script.src = config.script;
    script.defer = true;
    script.dataset.websiteId = config.websiteId;
    script.dataset.hostUrl = config.host;
    script.dataset.domains = config.domain;
    document.head.append(script);
    loaded = true;
    const checkExpiry = () => {
      const remaining = lifetime - (Date.now() - choice.at);
      if (remaining <= 0) location.reload();
      else expiryTimer = setTimeout(checkExpiry, Math.min(remaining, 86400000));
    };
    checkExpiry();
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-statistics-choice]');
    if (!button || !['allow', 'deny'].includes(button.dataset.statisticsChoice)) return;
    const value = button.dataset.statisticsChoice;
    try { localStorage.setItem(key, JSON.stringify({ value, at: Date.now() })); }
    catch {
      document.querySelectorAll('[data-statistics-status]').forEach(node => { node.textContent = 'Nie można zapisać wyboru. Statystyki pozostają wyłączone.'; });
      if (loaded) location.reload();
      return;
    }
    if (loaded && value === 'deny') { clearTimeout(expiryTimer); location.reload(); return; }
    start();
  });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    if (loaded && read()?.value !== 'allow') location.reload();
    else start();
  });
  window.addEventListener('pageshow', () => {
    if (loaded && read()?.value !== 'allow') location.reload();
    else start();
  });
  start();
})();
