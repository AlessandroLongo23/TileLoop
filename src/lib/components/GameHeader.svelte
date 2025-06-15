<script>
	import { Volume2, VolumeX, Settings, BookOpen, ArrowLeft, Clock, Target } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import { 
		gameSettings, 
		getCurrentCampaignProgress, 
		getCurrentModeProgress,
		campaignProgress,
		zenModeProgress,
		timeAttackProgress,
		precisionModeProgress
	} from '$lib/stores/gameProgress.js';
	import GameSettings from './GameSettings.svelte';

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
	
	let showSettingsModal = $state(false);

	// Get current progress for display
	const currentProgress = $derived(() => {
		if (gameMode === 'campaign') {
			return getCurrentCampaignProgress();
		} else if (gameMode) {
			return getCurrentModeProgress(gameMode);
		}
		return null;
	});

	function toggleSound() {
		gameSettings.update(settings => ({
			...settings,
			soundEnabled: !settings.soundEnabled
		}));
	}

	function openSettings() {
		showSettingsModal = true;
	}

	function openCatalogue() {
		console.log('Opening catalogue...');
	}

	function goBack() {
		if (gameMode === 'campaign') {
			goto('/campaign');
		} else {
			goto('/menu');
		}
	}

	function formatLevelDisplay(mode, id) {
		if (mode === 'campaign') {
			return id.replaceAll('-', ' - ');
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
		</div>

		{#if showLevelInfo}
		<!-- Modern card-style container with dark background -->
			<div class="flex flex-col items-center gap-4 w-40 py-2 pointer-events-none bg-black/30 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl">
				<div class="flex flex-col gap-2">
					<div class="text-white/90 text-xs font-semibold uppercase tracking-widest text-center">
						{getModeDisplayName(gameMode)}
					</div>
					
					<div class="text-white text-xl font-bold tracking-wide text-center">
						{formatLevelDisplay(gameMode, levelId)}
					</div>
				</div>
				
				<!-- Stats with modern design -->
				{#if showStats && gameMode !== 'zen'}
					<div class="flex gap-2 justify-center">
						{#if gameMode === 'timeattack' || gameMode === 'campaign'}
							<div class="flex items-center gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/20">
								<Clock size={10} class="text-white/80" />
								<span class="font-mono text-xs text-white font-medium">{formatTime(timer)}</span>
							</div>
						{/if}
						
						{#if gameMode === 'precision' || gameMode === 'campaign'}
							<div class="flex items-center gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/20">
								<Target size={10} class="text-white/80" />
								<span class="font-mono text-xs text-white font-medium">{moves}</span>
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

			<!-- <button
				onclick={openCatalogue}
				class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all duration-200 active:scale-95 shadow-lg ui-button"
			>
				<BookOpen size={18} />
			</button> -->
		</div>
	</div>
</header>

<!-- Settings Modal -->
<GameSettings 
	isOpen={showSettingsModal}
	onClose={() => showSettingsModal = false}
/>

<style>
	.ui-button:active {
		transform: scale(0.95);
	}
</style> 