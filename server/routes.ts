import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { QueryParser } from "./services/queryParser";
import { QueryTranslator } from "./services/queryTranslator";
import { connectionManager } from "./services/connectionManager";
import { insertConnectionSchema, insertQuerySchema, insertQueryHistorySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all connections
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Create new connection
  app.post("/api/connections", async (req, res) => {
    try {
      const connectionData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(connectionData);
      
      // Test the connection
      const connected = await connectionManager.connect(connection);
      if (connected) {
        await storage.updateConnection(connection.id, { isActive: true });
      }
      
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: "Invalid connection data" });
    }
  });

  // Test connection
  app.post("/api/connections/:id/test", async (req, res) => {
    try {
      const connection = await storage.getConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const connected = await connectionManager.connect(connection);
      await storage.updateConnection(connection.id, { isActive: connected });
      
      res.json({ connected });
    } catch (error) {
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  // Delete connection
  app.delete("/api/connections/:id", async (req, res) => {
    try {
      await connectionManager.disconnect(req.params.id);
      const deleted = await storage.deleteConnection(req.params.id);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Connection not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  // Validate query syntax
  app.post("/api/query/validate", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const validation = QueryParser.validate(query);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ error: "Failed to validate query" });
    }
  });

  // Translate query to specific database format
  app.post("/api/query/translate", async (req, res) => {
    try {
      const { query, targetType } = req.body;
      if (!query || !targetType) {
        return res.status(400).json({ error: "Query and target type are required" });
      }

      const parsedQuery = QueryParser.parse(query);
      let translatedQuery;

      switch (targetType) {
        case 'sql':
          translatedQuery = QueryTranslator.toSQL(parsedQuery);
          break;
        case 'mongodb':
          translatedQuery = QueryTranslator.toMongoDB(parsedQuery);
          break;
        case 'elasticsearch':
          translatedQuery = QueryTranslator.toElasticsearch(parsedQuery);
          break;
        case 'dynamodb':
          translatedQuery = QueryTranslator.toDynamoDB(parsedQuery);
          break;
        case 'redis':
          translatedQuery = QueryTranslator.toRedis(parsedQuery);
          break;
        default:
          return res.status(400).json({ error: "Unsupported target type" });
      }

      res.json({ 
        originalQuery: query,
        parsedQuery,
        translatedQuery,
        targetType 
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to translate query" });
    }
  });

  // Execute query
  app.post("/api/query/execute", async (req, res) => {
    try {
      const { query, connectionId, targetType } = req.body;
      if (!query || !connectionId) {
        return res.status(400).json({ error: "Query and connection ID are required" });
      }

      const connection = await storage.getConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const startTime = Date.now();
      
      // Parse and translate query
      const parsedQuery = QueryParser.parse(query);
      let translatedQuery;
      
      switch (targetType || connection.type) {
        case 'postgresql':
        case 'mysql':
        case 'sql':
          translatedQuery = QueryTranslator.toSQL(parsedQuery);
          break;
        case 'mongodb':
          translatedQuery = QueryTranslator.toMongoDB(parsedQuery);
          break;
        case 'elasticsearch':
          translatedQuery = QueryTranslator.toElasticsearch(parsedQuery);
          break;
        case 'dynamodb':
          translatedQuery = QueryTranslator.toDynamoDB(parsedQuery);
          break;
        case 'redis':
          translatedQuery = QueryTranslator.toRedis(parsedQuery);
          break;
        default:
          return res.status(400).json({ error: "Unsupported database type" });
      }

      // Execute query
      const results = await connectionManager.execute(connectionId, JSON.stringify(translatedQuery));
      const executionTime = Date.now() - startTime;

      // Save to history
      await storage.createQueryHistory({
        query,
        results,
        executionTime: `${executionTime}ms`,
        status: 'success',
      });

      res.json({
        results,
        executionTime: `${executionTime}ms`,
        translatedQuery,
        rowCount: Array.isArray(results) ? results.length : results.rows?.length || results.Items?.length || 0,
      });
    } catch (error) {
      const executionTime = Date.now() - (req.body.startTime || Date.now());
      
      // Save error to history
      await storage.createQueryHistory({
        query: req.body.query,
        results: null,
        executionTime: `${executionTime}ms`,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to execute query",
        executionTime: `${executionTime}ms`,
      });
    }
  });

  // Get query history
  app.get("/api/query/history", async (req, res) => {
    try {
      const history = await storage.getQueryHistory();
      res.json(history.slice(-50)); // Return last 50 queries
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch query history" });
    }
  });

  // Save query
  app.post("/api/queries", async (req, res) => {
    try {
      const queryData = insertQuerySchema.parse(req.body);
      const query = await storage.createQuery(queryData);
      res.json(query);
    } catch (error) {
      res.status(400).json({ error: "Invalid query data" });
    }
  });

  // Get saved queries
  app.get("/api/queries", async (req, res) => {
    try {
      const queries = await storage.getQueries();
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
