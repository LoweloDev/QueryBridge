import express from 'express';
import cors from 'cors';
import { ConnectionManager, DatabaseSetup } from 'universal-query-translator';
import type { DatabaseConnection } from 'universal-query-translator';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the library
const connectionManager = new ConnectionManager();
const databaseSetup = new DatabaseSetup();

// REST API Routes for testing the library
app.post('/api/query/execute', async (req, res) => {
  try {
    const { query, connectionId } = req.body;
    const startTime = Date.now();
    
    const results = await connectionManager.executeQuery(connectionId, query);
    const executionTime = Date.now() - startTime;
    
    res.json({ results, executionTime: `${executionTime}ms` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/query/translate', async (req, res) => {
  try {
    const { query, targetType } = req.body;
    
    const translation = connectionManager.translateQuery(query, targetType);
    
    res.json({
      originalQuery: query,
      translatedQuery: translation,
      targetType
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/connections', (req, res) => {
  try {
    const connections = connectionManager.listConnections();
    res.json(connections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execute-sql', async (req, res) => {
  try {
    const { sql } = req.body;
    // This would typically use a direct database connection for testing
    // For now, we'll use the existing setup
    res.json({ message: 'SQL execution endpoint - implementation needed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup database connections for testing
async function setupTestConnections() {
  try {
    console.log('Setting up test database connections...');
    
    // Setup real databases and register them with the library
    await databaseSetup.setupRealDatabases();
    
    // Register each successful connection with the ConnectionManager
    const connections = databaseSetup.getConnections();
    
    for (const [connectionId, connection] of connections) {
      if (connection.client) {
        connectionManager.registerConnection(connectionId, connection.client, connection.config);
      }
    }
    
    console.log('Database connections setup completed');
  } catch (error) {
    console.error('Failed to setup database connections:', error);
  }
}

// Start server
async function start() {
  await setupTestConnections();
  
  app.listen(port, () => {
    console.log(`Testing API server running on port ${port}`);
  });
}

start().catch(console.error);