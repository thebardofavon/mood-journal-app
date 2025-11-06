import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(process.cwd(), 'static', 'icons', 'icon-192x192.svg');
const outputDir = path.join(process.cwd(), 'static', 'icons');

async function generateIcons() {
	try {
		// Ensure output directory exists
		await fs.mkdir(outputDir, { recursive: true });

		// Read the SVG
		const svgBuffer = await fs.readFile(inputSvg);

		// Generate PNG icons for each size
		for (const size of sizes) {
			const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

			await sharp(svgBuffer)
				.resize(size, size)
				.png()
				.toFile(outputPath);

			console.log(`Generated ${outputPath}`);
		}

		// Generate additional icons for shortcuts
		const shortcutSizes = [192];
		const shortcuts = ['new-entry', 'analytics', 'wellness', 'achievements'];

		for (const shortcut of shortcuts) {
			for (const size of shortcutSizes) {
				const outputPath = path.join(outputDir, `${shortcut}.png`);

				await sharp(svgBuffer)
					.resize(size, size)
					.png()
					.toFile(outputPath);

				console.log(`Generated ${outputPath}`);
			}
		}

		console.log('All icons generated successfully!');
	} catch (error) {
		console.error('Error generating icons:', error);
		process.exit(1);
	}
}

generateIcons();