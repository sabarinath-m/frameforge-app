package systems.keyvalue.frameforge

import android.graphics.ImageFormat
import android.media.Image
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/**
 * Hand-written contour detection — this is the actual point of the app.
 * We deliberately do NOT use a pre-built community frame-processor plugin
 * here (see docs/native-frame-processor.md for the full rationale): the
 * portfolio goal is demonstrating a real native image-processing pipeline,
 * not gluing together an npm package.
 *
 * Registered under the name "detectContours" (see ContourDetectorPackage)
 * and called from JS via a Reanimated worklet frame processor
 * (src/features/detection/useContourFrameProcessor.ts).
 */
class ContourDetectorFrameProcessorPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) :
  FrameProcessorPlugin() {

  companion object {
    // Frames are downsampled to this width before detection — the spec's
    // own performance target (process at ~640x480, capture at full res).
    // Detection only ever reads the Y (luma) plane of YUV_420_888, so we
    // skip a full YUV->RGB conversion entirely: Canny edge detection only
    // needs luminance, not color, which is a deliberate performance
    // decision, not a corner cut.
    private const val DETECTION_TARGET_WIDTH = 640
  }

  override fun callback(frame: Frame, params: Map<String, Any>?): Any? {
    // Frame processor callbacks run on the camera's hot path, and the
    // underlying Image can be invalidated mid-callback (frame closed by
    // VisionCamera concurrently) — never let that crash the app, just
    // skip that one frame.
    val image = try {
      frame.image
    } catch (t: Throwable) {
      null
    } ?: return null

    if (image.format != ImageFormat.YUV_420_888) {
      // Some devices/emulators can hand back other formats; rather than
      // guess at a conversion, skip detection for that frame instead of
      // producing a wrong result.
      return null
    }

    val fullWidth = image.width
    val fullHeight = image.height
    val grayMat = yPlaneToGrayMat(image)

    val scale = DETECTION_TARGET_WIDTH.toDouble() / fullWidth
    val targetHeight = (fullHeight * scale).toInt()
    val resized = Mat()
    Imgproc.resize(grayMat, resized, Size(DETECTION_TARGET_WIDTH.toDouble(), targetHeight.toDouble()))
    grayMat.release()

    val blurred = Mat()
    Imgproc.GaussianBlur(resized, blurred, Size(5.0, 5.0), 0.0)
    resized.release()

    val edges = Mat()
    Imgproc.Canny(blurred, edges, 60.0, 160.0)
    blurred.release()

    // Closing small gaps in the edge map makes the contour more likely to
    // form a single closed loop around the document instead of several
    // broken segments.
    val dilated = Mat()
    Imgproc.dilate(edges, dilated, Mat())
    edges.release()

    val contours = mutableListOf<MatOfPoint>()
    val hierarchy = Mat()
    Imgproc.findContours(
      dilated,
      contours,
      hierarchy,
      Imgproc.RETR_LIST,
      Imgproc.CHAIN_APPROX_SIMPLE,
    )
    dilated.release()
    hierarchy.release()

    val bestQuad = findLargestQuadrilateral(contours)
    contours.forEach { it.release() }

    if (bestQuad == null) {
      return null
    }

    // Scale corners from detection resolution back to full frame
    // resolution, since that's the coordinate space the JS side and the
    // Skia overlay both expect.
    val inverseScale = 1.0 / scale
    val corners = bestQuad.toArray().map { point ->
      mapOf("x" to point.x * inverseScale, "y" to point.y * inverseScale)
    }
    bestQuad.release()

    return mapOf(
      "corners" to corners,
      "frameWidth" to fullWidth,
      "frameHeight" to fullHeight,
    )
  }

  /**
   * Extracts just the Y (luminance) plane of a YUV_420_888 image into an
   * 8-bit single-channel OpenCV Mat, handling row stride padding — camera
   * frame buffers are frequently wider in memory than the logical image
   * width, and copying naively without respecting `rowStride` produces a
   * subtly skewed image that still "works" in a demo but is wrong.
   */
  private fun yPlaneToGrayMat(image: Image): Mat {
    val yPlane = image.planes[0]
    val buffer = yPlane.buffer
    val rowStride = yPlane.rowStride
    val width = image.width
    val height = image.height

    val mat = Mat(height, width, org.opencv.core.CvType.CV_8UC1)
    if (rowStride == width) {
      val bytes = ByteArray(buffer.remaining())
      buffer.get(bytes)
      mat.put(0, 0, bytes)
    } else {
      val rowBytes = ByteArray(rowStride)
      for (row in 0 until height) {
        buffer.position(row * rowStride)
        buffer.get(rowBytes, 0, rowStride)
        mat.put(row, 0, rowBytes.copyOfRange(0, width))
      }
    }
    return mat
  }

  /**
   * Approximates every contour to a polygon and keeps the largest
   * roughly-quadrilateral, convex one — the same heuristic a document
   * scanner needs: real paper photographed at an angle is a quadrilateral,
   * not a perfect rectangle, so we can't just look for right angles.
   */
  private fun findLargestQuadrilateral(contours: List<MatOfPoint>): MatOfPoint2f? {
    var best: MatOfPoint2f? = null
    var bestArea = 0.0

    for (contour in contours) {
      val area = Imgproc.contourArea(contour)
      if (area < 5000) continue // filters out noise contours early

      val contour2f = MatOfPoint2f(*contour.toArray())
      val perimeter = Imgproc.arcLength(contour2f, true)
      val approx = MatOfPoint2f()
      Imgproc.approxPolyDP(contour2f, approx, 0.02 * perimeter, true)
      contour2f.release()

      if (approx.total() == 4L && area > bestArea && Imgproc.isContourConvex(MatOfPoint(*approx.toArray()))) {
        best?.release()
        best = approx
        bestArea = area
      } else {
        approx.release()
      }
    }

    return best
  }
}
