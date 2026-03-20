/* ── Read tracker ─────────────────────────────────────────────────────────────
   Tracks which books the current user has opened.
   NEW badges are suppressed for books that have been read.
   State is stored per-user in localStorage.
   ──────────────────────────────────────────────────────────────────────────── */

(function () {
  function key() {
    return 'spire_read_' + (localStorage.getItem('spire_user') || '_');
  }

  function getSlugs() {
    try { return JSON.parse(localStorage.getItem(key()) || '[]'); }
    catch { return []; }
  }

  window.isRead  = function (slug) { return getSlugs().includes(slug); };

  window.markRead = function (slug) {
    const slugs = getSlugs();
    if (!slugs.includes(slug)) {
      slugs.push(slug);
      localStorage.setItem(key(), JSON.stringify(slugs));
    }
  };
})();
