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

## Deploying

- **Backend**: any Node host works (Render, Railway, a college server, a VPS).
  Just make sure the `backend/db/` folder is on persistent storage — the
  SQLite file lives there.
- **Frontend**: since `server.js` already serves the `frontend/` folder as
  static files, deploying the backend deploys the whole site. No separate
  static host needed unless you want one.

## Next steps you might want

- A small admin page (HTML form) that calls the POST/PUT/DELETE endpoints,
  instead of curl or Postman.
- User accounts for members instead of a single shared admin key.
- An events/screenings page using the same pattern as the film gallery.
