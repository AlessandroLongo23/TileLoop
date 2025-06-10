<script>
	import LevelButton from './LevelButton.svelte';
	import { campaignProgress, isLevelUnlocked, getLevelProgress } from '$lib/stores/campaign.js';
	
	let { 
		chapter = 1,
		levelsPerChapter = 15,
		onLevelClick = () => {}
	} = $props();
	
	// Create array of level numbers for this chapter
	const levels = $derived(Array.from({ length: levelsPerChapter }, (_, i) => i + 1));
</script>

<div class="w-full max-w-sm mx-auto">
	<!-- Level grid (5 rows x 3 columns) -->
	<div class="grid grid-cols-3 gap-4">
		{#each levels as level}
			{@const levelProgress = $campaignProgress[chapter]?.[level]}
			{@const unlocked = isLevelUnlocked(chapter, level)}
			<LevelButton
				{level}
				{unlocked}
				completed={levelProgress?.completed || false}
				stars={levelProgress?.stars || 0}
				onclick={() => onLevelClick(chapter, level)}
			/>
		{/each}
	</div>
</div> 