<script>
	import { goto } from '$app/navigation';
	import GameHeader from '$lib/components/GameHeader.svelte';
	import ChapterHeader from '$lib/components/ui/ChapterHeader.svelte';
	import LevelGrid from '$lib/components/ui/LevelGrid.svelte';
	import { 
		campaignProgress, 
		CHAPTERS_COUNT, 
		LEVELS_PER_CHAPTER,
		isChapterUnlocked 
	} from '$lib/stores/campaign.js';

	let darkTheme = $state(true);
	let currentChapter = $state(1);

	const chapterUnlocked = $derived(isChapterUnlocked(currentChapter));

	function goToPreviousChapter() {
		if (currentChapter > 1) {
			currentChapter--;
		}
	}

	function goToNextChapter() {
		if (currentChapter < CHAPTERS_COUNT) {
			currentChapter++;
		}
	}

	function handleLevelClick(chapter, level) {
		goto(`/play?mode=campaign&chapter=${chapter}&level=${level}`);
	}

	function goBack() {
		goto('/menu');
	}
</script>

<svelte:head>
	<title>TileLoop - Campaign</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
	<div class="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900"></div>
	
	<div class="absolute inset-0 opacity-5">
		<div class="w-full h-full" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
	</div>

	<GameHeader 
		showLevelInfo={false}
		showBackButton={true}
		showStats={false}
		bind:darkTheme
	/>

	<main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-16 pt-20">
		<ChapterHeader
			{currentChapter}
			totalChapters={CHAPTERS_COUNT}
			{chapterUnlocked}
			onPrevious={goToPreviousChapter}
			onNext={goToNextChapter}
		/>

		{#if chapterUnlocked}
			<LevelGrid
				chapter={currentChapter}
				levelsPerChapter={LEVELS_PER_CHAPTER}
				onLevelClick={handleLevelClick}
			/>
		{:else}
			<div class="w-full max-w-sm mx-auto text-center">
				<div class="bg-zinc-800/50 backdrop-blur-md border border-zinc-700 rounded-2xl p-8">
					<div class="text-slate-400 text-lg font-medium mb-2">
						Chapter Locked
					</div>
					<div class="text-slate-500 text-sm">
						Complete the previous chapter to unlock
					</div>
				</div>
			</div>
		{/if}

		<div class="mt-8 flex gap-2">
			{#each Array(CHAPTERS_COUNT) as _, i}
				{@const chapterNum = i + 1}
				{@const unlocked = isChapterUnlocked(chapterNum)}
				<div 
					class="w-2 h-2 rounded-full transition-all duration-200"
					class:bg-slate-600={chapterNum === currentChapter && unlocked}
					class:bg-slate-800={chapterNum !== currentChapter && unlocked}
					class:bg-zinc-800={!unlocked}
				></div>
			{/each}
		</div>
	</main>
</div>
