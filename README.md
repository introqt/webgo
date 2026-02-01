# WebGo - Online Go Game

A web application for playing Go (Weiqi/Baduk) online with friends using invitation links.

## Features

- **Multiple Board Sizes**: Play on 9x9, 13x13, or 19x19 boards
- **Real-time Gameplay**: See moves instantly with WebSocket updates
- **Easy Invitations**: Share a simple link to invite friends
- **Full Go Rules**: Capture detection, ko rule, suicide prevention, territory scoring
- **Chinese Rules**: Territory + stones scoring with configurable komi

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO, PostgreSQL
- **Frontend**: Vue 3, Pinia, Tailwind CSS
- **Language**: TypeScript (full-stack)
- **Deployment**: Docker

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ (or Docker)

### Development Setup

1. **Clone and install dependencies**
```bash
cd webgo
pnpm install
```

2. **Start PostgreSQL** (using Docker)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **Configure environment**
```bash
cp packages/server/.env.example packages/server/.env
# Edit .env with your settings
```

4. **Run database migrations**
```bash
pnpm db:migrate
```

5. **Seed test data** (optional)
```bash
pnpm db:seed
```

6. **Start development servers**
```bash
pnpm dev
```

The client will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

### Test Accounts (after seeding)

- `alice@example.com` / `password123`
- `bob@example.com` / `password123`

## Project Structure

```
webgo/
├── packages/
│   ├── shared/     # Shared TypeScript types and constants
│   ├── server/     # Express + Socket.IO backend
│   └── client/     # Vue 3 frontend
├── docker-compose.yml       # Production Docker setup
├── docker-compose.dev.yml   # Development PostgreSQL
└── Dockerfile               # Multi-stage build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Games
- `POST /api/games` - Create game
- `GET /api/games/:gameId` - Get game state
- `GET /api/games/join/:code` - Get game by invitation code
- `POST /api/games/join/:code` - Join game
- `GET /api/games/my-games` - List user's games

## WebSocket Events

### Client → Server
- `join_game` - Join game room
- `make_move` - Place a stone
- `pass_turn` - Pass
- `resign` - Resign
- `accept_score` - Accept final score

### Server → Client
- `game_joined` - Successfully joined
- `move_made` - Stone placed
- `turn_passed` - Player passed
- `game_ended` - Game finished
- `invalid_move` - Move rejected

## Running Tests

```bash
pnpm test
```

## Production Deployment

### Using Docker Compose

```bash
# Build and run all services
docker-compose up -d

# Run migrations
docker-compose exec server node packages/server/dist/db/migrate.js
```

### Environment Variables

| Variable | Description | Default | Production Required |
|----------|-------------|---------|-------------------|
| `NODE_ENV` | Environment mode | development | Yes (set to `production`) |
| `PORT` | Server port | 3000 | No |
| `DB_HOST` | PostgreSQL host | localhost | Yes |
| `DB_PORT` | PostgreSQL port | 5432 | No |
| `DB_NAME` | Database name | webgo | Yes |
| `DB_USER` | Database user | postgres | Yes |
| `DB_PASSWORD` | Database password | postgres | Yes |
| `DB_SSL` | Enable SSL connection | false | Recommended for production |
| `DB_SSL_CA` | Custom CA certificate path for SSL | - | Optional (for self-signed certs) |
| `JWT_SECRET` | JWT signing secret (min 32 chars in prod) | (insecure default) | **Required** |
| `JWT_EXPIRES_IN` | Token expiration time | 7d | No |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 | Yes |

#### Generating a Secure JWT Secret

For production, generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security Notes:**
- The server will **fail to start** in production if `JWT_SECRET` is not set or uses a default value
- The server will **fail to start** in production if `JWT_SECRET` is shorter than 32 characters
- In development mode, insecure defaults are allowed but warnings are logged
- SSL certificate verification is enforced in production mode

## Security Best Practices

### Authentication
- JWT tokens are used for authentication with configurable expiration
- Passwords are hashed using bcryptjs with salt rounds = 10
- Production requires a strong JWT secret (minimum 32 characters)

### Database
- SSL connections are supported with proper certificate verification in production
- Use `DB_SSL=true` and optionally `DB_SSL_CA` for custom certificates
- Optimistic locking prevents race conditions during concurrent game moves

### Socket Authorization
- Only game participants can make moves, pass, resign, or mark dead stones
- Spectators can view games but cannot modify game state
- All state-modifying socket events are authorized server-side

### Optimistic Locking
Game state updates use version-based optimistic locking to prevent race conditions:
- Each game has a `version` column that increments on every update
- Updates include `WHERE version = currentVersion` to detect conflicts
- Failed updates are automatically retried up to 3 times with exponential backoff
- Users receive clear error messages if concurrent modifications persist

## Troubleshooting

### "FATAL: JWT_SECRET is required in production"
Generate a secure secret and set it as an environment variable:
```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### "Concurrent modification detected"
Multiple users or tabs are attempting to modify the same game simultaneously. The operation will be retried automatically. If the error persists, one of the moves will succeed while others are rejected.

### SSL Connection Errors
If using `DB_SSL=true` in production:
- Ensure your PostgreSQL server has SSL enabled
- For self-signed certificates, provide the CA certificate path via `DB_SSL_CA`
- In development, SSL verification is relaxed to allow self-signed certs

## Game Rules

This implementation uses **Chinese rules** by default:

- **Scoring**: Territory + stones on board + komi
- **Komi**: 7.5 points for white (compensates for black's first-move advantage)
- **Ko Rule**: Cannot immediately recapture a single stone that was just captured
- **Suicide**: Not allowed (a move that would leave your stones with no liberties is invalid, unless it captures opponent stones)

## License

MIT
