-- 1. Create or use the database
CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

-- 2. Create the users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Optional: Insert a default Admin for testing
-- (Replace 'admin123' with a hashed password if you are using bcrypt in server.js)
INSERT INTO users (name, email, password, role) 
VALUES ('Admin User', 'admin@seffronsky.com', 'admin123', 'admin');
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100),
    tableNumber VARCHAR(10),
    numPeople INT,
    booking_date VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100),
    total DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- order_items keeps a record of individual products per order; useful for reporting/analytics
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT,
    name VARCHAR(255),
    qty INT DEFAULT 1,
    price DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    foodRating INT,
    serviceRating VARCHAR(50),
    comments TEXT
);

-- 4. Products table (used by server.js)
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

-- 5. Product ratings table (stores user ratings per product)
CREATE TABLE IF NOT EXISTS product_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_email VARCHAR(255),
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);