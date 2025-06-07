<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let showLogo = $state(false);
	let showTapPrompt = $state(false);
	let assetsLoaded = $state(false);
	let canNavigate = $state(false);

	// Simulate asset loading
	async function loadAssets() {
		// Simulate loading time for assets
		await new Promise(resolve => setTimeout(resolve, 2000));
		assetsLoaded = true;
		
		// Show tap prompt after a brief delay
		setTimeout(() => {
			showTapPrompt = true;
			canNavigate = true;
		}, 500);
	}

	function handleTap() {
		if (canNavigate) {
			goto('/menu');
		}
	}

	onMount(() => {
		// Show logo after a brief delay
		setTimeout(() => {
			showLogo = true;
		}, 800);
		
		// Start loading assets
		loadAssets();
	});
</script>

<svelte:head>
	<title>TileLoop</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
	onclick={handleTap}
>
	<!-- Animated background gradient -->
	<div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900 opacity-80"></div>
	
	<!-- Main content -->
	<div class="relative z-10 flex flex-col items-center justify-center h-full px-8">
		<!-- Logo -->
		<div class="flex-1 flex items-center justify-center">
			{#if showLogo}
				<h1 class="text-6xl md:text-8xl font-bold text-white tracking-wider animate-fade-in">
					LOOP
				</h1>
			{/if}
		</div>
		
		<!-- Tap to start prompt -->
		<div class="pb-16 md:pb-24">
			{#if showTapPrompt}
				<p class="text-slate-300 text-lg md:text-xl font-light tracking-wide animate-pulse-slow">
					tap anywhere to start
				</p>
			{/if}
		</div>
	</div>
	
	<!-- Loading indicator (subtle) -->
	{#if !assetsLoaded}
		<div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
			<div class="w-1 h-8 bg-slate-600 animate-pulse"></div>
		</div>
	{/if}
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	@keyframes pulse-slow {
		0%, 100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}
	
	.animate-fade-in {
		animation: fade-in 1.5s ease-out forwards;
	}
	
	.animate-pulse-slow {
		animation: pulse-slow 2s ease-in-out infinite;
	}
</style>
