<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Chart,
		CategoryScale,
		LinearScale,
		PointElement,
		LineElement,
		BarElement,
		Title,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';

	Chart.register(
		CategoryScale,
		LinearScale,
		PointElement,
		LineElement,
		BarElement,
		Title,
		Tooltip,
		Legend,
		Filler
	);

	interface Props {
		data: Array<{
			date: Date;
			sentimentScore: number;
			mood: string;
			count?: number;
		}>;
		timeRange?: 'daily' | 'weekly' | 'monthly';
		chartType?: 'line' | 'bar';
	}

	let { data, timeRange = 'daily', chartType = 'line' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	function aggregateData(
		rawData: Props['data'],
		range: 'daily' | 'weekly' | 'monthly'
	): {
		labels: string[];
		sentiments: number[];
		counts: number[];
	} {
		if (range === 'daily') {
			// Group by day
			const grouped = new Map<string, { sum: number; count: number }>();

			rawData.forEach((entry) => {
				const dateKey = entry.date.toISOString().split('T')[0];
				if (!grouped.has(dateKey)) {
					grouped.set(dateKey, { sum: 0, count: 0 });
				}
				const group = grouped.get(dateKey)!;
				group.sum += entry.sentimentScore;
				group.count += 1;
			});

			const labels = Array.from(grouped.keys()).sort();
			const sentiments = labels.map((key) => {
				const group = grouped.get(key)!;
				return group.sum / group.count;
			});
			const counts = labels.map((key) => grouped.get(key)!.count);

			return { labels, sentiments, counts };
		} else if (range === 'weekly') {
			// Group by week
			const grouped = new Map<string, { sum: number; count: number }>();

			rawData.forEach((entry) => {
				const date = new Date(entry.date);
				const weekStart = new Date(date);
				weekStart.setDate(date.getDate() - date.getDay());
				const weekKey = weekStart.toISOString().split('T')[0];

				if (!grouped.has(weekKey)) {
					grouped.set(weekKey, { sum: 0, count: 0 });
				}
				const group = grouped.get(weekKey)!;
				group.sum += entry.sentimentScore;
				group.count += 1;
			});

			const labels = Array.from(grouped.keys())
				.sort()
				.map((key) => `Week of ${key}`);
			const sentiments = Array.from(grouped.keys())
				.sort()
				.map((key) => {
					const group = grouped.get(key)!;
					return group.sum / group.count;
				});
			const counts = Array.from(grouped.keys())
				.sort()
				.map((key) => grouped.get(key)!.count);

			return { labels, sentiments, counts };
		} else {
			// Group by month
			const grouped = new Map<string, { sum: number; count: number }>();

			rawData.forEach((entry) => {
				const monthKey = entry.date.toISOString().slice(0, 7); // YYYY-MM
				if (!grouped.has(monthKey)) {
					grouped.set(monthKey, { sum: 0, count: 0 });
				}
				const group = grouped.get(monthKey)!;
				group.sum += entry.sentimentScore;
				group.count += 1;
			});

			const labels = Array.from(grouped.keys()).sort();
			const sentiments = labels.map((key) => {
				const group = grouped.get(key)!;
				return group.sum / group.count;
			});
			const counts = labels.map((key) => grouped.get(key)!.count);

			return { labels, sentiments, counts };
		}
	}

	function createChart() {
		if (!canvas) return;

		// Destroy existing chart
		if (chartInstance) {
			chartInstance.destroy();
		}

		const { labels, sentiments, counts } = aggregateData(data, timeRange);

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		chartInstance = new Chart(ctx, {
			type: chartType,
			data: {
				labels,
				datasets: [
					{
						label: 'Average Sentiment',
						data: sentiments,
						borderColor: 'hsl(var(--foreground))',
						backgroundColor:
							chartType === 'line'
								? 'hsl(var(--foreground) / 0.1)'
								: 'hsl(var(--foreground) / 0.7)',
						fill: chartType === 'line',
						tension: 0.4,
						pointRadius: 4,
						pointHoverRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'top'
					},
					title: {
						display: true,
						text: `Mood Trends - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View`,
						font: {
							size: 16,
							weight: 'bold'
						}
					},
					tooltip: {
						callbacks: {
							afterLabel: function (context) {
								const index = context.dataIndex;
								return `Entries: ${counts[index]}`;
							}
						}
					}
				},
				scales: {
					y: {
						beginAtZero: false,
						min: -100,
						max: 100,
						title: {
							display: true,
							text: 'Sentiment Score'
						},
						ticks: {
							callback: function (value) {
								if (typeof value === 'number') {
									if (value > 50) return '😊 ' + value;
									if (value > 0) return '🙂 ' + value;
									if (value === 0) return '😐 ' + value;
									if (value > -50) return '😟 ' + value;
									return '😢 ' + value;
								}
								return value;
							}
						}
					},
					x: {
						title: {
							display: true,
							text: 'Date'
						}
					}
				}
			}
		});
	}

	onMount(() => {
		createChart();
	});

	$effect(() => {
		// Recreate chart when data, timeRange, or chartType changes
		if (canvas && (data || timeRange || chartType)) {
			createChart();
		}
	});
</script>

<div class="mood-trends-chart">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.mood-trends-chart {
		width: 100%;
		height: 400px;
		position: relative;
	}
</style>
