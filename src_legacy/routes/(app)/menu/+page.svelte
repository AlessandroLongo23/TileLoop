<script>
	import * as ls from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { scale, fly, fade } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';
	import { onMount } from 'svelte';

	import GameHeader from '$lib/components/GameHeader.svelte';
	import { 
		getCurrentCampaignProgress, 
		getCurrentModeProgress,
		campaignProgress,
		zenModeProgress,
		timeAttackProgress,
		precisionModeProgress,
		startGameSession
	} from '$lib/stores/gameProgress.js';

	let darkTheme = $state(true);
	let showContent = $state(false);
	let buttonsReady = $state(false);

	// Get progress for each mode
	const campaignCurrentProgress = $derived(getCurrentCampaignProgress());
	const zenCurrentProgress = $derived(getCurrentModeProgress('zen'));
	const timeAttackCurrentProgress = $derived(getCurrentModeProgress('timeattack'));
	const precisionCurrentProgress = $derived(getCurrentModeProgress('precision'));

	onMount(() => {
		setTimeout(() => showContent = true, 100);
		setTimeout(() => buttonsReady = true, 300);
	});

	function toggleTheme() {
		darkTheme = !darkTheme;
	}

	function openSettings() {
		console.log('Opening settings...');
	}

	function openCatalogue() {
		console.log('Opening catalogue...');
	}

	function startStory() {
		goto('/campaign');
	}

	function startTimeAttack() {
		startGameSession('timeattack');
		goto('/play');
	}

	function startPrecision() {
		startGameSession('precision');
		goto('/play');
	}

	function startZen() {
		startGameSession('zen');
		goto('/play');
	}

	function startCustom() {
		goto('/editor');
	}
</script>

<svelte:head>
	<title>TileLoop - Menu</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
	<!-- Elegant background -->
	<div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
	
	<!-- Subtle pattern overlay -->
	<div class="absolute inset-0 opacity-3">
		<div class="w-full h-full" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 60px 60px;"></div>
	</div>

	<!-- Subtle radial gradient -->
	<div class="absolute inset-0 bg-gradient-radial from-slate-800/20 via-transparent to-transparent"></div>

	<GameHeader 
		showLevelInfo={false}
		showBackButton={false}
		showStats={false}
		bind:darkTheme
	/>

	<!-- Main content -->
	<main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-16">
		
		{#if showContent}
			<!-- Game title -->
			<div 
				class="mb-20"
				transition:fly={{ y: -20, duration: 600, easing: quintOut }}
			>
				<h1 class="text-5xl md:text-6xl font-light text-slate-100 tracking-[0.3em] mb-4 text-center">
					LOOP
				</h1>
				<div class="w-full h-px bg-gradient-to-r from-transparent via-slate-400/60 to-transparent"></div>
			</div>
		{/if}

		<!-- Menu buttons -->
		{#if buttonsReady}
			<div 
				class="w-full max-w-sm space-y-4"
				transition:fly={{ y: 20, duration: 500, delay: 100, easing: quintOut }}
			>
				<!-- Campaign Mode -->
				<button
					onclick={startStory}
					class="w-full py-4 px-8 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 hover:border-slate-500/40 text-slate-100 font-light text-lg tracking-wide rounded-xl backdrop-blur-sm transition-all duration-300 group relative overflow-hidden"
					transition:scale={{ duration: 400, delay: 0, easing: backOut }}
				>
					<div class="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<div class="relative flex flex-col items-center gap-2">
						<div class="flex flex-row items-center justify-center gap-2">
							<ls.BookOpen size={16} class="text-blue-400 -mb-[2px]" />
							<span class="text-lg">Campaign</span>
						</div>
						<div class="flex flex-col items-center gap-2">
							<span class="text-xs text-slate-400">
								Chapter {campaignCurrentProgress.currentChapter} • Level {campaignCurrentProgress.currentLevel}
							</span>
							<div class="w-24 bg-slate-600/40 rounded-full h-1">
								<div 
									class="bg-gradient-to-r from-blue-400 to-purple-400 h-1 rounded-full transition-all duration-300"
									style="width: {(campaignCurrentProgress.totalCompleted / campaignCurrentProgress.totalLevels) * 100}%"
								></div>
							</div>
						</div>
					</div>
				</button>

				<!-- Time Attack Mode -->
				<button
					onclick={startTimeAttack}
					class="w-full py-4 px-8 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 hover:border-slate-500/40 text-slate-100 font-light text-lg tracking-wide rounded-xl backdrop-blur-sm transition-all duration-300 group relative overflow-hidden"
					transition:scale={{ duration: 400, delay: 100, easing: backOut }}
				>
					<div class="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<div class="relative flex flex-col items-center gap-2">
						<div class="flex flex-row items-center justify-center gap-2">
							<ls.Clock size={16} class="text-amber-400 -mb-[2px]" />
							<span class="text-lg">Time Attack</span>
						</div>
						<span class="text-xs text-amber-400 font-semibold">
							Level {timeAttackCurrentProgress.currentLevel}
						</span>
					</div>
				</button>

				<!-- Precision Mode -->
				<button
					onclick={startPrecision}
					class="w-full py-4 px-8 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 hover:border-slate-500/40 text-slate-100 font-light text-lg tracking-wide rounded-xl backdrop-blur-sm transition-all duration-300 group relative overflow-hidden"
					transition:scale={{ duration: 400, delay: 200, easing: backOut }}
				>
					<div class="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<div class="relative flex flex-col items-center gap-2">
						<div class="flex flex-row items-center justify-center gap-2">
							<ls.Target size={16} class="text-indigo-400 -mb-[2px]" />
							<span class="text-lg">Precision</span>
						</div>
						<span class="text-xs text-indigo-400 font-semibold">
							Level {precisionCurrentProgress.currentLevel}
						</span>
					</div>
				</button>

				<!-- Zen Mode -->
				<button
					onclick={startZen}
					class="w-full py-4 px-8 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 hover:border-slate-500/40 text-slate-100 font-light text-lg tracking-wide rounded-xl backdrop-blur-sm transition-all duration-300 group relative overflow-hidden"
					transition:scale={{ duration: 400, delay: 300, easing: backOut }}
				>
					<div class="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<div class="relative flex flex-col items-center gap-2">
						<div class="flex flex-row items-center justify-center gap-2">
							<ls.Leaf size={16} class="text-emerald-400" />
							<span class="text-lg">Zen</span>
						</div>
						<span class="text-xs text-emerald-400 font-semibold">
							Level {zenCurrentProgress.currentLevel}
						</span>
					</div>
				</button>

				<!-- <button
					onclick={startCustom}
					class="w-full py-3 px-6 bg-slate-700/40 hover:bg-slate-600/40 border border-slate-500/20 hover:border-slate-400/30 text-slate-300 hover:text-slate-200 font-light text-base tracking-wide rounded-lg backdrop-blur-sm transition-all duration-300 group relative overflow-hidden"
					transition:scale={{ duration: 400, delay: 400, easing: backOut }}
				>
					<div class="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<span class="relative">Custom</span>
				</button> -->
			</div>
		{/if}

		{#if showContent}
			<!-- Elegant footer text -->
			<div 
				class="mt-20 text-slate-500 text-sm font-light tracking-wide"
				transition:fade={{ duration: 800, delay: 600 }}
			>
				Connect the loops
			</div>
		{/if}
	</main>
</div>

<style>
	.bg-gradient-radial {
		background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
	}
	
	button:active {
		transform: scale(0.98);
	}
</style>
