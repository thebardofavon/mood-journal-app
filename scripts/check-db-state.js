import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL || './mood_journal.db';
const db = new Database(dbPath);

console.log('Checking database state...\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map((t) => t.name).join(', '));

// Check migrations
try {
	const migrations = db.prepare('SELECT * FROM __drizzle_migrations ORDER BY created_at').all();
	console.log('\nMigrations in database:', migrations.length);
	migrations.forEach((m) => {
		const date = new Date(m.created_at).toISOString();
		const hash = m.hash.substring(0, 50);
		console.log(`  ${date} - ${hash}...`);
	});
} catch (err) {
	console.log('\nNo __drizzle_migrations table found or error:', err.message);
}

db.close();
