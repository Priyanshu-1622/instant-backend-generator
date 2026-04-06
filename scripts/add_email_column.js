const Database = require('better-sqlite3');

const db = new Database('dev.db');

try {
  db.exec('ALTER TABLE "User" ADD COLUMN "email" TEXT');
  console.log('Added email column to User table.');
} catch (err) {
  console.error('Error adding column:', err.message);
}

db.close();
