/**
 * Comprehensive Example Datasets for All Database Types
 *
 * These datasets support all query examples from the documentation
 * and provide realistic data for testing the universal query translator.
 */

export interface ExampleDatasets {
  users: any[];
  orders: any[];
  products: any[];
  categories: any[];
  reviews: any[];
}

export const exampleDatasets: ExampleDatasets = {
  users: [
    {
      id: "user-001",
      name: "Alice Johnson",
      email: "alice@example.com",
      age: 28,
      status: "active",
      created_at: "2024-01-15T10:30:00Z",
      last_login: "2024-12-20T08:15:00Z",
      department: "Engineering",
      salary: 85000,
      country: "USA",
      city: "San Francisco"
    },
    {
      id: "user-002",
      name: "Bob Smith",
      email: "bob@example.com",
      age: 34,
      status: "active",
      created_at: "2024-02-20T14:22:00Z",
      last_login: "2024-12-19T16:45:00Z",
      department: "Marketing",
      salary: 72000,
      country: "USA",
      city: "New York"
    },
    {
      id: "user-003",
      name: "Carol Davis",
      email: "carol@example.com",
      age: 31,
      status: "inactive",
      created_at: "2024-03-10T09:12:00Z",
      last_login: "2024-11-15T12:30:00Z",
      department: "Sales",
      salary: 68000,
      country: "Canada",
      city: "Toronto"
    },
    {
      id: "user-004",
      name: "David Wilson",
      email: "david@example.com",
      age: 29,
      status: "active",
      created_at: "2024-04-05T11:45:00Z",
      last_login: "2024-12-21T09:20:00Z",
      department: "Engineering",
      salary: 92000,
      country: "USA",
      city: "Seattle"
    },
    {
      id: "user-005",
      name: "Eva Martinez",
      email: "eva@example.com",
      age: 26,
      status: "active",
      created_at: "2024-05-12T16:18:00Z",
      last_login: "2024-12-20T14:55:00Z",
      department: "Design",
      salary: 78000,
      country: "Spain",
      city: "Barcelona"
    },
    {
      id: "user-006",
      name: "Frank Brown",
      email: "frank@example.com",
      age: 42,
      status: "active",
      created_at: "2024-06-08T13:33:00Z",
      last_login: "2024-12-18T10:40:00Z",
      department: "Management",
      salary: 125000,
      country: "UK",
      city: "London"
    }
  ],

  orders: [
    {
      id: "order-001",
      user_id: "user-001",
      amount: 299.99,
      status: "completed",
      created_at: "2024-12-15T10:30:00Z",
      shipped_at: "2024-12-16T14:20:00Z",
      items_count: 2,
      payment_method: "credit_card",
      shipping_address: "123 Main St, San Francisco, CA"
    },
    {
      id: "order-002",
      user_id: "user-002",
      amount: 1299.99,
      status: "completed",
      created_at: "2024-12-18T09:15:00Z",
      shipped_at: "2024-12-19T11:30:00Z",
      items_count: 1,
      payment_method: "paypal",
      shipping_address: "456 Oak Ave, New York, NY"
    },
    {
      id: "order-003",
      user_id: "user-001",
      amount: 89.99,
      status: "pending",
      created_at: "2024-12-20T16:45:00Z",
      shipped_at: null,
      items_count: 3,
      payment_method: "credit_card",
      shipping_address: "123 Main St, San Francisco, CA"
    },
    {
      id: "order-004",
      user_id: "user-004",
      amount: 549.99,
      status: "completed",
      created_at: "2024-12-10T12:20:00Z",
      shipped_at: "2024-12-11T15:45:00Z",
      items_count: 2,
      payment_method: "credit_card",
      shipping_address: "789 Pine St, Seattle, WA"
    },
    {
      id: "order-005",
      user_id: "user-005",
      amount: 199.99,
      status: "shipped",
      created_at: "2024-12-19T14:30:00Z",
      shipped_at: "2024-12-20T10:15:00Z",
      items_count: 1,
      payment_method: "credit_card",
      shipping_address: "321 Beach Rd, Barcelona, Spain"
    }
  ],

  products: [
    {
      id: "prod-001",
      name: "Gaming Laptop Pro",
      description: "High-performance gaming laptop with RTX graphics and fast processor",
      price: 1299.99,
      category_id: "cat-001",
      category: "Electronics",
      stock: 25,
      active: true,
      brand: "TechCorp",
      rating: 4.5,
      reviews_count: 127,
      created_at: "2024-01-10T00:00:00Z",
      tags: ["gaming", "laptop", "high-performance", "RTX"]
    },
    {
      id: "prod-002",
      name: "Wireless Gaming Mouse",
      description: "Ergonomic wireless mouse perfect for gaming and productivity",
      price: 79.99,
      category_id: "cat-001",
      category: "Electronics",
      stock: 150,
      active: true,
      brand: "GameGear",
      rating: 4.3,
      reviews_count: 89,
      created_at: "2024-02-15T00:00:00Z",
      tags: ["gaming", "mouse", "wireless", "ergonomic"]
    },
    {
      id: "prod-003",
      name: "Professional Office Chair",
      description: "Comfortable ergonomic office chair with lumbar support",
      price: 299.99,
      category_id: "cat-002",
      category: "Furniture",
      stock: 45,
      active: true,
      brand: "ComfortPlus",
      rating: 4.7,
      reviews_count: 203,
      created_at: "2024-03-20T00:00:00Z",
      tags: ["office", "chair", "ergonomic", "comfortable"]
    },
    {
      id: "prod-004",
      name: "Bluetooth Headphones",
      description: "Premium noise-canceling headphones with excellent sound quality",
      price: 199.99,
      category_id: "cat-001",
      category: "Electronics",
      stock: 80,
      active: true,
      brand: "AudioMax",
      rating: 4.6,
      reviews_count: 156,
      created_at: "2024-04-25T00:00:00Z",
      tags: ["audio", "headphones", "bluetooth", "noise-canceling"]
    },
    {
      id: "prod-005",
      name: "Standing Desk Converter",
      description: "Adjustable standing desk converter for healthier workspace",
      price: 249.99,
      category_id: "cat-002",
      category: "Furniture",
      stock: 30,
      active: true,
      brand: "WorkWell",
      rating: 4.4,
      reviews_count: 78,
      created_at: "2024-05-30T00:00:00Z",
      tags: ["desk", "standing", "adjustable", "workspace"]
    },
    {
      id: "prod-006",
      name: "Vintage Leather Jacket",
      description: "Classic leather jacket with timeless style",
      price: 189.99,
      category_id: "cat-003",
      category: "Clothing",
      stock: 12,
      active: false,
      brand: "StyleCraft",
      rating: 4.2,
      reviews_count: 34,
      created_at: "2024-06-10T00:00:00Z",
      tags: ["clothing", "leather", "jacket", "vintage"]
    }
  ],

  categories: [
    {
      id: "cat-001",
      name: "Electronics",
      description: "Computers, gadgets, and electronic devices",
      parent_id: null,
      active: true,
      product_count: 3,
      created_at: "2024-01-01T00:00:00Z"
    },
    {
      id: "cat-002",
      name: "Furniture",
      description: "Office and home furniture items",
      parent_id: null,
      active: true,
      product_count: 2,
      created_at: "2024-01-01T00:00:00Z"
    },
    {
      id: "cat-003",
      name: "Clothing",
      description: "Apparel and fashion items",
      parent_id: null,
      active: true,
      product_count: 1,
      created_at: "2024-01-01T00:00:00Z"
    }
  ],

  reviews: [
    {
      id: "review-001",
      product_id: "prod-001",
      user_id: "user-001",
      rating: 5,
      title: "Excellent gaming performance",
      content: "This laptop handles all my games perfectly. Great graphics and fast loading times.",
      verified_purchase: true,
      helpful_votes: 23,
      created_at: "2024-12-16T10:30:00Z"
    },
    {
      id: "review-002",
      product_id: "prod-001",
      user_id: "user-004",
      rating: 4,
      title: "Good laptop, minor issues",
      content: "Overall satisfied but the fan can get a bit loud during intensive gaming sessions.",
      verified_purchase: true,
      helpful_votes: 15,
      created_at: "2024-12-12T14:20:00Z"
    },
    {
      id: "review-003",
      product_id: "prod-003",
      user_id: "user-002",
      rating: 5,
      title: "Perfect for long work days",
      content: "Amazing chair! My back pain is completely gone after switching to this chair.",
      verified_purchase: true,
      helpful_votes: 45,
      created_at: "2024-12-19T09:15:00Z"
    },
    {
      id: "review-004",
      product_id: "prod-004",
      user_id: "user-005",
      rating: 5,
      title: "Best headphones I've owned",
      content: "Sound quality is incredible and noise canceling works perfectly on flights.",
      verified_purchase: true,
      helpful_votes: 32,
      created_at: "2024-12-20T16:45:00Z"
    }
  ]
};

/**
 * Database-specific dataset transformations
 */

// PostgreSQL SQL statements for creating tables and inserting data
export const postgresqlDataset = {
  createTables: `
    -- Create users table
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      age INTEGER,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP,
      last_login TIMESTAMP,
      department VARCHAR(50),
      salary INTEGER,
      country VARCHAR(50),
      city VARCHAR(50)
    );

    -- Create orders table
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id),
      amount DECIMAL(10,2),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP,
      shipped_at TIMESTAMP,
      items_count INTEGER,
      payment_method VARCHAR(30),
      shipping_address TEXT
    );

    -- Create categories table
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      parent_id VARCHAR(50) REFERENCES categories(id),
      active BOOLEAN DEFAULT true,
      product_count INTEGER DEFAULT 0,
      created_at TIMESTAMP
    );

    -- Create products table
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10,2),
      category_id VARCHAR(50) REFERENCES categories(id),
      category VARCHAR(100),
      stock INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true,
      brand VARCHAR(100),
      rating DECIMAL(3,2),
      reviews_count INTEGER DEFAULT 0,
      created_at TIMESTAMP,
      tags TEXT[]
    );

    -- Create reviews table
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(50) PRIMARY KEY,
      product_id VARCHAR(50) REFERENCES products(id),
      user_id VARCHAR(50) REFERENCES users(id),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(200),
      content TEXT,
      verified_purchase BOOLEAN DEFAULT false,
      helpful_votes INTEGER DEFAULT 0,
      created_at TIMESTAMP
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
  `,

  insertData: (datasets: ExampleDatasets) => {
    const insertStatements: string[] = [];

    // Insert users
    datasets.users.forEach(user => {
      insertStatements.push(`
        INSERT INTO users (id, name, email, age, status, created_at, last_login, department, salary, country, city)
        VALUES ('${user.id}', '${user.name}', '${user.email}', ${user.age}, '${user.status}', '${user.created_at}', '${user.last_login}', '${user.department}', ${user.salary}, '${user.country}', '${user.city}')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          age = EXCLUDED.age,
          status = EXCLUDED.status,
          last_login = EXCLUDED.last_login,
          department = EXCLUDED.department,
          salary = EXCLUDED.salary,
          country = EXCLUDED.country,
          city = EXCLUDED.city;
      `);
    });

    // Insert categories
    datasets.categories.forEach(category => {
      insertStatements.push(`
        INSERT INTO categories (id, name, description, parent_id, active, product_count, created_at)
        VALUES ('${category.id}', '${category.name}', '${category.description}', ${category.parent_id ? `'${category.parent_id}'` : 'NULL'}, ${category.active}, ${category.product_count}, '${category.created_at}')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          active = EXCLUDED.active,
          product_count = EXCLUDED.product_count;
      `);
    });

    // Insert products
    datasets.products.forEach(product => {
      const tagsArray = product.tags.map((tag: string) => `'${tag}'`).join(',');
      insertStatements.push(`
        INSERT INTO products (id, name, description, price, category_id, category, stock, active, brand, rating, reviews_count, created_at, tags)
        VALUES ('${product.id}', '${product.name.replace(/'/g, "''")}', '${product.description.replace(/'/g, "''")}', ${product.price}, '${product.category_id}', '${product.category}', ${product.stock}, ${product.active}, '${product.brand}', ${product.rating}, ${product.reviews_count}, '${product.created_at}', ARRAY[${tagsArray}])
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          stock = EXCLUDED.stock,
          active = EXCLUDED.active,
          rating = EXCLUDED.rating,
          reviews_count = EXCLUDED.reviews_count,
          tags = EXCLUDED.tags;
      `);
    });

    // Insert orders
    datasets.orders.forEach(order => {
      insertStatements.push(`
        INSERT INTO orders (id, user_id, amount, status, created_at, shipped_at, items_count, payment_method, shipping_address)
        VALUES ('${order.id}', '${order.user_id}', ${order.amount}, '${order.status}', '${order.created_at}', ${order.shipped_at ? `'${order.shipped_at}'` : 'NULL'}, ${order.items_count}, '${order.payment_method}', '${order.shipping_address.replace(/'/g, "''")}')
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          shipped_at = EXCLUDED.shipped_at,
          items_count = EXCLUDED.items_count,
          payment_method = EXCLUDED.payment_method,
          shipping_address = EXCLUDED.shipping_address;
      `);
    });

    // Insert reviews
    datasets.reviews.forEach(review => {
      insertStatements.push(`
        INSERT INTO reviews (id, product_id, user_id, rating, title, content, verified_purchase, helpful_votes, created_at)
        VALUES ('${review.id}', '${review.product_id}', '${review.user_id}', ${review.rating}, '${review.title.replace(/'/g, "''")}', '${review.content.replace(/'/g, "''")}', ${review.verified_purchase}, ${review.helpful_votes}, '${review.created_at}')
        ON CONFLICT (id) DO UPDATE SET
          rating = EXCLUDED.rating,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          helpful_votes = EXCLUDED.helpful_votes;
      `);
    });

    return insertStatements.join('\n');
  }
};

// MongoDB collections structure
export const mongodbDataset = {
  collections: {
    users: exampleDatasets.users.map(user => ({
      _id: user.id,
      ...user,
      created_at: new Date(user.created_at),
      last_login: new Date(user.last_login)
    })),
    orders: exampleDatasets.orders.map(order => ({
      _id: order.id,
      ...order,
      created_at: new Date(order.created_at),
      shipped_at: order.shipped_at ? new Date(order.shipped_at) : null
    })),
    products: exampleDatasets.products.map(product => ({
      _id: product.id,
      ...product,
      created_at: new Date(product.created_at)
    })),
    categories: exampleDatasets.categories.map(category => ({
      _id: category.id,
      ...category,
      created_at: new Date(category.created_at)
    })),
    reviews: exampleDatasets.reviews.map(review => ({
      _id: review.id,
      ...review,
      created_at: new Date(review.created_at)
    }))
  }
};

// DynamoDB table structure with both traditional and single-table designs
export const dynamodbDataset = {
  traditionalTables: {
    users: exampleDatasets.users.map(user => ({
      id: user.id,  // Keep original id field for queries
      ...user
    })),
    orders: exampleDatasets.orders.map(order => ({
      id: order.id,  // Keep original id field for queries
      ...order
    })),
    products: exampleDatasets.products.map(product => ({
      id: product.id,  // Keep original id field for queries
      ...product
    })),
    categories: exampleDatasets.categories.map(category => ({
      id: category.id,
      ...category
    })),
    reviews: exampleDatasets.reviews.map(review => ({
      id: review.id,
      ...review
    }))
  },
  singleTable: [
    // Users with single-table design
    ...exampleDatasets.users.map(user => ({
      tenant_id: `tenant_test`,
      entityType: 'user',
      ...user
    })),
    // Orders with single-table design
    ...exampleDatasets.orders.map(order => ({
      tenant_id: `tenant_test`,
      entityType: 'order',
      ...order
    })),
    // Products with single-table design
    ...exampleDatasets.products.map(product => ({
      tenant_id: `tenant_test`,
      entityType: 'product',
      ...product
    })),
    // Categories with single-table design
    ...exampleDatasets.categories.map(category => ({
      tenant_id: `tenant_test`,
      entityType: 'category',
      ...category
    })),
    // Reviews with single-table design
    ...exampleDatasets.reviews.map(review => ({
      tenant_id: `tenant_test`,
      entityType: 'review',
      ...review
    }))
  ]
};

// Redis data structure
export const redisDataset = {
  // Hash sets for entities
  hashes: {
    ...Object.fromEntries(exampleDatasets.users.map(user =>
      [`user:${user.id}`, user]
    )),
    ...Object.fromEntries(exampleDatasets.orders.map(order =>
      [`order:${order.id}`, order]
    )),
    ...Object.fromEntries(exampleDatasets.products.map(product =>
      [`product:${product.id}`, product]
    ))
  },
  // Sets for relationships
  sets: {
    'users:active': exampleDatasets.users.filter(u => u.status === 'active').map(u => u.id),
    'users:inactive': exampleDatasets.users.filter(u => u.status === 'inactive').map(u => u.id),
    'orders:completed': exampleDatasets.orders.filter(o => o.status === 'completed').map(o => o.id),
    'orders:pending': exampleDatasets.orders.filter(o => o.status === 'pending').map(o => o.id),
    'products:active': exampleDatasets.products.filter(p => p.active).map(p => p.id),
    'products:electronics': exampleDatasets.products.filter(p => p.category === 'Electronics').map(p => p.id)
  },
  // Sorted sets for rankings
  sortedSets: {
    'products:by_price': exampleDatasets.products.map(p => ({ score: p.price, member: p.id })),
    'products:by_rating': exampleDatasets.products.map(p => ({ score: p.rating, member: p.id })),
    'users:by_salary': exampleDatasets.users.map(u => ({ score: u.salary, member: u.id }))
  }
};

// Elasticsearch documents structure
export const elasticsearchDataset = {
  indices: {
    users: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text', analyzer: 'standard' },
          email: { type: 'keyword' },
          age: { type: 'integer' },
          status: { type: 'keyword' },
          created_at: { type: 'date' },
          last_login: { type: 'date' },
          department: { type: 'keyword' },
          salary: { type: 'integer' },
          country: { type: 'keyword' },
          city: { type: 'keyword' }
        }
      },
      documents: exampleDatasets.users
    },
    products: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text', analyzer: 'standard' },
          description: { type: 'text', analyzer: 'standard' },
          price: { type: 'float' },
          category: { type: 'keyword' },
          stock: { type: 'integer' },
          active: { type: 'boolean' },
          brand: { type: 'keyword' },
          rating: { type: 'float' },
          reviews_count: { type: 'integer' },
          tags: { type: 'keyword' },
          created_at: { type: 'date' }
        }
      },
      documents: exampleDatasets.products
    },
    orders: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          amount: { type: 'float' },
          status: { type: 'keyword' },
          created_at: { type: 'date' },
          shipped_at: { type: 'date' },
          items_count: { type: 'integer' },
          payment_method: { type: 'keyword' },
          shipping_address: { type: 'text' }
        }
      },
      documents: exampleDatasets.orders
    }
  }
};
