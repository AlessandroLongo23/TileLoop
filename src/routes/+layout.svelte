<script>
	import '../app.css';
	import '$lib/utils/extensions.js';
	import { generatePossibleConfigurations } from '$lib/utils/utils.svelte.js';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';

	let { children } = $props();

	const configs = generatePossibleConfigurations(12, 2);
	console.log(configs);
</script>

<AudioPlayer />
{@render children()}
