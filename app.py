import os
import uuid
import re
import io
import base64
import logging
from urllib.parse import quote
from datetime import timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, abort
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode

from models import (
    init_db,
    create_merchant, get_merchant_by_email, get_merchant_by_id, get_merchant_by_shop_code,
    create_customer, get_customer_by_token, get_customer_by_phone, get_customer_by_id,
    log_visit, get_customers_for_merchant, get_visit_history,
    detect_churn_risk, get_tier,
    add_product, get_products, toggle_product, delete_product,
    add_reward_rule, get_reward_rules, toggle_reward_rule, delete_reward_rule,
    get_reward_progress, redeem_reward,
    get_visit_analytics, get_product_analytics, get_tier_distribution, get_upcoming_birthdays,
    create_broadcast, get_broadcasts, get_segment_contacts,
)

# ── App Config ─────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32).hex())
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)

if os.environ.get('PRODUCTION'):
    app.config['SESSION_COOKIE_SECURE'] = True

csrf = CSRFProtect(app)
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Auth ───────────────────────────────────────────────────────────────────────

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


# ── Validation helpers ─────────────────────────────────────────────────────────

def validate_email(email):
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)


def validate_phone(phone):
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    return re.match(r'^\+?[0-9]{7,15}$', cleaned)


def sanitize_string(s, max_length=100):
    return s.strip()[:max_length]


def _clean_phone(phone):
    """Strip a phone number down to digits only for wa.me links."""
    cleaned = re.sub(r'[\s\-\(\)\+]', '', phone)
    if cleaned.startswith('0'):
        cleaned = '49' + cleaned[1:]   # fallback: assume Germany
    return cleaned


def build_whatsapp_url(phone, message):
    return f"https://wa.me/{_clean_phone(phone)}?text={quote(message)}"


def build_atrisk_messages(at_risk, shop_name):
    """Attach pre-built WhatsApp URL and email draft to each at-risk customer."""
    for c in at_risk:
        wa_msg = (
            f"Hey {c['first_name']}! 👋\n"
            f"We miss you at {shop_name}! It's been {c['days_absent']} days since your last visit.\n"
            f"Come back this week — we have something special waiting for you ☕\n"
            f"See you soon!"
        )
        email_subject = f"We miss you, {c['first_name']}! ☕"
        email_body = (
            f"Hi {c['first_name']},\n\n"
            f"It's been {c['days_absent']} days since your last visit to {shop_name}, "
            f"and we'd love to see you again!\n\n"
            f"Come in this week and mention this message — we'll have a little surprise for you.\n\n"
            f"Hope to see you soon,\nThe {shop_name} team"
        )
        c['wa_url']        = build_whatsapp_url(c['phone'], wa_msg)
        c['wa_msg']        = wa_msg
        c['email_subject'] = email_subject
        c['email_body']    = email_body
    return at_risk


def build_birthday_messages(birthdays, shop_name):
    for c in birthdays:
        wa_msg = (
            f"Hey {c['first_name']}! 🎂\n"
            f"Happy Birthday from all of us at {shop_name}!\n"
            f"Come in and celebrate — your next coffee is on us 🎉☕\n"
            f"Hope you have a wonderful day!"
        )
        email_subject = f"Happy Birthday {c['first_name']}! 🎂 A gift from {shop_name}"
        email_body = (
            f"Hi {c['first_name']},\n\n"
            f"Wishing you a very happy birthday from the whole team at {shop_name}! 🎉\n\n"
            f"To celebrate your special day, your next visit is on us — just show this message.\n\n"
            f"With warm wishes,\nThe {shop_name} team"
        )
        c['wa_url']        = build_whatsapp_url(c['phone'], wa_msg)
        c['wa_msg']        = wa_msg
        c['email_subject'] = email_subject
        c['email_body']    = email_body
    return birthdays


def generate_qr_base64(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


# ── Error handlers ─────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return render_template('error.html', code=404, message="Page not found"), 404


@app.errorhandler(429)
def rate_limited(e):
    return render_template('error.html', code=429, message="Too many requests. Please try again later."), 429


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {e}")
    return render_template('error.html', code=500, message="Something went wrong. Please try again."), 500


# ── Auth routes ────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('landing.html')


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
        logger.info(f"New merchant registered: {shop_name} ({email})")
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


# ── Dashboard ──────────────────────────────────────────────────────────────────

@app.route('/dashboard')
@login_required
def dashboard():
    customers   = get_customers_for_merchant(current_user.id)
    at_risk     = build_atrisk_messages(detect_churn_risk(current_user.id), current_user.shop_name)
    birthdays   = build_birthday_messages(get_upcoming_birthdays(current_user.id), current_user.shop_name)
    broadcasts  = get_broadcasts(current_user.id)
    tier_dist   = get_tier_distribution(current_user.id)
    visit_data  = get_visit_analytics(current_user.id, days=30)
    product_data = get_product_analytics(current_user.id)
    shop_url    = request.host_url + 'join/' + current_user.shop_code
    shop_qr     = generate_qr_base64(shop_url)
    employee_url = request.host_url + 'e/' + current_user.shop_code

    total_visits = sum(c['visit_count'] for c in customers)
    max_day = max((d['count'] for d in visit_data), default=1) or 1

    return render_template('dashboard.html',
        customers=customers,
        at_risk=at_risk,
        birthdays=birthdays,
        broadcasts=broadcasts,
        tier_dist=tier_dist,
        visit_data=visit_data,
        product_data=product_data,
        shop_qr=shop_qr,
        shop_url=shop_url,
        employee_url=employee_url,
        total_visits=total_visits,
        max_day=max_day,
    )


# ── Merchant scan (logged-in) ──────────────────────────────────────────────────

@app.route('/scan', methods=['GET', 'POST'])
@login_required
def scan():
    result = None
    products = get_products(current_user.id)
    if request.method == 'POST':
        qr_token   = sanitize_string(request.form.get('qr_token', ''))
        product_id = request.form.get('product_id') or None
        redeem_id  = request.form.get('redeem_rule_id') or None

        if not re.match(r'^[a-f0-9]{32}$', qr_token):
            result = {'success': False}
        else:
            customer = get_customer_by_token(qr_token)
            if customer and customer['merchant_id'] == current_user.id:
                log_visit(customer['id'], current_user.id,
                          int(product_id) if product_id else None)
                if redeem_id:
                    redeem_reward(customer['id'], int(redeem_id), current_user.id)
                visits   = get_visit_history(customer['id'])
                progress = get_reward_progress(customer['id'], current_user.id)
                tier     = get_tier(len(visits),
                                    visits[0]['visited_at'] if visits else None)
                result = {
                    'success': True,
                    'name': customer['first_name'],
                    'visit_count': len(visits),
                    'tier': tier,
                    'progress': progress,
                }
            else:
                result = {'success': False}

    return render_template('scan.html', result=result, products=products)


@app.route('/api/scan', methods=['POST'])
@login_required
@csrf.exempt
def api_scan():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Invalid request'}), 400

    qr_token = sanitize_string(data.get('qr_token', ''))
    if not re.match(r'^[a-f0-9]{32}$', qr_token):
        return jsonify({'success': False, 'error': 'Invalid token format'}), 400

    customer = get_customer_by_token(qr_token)
    if customer and customer['merchant_id'] == current_user.id:
        log_visit(customer['id'], current_user.id, data.get('product_id'))
        visits = get_visit_history(customer['id'])
        return jsonify({'success': True, 'name': customer['first_name'],
                        'visit_count': len(visits)})
    return jsonify({'success': False, 'error': 'Customer not found'}), 404


# ── Employee scan (no login required) ─────────────────────────────────────────

@app.route('/e/<shop_code>')
def employee_scan(shop_code):
    if not re.match(r'^[a-f0-9]{8}$', shop_code):
        abort(404)
    merchant = get_merchant_by_shop_code(shop_code)
    if not merchant:
        abort(404)
    products = get_products(merchant['id'])
    return render_template('employee_scan.html',
                           merchant=merchant, products=products, result=None)


@app.route('/e/<shop_code>/scan', methods=['POST'])
@csrf.exempt
@limiter.limit("120 per hour")
def employee_scan_submit(shop_code):
    if not re.match(r'^[a-f0-9]{8}$', shop_code):
        abort(404)
    merchant = get_merchant_by_shop_code(shop_code)
    if not merchant:
        abort(404)

    qr_token   = sanitize_string(request.form.get('qr_token', ''))
    product_id = request.form.get('product_id') or None
    redeem_id  = request.form.get('redeem_rule_id') or None

    products = get_products(merchant['id'])

    if not re.match(r'^[a-f0-9]{32}$', qr_token):
        result = {'success': False, 'error': 'Invalid QR code.'}
        return render_template('employee_scan.html',
                               merchant=merchant, products=products, result=result)

    customer = get_customer_by_token(qr_token)
    if customer and customer['merchant_id'] == merchant['id']:
        log_visit(customer['id'], merchant['id'],
                  int(product_id) if product_id else None)
        if redeem_id:
            redeem_reward(customer['id'], int(redeem_id), merchant['id'])

        visits   = get_visit_history(customer['id'])
        progress = get_reward_progress(customer['id'], merchant['id'])
        tier     = get_tier(len(visits), visits[0]['visited_at'] if visits else None)
        result = {
            'success': True,
            'name': customer['first_name'],
            'visit_count': len(visits),
            'tier': tier,
            'progress': progress,
        }
    else:
        result = {'success': False, 'error': 'This QR code is not valid for this shop.'}

    return render_template('employee_scan.html',
                           merchant=merchant, products=products, result=result)


# ── Settings (products + reward rules) ────────────────────────────────────────

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'add_product':
            name     = sanitize_string(request.form.get('product_name', ''))
            category = sanitize_string(request.form.get('product_category', 'other'))
            if name:
                add_product(current_user.id, name, category)
                flash(f'Product "{name}" added.', 'success')

        elif action == 'delete_product':
            delete_product(int(request.form.get('product_id')), current_user.id)
            flash('Product removed.', 'success')

        elif action == 'toggle_product':
            toggle_product(int(request.form.get('product_id')), current_user.id)

        elif action == 'add_rule':
            rule_name   = sanitize_string(request.form.get('rule_name', ''))
            visits_req  = int(request.form.get('visits_required', 10))
            reward_desc = sanitize_string(request.form.get('reward_description', ''), 200)
            product_id  = request.form.get('rule_product_id') or None
            if rule_name and reward_desc and visits_req > 0:
                add_reward_rule(current_user.id, rule_name, visits_req, reward_desc,
                                int(product_id) if product_id else None)
                flash(f'Reward rule "{rule_name}" created.', 'success')

        elif action == 'delete_rule':
            delete_reward_rule(int(request.form.get('rule_id')), current_user.id)
            flash('Reward rule removed.', 'success')

        elif action == 'toggle_rule':
            toggle_reward_rule(int(request.form.get('rule_id')), current_user.id)

        return redirect(url_for('settings'))

    products = get_products(current_user.id, active_only=False)
    rules    = get_reward_rules(current_user.id, active_only=False)
    return render_template('settings.html', products=products, rules=rules)


# ── Broadcasts ─────────────────────────────────────────────────────────────────

@app.route('/broadcast', methods=['POST'])
@login_required
def broadcast():
    title   = sanitize_string(request.form.get('title', ''))
    body    = sanitize_string(request.form.get('body', ''), 500)
    segment = request.form.get('segment', 'all')

    if title and body:
        create_broadcast(current_user.id, title, body, segment)
        flash('Message saved. Export contacts below to send via WhatsApp or SMS.', 'success')
    else:
        flash('Title and message body are required.', 'error')

    return redirect(url_for('dashboard') + '#messaging')


@app.route('/broadcast/contacts/<segment>')
@login_required
def broadcast_contacts(segment):
    contacts = get_segment_contacts(current_user.id, segment)
    lines = ['Name,Phone']
    for c in contacts:
        lines.append(f"{c['first_name']},{c['phone']}")
    csv = '\n'.join(lines)
    from flask import Response
    return Response(csv, mimetype='text/csv',
                    headers={'Content-Disposition': f'attachment; filename=contacts_{segment}.csv'})


# ── Customer profile ───────────────────────────────────────────────────────────

@app.route('/customer/<int:customer_id>')
@login_required
def customer_profile(customer_id):
    customer = get_customer_by_id(customer_id)
    if not customer or customer['merchant_id'] != current_user.id:
        abort(404)
    visits   = get_visit_history(customer_id)
    progress = get_reward_progress(customer_id, current_user.id)
    tier     = get_tier(len(visits), visits[0]['visited_at'] if visits else None)
    qr_img   = generate_qr_base64(customer['qr_token'])
    return render_template('customer_profile.html',
                           customer=customer, visits=visits,
                           progress=progress, tier=tier, qr_img=qr_img)


# ── Customer-facing routes ─────────────────────────────────────────────────────

@app.route('/join/<shop_code>', methods=['GET', 'POST'])
@limiter.limit("20 per hour", methods=["POST"])
def join(shop_code):
    if not re.match(r'^[a-f0-9]{8}$', shop_code):
        abort(404)
    merchant = get_merchant_by_shop_code(shop_code)
    if not merchant:
        abort(404)

    if request.method == 'POST':
        first_name = sanitize_string(request.form.get('first_name', ''))
        phone      = sanitize_string(request.form.get('phone', ''), max_length=20)
        birthday   = request.form.get('birthday', '').strip() or None

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
            logger.info(f"New customer '{first_name}' joined '{merchant['shop_name']}'")

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
    visits   = get_visit_history(customer['id'])
    progress = get_reward_progress(customer['id'], customer['merchant_id'])
    tier     = get_tier(len(visits), visits[0]['visited_at'] if visits else None)
    qr_img   = generate_qr_base64(token)
    return render_template('card.html',
                           customer=customer, merchant=merchant,
                           visits=visits, progress=progress,
                           tier=tier, qr_img=qr_img, token=token)


if __name__ == '__main__':
    init_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'true').lower() == 'true', port=5000)
