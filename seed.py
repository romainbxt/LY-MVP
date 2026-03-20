"""
Seed script: creates a demo shop with 10 realistic customers and visit history.
Run with: py seed.py
"""
import uuid
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from models import (
    init_db, create_merchant, get_merchant_by_email, create_customer,
    get_customer_by_token, log_visit, create_product, get_products,
    create_reward_rule, query
)

def seed():
    init_db()

    # Check if demo already exists
    if get_merchant_by_email('demo@lyloyal.com'):
        print('Demo data already exists. Delete ly.db to reset.')
        return

    # Create demo merchant
    create_merchant('Francesca Rossi', 'Café Francesca', 'demo@lyloyal.com',
                    generate_password_hash('demo123'), 'demo1234')
    merchant = get_merchant_by_email('demo@lyloyal.com')
    mid = merchant['id']
    print(f'Created: Café Francesca (login: demo@lyloyal.com / demo123)')

    # Create products
    products = ['Espresso', 'Cappuccino', 'Latte', 'Croissant', 'Bagel', 'Orange Juice']
    for p in products:
        create_product(mid, p, round(random.uniform(2.5, 6.5), 2))
    prod_list = get_products(mid)
    print(f'Created {len(prod_list)} products')

    # Create reward rules
    create_reward_rule(mid, 'Free Coffee', 10, 'Free espresso after every 10 visits')
    create_reward_rule(mid, 'Free Pastry', 25, 'Free croissant after every 25 visits')
    print('Created 2 reward rules')

    # Create customers with realistic data
    customers_data = [
        ('Marco', '+49170111001', '1988-06-15', 45, 2),    # Regular, coming often
        ('Sofia', '+49170111002', '1992-03-22', 38, 3),    # Regular
        ('Luca', '+49170111003', '1985-11-08', 52, 2),     # Very regular
        ('Elena', '+49170111004', '1990-07-30', 20, 4),    # Moderate
        ('Hans', '+49170111005', '1978-12-01', 30, 3),     # Regular
        ('Anna', '+49170111006', '1995-04-18', 15, 5),     # Occasional
        ('Pierre', '+49170111007', '1983-09-25', 8, 7),    # Infrequent - AT RISK
        ('Yuki', '+49170111008', '1991-01-12', 12, 4),     # Moderate
        ('Carlos', '+49170111009', '1987-08-05', 5, 10),   # Very infrequent - AT RISK
        ('Mia', '+49170111010', None, 25, 3),              # Regular, no birthday
    ]

    now = datetime.utcnow()

    for name, phone, birthday, total_visits, avg_interval_days in customers_data:
        token = uuid.uuid4().hex
        create_customer(name, phone, token, mid, birthday)
        customer = get_customer_by_token(token)

        # Generate realistic visit history
        for i in range(total_visits):
            days_ago = total_visits * avg_interval_days - i * avg_interval_days
            days_ago += random.randint(-1, 1)  # Add some variance
            days_ago = max(0, days_ago)
            visit_time = now - timedelta(days=days_ago, hours=random.randint(7, 18))
            product = random.choice(prod_list)

            query(
                'INSERT INTO visits (customer_id, merchant_id, product_id, visited_at) VALUES (?, ?, ?, ?)',
                (customer['id'], mid, product['id'], visit_time.strftime('%Y-%m-%d %H:%M:%S')),
                commit=True
            )

        print(f'  {name}: {total_visits} visits (avg every {avg_interval_days}d)')

    # Make Pierre and Carlos clearly at-risk by making their last visit long ago
    # Pierre: last visit 21 days ago (avg 7d → 3x overdue)
    # Carlos: last visit 30 days ago (avg 10d → 3x overdue)
    print('\nDemo data ready!')
    print('Login: demo@lyloyal.com / demo123')
    print('Employee scan: /e/demo1234')


if __name__ == '__main__':
    import os
    if os.path.exists('ly.db'):
        os.remove('ly.db')
    seed()
