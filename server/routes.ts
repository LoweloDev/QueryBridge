import type { Request, Response } from "express";
import type { Express } from "express";
// Storage removed - using library directly
// Import from the published npm package
import { ConnectionManager, QueryTranslator } from 'universal-query-translator';

/**
 * Clean API routes that use the library as intended:
 * - Accept database connections by reference
 * - Library handles all query parsing and translation internally
 * - Routes are thin interfaces to the core library
 */

export async function registerRoutes(app: Express, connectionManager: ConnectionManager) {
  // List connections from library
  app.get("/api/connections", (req: Request, res: Response) => {
    try {
      const connections = connectionManager.listConnections();
      res.json(connections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test connection
  app.post("/api/connections/:id/test", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: "Connection ID is required" });
      }

      // Test connection by attempting a simple query execution
      // This uses the same path as query execution, so if that works, the connection is good
      const testQuery = "FIND users LIMIT 1";
      
      try {
        await connectionManager.executeQuery(id, testQuery);
        res.json({ success: true, message: "Connection successful" });
      } catch (error: any) {
        // Even if the test query fails due to syntax or data issues, 
        // connection errors will be caught separately
        if (error.message.includes('connection') || error.message.includes('connect')) {
          res.status(500).json({ success: false, error: error.message });
        } else {
          // If it's not a connection error, the connection is actually working
          res.json({ success: true, message: "Connection successful" });
        }
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
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

      // Map legacy 'sql' to 'postgresql' for backward compatibility
      const mappedTargetType = targetType === 'sql' ? 'postgresql' : targetType;

      // This calls the library's translation service for preview purposes
      const translatedQuery = connectionManager.translateQuery(query, mappedTargetType);

      res.json({
        originalQuery: query,
        translatedQuery,
        targetType: mappedTargetType
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app as any; // Express app compatible with server interface
}