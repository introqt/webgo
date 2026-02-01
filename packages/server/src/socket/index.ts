import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@webgo/shared';
import { config } from '../config/index.js';
import { setupGameHandlers } from './gameHandlers.js';

export function createSocketServer(
  httpServer: HttpServer
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  setupGameHandlers(io);

  return io;
}
