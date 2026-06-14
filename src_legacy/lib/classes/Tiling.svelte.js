import { lineWidth } from '$lib/stores/configuration.js';
import { sortPointsByAngleAndDistance } from '$lib/utils/geometry.svelte';
import { isWithinTolerance } from '$lib/utils/math.svelte';
import { Vector } from '$lib/classes/Vector.svelte.js';
import { get } from 'svelte/store';

export class Tiling {
    constructor() {
        this.nodes = [];
        this.anchorNodes = [];
        this.dual = false;

        this.shapeSeed = [];
        this.transforms = [];

        this.parsedGolRule = {};
        this.golRuleType = 'Single';
        this.rules = {};
        this.rule = {};

        this.vertexGroups = [];
        this.crNotation = '';
    }

    show = (ctx, opacity = 1) => {
        const lineWidthValue = get(lineWidth);
        if (lineWidthValue > 1) {
            // ctx.strokeWeight(lineWidthValue);
            ctx.stroke(0, 0, 0);
        } else if (lineWidthValue === 0) {
            ctx.noStroke();
        } else {
            // ctx.strokeWeight(1);
            ctx.stroke(0, 0, 0, lineWidthValue);
        }
        
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].show(ctx, null, opacity, this.islamic);
        }
    }
}