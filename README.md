# LY — Smart loyalty for independent businesses

LY is an AI-powered customer retention platform for independent cafes, restaurants, and bakeries. It detects when regular customers are drifting away and helps business owners act before they're gone.

**Live:** [lyloyal.com](https://lyloyal.com)

## The Problem

Independent F&B businesses lose customers silently. By the time the owner notices a regular is gone, it's too late. Enterprise retention tools (HubSpot, Salesforce) cost thousands and require marketing teams. Stamp cards treat every customer the same.

## The Solution

LY gives business owners the eyes to see what's happening:
- **QR-based loyalty** — customers scan to sign up, no app download
- **AI churn detection** — alerts when a regular's visit frequency drops
- **WhatsApp messaging** — reach at-risk customers in one click
- **Loyalty tiers** — Bronze to Platinum, calculated automatically
- **Configurable rewards** — each shop sets its own rules

## Tech Stack

- **Backend:** Python / Flask
- **Database:** SQLite (local) / PostgreSQL (production)
- **Frontend:** HTML / CSS / Jinja2 templates
- **Hosting:** Railway
- **Map:** Leaflet.js + OpenStreetMap

## Quick Start

```bash
# Clone
git clone https://github.com/romainbxt/LY-MVP.git
cd LY-MVP

# Install dependencies
pip install -r requirements.txt

# Seed demo data (9 Berlin shops, 10 customers)
python seed.py

# Run
python app.py
```

Open http://localhost:5000

**Demo login:** demo@lyloyal.com / demo123

## Key Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Marketing page |
| Pricing | `/pricing` | Free / Growth (€29) / Pro (€79) |
| Partners | `/partners` | All LY partner shops |
| Map | `/map` | Interactive map of shops in Berlin |
| Dashboard | `/dashboard` | Merchant view: customers, alerts, analytics |
| Scan | `/scan` | QR code scanner for owner |
| Employee Scan | `/e/<code>` | No-login scanner for staff |
| Messages | `/messages` | WhatsApp messaging + promotions |
| Settings | `/settings` | Products, rewards, location |
| Customer Card | `/card/<token>` | Customer's loyalty card |
| Simulation | `/simulate` | Creates demo data and logs in |

## Team

- Romain Bouxirot
- Alexander Berner
- Athanasios Manios
- Georgios Zelenitsas

Built at the VALI Bootcamp, ESMT Berlin — March 2026.
