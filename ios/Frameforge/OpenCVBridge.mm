#import "OpenCVBridge.h"

#import <opencv2/opencv.hpp>
#import <opencv2/imgproc.hpp>

using namespace cv;
using namespace std;

static const int kDetectionTargetWidth = 640;

@implementation OpenCVBridge

+ (nullable NSArray<NSDictionary<NSString *, NSNumber *> *> *)detectDocumentCorners:(CMSampleBufferRef)sampleBuffer {
  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (pixelBuffer == NULL) {
    return nil;
  }

  CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

  // Camera frames on iOS are typically kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
  // (a biplanar YUV format) — plane 0 is the full-resolution luma plane,
  // which, exactly like the Android side, is all Canny edge detection
  // needs. No color conversion required.
  void *yPlaneBase = CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
  size_t width = CVPixelBufferGetWidthOfPlane(pixelBuffer, 0);
  size_t height = CVPixelBufferGetHeightOfPlane(pixelBuffer, 0);
  size_t bytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);

  Mat grayFull((int)height, (int)width, CV_8UC1, yPlaneBase, bytesPerRow);

  double scale = (double)kDetectionTargetWidth / (double)width;
  int targetHeight = (int)(height * scale);
  Mat resized;
  resize(grayFull, resized, Size(kDetectionTargetWidth, targetHeight));

  CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

  Mat blurred;
  GaussianBlur(resized, blurred, Size(5, 5), 0);

  Mat edges;
  Canny(blurred, edges, 60, 160);

  Mat dilated;
  dilate(edges, dilated, Mat());

  vector<vector<Point>> contours;
  findContours(dilated, contours, RETR_LIST, CHAIN_APPROX_SIMPLE);

  double bestArea = 0;
  vector<Point> bestQuad;

  for (const auto &contour : contours) {
    double area = contourArea(contour);
    if (area < 5000) continue;

    double perimeter = arcLength(contour, true);
    vector<Point> approx;
    approxPolyDP(contour, approx, 0.02 * perimeter, true);

    if (approx.size() == 4 && area > bestArea && isContourConvex(approx)) {
      bestQuad = approx;
      bestArea = area;
    }
  }

  if (bestQuad.empty()) {
    return nil;
  }

  double inverseScale = 1.0 / scale;
  NSMutableArray *corners = [NSMutableArray arrayWithCapacity:4];
  for (const auto &point : bestQuad) {
    [corners addObject:@{
      @"x" : @(point.x * inverseScale),
      @"y" : @(point.y * inverseScale),
    }];
  }

  return corners;
}

@end
