import { db } from "../db";
import { connections } from "@shared/schema";
import { randomUUID } from "crypto";

// Seed database with real connection configurations
const seedConnections = [
  {
    id: randomUUID(),
    name: "PostgreSQL - Production",
    type: "postgresql",
    host: "localhost",
    port: "5432",
    database: "queryflow_dev",
    username: "postgres",
    password: "",
    config: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: randomUUID(),
    name: "MongoDB - Analytics",
    type: "mongodb",
    host: "localhost",
    port: "27017",
    database: "analytics",
    username: "",
    password: "",
    config: null,
    isActive: false,
    createdAt: new Date(),
  },
  {
    id: randomUUID(),
    name: "Elasticsearch - Search",
    type: "elasticsearch",
    host: "localhost",
    port: "9200",
    database: "products",
    username: "",
    password: "",
    config: null,
    isActive: false,
    createdAt: new Date(),
  },
  {
    id: randomUUID(),
    name: "DynamoDB - Users",
    type: "dynamodb",
    host: "localhost",
    port: "8000",
    database: "users",
    username: "",
    password: "",
    config: { region: "us-east-1" },
    isActive: false,
    createdAt: new Date(),
  },
  {
    id: randomUUID(),
    name: "Redis - Cache",
    type: "redis",
    host: "localhost",
    port: "6379",
    database: "0",
    username: "",
    password: "",
    config: null,
    isActive: false,
    createdAt: new Date(),
  },
];

export async function seedDatabase() {
  try {
    console.log("Seeding database with connection configurations...");
    
    // Clear existing connections
    await db.delete(connections);
    
    // Insert seed data
    await db.insert(connections).values(seedConnections);
    
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

// Run if called directly (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0));
}