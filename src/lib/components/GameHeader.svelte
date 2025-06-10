<script>
	import { Volume2, VolumeX, Sun, Moon, Settings, BookOpen, ArrowLeft, Clock, Target } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isMuted } from '$lib/stores/audio';

	let { 
		showLevelInfo = false,
		showBackButton = false,
		showStats = false,
		gameMode = '',
		levelId = '',
		timer = 0,
		moves = 0,
		darkTheme = $bindable(true)
	} = $props();

	function toggleSound() {
		$isMuted = !$isMuted;
	}

	function toggleTheme() {
		darkTheme = !darkTheme;
	}

	function openSettings() {
		console.log('Opening settings...');
	}

	function openCatalogue() {
		console.log('Opening catalogue...');
	}

	function goBack() {
		goto('/menu');
	}

	function formatLevelDisplay(mode, id) {
		if (mode === 'campaign') {
			return id;
		} else if (mode === 'zen' || mode === 'timeattack' || mode === 'precision') {
			return `Level ${id}`;
		}
		return id;
	}

	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getModeDisplayName(mode) {
		switch(mode) {
			case 'timeattack': return 'Time Attack';
			case 'precision': return 'Precision';
			case 'zen': return 'Zen';
			case 'campaign': return 'Campaign';
			default: return mode;
		}
	}
</script>

<header class="absolute top-0 left-0 right-0 z-50 pointer-events-none">
	<div class="flex justify-between items-start p-4 pt-6">
		<div class="flex gap-3 pointer-events-auto">
			{#if showBackButton}
				<button
					onclick={goBack}
					class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
				>
					<ArrowLeft size={18} />
				</button>
			{/if}

			<button
				onclick={toggleSound}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				{#if $isMuted}
					<VolumeX size={18} />
				{:else}
					<Volume2 size={18} />
				{/if}
			</button>

			<button
				onclick={toggleTheme}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				{#if darkTheme}
					<Moon size={18} />
				{:else}
					<Sun size={18} />
				{/if}
			</button>
		</div>

		{#if showLevelInfo}
			<div class="flex flex-col items-center pointer-events-none">
				<div class="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
					{getModeDisplayName(gameMode)}
				</div>

				<div class="text-white text-lg font-bold tracking-wide bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mb-2">
					{formatLevelDisplay(gameMode, levelId)}
				</div>
				
				{#if showStats}
					<div class="flex gap-4 text-sm">
						{#if gameMode === 'timeattack' || gameMode === 'campaign'}
							<div class="flex items-center gap-1 text-white/80 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
								<Clock size={14} />
								<span class="font-mono">{formatTime(timer)}</span>
							</div>
						{/if}
						
						{#if gameMode === 'precision' || gameMode === 'campaign'}
							<div class="flex items-center gap-1 text-white/80 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
								<Target size={14} />
								<span class="font-mono">{moves}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex gap-3 pointer-events-auto">
			<button
				onclick={openSettings}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				<Settings size={18} />
			</button>

			<button
				onclick={openCatalogue}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				<BookOpen size={18} />
			</button>
		</div>
	</div>
</header>

<style>
	.ui-button:active {
		transform: scale(0.95);
	}
</style> 