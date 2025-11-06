# RAG (Retrieval-Augmented Generation) Implementation

This mood journal app now includes RAG functionality to provide more personalized and contextually relevant AI companion responses.

## How it works

1. **Embedding Generation**: When you create new journal entries, the system automatically generates vector embeddings using OpenAI's `text-embedding-3-small` model (or local Ollama models).

2. **Semantic Search**: When you chat with the AI companion, the system retrieves the 3 most semantically similar past journal entries based on your current message.

3. **Augmented Context**: The retrieved entries are included in the AI's context, allowing it to provide more personalized insights and recognize patterns across your journaling history.

## Features

- **Automatic Embedding**: New entries are automatically embedded for future retrieval
- **Multi-Provider Support**: Works with OpenAI, Groq, Gemini, and local Ollama models
- **Privacy-First**: Embeddings are stored locally in your database
- **Fallback Handling**: If embedding generation fails, the chat still works with basic context

## Backfilling Existing Entries

To generate embeddings for existing journal entries, run:

```bash
npm run backfill-embeddings
```

**Current Status**: The backfill script is ready but requires either:

- AI API keys configured (OpenAI, Groq, or Gemini)
- Ollama running with an embedding model: `ollama pull nomic-embed-text`

## Technical Details

- **Vector Storage**: Embeddings are stored as JSON arrays in SQLite
- **Similarity Search**: Uses cosine similarity for efficient retrieval
- **Model**: `text-embedding-3-small` for OpenAI, `nomic-embed-text` for Ollama
- **Context Window**: Retrieves top 3 most similar entries per query

## Database Schema

New table: `entry_embedding`

- `entry_id`: References the journal entry
- `embedding`: JSON array of float values
- `embedding_model`: Model used to generate the embedding
- `created_at/updated_at`: Timestamps

The RAG system enhances the AI companion by providing it with relevant historical context, making conversations more meaningful and personalized.
