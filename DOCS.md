# Spire Site — Documentation

Fan site for *Spire: The City Must Fall*, hosted on GitHub Pages with a Node.js/PostgreSQL backend.

**Live site:** https://deemo1906.github.io/spireSite
**API backend:** https://spiresite.onrender.com

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Architecture Overview](#2-architecture-overview)
3. [Design System](#3-design-system)
4. [Authentication System](#4-authentication-system)
5. [Pages Reference](#5-pages-reference)
6. [Journal System](#6-journal-system)
7. [Library System](#7-library-system)
8. [Yul Private Library](#8-yul-private-library)
9. [The "Nouveau" Badge System](#9-the-nouveau-badge-system)
10. [Reviews System](#10-reviews-system)
11. [Read Tracking](#11-read-tracking)
12. [Backend Server](#12-backend-server)
13. [➜ How to Add a New Book](#13-how-to-add-a-new-book)
14. [➜ How to Add a New Author](#14-how-to-add-a-new-author)
15. [➜ How to Add a New Journal Edition](#15-how-to-add-a-new-journal-edition)
16. [➜ How to Add a New Journal Paper](#16-how-to-add-a-new-journal-paper)
17. [➜ How to Add a User](#17-how-to-add-a-user)
18. [Access Control](#18-access-control)
19. [Deployment](#19-deployment)

---

## 1. Project Structure

```
spireSite/
│
├── index.html                  # Landing page (public)
├── connect.html                # Login page
├── welcome.html                # Post-login welcome animation
├── dashboard.html              # Main hub (authenticated)
├── journals.html               # Journal/newspaper grid
├── archive.html                # Per-journal edition archive
├── library.html                # Library — author selection
├── yul-library.html            # Yul private collection (restricted)
│
├── style.css                   # Global design system
├── connect.css                 # Login page styles
│
├── js/
│   ├── reviews.js              # Book review UI — loaded by author pages
│   └── read-tracker.js         # Read state tracking — loaded by library pages
│
├── journals/
│   ├── index.json              # Journal metadata, editions, dates
│   ├── ambrosia-1.html
│   ├── liberate-1.html
│   ├── the-chronicle-1.html
│   ├── the-furnace-1.html
│   ├── the-silhouette-1.html
│   └── the-torch-1.html
│
├── library/
│   └── index.json              # Book metadata, slugs, added dates
│
├── authors/
│   ├── nereth.html             # Nereth author page
│   └── simon.html              # Simon Verlat author page
│
├── books/
│   ├── veth-ossivael.html
│   ├── positions-pour-survivre.html
│   ├── premier-corsivael.html
│   ├── carnets-simon-3.html
│   ├── carnets-simon-7.html
│   ├── carnets-simon-8.html
│   └── yul/
│       ├── bestiaire.html
│       ├── catalogue-substances.html
│       ├── art-union.html
│       ├── coutumes-charnelles.html
│       ├── catalogue-mecanique.html
│       └── reference-rapide.html
│
└── server/
    ├── index.js                # Express API
    ├── db.js                   # PostgreSQL init & schema
    └── package.json
```

---

## 2. Architecture Overview

```
[Browser / GitHub Pages — static HTML/CSS/JS]
        │
        ├── Static data: journals/index.json, library/index.json
        │
        └── HTTPS calls to Render API:
              POST /api/login          — authenticate
              GET  /api/me             — verify token
              GET  /api/reviews/:slug  — fetch book reviews
              POST /api/reviews        — submit a review
                          │
                    [Express API — Render]
                    https://spiresite.onrender.com
                          │
                    [PostgreSQL — Render managed]
                          │
                    ┌─────┴──────────┐
                    │ users          │  id, username, password_hash
                    │ reviews        │  user_id, book_slug, rating, comment
                    └────────────────┘
```

**Key constraints:**
- GitHub Pages serves only static files — no server-side rendering.
- Auth is JWT-based. The token lives in `localStorage` and is sent to the backend only on login and review calls. Other page loads check only that the token *exists* in localStorage — they do not re-validate it with the server. This is intentional for a private fan site.
- Access control for the Yul library is client-side (username allowlist). This can be bypassed with DevTools. Acceptable for this use case.

---

## 3. Design System

All global variables live in `style.css` under `:root`.

### Color Palette

| Variable | Value | Use |
|---|---|---|
| `--bg-0` | `#09080a` | Page background |
| `--bg-1` | `#100e12` | Sections |
| `--bg-2` | `#18151d` | Cards, form backgrounds |
| `--bg-3` | `#221e28` | Lighter card accents, borders |
| `--bg-4` | `#2c2733` | Reserved |
| `--red-900` | `#3d0a0a` | Deepest red |
| `--red-700` | `#6b1414` | Borders, decorative rules |
| `--red-500` | `#9b1c1c` | Primary accent — badges, buttons |
| `--red-400` | `#c0292b` | Hover states, glows |
| `--red-300` | `#e05050` | Bright highlight |
| `--gold-500` | `#b8903a` | Luxury accent |
| `--gold-300` | `#d4a84b` | Star ratings, bright gold |
| `--text-0` | `#ede5d5` | Primary body text |
| `--text-1` | `#c8bfaa` | Secondary text |
| `--text-2` | `#8a806a` | Muted/tertiary text |
| `--text-3` | `#4a4035` | Barely visible — labels, eyebrows |
| `--border` | `rgba(60,50,70,0.7)` | Default card borders |
| `--border-red` | `rgba(155,28,28,0.45)` | Hover border glow |

### Typography

| Variable | Font | Use |
|---|---|---|
| `--font-display` | `Cinzel Decorative` | Hero titles, author names, sigils |
| `--font-heading` | `Cinzel` | Section headings, labels, nav, badges |
| `--font-body` | `Crimson Text` | All body text, paragraphs |

Additional fonts used in specific pages: `Cormorant Garamond`, `Playfair Display`, `VT323`, `Special Elite`, `Source Serif 4`, `UnifrakturMaguntia`, `Poiret One`, `Oswald`, `IM Fell English`.

### Layout Conventions

- Max content width: `1080px`
- Default page padding: `5rem 2rem 6rem`
- Card hover: `translateY(-3px)` to `translateY(-5px)` + border color change
- Border radius: `2px` (near-square, deliberately minimal)
- Transitions: `0.22s ease`

---

## 4. Authentication System

### Flow

```
connect.html
  └─ POST /api/login  { username, password }
        └─ bcrypt.compare → jwt.sign({ id, username }, JWT_SECRET, 7d)
              └─ { token, username } → localStorage
                    └─ redirect → welcome.html → dashboard.html
```

### localStorage Keys

| Key | Value |
|---|---|
| `spire_token` | JWT string (7-day expiry) |
| `spire_user` | Username string |
| `spire_read_{username}` | JSON array of book slugs the user has opened |

### Auth Guard

Every protected page runs this on load:

```javascript
if (!localStorage.getItem('spire_token')) {
  window.location.href = 'connect.html'; // adjust path for subdirectories
}
```

### Logout

```javascript
localStorage.removeItem('spire_token');
localStorage.removeItem('spire_user');
window.location.href = 'index.html';
```

---

## 5. Pages Reference

| Page | Auth | Notes |
|---|---|---|
| `index.html` | Public | Landing hero |
| `connect.html` | Public | Login form |
| `welcome.html` | Token | 3.2s animation, auto-redirects to dashboard |
| `dashboard.html` | Token | Navigation hub with NEW badges |
| `journals.html` | Token | Journal card grid, dynamically rendered |
| `archive.html` | Token | Edition archive for one paper, reads `?paper={id}` |
| `library.html` | Token | Author card grid |
| `authors/*.html` | Token | Author bio + bookshelf with reviews |
| `books/*.html` | Token | Individual book pages |
| `yul-library.html` | Token + role | Private collection |
| `books/yul/*.html` | Token + role | Private books |

---

## 6. Journal System

### Metadata File: `journals/index.json`

Single source of truth for all journals. Structure:

```json
{
  "papers": [
    {
      "id": "ambrosia",
      "name": "Ambrosia",
      "tagline": "Gazette de la Haute Société de la Flèche",
      "style": "ambrosia",
      "editions": [
        { "number": 1, "file": "ambrosia-1.html", "date": "2026-03-19" }
      ]
    }
  ]
}
```

| Field | Description |
|---|---|
| `id` | Unique identifier — used in `archive.html?paper={id}` |
| `name` | Display name |
| `tagline` | Subtitle |
| `style` | Maps to a CSS template in `journals.html` |
| `editions[].number` | Edition number |
| `editions[].file` | Filename inside `journals/` |
| `editions[].date` | ISO 8601 date — drives NEW badges |

The **latest edition** is always the last item in the `editions` array.

### Current Papers

| ID | Name | Style | Editions |
|---|---|---|---|
| `ambrosia` | Ambrosia | `ambrosia` | 1 |
| `liberate` | Liberate! | `liberate` | 1 |
| `the-chronicle` | The Chronicle | `chronicle` | 1 |
| `the-furnace` | The Furnace | `furnace` | 1 |
| `the-silhouette` | The Silhouette | `silhouette` | 1 |
| `the-torch` | The Torch | `torch` | 1 |

---

## 7. Library System

### Metadata File: `library/index.json`

Single source of truth for all public library books.

```json
{
  "books": [
    {
      "slug": "veth-ossivael",
      "title": "Veth-Ossivael",
      "author": "nereth",
      "added": "2026-03-19"
    }
  ]
}
```

| Field | Description |
|---|---|
| `slug` | Must match the `data-book` attribute on the cover `<a>` element |
| `title` | Display title (used for documentation; the HTML has its own styled title) |
| `author` | Must match the `data-author` attribute on the author card in `library.html` |
| `added` | ISO 8601 date — drives NEW badges and read-tracking |

### Current Books

| Slug | Title | Author | File |
|---|---|---|---|
| `veth-ossivael` | Veth-Ossivael | `nereth` | `books/veth-ossivael.html` |
| `positions-pour-survivre` | Positions pour Survivre à un Noble | `nereth` | `books/positions-pour-survivre.html` |
| `premier-corsivael` | Le Premier Corsivael | `nereth` | `books/premier-corsivael.html` |
| `carnets-simon-3` | Les Sky Docks de Spire | `simon` | `books/carnets-simon-3.html` |
| `carnets-simon-7` | Les North Docks de Spire | `simon` | `books/carnets-simon-7.html` |
| `carnets-simon-8` | Red Row de Spire | `simon` | `books/carnets-simon-8.html` |

### Current Authors

| Slug | Name | File | Books |
|---|---|---|---|
| `nereth` | Nereth-Qui-Écrit-Dans-le-Noir | `authors/nereth.html` | 3 |
| `simon` | Simon Verlat | `authors/simon.html` | 3 |

---

## 8. Yul Private Library

### Access Control

The Yul collection is restricted to a hardcoded username allowlist:

```javascript
const allowed = ['Yul', 'admin', 'mady'];
if (!localStorage.getItem('spire_token') || !allowed.includes(user)) {
  window.location.href = 'dashboard.html';
}
```

**This allowlist is duplicated in 8 files.** All must be updated together when adding a user:

| File |
|---|
| `dashboard.html` |
| `yul-library.html` |
| `books/yul/art-union.html` |
| `books/yul/bestiaire.html` |
| `books/yul/catalogue-mecanique.html` |
| `books/yul/catalogue-substances.html` |
| `books/yul/coutumes-charnelles.html` |
| `books/yul/reference-rapide.html` |

### Current Books

| File | Title |
|---|---|
| `books/yul/bestiaire.html` | Bestiaire Exotique |
| `books/yul/catalogue-substances.html` | Catalogue des Substances Rares |
| `books/yul/art-union.html` | L'Art de l'Union |
| `books/yul/coutumes-charnelles.html` | Coutumes Charnelles du Monde Extérieur |
| `books/yul/catalogue-mecanique.html` | Catalogue Mécanique |
| `books/yul/reference-rapide.html` | Yul — Référence Rapide |

---

## 9. The "Nouveau" Badge System

### How It Works

A badge appears automatically on recently added content. No manual intervention needed — it is driven by dates in the JSON files.

```javascript
function isNew(dateStr) {
  return (new Date() - new Date(dateStr)) < 7 * 24 * 60 * 60 * 1000;
}
```

A book also loses its badge as soon as the current user has opened it (see [Section 11 — Read Tracking](#11-read-tracking)).

The combined condition used everywhere:

```javascript
isNew(book.added) && !isRead(book.slug)
```

### Badge Hierarchy

The badge bubbles up from book → author → dashboard:

| Level | Element | Condition |
|---|---|---|
| Book cover | `.book-entry` on author page | Book is new **and** unread |
| Author card | `.author-card` on `library.html` | Any book by that author is new and unread |
| Library card | `#libCard` on `dashboard.html` | Any book anywhere is new and unread |
| Journal card | Card on `journals.html` | Latest edition < 7 days |
| Press card | `#pressCard` on `dashboard.html` | Any paper's latest edition < 7 days |

### Implementation Note — Overflow Clipping

Book covers have `overflow: hidden` (required for the CSS art). Badges are therefore appended to the `.book-entry` wrapper, not the `.book-cover` itself, to avoid being clipped:

```javascript
cover.parentElement.appendChild(badge); // correct — appends to .book-entry
```

---

## 10. Reviews System

Users can leave a star rating (1–5) and an optional comment on each book. Reviews are displayed on the **author page**, below each book cover. There are no reviews on the book page itself.

### Where It Appears

On each author page (`authors/*.html`), below the book title and type label, a review section is injected automatically for every book:

- Average star rating + number of reviews (or "Aucun avis")
- "Laisser un avis" button → expands an inline form
- Star picker (1–5, clickable)
- Optional comment textarea
- Submit button
- List of all reviews (username, stars, comment, date)

If the current user already has a review, the form pre-fills their existing values and the button reads "Modifier mon avis". Submitting again updates the existing review (one review per user per book, enforced by the database).

### How It Works

`js/reviews.js` is loaded by every author page. On `DOMContentLoaded`, it:
1. Finds every `a[data-book]` element on the page
2. For each, calls `GET /api/reviews/{slug}` with the user's JWT
3. Renders the review section below the `.book-entry`

No changes are needed to author pages when adding a new book — as long as the cover `<a>` has `data-book="{slug}"`, reviews are wired up automatically.

### API Endpoints

**`GET /api/reviews/:slug`** — requires auth token

```
Header:   Authorization: Bearer {token}
Response: { reviews: [...], average: 4.2, count: 3 }

Review object: { username, rating, comment, created_at }
```

**`POST /api/reviews`** — requires auth token, creates or updates

```
Header:   Authorization: Bearer {token}
Body:     { book_slug, rating, comment }
Response: { message: "Avis enregistré." }
```

### Database Table

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  book_slug  TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, book_slug)
);
```

---

## 11. Read Tracking

`js/read-tracker.js` tracks which books each user has opened. State is stored in localStorage, keyed per user so different users on the same device have independent read states.

### localStorage Key

```
spire_read_{username}   →   JSON array of slugs, e.g. ["veth-ossivael", "carnets-simon-3"]
```

### API

The script exposes two global functions used by the page scripts:

```javascript
isRead(slug)    // → true if this user has already opened that book
markRead(slug)  // → adds the slug to the read list
```

### How It Works

On every author page, the inline script adds a click listener to every book cover link:

```javascript
document.querySelectorAll('a[data-book]').forEach(link => {
  link.addEventListener('click', () => markRead(link.dataset.book));
});
```

When the user clicks a cover, `markRead` fires synchronously (before navigation), so when they return to the author page the badge is already gone.

`library.html` and `dashboard.html` also load `read-tracker.js` and use `isRead()` to suppress badges for books the current user has already opened.

---

## 12. Backend Server

**Location:** `server/` — deployed on [Render](https://render.com)
**URL:** `https://spiresite.onrender.com`

### Environment Variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs and verifies JWTs. Keep secret. |
| `ADMIN_KEY` | Protects `/api/register`. |
| `DATABASE_URL` | PostgreSQL connection string (with SSL). |
| `PORT` | Set automatically by Render. |

The server exits on startup if any of these are missing.

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  book_slug  TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, book_slug)
);
```

Both tables are created automatically on first server start if they don't exist.

### All Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/login` | — | Authenticate, returns JWT |
| `POST` | `/api/register` | Admin key | Create a new user |
| `GET` | `/api/me` | Bearer token | Verify token, returns user info |
| `GET` | `/api/reviews/:slug` | Bearer token | Get reviews for a book |
| `POST` | `/api/reviews` | Bearer token | Create or update a review |
| `GET` | `/health` | — | Health check |

### CORS

Allowed origins: `https://deemo1906.github.io`, `http://localhost:5500`, `http://127.0.0.1:5500`

---

## 13. ➜ How to Add a New Book

> Adding a book to an **existing** author. For a new author, see [Section 14](#14-how-to-add-a-new-author).

### Step 1 — Write the book page

Create `books/{slug}.html`. Use an existing book file as a starting point. Every book page must include the auth guard at the top of its `<script>`:

```javascript
if (!localStorage.getItem('spire_token')) {
  window.location.href = '../connect.html';
}
```

The `slug` is a short kebab-case identifier with no spaces or accents (e.g. `mon-nouveau-livre`). It will be used everywhere to identify this book.

### Step 2 — Register the book in `library/index.json`

Append one entry to the `books` array. Set `added` to today's date — this is what drives the NEW badge.

```json
{ "slug": "mon-nouveau-livre", "title": "Mon Nouveau Livre", "author": "nereth", "added": "2026-03-20" }
```

The `author` value must exactly match the `data-author` attribute of the author's card in `library.html`.

### Step 3 — Add the cover to the author page

Open the author's file (`authors/nereth.html` or `authors/simon.html`) and add a new `.book-entry` block inside `.bookshelf`. Copy the structure of an existing entry and adapt the CSS classes and content. The critical part is the `data-book` attribute on the `<a>` — it must match the slug exactly:

```html
<div class="book-entry">
  <a class="book-cover cover-monlivre" href="../books/mon-nouveau-livre.html" data-book="mon-nouveau-livre">
    <!-- your CSS-art cover content here -->
  </a>
  <p class="book-title-label">Mon Nouveau Livre</p>
  <p class="book-type-label">Type — description courte</p>
</div>
```

Add the `.cover-monlivre` CSS in the page's `<style>` block to style the cover.

### Step 4 — Update the work counts

In two places, update the "X ouvrages disponibles" / "X carnets disponibles" string to reflect the new total:

- `authors/{slug}.html` — in the `.author-works` paragraph inside `.author-header`
- `library.html` — in the `.author-works` paragraph inside the author's `.author-card`

### What is automatic

You do **not** need to do anything else. These features wire themselves up via the `data-book` attribute:

| Feature | How |
|---|---|
| NEW badge on the book cover | `library/index.json` date + `isNew()` check |
| NEW badge on the author card | Same — bubbles up from the book |
| NEW badge on the dashboard | Same — bubbles up further |
| Badge disappears when read | `read-tracker.js` intercepts the cover click |
| Reviews section | `reviews.js` finds `a[data-book]` and renders a review block below |

---

## 14. ➜ How to Add a New Author

### Step 1 — Create the author page

Create `authors/{slug}.html`. Use `authors/nereth.html` or `authors/simon.html` as a template. Replace:

- The `<title>` tag
- The `.author-sigil` letter
- The `.author-name`, `.author-bio`, `.author-works` content
- All `.book-entry` blocks in `.bookshelf` with the new author's books
- The CSS cover classes (`.cover-*`) and their styles in the `<style>` block

The two script tags at the **end of `<body>`** must be kept exactly as-is — they provide read tracking and reviews for free:

```html
<script src="../js/read-tracker.js"></script>
<script>
  if (!localStorage.getItem('spire_token')) {
    window.location.href = '../connect.html';
  }

  document.querySelectorAll('a[data-book]').forEach(link => {
    link.addEventListener('click', () => markRead(link.dataset.book));
  });

  function isNew(dateStr) {
    return (new Date() - new Date(dateStr)) < 7 * 24 * 60 * 60 * 1000;
  }

  fetch('../library/index.json')
    .then(r => r.json())
    .then(data => {
      const newSlugs = new Set(
        data.books.filter(b => isNew(b.added) && !isRead(b.slug)).map(b => b.slug)
      );
      document.querySelectorAll('[data-book]').forEach(cover => {
        if (newSlugs.has(cover.dataset.book)) {
          const badge = document.createElement('span');
          badge.className = 'badge-new';
          badge.textContent = 'Nouveau';
          cover.parentElement.appendChild(badge);
        }
      });
    })
    .catch(() => {});
</script>
<script src="../js/reviews.js"></script>
```

### Step 2 — Add the author card to `library.html`

Inside `.authors-grid`, add a new card. The `data-author` value must match the slug you chose for the author:

```html
<a class="author-card" href="authors/{slug}.html" data-author="{slug}">
  <div class="author-sigil">X</div>
  <div class="author-info">
    <p class="author-label">Auteur</p>
    <p class="author-name">Nom de l'Auteur</p>
    <p class="author-works">N ouvrages disponibles</p>
  </div>
</a>
```

### Step 3 — Register the books in `library/index.json`

For each book by this new author, add an entry with `"author": "{slug}"`:

```json
{ "slug": "premier-livre", "title": "Premier Livre", "author": "{slug}", "added": "2026-03-20" }
```

### Step 4 — Write each book page

Follow [Section 13 — Steps 1 and 3](#13-how-to-add-a-new-book) for each book. The `library/index.json` entries were already done in Step 3.

### What is automatic

| Feature | How |
|---|---|
| NEW badge on the author card | Driven by `library/index.json` dates matching `data-author` |
| NEW badge on the dashboard | Bubbles up from the author card |
| Reviews on all books | `reviews.js` runs on any author page and finds `a[data-book]` |
| Read tracking | `read-tracker.js` runs on any author page |

---

## 15. ➜ How to Add a New Journal Edition

1. Write the edition HTML in `journals/` (e.g. `journals/ambrosia-2.html`)
2. In `journals/index.json`, append to the correct paper's `editions` array — the new entry must be **last**:
   ```json
   { "number": 2, "file": "ambrosia-2.html", "date": "2026-03-25" }
   ```
3. Commit and push. The NEW badge appears for 7 days automatically.

---

## 16. ➜ How to Add a New Journal Paper

1. Write the first edition HTML in `journals/`
2. Add the paper object to `journals/index.json`
3. In `journals.html`, add the card template to the `templates` object in the `<script>`:
   ```javascript
   mynewpaper: `<div class="card-mynewpaper">...</div>`
   ```
4. Add the `.card-mynewpaper` CSS to the `<style>` block in `journals.html`
5. Commit and push.

---

## 17. ➜ How to Add a User

Users are created via the API — never directly in the database.

```bash
curl -X POST https://spiresite.onrender.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123","adminKey":"YOUR_ADMIN_KEY"}'
```

- Password must be at least 8 characters.
- Usernames are case-insensitive at login but stored as entered.

**If the user needs Yul collection access**, add their username to the allowlist in all 8 files listed in [Section 8](#8-yul-private-library). Find and replace `['Yul', 'admin', 'mady']` with the updated list across the project:

```bash
# In VS Code: Ctrl+Shift+H (Find & Replace in files)
# Find:    ['Yul', 'admin', 'mady']
# Replace: ['Yul', 'admin', 'mady', 'newuser']
# Files to include: *.html
```

---

## 18. Access Control

| Page | Condition | Redirect if denied |
|---|---|---|
| `index.html` | Public | — |
| `connect.html` | Public | — |
| `welcome.html` | `spire_token` present | `connect.html` |
| `dashboard.html` | `spire_token` present | `connect.html` |
| `journals.html` | `spire_token` present | `connect.html` |
| `archive.html` | `spire_token` present | `connect.html` |
| `library.html` | `spire_token` present | `connect.html` |
| `authors/*.html` | `spire_token` present | `../connect.html` |
| `books/*.html` | `spire_token` present | `../connect.html` |
| `yul-library.html` | Token + username in allowlist | `dashboard.html` |
| `books/yul/*.html` | Token + username in allowlist | `../../dashboard.html` |

---

## 19. Deployment

### Frontend (GitHub Pages)

- Repo: `https://github.com/Deemo1906/spireSite`
- Branch: `main` — pages served from root, no build step
- Changes are live ~30 seconds after push

```bash
git add .
git commit -m "feat(library): add new book"
git push origin main
```

### Backend (Render)

- Auto-deploys from the `server/` directory on every push to `main`
- Environment variables are set in the Render dashboard (not in code)
- Cold start: first request after inactivity may take ~15–30 seconds (free tier)
- Health check: `GET https://spiresite.onrender.com/health`
- Database schema is applied automatically on server start (`db.js → init()`)

### Local Development

Serve the frontend with any static server (e.g. VS Code Live Server on port 5500). The CORS config already allows `localhost:5500`. The API URL in `connect.html` is hardcoded to the production Render URL — local frontend talks to the live backend.

---

*Documentation last updated: 2026-03-20*
