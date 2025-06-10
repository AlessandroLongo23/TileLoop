<script>
	import { ChevronLeft, ChevronRight, Lock } from 'lucide-svelte';
	
	let { 
		currentChapter = 1,
		totalChapters = 10,
		chapterUnlocked = true,
		onPrevious = () => {},
		onNext = () => {}
	} = $props();
	
	const canGoPrevious = $derived(currentChapter > 1);
	const canGoNext = $derived(currentChapter < totalChapters);
</script>

<div class="flex items-center justify-between w-full max-w-sm mx-auto mb-8">
	<!-- Previous chapter button -->
	<button
		onclick={canGoPrevious ? onPrevious : undefined}
		class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
		class:bg-slate-700={canGoPrevious}
		class:hover:bg-slate-600={canGoPrevious}
		class:border={canGoPrevious}
		class:border-slate-600={canGoPrevious}
		class:text-white={canGoPrevious}
		class:shadow-lg={canGoPrevious}
		class:active:scale-95={canGoPrevious}
		class:opacity-30={!canGoPrevious}
		class:cursor-not-allowed={!canGoPrevious}
		class:text-slate-600={!canGoPrevious}
		disabled={!canGoPrevious}
	>
		<ChevronLeft size={20} />
	</button>
	
	<!-- Chapter title -->
	<div class="flex flex-col items-center">
		<div class="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
			Campaign
		</div>
		<div class="flex items-center gap-2">
			{#if !chapterUnlocked}
				<Lock size={16} class="text-slate-500" />
			{/if}
			<h2 
				class="text-2xl font-bold tracking-wide"
				class:text-white={chapterUnlocked}
				class:text-slate-500={!chapterUnlocked}
			>
				Chapter {currentChapter}
			</h2>
		</div>
	</div>
	
	<!-- Next chapter button -->
	<button
		onclick={canGoNext ? onNext : undefined}
		class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
		class:bg-slate-700={canGoNext}
		class:hover:bg-slate-600={canGoNext}
		class:border={canGoNext}
		class:border-slate-600={canGoNext}
		class:text-white={canGoNext}
		class:shadow-lg={canGoNext}
		class:active:scale-95={canGoNext}
		class:opacity-30={!canGoNext}
		class:cursor-not-allowed={!canGoNext}
		class:text-slate-600={!canGoNext}
		disabled={!canGoNext}
	>
		<ChevronRight size={20} />
	</button>
</div> 