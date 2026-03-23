const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool, init } = require('./db');

// ── Guard env vars ────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('[startup] FATAL: JWT_SECRET is not set');
  process.exit(1);
}
if (!process.env.ADMIN_KEY) {
  console.error('[startup] FATAL: ADMIN_KEY is not set');
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://deemo1906.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ],
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

// ── Helper ────────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants manquants.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    const user = rows[0];

    // Always run bcrypt to prevent timing attacks
    const hash = user?.password_hash ?? '$2a$12$invalidsafehashplaceholder000000000000000000000000000';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
    }

    const { rows: sessionRows } = await pool.query(
      'INSERT INTO sessions (user_id) VALUES ($1) RETURNING id',
      [user.id]
    );
    res.json({ token: signToken(user), username: user.username, session_id: sessionRows[0].id });
  } catch (err) {
    console.error('[login]', { username, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/register  (protected by ADMIN_KEY) ─────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, password, adminKey } = req.body ?? {};

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Non autorisé.' });
  }
  if (!username || !password) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username.trim(), hash]
    );
    res.status(201).json({ message: `Utilisateur "${username}" créé.` });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà." });
    }
    console.error('[register]', { username, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch (err) {
    console.error('[auth]', { error: err.message });
    res.status(401).json({ error: 'Session expirée ou invalide.' });
  }
}

// ── GET /api/me  (verify session token) ──────────────────────────────────────
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// ── GET /api/reviews/:slug  (fetch reviews for a book) ───────────────────────
app.get('/api/reviews/:slug', requireAuth, async (req, res) => {
  const { slug } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT u.username, r.rating, r.comment, r.created_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.book_slug = $1
      ORDER BY r.created_at DESC
    `, [slug]);
    const average = rows.length
      ? rows.reduce((s, r) => s + r.rating, 0) / rows.length
      : null;
    res.json({ reviews: rows, average, count: rows.length });
  } catch (err) {
    console.error('[reviews:get]', { slug, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/reviews  (create or update a review) ───────────────────────────
app.post('/api/reviews', requireAuth, async (req, res) => {
  const { book_slug, rating, comment } = req.body ?? {};
  if (!book_slug || !rating) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Note invalide (1–5).' });
  }
  try {
    await pool.query(`
      INSERT INTO reviews (user_id, book_slug, rating, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, book_slug)
      DO UPDATE SET rating = $3, comment = $4, created_at = NOW()
    `, [req.user.id, book_slug, rating, comment?.trim() ?? null]);
    res.status(201).json({ message: 'Avis enregistré.' });
  } catch (err) {
    console.error('[reviews:post]', { user_id: req.user.id, book_slug, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/sessions/ping  (update last_seen) ──────────────────────────────
app.post('/api/sessions/ping', requireAuth, async (req, res) => {
  const { session_id } = req.body ?? {};
  if (!session_id) return res.status(400).json({ error: 'session_id manquant.' });
  try {
    await pool.query(
      'UPDATE sessions SET last_seen_at = NOW() WHERE id = $1 AND user_id = $2',
      [session_id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[sessions:ping]', { session_id, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/sessions/end  (explicit logout) ─────────────────────────────────
app.post('/api/sessions/end', requireAuth, async (req, res) => {
  const { session_id } = req.body ?? {};
  if (!session_id) return res.status(400).json({ error: 'session_id manquant.' });
  try {
    await pool.query(
      `UPDATE sessions SET logged_out_at = NOW(), last_seen_at = NOW()
       WHERE id = $1 AND user_id = $2 AND logged_out_at IS NULL`,
      [session_id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[sessions:end]', { session_id, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/admin/sessions  (admin only) ─────────────────────────────────────
app.get('/api/admin/sessions', requireAuth, async (req, res) => {
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  try {
    const { rows } = await pool.query(`
      SELECT s.id, u.username, s.logged_in_at, s.last_seen_at, s.logged_out_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.logged_in_at DESC
      LIMIT 500
    `);
    res.json({ sessions: rows });
  } catch (err) {
    console.error('[admin:sessions]', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/speculation/current  (current round + user's votes) ─────────────
app.get('/api/speculation/current', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.title, r.names, r.is_active, r.real_votes, r.created_at, r.closed_at,
             s.votes AS my_votes
      FROM speculation_rounds r
      LEFT JOIN speculations s ON s.round_id = r.id AND s.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [req.user.id]);
    if (rows.length === 0) return res.json({ round: null, my_votes: null });
    const row = rows[0];
    res.json({
      round:    { id: row.id, title: row.title, names: row.names, is_active: row.is_active, real_votes: row.real_votes, created_at: row.created_at, closed_at: row.closed_at },
      my_votes: row.my_votes,
    });
  } catch (err) {
    console.error('[speculation:current]', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/speculation/vote  (submit or update speculation) ────────────────
app.post('/api/speculation/vote', requireAuth, async (req, res) => {
  const { round_id, votes } = req.body ?? {};
  if (!round_id || !Array.isArray(votes) || votes.length !== 10) {
    return res.status(400).json({ error: 'Données invalides.' });
  }
  const valid = ['neutral', 'house', 'aelfir'];
  if (!votes.every(v => valid.includes(v))) {
    return res.status(400).json({ error: 'Vote invalide.' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT is_active FROM speculation_rounds WHERE id = $1', [round_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Round introuvable.' });
    if (!rows[0].is_active) return res.status(400).json({ error: 'Ce round est terminé.' });
    await pool.query(`
      INSERT INTO speculations (round_id, user_id, votes)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (round_id, user_id)
      DO UPDATE SET votes = $3::jsonb, updated_at = NOW()
    `, [round_id, req.user.id, JSON.stringify(votes)]);
    res.json({ message: 'Spéculations enregistrées.' });
  } catch (err) {
    console.error('[speculation:vote]', { user_id: req.user.id, round_id, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/admin/speculation  (all rounds + aggregate counts) ───────────────
app.get('/api/admin/speculation', requireAuth, async (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Accès refusé.' });
  try {
    const { rows: rounds } = await pool.query(
      'SELECT id, title, names, is_active, real_votes, created_at, closed_at FROM speculation_rounds ORDER BY created_at DESC'
    );
    const result = await Promise.all(rounds.map(async round => {
      const { rows: specs } = await pool.query(
        `SELECT s.votes, u.username
         FROM speculations s JOIN users u ON u.id = s.user_id
         WHERE s.round_id = $1`, [round.id]
      );
      const counts = round.names.map(() => ({ neutral: 0, house: 0, aelfir: 0 }));
      specs.forEach(s => s.votes.forEach((v, i) => { if (counts[i]?.[v] !== undefined) counts[i][v]++; }));
      const voters = specs.map(s => ({ username: s.username, votes: s.votes }));
      return { ...round, counts, total_voters: specs.length, voters };
    }));
    res.json({ rounds: result });
  } catch (err) {
    console.error('[admin:speculation]', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/admin/speculation/rounds  (create new round) ───────────────────
app.post('/api/admin/speculation/rounds', requireAuth, async (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Accès refusé.' });
  const { title, names } = req.body ?? {};
  if (!title?.trim() || !Array.isArray(names) || names.length !== 10 || names.some(n => !n?.trim())) {
    return res.status(400).json({ error: 'Un titre et 10 noms sont requis.' });
  }
  try {
    await pool.query('UPDATE speculation_rounds SET is_active = FALSE WHERE is_active = TRUE');
    const { rows } = await pool.query(
      'INSERT INTO speculation_rounds (title, names) VALUES ($1, $2::jsonb) RETURNING id',
      [title.trim(), JSON.stringify(names.map(n => n.trim()))]
    );
    res.status(201).json({ message: 'Round créé.', id: rows[0].id });
  } catch (err) {
    console.error('[admin:speculation:create]', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/admin/speculation/rounds/:id/close  (close + enter real votes) ─
app.post('/api/admin/speculation/rounds/:id/close', requireAuth, async (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Accès refusé.' });
  const { real_votes } = req.body ?? {};
  if (!Array.isArray(real_votes) || real_votes.length !== 10) {
    return res.status(400).json({ error: '10 votes réels sont requis.' });
  }
  const valid = ['neutral', 'house', 'aelfir'];
  if (!real_votes.every(v => valid.includes(v))) {
    return res.status(400).json({ error: 'Vote invalide.' });
  }
  try {
    const result = await pool.query(
      `UPDATE speculation_rounds SET is_active = FALSE, real_votes = $2::jsonb, closed_at = NOW()
       WHERE id = $1 AND is_active = TRUE`,
      [req.params.id, JSON.stringify(real_votes)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Round introuvable ou déjà fermé.' });
    res.json({ message: 'Round fermé.' });
  } catch (err) {
    console.error('[admin:speculation:close]', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── DELETE /api/reviews/:slug  (delete own review) ───────────────────────────
app.delete('/api/reviews/:slug', requireAuth, async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM reviews WHERE user_id = $1 AND book_slug = $2',
      [req.user.id, slug]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Avis introuvable.' });
    }
    res.json({ message: 'Avis supprimé.' });
  } catch (err) {
    console.error('[reviews:delete]', { user_id: req.user.id, slug, error: err.message });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
});
