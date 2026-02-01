import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

// Test users with predefined ratings for leaderboard testing
const testUsers = [
  { id: '11111111-1111-1111-1111-111111111111', username: 'alice', email: 'alice@example.com', rating: 1500, passwordKey: 'password123' },
  { id: '22222222-2222-2222-2222-222222222222', username: 'bob', email: 'bob@example.com', rating: 1500, passwordKey: 'password123' },
  { id: '33333333-3333-3333-3333-333333333333', username: 'dj_maniac', email: 'nikita.kolotilo@gmail.com', rating: 1500, passwordKey: 'qweqwe33' },
  { id: '44444444-4444-4444-4444-444444444444', username: 'ninja', email: 'test@test.com', rating: 1500, passwordKey: 'qweqwe33' },
  { id: '55555555-5555-5555-5555-555555555555', username: 'player5', email: 'player5@example.com', rating: 800, passwordKey: 'password123' },
  { id: '66666666-6666-6666-6666-666666666666', username: 'player6', email: 'player6@example.com', rating: 950, passwordKey: 'password123' },
  { id: '77777777-7777-7777-7777-777777777777', username: 'player7', email: 'player7@example.com', rating: 1100, passwordKey: 'password123' },
  { id: '88888888-8888-8888-8888-888888888888', username: 'player8', email: 'player8@example.com', rating: 1200, passwordKey: 'password123' },
  { id: '99999999-9999-9999-9999-999999999999', username: 'player9', email: 'player9@example.com', rating: 1300, passwordKey: 'password123' },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', username: 'player10', email: 'player10@example.com', rating: 1400, passwordKey: 'password123' },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', username: 'player11', email: 'player11@example.com', rating: 1450, passwordKey: 'password123' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', username: 'player12', email: 'player12@example.com', rating: 1550, passwordKey: 'password123' },
  { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', username: 'player13', email: 'player13@example.com', rating: 1600, passwordKey: 'password123' },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', username: 'player14', email: 'player14@example.com', rating: 1650, passwordKey: 'password123' },
  { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', username: 'player15', email: 'player15@example.com', rating: 1700, passwordKey: 'password123' },
  { id: '10101010-1010-1010-1010-101010101010', username: 'player16', email: 'player16@example.com', rating: 1800, passwordKey: 'password123' },
  { id: '20202020-2020-2020-2020-202020202020', username: 'player17', email: 'player17@example.com', rating: 1900, passwordKey: 'password123' },
  { id: '30303030-3030-3030-3030-303030303030', username: 'player18', email: 'player18@example.com', rating: 2000, passwordKey: 'password123' },
  { id: '40404040-4040-4040-4040-404040404040', username: 'player19', email: 'player19@example.com', rating: 2100, passwordKey: 'password123' },
  { id: '50505050-5050-5050-5050-505050505050', username: 'player20', email: 'player20@example.com', rating: 2200, passwordKey: 'password123' },
];

async function seed() {
  console.log('Starting database seeding...');

  // Create password hashes
  const passwords: Record<string, string> = {
    'password123': await bcrypt.hash('password123', 10),
    'qweqwe33': await bcrypt.hash('qweqwe33', 10),
  };

  // Insert all users
  for (const user of testUsers) {
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, rating)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET rating = $5
    `, [user.id, user.username, user.email, passwords[user.passwordKey], user.rating]);
  }

  console.log(`Created/updated ${testUsers.length} test users:`);
  console.log('  - alice@example.com / bob@example.com (password: password123)');
  console.log('  - nikita.kolotilo@gmail.com (dj_maniac) / test@test.com (ninja) (password: qweqwe33)');
  console.log('  - player5-player20 (password: password123) - ratings from 800 to 2200');

  console.log('Seeding completed');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
