# Why a hand-written frame processor, not a community plugin

`react-native-vision-camera` is used purely as the camera session/preview
layer. The actual document-edge detection — grayscale extraction, blur,
Canny edge detection, contour finding, quadrilateral approximation — is
hand-written native code:

- Android: `android/app/src/main/java/systems/keyvalue/frameforge/ContourDetectorFrameProcessorPlugin.kt`,
  registered via `ContourDetectorPackage.kt`.
- iOS: `ios/Frameforge/ContourDetectorFrameProcessorPlugin.swift` (present
  for completeness, **not built or tested** — see the root README's
  verification-policy section for why this project verifies on Android
  only).

There is no pre-built RN community package that does OpenCV contour
detection inside a VisionCamera frame processor — and even if one existed,
using it as a black box would defeat the point of this project, which is
demonstrating the native image-processing pipeline itself, not the camera
plumbing around it.

## Key implementation decisions

- **Only the Y (luma) plane is read from the YUV_420_888 frame.** Canny
  edge detection only needs luminance, not chroma — skipping full YUV to
  RGB conversion avoids real per-frame work for data the algorithm never
  uses.
- **Detection runs on a downsampled copy** (640px wide) of the frame,
  while capture still uses the full-resolution image — this is the spec's
  own performance guidance, and it matters: running Canny/contour-finding
  on a full-resolution frame every callback would make the live overlay
  visibly lag.
- **Row stride is respected** when copying the Y plane into an OpenCV Mat.
  Camera buffers are frequently padded wider in memory than the logical
  image width; copying the buffer naively produces an image that's subtly
  skewed in a way that still "looks right" in a screenshot but is
  measurably wrong.
- **Corners are returned in full-frame coordinates**, not detection-buffer
  coordinates — the JS side and the Skia overlay shouldn't need to know
  the detector's internal downsample factor.
