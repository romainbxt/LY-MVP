"""
Database layer for LY.
- LOCAL: SQLite (ly.db)
- PRODUCTION: PostgreSQL (DATABASE_URL)
"""

import sqlite3
import os
from datetime import datetime, timezone, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL')
USE_POSTGRES = DATABASE_URL is not None

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras

DB_PATH = os.path.join(os.path.dirname(__file__), 'ly.db')


def get_db():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


def query(sql, params=(), fetchone=False, fetchall=False, commit=False):
    conn = get_db()
    if USE_POSTGRES:
        sql = sql.replace('?', '%s')
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        cur = conn.cursor()
    cur.execute(sql, params)
    result = None
    if fetchone:
        result = cur.fetchone()
    elif fetchall:
        result = cur.fetchall()
    if commit:
        conn.commit()
    cur.close()
    conn.close()
    return result


def init_db():
    conn = get_db()
    cur = conn.cursor()

    if USE_POSTGRES:
        cur.execute('''CREATE TABLE IF NOT EXISTS merchants (
            id SERIAL PRIMARY KEY, name TEXT NOT NULL, shop_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
            shop_code TEXT UNIQUE NOT NULL,
            address TEXT, latitude REAL, longitude REAL, description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY, first_name TEXT NOT NULL, phone TEXT NOT NULL,
            birthday TEXT, qr_token TEXT UNIQUE NOT NULL,
            merchant_id INTEGER NOT NULL REFERENCES merchants(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(phone, merchant_id)
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY, merchant_id INTEGER NOT NULL REFERENCES merchants(id),
            name TEXT NOT NULL, price REAL DEFAULT 0, active BOOLEAN DEFAULT TRUE
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS visits (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES customers(id),
            merchant_id INTEGER NOT NULL REFERENCES merchants(id),
            product_id INTEGER REFERENCES products(id),
            visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS reward_rules (
            id SERIAL PRIMARY KEY, merchant_id INTEGER NOT NULL REFERENCES merchants(id),
            name TEXT NOT NULL, every_n_visits INTEGER NOT NULL DEFAULT 10,
            reward_description TEXT NOT NULL, active BOOLEAN DEFAULT TRUE
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY, merchant_id INTEGER NOT NULL REFERENCES merchants(id),
            customer_id INTEGER REFERENCES customers(id),
            message_type TEXT NOT NULL, content TEXT NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        cur.execute('''CREATE TABLE IF NOT EXISTS waitlist (
            id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT,
            signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
    else:
        cur.executescript('''
            CREATE TABLE IF NOT EXISTS merchants (
                id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
                shop_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL, shop_code TEXT UNIQUE NOT NULL,
                address TEXT, latitude REAL, longitude REAL, description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL,
                phone TEXT NOT NULL, birthday TEXT, qr_token TEXT UNIQUE NOT NULL,
                merchant_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (merchant_id) REFERENCES merchants(id),
                UNIQUE(phone, merchant_id)
            );
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_id INTEGER NOT NULL,
                name TEXT NOT NULL, price REAL DEFAULT 0, active BOOLEAN DEFAULT 1,
                FOREIGN KEY (merchant_id) REFERENCES merchants(id)
            );
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL, merchant_id INTEGER NOT NULL,
                product_id INTEGER,
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (merchant_id) REFERENCES merchants(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
            CREATE TABLE IF NOT EXISTS reward_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_id INTEGER NOT NULL,
                name TEXT NOT NULL, every_n_visits INTEGER NOT NULL DEFAULT 10,
                reward_description TEXT NOT NULL, active BOOLEAN DEFAULT 1,
                FOREIGN KEY (merchant_id) REFERENCES merchants(id)
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_id INTEGER NOT NULL, customer_id INTEGER,
                message_type TEXT NOT NULL, content TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (merchant_id) REFERENCES merchants(id),
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            );
            CREATE TABLE IF NOT EXISTS waitlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL, name TEXT,
                signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')

    conn.commit()

    # Migration: add columns that may not exist on older databases
    migrations = [
        "ALTER TABLE merchants ADD COLUMN address TEXT",
        "ALTER TABLE merchants ADD COLUMN latitude REAL",
        "ALTER TABLE merchants ADD COLUMN longitude REAL",
        "ALTER TABLE merchants ADD COLUMN description TEXT",
        "ALTER TABLE customers ADD COLUMN birthday TEXT",
    ]
    for sql in migrations:
        try:
            cur.execute(sql)
            conn.commit()
        except Exception:
            conn.rollback()

    cur.close()
    conn.close()


# ─── Merchant ───

def get_merchant_by_email(email):
    return query('SELECT * FROM merchants WHERE email = ?', (email,), fetchone=True)

def get_merchant_by_id(merchant_id):
    return query('SELECT * FROM merchants WHERE id = ?', (merchant_id,), fetchone=True)

def get_merchant_by_shop_code(shop_code):
    return query('SELECT * FROM merchants WHERE shop_code = ?', (shop_code,), fetchone=True)

def create_merchant(name, shop_name, email, password_hash, shop_code):
    query('INSERT INTO merchants (name, shop_name, email, password_hash, shop_code) VALUES (?, ?, ?, ?, ?)',
          (name, shop_name, email, password_hash, shop_code), commit=True)


# ─── Customer ───

def get_customer_by_token(qr_token):
    return query('SELECT * FROM customers WHERE qr_token = ?', (qr_token,), fetchone=True)

def get_customer_by_phone(phone, merchant_id):
    return query('SELECT * FROM customers WHERE phone = ? AND merchant_id = ?',
                 (phone, merchant_id), fetchone=True)

def get_customer_by_id(customer_id):
    return query('SELECT * FROM customers WHERE id = ?', (customer_id,), fetchone=True)

def create_customer(first_name, phone, qr_token, merchant_id, birthday=None):
    query('INSERT INTO customers (first_name, phone, qr_token, merchant_id, birthday) VALUES (?, ?, ?, ?, ?)',
          (first_name, phone, qr_token, merchant_id, birthday), commit=True)

def get_customers_for_merchant(merchant_id):
    return query('''
        SELECT c.*, COUNT(v.id) as visit_count, MAX(v.visited_at) as last_visit
        FROM customers c LEFT JOIN visits v ON v.customer_id = c.id
        WHERE c.merchant_id = ?
        GROUP BY c.id, c.first_name, c.phone, c.birthday, c.qr_token, c.merchant_id, c.created_at
        ORDER BY last_visit DESC
    ''', (merchant_id,), fetchall=True)


# ─── Products ───

def get_products(merchant_id):
    return query('SELECT * FROM products WHERE merchant_id = ? ORDER BY name', (merchant_id,), fetchall=True)

def create_product(merchant_id, name, price=0):
    query('INSERT INTO products (merchant_id, name, price) VALUES (?, ?, ?)',
          (merchant_id, name, price), commit=True)

def toggle_product(product_id, active):
    query('UPDATE products SET active = ? WHERE id = ?', (active, product_id), commit=True)


# ─── Visits ───

def log_visit(customer_id, merchant_id, product_id=None):
    query('INSERT INTO visits (customer_id, merchant_id, product_id) VALUES (?, ?, ?)',
          (customer_id, merchant_id, product_id), commit=True)

def get_visit_history(customer_id):
    return query('''
        SELECT v.*, p.name as product_name
        FROM visits v LEFT JOIN products p ON v.product_id = p.id
        WHERE v.customer_id = ? ORDER BY v.visited_at DESC
    ''', (customer_id,), fetchall=True)

def get_visit_count(customer_id):
    result = query('SELECT COUNT(*) as c FROM visits WHERE customer_id = ?', (customer_id,), fetchone=True)
    return result['c'] if result else 0


# ─── Reward Rules ───

def get_reward_rules(merchant_id):
    return query('SELECT * FROM reward_rules WHERE merchant_id = ?', (merchant_id,), fetchall=True)

def create_reward_rule(merchant_id, name, every_n_visits, reward_description):
    query('INSERT INTO reward_rules (merchant_id, name, every_n_visits, reward_description) VALUES (?, ?, ?, ?)',
          (merchant_id, name, every_n_visits, reward_description), commit=True)

def toggle_reward_rule(rule_id, active):
    query('UPDATE reward_rules SET active = ? WHERE id = ?', (active, rule_id), commit=True)

def check_rewards(customer_id, merchant_id):
    """Check if customer has earned any rewards."""
    visit_count = get_visit_count(customer_id)
    rules = query('SELECT * FROM reward_rules WHERE merchant_id = ? AND active = 1', (merchant_id,), fetchall=True)
    earned = []
    for rule in (rules or []):
        n = rule['every_n_visits']
        if n > 0 and visit_count > 0 and visit_count % n == 0:
            earned.append({'rule': rule['name'], 'reward': rule['reward_description'], 'visits': visit_count})
    return earned


# ─── Messages ───

def log_message(merchant_id, customer_id, message_type, content):
    query('INSERT INTO messages (merchant_id, customer_id, message_type, content) VALUES (?, ?, ?, ?)',
          (merchant_id, customer_id, message_type, content), commit=True)

def get_messages(merchant_id):
    return query('''
        SELECT m.*, c.first_name as customer_name
        FROM messages m LEFT JOIN customers c ON m.customer_id = c.id
        WHERE m.merchant_id = ? ORDER BY m.sent_at DESC LIMIT 50
    ''', (merchant_id,), fetchall=True)


# ─── Loyalty Tiers ───

def calculate_tier(visit_count, days_since_first_visit):
    """
    Tier algorithm based on engagement score.
    Score = visits * frequency_factor
    """
    if visit_count < 2 or days_since_first_visit < 1:
        return 'Bronze'

    visits_per_week = (visit_count / days_since_first_visit) * 7
    score = visit_count * (1 + visits_per_week)

    if score >= 100:
        return 'Platinum'
    elif score >= 50:
        return 'Gold'
    elif score >= 20:
        return 'Silver'
    return 'Bronze'


def get_customer_tier(customer_id):
    row = query('''
        SELECT COUNT(v.id) as visit_count, MIN(v.visited_at) as first_visit
        FROM visits v WHERE v.customer_id = ?
    ''', (customer_id,), fetchone=True)

    if not row or not row['first_visit']:
        return 'Bronze'

    first = row['first_visit']
    if isinstance(first, str):
        first = datetime.fromisoformat(first).replace(tzinfo=timezone.utc)
    elif first.tzinfo is None:
        first = first.replace(tzinfo=timezone.utc)

    days = max(1, (datetime.now(timezone.utc) - first).days)
    return calculate_tier(row['visit_count'], days)


def get_tier_distribution(merchant_id):
    customers = get_customers_for_merchant(merchant_id)
    dist = {'Bronze': 0, 'Silver': 0, 'Gold': 0, 'Platinum': 0}
    for c in (customers or []):
        tier = get_customer_tier(c['id'])
        dist[tier] = dist.get(tier, 0) + 1
    return dist


# ─── Analytics ───

def get_visit_trend(merchant_id, days=30):
    """Daily visit counts for the last N days."""
    return query('''
        SELECT DATE(visited_at) as day, COUNT(*) as count
        FROM visits WHERE merchant_id = ?
        AND visited_at >= datetime('now', ?)
        GROUP BY DATE(visited_at) ORDER BY day
    ''', (merchant_id, f'-{days} days'), fetchall=True)


def get_top_products(merchant_id, limit=5):
    return query('''
        SELECT p.name, COUNT(v.id) as count
        FROM visits v JOIN products p ON v.product_id = p.id
        WHERE v.merchant_id = ?
        GROUP BY p.name ORDER BY count DESC LIMIT ?
    ''', (merchant_id, limit), fetchall=True)


# ─── Churn Detection ───

def detect_churn_risk(merchant_id):
    rows = query('''
        SELECT c.id, c.first_name, c.phone, c.qr_token, c.birthday,
               COUNT(v.id) as visit_count,
               MIN(v.visited_at) as first_visit,
               MAX(v.visited_at) as last_visit
        FROM customers c JOIN visits v ON v.customer_id = c.id
        WHERE c.merchant_id = ?
        GROUP BY c.id, c.first_name, c.phone, c.qr_token, c.birthday
        HAVING COUNT(v.id) >= 3
    ''', (merchant_id,), fetchall=True)

    at_risk = []
    now = datetime.now(timezone.utc)

    for c in rows:
        first_visit = c['first_visit']
        last_visit = c['last_visit']
        count = c['visit_count']

        if isinstance(first_visit, str):
            first = datetime.fromisoformat(first_visit).replace(tzinfo=timezone.utc)
            last = datetime.fromisoformat(last_visit).replace(tzinfo=timezone.utc)
        else:
            first = first_visit.replace(tzinfo=timezone.utc) if first_visit.tzinfo is None else first_visit
            last = last_visit.replace(tzinfo=timezone.utc) if last_visit.tzinfo is None else last_visit

        if count < 2:
            continue

        avg_interval = (last - first).total_seconds() / (count - 1)
        time_since_last = (now - last).total_seconds()

        if avg_interval > 0 and time_since_last > avg_interval * 2:
            days_absent = int(time_since_last / 86400)
            avg_days = round(avg_interval / 86400, 1)
            tier = get_customer_tier(c['id'])
            at_risk.append({
                'id': c['id'], 'first_name': c['first_name'],
                'phone': c['phone'], 'visit_count': count,
                'last_visit': str(c['last_visit']),
                'days_absent': days_absent, 'avg_interval_days': avg_days,
                'tier': tier, 'birthday': c['birthday']
            })

    return sorted(at_risk, key=lambda x: x['days_absent'], reverse=True)


# ─── Birthday Alerts ───

def get_upcoming_birthdays(merchant_id, days_ahead=7):
    customers = get_customers_for_merchant(merchant_id)
    upcoming = []
    today = datetime.now().date()

    for c in (customers or []):
        bday = c['birthday']
        if not bday:
            continue
        try:
            bday_date = datetime.strptime(bday, '%Y-%m-%d').date()
            bday_this_year = bday_date.replace(year=today.year)
            if bday_this_year < today:
                bday_this_year = bday_this_year.replace(year=today.year + 1)
            diff = (bday_this_year - today).days
            if 0 <= diff <= days_ahead:
                upcoming.append({
                    'id': c['id'], 'first_name': c['first_name'],
                    'phone': c['phone'], 'birthday': bday,
                    'days_until': diff
                })
        except (ValueError, TypeError):
            continue

    return sorted(upcoming, key=lambda x: x['days_until'])


# ─── Shop Map ───

def get_all_shops():
    """Get all merchants with location data for the public map."""
    return query('''
        SELECT id, shop_name, shop_code, address, latitude, longitude, description
        FROM merchants WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ''', fetchall=True)


def update_merchant_location(merchant_id, address, latitude, longitude, description=None):
    query('UPDATE merchants SET address = ?, latitude = ?, longitude = ?, description = ? WHERE id = ?',
          (address, latitude, longitude, description, merchant_id), commit=True)


# ─── Multi-Shop Customer View ───

def get_shops_for_phone(phone):
    """Find all shops a customer (by phone) is registered in."""
    return query('''
        SELECT c.id as customer_id, c.first_name, c.qr_token,
               m.shop_name, m.shop_code, m.address,
               COUNT(v.id) as visit_count, MAX(v.visited_at) as last_visit
        FROM customers c
        JOIN merchants m ON c.merchant_id = m.id
        LEFT JOIN visits v ON v.customer_id = c.id
        WHERE c.phone = ?
        GROUP BY c.id, c.first_name, c.qr_token, m.shop_name, m.shop_code, m.address
        ORDER BY last_visit DESC
    ''', (phone,), fetchall=True)


# ─── Promotions ───

def create_promotion(merchant_id, title, content):
    query('INSERT INTO messages (merchant_id, message_type, content) VALUES (?, ?, ?)',
          (merchant_id, 'promotion', f'{title}|{content}'), commit=True)


def get_active_promotions():
    """Get recent promotions from all shops (for public display)."""
    return query('''
        SELECT m.shop_name, m.shop_code, msg.content, msg.sent_at
        FROM messages msg
        JOIN merchants m ON msg.merchant_id = m.id
        WHERE msg.message_type = 'promotion'
        ORDER BY msg.sent_at DESC LIMIT 20
    ''', fetchall=True)
