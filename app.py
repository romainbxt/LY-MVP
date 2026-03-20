import os
import uuid
import re
import io
import base64
import logging
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
    get_customer_by_phone, log_visit, get_customers_for_merchant,
    get_visit_history, detect_churn_risk
)

# ─── App Config ───

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32).hex())
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)

if os.environ.get('PRODUCTION'):
    app.config['SESSION_COOKIE_SECURE'] = True

# CSRF protection
csrf = CSRFProtect(app)

# Rate limiting
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour"])

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Auth ───

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


# ─── Validation Helpers ───

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


# ─── Error Handlers ───

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


# ─── Auth Routes ───

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
        password_hash = generate_password_hash(password)
        create_merchant(name, shop_name, email, password_hash, shop_code)

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
            logger.info(f"Merchant logged in: {email}")
            return redirect(url_for('dashboard'))

        logger.warning(f"Failed login attempt for: {email}")
        flash('Invalid email or password.', 'error')

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ─── Merchant Dashboard ───

@app.route('/dashboard')
@login_required
def dashboard():
    customers = get_customers_for_merchant(current_user.id)
    at_risk = detect_churn_risk(current_user.id)
    shop_url = request.host_url + 'join/' + current_user.shop_code
    shop_qr = generate_qr_base64(shop_url)

    return render_template('dashboard.html',
                           customers=customers,
                           at_risk=at_risk,
                           shop_qr=shop_qr,
                           shop_url=shop_url)


@app.route('/scan', methods=['GET', 'POST'])
@login_required
def scan():
    result = None
    if request.method == 'POST':
        qr_token = sanitize_string(request.form.get('qr_token', ''))

        if not re.match(r'^[a-f0-9]{32}$', qr_token):
            result = {'success': False}
        else:
            customer = get_customer_by_token(qr_token)

            if customer and customer['merchant_id'] == current_user.id:
                log_visit(customer['id'], current_user.id)
                visits = get_visit_history(customer['id'])
                result = {
                    'success': True,
                    'name': customer['first_name'],
                    'visit_count': len(visits)
                }
            else:
                result = {'success': False}

    return render_template('scan.html', result=result)


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
        log_visit(customer['id'], current_user.id)
        visits = get_visit_history(customer['id'])
        return jsonify({
            'success': True,
            'name': customer['first_name'],
            'visit_count': len(visits)
        })
    return jsonify({'success': False, 'error': 'Customer not found'}), 404


# ─── Customer Routes ───

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
        phone = sanitize_string(request.form.get('phone', ''), max_length=20)

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
            create_customer(first_name, phone, qr_token, merchant['id'])
            log_visit(
                get_customer_by_token(qr_token)['id'],
                merchant['id']
            )
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
    visits = get_visit_history(customer['id'])
    qr_img = generate_qr_base64(token)

    return render_template('card.html',
                           customer=customer,
                           merchant=merchant,
                           visits=visits,
                           qr_img=qr_img,
                           token=token)


if __name__ == '__main__':
    init_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'true').lower() == 'true', port=5000)
