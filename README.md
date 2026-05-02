# E-Commerce API: Concurrency & SQL Transactions 🛒

> A RESTful Node.js Backend demonstrating advanced SQL concepts, raw queries, and database transaction locking to prevent e-commerce race conditions.

## 🌟 Features
- **Raw SQL Implementation:** No ORM used. Demonstrates deep understanding of database schema design and pure SQL execution.
- **Complex JOINs & Aggregation:** Fetches user order histories by joining 4 tables (`users`, `orders`, `order_items`, `products`) and dynamically calculating totals using `SUM()` and `GROUP_CONCAT()`.
- **Concurrent-Safe Checkout:** Uses `BEGIN IMMEDIATE TRANSACTION` locks to ensure that simultaneous checkout requests cannot oversell a product with limited inventory.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** SQLite (Relational DB)
- **Concepts:** Transactions, ACID Properties, Relational Modeling, Concurrency Control

## 🚀 Quick Start
1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/Ecommerce-SQL-API.git
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the API server:
   \`\`\`bash
   node server.js
   \`\`\`
   *Note: Starting the server for the first time will automatically run `database.js` to build the schema and seed mock data.*

## 🧪 Running the Concurrency Test
The most critical part of an e-commerce backend is handling simultaneous requests.
We have a test script that fires 10 simultaneous checkout requests to buy a product that only has **1 item in stock**.

In a separate terminal, while the server is running, execute:
\`\`\`bash
node test-concurrency.js
\`\`\`

**Expected Output:** The database lock will allow exactly 1 request to succeed and cleanly reject the other 9, preventing inventory corruption.

## 🧠 Technical Learnings
- Learned why a simple `SELECT` followed by an `UPDATE` in application code is dangerous in high-load environments (Race Conditions).
- Mastered SQL ACID properties by forcing `ROLLBACK` on multi-step insertions if any single step (like stock deduction or order creation) fails.
