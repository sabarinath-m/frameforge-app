#import "FrameProcessorPlugin.h"
#import "Frameforge-Swift.h"

// Registers the Swift ContourDetectorFrameProcessorPlugin class under the
// name "detectContours" at load time — mirrors
// ContourDetectorPackage.kt's registration on Android.
VISION_EXPORT_SWIFT_FRAME_PROCESSOR(ContourDetectorFrameProcessorPlugin, detectContours)
