<script>
	import { golRule, golRules, selectedTiling, transformSteps, parameter, lineWidth, islamicAngle } from '$lib/stores/configuration.js';
	import { tilingRules } from '$lib/stores/tilingRules.js';
	import { createEventDispatcher, onMount } from 'svelte';
	import { slide, fade } from 'svelte/transition';
	import * as ls from 'lucide-svelte';
	import { sounds } from '$lib/utils/sounds.js';

	import TilingCard from '$lib/components/TilingCard.svelte';
	import Slider from '$lib/components/ui/Slider.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let { 
		isSidebarOpen = $bindable(true),
		sidebarElement = $bindable(''),
		onSectionSelect = $bindable(() => {}),
		activeTheorySection = $bindable('')
	} = $props();

	let expandedGroups = $state({});
	
	$effect(() => {
		if (Object.keys(expandedGroups).length === 0) {
			let initialState = {};
			tilingRules.forEach(group => {
				initialState[group.title] = true;
			});
			expandedGroups = initialState;
		}
	});
	
	const toggleGroup = (groupTitle) => {
		expandedGroups[groupTitle] = !expandedGroups[groupTitle];
		setTimeout(setupObservers, 300);
	};

	let shapes = $derived.by(() => {
		let shapes = new Set();
		let seed = $selectedTiling.rulestring.split('/')[0].replaceAll(',', '-').split('-');
		for (let shape of seed)
			if (shape !== '0')
				shapes.add(parseInt(shape));

		return Array.from(shapes).sort((a, b) => a - b);
	});
	
	const dispatch = createEventDispatcher();
	
	const toggleSidebar = () => {
		isSidebarOpen = !isSidebarOpen;
		
		dispatch('toggle', { isSidebarOpen });
		
		if (isSidebarOpen) {
			setTimeout(() => {
				window.dispatchEvent(new Event('resize'));
			}, 300);
		}
	}

	const loadGolRule = (selectedRule) => {
        $golRule = selectedRule;
    }
    
    const loadTiling = (tiling) => {
        $selectedTiling = tiling;
    }
    
	const expandAll = () => {
		expandedGroups = tilingRules.reduce((acc, curr) => {
			acc[curr.title] = true;
			return acc;
		}, {});
		// We need to refresh observers after groups expand
		setTimeout(setupObservers, 300);
	}

	const collapseAll = () => {
		expandedGroups = tilingRules.reduce((acc, curr) => {
			acc[curr.title] = false;
			return acc;
		}, {});
		// We need to refresh observers after groups collapse
		setTimeout(setupObservers, 300);
	}

	let isParametrized = $derived($selectedTiling.rulestring.includes('a'));
	let isIslamic = $derived($selectedTiling.rulestring.includes('i'));
	
	// Track current visible folder
	let catalogContainer;
	let currentVisibleGroup = $state("");
	let previousVisibleGroup = $state("");
	let scrollingTimer;
	let isScrolling = $state(false);
	let observer;
	let observerNeedsRefresh = $state(false);
	
	// Use $effect to replace afterUpdate
	$effect(() => {
		// If we just expanded or collapsed a group, we need to refresh the observers
		if (catalogContainer && observerNeedsRefresh) {
			const groupElements = catalogContainer.querySelectorAll('.tiling-group');
			if (groupElements.length > 0 && (!observer || observer.takeRecords().length === 0)) {
				setupObservers();
			}
			observerNeedsRefresh = false;
		}
	});
	
	// Function to setup or refresh IntersectionObserver
	const setupObservers = () => {
		if (!catalogContainer) return;
		
		// Clear previous observers
		if (observer) {
			observer.disconnect();
		}
		
		if (typeof IntersectionObserver !== 'undefined') {
			const options = {
				root: catalogContainer,
				rootMargin: '-10px 0px -90% 0px',
				threshold: 0
			};

			observer = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const groupTitle = entry.target.getAttribute('data-group-title');
						if (currentVisibleGroup !== groupTitle) {
							previousVisibleGroup = currentVisibleGroup;
							currentVisibleGroup = groupTitle;
						}
					}
				});
			}, options);
			
			// Observe all groups
			const groupElements = catalogContainer.querySelectorAll('.tiling-group');
			groupElements.forEach(element => {
				observer.observe(element);
			});
			
			// Mark that observers have been refreshed
			observerNeedsRefresh = false;
		}
	};
	
	// Setup IntersectionObserver for better scroll detection
	onMount(() => {
		setupObservers();
		
		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});
	
	// Handle traditional scroll detection as fallback
	const updateVisibleGroup = () => {
		// Only use this method if IntersectionObserver is not available
		if (observer) return;
		
		if (!catalogContainer) return;
		
		// Set scrolling state
		isScrolling = true;
		clearTimeout(scrollingTimer);
		scrollingTimer = setTimeout(() => {
			isScrolling = false;
		}, 100);
		
		const groupElements = catalogContainer.querySelectorAll('.tiling-group');
		
		for (let i = groupElements.length - 1; i >= 0; i--) {
			const element = groupElements[i];
			const rect = element.getBoundingClientRect();
			const containerRect = catalogContainer.getBoundingClientRect();
			
			// Check if element is visible
			if (rect.top <= containerRect.top + 50) {
				const groupTitle = element.getAttribute('data-group-title');
				if (currentVisibleGroup !== groupTitle) {
					previousVisibleGroup = currentVisibleGroup;
					currentVisibleGroup = groupTitle;
				}
				break;
			}
		}
	};
	
	// Track scrolling state for visual effects
	const handleScroll = () => {
		isScrolling = true;
		clearTimeout(scrollingTimer);
		scrollingTimer = setTimeout(() => {
			isScrolling = false;
		}, 100);
		
		// Fallback for browsers without IntersectionObserver
		if (!observer) {
			updateVisibleGroup();
		}
	};
	
	// Scroll to group when clicked from sticky header
	const scrollToGroup = (groupTitle) => {
		const groupElement = catalogContainer.querySelector(`.tiling-group[data-group-title="${groupTitle}"]`);
		if (groupElement) {
			groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};
	
	// Watch for changes that should trigger observer refresh
	$effect(() => {
		// Create a dependency on expandedGroups to refresh when it changes
		const expandedGroupsState = JSON.stringify(expandedGroups);
		if (Object.keys(expandedGroups).length > 0) {
			observerNeedsRefresh = true;
		}
	});

	// For theory content
	let theoryActiveSection = $state('');
	
	const handleTheorySectionSelect = (e) => {
		onSectionSelect(e.detail.sectionId);
	};

	$effect(() => {
		theoryActiveSection = activeTheorySection;
	});
</script>

<div id="sidebar" class="h-full fixed left-0 top-0 transition-all duration-300 flex flex-col shadow-2xl {isSidebarOpen ? 'w-96' : 'w-12'}" bind:this={sidebarElement}>
	<div class="bg-zinc-800/90 backdrop-blur-sm text-white h-full overflow-hidden flex flex-col border-r border-zinc-700/50">
		<div class="p-3 flex items-center justify-between border-b border-zinc-700/50 flex-shrink-0 bg-zinc-900/30">
			{#if isSidebarOpen}
				<h2 class="text-sm font-medium text-white/90 uppercase tracking-wider">Controls</h2>
			{/if}

			<button
				onclick={toggleSidebar}
				class="p-1 rounded-md hover:bg-zinc-700/70 transition-all text-white/80 hover:text-white/100"
				aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
			>
				{#if isSidebarOpen}
					<ls.ChevronLeft size={18} />
				{:else}
					<ls.ChevronRight size={18} />
				{/if}
			</button>
		</div>
		
		{#if isSidebarOpen}
			<div class="flex-1 overflow-hidden">
				<div class="h-full flex flex-col">
					<!-- Fixed options section -->
					<div class="p-3 flex-shrink-0 border-b border-zinc-700/50 bg-zinc-800/40">
						<div class="flex flex-col gap-3">
							<div class="flex flex-row gap-3">
								<!-- <div class="w-2/3">
									<Input 
										id="tilingRule"
										label="Tiling Rule"
										bind:value={$selectedTiling.rulestring}
										placeholder="4/m90/r(h1)"
									/>
								</div> -->

								<!-- <div class="w-1/3"> -->
									<Input
										id="transformSteps"
										type="number"
										label="Layers"
										bind:value={$transformSteps}
										min={0}
									/>
								<!-- </div> -->

								<Input 
									id="lineWidth"
									type="number"
									label="Line Width"
									bind:value={$lineWidth}
									min={0}
									step={0.25}
								/>
							</div>	

							{#if isParametrized}
								<Slider 
									id="parameter"
									label="Parameter"
									bind:value={$parameter}
									min={15}
									max={165}
									step={1}
									unit="°"
								/>
							{/if}

							{#if isIslamic}
								<Slider
									id="islamicAngle"
									label="Islamic Angle"
									bind:value={$islamicAngle}
									min={0}
									max={180}
									step={1}
									unit="°"
								/>
							{/if}
						</div>
					</div>
					
					<!-- Scrollable rules section -->
					<div class="flex-1 overflow-y-auto relative" bind:this={catalogContainer} onscroll={handleScroll}>
						<div class="flex flex-col gap-2">
							<!-- Sticky header with main title -->
							<div class="sticky-header p-3 bg-zinc-800 {isScrolling ? 'scrolling' : ''}">
								<div class="flex items-center justify-between">
									<h3 class="font-medium text-xs text-white/90 uppercase tracking-wider">Tiling Patterns <span class="ml-1 text-green-400/90 font-medium rounded-full px-1.5 py-0.5 text-xs bg-green-400/10">{tilingRules.reduce((acc, curr) => acc + curr.rules.length, 0)}</span></h3>
									
									<div class="flex flex-row gap-1.5">
										{#if Object.keys(expandedGroups).reduce((acc, curr) => acc + expandedGroups[curr], 0) == tilingRules.length}
											<button
												class="p-1 rounded-md hover:bg-zinc-700/70 transition-all text-white/80 hover:text-white/100"
												onclick={collapseAll}
												aria-label="Collapse all"
												title="Collapse all"
											>
												<ls.ChevronsDownUp size={14} />
											</button>
										{:else}
											<button
												class="p-1 rounded-md hover:bg-zinc-700/70 transition-all text-white/80 hover:text-white/100"
												onclick={expandAll}
												aria-label="Expand all"
												title="Expand all"
											>
												<ls.ChevronsUpDown size={14} />
											</button>
										{/if}

										<button
											class="p-1 rounded-md hover:bg-zinc-700/70 transition-all text-white/80 hover:text-white/100"
											onclick={openTilingModal}
											aria-label="View all tilings"
											title="View all tilings"
										>
											<ls.Maximize2 size={14} />
										</button>
									</div>
								</div>
								
								{#if currentVisibleGroup}
									<div class="group-indicator text-xs text-white/90 flex items-center justify-between" transition:fade={{ duration: 100 }}>
										<button 
											class="text-left flex-grow truncate hover:text-white"
											onclick={() => scrollToGroup(currentVisibleGroup)}
											title="Scroll to section"
										>
											{currentVisibleGroup}
										</button>
										
										{#if expandedGroups[currentVisibleGroup]}
											<button 
												class="p-0.5 rounded-md hover:bg-zinc-700/70 transition-all text-white/80 hover:text-white/100 ml-1.5 flex-shrink-0"
												onclick={() => toggleGroup(currentVisibleGroup)}
												aria-label="Collapse section"
												title="Collapse section"
											>
												<ls.ChevronsDownUp size={12} />
											</button>
										{:else}
											<button 
												class="p-0.5 rounded-md hover:bg-zinc-700/70 transition-all text-white/80 hover:text-white/100 ml-1.5 flex-shrink-0"
												onclick={() => toggleGroup(currentVisibleGroup)}
												aria-label="Expand section"
												title="Expand section"
											>
												<ls.ChevronsUpDown size={12} />
											</button>
										{/if}
									</div>
								{/if}
							</div>
							
							<div class="p-3">
								{#each tilingRules as tilingGroup}
									<div class="mb-2 tiling-group" data-group-title={tilingGroup.title}>
										<button 
											class="tiling-group-button font-medium text-zinc-300 hover:text-white focus:outline-none"
											onclick={() => toggleGroup(tilingGroup.title)}
											aria-expanded={expandedGroups[tilingGroup.title]}
										>
											<span>{tilingGroup.title}</span>
											<div class="flex items-center">
												<span class="tiling-count">{tilingGroup.rules.length}</span>
												<ls.ChevronDown 
													size={14} 
													class="transition-transform duration-200 ml-1 {expandedGroups[tilingGroup.title] ? 'rotate-180' : ''}"
												/>
											</div>
										</button>
										
										{#if expandedGroups[tilingGroup.title]}
											<div class="grid grid-cols-2 gap-2" transition:slide={{ duration: 150 }}>
												{#each tilingGroup.rules as tiling}
													<TilingCard 
														groupId={tilingGroup.id}
														name={tiling.name}
														cr={tiling.cr}
														rulestring={tiling.rulestring}
														golRules={tiling.golRules}
														onClick={loadTiling}
													/>

													{#if tilingGroup.dual}
														<TilingCard 
															groupId={tilingGroup.id}
															name={tiling.dualname}
															cr={tiling.cr}
															rulestring={tiling.rulestring.concat('*')}
															golRules={tiling.golRules}
															onClick={loadTiling}
														/>
													{/if}
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div> 

<style>
	.sticky-header {
		position: sticky;
		top: 0;
		z-index: 10;
		transition: all 0.2s ease;
	}
	
	.sticky-header.scrolling {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	
	.group-indicator {
		padding: 0.25rem 0.5rem;
		margin-top: 0.5rem;
		background-color: rgba(39, 39, 42, 0.5);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
		border: 1px solid rgba(63, 63, 70, 0.3);
	}
	
	.tiling-group {
		scroll-margin-top: 80px;
	}
	
	.tiling-group-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.3rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		transition: background-color 0.15s ease;
	}
	
	.tiling-group-button:hover {
		background-color: rgba(63, 63, 70, 0.3);
	}
	
	.tiling-count {
		font-size: 0.7rem;
		color: rgba(74, 222, 128, 0.9);
		padding: 0.1rem 0.4rem;
		border-radius: 1rem;
		background-color: rgba(74, 222, 128, 0.1);
		margin-left: 0.5rem;
	}
</style>