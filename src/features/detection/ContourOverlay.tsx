import React from 'react';
import {StyleSheet} from 'react-native';
import {Canvas, Path, Skia} from '@shopify/react-native-skia';
import {useDerivedValue, SharedValue} from 'react-native-reanimated';
import {Point} from './types';

interface Props {
  corners: SharedValue<Point[] | null>;
  width: number;
  height: number;
}

/**
 * Draws the live detected-quad outline. The Skia canvas reads directly
 * from the Reanimated shared value the frame processor writes to
 * (useContourDetection.ts) — this component itself never re-renders as
 * corners update; only the UI-thread Skia draw call does. That's the
 * whole point of routing per-frame data through a shared value instead of
 * component state.
 */
export default function ContourOverlay({corners, width, height}: Props) {
  const path = useDerivedValue(() => {
    const skPath = Skia.Path.Make();
    const points = corners.value;
    if (points && points.length === 4) {
      skPath.moveTo(points[0].x, points[0].y);
      skPath.lineTo(points[1].x, points[1].y);
      skPath.lineTo(points[2].x, points[2].y);
      skPath.lineTo(points[3].x, points[3].y);
      skPath.close();
    }
    return skPath;
  }, [corners]);

  return (
    <Canvas style={[styles.canvas, {width, height}]} pointerEvents="none">
      <Path path={path} color="#22c55e" style="stroke" strokeWidth={3} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {position: 'absolute', top: 0, left: 0},
});
