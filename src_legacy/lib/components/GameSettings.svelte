<script>
	import { Volume2, VolumeX, Smartphone, Music, X } from 'lucide-svelte';
	import { gameSettings, gameStats } from '$lib/stores/gameProgress.js';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	
	let { 
		isOpen = false,
		onClose = () => {}
	} = $props();
	
	// Helper functions to format stats
	function formatTime(seconds) {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
	
	function formatDate(dateString) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString();
	}
</script>

{#if isOpen}
	<!-- Settings Modal -->
	<div 
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
	>
		<div 
			class="w-full max-w-md mx-4 mb-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl"
			transition:fly={{ y: 300, duration: 400, easing: quintOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-zinc-700">
				<h2 class="text-xl font-semibold text-white">Settings</h2>
				<button
					onclick={onClose}
					class="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Settings Content -->
			<div class="p-6 space-y-6">
				<!-- Audio Settings -->
				<div>
					<h3 class="text-lg font-medium text-white mb-4">Audio</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								{#if $gameSettings.soundEnabled}
									<Volume2 size={20} class="text-slate-400" />
								{:else}
									<VolumeX size={20} class="text-slate-400" />
								{/if}
								<span class="text-slate-300">Sound Effects</span>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={$gameSettings.soundEnabled}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
							</label>
						</div>
						
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								{#if $gameSettings.musicEnabled}
									<Music size={20} class="text-slate-400" />
								{:else}
									<VolumeX size={20} class="text-slate-400" />
								{/if}
								<span class="text-slate-300">Background Music</span>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={$gameSettings.musicEnabled}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
							</label>
						</div>
					</div>
				</div>

				<!-- Gameplay Settings -->
				<div>
					<h3 class="text-lg font-medium text-white mb-4">Gameplay</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<span class="text-slate-300">Auto-Save Progress</span>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={$gameSettings.autoSave}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
							</label>
						</div>
						
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Smartphone size={20} class="text-slate-400" />
								<span class="text-slate-300">Vibration</span>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={$gameSettings.vibrationEnabled}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
							</label>
						</div>
						
						<div class="flex items-center justify-between">
							<span class="text-slate-300">Animations</span>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									bind:checked={$gameSettings.showAnimations}
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
							</label>
						</div>
						
						<div class="flex items-center justify-between">
							<span class="text-slate-300">Difficulty</span>
							<select 
								bind:value={$gameSettings.difficulty}
								class="bg-zinc-800 border border-zinc-600 text-white text-sm rounded-lg px-3 py-2 min-w-20"
							>
								<option value="easy">Easy</option>
								<option value="normal">Normal</option>
								<option value="hard">Hard</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Game Statistics -->
				<div>
					<h3 class="text-lg font-medium text-white mb-4">Statistics</h3>
					<div class="bg-zinc-800/50 rounded-xl p-4 space-y-2">
						<div class="flex justify-between text-sm">
							<span class="text-slate-400">Total Play Time</span>
							<span class="text-white">{formatTime($gameStats.totalPlayTime)}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-slate-400">Levels Completed</span>
							<span class="text-white">{$gameStats.totalLevelsCompleted}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-slate-400">Total Moves</span>
							<span class="text-white">{$gameStats.totalMoves.toLocaleString()}</span>
						</div>
						<!-- <div class="flex justify-between text-sm">
							<span class="text-slate-400">Average Moves/Level</span>
							<span class="text-white">{$gameStats.averageMovesPerLevel.toFixed(1)}</span>
						</div> -->
						<div class="flex justify-between text-sm">
							<span class="text-slate-400">First Played</span>
							<span class="text-white">{formatDate($gameStats.firstPlayDate)}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-slate-400">Last Played</span>
							<span class="text-white">{formatDate($gameStats.lastPlayDate)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if} 