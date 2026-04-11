(function () {
  const config = window.HSO_CONFIG || {};
  const launchDate = new Date(config.launchDate || '2026-03-08T00:00:00Z');

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function updateClocks() {
    const now = new Date();

    const localTimeEl = document.getElementById('localTime');
    const localDateEl = document.getElementById('localDate');
    const utcTimeEl = document.getElementById('utcTime');

    if (localTimeEl) {
      localTimeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
    if (localDateEl) {
      localDateEl.textContent = now.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit'
      });
    }
    if (utcTimeEl) {
      utcTimeEl.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
    }
  }

  function updateUptime() {
    const uptimeEl = document.getElementById('uptime');
    if (!uptimeEl) return;

    const diff = Math.max(0, Date.now() - launchDate.getTime());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // uptimeEl.textContent = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

    uptimeEl.textContent =
      `T+${String(days).padStart(3, '0')}d ` +
      `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    
  }

  function updateVisitorCounter() {
    const counterEl = document.getElementById('visitorCount');
    if (!counterEl) return;

    const key = 'hso_local_visit_counter';
    let count = parseInt(localStorage.getItem(key) || '0', 10);
    if (!sessionStorage.getItem('hso_session_counted')) {
      count += 1;
      localStorage.setItem(key, String(count));
      sessionStorage.setItem('hso_session_counted', '1');
    }
    counterEl.textContent = String(count).padStart(3, '0');
  }

  updateClocks();
  updateUptime();
  updateVisitorCounter();
  setInterval(updateClocks, 1000);
  setInterval(updateUptime, 1000);
})();
