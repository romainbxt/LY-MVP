import os
import uuid
import io
import base64
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode

from models import (
    init_db, create_merchant, get_merchant_by_email, get_merchant_by_id,
    get_merchant_by_shop_code, create_customer, get_customer_by_token,
    get_customer_by_phone, log_visit, get_customers_for_merchant,
    get_visit_history, detect_churn_risk
)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'ly-mvp-dev-key-change-in-prod')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


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


def generate_qr_base64(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


# ─── Auth Routes ───

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        shop_name = request.form['shop_name']
        email = request.form['email']
        password = request.form['password']

        if get_merchant_by_email(email):
            flash('Cet email est déjà utilisé.', 'error')
            return redirect(url_for('register'))

        shop_code = uuid.uuid4().hex[:8]
        password_hash = generate_password_hash(password)
        create_merchant(name, shop_name, email, password_hash, shop_code)

        merchant = get_merchant_by_email(email)
        login_user(MerchantUser(merchant))
        flash(f'Bienvenue {shop_name} ! Votre commerce est prêt.', 'success')
        return redirect(url_for('dashboard'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        merchant = get_merchant_by_email(email)

        if merchant and check_password_hash(merchant['password_hash'], password):
            login_user(MerchantUser(merchant))
            return redirect(url_for('dashboard'))
        flash('Email ou mot de passe incorrect.', 'error')

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
        qr_token = request.form.get('qr_token', '').strip()
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
def api_scan():
    data = request.get_json()
    qr_token = data.get('qr_token', '').strip()
    customer = get_customer_by_token(qr_token)

    if customer and customer['merchant_id'] == current_user.id:
        log_visit(customer['id'], current_user.id)
        visits = get_visit_history(customer['id'])
        return jsonify({
            'success': True,
            'name': customer['first_name'],
            'visit_count': len(visits)
        })
    return jsonify({'success': False, 'error': 'Client non reconnu'}), 404


# ─── Customer Routes ───

@app.route('/join/<shop_code>', methods=['GET', 'POST'])
def join(shop_code):
    merchant = get_merchant_by_shop_code(shop_code)
    if not merchant:
        return "Commerce introuvable", 404

    if request.method == 'POST':
        first_name = request.form['first_name']
        phone = request.form['phone']

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

        return redirect(url_for('my_card', token=qr_token))

    return render_template('join.html', shop_name=merchant['shop_name'])


@app.route('/card/<token>')
def my_card(token):
    customer = get_customer_by_token(token)
    if not customer:
        return "Carte introuvable", 404

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
    app.run(debug=True, port=5000)
