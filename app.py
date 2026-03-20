import os
import uuid
import re
import io
import base64
import logging
import urllib.parse
from datetime import timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, abort
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode

from models import (
    init_db, create_merchant, get_merchant_by_email, get_merchant_by_id,
    get_merchant_by_shop_code, create_customer, get_customer_by_token,
    get_customer_by_phone, get_customer_by_id, log_visit, get_customers_for_merchant,
    get_visit_history, get_visit_count, detect_churn_risk, get_upcoming_birthdays,
    get_products, create_product, toggle_product,
    get_reward_rules, create_reward_rule, toggle_reward_rule, check_rewards,
    get_customer_tier, get_tier_distribution, get_visit_trend, get_top_products,
    log_message, get_messages, query,
    get_all_shops, update_merchant_location, get_shops_for_phone,
    create_promotion, get_active_promotions
)

# ─── Init DB at import time (needed for production) ───
init_db()

# Auto-seed demo data if DB is empty (first deploy)
try:
    _check = query('SELECT COUNT(*) as c FROM merchants', fetchone=True)
    if _check and _check['c'] == 0:
        from seed import seed
        seed()
except Exception:
    pass

# ─── App Config ───

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32).hex())

# Jinja filter to format dates (handles both string and datetime objects)
@app.template_filter('fdate')
def format_date(value):
    if value is None:
        return ''
    if isinstance(value, str):
        return value[:10]
    try:
        return value.strftime('%Y-%m-%d')
    except Exception:
        return str(value)[:10]

@app.template_filter('fdatetime')
def format_datetime(value):
    if value is None:
        return ''
    if isinstance(value, str):
        return value[:16]
    try:
        return value.strftime('%Y-%m-%d %H:%M')
    except Exception:
        return str(value)[:16]
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)

if os.environ.get('PRODUCTION'):
    app.config['SESSION_COOKIE_SECURE'] = True

csrf = CSRFProtect(app)
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour"])
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'


class MerchantUser(UserMixin):
    def __init__(self, merchant):
        self.id = merchant['id']
        self.name = merchant['name']
        self.shop_name = merchant['shop_name']
        self.email = merchant['email']
        self.shop_code = merchant['shop_code']


@login_manager.user_loader
def load_user(user_id):
    merchant = get_merchant_by_id(int(user_id))
    if merchant:
        return MerchantUser(merchant)
    return None


# ─── Helpers ───

def validate_email(email):
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)

def validate_phone(phone):
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    return re.match(r'^\+?[0-9]{7,15}$', cleaned)

def sanitize_string(s, max_length=100):
    return s.strip()[:max_length]

def generate_qr_base64(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def whatsapp_url(phone, message):
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    return f"https://wa.me/{cleaned}?text={urllib.parse.quote(message)}"


# ─── Error Handlers ───

@app.errorhandler(404)
def not_found(e):
    return render_template('error.html', code=404, message="Page not found"), 404

@app.errorhandler(429)
def rate_limited(e):
    return render_template('error.html', code=429, message="Too many requests."), 429

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {e}")
    return render_template('error.html', code=500, message="Something went wrong."), 500


# ─── Landing & Auth ───

@app.route('/')
def index():
    return render_template('landing_react.html')

@app.route('/api/waitlist', methods=['POST'])
@limiter.limit("10 per hour")
@csrf.exempt
def api_waitlist():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'detail': 'Email is required'}), 400
    email = data['email'].strip().lower()
    name = data.get('name', '').strip()
    try:
        query('INSERT INTO waitlist (email, name) VALUES (?, ?)', (email, name), commit=True)
        result = query('SELECT COUNT(*) as c FROM waitlist', fetchone=True)
        return jsonify({'success': True, 'message': "You're on the list!", 'position': result['c']})
    except Exception:
        return jsonify({'detail': 'This email is already on the waitlist.'}), 409

@app.route('/register', methods=['GET', 'POST'])
@limiter.limit("10 per hour", methods=["POST"])
def register():
    if request.method == 'POST':
        name = sanitize_string(request.form.get('name', ''))
        shop_name = sanitize_string(request.form.get('shop_name', ''))
        email = sanitize_string(request.form.get('email', '')).lower()
        password = request.form.get('password', '')

        if not name or not shop_name:
            flash('Name and shop name are required.', 'error')
            return redirect(url_for('register'))
        if not validate_email(email):
            flash('Please enter a valid email address.', 'error')
            return redirect(url_for('register'))
        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'error')
            return redirect(url_for('register'))
        if get_merchant_by_email(email):
            flash('This email is already in use.', 'error')
            return redirect(url_for('register'))

        shop_code = uuid.uuid4().hex[:8]
        create_merchant(name, shop_name, email, generate_password_hash(password), shop_code)
        merchant = get_merchant_by_email(email)
        login_user(MerchantUser(merchant))
        flash(f'Welcome {shop_name}! Your shop is ready.', 'success')
        return redirect(url_for('dashboard'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("15 per hour", methods=["POST"])
def login():
    if request.method == 'POST':
        email = sanitize_string(request.form.get('email', '')).lower()
        password = request.form.get('password', '')
        merchant = get_merchant_by_email(email)
        if merchant and check_password_hash(merchant['password_hash'], password):
            login_user(MerchantUser(merchant))
            return redirect(url_for('dashboard'))
        flash('Invalid email or password.', 'error')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ─── Dashboard ───

@app.route('/dashboard')
@login_required
def dashboard():
    try:
        customers_raw = get_customers_for_merchant(current_user.id)
        customer_list = []
        for c in (customers_raw or []):
            try:
                c_dict = dict(c)
                c_dict['tier'] = get_customer_tier(c['id'])
                customer_list.append(c_dict)
            except Exception:
                customer_list.append(dict(c))
    except Exception as e:
        logger.error(f"Dashboard customers error: {e}")
        customer_list = []

    try:
        at_risk = detect_churn_risk(current_user.id)
    except Exception as e:
        logger.error(f"Dashboard churn error: {e}")
        at_risk = []

    try:
        birthdays = get_upcoming_birthdays(current_user.id)
    except Exception as e:
        logger.error(f"Dashboard birthdays error: {e}")
        birthdays = []

    try:
        tier_dist = get_tier_distribution(current_user.id)
    except Exception:
        tier_dist = {'Bronze': 0, 'Silver': 0, 'Gold': 0, 'Platinum': 0}

    try:
        visit_trend = get_visit_trend(current_user.id)
    except Exception:
        visit_trend = []

    try:
        top_products = get_top_products(current_user.id)
    except Exception:
        top_products = []

    shop_url = request.host_url + 'join/' + current_user.shop_code
    shop_qr = generate_qr_base64(shop_url)
    employee_url = request.host_url + 'e/' + current_user.shop_code

    return render_template('dashboard.html',
                           customers=customer_list,
                           at_risk=at_risk,
                           birthdays=birthdays,
                           tier_dist=tier_dist,
                           visit_trend=visit_trend,
                           top_products=top_products,
                           shop_qr=shop_qr,
                           shop_url=shop_url,
                           employee_url=employee_url)


# ─── Customer Profile ───

@app.route('/customer/<int:customer_id>')
@login_required
def customer_profile(customer_id):
    customer = get_customer_by_id(customer_id)
    if not customer or customer['merchant_id'] != current_user.id:
        abort(404)

    try:
        visits = get_visit_history(customer_id)
    except Exception:
        visits = []
    try:
        tier = get_customer_tier(customer_id)
    except Exception:
        tier = 'Bronze'
    try:
        visit_count = get_visit_count(customer_id)
    except Exception:
        visit_count = len(visits) if visits else 0
    try:
        rewards = check_rewards(customer_id, current_user.id)
    except Exception:
        rewards = []
    try:
        rules = get_reward_rules(current_user.id)
    except Exception:
        rules = []

    reward_progress = []
    for rule in (rules or []):
        try:
            if not rule['active']:
                continue
            n = rule['every_n_visits']
            progress = visit_count % n if n > 0 else 0
            reward_progress.append({
                'name': rule['name'],
                'reward': rule['reward_description'],
                'current': progress,
                'target': n,
                'percent': int((progress / n) * 100) if n > 0 else 0
            })
        except Exception:
            continue

    return render_template('customer_profile.html',
                           customer=customer, visits=visits, tier=tier,
                           visit_count=visit_count, rewards=rewards,
                           reward_progress=reward_progress)


# ─── Scan (Owner) ───

@app.route('/scan', methods=['GET', 'POST'])
@login_required
def scan():
    products = get_products(current_user.id)
    result = None
    if request.method == 'POST':
        qr_token = sanitize_string(request.form.get('qr_token', ''))
        product_id = request.form.get('product_id')
        product_id = int(product_id) if product_id else None

        if not re.match(r'^[a-f0-9]{32}$', qr_token):
            result = {'success': False}
        else:
            customer = get_customer_by_token(qr_token)
            if customer and customer['merchant_id'] == current_user.id:
                log_visit(customer['id'], current_user.id, product_id)
                visits = get_visit_history(customer['id'])
                earned = check_rewards(customer['id'], current_user.id)
                result = {
                    'success': True,
                    'name': customer['first_name'],
                    'visit_count': len(visits),
                    'tier': get_customer_tier(customer['id']),
                    'rewards': earned
                }
            else:
                result = {'success': False}

    return render_template('scan.html', result=result, products=products)


# ─── Employee Scan (No login) ───

@app.route('/e/<shop_code>', methods=['GET', 'POST'])
def employee_scan(shop_code):
    merchant = get_merchant_by_shop_code(shop_code)
    if not merchant:
        abort(404)

    products = get_products(merchant['id'])
    result = None

    if request.method == 'POST':
        qr_token = sanitize_string(request.form.get('qr_token', ''))
        product_id = request.form.get('product_id')
        product_id = int(product_id) if product_id else None

        if re.match(r'^[a-f0-9]{32}$', qr_token):
            customer = get_customer_by_token(qr_token)
            if customer and customer['merchant_id'] == merchant['id']:
                log_visit(customer['id'], merchant['id'], product_id)
                visits = get_visit_history(customer['id'])
                earned = check_rewards(customer['id'], merchant['id'])
                result = {
                    'success': True,
                    'name': customer['first_name'],
                    'visit_count': len(visits),
                    'tier': get_customer_tier(customer['id']),
                    'rewards': earned
                }
            else:
                result = {'success': False}
        else:
            result = {'success': False}

    return render_template('employee_scan.html',
                           merchant=merchant, result=result, products=products)


# ─── Messaging ───

@app.route('/messages')
@login_required
def messages_page():
    at_risk = detect_churn_risk(current_user.id)
    birthdays = get_upcoming_birthdays(current_user.id)
    sent_messages = get_messages(current_user.id)
    return render_template('messages.html',
                           at_risk=at_risk, birthdays=birthdays,
                           sent_messages=sent_messages)

@app.route('/send_whatsapp/<int:customer_id>', methods=['POST'])
@login_required
def send_whatsapp(customer_id):
    customer = get_customer_by_id(customer_id)
    if not customer or customer['merchant_id'] != current_user.id:
        abort(404)

    message = request.form.get('message', '')
    if not message:
        flash('Message cannot be empty.', 'error')
        return redirect(url_for('messages_page'))

    log_message(current_user.id, customer_id, 'whatsapp', message)
    wa_link = whatsapp_url(customer['phone'], message)
    return redirect(wa_link)


# ─── Settings ───

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'add_product':
            name = sanitize_string(request.form.get('product_name', ''))
            price = float(request.form.get('product_price', 0) or 0)
            if name:
                create_product(current_user.id, name, price)
                flash(f'Product "{name}" added.', 'success')

        elif action == 'toggle_product':
            pid = int(request.form.get('product_id', 0))
            active = request.form.get('active') == '1'
            toggle_product(pid, active)

        elif action == 'add_rule':
            name = sanitize_string(request.form.get('rule_name', ''))
            every_n = int(request.form.get('every_n_visits', 10) or 10)
            reward = sanitize_string(request.form.get('reward_description', ''))
            if name and reward:
                create_reward_rule(current_user.id, name, every_n, reward)
                flash(f'Reward rule "{name}" added.', 'success')

        elif action == 'toggle_rule':
            rid = int(request.form.get('rule_id', 0))
            active = request.form.get('active') == '1'
            toggle_reward_rule(rid, active)

        return redirect(url_for('settings'))

    products = get_products(current_user.id)
    rules = get_reward_rules(current_user.id)
    return render_template('settings.html', products=products, rules=rules)


# ─── Analytics API (for charts) ───

@app.route('/api/analytics')
@login_required
@csrf.exempt
def api_analytics():
    trend = get_visit_trend(current_user.id)
    top = get_top_products(current_user.id)
    tier = get_tier_distribution(current_user.id)
    return jsonify({
        'visit_trend': [dict(r) for r in (trend or [])],
        'top_products': [dict(r) for r in (top or [])],
        'tier_distribution': tier
    })


# ─── Customer Join (QR flow) ───

@app.route('/join/<shop_code>', methods=['GET', 'POST'])
@limiter.limit("20 per hour", methods=["POST"])
def join(shop_code):
    if not re.match(r'^[a-z0-9]{8}$', shop_code):
        abort(404)
    merchant = get_merchant_by_shop_code(shop_code)
    if not merchant:
        abort(404)

    if request.method == 'POST':
        first_name = sanitize_string(request.form.get('first_name', ''))
        phone = sanitize_string(request.form.get('phone', ''), max_length=20)
        birthday = request.form.get('birthday', '').strip() or None

        if not first_name:
            flash('First name is required.', 'error')
            return redirect(url_for('join', shop_code=shop_code))
        if not validate_phone(phone):
            flash('Please enter a valid phone number.', 'error')
            return redirect(url_for('join', shop_code=shop_code))

        existing = get_customer_by_phone(phone, merchant['id'])
        if existing:
            qr_token = existing['qr_token']
        else:
            qr_token = uuid.uuid4().hex
            create_customer(first_name, phone, qr_token, merchant['id'], birthday)
            log_visit(get_customer_by_token(qr_token)['id'], merchant['id'])

        return redirect(url_for('my_card', token=qr_token))

    return render_template('join.html', shop_name=merchant['shop_name'])

@app.route('/card/<token>')
def my_card(token):
    if not re.match(r'^[a-f0-9]{32}$', token):
        abort(404)
    customer = get_customer_by_token(token)
    if not customer:
        abort(404)

    merchant = get_merchant_by_id(customer['merchant_id'])
    visits = get_visit_history(customer['id'])
    tier = get_customer_tier(customer['id'])
    qr_img = generate_qr_base64(token)
    rewards = check_rewards(customer['id'], merchant['id'])

    return render_template('card.html',
                           customer=customer, merchant=merchant,
                           visits=visits, qr_img=qr_img, token=token,
                           tier=tier, rewards=rewards)


# ─── Simulation Mode ───

@app.route('/simulate')
def simulate():
    """Quick link to set up demo data and log in."""
    try:
        from seed import seed
        seed()
    except Exception as e:
        logger.error(f"Seed error: {e}")
    merchant = get_merchant_by_email('demo@lyloyal.com')
    if merchant:
        login_user(MerchantUser(merchant))
        flash('Simulation mode active! You are logged in as Café Francesca with 10 demo customers.', 'success')
        return redirect(url_for('dashboard'))
    flash('Could not create demo data.', 'error')
    return redirect(url_for('login'))


# ─── Pricing Page ───

@app.route('/pricing')
def pricing():
    return render_template('pricing.html')


# ─── Partners Page (Public) ───

@app.route('/partners')
def partners():
    all_merchants = query('SELECT id, shop_name, shop_code FROM merchants ORDER BY created_at DESC', fetchall=True)
    # Try to get address/description (columns may not exist on older DBs)
    try:
        all_merchants = query('SELECT id, shop_name, shop_code, address, description FROM merchants ORDER BY created_at DESC', fetchall=True)
    except Exception:
        pass
    shops = []
    total_customers = 0
    total_visits = 0
    for m in (all_merchants or []):
        c_count = query('SELECT COUNT(*) as c FROM customers WHERE merchant_id = ?', (m['id'],), fetchone=True)
        v_count = query('SELECT COUNT(*) as c FROM visits WHERE merchant_id = ?', (m['id'],), fetchone=True)
        nc = c_count['c'] if c_count else 0
        nv = v_count['c'] if v_count else 0
        total_customers += nc
        total_visits += nv
        shops.append({
            'shop_name': m['shop_name'],
            'shop_code': m['shop_code'],
            'address': m.get('address') if hasattr(m, 'get') else (m['address'] if 'address' in m.keys() else None),
            'description': m.get('description') if hasattr(m, 'get') else (m['description'] if 'description' in m.keys() else None),
            'customer_count': nc
        })
    return render_template('partners.html', shops=shops,
                           total_customers=total_customers, total_visits=total_visits)


# ─── Shop Map (Public) ───

@app.route('/map')
def shop_map():
    try:
        shops_raw = get_all_shops()
        shops = [dict(s) for s in (shops_raw or [])]
    except Exception:
        shops = []
    try:
        promotions_raw = get_active_promotions()
        promotions = [dict(p) for p in (promotions_raw or [])]
    except Exception:
        promotions = []
    return render_template('map.html', shops=shops, promotions=promotions)

@app.route('/api/shops')
@csrf.exempt
def api_shops():
    shops = get_all_shops()
    return jsonify([dict(s) for s in (shops or [])])


# ─── Multi-Shop Customer View ───

@app.route('/my-shops', methods=['GET', 'POST'])
def my_shops():
    shops = None
    phone = ''
    if request.method == 'POST':
        phone = sanitize_string(request.form.get('phone', ''), max_length=20)
        if phone:
            shops = get_shops_for_phone(phone)
    return render_template('my_shops.html', shops=shops, phone=phone)


# ─── Merchant Location Settings ───

@app.route('/settings/location', methods=['POST'])
@login_required
def update_location():
    address = sanitize_string(request.form.get('address', ''), max_length=200)
    lat = request.form.get('latitude', '')
    lng = request.form.get('longitude', '')
    description = sanitize_string(request.form.get('description', ''), max_length=300)

    try:
        lat = float(lat) if lat else None
        lng = float(lng) if lng else None
    except ValueError:
        lat, lng = None, None

    update_merchant_location(current_user.id, address, lat, lng, description)
    flash('Location updated.', 'success')
    return redirect(url_for('settings'))


# ─── Promotion Broadcast ───

@app.route('/promote', methods=['POST'])
@login_required
def promote():
    title = sanitize_string(request.form.get('promo_title', ''))
    content = sanitize_string(request.form.get('promo_content', ''), max_length=300)

    if not title or not content:
        flash('Title and content are required.', 'error')
        return redirect(url_for('messages_page'))

    create_promotion(current_user.id, title, content)

    # Send to all customers via WhatsApp links
    customers = get_customers_for_merchant(current_user.id)
    flash(f'Promotion "{title}" published! {len(customers or [])} customers can be reached.', 'success')
    return redirect(url_for('messages_page'))


# ─── Chatbot API (Gemini Flash) ───

CHATBOT_SYSTEM_PROMPTS = {
    'visitor': """You are the LY assistant, a smart loyalty platform for independent food & beverage businesses (cafes, restaurants, bakeries).
You speak English, concisely and friendly.
What LY does:
- Merchants create a free account and get a unique QR code for their shop.
- Customers scan the QR code on each visit to earn points. No app download needed.
- The merchant gets a dashboard with: visit tracking, at-risk customer detection (churn), birthday alerts, WhatsApp messaging, reward tiers (Bronze, Silver, Gold, Platinum).
- 3 pricing plans: Starter (free, 50 customers), Growth (29 EUR/month, 500 customers, AI churn detection), Pro (79 EUR/month, unlimited + API).
- LY is based in Berlin and targets independent businesses in Europe.
Help the visitor understand the platform and encourage them to sign up. Only answer questions related to LY.""",

    'merchant': """You are the LY assistant. You are talking to a merchant logged into their dashboard.
You speak English, concisely and practically.
Help them with:
- Dashboard: overview of customers, visits, at-risk customers, birthdays.
- Scan: customers show their QR code, the merchant scans to record a visit.
- Rewards: configurable in Settings > Reward Rules (e.g. "1 free coffee every 10 visits").
- Tiers: Bronze, Silver, Gold, Platinum — based on visit frequency and count.
- Churn: LY automatically detects customers who stop coming based on their usual frequency.
- Messages: send WhatsApp to at-risk customers, birthdays, promotions.
- Products: manageable in Settings.
- Employees: share the employee scan link (no login required).
Only answer questions related to LY and shop management.""",

    'customer': """You are the LY assistant. You are talking to a customer who has a loyalty card.
You speak English, concisely and friendly.
Help them with:
- Loyalty card: accessible via the link received, contains a QR code to show at the counter.
- Visits: each scan = 1 visit recorded. Visits accumulate toward tiers.
- Tiers: Bronze, Silver, Gold, Platinum. Each tier can unlock rewards.
- Rewards: set by the merchant (e.g. free coffee every 10 visits).
- Multi-shop: customers can have cards at multiple shops, findable by phone number on /my-shops.
- Tip: bookmark the card page for quick access.
Only answer questions related to LY and the loyalty card."""
}

@app.route('/api/chat', methods=['POST'])
@csrf.exempt
@limiter.limit("30 per minute")
def api_chat():
    data = request.get_json(silent=True)
    if not data or not data.get('message'):
        return jsonify({'reply': "I didn't understand your message."}), 400

    user_message = data['message'][:500]
    user_role = data.get('role', 'visitor')
    chat_history = data.get('history', [])

    system_prompt = CHATBOT_SYSTEM_PROMPTS.get(user_role, CHATBOT_SYSTEM_PROMPTS['visitor'])

    contents = [system_prompt + "\n\n"]
    for msg in chat_history[-10:]:
        prefix = "User: " if msg.get('role') == 'user' else "Assistant: "
        contents.append(prefix + msg.get('content', '') + "\n")
    contents.append("User: " + user_message)

    try:
        from google import genai
        api_key = os.environ.get('GEMINI_API_KEY', '')
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="".join(contents),
        )
        reply = response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        reply = "Sorry, I'm not available right now. Please try again in a moment."

    return jsonify({'reply': reply})


if __name__ == '__main__':
    init_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'true').lower() == 'true', port=5000)
