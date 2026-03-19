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
10. [Backend Server](#10-backend-server)
11. [How to Add Content](#11-how-to-add-content)
12. [How to Add a User](#12-how-to-add-a-user)
13. [Access Control](#13-access-control)
14. [Deployment](#14-deployment)

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
│   └── nereth.html             # Nereth author page (book covers)
│
├── books/
│   ├── veth-ossivael.html
│   ├── positions-pour-survivre.html
│   ├── premier-corsivael.html
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
    ├── db.js                   # PostgreSQL init
    └── package.json
```

---

## 2. Architecture Overview

```
[Browser / GitHub Pages]
        │
        │  Static HTML/CSS/JS
        │
   ┌────▼─────────────────┐
   │  index.html          │  ← Public landing
   │  connect.html        │  ← Login form
   │  dashboard.html      │  ← Hub (auth-gated)
   │  journals.html       │  ← Journals (auth-gated)
   │  library.html        │  ← Library (auth-gated)
   │  yul-library.html    │  ← Restricted (role-gated)
   └────┬─────────────────┘
        │
        │  HTTPS POST /api/login
        │  JWT stored in localStorage
        │
   ┌────▼────────────────────────┐
   │  Express API (Render)       │
   │  https://spiresite.onrender │
   │  .com                       │
   └────┬────────────────────────┘
        │
        │  PostgreSQL (Render managed)
        │
   ┌────▼──────────────────┐
   │  users table          │
   │  id, username,        │
   │  password_hash,       │
   │  created_at           │
   └───────────────────────┘
```

**Key constraints:**
- GitHub Pages serves only static files — no server-side logic on the frontend.
- All auth is JWT-based. The token is stored in `localStorage` and sent to the backend only at login.
- Subsequent pages do **not** re-validate the token with the server on every load. The check is client-side only (`localStorage.getItem('spire_token')`). This is intentional for a private fan site — security is by obscurity, not hardened auth.
- Access control for restricted pages (Yul library) is enforced client-side via a username allowlist. This can be bypassed by someone with DevTools knowledge. This is acceptable for the use case.

---

## 3. Design System

All global variables are in `style.css` under `:root`.

### Color Palette

| Variable | Value | Use |
|---|---|---|
| `--bg-0` | `#09080a` | Page background |
| `--bg-1` | `#100e12` | Sections, about |
| `--bg-2` | `#18151d` | Cards, form backgrounds |
| `--bg-3` | `#221e28` | Lighter card accents |
| `--bg-4` | `#2c2733` | Reserved |
| `--red-900` | `#3d0a0a` | Deepest red |
| `--red-700` | `#6b1414` | Borders, decorative rules |
| `--red-500` | `#9b1c1c` | Primary accent — badges, buttons, rules |
| `--red-400` | `#c0292b` | Hover states, glows |
| `--red-300` | `#e05050` | Bright highlight red |
| `--blue-900` | `#0a0f1a` | Deep navy backgrounds |
| `--blue-300` | `#4a90d0` | World-building tags |
| `--gold-500` | `#b8903a` | Luxury/rare accent |
| `--gold-300` | `#d4a84b` | Brighter gold |
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

**Additional fonts** (used in specific journal card styles only):
- `Cormorant Garamond` — Ambrosia, Positions pour Survivre
- `VT323` — Liberate! (retro monospace)
- `Special Elite` — Liberate! (typewriter feel)
- `Source Serif 4` — The Chronicle
- `UnifrakturMaguntia` — The Furnace (gothic blackletter)
- `Poiret One` — The Silhouette
- `Oswald` — The Torch
- `IM Fell English` — Yul library
- `Playfair Display` — Premier Corsivael, Yul covers

### Layout Conventions

- Max content width: `1080px` (`.container`)
- Default page padding: `5rem 2rem 6rem`
- Card hover effect: `translateY(-3px)` to `translateY(-5px)` + border color change
- Border radius: `2px` (near-square, deliberately minimal)
- Transitions: `0.22s ease`

### Spacing Patterns

- Section eyebrow: `0.62rem`, `letter-spacing: 0.5em`, `text-transform: uppercase`, `color: var(--text-3)`
- Section title: `clamp(1.4rem, 4vw, 2.2rem)`, Cinzel, uppercase
- Red rule under title: `48px × 2px`, `background: var(--red-500)`
- Cards: `padding: 1.75rem`

---

## 4. Authentication System

### Flow

```
connect.html
  └─ POST /api/login  {username, password}
        └─ bcrypt.compare(password, hash)
              └─ jwt.sign({id, username}, JWT_SECRET, {expiresIn: '7d'})
                    └─ {token, username}  → localStorage
                          └─ redirect → welcome.html → dashboard.html
```

### Storage

| Key | Value |
|---|---|
| `localStorage.spire_token` | JWT string |
| `localStorage.spire_user` | Username string |

### Auth Guard (every protected page)

```javascript
if (!localStorage.getItem('spire_token')) {
  window.location.href = 'connect.html'; // or '../connect.html' in subdirs
}
```

### Logout

```javascript
localStorage.removeItem('spire_token');
localStorage.removeItem('spire_user');
window.location.href = 'index.html';
```

### Session Duration

JWTs expire after **7 days**. After expiry, the token remains in localStorage but any server call using it (`/api/me`) will return 401. The frontend does not proactively check expiry — the user would need to try a server action, or log out and back in.

---

## 5. Pages Reference

### `index.html` — Landing

Public. No auth required. Single hero section with breathing circle animation. CTA links to `connect.html`.

### `connect.html` — Login

Public. Login form. Calls `POST /api/login`. On success, stores token + username and redirects to `welcome.html`.

### `welcome.html` — Welcome Animation

Auth-gated. Displays username with a 3.2s fade animation. Auto-redirects to `dashboard.html`.

### `dashboard.html` — Hub

Auth-gated. Navigation grid:

| Card | ID | Destination | Badge Source |
|---|---|---|---|
| La Presse | `pressCard` | `journals.html` | `journals/index.json` |
| Bibliothèque | `libCard` | `library.html` | `library/index.json` |
| Collection Privée | `yulCard` | `yul-library.html` | None |

The Yul card is hidden by default (`display:none`) and shown only if `localStorage.spire_user` is in `['Yul', 'admin', 'mady']`.

### `journals.html` — Press Grid

Auth-gated. Dynamically renders 6 journal cards from `journals/index.json`. Each card has:
- Styled front cover (CSS-only, no images)
- "Lire" action → opens latest edition in new tab
- "Archives" action → `archive.html?paper={id}`
- NEW badge if latest edition < 7 days old

### `archive.html` — Edition Archive

Auth-gated. Reads `?paper={id}` from URL. Fetches `journals/index.json`. Displays all editions for that paper, newest first. Latest edition has red left border.

### `library.html` — Author Grid

Auth-gated. Grid of author cards. Each links to `authors/{slug}.html`. Shows NEW badge if any book by that author was added within 7 days.

### `authors/nereth.html` — Nereth Bookshelf

Auth-gated. Shows Nereth's bio + 3 book covers. Clicking a cover opens the book. NEW badge on individual covers if added < 7 days ago.

### `yul-library.html` — Private Collection

Auth-gated + role-gated. Shows 6 CSS-art journal covers. Unauthorized users are redirected to `dashboard.html`.

### `books/*.html` — Book Pages

Auth-gated. Each book is a standalone HTML page with its own CSS cover art at the top followed by the book content. No shared template — each has a unique visual style.

---

## 6. Journal System

### Metadata File: `journals/index.json`

This is the single source of truth for all journals.

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
| `id` | Unique identifier, used in `archive.html?paper={id}` |
| `name` | Display name on the card |
| `tagline` | Subtitle shown on the card |
| `style` | Maps to a CSS card template in `journals.html` |
| `editions[].number` | Edition number (displayed on card) |
| `editions[].file` | Filename inside the `journals/` folder |
| `editions[].date` | Publication date (ISO 8601: `YYYY-MM-DD`) — drives NEW badges |

The **latest edition** is always `editions.at(-1)` — the last item in the array.

### Current Papers

| ID | Name | Style | Editions |
|---|---|---|---|
| `ambrosia` | Ambrosia | `ambrosia` | 1 |
| `liberate` | Liberate! | `liberate` | 1 |
| `the-chronicle` | The Chronicle | `chronicle` | 1 |
| `the-furnace` | The Furnace | `furnace` | 1 |
| `the-silhouette` | The Silhouette | `silhouette` | 1 |
| `the-torch` | The Torch | `torch` | 1 |

### Adding a New Edition

1. Create the HTML file in `journals/` (e.g. `ambrosia-2.html`)
2. Append a new object to the paper's `editions` array in `journals/index.json`:
   ```json
   { "number": 2, "file": "ambrosia-2.html", "date": "2026-03-25" }
   ```
3. The new edition becomes the latest automatically (last item in array)
4. The NEW badge will appear on the card for 7 days from the date

### Adding a New Paper

1. Create the edition HTML file in `journals/`
2. Add the paper object to `journals/index.json`
3. Add a matching CSS card template to `journals.html` (inside the `templates` object in the script) with the corresponding style class
4. Add the CSS for the card style in the `<style>` block of `journals.html`

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
| `slug` | Matches the `data-book` attribute on the book cover element |
| `title` | Display title (not currently rendered from JSON — it's in the HTML) |
| `author` | Matches the `data-author` attribute on the author card in `library.html` |
| `added` | Date added (ISO 8601) — drives NEW badges |

### Adding a New Book to the Public Library

1. Create the book HTML file in `books/` (e.g. `books/my-book.html`)
2. Add the author page entry if not yet present (in `authors/`)
3. Add an entry to `library/index.json`:
   ```json
   { "slug": "my-book", "title": "My Book", "author": "nereth", "added": "2026-03-25" }
   ```
4. Add the book cover to the author's page (`authors/nereth.html`) with `data-book="my-book"`:
   ```html
   <a class="book-cover cover-mybook" href="../books/my-book.html" data-book="my-book">
     ...
   </a>
   ```
5. Update the "X ouvrages disponibles" count in both `library.html` and `authors/nereth.html`

### Adding a New Author

1. Create `authors/{slug}.html` following the structure of `authors/nereth.html`
2. Add the author card to `library.html` with `data-author="{slug}"`:
   ```html
   <a class="author-card" href="authors/{slug}.html" data-author="{slug}">
     <div class="author-sigil">X</div>
     <div class="author-info">
       <p class="author-label">Auteur</p>
       <p class="author-name">Author Name</p>
       <p class="author-works">N ouvrages disponibles</p>
     </div>
   </a>
   ```
3. Add the author's books to `library/index.json` with `"author": "{slug}"`

---

## 8. Yul Private Library

### Access Control

Hardcoded allowlist checked on page load:

```javascript
const allowed = ['Yul', 'admin', 'mady'];
if (!localStorage.getItem('spire_token') || !allowed.includes(user)) {
  window.location.href = 'dashboard.html';
}
```

This same allowlist must be maintained in **all** Yul book pages (`books/yul/*.html`) and in `dashboard.html` (to show/hide the Collection Privée card).

**Files containing the allowlist:**
- `dashboard.html`
- `yul-library.html`
- `books/yul/art-union.html`
- `books/yul/bestiaire.html`
- `books/yul/catalogue-mecanique.html`
- `books/yul/catalogue-substances.html`
- `books/yul/coutumes-charnelles.html`
- `books/yul/reference-rapide.html`

### Adding a User to the Yul Collection

Search and replace `['Yul', 'admin', 'mady']` with the updated list across all 8 files above.

### Current Books

| File | Title | Cover Style |
|---|---|---|
| `books/yul/bestiaire.html` | Bestiaire Exotique | Hunter green leather |
| `books/yul/catalogue-substances.html` | Catalogue des Substances Rares | Oxblood alchemical |
| `books/yul/art-union.html` | L'Art de l'Union | Aged cream academic |
| `books/yul/coutumes-charnelles.html` | Coutumes Charnelles du Monde Extérieur | Worn travel journal |
| `books/yul/catalogue-mecanique.html` | Catalogue Mécanique | Dark navy technical |
| `books/yul/reference-rapide.html` | Yul — Référence Rapide | Cream pamphlet |

### Adding a Book to the Yul Library

1. Create the book HTML file in `books/yul/`
2. Include the access control script:
   ```javascript
   const user = localStorage.getItem('spire_user');
   const allowed = ['Yul', 'admin', 'mady'];
   if (!localStorage.getItem('spire_token') || !allowed.includes(user)) {
     window.location.href = '../../dashboard.html';
   }
   ```
3. Add the cover entry to `yul-library.html` following the existing pattern

---

## 9. The "Nouveau" Badge System

### Purpose

Automatically surfaces new content on the dashboard, author pages, and journal pages. No manual configuration needed — badges appear and disappear based on dates.

### How It Works

A small `isNew()` utility function is duplicated in each page that needs it:

```javascript
function isNew(dateStr) {
  return (new Date() - new Date(dateStr)) < 7 * 24 * 60 * 60 * 1000;
}
```

If a date is within 7 days of today, the content is considered new.

### Badge Styling

```css
.badge-new {
  position: absolute;
  top: -9px;
  right: 12px;
  background: var(--red-500);
  color: var(--text-0);
  font-family: var(--font-heading);
  font-size: 0.48rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  padding: 2px 8px;
  z-index: 2;
}
```

The badge is injected via JavaScript, never hardcoded in HTML. The parent element must have `position: relative`.

### Badge Locations

| Page | Element | Data Source | Condition |
|---|---|---|---|
| `dashboard.html` | La Presse card (`#pressCard`) | `journals/index.json` | Any paper's latest edition < 7 days |
| `dashboard.html` | Bibliothèque card (`#libCard`) | `library/index.json` | Any book < 7 days |
| `journals.html` | Each journal card | `journals/index.json` | That paper's latest edition < 7 days |
| `archive.html` | Each edition row | `journals/index.json` | That edition's date < 7 days |
| `library.html` | Author card (`[data-author]`) | `library/index.json` | Any book by that author < 7 days |
| `authors/nereth.html` | Book cover (`[data-book]`) | `../library/index.json` | That specific book's added date < 7 days |

### Important: Overflow Clipping

Book covers in `authors/nereth.html` have `overflow: hidden` (needed for the CSS art). The badge is therefore attached to the parent `.book-entry` wrapper (which has `position: relative`), not the cover itself. This avoids the badge being clipped.

```javascript
// Correct: append to parent, not the cover itself
cover.parentElement.appendChild(badge);
```

---

## 10. Backend Server

**Location:** `server/` — deployed on [Render](https://render.com)
**URL:** `https://spiresite.onrender.com`

### Environment Variables (Required)

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs and verifies JWTs. Keep secret. |
| `ADMIN_KEY` | Protects the `/api/register` endpoint. |
| `DATABASE_URL` | PostgreSQL connection string (with SSL). |
| `PORT` | Server port (Render sets this automatically). |

The server exits with code 1 on startup if any of these are missing.

### Endpoints

#### `POST /api/login`
Authenticates a user and returns a JWT.

```
Body:     { "username": "...", "password": "..." }
Success:  { "token": "jwt...", "username": "..." }
Errors:   400 missing fields
          401 wrong credentials
          500 server error
```

#### `POST /api/register`
Creates a new user. Protected by admin key.

```
Body:     { "username": "...", "password": "...", "adminKey": "..." }
Success:  { "message": "Utilisateur \"x\" créé." }
Errors:   400 missing fields
          400 password too short (< 8 chars)
          403 wrong adminKey
          409 username already exists
          500 server error
```

#### `GET /api/me`
Verifies a token and returns the user info.

```
Header:   Authorization: Bearer {token}
Success:  { "id": 1, "username": "..." }
Errors:   401 no token / expired token
```

#### `GET /health`
Health check.

```
Response: { "status": "ok" }
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### CORS

Allowed origins:
- `https://deemo1906.github.io` (production)
- `http://localhost:5500` (local dev)
- `http://127.0.0.1:5500` (local dev)

---

## 11. How to Add Content

### New Journal Edition

1. Write the edition HTML, save to `journals/ambrosia-2.html` (or matching paper)
2. In `journals/index.json`, append to the paper's `editions` array:
   ```json
   { "number": 2, "file": "ambrosia-2.html", "date": "2026-03-25" }
   ```
3. Commit and push. Done — the NEW badge appears automatically for 7 days.

### New Journal Paper (new newspaper)

1. Write the first edition HTML in `journals/`
2. Add the paper object to `journals/index.json`
3. In `journals.html`, add the card template to the `templates` object in the script:
   ```javascript
   mynewpaper: `<div class="card-mynewpaper">...</div>`
   ```
4. Add the CSS for `.card-mynewpaper` to the `<style>` block
5. Commit and push.

### New Public Book

1. Write the book HTML in `books/`
2. Add entry to `library/index.json` with today's date
3. Add the cover to the author's page with `data-book="{slug}"`
4. Update work count strings in `library.html` and the author page

### New Yul Book

1. Write the book HTML in `books/yul/` with the access control script
2. Add the cover to `yul-library.html`

### New Author

1. Create `authors/{slug}.html`
2. Add the author card to `library.html` with `data-author="{slug}"`
3. Add the author's books to `library/index.json`

---

## 12. How to Add a User

Users are created via the `/api/register` endpoint (never directly in the database).

```bash
curl -X POST https://spiresite.onrender.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123","adminKey":"YOUR_ADMIN_KEY"}'
```

**If the user needs access to the Yul private library:**
Add their username to the allowlist in all 8 files listed in [Section 8](#8-yul-private-library). Use find-and-replace across the project:

```python
import os, glob

files = glob.glob('*.html') + glob.glob('books/yul/*.html')
old = "['Yul', 'admin', 'mady']"
new = "['Yul', 'admin', 'mady', 'newuser']"

for f in files:
    content = open(f, encoding='utf-8').read()
    if old in content:
        open(f, 'w', encoding='utf-8').write(content.replace(old, new))
```

---

## 13. Access Control

### Summary Table

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
| `yul-library.html` | `spire_token` + username in allowlist | `dashboard.html` |
| `books/yul/*.html` | `spire_token` + username in allowlist | `../../dashboard.html` |

### Role: Yul Collection Access

Users with access: `Yul`, `admin`, `mady`
Enforced in: dashboard card visibility + yul-library.html + all books/yul/ pages

---

## 14. Deployment

### Frontend (GitHub Pages)

- Repo: `https://github.com/Deemo1906/spireSite`
- Branch: `main`
- Pages served from root
- No build step — push HTML/CSS/JS files directly

```bash
git add .
git commit -m "feat(journals): add ambrosia edition 2"
git push origin main
```

Changes are live in ~30 seconds.

### Backend (Render)

- Auto-deploys from the `server/` directory on push to `main`
- Environment variables are set in the Render dashboard (not in code)
- Cold start: first request after inactivity may take ~15–30 seconds (free tier)
- Health check: `GET https://spiresite.onrender.com/health`

### Local Development

Serve the frontend with any static server (e.g. VS Code Live Server on port 5500). The backend CORS config already allows `localhost:5500`.

The API URL in `connect.html` is hardcoded to the production Render URL — local frontend talks to the live backend.

---

*Documentation last updated: 2026-03-19*
