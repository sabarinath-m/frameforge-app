import {Point} from './types';

/**
 * Runs on the frame-processor worklet thread, not JS — must stay
 * dependency-free and allocation-light since it executes on every camera
 * frame (spec target: ≥15fps on a mid-range device).
 *
 * "Stable" means the detected quadrilateral has barely moved between
 * frames, which is the actual signal a document has stopped moving under
 * the camera — not just "a quad was detected," which would auto-capture
 * mid-motion and produce a blurry scan.
 */
export function averageCornerDisplacement(a: Point[], b: Point[]): number {
  'worklet';
  if (a.length !== b.length || a.length === 0) {
    return Infinity;
  }
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total / a.length;
}

// Below this average per-corner pixel movement, two consecutive detections
// are considered "the same position" for stability-counting purposes.
export const STABILITY_DISPLACEMENT_THRESHOLD = 12;

// Consecutive stable frames required before auto-capture fires. At a
// target ~15fps this is roughly half a second of held-still framing.
export const STABILITY_FRAME_THRESHOLD = 8;
