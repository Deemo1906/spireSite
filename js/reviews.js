/* ── Book Reviews — shared script for author pages ────────────────────────── */

const API = 'https://spiresite.onrender.com';

function authHeaders() {
  return {
    'Authorization': `Bearer ${localStorage.getItem('spire_token')}`,
    'Content-Type': 'application/json',
  };
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStars(rating, max = 5) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(max - full);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

async function loadReviews(slug, entry) {
  try {
    const res = await fetch(`${API}/api/reviews/${encodeURIComponent(slug)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    renderReviewSection(slug, entry, data);
  } catch (err) {
    console.error('[reviews:load]', { slug, error: err.message });
  }
}

function renderReviewSection(slug, entry, data) {
  const username = localStorage.getItem('spire_user');
  const myReview = data.reviews.find(r => r.username === username);

  const section = document.createElement('div');
  section.className = 'book-reviews';

  // ── Summary (average + count) ──────────────────────────────────────────────
  const summary = document.createElement('div');
  summary.className = 'review-summary';
  if (data.count > 0) {
    summary.innerHTML = `
      <span class="review-stars">${renderStars(data.average)}</span>
      <span class="review-count">${data.count} avis</span>
    `;
  } else {
    summary.innerHTML = `<span class="review-none">Aucun avis</span>`;
  }
  section.appendChild(summary);

  // ── Toggle button ──────────────────────────────────────────────────────────
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'review-toggle';
  toggleBtn.textContent = myReview ? 'Modifier mon avis' : 'Laisser un avis';
  section.appendChild(toggleBtn);

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = document.createElement('div');
  form.className = 'review-form';
  form.hidden = true;

  let selectedRating = myReview?.rating ?? 0;

  const starPicker = document.createElement('div');
  starPicker.className = 'star-picker';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.dataset.val = i;
    star.textContent = '★';
    if (i <= selectedRating) star.classList.add('active');
    star.addEventListener('mouseover', () => {
      starPicker.querySelectorAll('span').forEach(s =>
        s.classList.toggle('active', +s.dataset.val <= i)
      );
    });
    star.addEventListener('mouseout', () => {
      starPicker.querySelectorAll('span').forEach(s =>
        s.classList.toggle('active', +s.dataset.val <= selectedRating)
      );
    });
    star.addEventListener('click', () => {
      selectedRating = i;
      starPicker.querySelectorAll('span').forEach(s =>
        s.classList.toggle('active', +s.dataset.val <= selectedRating)
      );
    });
    starPicker.appendChild(star);
  }
  form.appendChild(starPicker);

  const textarea = document.createElement('textarea');
  textarea.className = 'review-textarea';
  textarea.placeholder = 'Votre commentaire (optionnel)';
  textarea.value = myReview?.comment ?? '';
  form.appendChild(textarea);

  const submitBtn = document.createElement('button');
  submitBtn.className = 'review-submit';
  submitBtn.textContent = 'Soumettre';
  form.appendChild(submitBtn);

  const errorMsg = document.createElement('p');
  errorMsg.className = 'review-error';
  form.appendChild(errorMsg);

  section.appendChild(form);

  // ── Review list ────────────────────────────────────────────────────────────
  if (data.reviews.length > 0) {
    const list = document.createElement('div');
    list.className = 'review-list';
    data.reviews.forEach(r => {
      const item = document.createElement('div');
      item.className = 'review-item';
      item.innerHTML = `
        <div class="review-header">
          <span class="review-author">${esc(r.username)}</span>
          <span class="review-rating">${renderStars(r.rating)}</span>
          <span class="review-date">${formatDate(r.created_at)}</span>
        </div>
        ${r.comment ? `<p class="review-comment">${esc(r.comment)}</p>` : ''}
      `;
      list.appendChild(item);
    });
    section.appendChild(list);
  }

  // ── Wire events ────────────────────────────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (form.hidden) {
      toggleBtn.textContent = myReview ? 'Modifier mon avis' : 'Laisser un avis';
    } else {
      toggleBtn.textContent = 'Annuler';
    }
  });

  submitBtn.addEventListener('click', async () => {
    errorMsg.textContent = '';
    if (!selectedRating) {
      errorMsg.textContent = 'Veuillez sélectionner une note.';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi…';
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          book_slug: slug,
          rating: selectedRating,
          comment: textarea.value.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        errorMsg.textContent = json.error ?? "Erreur lors de l'envoi.";
        submitBtn.disabled = false;
        submitBtn.textContent = 'Soumettre';
        return;
      }
      // Refresh section with fresh data
      section.remove();
      const fresh = await fetch(`${API}/api/reviews/${encodeURIComponent(slug)}`, {
        headers: authHeaders(),
      });
      const freshData = await fresh.json();
      renderReviewSection(slug, entry, freshData);
    } catch (err) {
      console.error('[reviews:submit]', { slug, error: err.message });
      errorMsg.textContent = 'Erreur réseau.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Soumettre';
    }
  });

  entry.appendChild(section);
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-book]').forEach(cover => {
    const slug = cover.dataset.book;
    const entry = cover.closest('.book-entry');
    if (entry) loadReviews(slug, entry);
  });
});
