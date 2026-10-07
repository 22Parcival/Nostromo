# Installation & Integration Guide for the Nostromo Admin Panel

> **Goal** – Enable any developer to embed the full admin‑panel system (UI, API, and data layer) into their own website with minimal effort.

---

## Prerequisites

- **Node.js** ≥ 18 (LTS) and **npm** (or `pnpm`/`yarn`).
- **Git** to clone the repository.
- A web server that can run an **Express** app (e.g., `node`, `pm2`, or any hosting that supports Node).
- (Optional) **HTTPS** for production – required if you use Discord OAuth or cookies.

---

## 1️ Clone the repository

```bash
git clone https://github.com/your-org/nostromo.git
cd nostromo
```

> The project root on your machine will be something like:
> `c:\Users\Parcival\Desktop\Dev\Nostromo`

---

## 2️ Install dependencies

```bash
npm ci   # installs exact versions from package‑lock.json
# or, if you prefer yarn/pnpm
# yarn install
# pnpm install
```

---

## 3️ Configure environment variables

Create a **`.env`** file at the project root:

```dotenv
PORT=3000                # port the Express server will listen on
SESSION_SECRET=your‑secret‑here   # used for express‑session cookies
DISCORD_CLIENT_ID=xxxxx   # if you keep Discord login
DISCORD_CLIENT_SECRET=xxxxx
DATABASE_PATH=src/config/database.sqlite   # path to the SQLite file (default)
# CORS configuration – adjust when embedding on a different domain
CORS_ORIGIN=https://my‑other‑site.com   # optional
```

> The SQLite file will be created automatically at the path above when the server starts for the first time.

---

## 4️ Run the server (development)

```bash
npm run dev   # starts `nodemon` – hot‑reload for dev
# or
node src/server.js
```

The server serves:
- Static front‑end assets under **`public/`** (`/`)
- The admin UI at **`/admin/`**
- API routes under **`/api/admin/*`**

Open <http://localhost:3000/admin> to verify the panel loads with the new dark/light theme.

---

## 5️ Embedding the admin panel into another site

### 5.1 Copy the assets

Copy the **`public/admin/`** folder (contains `index.html`, `admin.css`, `admin.js`) and the **`public/uploads/`** folder (where images are stored) into the target site’s `public/` directory.

If the target site already runs its own Express server, just expose these static files:

```javascript
// In the target site’s server.js
app.use(express.static(path.join(__dirname, 'public')));
```

### 5.2 Include the CSS & JS

Add the following tags to the page where you want the panel:

```html
<link rel="stylesheet" href="/admin/admin.css">
<script type="module" src="/admin/admin.js"></script>
```

### 5.3 Load the HTML

You have two simple options:

| Option | How to use |
|--------|------------|
| **Direct embed** | Paste the body of `public/admin/index.html` inside a container, e.g. `<section id="admin-panel"></section>` and keep the `<link>`/`<script>` from step 5.2. |
| **Iframe** (isolated) | ```html
<iframe src="/admin/" style="border:none;width:100%;height:100vh;"></iframe>
``` |

Both approaches rely on the same client‑side code; choose the one that fits your layout.

---

## 6️ API connectivity

The admin UI talks to the following endpoints (all prefixed with `/api/admin/`):

- `GET /me` – returns the logged‑in user (session‑based).
- `GET /posts` – list of articles (optional `filter=all`).
- `GET /posts/:id` – single article.
- `POST /posts` – create.
- `PUT /posts/:id` – update.
- `DELETE /posts/:id` – delete.
- `POST /upload` – image upload (multipart `image`).

### 6.1 Same origin vs. cross‑origin

- **Same origin** (the admin UI and API live on the same domain/port) – nothing extra needed.
- **Cross‑origin** – enable CORS in the server:

```javascript
import cors from 'cors';
app.use(cors({
  origin: process.env.CORS_ORIGIN, // e.g. https://my‑other‑site.com
  credentials: true
}));
```

Make sure the client sends cookies:
```js
fetch('/api/admin/me', { credentials: 'include' })
```

---

## 7️ Authentication

The panel expects a session cookie created by the **Discord OAuth** flow (`/auth/discord`). If you embed the panel on a site that already shares the same domain, the cookie will be sent automatically.

If you prefer a token‑based approach, replace the session middleware with a JWT check and add the header `Authorization: Bearer <jwt>` to every request. This is a small change in `src/middlewares/auth.middleware.js`.

---

## 8️ Database – where articles live

- The data lives in **SQLite** (`src/config/database.sqlite`).
- Schema is defined in `src/models/post.model.js` (table `posts`).
- For production you can back‑up the file or migrate it to another RDBMS by swapping the Knex configuration (`src/config/knexfile.js`).
- Test runs use an **in‑memory** SQLite DB – no file is written.

---

## 9️ Optional – Dark / Light theme persistence

The UI reads `localStorage.getItem('nostromo_theme')`. Users can toggle the theme with the button in the header; the choice is saved automatically and works across page reloads, iframes, or separate sites (as long as they share the same origin). No extra work required.

---

## 🔧 Quick‑start snippet (for any site)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mon site – Gestion du blog</title>
  <link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
  <h1>Gestion du blog</h1>
  <!-- embed the panel -->
  <iframe src="/admin/" style="border:none;width:100%;height:calc(100vh - 80px);"></iframe>
  <script type="module" src="/admin/admin.js"></script>
</body>
</html>
```

---

## Deploying to production

1. Build (optional) – the UI is pure HTML/CSS/JS, so no build step is needed.
2. Use a process manager such as **PM2**:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name nostromo
   pm2 save
   ```
3. Set up a reverse proxy (NGINX/Apache) to forward `https://your‑domain.com` to the Node process on the chosen port.
4. Ensure the `SESSION_SECRET` and OAuth credentials are **kept secret** (environment variables, not in source).
5. Backup the SQLite file regularly:
   ```bash
   cp src/config/database.sqlite backups/$(date +%F).sqlite
   ```

---

## Need help?

- Open an issue on the repository.
- Join the Discord channel **#dev‑support** (link in the repo README).
- Refer to the source files for deeper details:
  - [`public/admin/index.html`](file:///c:/Users/Parcival/Desktop/Dev/Nostromo/public/admin/index.html)
  - [`public/admin/admin.css`](file:///c:/Users/Parcival/Desktop/Dev/Nostromo/public/admin/admin.css)
  - [`public/admin/admin.js`](file:///c:/Users/Parcival/Desktop/Dev/Nostromo/public/admin/admin.js)
  - API routes: [`src/routes/admin.routes.js`](file:///c:/Users/Parcival/Desktop/Dev/Nostromo/src/routes/admin.routes.js)

---

*Happy hacking!*
