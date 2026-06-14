import { writable } from 'svelte/store';
import { Vector } from '$lib/classes/Vector.svelte';

export let golRule = writable('B3/S23'); // Conway's Game of Life with 6 generations
export let golRules = writable({});
export let selectedTiling = writable({
	name: 'square',
	rulestring: '4-4-0,4/r90/m(v2)',
	cr: '4^4',
	dualname: 'square',
	golRules: {
		standard: [],
		dual: []
	}
});
export let isDual = writable(false);
export let transformSteps = writable(1);
export let parameter = writable(45);
export let lineWidth = writable(1);

export const tolerance = 0.01;
export const colorParams = writable({ a: 180, b: 0 });
export let possibleAngles = [15, 20, 30, 36, 40, 45, 48, 60, 72, 75, 90, 120, 135, 144, 150, 180, 210, 225, 240, 270, 300, 315, 330];
export let possibleSides = [0, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72, 90, 120, 144, 180, 240, 360];

export let isIslamic = writable(false);
export let islamicAngle = writable(90);

export let scale = writable(60);

export const offsets = [
	[-1, -1], [-1, 0], [-1, 1],
	[0, -1],  [0, 0],  [0, 1],
	[1, -1],  [1, 0],  [1, 1]
];