import Foundation

/// Swift half of the frame processor plugin — the actual pixel-level work
/// happens in OpenCVBridge.mm (Objective-C++, since Swift can't import
/// OpenCV's C++ headers). Registered as "detectContours" by the
/// VISION_EXPORT_SWIFT_FRAME_PROCESSOR macro in
/// ContourDetectorFrameProcessorPlugin.m — same plugin name as the Android
/// implementation, so the JS side (useContourFrameProcessor.ts) doesn't
/// need to know which platform it's running on.
///
/// NOT built or tested in this pass — see docs/native-frame-processor.md
/// for why this project verifies on Android only.
@objc(ContourDetectorFrameProcessorPlugin)
public class ContourDetectorFrameProcessorPlugin: FrameProcessorPlugin {
  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
    super.init(proxy: proxy, options: options)
  }

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
    guard let sampleBuffer = frame.buffer else { return nil }

    guard let corners = OpenCVBridge.detectDocumentCorners(sampleBuffer) else {
      return nil
    }

    return [
      "corners": corners,
      "frameWidth": frame.width,
      "frameHeight": frame.height,
    ]
  }
}
