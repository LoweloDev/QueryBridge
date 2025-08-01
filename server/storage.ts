import { type Connection, type InsertConnection, type Query, type InsertQuery, type QueryHistory, type InsertQueryHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Connection methods
  getConnection(id: string): Promise<Connection | undefined>;
  getConnections(): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: string, connection: Partial<InsertConnection>): Promise<Connection | undefined>;
  deleteConnection(id: string): Promise<boolean>;
  
  // Query methods
  getQuery(id: string): Promise<Query | undefined>;
  getQueries(): Promise<Query[]>;
  createQuery(query: InsertQuery): Promise<Query>;
  deleteQuery(id: string): Promise<boolean>;
  
  // Query history methods
  getQueryHistory(queryId?: string): Promise<QueryHistory[]>;
  createQueryHistory(history: InsertQueryHistory): Promise<QueryHistory>;
}

export class MemStorage implements IStorage {
  private connections: Map<string, Connection>;
  private queries: Map<string, Query>;
  private queryHistory: Map<string, QueryHistory>;

  constructor() {
    this.connections = new Map();
    this.queries = new Map();
    this.queryHistory = new Map();
    
    // Add some sample connections
    this.initSampleData();
  }
  
  private async initSampleData() {
    const sampleConnections: Connection[] = [
      {
        id: "1",
        name: "PostgreSQL - Production",
        type: "postgresql",
        host: "prod-db.company.com",
        port: "5432",
        database: "app_production",
        username: "app_user",
        password: "password",
        config: null,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "2",
        name: "MongoDB - Analytics",
        type: "mongodb",
        host: "analytics-cluster.mongodb.net",
        port: "27017",
        database: "user_analytics",
        username: "analytics_user",
        password: "password",
        config: null,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "3",
        name: "Elasticsearch - Search",
        type: "elasticsearch",
        host: "search.company.com",
        port: "9200",
        database: "products_v2",
        username: "search_user",
        password: "password",
        config: null,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "4",
        name: "DynamoDB - Users",
        type: "dynamodb",
        host: "dynamodb.us-east-1.amazonaws.com",
        port: "443",
        database: "user_profiles",
        username: "aws_access_key",
        password: "aws_secret_key",
        config: { region: "us-east-1" },
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "5",
        name: "Redis - Cache",
        type: "redis",
        host: "cache.company.com",
        port: "6379",
        database: "0",
        username: "",
        password: "redis_password",
        config: null,
        isActive: true,
        createdAt: new Date(),
      },
    ];
    
    sampleConnections.forEach(conn => this.connections.set(conn.id, conn));
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async getConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const connection: Connection = { 
      ...insertConnection, 
      id,
      createdAt: new Date(),
    };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnection(id: string, updateData: Partial<InsertConnection>): Promise<Connection | undefined> {
    const existing = this.connections.get(id);
    if (!existing) return undefined;
    
    const updated: Connection = { ...existing, ...updateData };
    this.connections.set(id, updated);
    return updated;
  }

  async deleteConnection(id: string): Promise<boolean> {
    return this.connections.delete(id);
  }

  async getQuery(id: string): Promise<Query | undefined> {
    return this.queries.get(id);
  }

  async getQueries(): Promise<Query[]> {
    return Array.from(this.queries.values());
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = randomUUID();
    const query: Query = { 
      ...insertQuery, 
      id,
      createdAt: new Date(),
    };
    this.queries.set(id, query);
    return query;
  }

  async deleteQuery(id: string): Promise<boolean> {
    return this.queries.delete(id);
  }

  async getQueryHistory(queryId?: string): Promise<QueryHistory[]> {
    const history = Array.from(this.queryHistory.values());
    return queryId ? history.filter(h => h.queryId === queryId) : history;
  }

  async createQueryHistory(insertHistory: InsertQueryHistory): Promise<QueryHistory> {
    const id = randomUUID();
    const history: QueryHistory = { 
      ...insertHistory, 
      id,
      createdAt: new Date(),
    };
    this.queryHistory.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
