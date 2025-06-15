<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initializeGameStores } from '$lib/stores/gameProgress.js';
	import '../app.css';
	import '$lib/utils/extensions.js';
	import { generatePossibleConfigurations } from '$lib/utils/utils.svelte.js';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';

	let { children } = $props();

	// const configs = generatePossibleConfigurations(12, 2);
	// console.log(configs);

	// Initialize stores when the app loads
	onMount(async () => {
		if (browser) {
			await initializeGameStores();
		}
	});
</script>

<AudioPlayer />
<main>
	<slot />
</main>

<style>
	main {
		width: 100%;
		height: 100vh;
		height: calc(var(--vh, 1vh) * 100); /* Use custom viewport height for mobile */
		overflow: hidden;
	}
</style>
