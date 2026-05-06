import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'ly.db')

# ── Tier algorithm ─────────────────────────────────────────────────────────────
# Score = total_visits × recency_multiplier
# Recency multiplier rewards customers who keep coming back recently.
# An inactive Gold customer can drop to Silver — visible to owner as a signal.

TIER_CONFIG = [
    {'name': 'Platinum', 'min_score': 50, 'color': '#6C47FF', 'bg': '#f0ebff', 'label': 'PLATINUM'},
    {'name': 'Gold',     'min_score': 25, 'color': '#d4a017', 'bg': '#fff8e1', 'label': 'GOLD'},
    {'name': 'Silver',   'min_score': 10, 'color': '#6b7f8e', 'bg': '#f0f4f8', 'label': 'SILVER'},
    {'name': 'Bronze',   'min_score': 3,  'color': '#a0522d', 'bg': '#fdf3ec', 'label': 'BRONZE'},
    {'name': 'New',      'min_score': 0,  'color': '#aaaaaa', 'bg': '#f5f5f5', 'label': 'NEW'},
]


def get_tier(visit_count, last_visit_str=None):
    """
    Compute tier using an engagement score:
      score = visit_count * recency_multiplier
    Recency multiplier:
      <= 7 days absent  → 1.0  (fully active)
      <= 30 days        → 0.85
      <= 90 days        → 0.65
      > 90 days         → 0.40  (drifting away)
    """
    multiplier = 1.0
    if last_visit_str:
        try:
            last = datetime.fromisoformat(last_visit_str)
            days_absent = (datetime.utcnow() - last).days
            if days_absent <= 7:
                multiplier = 1.0
            elif days_absent <= 30:
                multiplier = 0.85
            elif days_absent <= 90:
                multiplier = 0.65
            else:
                multiplier = 0.40
        except Exception:
            pass

    score = visit_count * multiplier
    for tier in TIER_CONFIG:
        if score >= tier['min_score']:
            return tier
    return TIER_CONFIG[-1]


# ── DB helpers ─────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            shop_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            shop_code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'other',
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        );

        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            qr_token TEXT UNIQUE NOT NULL,
            merchant_id INTEGER NOT NULL,
            birthday TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id),
            UNIQUE(phone, merchant_id)
        );

        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            merchant_id INTEGER NOT NULL,
            product_id INTEGER,
            visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (merchant_id) REFERENCES merchants(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS reward_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            product_id INTEGER,
            visits_required INTEGER NOT NULL DEFAULT 10,
            reward_description TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS reward_redemptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            rule_id INTEGER NOT NULL,
            merchant_id INTEGER NOT NULL,
            redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (rule_id) REFERENCES reward_rules(id)
        );

        CREATE TABLE IF NOT EXISTS broadcasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            segment TEXT DEFAULT 'all',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (merchant_id) REFERENCES merchants(id)
        );
    ''')
    conn.commit()
    _migrate(conn)
    conn.close()


def _migrate(conn):
    """Add columns to existing tables if they don't exist yet."""
    for col, definition in [
        ('birthday', 'ALTER TABLE customers ADD COLUMN birthday TEXT'),
        ('product_id', 'ALTER TABLE visits ADD COLUMN product_id INTEGER REFERENCES products(id)'),
    ]:
        try:
            conn.execute(definition)
            conn.commit()
        except Exception:
            pass


# ── Merchants ──────────────────────────────────────────────────────────────────

def create_merchant(name, shop_name, email, password_hash, shop_code):
    conn = get_db()
    conn.execute(
        'INSERT INTO merchants (name, shop_name, email, password_hash, shop_code) VALUES (?,?,?,?,?)',
        (name, shop_name, email, password_hash, shop_code)
    )
    conn.commit()
    conn.close()


def get_merchant_by_email(email):
    conn = get_db()
    r = conn.execute('SELECT * FROM merchants WHERE email=?', (email,)).fetchone()
    conn.close()
    return r


def get_merchant_by_id(merchant_id):
    conn = get_db()
    r = conn.execute('SELECT * FROM merchants WHERE id=?', (merchant_id,)).fetchone()
    conn.close()
    return r


def get_merchant_by_shop_code(shop_code):
    conn = get_db()
    r = conn.execute('SELECT * FROM merchants WHERE shop_code=?', (shop_code,)).fetchone()
    conn.close()
    return r


# ── Products ───────────────────────────────────────────────────────────────────

def add_product(merchant_id, name, category='other'):
    conn = get_db()
    conn.execute(
        'INSERT INTO products (merchant_id, name, category) VALUES (?,?,?)',
        (merchant_id, name, category)
    )
    conn.commit()
    conn.close()


def get_products(merchant_id, active_only=True):
    conn = get_db()
    q = 'SELECT * FROM products WHERE merchant_id=?'
    if active_only:
        q += ' AND is_active=1'
    q += ' ORDER BY sort_order, id'
    rows = conn.execute(q, (merchant_id,)).fetchall()
    conn.close()
    return rows


def toggle_product(product_id, merchant_id):
    conn = get_db()
    conn.execute(
        'UPDATE products SET is_active = 1 - is_active WHERE id=? AND merchant_id=?',
        (product_id, merchant_id)
    )
    conn.commit()
    conn.close()


def delete_product(product_id, merchant_id):
    conn = get_db()
    conn.execute('DELETE FROM products WHERE id=? AND merchant_id=?', (product_id, merchant_id))
    conn.commit()
    conn.close()


# ── Reward rules ───────────────────────────────────────────────────────────────

def add_reward_rule(merchant_id, name, visits_required, reward_description, product_id=None):
    conn = get_db()
    conn.execute(
        '''INSERT INTO reward_rules
           (merchant_id, name, product_id, visits_required, reward_description)
           VALUES (?,?,?,?,?)''',
        (merchant_id, name, product_id or None, visits_required, reward_description)
    )
    conn.commit()
    conn.close()


def get_reward_rules(merchant_id, active_only=True):
    conn = get_db()
    q = '''SELECT r.*, p.name as product_name
           FROM reward_rules r
           LEFT JOIN products p ON p.id = r.product_id
           WHERE r.merchant_id=?'''
    if active_only:
        q += ' AND r.is_active=1'
    rows = conn.execute(q, (merchant_id,)).fetchall()
    conn.close()
    return rows


def toggle_reward_rule(rule_id, merchant_id):
    conn = get_db()
    conn.execute(
        'UPDATE reward_rules SET is_active = 1 - is_active WHERE id=? AND merchant_id=?',
        (rule_id, merchant_id)
    )
    conn.commit()
    conn.close()


def delete_reward_rule(rule_id, merchant_id):
    conn = get_db()
    conn.execute('DELETE FROM reward_rules WHERE id=? AND merchant_id=?', (rule_id, merchant_id))
    conn.commit()
    conn.close()


def get_reward_progress(customer_id, merchant_id):
    """Return progress toward each active reward rule for a customer."""
    conn = get_db()
    rules = conn.execute(
        '''SELECT r.*, p.name as product_name
           FROM reward_rules r
           LEFT JOIN products p ON p.id = r.product_id
           WHERE r.merchant_id=? AND r.is_active=1''',
        (merchant_id,)
    ).fetchall()

    progress = []
    for rule in rules:
        last_redemption = conn.execute(
            '''SELECT redeemed_at FROM reward_redemptions
               WHERE customer_id=? AND rule_id=?
               ORDER BY redeemed_at DESC LIMIT 1''',
            (customer_id, rule['id'])
        ).fetchone()

        if last_redemption:
            if rule['product_id']:
                count = conn.execute(
                    '''SELECT COUNT(*) FROM visits
                       WHERE customer_id=? AND visited_at > ? AND product_id=?''',
                    (customer_id, last_redemption['redeemed_at'], rule['product_id'])
                ).fetchone()[0]
            else:
                count = conn.execute(
                    '''SELECT COUNT(*) FROM visits
                       WHERE customer_id=? AND visited_at > ?''',
                    (customer_id, last_redemption['redeemed_at'])
                ).fetchone()[0]
        else:
            if rule['product_id']:
                count = conn.execute(
                    'SELECT COUNT(*) FROM visits WHERE customer_id=? AND product_id=?',
                    (customer_id, rule['product_id'])
                ).fetchone()[0]
            else:
                count = conn.execute(
                    'SELECT COUNT(*) FROM visits WHERE customer_id=?',
                    (customer_id,)
                ).fetchone()[0]

        required = rule['visits_required']
        progress.append({
            'rule_id': rule['id'],
            'name': rule['name'],
            'reward_description': rule['reward_description'],
            'product_name': rule['product_name'],
            'visits_required': required,
            'visits_done': count,
            'ready': count >= required,
            'pct': min(100, round(count / required * 100)),
        })

    conn.close()
    return progress


def redeem_reward(customer_id, rule_id, merchant_id):
    conn = get_db()
    conn.execute(
        'INSERT INTO reward_redemptions (customer_id, rule_id, merchant_id) VALUES (?,?,?)',
        (customer_id, rule_id, merchant_id)
    )
    conn.commit()
    conn.close()


# ── Customers ──────────────────────────────────────────────────────────────────

def create_customer(first_name, phone, qr_token, merchant_id, birthday=None):
    conn = get_db()
    conn.execute(
        'INSERT INTO customers (first_name, phone, qr_token, merchant_id, birthday) VALUES (?,?,?,?,?)',
        (first_name, phone, qr_token, merchant_id, birthday)
    )
    conn.commit()
    conn.close()


def get_customer_by_token(qr_token):
    conn = get_db()
    r = conn.execute('SELECT * FROM customers WHERE qr_token=?', (qr_token,)).fetchone()
    conn.close()
    return r


def get_customer_by_phone(phone, merchant_id):
    conn = get_db()
    r = conn.execute(
        'SELECT * FROM customers WHERE phone=? AND merchant_id=?', (phone, merchant_id)
    ).fetchone()
    conn.close()
    return r


def get_customer_by_id(customer_id):
    conn = get_db()
    r = conn.execute('SELECT * FROM customers WHERE id=?', (customer_id,)).fetchone()
    conn.close()
    return r


def get_customers_for_merchant(merchant_id):
    conn = get_db()
    rows = conn.execute('''
        SELECT c.*,
               COUNT(v.id) as visit_count,
               MAX(v.visited_at) as last_visit
        FROM customers c
        LEFT JOIN visits v ON v.customer_id = c.id
        WHERE c.merchant_id = ?
        GROUP BY c.id
        ORDER BY last_visit DESC
    ''', (merchant_id,)).fetchall()
    conn.close()
    # Attach tier to each customer
    result = []
    for c in rows:
        d = dict(c)
        d['tier'] = get_tier(d['visit_count'] or 0, d.get('last_visit'))
        result.append(d)
    return result


# ── Visits ─────────────────────────────────────────────────────────────────────

def log_visit(customer_id, merchant_id, product_id=None):
    conn = get_db()
    conn.execute(
        'INSERT INTO visits (customer_id, merchant_id, product_id) VALUES (?,?,?)',
        (customer_id, merchant_id, product_id or None)
    )
    conn.commit()
    conn.close()


def get_visit_history(customer_id):
    conn = get_db()
    rows = conn.execute(
        '''SELECT v.*, p.name as product_name
           FROM visits v
           LEFT JOIN products p ON p.id = v.product_id
           WHERE v.customer_id=?
           ORDER BY v.visited_at DESC''',
        (customer_id,)
    ).fetchall()
    conn.close()
    return rows


# ── Churn detection ────────────────────────────────────────────────────────────

def detect_churn_risk(merchant_id):
    conn = get_db()
    customers = conn.execute('''
        SELECT c.id, c.first_name, c.phone, c.qr_token,
               COUNT(v.id) as visit_count,
               MIN(v.visited_at) as first_visit,
               MAX(v.visited_at) as last_visit
        FROM customers c
        JOIN visits v ON v.customer_id = c.id
        WHERE c.merchant_id = ?
        GROUP BY c.id
        HAVING visit_count >= 3
    ''', (merchant_id,)).fetchall()

    at_risk = []
    now = datetime.utcnow()

    for c in customers:
        first = datetime.fromisoformat(c['first_visit'])
        last = datetime.fromisoformat(c['last_visit'])
        count = c['visit_count']
        if count < 2:
            continue
        avg_interval = (last - first).total_seconds() / (count - 1)
        time_since_last = (now - last).total_seconds()
        if avg_interval > 0 and time_since_last > avg_interval * 2:
            days_absent = int(time_since_last / 86400)
            avg_days = round(avg_interval / 86400, 1)
            at_risk.append({
                'id': c['id'],
                'first_name': c['first_name'],
                'phone': c['phone'],
                'visit_count': count,
                'last_visit': c['last_visit'],
                'days_absent': days_absent,
                'avg_interval_days': avg_days,
                'tier': get_tier(count, c['last_visit']),
            })

    conn.close()
    return sorted(at_risk, key=lambda x: x['days_absent'], reverse=True)


# ── Analytics ──────────────────────────────────────────────────────────────────

def get_visit_analytics(merchant_id, days=30):
    """Visits per day for the last N days, filling gaps with 0."""
    conn = get_db()
    rows = conn.execute('''
        SELECT DATE(visited_at) as day, COUNT(*) as count
        FROM visits
        WHERE merchant_id=? AND visited_at >= datetime('now', ? || ' days')
        GROUP BY day ORDER BY day
    ''', (merchant_id, f'-{days}')).fetchall()
    conn.close()

    data = {r['day']: r['count'] for r in rows}
    today = datetime.utcnow().date()
    result = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        result.append({'day': d, 'label': d[5:], 'count': data.get(d, 0)})
    return result


def get_product_analytics(merchant_id):
    conn = get_db()
    rows = conn.execute('''
        SELECT p.name, p.category, COUNT(v.id) as count
        FROM visits v
        JOIN products p ON p.id = v.product_id
        WHERE v.merchant_id=?
        GROUP BY p.id ORDER BY count DESC
    ''', (merchant_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_tier_distribution(merchant_id):
    customers = get_customers_for_merchant(merchant_id)
    dist = {}
    for c in customers:
        name = c['tier']['name']
        dist[name] = dist.get(name, 0) + 1
    return dist


def get_upcoming_birthdays(merchant_id, days_ahead=14):
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM customers WHERE merchant_id=? AND birthday IS NOT NULL',
        (merchant_id,)
    ).fetchall()
    conn.close()

    today = datetime.utcnow().date()
    upcoming = []
    for c in rows:
        try:
            bday = datetime.strptime(c['birthday'], '%Y-%m-%d').date()
            this_year = bday.replace(year=today.year)
            if this_year < today:
                this_year = bday.replace(year=today.year + 1)
            diff = (this_year - today).days
            if 0 <= diff <= days_ahead:
                upcoming.append({**dict(c), 'days_until': diff, 'birthday_display': bday.strftime('%b %d')})
        except Exception:
            pass
    return sorted(upcoming, key=lambda x: x['days_until'])


# ── Broadcasts ─────────────────────────────────────────────────────────────────

def create_broadcast(merchant_id, title, body, segment='all'):
    conn = get_db()
    conn.execute(
        'INSERT INTO broadcasts (merchant_id, title, body, segment) VALUES (?,?,?,?)',
        (merchant_id, title, body, segment)
    )
    conn.commit()
    conn.close()


def get_broadcasts(merchant_id):
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM broadcasts WHERE merchant_id=? ORDER BY created_at DESC LIMIT 20',
        (merchant_id,)
    ).fetchall()
    conn.close()
    return rows


def get_segment_contacts(merchant_id, segment):
    """Return customer list for a given segment (for export / manual send)."""
    if segment == 'at_risk':
        return detect_churn_risk(merchant_id)
    customers = get_customers_for_merchant(merchant_id)
    if segment == 'vip':
        return [c for c in customers if c['tier']['name'] in ('Gold', 'Platinum')]
    if segment == 'new':
        return [c for c in customers if c['visit_count'] <= 2]
    return customers  # 'all'
