/* ── Session heartbeat ────────────────────────────────────────────────────────
   Pings /api/sessions/ping every 5 minutes to update last_seen_at.
   Loaded on all main protected pages.
   ──────────────────────────────────────────────────────────────────────────── */

(function () {
  const API      = 'https://spiresite.onrender.com';
  const INTERVAL = 5 * 60 * 1000; // 5 minutes

  function ping() {
    const token     = localStorage.getItem('spire_token');
    const sessionId = localStorage.getItem('spire_session');
    if (!token || !sessionId) return;
    fetch(`${API}/api/sessions/ping`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id: +sessionId }),
    }).catch(() => {});
  }

  ping(); // immediate ping on page load
  setInterval(ping, INTERVAL);
})();
