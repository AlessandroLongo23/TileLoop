import { TilingGenerator } from '$lib/classes/TilingGenerator.svelte';
import { computeIntersection } from '$lib/utils/geometry.svelte';
import { isWithinTolerance } from '$lib/utils/math.svelte';
import { Vector } from '$lib/classes/Vector.svelte';

export class Level {
    constructor(rule) {
        this.tilingGenerator = new TilingGenerator();
        this.tiling = this.tilingGenerator.generateFromRule(rule);

        this.generateLevel();
    }

    generateLevel() {
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

        this.convertTilingToTiles();
        this.checkIfSolved();
    }

    convertTilingToTiles = () => {
        if (!this.tiling || !this.tiling.nodes) {
            console.warn('No this.tiling nodes available');
            return [];
        }

        this.minMovesToSolve = 0;
        for (const node of this.tiling.nodes) {
            let turns = Array.from({ length: node.n - 1 }, (_, i) => i).pickRandom();
            node.rotate(turns);
            this.minMovesToSolve += node.n - turns; // TODO: consider tile simmetries
        }

        const generatedTiles = [];
        for (let i = 0; i < this.tiling.nodes.length; i++) {
            const node = this.tiling.nodes[i];
            
            const [tileType, mirrored, turns] = this.getTileType(node);
            
            node.id = `tile-${i}-${node.centroid.x.toFixed(3)}-${node.centroid.y.toFixed(3)}`;
            node.tileType = tileType;
            node.mirrored = mirrored;
            node.isRotating = false;
            node.svgTurns = turns;
        }
    }

    getTileType = (node) => {
        const sides = node.n;
        const maxConnections = node.halfways.map(h => h.connections).reduce((a, b) => Math.max(a, b), 1);
        const connections = node.halfways.map(h => h.connections);
        const [lowestLexicographicCycle, mirrored, turns] = connections.cycleToMinimumLexicographicalOrder();
        const tileType = `${sides}/${lowestLexicographicCycle.join("")}`;

        return [tileType, mirrored, turns];
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

    draw(p5) {
        // this.tiling.show(p5);
        
        p5.noFill();
        p5.stroke(0);
        p5.strokeWeight(0.2);

        for (let node of this.tiling.nodes) {
            p5.noFill();
            p5.strokeWeight(0.01);
            p5.stroke(0, 0, 0, 0.1);
            p5.beginShape();
            for (let vertex of node.vertices) {
                p5.vertex(vertex.x, vertex.y);
            }
            p5.endShape(p5.CLOSE);

            p5.strokeWeight(0.05);
            let halfwaysWithLoop = node.halfways.filter(h => h.connections);
            
            if (halfwaysWithLoop.length == 0) 
                continue;
            
            if (halfwaysWithLoop.length == 1) {
                p5.stroke(0, 0, 0);
                p5.line(halfwaysWithLoop[0].x, halfwaysWithLoop[0].y, node.centroid.x, node.centroid.y);
                
                p5.fill(0, 0, 0);
                p5.noStroke();
                p5.ellipse(node.centroid.x, node.centroid.y, 0.2);
                continue;
            }

            // Calculate gaps between consecutive halfways
            let gaps = [];
            for (let i = 0; i < halfwaysWithLoop.length; i++) {
                let current = halfwaysWithLoop[i];
                let next = halfwaysWithLoop.next(i);
                let gap = Vector.distance(current, next);
                gaps.push({ index: i, gap: gap });
            }

            // Check if all gaps are the same (within tolerance)
            let allGapsEqual = true;
            let tolerance = 0.01; // Small tolerance for floating point comparison
            for (let i = 1; i < gaps.length; i++) {
                if (Math.abs(gaps[i].gap - gaps[0].gap) > tolerance) {
                    allGapsEqual = false;
                    break;
                }
            }

            // Find the index of the biggest gap if gaps are not equal
            let skipIndex = -1;
            if (!allGapsEqual) {
                let maxGap = Math.max(...gaps.map(g => g.gap));
                skipIndex = gaps.find(g => g.gap === maxGap).index;
            }

            for (let i = 0; i < halfwaysWithLoop.length; i++) {
                // Skip drawing arc for the biggest gap if gaps are not equal
                if (!allGapsEqual && i === skipIndex) {
                    continue;
                }

                let h = halfwaysWithLoop[i];
                let next = halfwaysWithLoop.next(i);

                // Draw arc between two consecutive halfways if both have loop = true
                let s1 = Vector.sub(h, node.centroid).rotate(Math.PI / 2);
                let s2 = Vector.sub(next, node.centroid).rotate(Math.PI / 2);
                let intersection = computeIntersection(h, s1, next, s2);
                if (!intersection) {
                    p5.stroke(0, 0, 0);
                    p5.line(h.x, h.y, next.x, next.y);
                    continue;
                }

                let v1 = Vector.sub(h, intersection);
                let v2 = Vector.sub(next, intersection);
                let dist = Vector.distance(h, intersection);
                let endAngle = v1.heading();    
                let startAngle = v2.heading();

                if (startAngle > endAngle) {
                    let temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }
                
                // Ensure we draw the shorter arc by adjusting angles if needed
                let angleDiff = endAngle - startAngle;
                if (angleDiff > Math.PI) {
                    let temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }
                
                p5.stroke(0, 0, 0);
                p5.arc(intersection.x, intersection.y, 2 * dist, 2 * dist, startAngle, endAngle);
            }
        }
    }
}