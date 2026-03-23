const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('[db] FATAL: DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      logged_in_at  TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
      logged_out_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS speculation_rounds (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      names       JSONB NOT NULL,
      is_active   BOOLEAN DEFAULT TRUE,
      real_votes  JSONB,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      closed_at   TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS speculations (
      id          SERIAL PRIMARY KEY,
      round_id    INTEGER NOT NULL REFERENCES speculation_rounds(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      votes       JSONB NOT NULL,
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (round_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      book_slug  TEXT NOT NULL,
      rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, book_slug)
    )
  `);
  console.log('[db] Ready');
}

module.exports = { pool, init };
