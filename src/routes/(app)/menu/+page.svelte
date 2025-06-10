<script>
	import { Volume2, VolumeX, Sun, Moon, Settings, BookOpen } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	import GameHeader from '$lib/components/GameHeader.svelte';

	let darkTheme = $state(true);

	function toggleTheme() {
		darkTheme = !darkTheme;
		// TODO: Implement actual theme toggle logic
	}

	function openSettings() {
		// TODO: Navigate to settings page or open settings modal
		console.log('Opening settings...');
	}

	function openCatalogue() {
		// TODO: Navigate to catalogue page
		console.log('Opening catalogue...');
	}

	function startStory() {
		goto('/campaign');
	}

	function startTimeAttack() {
		goto('/play?mode=timeattack');
	}

	function startPrecision() {
		goto('/play?mode=precision');
	}

	function startZen() {
		goto('/play?mode=zen');
	}

	function startCustom() {
		goto('/editor');
	}
</script>

<svelte:head>
	<title>TileLoop - Menu</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
	<!-- Animated background -->
	<div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900"></div>
	
	<!-- Subtle pattern overlay -->
	<div class="absolute inset-0 opacity-5">
		<div class="w-full h-full" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
	</div>

	<GameHeader 
		showLevelInfo={false}
		showBackButton={false}
		showStats={false}
		bind:darkTheme
	/>

	<!-- Main content -->
	<main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-16">
		<!-- Game title -->
		<div class="mb-16">
			<h1 class="text-5xl md:text-6xl font-bold text-white tracking-wider mb-2">
				LOOP
			</h1>
			<div class="w-full h-0.5 bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>
		</div>

		<!-- Menu buttons -->
		<div class="w-full max-w-sm space-y-4">
			<!-- Campaign Mode -->
			<button
				onclick={startStory}
				class="w-full py-4 px-8 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-semibold text-xl tracking-wide rounded-2xl border border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300 ui-button-large backdrop-blur-sm"
			>
				Campaign
			</button>

			<!-- Time Attack Mode -->
			<button
				onclick={startTimeAttack}
				class="w-full py-4 px-8 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-semibold text-xl tracking-wide rounded-2xl border border-red-600/50 shadow-lg hover:shadow-xl transition-all duration-300 ui-button-large backdrop-blur-sm"
			>
				Time Attack
			</button>

			<!-- Precision Mode -->
			<button
				onclick={startPrecision}
				class="w-full py-4 px-8 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-xl tracking-wide rounded-2xl border border-blue-600/50 shadow-lg hover:shadow-xl transition-all duration-300 ui-button-large backdrop-blur-sm"
			>
				Precision
			</button>

			<!-- Zen Mode -->
			<button
				onclick={startZen}
				class="w-full py-4 px-8 bg-gradient-to-r from-green-800 to-green-700 hover:from-green-700 hover:to-green-600 text-white font-semibold text-xl tracking-wide rounded-2xl border border-green-600/50 shadow-lg hover:shadow-xl transition-all duration-300 ui-button-large backdrop-blur-sm"
			>
				Zen
			</button>

			<!-- Custom Mode -->
			<button
				onclick={startCustom}
				class="w-full py-3 px-6 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white font-medium text-lg tracking-wide rounded-xl border border-zinc-500/50 shadow-lg hover:shadow-xl transition-all duration-300 ui-button-large backdrop-blur-sm"
			>
				Custom
			</button>
		</div>

		<!-- Subtle footer text -->
		<div class="mt-16 text-slate-500 text-sm font-light tracking-wide">
			Connect the loops
		</div>
	</main>
</div>

<style>
	.ui-button:active {
		transform: scale(0.95);
	}
	
	.ui-button-large:active {
		transform: scale(0.98);
	}
</style>
