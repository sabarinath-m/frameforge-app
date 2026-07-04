#pragma once

#import <Foundation/Foundation.h>
#import <CoreMedia/CoreMedia.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Objective-C++ bridge to OpenCV's C++ API, since Swift can't import
 * OpenCV's C++ headers directly. This mirrors
 * ContourDetectorFrameProcessorPlugin.kt's algorithm exactly (grayscale ->
 * downsample -> blur -> Canny -> dilate -> findContours ->
 * largest-convex-quadrilateral) so both platforms make the same detection
 * decision from the same pixel data, not two different heuristics that
 * happen to agree in a demo.
 *
 * NOT built or tested in this pass — see docs/native-frame-processor.md.
 */
@interface OpenCVBridge : NSObject

/// Returns an array of 4 corner points (each an NSDictionary with x/y, in
/// full-frame coordinates) or nil if no quadrilateral was found.
+ (nullable NSArray<NSDictionary<NSString *, NSNumber *> *> *)detectDocumentCorners:(CMSampleBufferRef)sampleBuffer;

@end

NS_ASSUME_NONNULL_END
