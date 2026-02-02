import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { testConnection } from './config/database.js';
import routes from './routes/index.js';
import { createSocketServer } from './socket/index.js';
import { UserRepository } from './models/User.js';
import { GameRepository } from './models/Game.js';
import { GameService } from './services/game/GameService.js';
import { BotService } from './services/bot/BotService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }

  // Ensure bot users exist
  const userRepo = new UserRepository();
  const gameRepo = new GameRepository();
  const gameService = new GameService(gameRepo);
  const botService = new BotService(userRepo, gameRepo, gameService);
  await botService.createBotUsers();

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

  // Health check endpoint for deployment platforms
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve static files from client build (production only)
  if (config.nodeEnv === 'production') {
    const clientPath = path.join(__dirname, '..', '..', 'client', 'dist');
    app.use(express.static(clientPath));

    // Catch-all route to serve index.html for Vue SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  }

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
