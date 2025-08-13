import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Storage removed - using library directly
// Note: RealDatabaseManager and localDatabaseConfig removed - using simplified ConnectionManager
// Import from the published npm package
import { ConnectionManager, QueryParser, QueryTranslator } from 'universal-query-translator';
import { DatabaseSetup } from "./services/database-setup";
import { datasetManager } from './services/dataset-manager';
import { settingsManager } from './services/settings-manager';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Connection manager for external database connections
const connectionManager = new ConnectionManager();

// Setup real database connections where possible
async function setupDatabaseConnections() {
  try {
    // Setup database connections and register them with the library
    const dbSetup = new DatabaseSetup();
    await dbSetup.setupRealDatabases();
    
    // Register each successful connection with the ConnectionManager library
    const connections = dbSetup.getConnections();
    
    for (const [connectionId, connection] of Array.from(connections)) {
      if (connection.client) {
        connectionManager.registerConnection(connectionId, connection.client, connection.config);
      }
    }
    
    // Load datasets if configured to do so
    if (settingsManager.shouldAutoLoadDataset()) {
      log('Auto-loading example datasets...');
      for (const [connectionId, connection] of Array.from(connections)) {
        if (connection.client) {
          try {
            const activeConnection = { config: connection.config, client: connection.client };
            
            if (settingsManager.shouldResetOnStartup()) {
              await datasetManager.resetDatabase(activeConnection);
              log(`Reset and loaded dataset for ${connection.config.name}`);
            } else {
              await datasetManager.loadDataset(activeConnection);
              log(`Loaded dataset for ${connection.config.name}`);
            }
          } catch (error: any) {
            log(`Failed to load dataset for ${connection.config.name}: ${error.message}`);
          }
        }
      }
    }
    
    log(`Database setup completed`);
  } catch (error) {
    log(`Database setup failed: ${error}`);
  }
}

(async () => {
  const server = await registerRoutes(app, connectionManager);
  
  // Setup database connections (real where possible)
  await setupDatabaseConnections();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Use localhost on macOS to avoid ENOTSUP error, 0.0.0.0 on other systems  
  const host = process.platform === 'darwin' ? 'localhost' : '0.0.0.0';
  
  // Handle server startup errors gracefully
  server.listen(port, host, () => {
    log(`serving on port ${port}`);
  }).on('error', (err: any) => {
    if (err.code === 'ENOTSUP' && process.platform === 'darwin') {
      // Fallback to default listening on macOS
      log(`Retrying with default host binding...`);
      server.listen(port, 'localhost', () => {
        log(`serving on port ${port} (localhost)`);
      });
    } else if (err.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use. Please kill the process using this port or choose a different port.`);
      process.exit(1);
    } else {
      log(`Server error: ${err.message}`);
      throw err;
    }
  });
})();
