// MongoDB initialization script for analytics database
// This script runs when the container starts for the first time

// Switch to analytics database
db = db.getSiblingDB('analytics');

// Create collections with some initial structure
db.createCollection('events');
db.createCollection('users');
db.createCollection('products');

// Create indexes for better performance
db.events.createIndex({ "timestamp": 1 });
db.events.createIndex({ "user_id": 1 });
db.events.createIndex({ "event_type": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "created_at": 1 });

db.products.createIndex({ "sku": 1 }, { unique: true });
db.products.createIndex({ "category": 1 });

// Insert some sample data for testing
db.events.insertMany([
  {
    event_type: "page_view",
    user_id: "user123",
    page: "/home",
    timestamp: new Date(),
    properties: { source: "organic" }
  },
  {
    event_type: "purchase",
    user_id: "user456",
    product_id: "prod789",
    amount: 29.99,
    timestamp: new Date(),
    properties: { currency: "USD" }
  }
]);

db.users.insertMany([
  {
    user_id: "user123",
    email: "alice@example.com",
    name: "Alice Johnson",
    created_at: new Date(),
    plan: "premium"
  },
  {
    user_id: "user456", 
    email: "bob@example.com",
    name: "Bob Smith",
    created_at: new Date(),
    plan: "basic"
  }
]);

db.products.insertMany([
  {
    sku: "prod789",
    name: "Premium Widget",
    category: "widgets",
    price: 29.99,
    in_stock: true
  },
  {
    sku: "prod101",
    name: "Basic Tool",
    category: "tools", 
    price: 15.50,
    in_stock: false
  }
]);

print("Analytics database initialized successfully");