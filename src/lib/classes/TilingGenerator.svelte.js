import { tolerance, transformSteps, offsets, possibleSides, possibleAngles } from '$lib/stores/configuration.js';
import { RegularPolygon, IsotoxalPolygon, StarPolygon, DualPolygon } from '$lib/classes/Polygon.svelte';
import { sortPointsByAngleAndDistance, getClockwiseAngle } from '$lib/utils/geometry.svelte';
import { apothem, angleBetween } from '$lib/utils/geometry.svelte';
import { getSpatialKey } from '$lib/utils/optimizing.svelte';
import { isWithinTolerance } from '$lib/utils/math.svelte';
import { compareArrays } from '$lib/utils/utils.svelte';
import { Vector } from '$lib/classes/Vector.svelte';
import { Tiling } from '$lib/classes/Tiling.svelte';
import { get } from 'svelte/store';

const vertexConfigurations = [
    [3, 12, 12],
    [4, 6, 12], [4, 12, 6],
    // [4, 8, 8],
    [6, 6, 6],

    [3, 3, 4, 12], [3, 3, 12, 4],
    [3, 3, 6, 6],
    [3, 4, 3, 12],
    [3, 4, 4, 6], [3, 6, 4, 4],
    [3, 4, 6, 4],
    [3, 6, 3, 6],
    [4, 4, 4, 4],
    
    [3, 3, 3, 3, 6],
    [3, 3, 3, 4, 4],
    [3, 3, 4, 3, 4],
    
    [3, 3, 3, 3, 3, 3],
]

const availablePolygons = [3, 4, 6, /*8,*/ 12];

Array.prototype.cyclicallyInclude = function(array) {
    if (array.length > this.length) return false;
    if (array.some(a => !this.includes(a))) return false;
    
    for (let i = 0; i < this.length; i++) {
        let match = true;
        for (let j = 0; j < array.length; j++) {
            if (this[(i + j) % this.length] != array[j]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }

    return false;
}

Array.prototype.pickRandom = function(weights) {
    let sum = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * sum;
    let cumulative = 0;
    for (let i = 0; i < this.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) return this[i];
    }
}

String.prototype.count = function(char) {
    return this.split(char).length - 1;
}

Array.prototype.findSubsequenceStartingIndex = function(subsequence) {
    if (subsequence.length > this.length) return [];

    let startingIndexes = [];
    for (let i = 0; i < this.length; i++) {
        let match = true;
        for (let j = 0; j < subsequence.length; j++) {
            if (this[(i + j) % this.length] != subsequence[j]) {
                match = false;
                break;
            }
        }

        if (match) startingIndexes.push(i);
    }

    return startingIndexes;
}

export class TilingGenerator {
    constructor() {
        this.tiling = new Tiling();
        this.possibleVertexConfigurations = [...vertexConfigurations];
    }

    generateWithWFC() {
        this.tiling.nodes = [];

        this.addFirstNode();

        let iterations = 0;
        while (true) {
            this.prune();
            this.evaluateVertices();

            let lowestEntropyVertex = this.getLowestEntropyVertex();
            if (lowestEntropyVertex == Infinity) break;

            this.collapseVertex(lowestEntropyVertex);
            this.propagateConstraints(lowestEntropyVertex);

            console.log(this.tiling.nodes)

            console.log('--------------------------------')

            if (this.tiling.nodes.length > 250 || iterations > 100) break;
            iterations++;
        }

        return this.tiling;
    }

    addFirstNode = () => {
        let sides = availablePolygons.pickRandom();

        this.tiling.nodes.push(new RegularPolygon({
            centroid: new Vector(),
            n: sides,
            angle: sides == 3 ? 0 : Math.PI / sides
        }));
    }

    prune = () => {
        let newNodes = [];
        for (let node of this.tiling.nodes) {
            if (isNaN(node.centroid.x)) continue;
            if (newNodes.some(n => isWithinTolerance(n.centroid, node.centroid))) continue;

            newNodes.push(node);
        }

        this.tiling.nodes = [...newNodes];
    }

    computePossibleConfigurations = (v, shapesAround) => {
        shapesAround.sort((a, b) => Vector.sub(a.centroid, v).heading() - Vector.sub(b.centroid, v).heading());
        shapesAround = shapesAround.map(shape => shape.n);

        return this.possibleVertexConfigurations.filter(c => c.cyclicallyInclude(shapesAround));
    }

    evaluateVertices = () => {
        this.uniqueUncollapsedVertices = []
        
        for (let node of this.tiling.nodes) {
            for (let vertex of node.vertices) {
                // if the vertex is already in the list, skip
                if (this.uniqueUncollapsedVertices.some(v => isWithinTolerance(v.coord, vertex)))
                    continue;

                // get the shapes around the vertex
                let shapesAround = [];
                for (let otherNode of this.tiling.nodes) {
                    for (let otherVertex of otherNode.vertices) {
                        if (isWithinTolerance(vertex, otherVertex)) {
                            shapesAround.push(otherNode);
                            break;
                        }
                    }
                }
                
                // get the covered angle
                let coveredAngle = shapesAround.reduce((acc, shape) => acc + Math.PI * (shape.n - 2) / shape.n, 0);

                // get the possible configurations, and skip if there are none (impossible vertex)
                let possibleConfigurations = this.computePossibleConfigurations(vertex, shapesAround);
                if (possibleConfigurations.length == 0) continue;

                // if the vertex is fully covered, skip
                if (isWithinTolerance(coveredAngle, 2 * Math.PI) || coveredAngle > 2 * Math.PI) 
                    continue;

                let neighbors = this.tiling.nodes.flatMap(n => n.vertices).filter(other => isWithinTolerance(vertex.distance(other),  1));

                // add the vertex to the list of unique uncollapsed vertices
                this.uniqueUncollapsedVertices.push({
                    coord: vertex,
                    radialDistance: vertex.mag(),
                    neighbors: neighbors,
                    shapesAround: shapesAround,
                    coveredAngle: coveredAngle,
                    possibleConfigurations: possibleConfigurations
                });
            }
        }
    }

    getLowestEntropyVertex = () => {
        let lowestEntropy = Infinity;
        let minRadialDistance = Infinity;
        let lowestEntropyVertex = null;

        for (let freeVertex of this.uniqueUncollapsedVertices) {
            if (freeVertex.possibleConfigurations.length < lowestEntropy) {
                lowestEntropy = freeVertex.possibleConfigurations.length;
                minRadialDistance = freeVertex.radialDistance;
                lowestEntropyVertex = freeVertex;
            } else if (freeVertex.possibleConfigurations.length == lowestEntropy && freeVertex.radialDistance < minRadialDistance) {
                minRadialDistance = freeVertex.radialDistance;
                lowestEntropyVertex = freeVertex;
            }
        }

        console.log('lowest entropy vertex: ', lowestEntropyVertex)
        console.log('lowest entropy: ', lowestEntropy)

        return lowestEntropyVertex;
    }

    collapseVertex = (vertex) => {
        let randomConfiguration = vertex.possibleConfigurations.pickRandom();
        
        console.log("chosen configuration: ", randomConfiguration)

        console.log("already placed nodes around vertex: ", vertex.shapesAround)

        // sort the by the angle from the centroid to the vertex
        vertex.shapesAround.sort((a, b) => {
            let angleA = Vector.sub(a.centroid, vertex.coord).heading();
            let angleB = Vector.sub(b.centroid, vertex.coord).heading();
            return angleA - angleB;
        });

        console.log("already placed nodes around vertex (sorted): ", vertex.shapesAround)

        if (vertex.shapesAround.length > 1) {
            for (let i = 0; i < vertex.shapesAround.length; i++) {
                let curr = vertex.shapesAround[i];
                let next = vertex.shapesAround[(i + 1) % vertex.shapesAround.length];

                let vecA = Vector.sub(curr.centroid, vertex.coord).normalize();
                let vecB = Vector.sub(next.centroid, vertex.coord).normalize();
                let intAngleA = Math.PI * (curr.n - 2) / (2 * curr.n);
                let intAngleB = Math.PI * (next.n - 2) / (2 * next.n);
                if (!isWithinTolerance(Vector.rotate(vecA, intAngleA + intAngleB), vecB)) {
                    let temp = []
                    for (let j = 0; j < vertex.shapesAround.length; j++) {
                        temp.push(vertex.shapesAround[(i + 1 + j) % vertex.shapesAround.length]);
                    }
                    vertex.shapesAround = [...temp];
                    break;
                }
            }
        }

        console.log("already placed nodes around vertex (sorted after gap check): ", vertex.shapesAround)

        // find the starting index in the configuration
        // if more than one, select it at random
        let startingIndexes = randomConfiguration.findSubsequenceStartingIndex(vertex.shapesAround.map(n => n.n));
        let startingIndex;
        if (startingIndexes.length > 1) {
            startingIndex = startingIndexes.pickRandom();
        } else {
            startingIndex = startingIndexes[0];
        }
        let endIndex = (startingIndex + vertex.shapesAround.length) % randomConfiguration.length;

        // going in circle, add the nodes around the vertex, adding their vertices to the free vertices list
        let lastNode = vertex.shapesAround[vertex.shapesAround.length - 1];
        let lastNodeDir = Vector.sub(lastNode.centroid, vertex.coord);

        for (let i = 0; i < randomConfiguration.length - vertex.shapesAround.length; i++) {
            let n = randomConfiguration[(endIndex + i) % randomConfiguration.length];

            let lastNodeIntAngle = Math.PI * (lastNode.n - 2) / (2 * lastNode.n);
            let currNodeIntAngle = Math.PI * (n - 2) / (2 * n);
            lastNodeDir = lastNodeDir.rotate(lastNodeIntAngle + currNodeIntAngle);

            
            let radius = 0.5 / Math.sin(Math.PI / n);
            let newNode = new RegularPolygon({
                centroid: Vector.add(vertex.coord, Vector.fromAngle(lastNodeDir.heading()).scale(radius)),
                n: n,
                angle: Vector.rotate(lastNodeDir, Math.PI).heading()
            });
            lastNode = newNode;

            this.tiling.nodes.push(newNode);
        }
    }

    propagateConstraints = (vertex) => {
        
    }

    generateFromRule(rule) {
        this.parseRule(rule);

        this.tiling.nodes = [];
        
        this.generateSeed();
        this.generateTransformations();

        if (this.tiling.dual) this.computeDual();
        
        return this.tiling;
    }

    isValidShapeSeed = (shapeSeed) => {
        let valid = true;

        if (shapeSeed.count('(') != shapeSeed.count(')'))
            valid = false;

        if (shapeSeed.count('{') != shapeSeed.count('}') || shapeSeed.count('{') != shapeSeed.count('.'))
            valid = false;

        return valid;
    }

    parseRule = (tilingRule) => {
        this.tiling.dual = false;
        this.tiling.islamic = false;

        if (tilingRule[tilingRule.length - 1] === '*') {
            this.tiling.dual = true;
            tilingRule = tilingRule.slice(0, -1);
        } else if (tilingRule.includes('i')) {
            this.tiling.islamic = true;
        }

        let phases = tilingRule.split('/');
        this.shapeSeed = phases[0].split('-');
        for (let i = 0; i < this.shapeSeed.length; i++) {
            this.shapeSeed[i] = this.shapeSeed[i].split(',');
            for (let j = 0; j < this.shapeSeed[i].length; j++) {
                if (!this.isValidShapeSeed(this.shapeSeed[i][j]))
                    throw new Error('Invalid shape seed');
                
                if (this.shapeSeed[i][j].includes('(')) {
                    let n = this.shapeSeed[i][j].split('(')[0];
                    let alfa = this.shapeSeed[i][j].split('(')[1].split(')')[0];
                    parameter.subscribe((v) => {
                        this.shapeSeed[i][j] = {
                            type: 'isotoxal',
                            n: parseInt(n),
                            alfa: alfa == 'a' ? v * Math.PI / 180 : parseInt(alfa) * Math.PI / 180
                        };
                    });
                } else if (this.shapeSeed[i][j].includes('{')) {
                    let a = this.shapeSeed[i][j].split('{')[1].split('}')[0];
                    let n = a.split('.')[0];
                    let m = a.split('.')[1];
                    this.shapeSeed[i][j] = {
                        type: 'star',
                        n: parseInt(n),
                        m: parseInt(m)
                    }
                } else {
                    this.shapeSeed[i][j] = {
                        type: 'regular',
                        n: parseInt(this.shapeSeed[i][j]),
                        special: this.shapeSeed[i][j].includes("'")
                    }
                }
            }
        }
        if (this.shapeSeed.flat().some(n => !possibleSides.includes(n.n))) {
            throw new Error('Invalid shape seed');
        }

        this.transforms = [];
        for (let i = 1; i < phases.length; i++) {
            let transform = {};
            if (phases[i].includes('(') && phases[i].includes(')')) {
                let angle = 180;
                if (phases[i].includes('[') && phases[i].includes(']')) {
                    angle = parseInt(phases[i].split('[')[1].split(']')[0]);
                }
                if (!possibleAngles.includes(angle)) {
                    console.error('Invalid angle', angle);
                    angle = Math.PI;
                } else {
                    angle = angle * Math.PI / 180;
                }

                transform = {
                    type: phases[i][0],
                    relativeTo: phases[i].split('(')[1].split(')')[0],
                    angle: angle,
                    anchor: null
                }
            } else {
                let type = phases[i][0];
                let angle = parseInt(phases[i].slice(1));
                if (!possibleAngles.includes(angle)) {
                    console.error('Invalid angle', angle);
                    angle = Math.PI;
                } else {
                    angle = angle * Math.PI / 180;
                }
                transform = {
                    type: type,
                    angle: angle
                }
            }
            this.transforms.push(transform);
        }
    }

    addCoreNode = () => {
        const coreNode = this.shapeSeed[0][0];
        if (coreNode.type === 'isotoxal') {
            this.coreNode = new IsotoxalPolygon({
                centroid: new Vector(),
                n: coreNode.n,
                angle: Math.PI / coreNode.n,
                alfa: coreNode.alfa
            });
        } else if (coreNode.type === 'star') {
            this.coreNode = new StarPolygon({
                centroid: new Vector(),
                n: coreNode.n,
                m: coreNode.m,
                angle: Math.PI / coreNode.n
            });
        } else {
            if (coreNode.special) {
                this.coreNode = new RegularPolygon({
                    centroid: new Vector(),
                    n: 3,
                    angle: -Math.PI / 2
                });
            } else {
                this.coreNode = new RegularPolygon({
                    centroid: new Vector(
                        coreNode.n == 3 ? Math.sqrt(3) / 6 : 0,
                        coreNode.n == 3 ? 0.5 : 0
                    ),
                    n: coreNode.n,
                    angle: coreNode.n == 3 ? 0 : Math.PI / coreNode.n
                });
            }
        }

        this.tiling.nodes.push(this.coreNode);
    }

    generateSeed = () => {
        this.addCoreNode();

        for (let i = 1; i < this.shapeSeed.length; i++) {
            let newNodes = [];
            let indexOff = 0;
            for (let j = 0; j < this.shapeSeed[i].length; j++) {
                if (this.shapeSeed[i][j].n == 0) {
                    indexOff += 1;
                    continue;
                }

                let anchor = this.findAnchor(newNodes, indexOff);
                let halfwayPoint = anchor.node.halfways[anchor.halfwayPointIndex];
                
                let newNode;
                if (this.shapeSeed[i][j].type === 'regular') {
                    let a = apothem(this.shapeSeed[i][j].n);
                    let newCentroid = new Vector(
                        halfwayPoint.x + anchor.dir.x * a,
                        halfwayPoint.y + anchor.dir.y * a
                    );

                    let angle = anchor.dir.heading();
                    if (this.shapeSeed[i][j].n % 2 == 0) {
                        angle += Math.PI / this.shapeSeed[i][j].n;
                    }

                    newNode = new RegularPolygon({
                        centroid: newCentroid,
                        n: this.shapeSeed[i][j].n,
                        angle: angle
                    });
                } else {
                    let firstVertex = anchor.node.vertices[anchor.halfwayPointIndex];
                    let secondVertex = anchor.node.vertices[(anchor.halfwayPointIndex + 1) % anchor.node.n];
                    let sideVector = new Vector(
                        firstVertex.x - secondVertex.x,
                        firstVertex.y - secondVertex.y
                    );
                    sideVector.normalize();
                    sideVector.rotate(this.shapeSeed[i][j].alfa / 2);
                    
                    let gamma = Math.PI * (this.shapeSeed[i][j].n - 2) / (2 * this.shapeSeed[i][j].n);
                    let beta = gamma - this.shapeSeed[i][j].alfa / 2;
                    let dist = Math.cos(beta) / Math.cos(gamma);

                    let newCentroid = new Vector(
                        secondVertex.x + sideVector.x * dist,
                        secondVertex.y + sideVector.y * dist
                    )

                    newNode = new IsotoxalPolygon({
                        centroid: newCentroid,
                        n: this.shapeSeed[i][j].n,
                        angle: Math.atan2(sideVector.y, sideVector.x),
                        alfa: this.shapeSeed[i][j].alfa
                    });
                }

                newNodes.push(newNode);
            }

            this.tiling.nodes = this.tiling.nodes.concat(newNodes);
        }

        this.newLayerNodes = [...this.tiling.nodes];
        this.seedNodes = [...this.tiling.nodes];
    }

    generateTransformations = () => {
        let layers;
        transformSteps.subscribe((v) => {
            layers = v;
        });

        let start = performance.now();
        let end;
        
        for (let s = 0; s < layers; s++) {
            let newNodes = [];
            for (let i = 0; i < this.transforms.length; i++) {
                if (s == layers - 1 && i == this.transforms.length - 1) break;

                if (s == 0) this.tiling.anchorNodes = [...this.tiling.nodes, ...newNodes];

                if (this.transforms[i].type === 'm') {
                    if (this.transforms[i].relativeTo)
                        newNodes = newNodes.concat(this.mirrorRelativeTo(i, newNodes))
                    else if (this.transforms[i].angle)
                        newNodes = newNodes.concat(this.mirrorByAngle(this.transforms[i].angle, newNodes))
                } else if (this.transforms[i].type === 'r') {
                    if (this.transforms[i].relativeTo)
                        newNodes = newNodes.concat(this.rotateRelativeTo(i, newNodes))
                    else if (this.transforms[i].angle)
                        newNodes = newNodes.concat(this.rotateByAngle(this.transforms[i].angle, newNodes))
                } else if (this.transforms[i].type === 't') {
                    newNodes = newNodes.concat(this.translateRelativeTo(i, newNodes))
                }
            }

            this.newLayerNodes = this.addNewNodes(newNodes);
            end = performance.now();
            if (end - start > 1000) {
                break;
            }
        }
    }

    mirrorRelativeTo = (transformationIndex, additionalNodes) => {
        let origin = this.transforms[transformationIndex].anchor; 
        if (!origin) {
            let type = this.transforms[transformationIndex].relativeTo[0];
            let index = this.transforms[transformationIndex].relativeTo.slice(1);

            origin = this.findOrigin(this.tiling.anchorNodes, type, index);
            this.transforms[transformationIndex].anchor = origin;
        }
        
        let newNodes = [];
        for (let newLayerNode of  [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
            let newNode = newLayerNode.clone();

            if (this.transforms[transformationIndex].relativeTo[0] === 'h') {
                let lineVector = null;
                
                for (let i = 0; i < this.tiling.anchorNodes.length; i++) {
                    for (let k = 0; k < this.tiling.anchorNodes[i].halfways.length; k++) {
                        if (isWithinTolerance(this.tiling.anchorNodes[i].halfways[k], origin)) {
                            const v1 = this.tiling.anchorNodes[i].vertices[k];
                            const v2 = this.tiling.anchorNodes[i].vertices[(k + 1) % this.tiling.anchorNodes[i].n];
                            
                            lineVector = Vector.sub(v2, v1).normalize();
                            break;
                        }
                    }

                    if (lineVector)
                        break;
                }

                const pointVector = Vector.sub(newNode.centroid, origin);
                const dot = pointVector.dot(lineVector);
                const projection = lineVector.scale(dot);
                const perpendicular = Vector.sub(pointVector, projection);
                
                newNode.centroid.x = origin.x + projection.x - perpendicular.x;
                newNode.centroid.y = origin.y + projection.y - perpendicular.y;
                
                const lineAngle = lineVector.heading();
                newNode.angle = (2 * lineAngle - newNode.angle + 2 * Math.PI) % (2 * Math.PI);
            } else {
                newNode.centroid.x = origin.x - (newNode.centroid.x - origin.x);
                newNode.centroid.y = origin.y - (newNode.centroid.y - origin.y);
                newNode.angle = (Math.PI + newNode.angle) % (Math.PI * 2);
            }

            newNode.calculateCentroid();
            newNode.calculateVertices();
            newNode.calculateHalfways();
            
            newNodes.push(newNode);
        }

        return newNodes;
    }

    mirrorByAngle = (angle, additionalNodes) => {
        const anglesToProcess = [];
        while (angle < 2 * Math.PI) {
            anglesToProcess.push(angle + Math.PI / 2);
            angle *= 2;
        }
        
        let newNodes = [];
        for (const angleRad of anglesToProcess) {
            for (let newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes, ...newNodes]) {
                let newNode = newLayerNode.clone();

                newNode.centroid.mirror(angleRad);
                newNode.angle = (2 * angleRad - newNode.angle + Math.PI * 2) % (Math.PI * 2);

                newNode.calculateCentroid();
                newNode.calculateVertices();
                newNode.calculateHalfways();
                
                newNodes.push(newNode);
            }
        }
        return newNodes;
    }

    rotateRelativeTo = (transformationIndex, additionalNodes) => {
        let origin = this.transforms[transformationIndex].anchor;

        if (!origin) {
            let type = this.transforms[transformationIndex].relativeTo[0];
            let index = this.transforms[transformationIndex].relativeTo.slice(1);

            origin = this.findOrigin(this.tiling.anchorNodes, type, index);
            this.transforms[transformationIndex].anchor = origin;
        }

        let newNodes = [];
        for (let alfa = this.transforms[transformationIndex].angle; alfa < 2 * Math.PI; alfa += this.transforms[transformationIndex].angle) {
            for (let newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
                let newNode = newLayerNode.clone();

                newNode.centroid = Vector.add(origin, Vector.sub(newNode.centroid, origin).rotate(alfa));
                newNode.angle = (alfa + newNode.angle) % (Math.PI * 2);

                newNode.calculateCentroid();
                newNode.calculateVertices();
                newNode.calculateHalfways();
                
                newNodes.push(newNode);
            }
        }

        return newNodes;
    }
    
    rotateByAngle = (alfa, additionalNodes) => {
        const anglesToProcess = [];
        let currentAngle = alfa;
        while (currentAngle < 2 * Math.PI) {
            anglesToProcess.push(currentAngle);
            currentAngle += alfa;
        }
        
        const rotationCache = new Map();
        
        let newNodes = [];
        for (const angle of anglesToProcess) {
            for (let newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
                const cacheKey = `${newLayerNode.centroid.x},${newLayerNode.centroid.y}-${angle}`;
                let newPos;
                
                if (rotationCache.has(cacheKey)) {
                    newPos = rotationCache.get(cacheKey);
                } else {
                    const d = newLayerNode.centroid.mag();
                    if (d < tolerance) {
                        newPos = new Vector();
                    } else {
                        const a = newLayerNode.centroid.heading();
                        newPos = Vector.fromAngle(a + angle).scale(d);
                    }
                    rotationCache.set(cacheKey, newPos);
                }
                
                let newNode = newLayerNode.clone();
                newNode.centroid.set(newPos);
                newNode.angle = (newLayerNode.angle + angle) % (Math.PI * 2);

                newNode.calculateCentroid();
                newNode.calculateVertices();
                newNode.calculateHalfways();
                
                newNodes.push(newNode);
            }
        }

        rotationCache.clear();
        return newNodes;
    }

    translateRelativeTo = (transformationIndex, additionalNodes) => {
        let origin = this.transforms[transformationIndex].anchor;

        if (!origin) {
            let type = this.transforms[transformationIndex].relativeTo[0];
            let index = this.transforms[transformationIndex].relativeTo.slice(1);

            origin = this.findOrigin(this.tiling.anchorNodes, type, index);
            this.transforms[transformationIndex].anchor = origin;
        }
        
        let newNodes = [];
        for (let newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
            let newNode = newLayerNode.clone();

            newNode.centroid.add(origin);

            newNode.calculateCentroid();
            newNode.calculateVertices();
            newNode.calculateHalfways();
            
            newNodes.push(newNode);
        }

        return newNodes;
    }

    findAnchor = (newNodes, indexOff) => {
        const allNodes = this.tiling.nodes.concat(newNodes);

        let anchors = [];
        for (let i = 0; i < this.tiling.nodes.length; i++) {
            for (let s = 0; s < this.tiling.nodes[i].halfways.length; s++) {
                let isFree = true;

                for (let j = 0; j < allNodes.length; j++) {
                    if (isWithinTolerance(this.tiling.nodes[i].centroid, allNodes[j].centroid))
                        continue;

                    for (let k = 0; k < allNodes[j].halfways.length; k++) {
                        if (isWithinTolerance(this.tiling.nodes[i].halfways[s], allNodes[j].halfways[k])) {
                            isFree = false;
                            break;
                        }
                    }
                    
                    if (!isFree) 
                        break;
                }

                if (isFree) {
                    anchors.push({
                        node: this.tiling.nodes[i],
                        halfwayPointIndex: s
                    });
                }
            }
        }

        anchors = anchors.sort((a, b) => {
            const angleA = getClockwiseAngle(a.node.halfways[a.halfwayPointIndex]);
            const angleB = getClockwiseAngle(b.node.halfways[b.halfwayPointIndex]);
            
            if (Math.abs(angleA - angleB) < tolerance) {
                const distA = a.node.halfways[a.halfwayPointIndex].mag();
                const distB = b.node.halfways[b.halfwayPointIndex].mag();
                return distA - distB;
            }
            
            return angleA - angleB;
        });

        let anchor = anchors[indexOff];

        anchor.dir = Vector.sub(
            anchor.node.vertices[(anchor.halfwayPointIndex + 1) % anchor.node.vertices.length],
            anchor.node.vertices[anchor.halfwayPointIndex]
        );
        anchor.dir.normalize();
        anchor.dir.rotate(-Math.PI / 2);

        return anchor;
    }

    findOrigin = (nodes, type, index) => {
        const deduplicatePoints = (points) => {
            const spatialMap = new Map();
            let uniquePoints = [];
            
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const baseKey = getSpatialKey(point.x, point.y);
                const baseX = Math.floor(point.x / (tolerance * 2));
                const baseY = Math.floor(point.y / (tolerance * 2));
                
                let isDuplicate = false;
                
                for (const [dx, dy] of offsets) {
                    const key = `${baseX + dx},${baseY + dy}`;
                    
                    const potentialDuplicates = spatialMap.get(key) || [];
                    
                    for (const uniqueIndex of potentialDuplicates) {
                        if (isWithinTolerance(uniquePoints[uniqueIndex], point)) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    
                    if (isDuplicate) break;
                }
                
                if (!isDuplicate) {
                    const newIndex = uniquePoints.length;
                    uniquePoints.push(point);
                    
                    if (!spatialMap.has(baseKey)) {
                        spatialMap.set(baseKey, []);
                    }
                    spatialMap.get(baseKey).push(newIndex);
                }
            }
            
            return uniquePoints;
        };
        
        let result;
        
        if (type === 'c') {
            let centroids = nodes.map(node => node.centroid);
            
            let uniqueCentroids = deduplicatePoints(centroids);
            let sortedCentroids = sortPointsByAngleAndDistance(uniqueCentroids);

            sortedCentroids = sortedCentroids.filter(centroid => !isWithinTolerance(centroid, new Vector()));

            result = sortedCentroids[index - 1];
        } 
        
        else if (type === 'h') {
            let halfways = nodes.map(node => node.halfways).flat();
            
            let uniqueHalfways = deduplicatePoints(halfways);
            let sortedHalfways = sortPointsByAngleAndDistance(uniqueHalfways);

            result = sortedHalfways[index - 1];
        } 
        
        else if (type === 'v') {
            let vertices = nodes.map(node => node.vertices).flat();
            
            let uniqueVertices = deduplicatePoints(vertices);
            let sortedVertices = sortPointsByAngleAndDistance(uniqueVertices);

            result = sortedVertices[index - 1];
        }
        
        return result;
    }

    addNewNodes = (newNodes) => {
        let newLayerNodes = [];
        
        const spatialMap = new Map();
        for (let i = 0; i < this.tiling.nodes.length; i++) {
            const node = this.tiling.nodes[i];
            const key = getSpatialKey(node.centroid.x, node.centroid.y);
            
            if (!spatialMap.has(key)) {
                spatialMap.set(key, []);
            }
            spatialMap.get(key).push(i);
        }
        
        for (let i = 0; i < newNodes.length; i++) {
            const newNode = newNodes[i];
            const key = getSpatialKey(newNode.centroid.x, newNode.centroid.y);
            
            let isDuplicate = false;
            
            const baseX = Math.floor(newNode.centroid.x / (tolerance * 2));
            const baseY = Math.floor(newNode.centroid.y / (tolerance * 2));
            
            for (const [dx, dy] of offsets) {
                const adjKey = `${baseX + dx},${baseY + dy}`;
                const existingIndices = spatialMap.get(adjKey) || [];
                
                for (const idx of existingIndices) {
                    if (isWithinTolerance(this.tiling.nodes[idx].centroid, newNode.centroid)) {
                        isDuplicate = true;
                        break;
                    }
                }
                
                if (isDuplicate) break;
            }
            
            if (!isDuplicate) {
                this.tiling.nodes.push(newNode);
                newLayerNodes.push(newNode);
                
                if (!spatialMap.has(key)) {
                    spatialMap.set(key, []);
                }
                spatialMap.get(key).push(this.tiling.nodes.length - 1);
            }
        }

        return newLayerNodes;
    }

    computeDual = () => {
        let originalVertices = this.tiling.nodes.map(node => node.vertices).flat();

        let uniqueOriginalVertices = [];
        for (let originalVertex of originalVertices)
            if (!uniqueOriginalVertices.some(v => isWithinTolerance(v, originalVertex)))
                uniqueOriginalVertices.push(originalVertex);

        let dualNodes = [];
        for (let i = 0; i < uniqueOriginalVertices.length; i++) {
            let centroid = uniqueOriginalVertices[i];

            let neighboringPolygons = [];
            for (let j = 0; j < this.tiling.nodes.length; j++) {
                let belongsToCentroid = false;
                for (let k = 0; k < this.tiling.nodes[j].vertices.length; k++) {
                    if (isWithinTolerance(this.tiling.nodes[j].vertices[k], centroid)) {
                        belongsToCentroid = true;
                        break;
                    }
                }

                if (belongsToCentroid) {
                    neighboringPolygons.push(this.tiling.nodes[j]);
                }
            }

            if (neighboringPolygons.length < 3) {
                continue;
            }

            let neighboringHalfwayPoints = [];
            for (let i = 0; i < neighboringPolygons.length; i++) {
                for (let k = 0; k < neighboringPolygons[i].halfways.length; k++) {
                    let angle = angleBetween(neighboringPolygons[i].centroid, neighboringPolygons[i].halfways[k], centroid);

                    if (Math.abs(angle - Math.PI / 2) < tolerance || Math.abs(angle + Math.PI / 2) < tolerance) {
                        neighboringHalfwayPoints.push(neighboringPolygons[i].halfways[k]);
                    }
                }
            }

            let uniqueNeighboringHalfwayPoints = [];
            for (let i = 0; i < neighboringHalfwayPoints.length; i++) {
                if (!uniqueNeighboringHalfwayPoints.some(point => isWithinTolerance(point, neighboringHalfwayPoints[i]))) {
                    uniqueNeighboringHalfwayPoints.push(neighboringHalfwayPoints[i]);
                }
            }

            if (neighboringPolygons.length < uniqueNeighboringHalfwayPoints.length) {
                continue;
            }

            let vertices = neighboringPolygons.map(polygon => polygon.centroid);

            vertices.sort((a, b) => {
                let angleToCentroidA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
                let angleToCentroidB = Math.atan2(b.y - centroid.y, b.x - centroid.x);

                if (angleToCentroidA < 0) angleToCentroidA += 2 * Math.PI;
                if (angleToCentroidB < 0) angleToCentroidB += 2 * Math.PI;

                return angleToCentroidA - angleToCentroidB;
            });

            let halfways = [];
            for (let j = 0; j < vertices.length; j++)
                halfways.push(Vector.midpoint(vertices[j], vertices[(j + 1) % vertices.length]));

            let dualNode = new DualPolygon({
                centroid: centroid.copy(),
                vertices: vertices,
                halfways: halfways
            });

            dualNodes.push(dualNode);
        }

        this.tiling.nodes = [...dualNodes];
    }

    calculateNeighbors = (depth, neighborhoodType) => {
        const neighborSet = new Set();
        
        const halfwaysSpatialMap = new Map();
        const verticesSpatialMap = new Map();

        for (let i = 0; i < this.tiling.nodes.length; i++) {
            this.tiling.nodes[i].directNeighbors = [];
            
            for (let j = 0; j < this.tiling.nodes[i].halfways.length; j++) {
                const hw = this.tiling.nodes[i].halfways[j];
                const key = getSpatialKey(hw.x, hw.y);
                
                if (!halfwaysSpatialMap.has(key)) {
                    halfwaysSpatialMap.set(key, []);
                }
                halfwaysSpatialMap.get(key).push({
                    nodeIndex: i,
                    halfwayIndex: j
                });
            }
            
            for (let j = 0; j < this.tiling.nodes[i].vertices.length; j++) {
                const v = this.tiling.nodes[i].vertices[j];
                const key = getSpatialKey(v.x, v.y);
                
                if (!verticesSpatialMap.has(key)) {
                    verticesSpatialMap.set(key, []);
                }
                verticesSpatialMap.get(key).push({
                    nodeIndex: i,
                    vertexIndex: j
                });
            }
        }
        
        const addDirectNeighbor = (i, k) => {
            const pairKey = i < k ? `${i}-${k}` : `${k}-${i}`;
            
            if (!neighborSet.has(pairKey)) {
                neighborSet.add(pairKey);
                this.tiling.nodes[i].directNeighbors.push(this.tiling.nodes[k]);
                this.tiling.nodes[k].directNeighbors.push(this.tiling.nodes[i]);
            }
        };

        const processedHalfwayCells = new Set();
        
        for (const [key, entries] of halfwaysSpatialMap.entries()) {
            if (entries.length < 2) continue;
            
            for (let i = 0; i < entries.length; i++) {
                const entry1 = entries[i];
                const node1 = this.tiling.nodes[entry1.nodeIndex];
                const hw1 = node1.halfways[entry1.halfwayIndex];
                
                for (let j = i + 1; j < entries.length; j++) {
                    const entry2 = entries[j];
                    const node2 = this.tiling.nodes[entry2.nodeIndex];
                    const hw2 = node2.halfways[entry2.halfwayIndex];
                    
                    if (isWithinTolerance(hw1, hw2)) {
                        addDirectNeighbor(entry1.nodeIndex, entry2.nodeIndex);
                    }
                }
            }
            
            processedHalfwayCells.add(key);
        }
        
        for (const [key, entries] of halfwaysSpatialMap.entries()) {
            if (processedHalfwayCells.has(key)) continue;
            
            const [baseX, baseY] = key.split(',').map(Number);
            
            for (const entry1 of entries) {
                const node1 = this.tiling.nodes[entry1.nodeIndex];
                const hw1 = node1.halfways[entry1.halfwayIndex];
                
                for (const [dx, dy] of offsets) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const adjKey = `${baseX + dx},${baseY + dy}`;
                    const adjEntries = halfwaysSpatialMap.get(adjKey) || [];
                    
                    for (const entry2 of adjEntries) {
                        const node2 = this.tiling.nodes[entry2.nodeIndex];
                        const hw2 = node2.halfways[entry2.halfwayIndex];
                        
                        if (isWithinTolerance(hw1, hw2)) {
                            addDirectNeighbor(entry1.nodeIndex, entry2.nodeIndex);
                        }
                    }
                }
            }
        }

        for (let node of this.tiling.nodes)
            node.dualNeighbors = [...node.directNeighbors];

        if (neighborhoodType === 'moore') {
            const vertexToNodesMap = new Map();
            
            for (let i = 0; i < this.tiling.nodes.length; i++) {
                for (let j = 0; j < this.tiling.nodes[i].vertices.length; j++) {
                    const vertex = this.tiling.nodes[i].vertices[j];
                    const key = getSpatialKey(vertex.x, vertex.y);
                    
                    const baseX = Math.floor(vertex.x / (tolerance * 2));
                    const baseY = Math.floor(vertex.y / (tolerance * 2));
                    
                    let canonicalVertex = vertex;
                    let canonicalKey = null;
                    
                    for (const [dx, dy] of offsets) {
                        const nearbyKey = `${baseX + dx},${baseY + dy}`;
                        const existingVertices = vertexToNodesMap.get(nearbyKey);
                        
                        if (!existingVertices) continue;
                        
                        for (const {v} of existingVertices) {
                            if (isWithinTolerance(vertex, v)) {
                                canonicalVertex = v;
                                canonicalKey = nearbyKey;
                                break;
                            }
                        }
                        
                        if (canonicalKey) break;
                    }
                    
                    if (!canonicalKey) {
                        canonicalKey = key;
                        
                        if (!vertexToNodesMap.has(canonicalKey)) {
                            vertexToNodesMap.set(canonicalKey, []);
                        }
                        
                        vertexToNodesMap.get(canonicalKey).push({
                            v: canonicalVertex,
                            nodeIndexes: new Set([i])
                        });
                    } else {
                        for (const entry of vertexToNodesMap.get(canonicalKey)) {
                            if (isWithinTolerance(entry.v, canonicalVertex)) {
                                entry.nodeIndexes.add(i);
                                break;
                            }
                        }
                    }
                }
            }
            
            for (const entries of vertexToNodesMap.values()) {
                for (const {nodeIndexes} of entries) {
                    if (nodeIndexes.size < 2) continue;
                    
                    const nodeIndexArray = Array.from(nodeIndexes);
                    
                    for (let i = 0; i < nodeIndexArray.length; i++) {
                        for (let j = i + 1; j < nodeIndexArray.length; j++) {
                            const node1Index = nodeIndexArray[i];
                            const node2Index = nodeIndexArray[j];
                            
                            const isSideNeighbors = this.tiling.nodes[node1Index].directNeighbors.some(
                                neighbor => isWithinTolerance(neighbor.centroid, this.tiling.nodes[node2Index].centroid)
                            );
                            
                            if (!isSideNeighbors) {
                                addDirectNeighbor(node1Index, node2Index);
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < this.tiling.nodes.length; i++) {
            const node = this.tiling.nodes[i];
            
            node.neighbors = [];
            
            if (depth === 1) {
                node.neighbors = [...node.directNeighbors];
                continue;
            }
            
            const visited = new Set([node]);
            const allNeighbors = new Set();
            
            const queue = [];
            
            for (const neighbor of node.directNeighbors) {
                queue.push({ node: neighbor, depth: 1 });
                visited.add(neighbor);
                allNeighbors.add(neighbor);
            }
            
            while (queue.length > 0) {
                const { node: currentNode, depth: currentDepth } = queue.shift();
                
                if (currentDepth >= depth) continue;
                
                for (const nextNode of currentNode.directNeighbors) {
                    if (!visited.has(nextNode)) {
                        visited.add(nextNode);
                        allNeighbors.add(nextNode);
                        
                        queue.push({
                            node: nextNode,
                            depth: currentDepth + 1
                        });
                    }
                }
            }
            
            node.neighbors = Array.from(allNeighbors);
        }
        
        for (let i = 0; i < this.tiling.nodes.length; i++) {
            delete this.tiling.nodes[i].directNeighbors;
        }
    }
}

Array.prototype.cycleToMinimumLexicographicalOrder = function() {
    let min = this.slice(0);
    for (let i = 0; i < this.length; i++) {
        let rotated = this.slice(i).concat(this.slice(0, i));
        if (compareArrays(rotated, min) < 0) {
            min = rotated;
        }
    }
    return min;
}


Array.prototype.isEqual = function(array) {
    if (this.length !== array.length) return false;
    for (let i = 0; i < this.length; i++)
        if (this[i] !== array[i]) return false;
    return true;
}

Array.prototype.isEqualOrChiral = function(array) {
    if (this.length !== array.length) return false;
    
    for (let i = 0; i < this.length; i++) {
        let rotated = this.slice(i).concat(this.slice(0, i));
        if (rotated.isEqual(array)) return true;
    }

    let reversed = this.slice().reverse();
    for (let i = 0; i < this.length; i++) {
        let rotated = reversed.slice(i).concat(reversed.slice(0, i));
        if (rotated.isEqual(array)) return true;
    }

    return false;
}