const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Database setup
const dbPath = path.join(__dirname, '../database/food_delivery.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
const schemaPath = path.join(__dirname, '../database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema, (err) => {
  if (err) {
    console.error('Error initializing database:', err);
  } else {
    console.log('Database schema initialized successfully');
    
    // Load seed data
    const seedPath = path.join(__dirname, '../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf8');
      db.exec(seed, (seedErr) => {
        if (seedErr) {
          console.error('Error loading seed data:', seedErr);
        } else {
          console.log('Seed data loaded successfully');
        }
      });
    }
  }
});

// Routes

// Get all restaurants
app.get('/api/restaurants', (req, res) => {
  db.all('SELECT * FROM restaurants', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get menu items for a restaurant
app.get('/api/restaurants/:id/menu', (req, res) => {
  const restaurantId = req.params.id;
  db.all('SELECT * FROM menu_items WHERE restaurant_id = ?', [restaurantId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get user orders
app.get('/api/users/:id/orders', (req, res) => {
  const userId = req.params.id;
  db.all(`
    SELECT o.*, r.name as restaurant_name, a.address_line, a.city
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    JOIN addresses a ON o.delivery_address_id = a.id
    WHERE o.customer_id = ?
    ORDER BY o.order_time DESC
  `, [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Place an order
app.post('/api/orders', (req, res) => {
  const { customer_id, restaurant_id, items, delivery_address_id, notes } = req.body;
  
  // Calculate total price
  let totalPrice = 0;
  const orderItems = [];
  
  // First, get prices for items
  const itemIds = items.map(item => item.id);
  const placeholders = itemIds.map(() => '?').join(',');
  db.all(`SELECT id, price FROM menu_items WHERE id IN (${placeholders})`, itemIds, (err, menuItems) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const priceMap = {};
    menuItems.forEach(item => {
      priceMap[item.id] = item.price;
    });
    
    items.forEach(item => {
      const price = priceMap[item.id];
      totalPrice += price * item.quantity;
      orderItems.push({
        menu_item_id: item.id,
        quantity: item.quantity,
        price: price
      });
    });
    
    // Insert order
    db.run(`
      INSERT INTO orders (customer_id, restaurant_id, total_price, delivery_address_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [customer_id, restaurant_id, totalPrice, delivery_address_id, notes], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const orderId = this.lastID;
      
      // Insert order items
      const stmt = db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);
      
      orderItems.forEach(item => {
        stmt.run([orderId, item.menu_item_id, item.quantity, item.price]);
      });
      
      stmt.finalize();
      
      res.json({ order_id: orderId, total_price: totalPrice });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});