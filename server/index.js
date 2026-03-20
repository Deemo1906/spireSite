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
  methods: ['GET', 'POST'],
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

    res.json({ token: signToken(user), username: user.username });
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

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
init().then(() => {
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
});
