import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// User table
export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name'),
	username: text('username').notNull(),
	email: text('email').notNull(),
	emailVerified: integer('email_verified', { mode: 'timestamp' }),
	passwordHash: text('password_hash').notNull(),
	image: text('image'),
	avatarUrl: text('avatar_url'),
	failedAttempts: integer('failed_attempts').default(0).notNull(),
	lockedUntil: integer('locked_until', { mode: 'timestamp' }).default(new Date(0)).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// Session table (Auth.js-compatible)
export const session = sqliteTable('session', {
	sessionToken: text('session_token').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expires: integer('expires', { mode: 'timestamp' }).notNull()
});

// OAuth account links
export const account = sqliteTable(
	'account',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('provider_account_id').notNull(),
		refreshToken: text('refresh_token'),
		accessToken: text('access_token'),
		expiresAt: integer('expires_at'),
		tokenType: text('token_type'),
		scope: text('scope'),
		idToken: text('id_token'),
		sessionState: text('session_state')
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.provider, table.providerAccountId],
			name: 'account_provider_provider_account_id_pk'
		})
	})
);

// AI settings per user
export const aiSettings = sqliteTable('ai_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	aiEnabled: integer('ai_enabled', { mode: 'boolean' }).default(false).notNull(),
	privacyConsent: integer('privacy_consent', { mode: 'boolean' }).default(false).notNull(),
	provider: text('provider').default('openai').notNull(),
	model: text('model').default('gpt-4o-mini').notNull(),
	openaiApiKey: text('openai_api_key'),
	groqApiKey: text('groq_api_key'),
	geminiApiKey: text('gemini_api_key'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// Conversation history
export const conversation = sqliteTable('conversation', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	entryId: text('entry_id').references(() => entry.id, { onDelete: 'set null' }),
	role: text('role').notNull(),
	content: text('content').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Journal entry
export const entry = sqliteTable('entry', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	content: text('content').notNull(),
	mood: text('mood').notNull(),
	sentimentLabel: text('sentiment_label'),
	sentimentScore: integer('sentiment_score'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// Tags
export const tag = sqliteTable('tag', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Entry-Tag junction
export const entryTag = sqliteTable(
	'entry_tag',
	{
		entryId: text('entry_id')
			.notNull()
			.references(() => entry.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.entryId, table.tagId], name: 'entry_tag_entry_id_tag_id_pk' })
	})
);

// Attachments
export const attachment = sqliteTable('attachment', {
	id: text('id').primaryKey(),
	entryId: text('entry_id')
		.notNull()
		.references(() => entry.id),
	filename: text('filename').notNull(),
	mime: text('mime').notNull(),
	size: integer('size').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Verification token (for email flows)
export const verificationToken = sqliteTable('verification_token', {
	identifier: text('identifier').notNull(),
	token: text('token').primaryKey(),
	expires: integer('expires', { mode: 'timestamp' }).notNull()
});

// Entry embeddings for RAG
export const entryEmbedding = sqliteTable('entry_embedding', {
	id: text('id').primaryKey(),
	entryId: text('entry_id')
		.notNull()
		.references(() => entry.id, { onDelete: 'cascade' }),
	embedding: text('embedding').notNull(), // JSON array of floats
	embeddingModel: text('embedding_model').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// User achievements progress
export const userAchievement = sqliteTable('user_achievement', {
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	achievementId: text('achievement_id').notNull(),
	progress: integer('progress').default(0).notNull(),
	unlocked: integer('unlocked', { mode: 'boolean' }).default(false).notNull(),
	unlockedAt: integer('unlocked_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// User XP and leveling
export const userProgress = sqliteTable('user_progress', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	totalXP: integer('total_xp').default(0).notNull(),
	level: integer('level').default(1).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// NLP Feedback for active learning
export const nlpFeedback = sqliteTable('nlp_feedback', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	entryId: text('entry_id').references(() => entry.id, { onDelete: 'cascade' }),
	distortionType: text('distortion_type').notNull(),
	accepted: integer('accepted', { mode: 'boolean' }).notNull(),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Export types
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type AiSettings = typeof aiSettings.$inferSelect;
export type Conversation = typeof conversation.$inferSelect;
export type Entry = typeof entry.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type EntryTag = typeof entryTag.$inferSelect;
export type Attachment = typeof attachment.$inferSelect;
export type VerificationToken = typeof verificationToken.$inferSelect;
export type EntryEmbedding = typeof entryEmbedding.$inferSelect;
export type UserAchievement = typeof userAchievement.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type NlpFeedback = typeof nlpFeedback.$inferSelect;
