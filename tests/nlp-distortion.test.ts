import { describe, it, expect } from 'vitest';
import { detectCognitiveDistortions, generateReframes } from '../src/lib/server/nlp';

describe('Cognitive Distortion Detection', () => {
	it('should detect all-or-nothing thinking', async () => {
		const text =
			'I always fail at everything. This is never going to work. I completely ruined my day.';
		const distortions = await detectCognitiveDistortions(text);

		expect(distortions.length).toBeGreaterThan(0);
		const hasAllOrNothing = distortions.some((d) => d.type === 'all-or-nothing');
		expect(hasAllOrNothing).toBe(true);
	});

	it('should detect overgeneralization', async () => {
		const text = 'This always happens to me. Every time I try, it never works.';
		const distortions = await detectCognitiveDistortions(text);

		const hasOvergen = distortions.some((d) => d.type === 'overgeneralization');
		expect(hasOvergen).toBe(true);
	});

	it('should detect should statements', async () => {
		const text = 'I should have done better. I must be perfect. I need to work harder.';
		const distortions = await detectCognitiveDistortions(text);

		const hasShould = distortions.some((d) => d.type === 'should-statements');
		expect(hasShould).toBe(true);
	});

	it('should detect catastrophizing', async () => {
		const text = 'This is a complete disaster. Everything is ruined and terrible.';
		const distortions = await detectCognitiveDistortions(text);

		const hasCatastrophe = distortions.some((d) => d.type === 'magnification');
		expect(hasCatastrophe).toBe(true);
	});

	it('should detect emotional reasoning', async () => {
		const text =
			'I feel like a failure, so I must be one. Because I feel anxious, something bad must be happening.';
		const distortions = await detectCognitiveDistortions(text);

		const hasEmotional = distortions.some((d) => d.type === 'emotional-reasoning');
		expect(hasEmotional).toBe(true);
	});

	it('should return empty array for healthy text', async () => {
		const text =
			'Today was a good day. I went for a walk and enjoyed the sunshine. I made some progress on my project.';
		const distortions = await detectCognitiveDistortions(text);

		// Should have few or no distortions (depending on LLM availability)
		expect(distortions.length).toBeLessThan(3);
	});

	it('should handle empty text', async () => {
		const distortions = await detectCognitiveDistortions('');
		expect(distortions).toEqual([]);
	});

	it('should handle very short text', async () => {
		const distortions = await detectCognitiveDistortions('Hi');
		expect(distortions).toEqual([]);
	});
});

describe('Reframing Generation', () => {
	it('should generate reframes for detected distortions', async () => {
		const text = 'I always fail. This is terrible and I should be better.';
		const distortions = await detectCognitiveDistortions(text);
		const result = generateReframes(distortions, text);

		expect(result.reframes.length).toBeGreaterThan(0);
		expect(result.socratics.length).toBeGreaterThan(0);
	});

	it('should generate all-or-nothing reframes', async () => {
		const distortions = [
			{
				type: 'all-or-nothing' as const,
				label: 'All-or-Nothing Thinking',
				confidence: 0.8,
				excerpt: 'I always fail',
				explanation: 'Test'
			}
		];

		const result = generateReframes(distortions, 'I always fail');

		expect(result.reframes[0]).toContain('shades of gray');
	});

	it('should generate overgeneralization reframes', async () => {
		const distortions = [
			{
				type: 'overgeneralization' as const,
				label: 'Overgeneralization',
				confidence: 0.8,
				excerpt: 'This always happens',
				explanation: 'Test'
			}
		];

		const result = generateReframes(distortions, 'This always happens');

		expect(result.reframes[0]).toContain('one situation');
	});

	it('should extract positive anchors', async () => {
		const text =
			'Today was hard but I accomplished my goal. I am grateful for my friends and proud of my progress.';
		const distortions = await detectCognitiveDistortions(text);
		const result = generateReframes(distortions, text);

		expect(result.positiveAnchors.length).toBeGreaterThan(0);
	});

	it('should handle empty distortions array', () => {
		const result = generateReframes([], 'Normal text');

		expect(result.distortions).toEqual([]);
		expect(result.reframes).toEqual([]);
		expect(result.socratics).toEqual([]);
	});
});

describe('Integration Tests', () => {
	it('should handle complex mixed text', async () => {
		const text = `
			Today was absolutely terrible. I always mess things up at work.
			My boss must think I'm incompetent. I feel like a failure, so I must be one.
			I should be doing better than this. Everything is ruined.
			
			But I did manage to help my colleague, and I'm grateful for that.
		`;

		const distortions = await detectCognitiveDistortions(text);
		const result = generateReframes(distortions, text);

		expect(distortions.length).toBeGreaterThan(0);
		expect(result.reframes.length).toBeGreaterThan(0);
		expect(result.socratics.length).toBeGreaterThan(0);
		expect(result.positiveAnchors.length).toBeGreaterThan(0);
	});

	it('should provide confidence scores', async () => {
		const text = 'I never succeed at anything. This is always a disaster.';
		const distortions = await detectCognitiveDistortions(text);

		distortions.forEach((d) => {
			expect(d.confidence).toBeGreaterThan(0);
			expect(d.confidence).toBeLessThanOrEqual(1);
		});
	});

	it('should include explanations', async () => {
		const text = 'Everything is ruined forever.';
		const distortions = await detectCognitiveDistortions(text);

		distortions.forEach((d) => {
			expect(d.explanation).toBeTruthy();
			expect(typeof d.explanation).toBe('string');
			expect(d.explanation.length).toBeGreaterThan(10);
		});
	});
});
