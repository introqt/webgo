import { pool } from '../config/database.js';

const migrations = [
  {
    name: '001_create_users',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rating INTEGER DEFAULT 1500,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `,
  },
  {
    name: '002_create_games',
    up: `
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_size INTEGER NOT NULL CHECK (board_size IN (9, 13, 19)),
        black_player_id UUID REFERENCES users(id),
        white_player_id UUID REFERENCES users(id),
        game_state JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'waiting',
        handicap INTEGER DEFAULT 0,
        komi DECIMAL(4,1) DEFAULT 7.5,
        rule_set VARCHAR(20) DEFAULT 'chinese',
        invitation_code VARCHAR(8) UNIQUE NOT NULL,
        winner VARCHAR(10),
        win_reason VARCHAR(20),
        final_score JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_games_invitation_code ON games(invitation_code);
      CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
      CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
      CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    `,
  },
  {
    name: '003_create_moves',
    up: `
      CREATE TABLE IF NOT EXISTS moves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES users(id),
        move_number INTEGER NOT NULL,
        color VARCHAR(5) NOT NULL,
        position JSONB,
        captured_stones JSONB DEFAULT '[]',
        is_pass BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id, move_number);
    `,
  },
  {
    name: '004_create_sessions',
    up: `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    `,
  },
  {
    name: '005_add_game_version',
    up: `
      ALTER TABLE games ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_games_version ON games(version);
    `,
  },
  {
    name: '006_create_score_acceptances',
    up: `
      CREATE TABLE IF NOT EXISTS score_acceptances (
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (game_id, player_id)
      );
      CREATE INDEX IF NOT EXISTS idx_score_acceptances_game ON score_acceptances(game_id);
    `,
  },
  {
    name: '007_add_game_rating_changes',
    up: `
      CREATE TABLE IF NOT EXISTS game_rating_changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating_before INTEGER NOT NULL,
        rating_after INTEGER NOT NULL,
        rating_change INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(game_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_game_rating_changes_user ON game_rating_changes(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_rating_changes_game ON game_rating_changes(game_id);
    `,
  },
  {
    name: '008_add_deleted_at_to_games',
    up: `
      ALTER TABLE games ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      CREATE INDEX IF NOT EXISTS idx_games_deleted_at ON games(deleted_at) WHERE deleted_at IS NULL;
      COMMENT ON COLUMN games.deleted_at IS 'Timestamp when game was soft-deleted (NULL = not deleted)';
    `,
  },
];

async function migrate() {
  console.log('Starting database migration...');

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      name VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Get executed migrations
  const { rows: executed } = await pool.query<{ name: string }>(
    'SELECT name FROM migrations'
  );
  const executedNames = new Set(executed.map((r) => r.name));

  // Run pending migrations
  for (const migration of migrations) {
    if (executedNames.has(migration.name)) {
      console.log(`Skipping ${migration.name} (already executed)`);
      continue;
    }

    console.log(`Running ${migration.name}...`);
    await pool.query(migration.up);
    await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
    console.log(`Completed ${migration.name}`);
  }

  console.log('Migration completed');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
