from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__,
            static_folder=os.path.join(os.path.dirname(__file__), '../frontend'),
            static_url_path='')
CORS(app)

DATABASE = os.path.join(os.path.dirname(__file__), '../database/food_delivery.db')

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if os.path.exists(DATABASE):
        return

    with app.app_context():
        db = get_db()
        with open(os.path.join(os.path.dirname(__file__), '../database/schema.sql'), 'r') as f:
            db.executescript(f.read())

        seed_path = os.path.join(os.path.dirname(__file__), '../database/seed.sql')
        if os.path.exists(seed_path):
            with open(seed_path, 'r') as f:
                db.executescript(f.read())

        db.commit()

@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    db = get_db()
    restaurants = db.execute('SELECT * FROM restaurants').fetchall()
    return jsonify([dict(row) for row in restaurants])

@app.route('/api/restaurants/<int:restaurant_id>/menu', methods=['GET'])
def get_menu(restaurant_id):
    db = get_db()
    menu_items = db.execute(
        'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category, name',
        (restaurant_id,)
    ).fetchall()

    items = [dict(row) for row in menu_items]
    categories = {}
    for item in items:
        category = item['category'] or 'Chef Specials'
        categories.setdefault(category, []).append(item)

    return jsonify([{'category': category, 'items': items} for category, items in categories.items()])

@app.route('/api/users/<int:user_id>/orders', methods=['GET'])
def get_user_orders(user_id):
    db = get_db()
    orders = db.execute('''
        SELECT o.*, r.name as restaurant_name, a.address_line, a.city
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        JOIN addresses a ON o.delivery_address_id = a.id
        WHERE o.customer_id = ?
        ORDER BY o.order_time DESC
    ''', (user_id,)).fetchall()
    return jsonify([dict(row) for row in orders])

@app.route('/api/users/<int:user_id>/addresses', methods=['GET'])
def get_user_addresses(user_id):
    db = get_db()
    addresses = db.execute('SELECT * FROM addresses WHERE user_id = ?', (user_id,)).fetchall()
    return jsonify([dict(row) for row in addresses])

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    customer_id = data['customer_id']
    restaurant_id = data['restaurant_id']
    items = data['items']
    delivery_address_id = data['delivery_address_id']
    notes = data.get('notes', '')
    
    db = get_db()
    
    # Calculate total price
    total_price = 0
    order_items = []
    
    for item in items:
        menu_item = db.execute('SELECT price FROM menu_items WHERE id = ?', (item['id'],)).fetchone()
        if menu_item:
            price = menu_item['price']
            quantity = item['quantity']
            total_price += price * quantity
            order_items.append((item['id'], quantity, price))
    
    # Insert order
    cursor = db.execute('''
        INSERT INTO orders (customer_id, restaurant_id, total_price, delivery_address_id, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', (customer_id, restaurant_id, total_price, delivery_address_id, notes))
    
    order_id = cursor.lastrowid
    
    # Insert order items
    for item_id, quantity, price in order_items:
        db.execute('''
            INSERT INTO order_items (order_id, menu_item_id, quantity, price)
            VALUES (?, ?, ?, ?)
        ''', (order_id, item_id, quantity, price))
    
    db.commit()
    
    return jsonify({'order_id': order_id, 'total_price': total_price})

@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=3000)