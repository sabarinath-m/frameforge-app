import {useMemo} from 'react';
import {useSharedValue, runOnJS} from 'react-native-reanimated';
import {useFrameProcessor, VisionCameraProxy, runAtTargetFps} from 'react-native-vision-camera';
import {
  averageCornerDisplacement,
  STABILITY_DISPLACEMENT_THRESHOLD,
  STABILITY_FRAME_THRESHOLD,
} from './stability';
import {ContourResult, Point} from './types';

const contourPlugin = VisionCameraProxy.initFrameProcessorPlugin('detectContours', {});

// Found by actually running this on a device (well — an emulator's
// virtual camera): calling the OpenCV pipeline on every incoming frame
// outpaced CameraX's ImageAnalysis backpressure handling and started
// throwing "maxImages already acquired" — the analyzer wasn't closing
// frames fast enough because detection itself was the bottleneck.
// react-native-vision-camera ships `runAtTargetFps` for exactly this:
// throttle the expensive native call to a rate the pipeline can sustain
// without starving the camera's own buffer queue. 10fps is still fast
// enough for "held steady for half a second" stability detection.
const DETECTION_TARGET_FPS = 10;

interface Options {
  onStable: (corners: Point[]) => void;
  onLostDetection: () => void;
}

/**
 * Wires the native "detectContours" plugin (Kotlin on Android, Swift+OpenCV
 * on iOS — same plugin name on both, see docs/native-frame-processor.md)
 * into a frame processor.
 *
 * Everything inside the worklet — the current corners, the previous
 * corners, and the stable-frame counter — lives in Reanimated shared
 * values and never touches React state or Redux. `onStable` only fires
 * across the JS/worklet boundary (via runOnJS) once, on the state
 * *transition* into "stable", not on every frame. That's what keeps this
 * off the JS thread's hot path.
 */
export function useContourDetection({onStable, onLostDetection}: Options) {
  const corners = useSharedValue<Point[] | null>(null);
  const previousCorners = useSharedValue<Point[] | null>(null);
  const stableFrameCount = useSharedValue(0);
  const hasFiredStable = useSharedValue(false);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      runAtTargetFps(DETECTION_TARGET_FPS, () => {
        'worklet';
        if (contourPlugin == null) {
          return;
        }

        const result = contourPlugin.call(frame) as unknown as ContourResult | undefined;

        if (!result?.corners || result.corners.length !== 4) {
          corners.value = null;
          previousCorners.value = null;
          stableFrameCount.value = 0;
          if (hasFiredStable.value) {
            hasFiredStable.value = false;
            runOnJS(onLostDetection)();
          }
          return;
        }

        corners.value = result.corners;

        const displacement = previousCorners.value
          ? averageCornerDisplacement(result.corners, previousCorners.value)
          : Infinity;
        previousCorners.value = result.corners;

        if (displacement < STABILITY_DISPLACEMENT_THRESHOLD) {
          stableFrameCount.value += 1;
        } else {
          stableFrameCount.value = 0;
        }

        if (stableFrameCount.value >= STABILITY_FRAME_THRESHOLD && !hasFiredStable.value) {
          hasFiredStable.value = true;
          runOnJS(onStable)(result.corners);
        }
      });
    },
    [onStable, onLostDetection],
  );

  return useMemo(() => ({frameProcessor, corners}), [frameProcessor, corners]);
}
