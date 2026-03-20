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
    create_reward_rule, update_merchant_location, create_promotion, query
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

    # Add location to demo shop
    update_merchant_location(mid, 'Oranienstraße 42, 10999 Berlin', 52.5024, 13.4215,
                             'Cozy Italian-style cafe with the best espresso in Kreuzberg')

    # Create additional demo shops across Europe
    extra_shops = [
        ('Pierre Dupont', 'Boulangerie Maison', 'boulangerie@demo.com', 'boul1234',
         '15 Rue du Faubourg Saint-Antoine, 75011 Paris', 48.8530, 2.3735,
         'Artisan bakery since 1987. Fresh bread, pastries & coffee.'),
        ('Thomas Weber', 'Das Kaffeehaus', 'kaffee@demo.com', 'kaff1234',
         'Maximilianstraße 22, 80539 Munich', 48.1405, 11.5808,
         'Viennese-style coffeehouse in the heart of Munich.'),
        ('Sofia van der Berg', 'The Green Cup', 'greencup@demo.com', 'grnc1234',
         'Prinsengracht 88, 1015 Amsterdam', 52.3676, 4.8830,
         'Organic specialty coffee & plant-based treats.'),
        ('Marco Bianchi', 'Pasta Fresca', 'pasta@demo.com', 'past1234',
         'Bergmannstraße 12, 10961 Berlin', 52.4891, 13.3923,
         'Handmade pasta & Italian espresso bar.'),
        ('Anna Lindqvist', 'Nordic Brew', 'nordic@demo.com', 'nord1234',
         'Torsgatan 31, 113 38 Stockholm', 59.3415, 18.0489,
         'Scandinavian roastery & minimalist cafe.'),
        ('Marcel Moreau', 'Chez Marcel', 'marcel@demo.com', 'chez1234',
         '8 Place du Marché, 69002 Lyon', 45.7640, 4.8357,
         'Traditional French bistro & patisserie.'),
        ('Elena Garcia', 'Café Sol', 'sol@demo.com', 'csol1234',
         'Calle de Fuencarral 45, 28004 Madrid', 40.4260, -3.7013,
         'Sunny terrace cafe with Spanish pastries & cold brew.'),
        ('Liam O\'Brien', 'The Copper Kettle', 'copper@demo.com', 'copp1234',
         '23 Temple Bar, Dublin 2', 53.3456, -6.2644,
         'Traditional Irish cafe with homemade scones & specialty tea.'),
    ]

    for name, shop, email, code, addr, lat, lng, desc in extra_shops:
        try:
            create_merchant(name, shop, email, generate_password_hash('demo123'), code)
            m2 = get_merchant_by_email(email)
            if m2:
                update_merchant_location(m2['id'], addr, lat, lng, desc)
                # Add a few products
                for p in ['Espresso', 'Cappuccino', 'Croissant']:
                    create_product(m2['id'], p, round(random.uniform(2.5, 5.5), 2))
                print(f'  Created shop: {shop} ({addr[:30]}...)')
        except Exception:
            pass

    # Add a demo promotion
    create_promotion(mid, 'Monday Special', '2-for-1 cappuccinos every Monday 8-10am!')

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
