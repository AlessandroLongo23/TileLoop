<script>
    import { scale, fly, fade } from 'svelte/transition';
    import { elasticOut, backOut, quintOut } from 'svelte/easing';
    import * as ls from 'lucide-svelte';

    let {
        showCelebration,
        celebrationStage,
        handleNextLevel,
        handlePlayAgain,
    } = $props();
</script>

<div 
    class="fixed inset-0 flex items-center justify-center z-50"
    transition:fade={{ duration: 400, easing: quintOut }}
>
    <!-- Subtle backdrop -->
    <div 
        class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        transition:fade={{ duration: 500 }}
    ></div>
    
    <!-- Main modal -->
    <div 
        class="relative bg-slate-800/95 backdrop-blur-xl border border-slate-600/30 rounded-2xl shadow-2xl max-w-xs mx-4"
        transition:scale={{ 
            duration: 500, 
            easing: backOut,
            start: 0.9 
        }}
    >
        <!-- Subtle top accent line -->
        <div class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-400/50 to-transparent"></div>
        
        <!-- Content -->
        <div class="p-8 text-center">
            
            <!-- Success icon -->
            {#if celebrationStage >= 1}
                <div 
                    class="flex justify-center mb-6"
                    transition:scale={{ 
                        duration: 400, 
                        delay: 150,
                        easing: backOut 
                    }}
                >
                    <div class="relative">
                        <div class="absolute inset-0 bg-slate-400/20 rounded-full blur-lg"></div>
                        <div class="relative bg-slate-700/80 border border-slate-500/50 p-3 rounded-full">
                            <ls.CheckCircle2 size={32} class="text-slate-200" />
                        </div>
                    </div>
                </div>
            {/if}
            
            <!-- Success message -->
            {#if celebrationStage >= 2}
                <div 
                    transition:fly={{ 
                        y: 12, 
                        duration: 400, 
                        delay: 100,
                        easing: quintOut 
                    }}
                >
                    <h2 class="text-2xl font-light text-slate-100 mb-2 tracking-wide">
                        Level Complete
                    </h2>
                    <p class="text-slate-400 text-sm font-light mb-8 tracking-wide">
                        Well done
                    </p>
                </div>
            {/if}
            
            <!-- Action buttons -->
            {#if celebrationStage >= 3}
                <div 
                    class="space-y-3"
                    transition:fly={{ 
                        y: 12, 
                        duration: 400, 
                        delay: 100,
                        easing: quintOut 
                    }}
                >
                    <button 
                        class="w-full bg-slate-700/60 hover:bg-slate-600/60 border border-slate-500/30 hover:border-slate-400/40 text-slate-100 font-light py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group"
                        onclick={handleNextLevel}
                    >
                        <span class="tracking-wide">Continue</span>
                        <ls.ArrowRight size={16} class="text-slate-300 group-hover:text-slate-200 transition-colors duration-300" />
                    </button>
                    
                    <button 
                        class="w-full text-slate-400 hover:text-slate-300 font-light py-2 px-6 transition-all duration-300 text-sm tracking-wide"
                        onclick={handlePlayAgain}
                    >
                        Play Again
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>