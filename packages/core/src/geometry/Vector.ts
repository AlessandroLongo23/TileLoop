/** 2D vector with the static + instance helpers the tiling engine relies on. */
export class Vector {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static fromAngle(angle: number): Vector {
    return new Vector(Math.cos(angle), Math.sin(angle));
  }

  static fromPolar(center: Vector, mag: number, angle: number): Vector {
    return new Vector(center.x + mag * Math.cos(angle), center.y + mag * Math.sin(angle));
  }

  static midpoint(v1: Vector, v2: Vector): Vector {
    return new Vector((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
  }

  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  static add(v1: Vector, v2: Vector): Vector {
    return new Vector(v1.x + v2.x, v1.y + v2.y);
  }

  add(other: Vector): Vector {
    this.x += other.x;
    this.y += other.y;
    return this.copy();
  }

  static sub(v1: Vector, v2: Vector): Vector {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  sub(other: Vector): Vector {
    this.x -= other.x;
    this.y -= other.y;
    return this.copy();
  }

  static mult(v1: Vector, v2: Vector): Vector {
    return new Vector(v1.x * v2.x, v1.y * v2.y);
  }

  mult(other: Vector): Vector {
    this.x *= other.x;
    this.y *= other.y;
    return this.copy();
  }

  static scale(v: Vector, scalar: number): Vector {
    return new Vector(v.x * scalar, v.y * scalar);
  }

  scale(scalar: number): Vector {
    this.x *= scalar;
    this.y *= scalar;
    return this.copy();
  }

  set(x: number | Vector, y = 0): Vector {
    if (typeof x === 'object') {
      this.x = x.x;
      this.y = x.y;
    } else {
      this.x = x;
      this.y = y;
    }
    return this.copy();
  }

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  setMag(mag: number): Vector {
    this.scale(mag / this.mag());
    return this.copy();
  }

  dot(other: Vector): number {
    return this.x * other.x + this.y * other.y;
  }

  normalize(): Vector {
    this.scale(1 / this.mag());
    return this.copy();
  }

  setHeading(heading: number): Vector {
    this.set(Vector.fromAngle(heading).scale(this.mag()));
    return this.copy();
  }

  heading(): number {
    return Math.atan2(this.y, this.x);
  }

  mirror(angle: number): Vector {
    const dir = Vector.fromAngle(angle);
    const dotProduct = this.dot(dir);
    this.x = 2 * dotProduct * dir.x - this.x;
    this.y = 2 * dotProduct * dir.y - this.y;
    return this.copy();
  }

  static rotate(v: Vector, angle: number): Vector {
    return v.copy().rotate(angle);
  }

  rotate(angle: number): Vector {
    const alpha = ((this.heading() + angle + Math.PI) % (2 * Math.PI)) - Math.PI;
    const newX = this.mag() * Math.cos(alpha);
    const newY = this.mag() * Math.sin(alpha);
    this.x = newX;
    this.y = newY;
    return this.copy();
  }

  static distance(v1: Vector, v2: Vector): number {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }

  distance(other: Vector): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  static angleBetween(v1: Vector, v2: Vector): number {
    return Math.atan2(v2.y - v1.y, v2.x - v1.x);
  }
}
