/* eslint-disable no-useless-escape */
import { env } from './env';

/**
 * Sentiment analysis result
 */
export type SentimentResult = {
	label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
	score: number; // Confidence score 0-1
	normalizedScore: number; // -1 (very negative) to +1 (very positive)
};

// Ollama configuration
const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL || 'http://localhost:11434';
const SENTIMENT_MODEL = env.OLLAMA_SENTIMENT_MODEL || 'gemma3:1b'; // Lightweight model for sentiment

/**
 * Check if Ollama is available for sentiment analysis
 */
async function checkOllamaAvailable(): Promise<boolean> {
	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		});
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Analyze sentiment using Ollama with fallback to lexicon-based approach
 * @param text - The text to analyze (journal entry content)
 * @returns Sentiment result with label, confidence score, and normalized score
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
	// Handle empty or very short text
	if (!text || text.trim().length < 3) {
		return {
			label: 'NEUTRAL',
			score: 0.5,
			normalizedScore: 0
		};
	}

	// Clean the text - remove markdown syntax for better analysis
	const cleanText = text
		.replace(/[#*_`~\[\]()]/g, '') // Remove markdown symbols
		.replace(/!\[.*?\]\(.*?\)/g, '') // Remove image links
		.replace(/\[.*?\]\(.*?\)/g, '') // Remove links
		.trim();

	if (cleanText.length < 3) {
		return {
			label: 'NEUTRAL',
			score: 0.5,
			normalizedScore: 0
		};
	}

	// Try Ollama first, fallback to lexicon-based analysis
	const isOllamaAvailable = await checkOllamaAvailable();

	if (isOllamaAvailable) {
		try {
			return await analyzeSentimentWithOllama(cleanText);
		} catch (error) {
			console.warn('Ollama sentiment analysis failed, falling back to lexicon:', error);
			return analyzeSentimentLexicon(cleanText);
		}
	}

	// Fallback to lexicon-based analysis
	return analyzeSentimentLexicon(cleanText);
}

/**
 * Analyze sentiment using Ollama
 */
async function analyzeSentimentWithOllama(text: string): Promise<SentimentResult> {
	const maxLength = 500;
	const textToAnalyze = text.length > maxLength ? text.substring(0, maxLength) : text;

	const prompt = `Analyze the sentiment of this text and respond with ONLY one word: POSITIVE, NEGATIVE, or NEUTRAL.

Text: "${textToAnalyze}"

Sentiment:`;

	const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: SENTIMENT_MODEL,
			prompt,
			stream: false,
			options: {
				temperature: 0.1,
				num_predict: 10
			}
		}),
		signal: AbortSignal.timeout(10000)
	});

	if (!response.ok) {
		throw new Error('Ollama request failed');
	}

	const data = await response.json();
	const result = data.response?.trim().toUpperCase() || '';

	// Parse the response
	let label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
	if (result.includes('POSITIVE')) {
		label = 'POSITIVE';
	} else if (result.includes('NEGATIVE')) {
		label = 'NEGATIVE';
	}

	// Estimate confidence based on lexicon as well
	const lexiconResult = analyzeSentimentLexicon(text);
	const score = Math.abs(lexiconResult.normalizedScore) > 0.3 ? 0.8 : 0.6;

	return {
		label,
		score,
		normalizedScore: label === 'POSITIVE' ? score : label === 'NEGATIVE' ? -score : 0
	};
}

/**
 * Fallback lexicon-based sentiment analysis
 * Uses a simple word-based approach with positive/negative word lists
 */
function analyzeSentimentLexicon(text: string): SentimentResult {
	const lowerText = text.toLowerCase();

	// Positive words
	const positiveWords = [
		'happy',
		'joy',
		'love',
		'excellent',
		'good',
		'great',
		'wonderful',
		'amazing',
		'fantastic',
		'awesome',
		'beautiful',
		'best',
		'better',
		'grateful',
		'thankful',
		'excited',
		'thrilled',
		'delighted',
		'pleased',
		'enjoy',
		'enjoyed',
		'fun',
		'nice',
		'lovely',
		'perfect',
		'success',
		'successful',
		'accomplish',
		'achieved',
		'proud',
		'confidence',
		'hopeful',
		'optimistic',
		'positive',
		'blessed',
		'calm',
		'peaceful',
		'relaxed',
		'comfortable',
		'satisfied',
		'smile',
		'laugh',
		'laughing'
	];

	// Negative words
	const negativeWords = [
		'sad',
		'angry',
		'hate',
		'terrible',
		'bad',
		'awful',
		'horrible',
		'worst',
		'disappointed',
		'depressed',
		'anxious',
		'worried',
		'stress',
		'stressed',
		'frustrated',
		'annoyed',
		'upset',
		'hurt',
		'pain',
		'painful',
		'difficult',
		'hard',
		'struggle',
		'struggling',
		'fail',
		'failed',
		'failure',
		'lost',
		'miss',
		'lonely',
		'alone',
		'cry',
		'crying',
		'tears',
		'unhappy',
		'miserable',
		'scared',
		'fear',
		'afraid',
		'nervous',
		'overwhelmed',
		'exhausted',
		'tired',
		'sick'
	];

	// Count occurrences
	let positiveCount = 0;
	let negativeCount = 0;

	const words = lowerText.split(/\W+/);
	words.forEach((word) => {
		if (positiveWords.includes(word)) positiveCount++;
		if (negativeWords.includes(word)) negativeCount++;
	});

	// Calculate sentiment
	const total = positiveCount + negativeCount;

	if (total === 0) {
		return {
			label: 'NEUTRAL',
			score: 0.5,
			normalizedScore: 0
		};
	}

	const positiveRatio = positiveCount / total;
	const negativeRatio = negativeCount / total;

	let label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
	let normalizedScore: number;

	if (positiveRatio > 0.6) {
		label = 'POSITIVE';
		normalizedScore = Math.min(positiveRatio, 0.95);
	} else if (negativeRatio > 0.6) {
		label = 'NEGATIVE';
		normalizedScore = -Math.min(negativeRatio, 0.95);
	} else {
		label = 'NEUTRAL';
		normalizedScore = positiveRatio - negativeRatio;
	}

	const score = Math.abs(normalizedScore);

	return {
		label,
		score: Math.max(0.5, score), // Minimum confidence of 0.5
		normalizedScore
	};
}

/**
 * Get emoji representation of sentiment
 */
export function getSentimentEmoji(label: string): string {
	switch (label) {
		case 'POSITIVE':
			return '😊';
		case 'NEGATIVE':
			return '😔';
		default:
			return '😐';
	}
}

/**
 * Get color class for sentiment visualization
 */
export function getSentimentColor(normalizedScore: number): string {
	if (normalizedScore > 0.3) return 'text-green-500';
	if (normalizedScore < -0.3) return 'text-red-500';
	return 'text-yellow-500';
}

/**
 * Detect specific mood from text content using keyword analysis
 * Returns a more nuanced mood classification than just positive/negative/neutral
 */
export function detectMood(text: string, sentimentScore: number): string {
	const lowerText = text.toLowerCase();
	
	// Expanded keyword dictionaries for different moods
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
	
	// Count keyword matches
	let sadCount = 0;
	let anxiousCount = 0;
	let stressedCount = 0;
	let excitedCount = 0;
	let calmCount = 0;
	let angryCount = 0;
	let happyCount = 0;
	
	sadKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) sadCount++;
	});
	
	anxiousKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) anxiousCount++;
	});
	
	stressedKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) stressedCount++;
	});
	
	excitedKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) excitedCount++;
	});
	
	calmKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) calmCount++;
	});
	
	angryKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) angryCount++;
	});
	
	happyKeywords.forEach(keyword => {
		if (lowerText.includes(keyword)) happyCount++;
	});
	
	// Determine the dominant specific mood
	const moodScores = [
		{ mood: 'sad', score: sadCount },
		{ mood: 'anxious', score: anxiousCount },
		{ mood: 'stressed', score: stressedCount },
		{ mood: 'excited', score: excitedCount },
		{ mood: 'calm', score: calmCount },
		{ mood: 'angry', score: angryCount },
		{ mood: 'happy', score: happyCount }
	];
	
	// Sort by score descending
	moodScores.sort((a, b) => b.score - a.score);
	
	// Debug logging
	console.log('🧠 [detectMood] Analysis:');
	console.log('   Text:', text.substring(0, 60));
	console.log('   Sentiment Score:', sentimentScore);
	console.log('   Keyword Counts:', {
		sad: sadCount,
		anxious: anxiousCount,
		stressed: stressedCount,
		excited: excitedCount,
		calm: calmCount,
		angry: angryCount,
		happy: happyCount
	});
	console.log('   Top Mood:', moodScores[0]);
	
	// If a specific mood has at least 1 keyword match, use it
	if (moodScores[0].score >= 1) {
		const topMood = moodScores[0].mood;
		
		// Validate alignment with sentiment for edge cases
		// Positive moods should align with positive sentiment
		if ((topMood === 'excited' || topMood === 'calm' || topMood === 'happy') && sentimentScore < -0.5) {
			// Strong negative sentiment overrides positive keyword
			return 'sad';
		}
		// Negative moods are generally reliable
		return topMood;
	}
	
	// Fall back to sentiment-based mood
	if (sentimentScore > 0.3) {
		return 'happy';
	} else if (sentimentScore < -0.3) {
		return 'sad';
	} else {
		return 'neutral';
	}
}

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
	'i',
	'me',
	'my',
	'myself',
	'we',
	'our',
	'ours',
	'ourselves',
	'you',
	'your',
	'yours',
	'yourself',
	'yourselves',
	'he',
	'him',
	'his',
	'himself',
	'she',
	'her',
	'hers',
	'herself',
	'it',
	'its',
	'itself',
	'they',
	'them',
	'their',
	'theirs',
	'themselves',
	'what',
	'which',
	'who',
	'whom',
	'this',
	'that',
	'these',
	'those',
	'am',
	'is',
	'are',
	'was',
	'were',
	'be',
	'been',
	'being',
	'have',
	'has',
	'had',
	'having',
	'do',
	'does',
	'did',
	'doing',
	'a',
	'an',
	'the',
	'and',
	'but',
	'if',
	'or',
	'because',
	'as',
	'until',
	'while',
	'of',
	'at',
	'by',
	'for',
	'with',
	'about',
	'against',
	'between',
	'into',
	'through',
	'during',
	'before',
	'after',
	'above',
	'below',
	'to',
	'from',
	'up',
	'down',
	'in',
	'out',
	'on',
	'off',
	'over',
	'under',
	'again',
	'further',
	'then',
	'once',
	'here',
	'there',
	'when',
	'where',
	'why',
	'how',
	'all',
	'both',
	'each',
	'few',
	'more',
	'most',
	'other',
	'some',
	'such',
	'no',
	'nor',
	'not',
	'only',
	'own',
	'same',
	'so',
	'than',
	'too',
	'very',
	's',
	't',
	'can',
	'will',
	'just',
	'don',
	'should',
	'now',
	'today',
	'yesterday',
	'tomorrow',
	'also',
	'im',
	'ive',
	'id',
	'ill',
	'youre',
	'youve',
	'youll',
	'youd',
	'hes',
	'shes',
	'its',
	'were',
	'theyre',
	'theyve',
	'theyll',
	'theyd',
	'whos',
	'whats',
	'wheres',
	'whens',
	'whys',
	'hows',
	'isnt',
	'arent',
	'wasnt',
	'werent',
	'hasnt',
	'havent',
	'hadnt',
	'doesnt',
	'dont',
	'didnt',
	'wont',
	'wouldnt',
	'shant',
	'shouldnt',
	'cant',
	'cannot',
	'couldnt',
	'mustnt',
	'lets',
	'thats',
	'whos',
	'heres',
	'theres'
]);

/**
 * Extract keywords from text using TF-IDF-inspired approach
 * @param text - The text to extract keywords from
 * @param maxKeywords - Maximum number of keywords to return (default: 5)
 * @returns Array of extracted keywords
 */
export function extractKeywords(text: string, maxKeywords: number = 5): string[] {
	if (!text || text.trim().length < 10) {
		return [];
	}

	// Clean the text - remove markdown, URLs, and special characters
	const cleanText = text
		.replace(/!\[.*?\]\(.*?\)/g, '') // Remove image links
		.replace(/\[.*?\]\(.*?\)/g, '') // Remove links
		.replace(/[#*_`~]/g, '') // Remove markdown symbols
		.replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
		.toLowerCase();

	// Tokenize: split into words
	const words = cleanText.split(/\W+/).filter(
		(word) =>
			word.length > 2 && // At least 3 characters
			!STOP_WORDS.has(word) && // Not a stop word
			!/^\d+$/.test(word) // Not just numbers
	);

	if (words.length === 0) {
		return [];
	}

	// Count word frequencies
	const wordFreq = new Map<string, number>();
	words.forEach((word) => {
		wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
	});

	// Calculate TF-IDF-like scores (simplified version)
	// Higher frequency = higher score, but penalize very common words
	const scores = new Map<string, number>();
	const totalWords = words.length;

	wordFreq.forEach((freq, word) => {
		// Term frequency (normalized)
		const tf = freq / totalWords;

		// Simplified IDF: boost words that appear 1-3 times more than very frequent words
		const idf = freq <= 3 ? 1.5 : 1.0 / Math.log(freq + 1);

		// Combined score
		scores.set(word, tf * idf * freq);
	});

	// Sort by score and return top keywords
	const sortedKeywords = Array.from(scores.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxKeywords)
		.map(([word]) => word);

	return sortedKeywords;
}

/**
 * Extract named entities (people, places, etc.) using simple pattern matching
 * This is a basic implementation - could be enhanced with an NER model
 * @param text - The text to extract entities from
 * @returns Array of extracted entities
 */
export function extractEntities(text: string): string[] {
	if (!text || text.trim().length < 10) {
		return [];
	}

	const entities = new Set<string>();

	// Pattern 1: Capitalized words (potential names/places)
	// Match 2-3 consecutive capitalized words
	const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
	const capitalizedMatches = text.matchAll(capitalizedPattern);

	for (const match of capitalizedMatches) {
		const entity = match[1];
		// Filter out sentence starts and common words
		if (
			entity.length > 2 &&
			!entity.match(
				/^(The|This|That|Today|Tomorrow|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)/
			)
		) {
			entities.add(entity);
		}
	}

	// Pattern 2: Quoted names/places
	const quotedPattern = /"([^"]+)"/g;
	const quotedMatches = text.matchAll(quotedPattern);

	for (const match of quotedMatches) {
		if (match[1].length > 2 && match[1].length < 50) {
			entities.add(match[1]);
		}
	}

	return Array.from(entities).slice(0, 10); // Limit to 10 entities
}

/**
 * Combined analysis result including sentiment and keywords
 */
export type FullAnalysisResult = {
	sentiment: SentimentResult;
	keywords: string[];
	entities: string[];
};

/**
 * Perform full NLP analysis on text
 * @param text - The text to analyze
 * @returns Complete analysis with sentiment, keywords, and entities
 */
export async function analyzeText(text: string): Promise<FullAnalysisResult> {
	const [sentiment, keywords, entities] = await Promise.all([
		analyzeSentiment(text),
		Promise.resolve(extractKeywords(text, 5)),
		Promise.resolve(extractEntities(text))
	]);

	return {
		sentiment,
		keywords,
		entities
	};
}

/**
 * Topic modeling - discover themes across multiple entries
 */
export type Topic = {
	id: string;
	name: string;
	keywords: string[];
	entryCount: number;
	averageSentiment: number;
};

/**
 * Discover topics from a collection of entries using keyword co-occurrence
 * @param entries - Array of entries with keywords
 * @returns Array of discovered topics
 */
export function discoverTopics(
	entries: Array<{ keywords: string[]; sentiment?: number }>
): Topic[] {
	if (entries.length < 3) return [];

	// Build co-occurrence matrix
	const coOccurrence = new Map<string, Map<string, number>>();
	const keywordSentiments = new Map<string, { sum: number; count: number }>();

	entries.forEach((entry) => {
		const keywords = entry.keywords || [];
		const sentiment = entry.sentiment || 0;

		// Track keyword co-occurrences
		for (let i = 0; i < keywords.length; i++) {
			const word1 = keywords[i];

			if (!coOccurrence.has(word1)) {
				coOccurrence.set(word1, new Map());
			}

			// Track sentiment for this keyword
			if (!keywordSentiments.has(word1)) {
				keywordSentiments.set(word1, { sum: 0, count: 0 });
			}
			const sentData = keywordSentiments.get(word1)!;
			sentData.sum += sentiment;
			sentData.count += 1;

			// Record co-occurrences
			for (let j = i + 1; j < keywords.length; j++) {
				const word2 = keywords[j];
				const coMap = coOccurrence.get(word1)!;
				coMap.set(word2, (coMap.get(word2) || 0) + 1);
			}
		}
	});

	// Find keyword clusters (topics)
	const usedKeywords = new Set<string>();
	const topics: Topic[] = [];
	let topicId = 1;

	// Sort keywords by frequency
	const sortedKeywords = Array.from(keywordSentiments.entries())
		.sort((a, b) => b[1].count - a[1].count)
		.map(([word]) => word);

	for (const seedWord of sortedKeywords) {
		if (usedKeywords.has(seedWord)) continue;

		// Find words that co-occur frequently with seed word
		const coWords = coOccurrence.get(seedWord);
		if (!coWords) continue;

		const relatedWords = Array.from(coWords.entries())
			.filter(([word, count]) => !usedKeywords.has(word) && count >= 2)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4)
			.map(([word]) => word);

		if (relatedWords.length >= 2) {
			const topicWords = [seedWord, ...relatedWords];
			topicWords.forEach((w) => usedKeywords.add(w));

			// Calculate average sentiment for this topic
			const sentiments = topicWords
				.map((w) => keywordSentiments.get(w))
				.filter((s) => s !== undefined);

			const avgSentiment =
				sentiments.length > 0
					? Math.round(sentiments.reduce((sum, s) => sum + s.sum / s.count, 0) / sentiments.length)
					: 0;

			const entryCount = Math.max(...sentiments.map((s) => s.count));

			topics.push({
				id: `topic-${topicId++}`,
				name: generateTopicName(topicWords),
				keywords: topicWords,
				entryCount,
				averageSentiment: avgSentiment
			});
		}

		if (topics.length >= 8) break; // Limit to 8 topics
	}

	return topics;
}

/**
 * Generate a human-readable name for a topic based on keywords
 */
function generateTopicName(keywords: string[]): string {
	// Capitalize first word
	const mainWord = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);

	if (keywords.length === 1) return mainWord;
	if (keywords.length === 2) return `${mainWord} & ${keywords[1]}`;

	// Group by common themes
	const workKeywords = ['work', 'meeting', 'project', 'team', 'office', 'job'];
	const familyKeywords = ['family', 'mom', 'dad', 'sister', 'brother', 'kids'];
	const healthKeywords = ['health', 'exercise', 'gym', 'fitness', 'running'];
	const creativityKeywords = ['music', 'art', 'writing', 'creative', 'book'];

	const hasWork = keywords.some((k) => workKeywords.includes(k.toLowerCase()));
	const hasFamily = keywords.some((k) => familyKeywords.includes(k.toLowerCase()));
	const hasHealth = keywords.some((k) => healthKeywords.includes(k.toLowerCase()));
	const hasCreativity = keywords.some((k) => creativityKeywords.includes(k.toLowerCase()));

	if (hasWork) return 'Work & Career';
	if (hasFamily) return 'Family & Relationships';
	if (hasHealth) return 'Health & Wellness';
	if (hasCreativity) return 'Creative Pursuits';

	return `${mainWord} & More`;
}

/**
 * Calculate cosine similarity between two keyword vectors
 */
export function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
	if (keywords1.length === 0 || keywords2.length === 0) return 0;

	const set1 = new Set(keywords1);
	const set2 = new Set(keywords2);

	// Jaccard similarity (simple and effective for keyword sets)
	const intersection = new Set([...set1].filter((x) => set2.has(x)));
	const union = new Set([...set1, ...set2]);

	return intersection.size / union.size;
}

/**
 * Find similar entries based on keyword similarity
 * @param targetKeywords - Keywords from the target entry
 * @param allEntries - All entries with their keywords
 * @param limit - Maximum number of similar entries to return
 * @returns Array of similar entries with similarity scores
 */
export function findSimilarEntries(
	targetKeywords: string[],
	allEntries: Array<{ id: string; keywords: string[]; content: string; created_at: Date }>,
	limit: number = 5
): Array<{ id: string; similarity: number; preview: string }> {
	if (targetKeywords.length === 0 || allEntries.length === 0) return [];

	const similarities = allEntries.map((entry) => ({
		id: entry.id,
		similarity: calculateSimilarity(targetKeywords, entry.keywords),
		preview: entry.content.slice(0, 100) + (entry.content.length > 100 ? '...' : ''),
		date: entry.created_at
	}));

	return similarities
		.filter((s) => s.similarity > 0.2) // Minimum 20% similarity
		.sort((a, b) => b.similarity - a.similarity)
		.slice(0, limit);
}

/**
 * Cognitive distortion types (from CBT)
 */
export type DistortionType =
	| 'all-or-nothing'
	| 'overgeneralization'
	| 'mental-filter'
	| 'disqualifying-positive'
	| 'jumping-to-conclusions'
	| 'magnification'
	| 'emotional-reasoning'
	| 'should-statements'
	| 'labeling'
	| 'personalization';

export type CognitiveDistortion = {
	type: DistortionType;
	label: string;
	confidence: number;
	excerpt: string; // The text snippet showing the distortion
	explanation: string;
};

export type ReframingResult = {
	distortions: CognitiveDistortion[];
	reframes: string[];
	socratics: string[];
	positiveAnchors: string[];
};

/**
 * Detect cognitive distortions in journal text using pattern matching and LLM
 */
export async function detectCognitiveDistortions(text: string): Promise<CognitiveDistortion[]> {
	if (!text || text.trim().length < 10) {
		return [];
	}

	const distortions: CognitiveDistortion[] = [];

	// Pattern-based detection for common distortions
	const lowerText = text.toLowerCase();
	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);

	// All-or-nothing thinking patterns
	const allOrNothingPatterns = [
		/\b(always|never|every|all|nothing|no one|everyone)\b/i,
		/\b(completely|totally|absolutely|entirely)\s+(failed|ruined|destroyed|perfect)/i
	];

	for (const sentence of sentences) {
		for (const pattern of allOrNothingPatterns) {
			if (pattern.test(sentence)) {
				distortions.push({
					type: 'all-or-nothing',
					label: 'All-or-Nothing Thinking',
					confidence: 0.7,
					excerpt: sentence.trim().slice(0, 100),
					explanation: 'Viewing situations in black-and-white categories without middle ground.'
				});
				break;
			}
		}
	}

	// Overgeneralization patterns
	const overgenPatterns = [
		/\b(always happens?|never works?|every time|typical)\b/i,
		/\b(again|once again)\b/i
	];

	for (const sentence of sentences) {
		for (const pattern of overgenPatterns) {
			if (pattern.test(sentence) && sentence.toLowerCase().includes('never')) {
				distortions.push({
					type: 'overgeneralization',
					label: 'Overgeneralization',
					confidence: 0.65,
					excerpt: sentence.trim().slice(0, 100),
					explanation: 'Drawing broad conclusions from a single event or limited evidence.'
				});
				break;
			}
		}
	}

	// Should statements
	const shouldPatterns = [/\b(should|shouldn't|ought to|must|have to|need to|supposed to)\b/i];

	let shouldCount = 0;
	for (const sentence of sentences) {
		for (const pattern of shouldPatterns) {
			if (pattern.test(sentence)) {
				shouldCount++;
				if (shouldCount === 1) {
					distortions.push({
						type: 'should-statements',
						label: 'Should Statements',
						confidence: 0.6,
						excerpt: sentence.trim().slice(0, 100),
						explanation: 'Using "should" or "must" statements can create guilt and pressure.'
					});
				}
				break;
			}
		}
	}

	// Catastrophizing (magnification)
	const catastrophePatterns = [
		/\b(disaster|catastrophe|terrible|awful|worst|horrible|ruined)\b/i,
		/\b(can't stand|unbearable|intolerable)\b/i
	];

	for (const sentence of sentences) {
		for (const pattern of catastrophePatterns) {
			if (pattern.test(sentence)) {
				distortions.push({
					type: 'magnification',
					label: 'Catastrophizing',
					confidence: 0.68,
					excerpt: sentence.trim().slice(0, 100),
					explanation: 'Magnifying negatives and expecting the worst-case scenario.'
				});
				break;
			}
		}
	}

	// Emotional reasoning
	const emotionalPatterns = [
		/\b(feel|felt|feeling)\s+(like|that).+\b(therefore|so|must be)\b/i,
		/because\s+i\s+feel/i
	];

	for (const sentence of sentences) {
		for (const pattern of emotionalPatterns) {
			if (pattern.test(sentence)) {
				distortions.push({
					type: 'emotional-reasoning',
					label: 'Emotional Reasoning',
					confidence: 0.62,
					excerpt: sentence.trim().slice(0, 100),
					explanation: 'Assuming that feelings reflect reality ("I feel it, so it must be true").'
				});
				break;
			}
		}
	}

	// Try LLM-based detection if Ollama is available (for more nuanced detection)
	const isOllamaAvailable = await checkOllamaAvailable();
	if (isOllamaAvailable && distortions.length < 3) {
		try {
			const llmDistortions = await detectDistortionsWithLLM(text);
			distortions.push(...llmDistortions);
		} catch (error) {
			console.warn('LLM distortion detection failed:', error);
		}
	}

	// Remove duplicates and sort by confidence
	const uniqueDistortions = Array.from(new Map(distortions.map((d) => [d.type, d])).values()).sort(
		(a, b) => b.confidence - a.confidence
	);

	return uniqueDistortions.slice(0, 5); // Return top 5
}

/**
 * LLM-based distortion detection for more nuanced analysis
 */
async function detectDistortionsWithLLM(text: string): Promise<CognitiveDistortion[]> {
	const maxLength = 400;
	const textToAnalyze = text.length > maxLength ? text.substring(0, maxLength) : text;

	const prompt = `Analyze this journal entry for cognitive distortions. List any you find from: all-or-nothing, overgeneralization, catastrophizing, should-statements, emotional-reasoning.

Text: "${textToAnalyze}"

List the distortions found (comma-separated) or "none":`;

	const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: SENTIMENT_MODEL,
			prompt,
			stream: false,
			options: {
				temperature: 0.2,
				num_predict: 50
			}
		}),
		signal: AbortSignal.timeout(8000)
	});

	if (!response.ok) {
		throw new Error('Ollama request failed');
	}

	const data = await response.json();
	const result = data.response?.trim().toLowerCase() || '';

	const distortions: CognitiveDistortion[] = [];

	if (result.includes('all-or-nothing') || result.includes('black')) {
		distortions.push({
			type: 'all-or-nothing',
			label: 'All-or-Nothing Thinking',
			confidence: 0.75,
			excerpt: textToAnalyze.slice(0, 100),
			explanation: 'Viewing situations in extremes without middle ground.'
		});
	}

	if (result.includes('overgeneralization')) {
		distortions.push({
			type: 'overgeneralization',
			label: 'Overgeneralization',
			confidence: 0.73,
			excerpt: textToAnalyze.slice(0, 100),
			explanation: 'Drawing broad conclusions from limited evidence.'
		});
	}

	if (result.includes('catastroph')) {
		distortions.push({
			type: 'magnification',
			label: 'Catastrophizing',
			confidence: 0.72,
			excerpt: textToAnalyze.slice(0, 100),
			explanation: 'Expecting the worst-case scenario.'
		});
	}

	return distortions;
}

/**
 * Generate reframing suggestions for detected distortions
 */
export function generateReframes(
	distortions: CognitiveDistortion[],
	text: string
): ReframingResult {
	const reframes: string[] = [];
	const socratics: string[] = [];

	for (const distortion of distortions) {
		switch (distortion.type) {
			case 'all-or-nothing':
				reframes.push(
					'Consider: What shades of gray exist between these extremes? What partial successes or progress have you made?'
				);
				socratics.push('What evidence supports a more balanced view of this situation?');
				break;

			case 'overgeneralization':
				reframes.push(
					'Reframe: This is one situation, not a pattern. What other times have things worked differently?'
				);
				socratics.push(
					'Can you think of exceptions to this pattern? What makes this specific instance unique?'
				);
				break;

			case 'magnification':
				reframes.push(
					"Reality check: In a year, how much will this matter? What's the most likely outcome, not the worst?"
				);
				socratics.push(
					"If a friend told you this, what would you say? What's a realistic assessment?"
				);
				break;

			case 'should-statements':
				reframes.push(
					'Replace "should" with "I prefer" or "it would be nice if." Remove pressure and guilt.'
				);
				socratics.push(
					'Who says it "should" be this way? What would be a more flexible expectation?'
				);
				break;

			case 'emotional-reasoning':
				reframes.push(
					"Separate feelings from facts: Just because you feel something doesn't make it objectively true."
				);
				socratics.push(
					'What objective evidence exists beyond this feeling? What would an outside observer see?'
				);
				break;

			default:
				reframes.push('Try viewing this situation from a different angle or perspective.');
				socratics.push('What alternative explanations exist for what happened?');
		}
	}

	// Extract positive anchors (positive statements to remember)
	const positiveAnchors = extractPositiveAnchors(text);

	return {
		distortions,
		reframes: [...new Set(reframes)].slice(0, 3),
		socratics: [...new Set(socratics)].slice(0, 3),
		positiveAnchors
	};
}

/**
 * Extract positive evidence statements from text
 */
function extractPositiveAnchors(text: string): string[] {
	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
	const anchors: string[] = [];

	const positivePatterns = [
		/\b(grateful|thankful|appreciate|accomplished|proud|success|achieved|happy|joy)\b/i,
		/\b(better|improved|progress|growing|learned|realized)\b/i,
		/\b(love|care|support|help|friend|family)\b/i
	];

	for (const sentence of sentences) {
		for (const pattern of positivePatterns) {
			if (pattern.test(sentence)) {
				anchors.push(sentence.trim());
				break;
			}
		}
	}

	return anchors.slice(0, 3);
}
