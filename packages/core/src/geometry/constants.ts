/** Numeric tolerance for treating two coordinates/angles as equal. */
export const TOLERANCE = 0.01;

/** Angles (degrees) the tiling generator may use for transforms. */
export const possibleAngles = [
  15, 20, 30, 36, 40, 45, 48, 60, 72, 75, 90, 120, 135, 144, 150, 180, 210, 225,
  240, 270, 300, 315, 330,
];

/** Polygon side counts the generator supports. */
export const possibleSides = [
  0, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72, 90,
  120, 144, 180, 240, 360,
];

/** Neighbour grid offsets (3x3) used when tiling the plane. */
export const offsets: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 0],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
