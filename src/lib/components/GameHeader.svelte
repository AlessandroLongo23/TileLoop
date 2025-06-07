<script>
	import { Volume2, VolumeX, Sun, Moon, Settings, BookOpen, ArrowLeft, Clock, Target } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { 
		showLevelInfo = false,
		showBackButton = false,
		showStats = false,
		gameMode = '',
		levelId = '',
		timer = 0,
		moves = 0,
		soundEnabled = $bindable(true),
		darkTheme = $bindable(true)
	} = $props();

	function toggleSound() {
		soundEnabled = !soundEnabled;
		// TODO: Implement actual sound toggle logic
	}

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

	function goBack() {
		goto('/menu');
	}

	// Format level display based on game mode
	function formatLevelDisplay(mode, id) {
		if (mode === 'story') {
			// Format as chapter-level (e.g., "2-13")
			return id;
		} else if (mode === 'zen' || mode === 'timeattack' || mode === 'precision') {
			// Format as progressive number
			return `Level ${id}`;
		}
		return id;
	}

	// Format timer display
	function formatTime(seconds) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Get mode display name
	function getModeDisplayName(mode) {
		switch(mode) {
			case 'timeattack': return 'Time Attack';
			case 'precision': return 'Precision';
			case 'zen': return 'Zen';
			case 'story': return 'Story';
			default: return mode;
		}
	}
</script>

<header class="absolute top-0 left-0 right-0 z-50 pointer-events-none">
	<div class="flex justify-between items-start p-4 pt-6">
		<!-- Left side icons -->
		<div class="flex gap-3 pointer-events-auto">
			<!-- Back button (only in play mode) -->
			{#if showBackButton}
				<button
					onclick={goBack}
					class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
				>
					<ArrowLeft size={18} />
				</button>
			{/if}

			<!-- Sound toggle -->
			<button
				onclick={toggleSound}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				{#if soundEnabled}
					<Volume2 size={18} />
				{:else}
					<VolumeX size={18} />
				{/if}
			</button>

			<!-- Theme toggle -->
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

		<!-- Center level info and stats (only for play page) -->
		{#if showLevelInfo}
			<div class="flex flex-col items-center pointer-events-none">
				<!-- Game mode -->
				<div class="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
					{getModeDisplayName(gameMode)}
				</div>
				<!-- Level ID -->
				<div class="text-white text-lg font-bold tracking-wide bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mb-2">
					{formatLevelDisplay(gameMode, levelId)}
				</div>
				
				<!-- Stats (timer and moves) -->
				{#if showStats}
					<div class="flex gap-4 text-sm">
						<!-- Timer (for time attack and other modes) -->
						{#if gameMode === 'timeattack' || gameMode === 'story'}
							<div class="flex items-center gap-1 text-white/80 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
								<Clock size={14} />
								<span class="font-mono">{formatTime(timer)}</span>
							</div>
						{/if}
						
						<!-- Move counter (for precision and other modes) -->
						{#if gameMode === 'precision' || gameMode === 'story'}
							<div class="flex items-center gap-1 text-white/80 bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
								<Target size={14} />
								<span class="font-mono">{moves}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Right side icons -->
		<div class="flex gap-3 pointer-events-auto">
			<!-- Settings -->
			<button
				onclick={openSettings}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				<Settings size={18} />
			</button>

			<!-- Catalogue -->
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