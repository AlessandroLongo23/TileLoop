import { TilingGenerator } from '$lib/classes/TilingGenerator.svelte';
import { computeIntersection } from '$lib/utils/geometry.svelte';
import { isWithinTolerance } from '$lib/utils/math.svelte';
import { scale } from '$lib/stores/configuration.js';
import { Vector } from '$lib/classes/Vector.svelte';

import { tilingRules } from '$lib/stores/tilingRules.js';

export class Level {
    constructor(rule, transformSteps, width, height) {
        // Generate unique ID for this level instance
        this.id = `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.tilingGenerator = new TilingGenerator();
        this.size = new Vector(width, height);
        scale.subscribe(v => this.scale = v);

        rule = rule || tilingRules.map(group => group.rules).flat().pickRandom().rulestring;
        transformSteps = transformSteps || [1, 2, 3].pickRandom([0.5, 0.4, 0.1]);
        this.tiling = this.tilingGenerator.generateFromRule(rule, transformSteps);

        this.removeOverflowingTiles();
        this.generateConnections();
        this.convertTilingToTiles();
        this.checkIfSolved();
        this.addEffects();

        this.isFrozen = false;
    }

    removeOverflowingTiles() {
        for (let i = this.tiling.nodes.length - 1; i >= 0; i--) {
            const node = this.tiling.nodes[i];
            node.screenPosition = Vector.add(
                Vector.scale(this.size, 0.5), Vector.scale(node.centroid, this.scale)
            );
            
            if (node.screenPosition.x > this.size.x - 50 || 
                node.screenPosition.y > this.size.y - 50 || 
                node.screenPosition.x < 50 || 
                node.screenPosition.y < 200) {
                this.tiling.nodes.splice(i, 1);
                continue;
            }
        }
    }

    generateConnections() {
        let uniqueHalfways = [];
        for (const node of this.tiling.nodes) {
            for (const halfway of node.halfways) {
                if (!uniqueHalfways.some(h => isWithinTolerance(h.a, halfway))) {
                    uniqueHalfways.push({
                        a: halfway,
                        b: null
                    });
                } else {
                    uniqueHalfways.find(h => isWithinTolerance(h.a, halfway)).b = halfway;
                }
            }
        }

        for (const h of uniqueHalfways) {
            if (h.b) {
                let connection = [0, 1, 2].pickRandom([0.45, 0.45, 0.10]);
                h.a.connections = connection;
                h.b.connections = connection;
            } else {
                h.a.connections = 0;
            }
        }
    }

    convertTilingToTiles = () => {
        if (!this.tiling || !this.tiling.nodes) {
            console.warn('No this.tiling nodes available');
            return [];
        }

        const generatedTiles = [];
        for (let i = this.tiling.nodes.length - 1; i >= 0; i--) {
            const node = this.tiling.nodes[i];

            const [tileType, mirrored, turns, simmetries] = this.getTileType(node);
            
            node.id = `tile-${i}-${node.centroid.x.toFixed(3)}-${node.centroid.y.toFixed(3)}`;
            
            node.tileType = tileType;
            if (mirrored) node.mirror();
            node.isRotating = false;
            node.svgTurns = turns;
            node.simmetries = simmetries;
 
            node.effects = [];
        }

        this.shuffle();
    }

    getTileType = (node) => {
        const sides = node.n;
        const maxConnections = node.halfways.map(h => h.connections).reduce((a, b) => Math.max(a, b), 1);
        const connections = node.halfways.map(h => h.connections);
        const [lowestLexicographicCycle, mirrored, turns] = connections.cycleToMinimumLexicographicalOrder();
        const simmetries = connections.getSimmetries();
        const tileType = `${sides}/${lowestLexicographicCycle.join("")}`;

        return [tileType, mirrored, turns, simmetries];
    }

    addEffects = () => {
        for (const node of this.tiling.nodes)
            if (node.halfways.some(h => h.connections) && Math.random() < 0.2)
                node.effects.push(new Effect(Math.random() < 0.5 ? 'rotate' : 'rotate', this.tiling, node));
    }
    
    shuffle = () => {
        this.minMovesToSolve = 0;
        for (const node of this.tiling.nodes) {
            let turns = Array.from({ length: node.n - 1 }, (_, i) => i).pickRandom();
            node.rotate(turns);
            for (const effect of node.effects) {
                for (let i = 0; i < turns; i++) {
                    effect.resolve();
                }
            }
            this.minMovesToSolve += node.n - turns; // TODO: consider tile simmetries
        }
    }

    checkIfSolved = () => {
        let uniqueHalfways = [];
        for (const node of this.tiling.nodes) {
            for (const halfway of node.halfways) {
                halfway.matched = false;
                if (!uniqueHalfways.some(h => isWithinTolerance(h.a, halfway))) {
                    uniqueHalfways.push({
                        a: halfway,
                        b: null
                    });
                } else {
                    uniqueHalfways.find(h => isWithinTolerance(h.a, halfway)).b = halfway;
                }
            }
        }

        let solved = true;
        for (const h of uniqueHalfways) {
            if (h.b == null) {
                h.a.matched = h.a.connections == 0;
                if (!h.a.matched) {
                    solved = false;
                }
                continue;
            } else if (h.a.connections != h.b.connections) {
                solved = false;
            } else {
                h.a.matched = true;
                h.b.matched = true;
            }
        }
        
        return solved;
    }
}

export class Effect {
    constructor(type, tiling, node) {
        this.type = type;
        
        if (this.type == 'rotate') {
            this.color = '#aa0000';
            this.target = tiling.nodes.filter(n => n.id != node.id && n.halfways.some(h => h.connections)).pickRandom();
            let choices = Array.from({ length: this.target.n }, (_, i) => (i - (Math.floor(node.n / 2) + 1)));
            choices = choices.filter(c => c != 0);
            this.turns = choices.pickRandom();
        }

        else if (this.type == 'mirror') {
            this.color = '#0000aa';
            this.target = tiling.nodes.filter(n => n.id != node.id && n.halfways.some(h => h.connections) && n.simmetries.length == 0).pickRandom();
        }
    }

    resolve() {
        if (this.type == 'rotate') {
            this.target.rotate(this.turns);
        } else if (this.type == 'mirror') {
            this.target.mirror();
        }
    }
}