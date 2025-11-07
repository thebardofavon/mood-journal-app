/**
 * Update existing journal entries with enhanced mood detection
 * This script re-analyzes all entries and updates their mood field
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Open database (try both possible locations)
const possiblePaths = [
	join(__dirname, '..', 'data', 'app.db'),
	join(__dirname, '..', '.data', 'sqlite.db'),
	join(__dirname, '..', 'sqlite.db')
];

let dbPath = null;
for (const path of possiblePaths) {
	try {
		const fs = await import('fs');
		if (fs.existsSync(path)) {
			dbPath = path;
			break;
		}
	} catch (e) {
		// Continue checking
	}
}

if (!dbPath) {
	console.error('❌ Could not find database file in any of these locations:');
	possiblePaths.forEach(p => console.error(`   - ${p}`));
	process.exit(1);
}

console.log('📁 Database path:', dbPath);

let db;
try {
	db = new Database(dbPath);
	console.log('✅ Database connected\n');
} catch (error) {
	console.error('❌ Failed to open database:', error.message);
	process.exit(1);
}

console.log('🔄 Starting mood update for existing entries...\n');

// Enhanced mood detection function (copied from nlp.ts)
function detectMood(text, sentimentScore) {
	const lowerText = text.toLowerCase();
	
	// Expanded keyword dictionaries
	const sadKeywords = [
		'sad', 'sadness', 'depressed', 'depression', 'hopeless', 'worthless',
		'lonely', 'alone', 'crying', 'cry', 'tears', 'hurt', 'pain', 'miserable',
		'devastated', 'heartbroken', 'grief', 'sorrow', 'unhappy', 'down', 'low'
	];
	
	const anxiousKeywords = [
		'anxious', 'anxiety', 'worried', 'worry', 'nervous', 'panic', 'scared', 
		'fear', 'afraid', 'terrified', 'uneasy', 'tense', 'restless', 'overwhelmed'
	];
	
	const stressedKeywords = [
		'stressed', 'stress', 'overwhelmed', 'pressure', 'deadline', 'busy', 
		'exhausted', 'tired', 'drained', 'burnt out', 'burnout', 'overworked',
		'swamped', 'hectic', 'chaotic'
	];
	
	const excitedKeywords = [
		'excited', 'excitement', 'thrilled', 'amazing', 'awesome', 'incredible', 
		'fantastic', 'wonderful', 'great news', 'can\'t wait', 'looking forward',
		'pumped', 'stoked', 'enthusiastic'
	];
	
	const calmKeywords = [
		'calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'content', 
		'at peace', 'centered', 'balanced', 'grounded', 'meditat', 'zen',
		'composed', 'settled'
	];
	
	const angryKeywords = [
		'angry', 'anger', 'furious', 'mad', 'frustrated', 'annoyed', 'irritated', 
		'rage', 'outraged', 'infuriated', 'pissed', 'upset', 'livid', 'enraged'
	];
	
	const happyKeywords = [
		'happy', 'happiness', 'joy', 'joyful', 'glad', 'delighted', 'pleased',
		'grateful', 'thankful', 'blessed', 'cheerful', 'content', 'satisfied',
		'great day', 'wonderful', 'excellent', 'good day', 'productive'
	];
	
	// Count matches
	let counts = {
		sad: sadKeywords.filter(k => lowerText.includes(k)).length,
		anxious: anxiousKeywords.filter(k => lowerText.includes(k)).length,
		stressed: stressedKeywords.filter(k => lowerText.includes(k)).length,
		excited: excitedKeywords.filter(k => lowerText.includes(k)).length,
		calm: calmKeywords.filter(k => lowerText.includes(k)).length,
		angry: angryKeywords.filter(k => lowerText.includes(k)).length,
		happy: happyKeywords.filter(k => lowerText.includes(k)).length
	};
	
	// Find top mood
	let topMood = 'neutral';
	let topScore = 0;
	
	for (const [mood, score] of Object.entries(counts)) {
		if (score > topScore) {
			topScore = score;
			topMood = mood;
		}
	}
	
	// If keywords found, use them
	if (topScore >= 1) {
		// Validate positive moods against negative sentiment
		if ((topMood === 'excited' || topMood === 'calm' || topMood === 'happy') && sentimentScore < -50) {
			return 'sad';
		}
		return topMood;
	}
	
	// Fall back to sentiment
	if (sentimentScore > 30) return 'happy';
	if (sentimentScore < -30) return 'sad';
	return 'neutral';
}

// Get all entries
const entries = db.prepare('SELECT id, content, sentiment_score FROM entry').all();

console.log(`Found ${entries.length} entries to update\n`);

let updated = 0;
let skipped = 0;

// Update each entry
const updateStmt = db.prepare('UPDATE entry SET mood = ? WHERE id = ?');

for (const entry of entries) {
	const oldMood = db.prepare('SELECT mood FROM entry WHERE id = ?').get(entry.id)?.mood;
	const sentimentScore = entry.sentiment_score || 0;
	const newMood = detectMood(entry.content, sentimentScore);
	
	if (oldMood !== newMood) {
		updateStmt.run(newMood, entry.id);
		console.log(`✅ Updated: "${entry.content.substring(0, 40)}..." | ${oldMood} → ${newMood}`);
		updated++;
	} else {
		skipped++;
	}
}

console.log(`\n✨ Update complete!`);
console.log(`   ${updated} entries updated`);
console.log(`   ${skipped} entries unchanged`);

db.close();
