import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

async function seed() {
  console.log('Starting database seeding...');

  // Create test users
  const password123 = await bcrypt.hash('password123', 10);
  const qweqwe33 = await bcrypt.hash('qweqwe33', 10);

  await pool.query(`
    INSERT INTO users (id, username, email, password_hash, rating)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'alice', 'alice@example.com', $1, 1500),
      ('22222222-2222-2222-2222-222222222222', 'bob', 'bob@example.com', $1, 1500),
      ('33333333-3333-3333-3333-333333333333', 'dj_maniac', 'nikita.kolotilo@gmail.com', $2, 1500),
      ('44444444-4444-4444-4444-444444444444', 'ninja', 'test@test.com', $2, 1500)
    ON CONFLICT (email) DO NOTHING
  `, [password123, qweqwe33]);

  console.log('Created test users:');
  console.log('  - alice@example.com / bob@example.com (password: password123)');
  console.log('  - nikita.kolotilo@gmail.com (dj_maniac) / test@test.com (ninja) (password: qweqwe33)');

  console.log('Seeding completed');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
