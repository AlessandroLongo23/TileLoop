<script>
	import { Palette, Triangle, Square, Hexagon, X } from 'lucide-svelte';
	import { gameAppearance, updateShapeStyle } from '$lib/stores/gameAppearance.js';
	import { tilesets } from '$lib/stores/data.js';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	
	let { 
		isOpen = false,
		onClose = () => {}
	} = $props();
	
	// Available shapes for tileset customization
	const shapes = [
		{ id: 'triangle', name: 'Triangle', icon: Triangle },
		{ id: 'square', name: 'Square', icon: Square },
		{ id: 'hexagon', name: 'Hexagon', icon: Hexagon }
	];
	
	// Handle tileset selection for a specific shape
	function handleTilesetSelection(shape, tileset) {
		updateShapeStyle(shape, { tileset });
	}
</script>

{#if isOpen}
	<!-- Appearance Modal -->
	<div 
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		}}
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
	>
		<div 
			role="button"
			tabindex="0"
			onkeydown={(e) => {}}
			class="w-full max-w-md mx-4 mb-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
			transition:fly={{ y: 300, duration: 400, easing: quintOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between p-6 border-b border-zinc-700 sticky top-0 bg-zinc-900 rounded-t-2xl">
				<div class="flex items-center gap-3">
					<Palette size={24} class="text-slate-400" />
					<h2 class="text-xl font-semibold text-white">Appearance</h2>
				</div>
				<button
					onclick={onClose}
					class="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200"
				>
					<X size={18} />
				</button>
			</div>

			<div class="p-6 space-y-8">
				<!-- Shape-specific Tileset Selection -->
				<div class="space-y-6">
					<h3 class="text-lg font-semibold text-white mb-4">Shape Tilesets</h3>
					
					{#each shapes as shape}
						<div class="space-y-3">
							<div class="flex items-center gap-2">
								<span class="text-white text-2xl"><shape.icon size={16} /></span>
								<h4 class="text-md font-medium text-white">{shape.name}</h4>
							</div>
							
							<div class="grid grid-cols-3 gap-2">
								{#each $tilesets as tileset}
									{@const isSelected = $gameAppearance.shapeStyles[shape.id].tileset === tileset}
									<button
										onclick={() => handleTilesetSelection(shape.id, tileset)}
										class="p-3 rounded-lg border transition-all duration-200 {isSelected 
											? 'bg-slate-600 border-slate-500 text-white' 
											: 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500'}"
									>
										<div class="text-sm font-medium capitalize">{tileset}</div>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if} 