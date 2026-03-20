import pytest
import os
import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# Use a test database
os.environ['LY_TEST'] = '1'

from app import app
from models import (
    init_db, get_db, create_merchant, get_merchant_by_email,
    get_merchant_by_shop_code, create_customer, get_customer_by_token,
    get_customer_by_phone, log_visit, get_customers_for_merchant,
    get_visit_history, detect_churn_risk, DB_PATH
)


@pytest.fixture(autouse=True)
def setup_db():
    """Fresh database for each test."""
    test_db = DB_PATH.replace('.db', '_test.db')
    import models
    models.DB_PATH = test_db

    if os.path.exists(test_db):
        os.remove(test_db)
    init_db()
    yield
    if os.path.exists(test_db):
        os.remove(test_db)


@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    with app.test_client() as client:
        yield client


@pytest.fixture
def merchant():
    """Create a test merchant and return its data."""
    create_merchant(
        'Francesca', 'Cafe Test', 'test@test.com',
        generate_password_hash('password123'), 'abcd1234'
    )
    return get_merchant_by_email('test@test.com')


@pytest.fixture
def logged_in_client(client, merchant):
    """A client logged in as the test merchant."""
    client.post('/login', data={
        'email': 'test@test.com',
        'password': 'password123'
    })
    return client


# ─── Model Tests ───

class TestModels:
    def test_create_merchant(self, merchant):
        assert merchant is not None
        assert merchant['shop_name'] == 'Cafe Test'
        assert merchant['email'] == 'test@test.com'
        assert merchant['shop_code'] == 'abcd1234'

    def test_get_merchant_by_shop_code(self, merchant):
        found = get_merchant_by_shop_code('abcd1234')
        assert found is not None
        assert found['id'] == merchant['id']

    def test_create_customer(self, merchant):
        token = uuid.uuid4().hex
        create_customer('Marco', '+491701234', token, merchant['id'])
        customer = get_customer_by_token(token)
        assert customer is not None
        assert customer['first_name'] == 'Marco'

    def test_duplicate_phone_same_merchant(self, merchant):
        token1 = uuid.uuid4().hex
        create_customer('Marco', '+491701234', token1, merchant['id'])
        found = get_customer_by_phone('+491701234', merchant['id'])
        assert found is not None
        assert found['first_name'] == 'Marco'

    def test_log_visit(self, merchant):
        token = uuid.uuid4().hex
        create_customer('Marco', '+491701234', token, merchant['id'])
        customer = get_customer_by_token(token)
        log_visit(customer['id'], merchant['id'])
        log_visit(customer['id'], merchant['id'])
        visits = get_visit_history(customer['id'])
        assert len(visits) == 2

    def test_get_customers_for_merchant(self, merchant):
        for i, name in enumerate(['Marco', 'Sofia', 'Luca']):
            token = uuid.uuid4().hex
            create_customer(name, f'+4917000{i}', token, merchant['id'])
        customers = get_customers_for_merchant(merchant['id'])
        assert len(customers) == 3

    def test_churn_detection_no_risk_few_visits(self, merchant):
        """Customers with fewer than 3 visits should not be flagged."""
        token = uuid.uuid4().hex
        create_customer('Marco', '+491701234', token, merchant['id'])
        customer = get_customer_by_token(token)
        log_visit(customer['id'], merchant['id'])
        at_risk = detect_churn_risk(merchant['id'])
        assert len(at_risk) == 0


# ─── Route Tests ───

class TestAuthRoutes:
    def test_index_shows_landing(self, client):
        r = client.get('/')
        assert r.status_code == 200
        assert b'LY' in r.data

    def test_login_page_loads(self, client):
        r = client.get('/login')
        assert r.status_code == 200
        assert b'Log in' in r.data

    def test_register_page_loads(self, client):
        r = client.get('/register')
        assert r.status_code == 200
        assert b'Sign Up' in r.data

    def test_register_success(self, client):
        r = client.post('/register', data={
            'name': 'Test Owner',
            'shop_name': 'Test Cafe',
            'email': 'new@test.com',
            'password': 'password123'
        }, follow_redirects=True)
        assert r.status_code == 200
        assert b'Test Cafe' in r.data

    def test_register_duplicate_email(self, client, merchant):
        r = client.post('/register', data={
            'name': 'Test',
            'shop_name': 'Test',
            'email': 'test@test.com',
            'password': 'password123'
        }, follow_redirects=True)
        assert b'already in use' in r.data

    def test_register_invalid_email(self, client):
        r = client.post('/register', data={
            'name': 'Test',
            'shop_name': 'Test',
            'email': 'not-an-email',
            'password': 'password123'
        }, follow_redirects=True)
        assert b'valid email' in r.data

    def test_register_short_password(self, client):
        r = client.post('/register', data={
            'name': 'Test',
            'shop_name': 'Test',
            'email': 'new@test.com',
            'password': '123'
        }, follow_redirects=True)
        assert b'at least 6' in r.data

    def test_login_success(self, client, merchant):
        r = client.post('/login', data={
            'email': 'test@test.com',
            'password': 'password123'
        }, follow_redirects=True)
        assert r.status_code == 200

    def test_login_wrong_password(self, client, merchant):
        r = client.post('/login', data={
            'email': 'test@test.com',
            'password': 'wrongpassword'
        }, follow_redirects=True)
        assert b'Invalid email or password' in r.data

    def test_logout(self, logged_in_client):
        r = logged_in_client.get('/logout', follow_redirects=True)
        assert b'Log in' in r.data


class TestDashboardRoutes:
    def test_dashboard_requires_login(self, client):
        r = client.get('/dashboard', follow_redirects=False)
        assert r.status_code == 302

    def test_dashboard_loads(self, logged_in_client):
        r = logged_in_client.get('/dashboard')
        assert r.status_code == 200
        assert b'Customers' in r.data

    def test_scan_page_loads(self, logged_in_client):
        r = logged_in_client.get('/scan')
        assert r.status_code == 200
        assert b'Scan a customer' in r.data


class TestCustomerRoutes:
    def test_join_page_loads(self, client, merchant):
        r = client.get('/join/abcd1234')
        assert r.status_code == 200
        assert b'Cafe Test' in r.data

    def test_join_invalid_shop_code(self, client):
        r = client.get('/join/zzzzzzzz')
        assert r.status_code == 404

    def test_join_register_customer(self, client, merchant):
        r = client.post('/join/abcd1234', data={
            'first_name': 'Marco',
            'phone': '+491701234567'
        }, follow_redirects=True)
        assert r.status_code == 200
        assert b'Marco' in r.data

    def test_join_invalid_phone(self, client, merchant):
        r = client.post('/join/abcd1234', data={
            'first_name': 'Marco',
            'phone': 'not-a-phone'
        }, follow_redirects=True)
        assert b'valid phone' in r.data

    def test_join_existing_customer(self, client, merchant):
        client.post('/join/abcd1234', data={
            'first_name': 'Marco',
            'phone': '+491701234567'
        })
        r = client.post('/join/abcd1234', data={
            'first_name': 'Marco',
            'phone': '+491701234567'
        }, follow_redirects=True)
        assert r.status_code == 200
        assert b'Marco' in r.data

    def test_card_invalid_token(self, client):
        r = client.get('/card/invalidtoken')
        assert r.status_code == 404

    def test_scan_valid_customer(self, logged_in_client, merchant):
        token = uuid.uuid4().hex
        create_customer('Marco', '+491701234', token, merchant['id'])
        r = logged_in_client.post('/scan', data={'qr_token': token}, follow_redirects=True)
        assert b'Marco' in r.data
        assert b'Visit #' in r.data

    def test_scan_invalid_token(self, logged_in_client):
        r = logged_in_client.post('/scan', data={
            'qr_token': 'a' * 32
        }, follow_redirects=True)
        assert b'Customer not found' in r.data


class TestSecurity:
    def test_sql_injection_login(self, client, merchant):
        r = client.post('/login', data={
            'email': "' OR 1=1 --",
            'password': 'anything'
        }, follow_redirects=True)
        assert b'Invalid email or password' in r.data

    def test_xss_in_name(self, client, merchant):
        token = uuid.uuid4().hex
        create_customer('<script>alert(1)</script>', '+491701234', token, merchant['id'])
        r = client.get(f'/card/{token}')
        assert b'<script>alert(1)</script>' not in r.data

    def test_invalid_shop_code_format(self, client):
        r = client.get('/join/../../../etc/passwd')
        assert r.status_code == 404
