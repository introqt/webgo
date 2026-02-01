import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

async function seed() {
  console.log('Starting database seeding...');

  // Create test users
  const password = await bcrypt.hash('password123', 10);

  await pool.query(`
    INSERT INTO users (id, username, email, password_hash, rating)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'alice', 'alice@example.com', $1, 1500),
      ('22222222-2222-2222-2222-222222222222', 'bob', 'bob@example.com', $1, 1500)
    ON CONFLICT (email) DO NOTHING
  `, [password]);

  console.log('Created test users: alice@example.com, bob@example.com (password: password123)');

  console.log('Seeding completed');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
