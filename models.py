"""
Database layer for LY.

How it works:
- In LOCAL development: uses SQLite (a simple file on your computer called ly.db)
- In PRODUCTION (Railway): uses PostgreSQL (a real database server)
- The switch is automatic: if the environment variable DATABASE_URL exists,
  it uses PostgreSQL. Otherwise, it falls back to SQLite.
"""

import sqlite3
import os
from datetime import datetime, timezone

# ─── Database Connection ───
# DATABASE_URL is automatically set by Railway when you add a PostgreSQL database.
# It looks like: postgresql://user:password@host:port/dbname

DATABASE_URL = os.environ.get('DATABASE_URL')
USE_POSTGRES = DATABASE_URL is not None

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras

DB_PATH = os.path.join(os.path.dirname(__file__), 'ly.db')


def get_db():
    """
    Returns a database connection.
    - PostgreSQL in production (from DATABASE_URL)
    - SQLite in local development (ly.db file)
    """
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


def query(sql, params=(), fetchone=False, fetchall=False, commit=False):
    """
    Helper to run a SQL query and handle both SQLite and PostgreSQL.
    - SQLite uses ? for parameters
    - PostgreSQL uses %s for parameters
    This function converts ? to %s automatically when using PostgreSQL.
    """
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
    """
    Creates the database tables if they don't exist.
    Called once when the app starts.
    """
    conn = get_db()
    cur = conn.cursor()

    if USE_POSTGRES:
        # PostgreSQL syntax: SERIAL instead of INTEGER PRIMARY KEY AUTOINCREMENT
        cur.execute('''
            CREATE TABLE IF NOT EXISTS merchants (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                shop_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                shop_code TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                first_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                qr_token TEXT UNIQUE NOT NULL,
                merchant_id INTEGER NOT NULL REFERENCES merchants(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(phone, merchant_id)
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS visits (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                merchant_id INTEGER NOT NULL REFERENCES merchants(id),
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # SQLite syntax
        cur.executescript('''
            CREATE TABLE IF NOT EXISTS merchants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                shop_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                shop_code TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                qr_token TEXT UNIQUE NOT NULL,
                merchant_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (merchant_id) REFERENCES merchants(id),
                UNIQUE(phone, merchant_id)
            );
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                merchant_id INTEGER NOT NULL,
                visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (merchant_id) REFERENCES merchants(id)
            );
        ''')

    conn.commit()
    cur.close()
    conn.close()


# ─── Merchant Queries ───

def get_merchant_by_email(email):
    return query('SELECT * FROM merchants WHERE email = ?', (email,), fetchone=True)


def get_merchant_by_id(merchant_id):
    return query('SELECT * FROM merchants WHERE id = ?', (merchant_id,), fetchone=True)


def get_merchant_by_shop_code(shop_code):
    return query('SELECT * FROM merchants WHERE shop_code = ?', (shop_code,), fetchone=True)


def create_merchant(name, shop_name, email, password_hash, shop_code):
    query(
        'INSERT INTO merchants (name, shop_name, email, password_hash, shop_code) VALUES (?, ?, ?, ?, ?)',
        (name, shop_name, email, password_hash, shop_code),
        commit=True
    )


# ─── Customer Queries ───

def get_customer_by_token(qr_token):
    return query('SELECT * FROM customers WHERE qr_token = ?', (qr_token,), fetchone=True)


def get_customer_by_phone(phone, merchant_id):
    return query(
        'SELECT * FROM customers WHERE phone = ? AND merchant_id = ?',
        (phone, merchant_id),
        fetchone=True
    )


def create_customer(first_name, phone, qr_token, merchant_id):
    query(
        'INSERT INTO customers (first_name, phone, qr_token, merchant_id) VALUES (?, ?, ?, ?)',
        (first_name, phone, qr_token, merchant_id),
        commit=True
    )


# ─── Visit Queries ───

def log_visit(customer_id, merchant_id):
    query(
        'INSERT INTO visits (customer_id, merchant_id) VALUES (?, ?)',
        (customer_id, merchant_id),
        commit=True
    )


def get_customers_for_merchant(merchant_id):
    return query('''
        SELECT c.*,
               COUNT(v.id) as visit_count,
               MAX(v.visited_at) as last_visit
        FROM customers c
        LEFT JOIN visits v ON v.customer_id = c.id
        WHERE c.merchant_id = ?
        GROUP BY c.id, c.first_name, c.phone, c.qr_token, c.merchant_id, c.created_at
        ORDER BY last_visit DESC
    ''', (merchant_id,), fetchall=True)


def get_visit_history(customer_id):
    return query(
        'SELECT * FROM visits WHERE customer_id = ? ORDER BY visited_at DESC',
        (customer_id,),
        fetchall=True
    )


# ─── Churn Detection ───

def detect_churn_risk(merchant_id):
    """
    Simple churn detection algorithm:
    - Look at customers with 3+ visits
    - Calculate their average interval between visits
    - If they haven't been back in 2x their average interval → AT RISK

    Example: Marco visits every 3 days on average.
    If he hasn't been back in 7 days → alert!
    """
    rows = query('''
        SELECT c.id, c.first_name, c.phone, c.qr_token,
               COUNT(v.id) as visit_count,
               MIN(v.visited_at) as first_visit,
               MAX(v.visited_at) as last_visit
        FROM customers c
        JOIN visits v ON v.customer_id = c.id
        WHERE c.merchant_id = ?
        GROUP BY c.id, c.first_name, c.phone, c.qr_token
        HAVING COUNT(v.id) >= 3
    ''', (merchant_id,), fetchall=True)

    at_risk = []
    now = datetime.now(timezone.utc)

    for c in rows:
        first_visit = c['first_visit']
        last_visit = c['last_visit']
        count = c['visit_count']

        # Handle both string (SQLite) and datetime (PostgreSQL) formats
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
            at_risk.append({
                'id': c['id'],
                'first_name': c['first_name'],
                'phone': c['phone'],
                'visit_count': count,
                'last_visit': str(c['last_visit']),
                'days_absent': days_absent,
                'avg_interval_days': avg_days
            })

    return sorted(at_risk, key=lambda x: x['days_absent'], reverse=True)
