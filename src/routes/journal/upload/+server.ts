import { json, type RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { allow as allowRate } from '$lib/server/rateLimit';

// File type validation with magic numbers (file signatures)
const ALLOWED_TYPES = {
	// Images
	'image/png': { ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
	'image/jpeg': { ext: ['.jpg', '.jpeg'], magic: [0xff, 0xd8, 0xff] },
	'image/webp': { ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] }, // RIFF
	'image/gif': { ext: '.gif', magic: [0x47, 0x49, 0x46, 0x38] }, // GIF8
	// Audio
	'audio/mpeg': { ext: ['.mp3'], magic: [0xff, 0xfb] }, // MP3 frame sync
	'audio/ogg': { ext: ['.ogg'], magic: [0x4f, 0x67, 0x67, 0x53] } // OggS
} as const;

/**
 * Verify file magic number matches the declared MIME type
 */
function verifyFileSignature(buffer: Buffer, mimeType: string): boolean {
	const typeInfo = ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES];
	if (!typeInfo) return false;

	const magic = typeInfo.magic;
	if (buffer.length < magic.length) return false;

	for (let i = 0; i < magic.length; i++) {
		if (buffer[i] !== magic[i]) {
			return false;
		}
	}
	return true;
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
	// Remove any path components
	const basename = path.basename(filename);
	// Remove dangerous characters and limit length
	return basename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

/**
 * Get safe file extension based on MIME type
 */
function getExtensionForMimeType(mimeType: string): string {
	const typeInfo = ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES];
	if (!typeInfo) return '';

	const ext = typeInfo.ext;
	return (Array.isArray(ext) ? ext[0] : ext) as string;
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	try {
		// Authentication check
		const user = locals.user;
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Rate limiting (20 uploads per minute per IP)
		const ip = getClientAddress();
		const rateLimitOk = await allowRate(ip, 20, 60_000);
		if (!rateLimitOk) {
			return json(
				{ error: 'Rate limit exceeded. Please wait before uploading more files.' },
				{ status: 429 }
			);
		}

		// Parse form data with size validation
		let form: FormData;
		try {
			form = await request.formData();
		} catch (formError) {
			console.error('[upload] Form parsing error:', formError);
			return json({ error: 'Invalid request format' }, { status: 400 });
		}

		const file = form.get('file') as File | null;
		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file size (10MB limit)
		const maxBytes = 10 * 1024 * 1024;
		if (file.size === 0) {
			return json({ error: 'File is empty' }, { status: 400 });
		}
		if (file.size > maxBytes) {
			return json(
				{ error: `File too large. Maximum size is ${maxBytes / (1024 * 1024)}MB` },
				{ status: 413 }
			);
		}

		// Validate MIME type
		const mimeType = file.type;
		if (!Object.keys(ALLOWED_TYPES).includes(mimeType)) {
			return json(
				{
					error: `Unsupported file type: ${mimeType}. Allowed types: images (PNG, JPEG, WebP, GIF) and audio (MP3, OGG)`
				},
				{ status: 415 }
			);
		}

		// Read file content
		let arrayBuffer: ArrayBuffer;
		try {
			arrayBuffer = await file.arrayBuffer();
		} catch (readError) {
			console.error('[upload] File read error:', readError);
			return json({ error: 'Failed to read file' }, { status: 500 });
		}

		const buffer = Buffer.from(arrayBuffer);

		// Verify file signature (magic numbers)
		if (!verifyFileSignature(buffer, mimeType)) {
			return json(
				{
					error:
						'File content does not match declared type. Possible file corruption or security issue.'
				},
				{ status: 400 }
			);
		}

		// Generate secure filename
		const safeExt = getExtensionForMimeType(mimeType);
		const randomName = crypto.randomUUID();
		const sanitizedOriginal = sanitizeFilename(file.name || 'upload');
		// Use format: {uuid}-{sanitized-original-name}
		const filename = `${randomName}-${sanitizedOriginal}`;

		// Ensure uploads directory exists with proper permissions
		const uploadsDir = path.resolve(process.cwd(), 'static', 'uploads');

		// Prevent path traversal in uploads directory
		const resolvedPath = path.resolve(uploadsDir, filename);
		if (!resolvedPath.startsWith(uploadsDir)) {
			console.error('[upload] Path traversal attempt detected:', filename);
			return json({ error: 'Invalid filename' }, { status: 400 });
		}

		try {
			if (!fs.existsSync(uploadsDir)) {
				fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
			}
		} catch (mkdirError) {
			console.error('[upload] Directory creation error:', mkdirError);
			return json({ error: 'Server configuration error' }, { status: 500 });
		}

		// Write file to disk with error handling
		try {
			fs.writeFileSync(resolvedPath, buffer, { mode: 0o644 });
		} catch (writeError) {
			console.error('[upload] File write error:', writeError);
			return json({ error: 'Failed to save file' }, { status: 500 });
		}

		// Return file info
		const id = crypto.randomUUID();
		const url = `/uploads/${filename}`;

		// Log successful upload (without sensitive info)
		console.log('[upload] File uploaded successfully:', {
			id,
			userId: user.id,
			size: file.size,
			type: mimeType,
			timestamp: new Date().toISOString()
		});

		return json({
			ok: true,
			files: [
				{
					id,
					url,
					type: mimeType,
					size: file.size,
					name: sanitizedOriginal
				}
			]
		});
	} catch (error) {
		console.error('[upload] Unexpected error:', error);
		return json({ error: 'An unexpected error occurred during file upload' }, { status: 500 });
	}
};
