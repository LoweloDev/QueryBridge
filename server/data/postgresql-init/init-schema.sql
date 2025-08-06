-- PostgreSQL initialization script
-- This script runs when the container starts for the first time

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, age, city) VALUES
    ('Alice Johnson', 'alice@example.com', 28, 'New York'),
    ('Bob Smith', 'bob@example.com', 35, 'San Francisco'),
    ('Carol Williams', 'carol@example.com', 42, 'Chicago'),
    ('David Brown', 'david@example.com', 31, 'Austin'),
    ('Eva Davis', 'eva@example.com', 29, 'Seattle')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, price, in_stock) VALUES
    ('Premium Widget', 'widgets', 29.99, true),
    ('Basic Tool', 'tools', 15.50, true),
    ('Advanced Gadget', 'gadgets', 99.99, false),
    ('Simple Device', 'devices', 45.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO orders (user_id, product_name, amount, status) VALUES
    (1, 'Premium Widget', 29.99, 'completed'),
    (2, 'Basic Tool', 15.50, 'pending'),
    (1, 'Advanced Gadget', 99.99, 'completed'),
    (3, 'Simple Device', 45.00, 'shipped'),
    (2, 'Premium Widget', 29.99, 'completed')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;