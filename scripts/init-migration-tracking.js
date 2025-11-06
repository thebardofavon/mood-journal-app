import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('mood_journal.db');

console.log('Creating __drizzle_migrations table...');

// Create the migrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Read all migrations from the journal
const journalPath = './drizzle/meta/_journal.json';
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

console.log(`\nMarking ${journal.entries.length} migrations as applied...`);

const now = Date.now();

// Insert each migration
for (const entry of journal.entries) {
	db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(
		entry.tag,
		entry.when
	);
	console.log(`✓ ${entry.tag}`);
}

console.log('\n=== Migration Status ===');
const migrations = db.prepare('SELECT * FROM __drizzle_migrations ORDER BY created_at').all();
console.log(`Total migrations recorded: ${migrations.length}`);

db.close();
console.log('\n✅ Migration tracking initialized successfully!');
