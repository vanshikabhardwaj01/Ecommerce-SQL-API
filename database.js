const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(dbPath);

// Set a timeout so SQLite waits for the database lock instead of failing instantly on concurrent requests
db.configure('busyTimeout', 5000);

function initDB() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON');

            // 1. Users Table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 2. Products Table
            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // 3. Orders Table
            db.run(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    status TEXT DEFAULT 'completed',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

            // 4. Order Items (Many-to-Many relationship)
            db.run(`
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL CHECK (quantity > 0),
                    price_at_purchase DECIMAL(10, 2) NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            `, (err) => {
                if (err) reject(err);
                else seedDB().then(resolve).catch(reject);
            });
        });
    });
}

function seedDB() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (err) return reject(err);
            if (row.count === 0) {
                console.log("🌱 Seeding database with mock data...");
                const insertUser = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
                insertUser.run("John Doe", "john@example.com");
                insertUser.run("Jane Smith", "jane@example.com");
                insertUser.finalize();

                const insertProduct = db.prepare("INSERT INTO products (name, price, stock_quantity) VALUES (?, ?, ?)");
                // The critical item with only 1 in stock for concurrency testing
                insertProduct.run("Limited Edition Sneaker", 250.00, 1);
                insertProduct.run("Mechanical Keyboard", 120.00, 50);
                insertProduct.run("Wireless Mouse", 45.00, 100);
                insertProduct.finalize(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

// Ensure init happens
initDB().then(() => console.log("✅ Database tables and schemas verified.")).catch(console.error);

module.exports = db;
