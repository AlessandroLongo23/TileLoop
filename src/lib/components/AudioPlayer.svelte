<script>
	import { gameSettings } from '$lib/stores/gameProgress.js';
	import { onMount } from 'svelte';

	let audio = $state(null);

	onMount(() => {
		if (audio) {
			audio.loop = true;
			audio.volume = $gameSettings.musicEnabled ? 0.3 : 0;
			// Only play if music is enabled
			if ($gameSettings.musicEnabled) {
				audio.play().catch(e => {
					console.log('Audio autoplay blocked, will start on user interaction');
				});
			}
		}
	});

	$effect(() => {
		if (audio) {
			audio.volume = $gameSettings.musicEnabled ? 0.3 : 0;
			
			// Play or pause based on settings
			if ($gameSettings.musicEnabled && audio.paused) {
				audio.play().catch(e => {
					console.log('Audio play failed:', e);
				});
			} else if (!$gameSettings.musicEnabled && !audio.paused) {
				audio.pause();
			}
		}
	});
</script>

<audio 
	bind:this={audio} 
	src="/sound/soundtrack.mp3"
	preload="auto"
>
	<track kind="captions" />
</audio> 