import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/index.js';
import { testConnection } from './config/database.js';
import routes from './routes/index.js';
import { createSocketServer } from './socket/index.js';

async function main() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }

  const app = express();
  const httpServer = createServer(app);

  // Middleware
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));
  app.use(express.json());

  // API routes
  app.use('/api', routes);

  // Setup WebSocket
  const io = createSocketServer(httpServer);

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`CORS origin: ${config.cors.origin}`);
  });
}

main().catch(console.error);
