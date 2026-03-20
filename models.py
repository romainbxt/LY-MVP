import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'ly.db')


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
    conn.close()


def get_merchant_by_email(email):
    conn = get_db()
    merchant = conn.execute('SELECT * FROM merchants WHERE email = ?', (email,)).fetchone()
    conn.close()
    return merchant


def get_merchant_by_id(merchant_id):
    conn = get_db()
    merchant = conn.execute('SELECT * FROM merchants WHERE id = ?', (merchant_id,)).fetchone()
    conn.close()
    return merchant


def get_merchant_by_shop_code(shop_code):
    conn = get_db()
    merchant = conn.execute('SELECT * FROM merchants WHERE shop_code = ?', (shop_code,)).fetchone()
    conn.close()
    return merchant


def create_merchant(name, shop_name, email, password_hash, shop_code):
    conn = get_db()
    conn.execute(
        'INSERT INTO merchants (name, shop_name, email, password_hash, shop_code) VALUES (?, ?, ?, ?, ?)',
        (name, shop_name, email, password_hash, shop_code)
    )
    conn.commit()
    conn.close()


def get_customer_by_token(qr_token):
    conn = get_db()
    customer = conn.execute('SELECT * FROM customers WHERE qr_token = ?', (qr_token,)).fetchone()
    conn.close()
    return customer


def get_customer_by_phone(phone, merchant_id):
    conn = get_db()
    customer = conn.execute(
        'SELECT * FROM customers WHERE phone = ? AND merchant_id = ?', (phone, merchant_id)
    ).fetchone()
    conn.close()
    return customer


def create_customer(first_name, phone, qr_token, merchant_id):
    conn = get_db()
    conn.execute(
        'INSERT INTO customers (first_name, phone, qr_token, merchant_id) VALUES (?, ?, ?, ?)',
        (first_name, phone, qr_token, merchant_id)
    )
    conn.commit()
    conn.close()


def log_visit(customer_id, merchant_id):
    conn = get_db()
    conn.execute(
        'INSERT INTO visits (customer_id, merchant_id) VALUES (?, ?)',
        (customer_id, merchant_id)
    )
    conn.commit()
    conn.close()


def get_customers_for_merchant(merchant_id):
    conn = get_db()
    customers = conn.execute('''
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
    return customers


def get_visit_history(customer_id):
    conn = get_db()
    visits = conn.execute(
        'SELECT * FROM visits WHERE customer_id = ? ORDER BY visited_at DESC',
        (customer_id,)
    ).fetchall()
    conn.close()
    return visits


def detect_churn_risk(merchant_id):
    """
    Simple churn detection: if a customer's time since last visit
    exceeds 2x their average interval between visits, they are at risk.
    Minimum 3 visits required to calculate.
    """
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
                'avg_interval_days': avg_days
            })

    conn.close()
    return sorted(at_risk, key=lambda x: x['days_absent'], reverse=True)
