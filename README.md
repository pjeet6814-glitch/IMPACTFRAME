# IMPACTFRAME

*Create. Conserve. Inspire.*

Website for IMPACTFRAME, a college media club making short films, AI films,
and documentaries about conserving energy and nature.

## What's here

```
impactframe/
├── backend/          Express API + SQLite database
│   ├── server.js
│   ├── db/init.js         creates the DB and (optionally) seeds sample films
│   ├── routes/films.js    GET/POST/PUT/DELETE /api/films
│   ├── middleware/adminAuth.js
│   └── .env.example
└── frontend/         Plain HTML/CSS/JS, no build step
    ├── index.html
    ├── gallery.html
    ├── css/style.css
    ├── js/
    └── assets/
        ├── logo-full.jpg    the full club logo (icon + wordmark), used in the hero
        ├── logo-mark.png    circular crop of just the camera-and-leaf icon, used in the nav/footer
        └── favicon.png      small version of the icon for the browser tab
```

The color palette (navy `#16283f`, olive green `#4f6f34`, parchment `#ece6d8`) is pulled
directly from the club logo, and the nav/footer link out to the real
[YouTube](https://www.youtube.com/@ImpactFrameEE) and
[Instagram](https://www.instagram.com/impactframe.ee/) accounts.

The frontend is plain static files — open it directly, or let the backend
serve it for you (see below). The backend is a small REST API backed by a
SQLite file, so there's no external database server to install.

## Run it

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up your environment**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set `ADMIN_KEY` to a private value — this is the password
   used to add, edit, or delete films through the API.

3. **Seed some sample films** (optional, but the gallery will be empty
   otherwise)
   ```bash
   npm run seed
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   Visit **http://localhost:4000** — the backend serves the frontend
   directly, so this one address gives you the whole site.

   If you'd rather run the frontend separately (e.g. with the VS Code Live
   Server extension), you can — just set `window.IMPACTFRAME_API_BASE` in
   `frontend/js/api.js` to wherever the backend is running, e.g.
   `http://localhost:4000`.

## API reference

| Method | Path              | Auth       | Description                          |
|--------|-------------------|------------|---------------------------------------|
| GET    | `/api/films`       | —          | List films. Optional `?category=` filter (`Short Film`, `AI Film`, `Documentary`). |
| GET    | `/api/films/:id`   | —          | Get one film.                         |
| POST   | `/api/films`       | admin key  | Add a film.                           |
| PUT    | `/api/films/:id`   | admin key  | Update a film.                        |
| DELETE | `/api/films/:id`   | admin key  | Remove a film.                        |

Admin routes require an `x-admin-key` header matching `ADMIN_KEY` in `.env`.
Example — add a film from the command line:

```bash
curl -X POST http://localhost:4000/api/films \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{
    "title": "Last Light",
    "category": "Short Film",
    "synopsis": "A hostel corridor, and the lights nobody turns off.",
    "duration_minutes": 6,
    "video_url": "https://www.youtube.com/embed/VIDEO_ID",
    "release_year": 2026
  }'
```

`video_url` should be an **embeddable** link (a YouTube/Vimeo *embed* URL,
not the regular watch page) since it's dropped straight into an `<iframe>`.

## Deploying to Vercel via Git

This repository is pre-configured with `vercel.json`, root `package.json`, and `api/index.js` for zero-configuration full-stack deployment on Vercel:

### Step 1: Push your code to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `impactframe`).
2. Run the following commands in this folder:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

### Step 2: Import into Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** &rarr; **"Project"**.
3. Select your **`impactframe`** GitHub repository and click **"Import"**.
4. In Project Settings:
   - **Framework Preset**: *Other* (detected automatically)
   - **Root Directory**: `./` (leave default)
5. Under **Environment Variables** (Optional):
   - Add `ADMIN_KEY` = `impactframe2026` (or your chosen master secret).
6. Click **"Deploy"**!

Vercel will build and launch your site with a live `*.vercel.app` URL. Every subsequent `git push` to your `main` branch will automatically deploy updates!
