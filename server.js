const express = require('express');
const db = require('./database');

const app = express();
app.use(express.json());

// 1. GET ALL PRODUCTS (Basic SELECT)
app.get('/products', (req, res) => {
    db.all("SELECT * FROM products WHERE stock_quantity > 0", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ products: rows });
    });
});

// 2. GET USER ORDER HISTORY (Advanced JOIN with Aggregation)
app.get('/users/:id/orders', (req, res) => {
    const userId = req.params.id;
    
    // Raw SQL proving ability to join 4 tables and calculate totals dynamically
    const query = `
        SELECT 
            o.id as order_id, 
            o.created_at,
            o.total_amount,
            COUNT(oi.id) as total_items,
            GROUP_CONCAT(p.name, ', ') as purchased_products
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ orderHistory: rows });
    });
});

// 3. CONCURRENT-SAFE CHECKOUT (SQL Transactions to prevent overselling)
app.post('/checkout', (req, res) => {
    const { userId, productId, quantity } = req.body;

    // Use IMMEDIATE transaction to lock the database and prevent race conditions
    db.serialize(() => {
        db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
            if (err) {
                return res.status(500).json({ error: "Could not start database transaction" });
            }

            // Step 1: Check stock
            db.get("SELECT price, stock_quantity FROM products WHERE id = ?", [productId], (err, product) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                if (!product) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: "Product not found" });
                }

                if (product.stock_quantity < quantity) {
                    db.run('ROLLBACK');
                    return res.status(400).json({ error: "Insufficient stock! Order rejected to prevent overselling." });
                }

                // Step 2: Deduct stock safely
                db.run("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [quantity, productId], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: "Failed to update inventory stock" });
                    }

                    // Step 3: Create Order Record
                    const totalAmount = product.price * quantity;
                    db.run("INSERT INTO orders (user_id, total_amount) VALUES (?, ?)", [userId, totalAmount], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: "Failed to generate order record" });
                        }
                        const orderId = this.lastID;

                        // Step 4: Map Order Items
                        db.run("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)", 
                            [orderId, productId, quantity, product.price], function(err) {
                            
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: "Failed to map order items" });
                            }

                            // Commit Transaction if all 4 steps succeeded perfectly
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: "Transaction commit failed" });
                                }
                                res.status(200).json({ 
                                    message: "Order placed successfully!", 
                                    orderId: orderId 
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 E-Commerce SQL Backend running on http://localhost:${PORT}`);
});
