export interface Point {
  x: number;
  y: number;
}

export interface ContourResult {
  corners: Point[];
  frameWidth: number;
  frameHeight: number;
}
