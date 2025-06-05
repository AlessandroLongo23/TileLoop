export class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromAngle(angle) {
        return new Vector(Math.cos(angle), Math.sin(angle));
    }

    static fromPolar(mag, angle) {
        return new Vector(mag * Math.cos(angle), mag * Math.sin(angle));
    }

    static midpoint(v1, v2) {
        return new Vector((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;

        return this.copy();
    }

    static sub(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }
    
    sub(other) {
        this.x -= other.x;
        this.y -= other.y;

        return this.copy();
    }

    static mult(v1, v2) {
        return new Vector(v1.x * v2.x, v1.y * v2.y);
    }

    mult(other) {
        this.x *= other.x;
        this.y *= other.y;

        return this.copy();
    }

    static scale(v, scalar) {
        return new Vector(v.x * scalar, v.y * scalar);
    }

    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;

        return this.copy();
    }

    set(x, y = null) {
        if (typeof x === 'object') {
            const other = x;
            this.x = other.x;
            this.y = other.y;
        } else {
            this.x = x;
            this.y = y;
        }

        return this.copy();
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    setMag(mag) {
        this.scale(mag / this.mag());

        return this.copy();
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    normalize() {
        this.scale(1 / this.mag());

        return this.copy();
    }

    setHeading(heading) {
        this.set(Vector.fromAngle(heading).scale(this.mag()));

        return this.copy();
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    mirror(angle) {
        const dir = Vector.fromAngle(angle);
        const dotProduct = this.dot(dir);

        this.x = 2 * dotProduct * dir.x - this.x;
        this.y = 2 * dotProduct * dir.y - this.y;

        return this.copy();
    }

    static rotate(v, angle) {
        return v.copy().rotate(angle);
    }

    rotate(angle) {
        let alpha = (this.heading() + angle + Math.PI) % (2 * Math.PI) - Math.PI;
        let newX = this.mag() * Math.cos(alpha);
        let newY = this.mag() * Math.sin(alpha);

        this.x = newX;
        this.y = newY;

        return this.copy();
    }

    static distance(v1, v2) {
        return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
    }

    distance(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }

    static angleBetween(v1, v2) {
        return Math.atan2(v2.y - v1.y, v2.x - v1.x);
    }
}