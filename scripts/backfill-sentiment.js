/**
 * Backfill sentiment analysis for existing journal entries
 * Run with: node scripts/backfill-sentiment.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the database path from .env
const dbPath = join(__dirname, '../mood-journal.db');
console.log(`Opening database at: ${dbPath}`);

const db = new Database(dbPath);

// Simple lexicon-based sentiment analysis (same as in nlp.ts)
function analyzeSentimentSimple(text) {
	if (!text || text.trim().length < 3) {
		return { score: 0, label: 'NEUTRAL' };
	}

	const lowerText = text.toLowerCase();

	const positiveWords = [
		'happy', 'joy', 'love', 'excellent', 'good', 'great', 'wonderful', 'amazing',
		'fantastic', 'awesome', 'beautiful', 'best', 'better', 'grateful', 'thankful',
		'excited', 'thrilled', 'delighted', 'pleased', 'enjoy', 'enjoyed', 'fun',
		'nice', 'lovely', 'perfect', 'success', 'successful', 'accomplish', 'achieved',
		'proud', 'confidence', 'hopeful', 'optimistic', 'positive', 'blessed', 'calm',
		'peaceful', 'relaxed', 'comfortable', 'satisfied', 'smile', 'laugh', 'laughing'
	];

	const negativeWords = [
		'sad', 'angry', 'hate', 'terrible', 'bad', 'awful', 'horrible', 'worst',
		'disappointed', 'depressed', 'anxious', 'worried', 'stress', 'stressed',
		'frustrated', 'upset', 'unhappy', 'lonely', 'afraid', 'fear', 'scared',
		'nervous', 'pain', 'hurt', 'cry', 'crying', 'fail', 'failed', 'failure',
		'difficult', 'hard', 'struggle', 'struggling', 'overwhelming', 'overwhelmed',
		'tired', 'exhausted', 'sick', 'ill', 'weak', 'miserable', 'regret', 'guilt',
		'shame', 'embarrassed', 'rejected', 'worthless', 'helpless', 'hopeless',
		'angry', 'annoyed', 'irritated', 'mad', 'furious'
	];

	let positiveCount = 0;
	let negativeCount = 0;

	positiveWords.forEach((word) => {
		const regex = new RegExp(`\\b${word}\\b`, 'gi');
		const matches = lowerText.match(regex);
		if (matches) positiveCount += matches.length;
	});

	negativeWords.forEach((word) => {
		const regex = new RegExp(`\\b${word}\\b`, 'gi');
		const matches = lowerText.match(regex);
		if (matches) negativeCount += matches.length;
	});

	const totalWords = lowerText.split(/\s+/).length;
	const sentimentScore = ((positiveCount - negativeCount) / Math.max(totalWords, 1)) * 100;
	
	// Clamp between -100 and 100
	const clampedScore = Math.max(-100, Math.min(100, Math.round(sentimentScore * 20)));
	
	let label = 'NEUTRAL';
	if (clampedScore > 20) label = 'POSITIVE';
	else if (clampedScore < -20) label = 'NEGATIVE';

	return { score: clampedScore, label };
}

// Get all entries without sentiment analysis
const entries = db.prepare(`
	SELECT id, content, sentiment_score, sentiment_label 
	FROM entry 
	WHERE sentiment_score IS NULL OR sentiment_label IS NULL
`).all();

console.log(`Found ${entries.length} entries without sentiment analysis`);

if (entries.length === 0) {
	console.log('No entries to update!');
	process.exit(0);
}

// Update each entry
const updateStmt = db.prepare(`
	UPDATE entry 
	SET sentiment_score = ?, sentiment_label = ?
	WHERE id = ?
`);

let updated = 0;
for (const entry of entries) {
	const { score, label } = analyzeSentimentSimple(entry.content);
	updateStmt.run(score, label, entry.id);
	updated++;
	console.log(`Updated entry ${entry.id}: ${label} (${score})`);
}

console.log(`\n✅ Successfully updated ${updated} entries with sentiment analysis!`);
db.close();
