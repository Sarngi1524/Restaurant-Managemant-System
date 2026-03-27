-- APP_QUERIES_START
-- name: ENSURE_PRODUCTS_TABLE
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    image_url VARCHAR(512),
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50),
    quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- name: ENSURE_PRODUCT_RATINGS_TABLE
CREATE TABLE IF NOT EXISTS product_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_email VARCHAR(255),
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- name: ENSURE_FEEDBACK_TABLE
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    foodRating INT,
    serviceRating VARCHAR(50),
    comments TEXT
);

-- name: REGISTER_USER
INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user');

-- name: LOGIN_USER_BY_EMAIL_PASSWORD
SELECT * FROM users WHERE email = ? AND password = ?;

-- name: INSERT_BOOKING
INSERT INTO bookings (email, tableNumber, numPeople, booking_date) VALUES (?, ?, ?, ?);

-- name: SELECT_BOOKINGS_BY_EMAIL
SELECT * FROM bookings WHERE email = ?;

-- name: DELETE_BOOKING_BY_ID
DELETE FROM bookings WHERE id = ?;

-- name: INSERT_ORDER
INSERT INTO orders (email, total, status, created_at) VALUES (?, ?, ?, NOW());

-- name: INSERT_ORDER_ITEMS
INSERT INTO order_items (order_id, product_id, name, qty, price) VALUES ?;

-- name: INSERT_FEEDBACK
INSERT INTO feedback (name, email, foodRating, serviceRating, comments) VALUES (?, ?, ?, ?, ?);

-- name: DELETE_BOOKINGS_BY_EMAIL
DELETE FROM bookings WHERE email = ?;

-- name: SELECT_ALL_USERS
SELECT * FROM users;

-- name: SELECT_ALL_BOOKINGS
SELECT * FROM bookings;

-- name: SELECT_ALL_ORDERS
SELECT * FROM orders;

-- name: SELECT_ALL_ORDER_ITEMS
SELECT * FROM order_items;

-- name: SELECT_ALL_FEEDBACK
SELECT * FROM feedback;

-- name: ADMIN_STATS_TOTAL_INCOME_ORDERS
SELECT SUM(total) as totalIncome, COUNT(*) as totalOrders FROM orders WHERE status = 'Paid';

-- name: ADMIN_STATS_DAILY_TREND
SELECT DATE(created_at) as hour, SUM(total) as amount
FROM orders
WHERE created_at IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- name: ADMIN_STATS_BEST_DISHES
SELECT p.id as product_id, p.name, p.category, p.image_url, p.price AS current_price,
       COALESCE(SUM(CASE WHEN o.status = 'Paid' THEN oi.qty ELSE 0 END),0) AS qtySold,
       COALESCE(SUM(CASE WHEN o.status = 'Paid' THEN oi.qty * oi.price ELSE 0 END),0) AS revenue,
       p.created_at
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
GROUP BY p.id, p.name, p.category, p.image_url, p.price, p.created_at
ORDER BY qtySold DESC, revenue DESC, p.created_at DESC;

-- name: ADMIN_STATS_USER_COUNT
SELECT COUNT(*) as userCount FROM users;

-- name: ADMIN_STATS_TOP_RATED_PRODUCTS
SELECT p.id, p.name, p.image_url, COALESCE(AVG(pr.rating),0) AS avgRating, COUNT(pr.rating) AS ratingCount
FROM products p
LEFT JOIN product_ratings pr ON pr.product_id = p.id
GROUP BY p.id
ORDER BY avgRating DESC
LIMIT 4;

-- name: ADMIN_STATS_CATEGORY_REVENUE
SELECT COALESCE(p.category, 'Unknown') as category, SUM(oi.qty * oi.price) AS revenue
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id
INNER JOIN orders o ON o.id = oi.order_id
WHERE p.category IS NOT NULL AND o.status = 'Paid'
GROUP BY p.category
ORDER BY revenue DESC;

-- name: PRODUCTS_SELECT_ALL
SELECT p.*,
       COALESCE(r.avg_rating, 0) AS avg_rating,
       COALESCE(r.rating_count, 0) AS rating_count
FROM products p
LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
    FROM product_ratings
    GROUP BY product_id
) r ON r.product_id = p.id;

-- name: PRODUCTS_SELECT_BY_ID
SELECT p.*,
       COALESCE(r.avg_rating, 0) AS avg_rating,
       COALESCE(r.rating_count, 0) AS rating_count
FROM products p
LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
    FROM product_ratings
    GROUP BY product_id
) r ON r.product_id = p.id
WHERE p.id = ?;

-- name: INSERT_PRODUCT_RATING
INSERT INTO product_ratings (product_id, user_email, rating, comment) VALUES (?, ?, ?, ?);

-- name: DELETE_PRODUCT_BY_ID
DELETE FROM products WHERE id = ?;

-- name: INSERT_PRODUCT
INSERT INTO products (name, price, image_url, description, category, status, quantity) VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UPDATE_PRODUCT
UPDATE products
SET name=?, price=?, image_url=?, description=?, category=?, status=?, quantity=?
WHERE id=?;
-- APP_QUERIES_END
