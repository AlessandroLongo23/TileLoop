<script>
	import { isMuted } from '$lib/stores/audio';
	import { onMount } from 'svelte';

	let audio = $state(null);

	onMount(() => {
		if (audio) {
			audio.loop = true;
			audio.volume = $isMuted ? 0 : 0.5;
			audio.play();
		}
	});

	$effect(() => {
		if (audio) {
			audio.volume = $isMuted ? 0 : 0.5;
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