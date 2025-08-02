import { type Connection, type InsertConnection, type Query, type InsertQuery, type QueryHistory, type InsertQueryHistory } from "@shared/schema";
import { db } from "./db";
import { connections, queries, queryHistory } from "@shared/schema";
import { eq } from "drizzle-orm";
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

export class DatabaseStorage implements IStorage {
  // Connection methods
  async getConnection(id: string): Promise<Connection | undefined> {
    const [connection] = await db.select().from(connections).where(eq(connections.id, id));
    return connection || undefined;
  }

  async getConnections(): Promise<Connection[]> {
    return await db.select().from(connections);
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const connectionData = {
      ...insertConnection,
      id,
      host: insertConnection.host || null,
      port: insertConnection.port || null,
      database: insertConnection.database || null,
      username: insertConnection.username || null,
      password: insertConnection.password || null,
      config: insertConnection.config || null,
      isActive: insertConnection.isActive ?? true,
      createdAt: new Date(),
    };

    const [connection] = await db
      .insert(connections)
      .values(connectionData)
      .returning();
    
    return connection;
  }

  async updateConnection(id: string, updateData: Partial<InsertConnection>): Promise<Connection | undefined> {
    const [connection] = await db
      .update(connections)
      .set(updateData)
      .where(eq(connections.id, id))
      .returning();
    
    return connection || undefined;
  }

  async deleteConnection(id: string): Promise<boolean> {
    const result = await db
      .delete(connections)
      .where(eq(connections.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Query methods
  async getQuery(id: string): Promise<Query | undefined> {
    const [query] = await db.select().from(queries).where(eq(queries.id, id));
    return query || undefined;
  }

  async getQueries(): Promise<Query[]> {
    return await db.select().from(queries);
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = randomUUID();
    const queryData = {
      ...insertQuery,
      id,
      name: insertQuery.name || null,
      connectionId: insertQuery.connectionId || null,
      generatedQuery: insertQuery.generatedQuery || null,
      createdAt: new Date(),
    };

    const [query] = await db
      .insert(queries)
      .values(queryData)
      .returning();
    
    return query;
  }

  async deleteQuery(id: string): Promise<boolean> {
    const result = await db
      .delete(queries)
      .where(eq(queries.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Query history methods
  async getQueryHistory(queryId?: string): Promise<QueryHistory[]> {
    if (queryId) {
      return await db.select().from(queryHistory).where(eq(queryHistory.queryId, queryId));
    }
    return await db.select().from(queryHistory);
  }

  async createQueryHistory(insertHistory: InsertQueryHistory): Promise<QueryHistory> {
    const id = randomUUID();
    const historyData = {
      ...insertHistory,
      id,
      queryId: insertHistory.queryId || null,
      results: insertHistory.results || null,
      executionTime: insertHistory.executionTime || null,
      error: insertHistory.error || null,
      createdAt: new Date(),
    };

    const [history] = await db
      .insert(queryHistory)
      .values(historyData)
      .returning();
    
    return history;
  }
}

export const storage = new DatabaseStorage();