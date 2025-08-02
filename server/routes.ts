import type { Request, Response } from "express";
import type { Express } from "express";
import { storage } from "./storage";
import { ConnectionManager } from "./services/connection-manager";

/**
 * Clean API routes that use the library as intended:
 * - Accept database connections by reference
 * - Library handles all query parsing and translation internally
 * - Routes are thin interfaces to the core library
 */

export async function registerRoutes(app: Express, connectionManager: ConnectionManager) {
  // Get all connections
  app.get("/api/connections", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single connection
  app.get("/api/connections/:id", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.json(connection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new connection
  app.post("/api/connections", async (req: Request, res: Response) => {
    try {
      const connection = await storage.createConnection(req.body);
      res.status(201).json(connection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update connection
  app.put("/api/connections/:id", async (req: Request, res: Response) => {
    try {
      const connection = await storage.updateConnection(req.params.id, req.body);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.json(connection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete connection
  app.delete("/api/connections/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteConnection(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute query using the library
  app.post("/api/query/execute", async (req: Request, res: Response) => {
    try {
      const { query, connectionId } = req.body;

      if (!query || !connectionId) {
        return res.status(400).json({ error: "Query and connectionId are required" });
      }

      const startTime = Date.now();

      // This is the clean library interface - just pass the query and connection ID
      // The library handles all parsing, translation, and execution internally
      const results = await connectionManager.executeQuery(connectionId, query);
      
      const executionTime = Date.now() - startTime;

      res.json({
        results,
        executionTime: `${executionTime}ms`
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Query translation only (for debugging/preview)
  app.post("/api/query/translate", async (req: Request, res: Response) => {
    try {
      const { query, targetType } = req.body;

      if (!query || !targetType) {
        return res.status(400).json({ error: "Query and targetType are required" });
      }

      // This calls the library's translation service for preview purposes
      const translatedQuery = await connectionManager.translateQuery(query, targetType);

      res.json({
        originalQuery: query,
        translatedQuery,
        targetType
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}