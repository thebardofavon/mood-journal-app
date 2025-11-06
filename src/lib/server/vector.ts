/**
 * Vector operations for RAG implementation
 */

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error('Vectors must have the same length');
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	if (normA === 0 || normB === 0) {
		return 0;
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Parse embedding from JSON string
 */
export function parseEmbedding(embeddingJson: string): number[] {
	try {
		const parsed = JSON.parse(embeddingJson);
		if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === 'number')) {
			throw new Error('Invalid embedding format');
		}
		return parsed;
	} catch (error) {
		throw new Error(
			`Failed to parse embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Serialize embedding to JSON string
 */
export function serializeEmbedding(embedding: number[]): string {
	return JSON.stringify(embedding);
}

/**
 * Find the most similar vectors using cosine similarity
 */
export function findMostSimilar(
	queryEmbedding: number[],
	embeddings: Array<{ id: string; embedding: number[]; similarity?: number }>,
	limit: number = 5
): Array<{ id: string; similarity: number }> {
	const results = embeddings.map((item) => ({
		id: item.id,
		similarity: cosineSimilarity(queryEmbedding, item.embedding)
	}));

	// Sort by similarity (descending) and take top results
	return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}
