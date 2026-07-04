package systems.keyvalue.frameforge

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Promise
import org.opencv.android.Utils
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import android.graphics.BitmapFactory
import android.graphics.Bitmap
import java.io.File
import java.io.FileOutputStream
import kotlin.math.hypot
import kotlin.math.max

/**
 * Perspective deskew: given the captured full-resolution photo and the 4
 * corners the frame processor (or the user's manual corner adjustment)
 * settled on, warps the document to a flat rectangle.
 *
 * This is a plain bridge NativeModule, not a TurboModule — deliberately.
 * The JSI/TurboModule requirement in this project is about the
 * *per-frame, 15-60fps* contour detection path (see
 * ContourDetectorFrameProcessorPlugin.kt); a one-shot warp that runs once
 * per capture has no hot-path performance concern, so reaching for the
 * heavier TurboModule machinery here would be solving a problem this call
 * site doesn't have.
 */
class PerspectiveWarpModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PerspectiveWarpModule"

  @ReactMethod
  fun warpToFlatRectangle(imagePath: String, corners: ReadableArray, promise: Promise) {
    try {
      val cleanPath = imagePath.removePrefix("file://")
      val bitmap = BitmapFactory.decodeFile(cleanPath)
        ?: throw IllegalArgumentException("Could not decode image at $cleanPath")

      val srcMat = Mat()
      Utils.bitmapToMat(bitmap, srcMat)

      val points = (0 until corners.size()).map { i ->
        val point = corners.getMap(i) ?: throw IllegalArgumentException("Invalid corner at index $i")
        Point(point.getDouble("x"), point.getDouble("y"))
      }
      if (points.size != 4) {
        throw IllegalArgumentException("Expected 4 corners, got ${points.size}")
      }

      val ordered = orderCornersClockwiseFromTopLeft(points)

      // Output size is derived from the actual quadrilateral's measured
      // edge lengths rather than a fixed size — a document photographed
      // at an angle has genuinely different pixel-space width/height than
      // its physical aspect ratio, and using the measured edges keeps the
      // warp from stretching or squashing the result.
      val widthTop = distance(ordered[0], ordered[1])
      val widthBottom = distance(ordered[3], ordered[2])
      val heightLeft = distance(ordered[0], ordered[3])
      val heightRight = distance(ordered[1], ordered[2])
      val outputWidth = max(widthTop, widthBottom)
      val outputHeight = max(heightLeft, heightRight)

      val srcPoints = MatOfPoint2f(*ordered.toTypedArray())
      val dstPoints = MatOfPoint2f(
        Point(0.0, 0.0),
        Point(outputWidth, 0.0),
        Point(outputWidth, outputHeight),
        Point(0.0, outputHeight),
      )

      val transform = Imgproc.getPerspectiveTransform(srcPoints, dstPoints)
      val warped = Mat()
      Imgproc.warpPerspective(srcMat, warped, transform, Size(outputWidth, outputHeight))

      val outputFile = File(reactApplicationContext.cacheDir, "warped-${System.currentTimeMillis()}.jpg")
      val outputBitmap = Bitmap.createBitmap(warped.cols(), warped.rows(), Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(warped, outputBitmap)
      FileOutputStream(outputFile).use { out ->
        outputBitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
      }

      srcMat.release()
      warped.release()
      transform.release()
      srcPoints.release()
      dstPoints.release()

      promise.resolve("file://${outputFile.absolutePath}")
    } catch (e: Exception) {
      promise.reject("WARP_FAILED", e.message, e)
    }
  }

  private fun distance(a: Point, b: Point): Double = hypot(a.x - b.x, a.y - b.y)

  /**
   * The 4 corners arrive in whatever order OpenCV's contour walk happened
   * to produce, which is NOT guaranteed to be a consistent
   * top-left/top-right/bottom-right/bottom-left rotation. Re-deriving that
   * order from geometry (sum and difference of coordinates) is a standard
   * document-scanner technique and is required before getPerspectiveTransform
   * — feeding it inconsistently-ordered points produces a mirrored or
   * rotated warp instead of a flat one.
   */
  private fun orderCornersClockwiseFromTopLeft(points: List<Point>): List<Point> {
    val bySum = points.sortedBy { it.x + it.y }
    val topLeft = bySum.first()
    val bottomRight = bySum.last()

    val byDiff = points.sortedBy { it.y - it.x }
    val topRight = byDiff.first()
    val bottomLeft = byDiff.last()

    return listOf(topLeft, topRight, bottomRight, bottomLeft)
  }
}
