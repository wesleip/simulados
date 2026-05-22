# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

LPI (Linux Professional Institute) exam simulator — a Node.js/Express web app that serves randomized multiple-choice practice exams and tracks submission stats in a local SQLite database. Questions are in Portuguese.

## Commands

```bash
# Install dependencies
npm install

# Run the server (port 3000)
node app.js

# Build and run with Docker
docker build -t simulados .
docker run -p 3000:3000 simulados
```

No linter or test runner is configured.

## Architecture

**Single-file backend:** All routes and database logic live in `app.js`. There is no router split.

**Database initialization:** On every startup, `initializeDatabase()` **drops and recreates** all tables (`questions1`, `questions2`, `admins`, `submissions`) and re-seeds them from the JSON files. This means **submissions are lost on restart** — this is intentional/known behavior given the current design.

**Question data flow:**
- `data/questions.json` → `questions1` table → `/essentials` route → `views/essentials.ejs`
- `data/questions2.json` → `questions2` table → `/essentials2` route → `views/essentials2.ejs`
- Questions are served in random order (`ORDER BY RANDOM()`).

**Result submission flow:** The exam views POST to `/eresult`, which scores answers and stores the result in the module-level `latestResults` variable (not in the DB). The GET `/eresult` renders from that in-memory variable. This means only one result set is kept at a time (last submission wins, shared across all users).

**Simulado identity:** Which simulado a submission belongs to is inferred by checking if `questions[0].id <= 54` — a simplification that works as long as questions stay in their current order.

**Admin area:** `/management` (protected by session auth) shows aggregate stats per simulado. Default credentials are `admin` / `admin123` (hashed with bcrypt, recreated on each restart).

**Views:** EJS templates in `views/`. Shared partials are in `views/partials/` (header and footer). Static assets (SVGs) are served from `public/`.

## Adding a new simulado

1. Add a JSON file under `data/` with the same structure as `questions.json` (`question`, `options`, `answer` fields; multi-answer questions use `", "` as separator in `answer`).
2. In `initializeDatabase()`, drop/create/seed a new table (e.g., `questions3`) following the existing pattern.
3. Add a GET route and a new EJS view.
4. Update the simulado identity logic in `POST /eresult` and the management dashboard query if tracking stats per simulado is needed.
