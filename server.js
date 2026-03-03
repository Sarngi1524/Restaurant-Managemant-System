const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(express.json());

function normalizeImagePath(src) {
    if (!src || typeof src !== "string") return src;
    const value = src.trim();
    if (!value) return value;
    if (value.startsWith("data:") || value.startsWith("blob:")) return value;
    if (value.startsWith("/")) return value;

    if (value.startsWith("http://") || value.startsWith("https://")) {
        try {
            const u = new URL(value);
            const host = (u.hostname || "").toLowerCase();
            if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
                return u.pathname || value;
            }
            return value;
        } catch (e) {
            return value;
        }
    }

    if (value.startsWith("assets/")) return `/user/${value}`;
    if (value.startsWith("user/")) return `/${value}`;
    if (value.startsWith("./assets/")) return `/user/${value.slice(2)}`;

    return value;
}

// 1. Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Sarngi@1524", 
    database: "restaurant_db"
});

db.connect(err => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log("MySQL Connected");
    }
});

// Ensure products table exists (create simple schema if missing)
const createProductsTable = `
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  image_url VARCHAR(512),
  description TEXT,
  status VARCHAR(50),
  quantity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
db.query(createProductsTable, (err) => {
    if (err) console.error('Could not ensure products table exists:', err);
    else console.log('Products table ready.');
});

// Ensure product_ratings table exists (stores ratings per product)
const createRatingsTable = `
CREATE TABLE IF NOT EXISTS product_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_email VARCHAR(255),
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);`;

// Ensure feedback table exists so admin can view submissions
const createFeedbackTable = `
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    foodRating INT,
    serviceRating VARCHAR(50),
    comments TEXT
);
`;

// run both table creations
db.query(createRatingsTable, (err) => {
    if (err) console.error('Could not ensure product_ratings table exists:', err);
    else console.log('Product ratings table ready.');
});

db.query(createFeedbackTable, (err) => {
    if (err) console.error('Could not ensure feedback table exists:', err);
    else console.log('Feedback table ready.');
});

// 2. Serve static folders
app.use("/user", express.static(path.join(__dirname, "user panel")));
app.use("/admin", express.static(path.join(__dirname, "admin panel")));
app.get("/manifest.json", (req, res) => {
    res.sendFile(path.join(__dirname, "manifest.json"));
});
app.get("/service-worker.js", (req, res) => {
    res.sendFile(path.join(__dirname, "service-worker.js"));
});

// Ensure upload directory exists inside user panel assets
const userAssetsDir = path.join(__dirname, 'user panel', 'assets');
if (!fs.existsSync(userAssetsDir)) {
    fs.mkdirSync(userAssetsDir, { recursive: true });
}

// Configure multer to save uploads to user panel/assets
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, userAssetsDir);
    },
    filename: function (req, file, cb) {
        // prefix timestamp to avoid collisions
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_');
        cb(null, safeName);
    }
});
const upload = multer({ storage });

// Route to accept image uploads and return publicly accessible URL
app.post('/api/admin/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    // accessible via /user/assets/<filename>
    const url = `/user/assets/${req.file.filename}`;
    res.json({ success: true, url });
});

/* ===== AUTH ROUTES ===== */
app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')";
    db.query(sql, [name, email, password], (err) => {
        if (err) return res.json({ success: false, message: "User already exists" });
        res.json({ success: true });
    });
});

app.post("/api/login", (req, res) => {
    const { email, password, requestedRole } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: "Invalid email or password!" });
        
        const user = results[0];
        
        // Check if the requested role matches the user's actual role
        if (user.role !== requestedRole) {
            return res.json({ success: false, message: `This account is registered as a ${user.role}, not a ${requestedRole}!` });
        }
        
        res.json({ success: true, user: user });
    });
});

/* ===== BOOKING ROUTES (The Fix) ===== */
app.post("/api/bookings", (req, res) => {
    const { email, tableNumber, numPeople, date } = req.body;
    const sql = "INSERT INTO bookings (email, tableNumber, numPeople, booking_date) VALUES (?, ?, ?, ?)";
    db.query(sql, [email, tableNumber, numPeople, date], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database Error" });
        // return the newly created booking ID so the client can reference it later
        res.json({ success: true, id: result.insertId, message: "Booking saved to MySQL" });
    });
});

app.get("/api/user-bookings", (req, res) => {
    const email = req.query.email;
    db.query("SELECT * FROM bookings WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.delete("/api/cancel-booking/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM bookings WHERE id = ?", [id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

/* ===== OTHER ROUTES ===== */
app.post("/api/orders", (req, res) => {
    // now accept an items array so we can track product-wise sales
    const { email, total, status, items } = req.body;
    db.query("INSERT INTO orders (email, total, status, created_at) VALUES (?, ?, ?, NOW())", [email, total, status], (err, result) => {
        if (err) return res.status(500).json(err);
        const orderId = result.insertId;
        if (Array.isArray(items) && items.length) {
            const rows = items.map(it => [orderId, it.productId || null, it.name || null, it.qty || 0, it.price || 0]);
            db.query("INSERT INTO order_items (order_id, product_id, name, qty, price) VALUES ?", [rows], (err2) => {
                if (err2) console.error('Failed to insert order_items', err2);
                // return success regardless of item insert error; we already saved order
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// feedback route now accepts submissions and stores them in the database
app.post("/api/feedback", (req, res) => {
    const { name, email, foodRating, serviceRating, comments } = req.body;
    // insert into feedback table so admin can view it later
    const sql = "INSERT INTO feedback (name, email, foodRating, serviceRating, comments) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, email, foodRating, serviceRating, comments], (err) => {
        if (err) console.error('Failed to persist feedback', err);
        // after storing feedback remove any associated bookings for this email
        const deleteSql = "DELETE FROM bookings WHERE email = ?";
        db.query(deleteSql, [email], (delErr) => {
            if (delErr) console.error('Failed to delete booking after feedback', delErr);
            // respond regardless - we don't want to crash the user flow if deletion fails
            res.json({ success: true });
        });
    });
});

/* ===== ADMIN DATA FETCH ===== */
app.get("/api/data", (req, res) => {
    const data = {};
    db.query("SELECT * FROM users", (err, users) => {
        data.users = users;
        db.query("SELECT * FROM bookings", (err, bookings) => {
            data.bookings = bookings;
            db.query("SELECT * FROM orders", (err, orders) => {
                data.orders = orders || [];
                // pull all order items and merge them into each order object
                db.query("SELECT * FROM order_items", (errItems, items) => {
                    if (!errItems && Array.isArray(items)) {
                        const map = {};
                        items.forEach(it => {
                            if (!map[it.order_id]) map[it.order_id] = [];
                            map[it.order_id].push(it);
                        });
                        data.orders = data.orders.map(o => ({
                            ...o,
                            items: map[o.id] || []
                        }));
                    }
                    // return all stored feedback so admin can view it
                    db.query("SELECT * FROM feedback", (err2, feedbackRows) => {
                        data.feedback = feedbackRows || [];
                        res.json(data);
                    });
                });
            });
        });
    });
});
/* ===== ENHANCED ADMIN DATA (For Manager Dashboard) ===== */
app.get("/api/admin/stats", (req, res) => {
    const dashboardData = {};

    // 1. Calculate Total Income & Orders (from orders table)
    const sqlOrders = "SELECT SUM(total) as totalIncome, COUNT(*) as totalOrders FROM orders WHERE status = 'Paid'";
    db.query(sqlOrders, (err, orderStats) => {
        dashboardData.income = orderStats[0].totalIncome || 0;
        dashboardData.orderCount = orderStats[0].totalOrders || 0;

        // 2. Get Daily Selling Trend (sales per day)
        const sqlSalesTrend = "SELECT DATE(created_at) as hour, SUM(total) as amount FROM orders WHERE created_at IS NOT NULL GROUP BY DATE(created_at) ORDER BY DATE(created_at) DESC";
        db.query(sqlSalesTrend, (err, trend) => {
            dashboardData.salesTrend = (trend || []).reverse();

            // 3. Get Best Dishes (sales revenue from orders)
            // include ALL products, even those with zero orders; sort by revenue desc then newest product
            const bestSql = `SELECT p.id as product_id, p.name, p.category, p.image_url,
                                 COALESCE(SUM(oi.qty),0) AS qtySold,
                                 COALESCE(SUM(oi.qty * oi.price),0) AS revenue,
                                 p.created_at
                              FROM products p
                              LEFT JOIN order_items oi ON oi.product_id = p.id
                              GROUP BY p.id, p.name, p.category, p.image_url, p.created_at
                              ORDER BY revenue DESC, p.created_at DESC`;
            db.query(bestSql, (err, best) => {
                if (!err && best && best.length) {
                    dashboardData.bestDishes = best.map(b => ({
                        id: b.product_id,
                        name: b.name,
                        category: b.category,
                        image: normalizeImagePath(b.image_url),
                        qtySold: Number(b.qtySold) || 0,
                        revenue: Number(b.revenue) || 0
                    }));
                } else {
                    dashboardData.bestDishes = [];
                }

                // 4. Get General Counts
                db.query("SELECT COUNT(*) as userCount FROM users", (err, userCount) => {
                    dashboardData.totalUsers = userCount[0].userCount;
                    
                    // Send everything to the dashboard
                    // Also fetch top rated products to show as best dishes
                    const bestSql = `SELECT p.id, p.name, p.image_url, COALESCE(AVG(pr.rating),0) AS avgRating, COUNT(pr.rating) AS ratingCount
                        FROM products p
                        LEFT JOIN product_ratings pr ON pr.product_id = p.id
                        GROUP BY p.id
                        ORDER BY avgRating DESC
                        LIMIT 4`;
                    db.query(bestSql, (err, best) => {
                        // calculate revenue by category (food-wise)
                        const catSql = `SELECT COALESCE(p.category, 'Unknown') as category, SUM(oi.qty * oi.price) AS revenue
                                        FROM order_items oi
                                        INNER JOIN products p ON oi.product_id = p.id
                                        WHERE p.category IS NOT NULL
                                        GROUP BY p.category
                                        ORDER BY revenue DESC`;
                        db.query(catSql, (err, cat) => {
                            if (!err && cat && cat.length) {
                                dashboardData.categoryRevenue = cat.map(c => ({ category: c.category, revenue: Number(c.revenue) || 0 }));
                            } else {
                                dashboardData.categoryRevenue = [];
                            }
                            res.json(dashboardData);
                        });

                    });
                });
            });
        });
    });
});
// 1. GET all products for the Menu page
// return all products or a single product by ID
app.get("/api/products", (req, res) => {
    const { id } = req.query;
    let sql = `SELECT p.*, 
        COALESCE(r.avg_rating, 0) AS avg_rating, 
        COALESCE(r.rating_count, 0) AS rating_count
        FROM products p
        LEFT JOIN (
            SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
            FROM product_ratings GROUP BY product_id
        ) r ON r.product_id = p.id`;
    const params = [];
    if (id) {
        sql += " WHERE p.id = ?";
        params.push(id);
    }
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.json([]);
        }
                const mapped = results.map(r => {
            const normalizedImage = normalizeImagePath(r.image_url);
            return ({
            id: r.id,
            name: r.name,
            price: r.price,
            image_url: normalizedImage,
            image: normalizedImage,
            description: r.description,
            category: r.category,
            status: r.status,
            quantity: r.quantity,
            created_at: r.created_at,
            rating: Number(r.avg_rating) ? Number(Number(r.avg_rating).toFixed(1)) : 0,
            rating_count: r.rating_count || 0
        });
        });
        // if single requested return object for convenience
        if (id) return res.json({ success: true, product: mapped[0] || null });
        res.json(mapped);
    });
});

// POST a rating for a product
app.post('/api/products/:id/rate', (req, res) => {
    const productId = req.params.id;
    const { email, rating, comment } = req.body;
    if (!productId || !rating) return res.status(400).json({ success: false, message: 'Missing product id or rating' });
    const sql = 'INSERT INTO product_ratings (product_id, user_email, rating, comment) VALUES (?, ?, ?, ?)';
    db.query(sql, [productId, email || null, rating, comment || null], (err) => {
        if (err) {
            console.error('Failed to save rating:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true });
    });
});

// NOTE: product add route defined later (consolidated)

// 3. DELETE a product (from product.html)
app.delete("/api/admin/delete-product/:id", (req, res) => {
    db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
// add new product
app.post("/api/admin/add-product", (req, res) => {
    console.log('Add product payload:', req.body);
    const { name, price, image, description, category, status, quantity } = req.body;
    const normalizedImage = normalizeImagePath(image);
    const sql = "INSERT INTO products (name, price, image_url, description, category, status, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [name, price, normalizedImage, description, category, status, quantity], (err, result) => {
        if (err) {
            console.error("MySQL Insert Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Product added to database" });
    });
});

// update existing product
app.put('/api/admin/update-product/:id', (req, res) => {
    const id = req.params.id;
    const { name, price, image, description, category, status, quantity } = req.body;
    const normalizedImage = normalizeImagePath(image);
    const sql = "UPDATE products SET name=?, price=?, image_url=?, description=?, category=?, status=?, quantity=? WHERE id=?";
    db.query(sql, [name, price, normalizedImage, description, category, status, quantity, id], (err, result) => {
        if (err) {
            console.error('Update product error', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true });
    });
});
app.get("/", (req, res) => {
    res.redirect("/user/index.html");
});
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000/user/index.html");
});
