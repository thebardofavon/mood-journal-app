import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL || './drizzle/db.sqlite';
const db = new Database(dbPath);

console.log('Database path:', dbPath);
console.log('\n=== All Tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach((t) => console.log('-', t.name));

console.log('\n=== Migration History ===');
try {
	const migrations = db.prepare('SELECT * FROM __drizzle_migrations ORDER BY created_at').all();
	if (migrations.length === 0) {
		console.log('No migrations recorded');
	} else {
		migrations.forEach((m) => {
			console.log(`- ${m.hash} (${new Date(m.created_at).toISOString()})`);
		});
	}
} catch (err) {
	console.log('No __drizzle_migrations table found');
}

db.close();
