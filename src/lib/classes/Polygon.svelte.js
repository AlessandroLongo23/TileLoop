import { tolerance, lineWidth, colorParams, islamicAngle } from '$lib/stores/configuration.js';
import { Vector } from '$lib/classes/Vector.svelte.js';
import { map } from '$lib/utils/math.svelte.js';
import { get } from 'svelte/store';
import { TheaterIcon } from 'lucide-svelte';

const PHI = (1 + Math.sqrt(5)) / 2;

export class Polygon {
    constructor(data) {
        this.centroid = data.centroid;
        this.n = data.n;
        this.angle = data.angle;
        this.turns = 0;
        this.rotation = 0;
        
        this.neighbors = [];
        this.state = 0;
        this.nextState = 0;

        this.mirrored = false;
        this.svgTransform = '';

        this.calculateCentroid();
        this.calculateVertices();
        this.calculateHalfways();
    }

    containsPoint = (point) => {
        let inside = false;
        
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x;
            const yi = this.vertices[i].y;
            const xj = this.vertices[j].x;
            const yj = this.vertices[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            
            if (intersect) 
                inside = !inside;
        }
        
        return inside;
    }

    show = (ctx, customColor = null, opacity = 0.80, isIslamic = false) => {
        if (this.centroid.x < -ctx.width / 2 - 10 || this.centroid.y < -ctx.height / 2 - 10 || this.centroid.x > ctx.width / 2 + 10 || this.centroid.y > ctx.height / 2 + 10)
            return;

        ctx.push();

        this.calculateHue();
        
        const lineWidthValue = get(lineWidth);
        if (lineWidthValue > 1) {
            // ctx.strokeWeight(lineWidthValue);
            ctx.stroke(0, 0, 0, opacity);
        } else if (lineWidthValue === 0) {
            ctx.noStroke();
        } else {
            // ctx.strokeWeight(1);
            ctx.stroke(0, 0, 0, lineWidthValue * opacity); // Use lineWidth as opacity
        }

        if (!isIslamic) {
            ctx.fill(customColor || this.hue, 40, 100 / opacity, 0.80 * opacity);
            ctx.beginShape();
            for (let i = 0; i < this.vertices.length; i++) {
                ctx.vertex(this.vertices[i].x, this.vertices[i].y);
            }
            ctx.endShape(ctx.CLOSE);
        } else {
            this.showIslamic(ctx);
        }

        ctx.pop();
    }

    showIslamic(ctx) {
        ctx.noFill();
        // ctx.strokeWeight(5);
        ctx.stroke(0, 0, 100);
        let angle = get(islamicAngle) * Math.PI / 180;
        for (let i = 0; i < this.halfways.length; i++) {
            let side = 0.5
            let perp = Vector.sub(this.centroid, this.halfways[i]);
            let dir1 = Vector.rotate(perp, angle / 2).normalize();
            let dir2 = Vector.rotate(perp, -angle / 2).normalize();
            
            let beta = Math.PI / this.n;
            let epsilon = Math.PI - beta - angle / 2;
            let gamma = Math.PI / 2 - beta;

            let dist = side * Math.tan(gamma) * Math.sin(beta) / Math.sin(epsilon);

            ctx.line(this.halfways[i].x, this.halfways[i].y, this.halfways[i].x + dir1.x * dist, this.halfways[i].y + dir1.y * dist);
            ctx.line(this.halfways[i].x, this.halfways[i].y, this.halfways[i].x + dir2.x * dist, this.halfways[i].y + dir2.y * dist);
        }
    }

    calculateCentroid = () => {
        if (Math.abs(this.centroid.x) < tolerance)
            this.centroid.x = 0;

        if (Math.abs(this.centroid.y) < tolerance)
            this.centroid.y = 0;
    }

    calculateVertices = () => {
        this.vertices = [];
        let radius = 0.5 / Math.sin(Math.PI / this.n);
        let alpha = 2 * Math.PI / this.n;
        for (let i = 0; i < this.n; i++) {
            this.vertices.push(Vector.fromPolar(this.centroid, radius, i * alpha + this.angle + this.rotation));

            if (Math.abs(this.vertices[i].x) < tolerance)
                this.vertices[i].x = 0;

            if (Math.abs(this.vertices[i].y) < tolerance)
                this.vertices[i].y = 0;
        }
    }

    calculateHalfways = () => {
        if (!this.halfways) this.halfways = Array.from({ length: this.n }, () => new Vector(0, 0));

        for (let i = 0; i < this.n; i++) {
            this.halfways[i].x = (this.vertices[i].x + this.vertices[(i + 1) % this.n].x) / 2;
            this.halfways[i].y = (this.vertices[i].y + this.vertices[(i + 1) % this.n].y) / 2;

            if (Math.abs(this.halfways[i].x) < tolerance)
                this.halfways[i].x = 0;

            if (Math.abs(this.halfways[i].y) < tolerance)
                this.halfways[i].y = 0;
        }
    }

    rotate(turns = 1) {
        this.turns += turns;
        this.rotation = this.turns * 2 * Math.PI / this.n;
        let sign = this.mirrored ? -1 : 1;

        let transformations = this.svgTransform.trim().split(' ');
        if (transformations.length > 0 && transformations[transformations.length - 1].includes('rotate')) {
            let totalAngle = 0;
            totalAngle += parseFloat(transformations[transformations.length - 1].split('(')[1].split('deg)')[0]);
            totalAngle += sign * turns * 360 / this.n;
            this.svgTransform = this.svgTransform.replace(transformations[transformations.length - 1], `rotate(${totalAngle}deg) `);
        } else {
            this.svgTransform += `rotate(${sign * turns * 360 / this.n}deg) `;
        }

        this.calculateVertices();
        this.calculateHalfways();
    }

    mirror() {
        let connections = this.halfways.map(h => h.connections).simmetrize(1);
        for (let i = 0; i < this.halfways.length; i++) {
            this.halfways[i].connections = connections[i];
        }

        let transformations = this.svgTransform.trim().split(' ');
        if (transformations.length > 0 && transformations[transformations.length - 1].includes('scaleX')) {
            this.svgTransform = this.svgTransform.replace(transformations[transformations.length - 1], ``);
        } else {
            this.svgTransform += `scaleX(-1) `;
        }
        
        this.mirrored = !this.mirrored;
    }
}

export class RegularPolygon extends Polygon {
    constructor(data) {
        super(data);

        this.calculateHue();
    }

    calculateHue = () => {
        this.hue = map(Math.log(this.vertices.length), Math.log(3), Math.log(40), 0, 300);
    }

    clone = () => {
        return new RegularPolygon({
            centroid: this.centroid.copy(),
            n: this.n,
            angle: this.angle
        });
    }
}

export class DualPolygon extends Polygon {
    constructor(data) {
        super({
            centroid: data.centroid,
            n: 3,
            angle: 0
        });
        this.vertices = data.vertices;
        this.halfways = data.halfways;

        this.calculateHue();
    }

    calculateHue = () => {
        this.hue = this.calculateAnglesHash();
    }

    calculateAnglesHash() {
        let angles = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const prev = (i === 0) ? this.vertices.length - 1 : i - 1;
            const curr = i;
            const next = (i === this.vertices.length - 1) ? 0 : i + 1;
            
            const v1 = Vector.sub(this.vertices[prev], this.vertices[curr]);
            const v2 = Vector.sub(this.vertices[next], this.vertices[curr]);
            
            const mag1 = v1.mag();
            const mag2 = v2.mag();
            const dot = v1.dot(v2);
            
            const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180 / Math.PI;
            angles.push(Math.round(angle)); 
        }

        let minRotation = [...angles]; 
        
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < angles.length; i++) {
                const rotation = [...angles.slice(i), ...angles.slice(0, i)];
                
                let isSmaller = false;
                for (let j = 0; j < angles.length; j++) {
                    if (rotation[j] < minRotation[j]) {
                        isSmaller = true;
                        break;
                    } else if (rotation[j] > minRotation[j]) {
                        break;
                    }
                }
                
                if (isSmaller)
                    minRotation = [...rotation];
            }

            angles = angles.reverse();
        }

        const params = get(colorParams);
        const a = params.a;
        const b = params.b;
        
        let hash = 0;
        for (let i = 0; i < minRotation.length; i++)
            hash = (hash * PHI + minRotation[i] * Math.sqrt(2)) % 1447;
        
        const baseHue = hash % 360;
        const rotatedHue = (baseHue + a) % 360;
        const displacedHue = rotatedHue + b * this.vertices.length * Math.sin(rotatedHue * Math.PI / 180);
        
        return (displacedHue + 360) % 360;
    }

    clone = () => {
        return new DualPolygon({
            centroid: this.centroid.copy(),
            vertices: [...this.vertices],
            halfways: [...this.halfways]
        });
    }
}

export class StarPolygon extends Polygon {
    constructor(data) {
        super({
            centroid: data.centroid,
            n: data.n,
            angle: data.angle
        });

        this.m = data.m;

        this.calculateVertices();
        this.calculateHalfways();
        this.calculateHue();
    }

    calculateVertices = () => {
        this.vertices = [];

        let gamma = Math.PI / this.n;
        let alpha = (this.m - 1) * gamma;
        let radius = Math.cos(alpha) / Math.sin(gamma);
        let intRadius = radius * Math.cos(gamma) - Math.sin(alpha);
        
        for (let i = 0; i < this.n; i++) {
            this.vertices.push(Vector.fromPolar(this.centroid, radius, 2 * gamma * i + this.angle));
            this.vertices.push(Vector.fromPolar(this.centroid, intRadius, 2 * gamma * i + gamma + this.angle));
        }
    }

    calculateHalfways = () => {
        this.halfways = [];
        for (let i = 0; i < this.vertices.length; i++) {
            this.halfways.push(Vector.midpoint(this.vertices[i], this.vertices[(i + 1) % this.vertices.length]));
        }
    }

    calculateHue = () => {
        this.hue = map(this.vertices.length / 2, 3, 12, 300, 0) + 300 / 12;
    }

    clone = () => {
        return new StarPolygon({
            centroid: this.centroid.copy(),
            n: this.n,
            m: this.m,
            angle: this.angle
        });
    }
}

export class IsotoxalPolygon extends Polygon {
    constructor(data) {
        super({
            centroid: data.centroid,
            n: data.n,
            angle: data.angle
        });

        this.alfa = data.alfa;
        this.calculateVertices();
        this.calculateHalfways();
        this.calculateHue();
    }

    calculateVertices = () => {
        this.vertices = [];
        let gamma = Math.PI * (this.n - 2) / (2 * this.n);
        let alfa = this.alfa / 2;
        let beta = gamma - alfa;

        let radius = Math.cos(beta) / Math.cos(gamma);
        let intRadius = Math.tan(gamma) * Math.cos(beta) - Math.sin(beta);
        for (let i = 0; i < this.n; i++) {
            this.vertices.push(Vector.fromPolar(this.centroid, radius, i * 2 * Math.PI / this.n + this.angle + Math.PI));
            this.vertices.push(Vector.fromPolar(this.centroid, intRadius, (i + .5) * 2 * Math.PI / this.n + this.angle + Math.PI));

            if (Math.abs(this.vertices[i].x) < tolerance)
                this.vertices[i].x = 0;

            if (Math.abs(this.vertices[i].y) < tolerance)
                this.vertices[i].y = 0;
        }
    }

    calculateHalfways = () => {
        this.halfways = [];
        for (let i = 0; i < this.vertices.length; i++) {
            this.halfways.push(Vector.midpoint(this.vertices[i], this.vertices[(i + 1) % this.vertices.length]));
        }
    }

    calculateHue = () => {
        this.hue = map(this.vertices.length / 2, 3, 12, 300, 0) + 300 / 12;
    }

    showIslamic(ctx) {
        ctx.noFill();
        // ctx.strokeWeight(5);
        ctx.stroke(0, 0, 100);
        for (let i = 1; i < this.halfways.length + 1; i += 2) {
            ctx.line(this.halfways[i].x, this.halfways[i].y, this.halfways[(i + 1) % this.halfways.length].x, this.halfways[(i + 1) % this.halfways.length].y);
        }
    }

    clone = () => {
        return new IsotoxalPolygon({
            centroid: this.centroid.copy(),
            n: this.n,
            angle: this.angle,
            alfa: this.alfa
        });
    }
}