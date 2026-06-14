<script>
	import { Star, Lock } from 'lucide-svelte';
	
	let { 
		level = 1,
		unlocked = false,
		completed = false,
		stars = 0,
		onclick = () => {}
	} = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="relative aspect-square flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-300 group"
	class:opacity-40={!unlocked}
	class:cursor-not-allowed={!unlocked}
	onclick={unlocked ? onclick : undefined}
>
	<!-- Level square -->
	<div 
		class="w-full h-full rounded-xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300"
		class:bg-gradient-to-br={unlocked}
		class:from-slate-700={unlocked && !completed}
		class:to-slate-800={unlocked && !completed}
		class:border-slate-600={unlocked && !completed}
		class:from-emerald-700={completed}
		class:to-emerald-800={completed}
		class:border-emerald-600={completed}
		class:bg-zinc-800={!unlocked}
		class:border-zinc-700={!unlocked}
		class:hover:from-slate-600={unlocked && !completed}
		class:hover:to-slate-700={unlocked && !completed}
		class:hover:from-emerald-600={completed}
		class:hover:to-emerald-700={completed}
		class:hover:border-slate-500={unlocked && !completed}
		class:hover:border-emerald-500={completed}
		class:group-active:scale-95={unlocked}
		class:shadow-lg={unlocked}
		class:hover:shadow-xl={unlocked}
	>
		<!-- Background pattern for unlocked levels -->
		{#if unlocked}
			<div class="absolute inset-0 opacity-10">
				<div class="w-full h-full" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 8px 8px;"></div>
			</div>
		{/if}
		
		<!-- Lock icon for locked levels -->
		{#if !unlocked}
			<Lock size={20} class="text-zinc-600 mb-1" />
		{/if}
		
		<!-- Stars for completed levels -->
		{#if completed && stars > 0}
			<div class="flex gap-0.5 mb-1">
				{#each Array(3) as _, i}
					<Star 
						size={8} 
						class="transition-colors duration-200 {i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-emerald-400'}"
					/>
				{/each}
			</div>
		{/if}
		
		<!-- Level number -->
		<div 
			class="text-sm font-bold tracking-wide"
			class:text-white={unlocked}
			class:text-zinc-600={!unlocked}
		>
			{level}
		</div>
	</div>
</div> 