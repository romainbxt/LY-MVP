# CLAUDE.md — LY Project Context

## What is LY?
AI-powered customer retention platform for independent F&B businesses (cafes, restaurants, bakeries) in Berlin, expanding to Europe.

## Architecture
- **Backend:** Flask (Python) with SQLite locally, PostgreSQL on Railway
- **Frontend:** Jinja2 templates + vanilla CSS/JS (no React in production)
- **Deployment:** Railway (auto-deploys from GitHub on push to main)
- **Domain:** lyloyal.com (Namecheap DNS → Railway CNAME)

## Key Files
- `app.py` — All Flask routes and business logic
- `models.py` — Database layer (dual SQLite/PostgreSQL support via `query()` helper)
- `seed.py` — Demo data: 9 Berlin shops, 10 customers with visit history
- `templates/` — Jinja2 HTML templates
- `static/css/style.css` — Global stylesheet
- `requirements.txt` — Python dependencies
- `Procfile` — Railway deployment command (gunicorn)

## Database
- PostgreSQL in production (Railway), SQLite locally
- `query()` function auto-converts `?` to `%s` for PostgreSQL
- `init_db()` creates tables + runs ALTER TABLE migrations for new columns
- Always handle both string dates (SQLite) and datetime objects (PostgreSQL) in templates using `|fdate` and `|fdatetime` filters

## Important Patterns
- **Never use `value[:10]` on dates in templates** — use `value|fdate` filter (handles both str and datetime)
- **GROUP BY must list all non-aggregated columns** for PostgreSQL compatibility
- **Wrap DB queries in try/except** with sensible fallbacks — production DB may have missing columns
- **Auto-seed:** if merchants table is empty on startup, seed.py runs automatically
- Font: system Apple font stack (-apple-system, SF Pro Display)
- Icons: inline SVG (no emoji, no icon libraries)

## Current Pricing Model
- **Starter:** Free (50 customers, basic features)
- **Growth:** €29/month (500 customers, AI churn detection, WhatsApp)
- **Pro:** €79/month (unlimited, 5 locations, API access)

## Market Focus
- **City:** Berlin (Kreuzberg, Neukölln, Mitte, Prenzlauer Berg, Friedrichshain)
- **ICP:** Independent F&B owner, 100-500 weekly customers, 1-15 employees
- **Top competitor:** Embargo (London, building similar AI retention for hospitality)

## Git Workflow
- Push to `main` triggers Railway auto-deploy
- GitHub repo: romainbxt/LY-MVP
- Collaborators: Alexi8exi, Zelenitsas
