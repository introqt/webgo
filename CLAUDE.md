# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WebGo** is a full-stack online Go (Weiqi/Baduk) platform where players can create games, invite friends via invitation links, and play in real-time with WebSocket synchronization. The application implements complete Go rules including capture detection, ko rule enforcement, suicide prevention, and territory scoring.

**Tech Stack:** Node.js (Express + Socket.io) backend, Vue 3 (Pinia) frontend, PostgreSQL database, all TypeScript.

## Development Commands

### Installation & Setup
```bash
pnpm install                          # Install all dependencies
docker-compose -f docker-compose.dev.yml up -d  # Start PostgreSQL for development
cp packages/server/.env.example packages/server/.env  # Configure environment
pnpm db:migrate                       # Run database migrations
pnpm db:seed                          # Seed test data (alice@example.com, bob@example.com)
```

### Development
```bash
pnpm dev                              # Start both frontend (5173) and backend (3000) in parallel
pnpm dev:client                       # Start only Vue frontend (http://localhost:5173)
pnpm dev:server                       # Start only Express backend (http://localhost:3000)
```

### Building
```bash
pnpm build                            # Build all packages (shared, server, client)
pnpm build:shared                     # Build only shared types package
pnpm build:server                     # Build only server
pnpm build:client                     # Build only client
```

### Testing & Linting
```bash
pnpm test                             # Run all tests
pnpm test:server                      # Run server tests with Vitest
pnpm lint                             # Lint all packages
pnpm lint packages/server/src         # Lint only server code
```

### Database Management
```bash
pnpm db:migrate                       # Apply pending migrations (uses tsx)
pnpm db:seed                          # Populate test data
```

## Monorepo Structure

The project uses **pnpm workspaces** with three packages:

### `packages/shared/`
**Purpose:** Single source of truth for types and constants used by both frontend and backend.

**Key exports (defined in src/):**
- `types/game.ts` - Game state (BoardState, GameState, Move, Game, Position)
- `types/user.ts` - User and authentication types
- `types/api.ts` - HTTP API request/response schemas
- `types/socket.ts` - WebSocket event type definitions
- `constants/index.ts` - BOARD_SIZES, KOMI, socket event names

**Import pattern:** `import { GameState } from '@webgo/shared'` (configured via exports in package.json)

### `packages/server/`
**Tech:** Express.js + Socket.io + PostgreSQL

**Directory structure:**
```
src/
├── index.ts              # Server entry point, Express/Socket.io setup
├── db/
│   ├── migrate.ts        # Database schema initialization
│   ├── seed.ts           # Test data population
│   └── pool.ts           # PostgreSQL connection pool
├── routes/
│   ├── auth.ts           # POST /auth/register, /auth/login, GET /auth/me
│   └── games.ts          # POST/GET /games, game creation and joining
├── services/
│   ├── auth/
│   │   ├── AuthService.ts    # JWT generation, password hashing with bcryptjs
│   │   └── TokenService.ts   # Token validation and refresh logic
│   ├── game/
│   │   ├── GameService.ts    # Orchestrates game creation, move validation
│   │   └── GameEngine.ts     # Pure game logic: move validation, territory scoring
│   └── validation/
│       └── schemas.ts        # Zod validation schemas for API requests
├── repositories/
│   ├── UserRepository.ts     # CRUD for users, password verification
│   └── GameRepository.ts     # Game persistence, serialization/deserialization
├── socket/
│   ├── handlers.ts           # Socket event handlers (make_move, pass_turn, etc.)
│   └── middleware.ts         # JWT authentication for WebSocket connections
└── types.ts              # Server-specific interfaces (not in shared)
```

**Game Engine Architecture:** The `GameEngine` class contains pure, static methods for all game logic:
- `makeMove(state, x, y, color)` - Validates and executes a move, returns {valid, capturedStones} or error
- `findGroup(state, x, y)` - BFS to find connected stones
- `calculateLiberties(state, x, y)` - Count liberties for a group
- `shouldEndGame(state)` - Detects two consecutive passes
- `calculateTerritory(state)` - Flood-fill algorithm for empty regions
- `getScore(state, rules)` - Chinese/Japanese scoring with komi

**Data Flow (Real-time moves):**
1. Client emits `socket.emit('make_move', {gameId, x, y})`
2. Server validates via GameEngine + GameService
3. Database updated via GameRepository.updateGameState()
4. Room broadcast: `socket.to(gameId).emit('move_made', {move, newGameState})`
5. All clients receive synchronized state via Pinia store

### `packages/client/`
**Tech:** Vue 3 + Vite + Pinia + Socket.io-client + Tailwind CSS

**Directory structure:**
```
src/
├── main.ts               # Vue app entry, router/store setup
├── router/
│   └── index.ts          # Vue Router: /login, /register, /game/:id, /lobby
├── stores/
│   ├── useAuthStore.ts   # Pinia: user session, login/logout, JWT token
│   └── useGameStore.ts   # Pinia: current game state, move history, scoring
├── services/
│   ├── api.ts            # Axios or fetch wrapper with JWT auth header
│   └── socket.ts         # Socket.io connection, event listeners
├── components/
│   ├── GoBoard.vue       # Visual board (9x9/13x13/19x19), click → emit move
│   ├── GameControls.vue  # Pass button, resign button, score markers
│   ├── GameInfo.vue      # Current turn, captures, player names
│   ├── AuthForms.vue     # Login/register form
│   └── Lobby.vue         # My games list, create game, join via code
└── styles/
    └── globals.css       # Tailwind setup, board styling
```

**State Management Pattern (Pinia):**
- `useAuthStore` - Holds JWT token, user info; handles login/logout/register
- `useGameStore` - Holds current GameState; synced via WebSocket events
- Both stores trigger API calls via service layer (api.ts, socket.ts)

## Key Architectural Patterns

### 1. **Game State Representation**
The `BoardState` uses a JavaScript Map internally for fast access: `Map<"x,y", StoneColor>`. For database storage and network transmission, it's serialized to `Record<string, StoneColor>`. The `GameEngine` provides `serialize()` and `deserialize()` methods for conversion.

### 2. **Move Validation Pipeline**
```
User clicks board →
  useGameStore.makeMove(x, y) →
    socket.emit('make_move') →
      GameService.validateMove() →
        GameEngine.makeMove() →
          GameRepository.updateGameState() →
            broadcast to all clients in game room
```

### 3. **Room-based WebSocket Communication**
Each game is a Socket.io room (by gameId). When a user joins, they enter the room. Moves are validated server-side before broadcasting to prevent cheating.

### 4. **Authentication & Authorization**
- User registration/login returns JWT token
- JWT stored in localStorage on client, sent with API requests and socket auth
- Server middleware (`socket/middleware.ts`) verifies JWT before allowing socket operations
- Passwords are hashed with bcryptjs (salt rounds = 10)

### 5. **Database Serialization**
The `GameRepository` handles converting JavaScript objects to PostgreSQL:
- `GameState` stored as JSONB in games table for efficient queries
- `BoardState` Map serialized to JSON-compatible Record
- Migrations define schema; seed.ts populates test data

## Important Files to Know

| File | Purpose |
|------|---------|
| `packages/shared/src/types/game.ts` | Game state type definitions (source of truth) |
| `packages/shared/src/constants/index.ts` | Board sizes, komi, socket event names |
| `packages/server/src/services/game/GameEngine.ts` | **Core game logic** - move validation, scoring, territory |
| `packages/server/src/services/game/GameService.ts` | Orchestrates game creation, validates moves |
| `packages/server/src/repositories/GameRepository.ts` | Game persistence and serialization |
| `packages/server/src/db/migrate.ts` | Database schema initialization |
| `packages/client/src/stores/useGameStore.ts` | **Client state** - synced with server via WebSocket |
| `packages/client/src/components/GoBoard.vue` | **Board UI** - renders stones, handles clicks |

## Testing

- Server uses **Vitest** for unit tests (similar to Jest)
- Run individual tests: `pnpm --filter @webgo/server test -- filename.test.ts`
- GameEngine should have comprehensive tests for all move validation logic

## Deployment

- **Docker:** `docker-compose.yml` defines services (server, client, PostgreSQL)
- **Build:** Multi-stage Dockerfile reduces final image size
- **Database:** Migrations run on deployment via `docker-compose exec server pnpm db:migrate`
- **Env variables:** Set via `.env` file (see README for full list)

## Game Rules Implementation

The application implements **Chinese Go rules** (configurable to Japanese):
- **Scoring:** Territory + captured stones + komi adjustment
- **Komi:** 7.5 points for white (compensates for black's first-move advantage)
- **Ko Rule:** Cannot immediately recapture a single stone
- **Suicide:** A move that leaves your stones with no liberties is invalid unless it captures opponent stones
- **End of Game:** Two consecutive passes trigger scoring phase

All scoring logic is in `GameEngine.calculateTerritory()` and `GameEngine.getScore()`.

## Common Development Tasks

### Add a new WebSocket event
1. Define the event type in `packages/shared/src/types/socket.ts`
2. Add event name to `packages/shared/src/constants/index.ts`
3. Implement handler in `packages/server/src/socket/handlers.ts`
4. Emit from client: `socket.emit('event_name', payload)` after importing event type

### Modify game rules
1. Update validation logic in `packages/server/src/services/game/GameEngine.ts`
2. Add tests to verify behavior
3. Ensure serialization still works (BoardState shape)

### Add a new API endpoint
1. Define request/response types in `packages/shared/src/types/api.ts`
2. Create route handler in `packages/server/src/routes/`
3. Add Zod validation schema in `packages/server/src/services/validation/schemas.ts`
4. Call from client via `packages/client/src/services/api.ts`

### Debug board state issues
Check BoardState serialization:
- Look at `GameRepository.updateGameState()` to see how state is saved
- Check `GameEngine.serialize()` / `deserialize()` for Map conversion
- Use browser DevTools to inspect Pinia store (`useGameStore.state`)
