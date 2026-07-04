package systems.keyvalue.frameforge

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import org.opencv.android.OpenCVLoader

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // FrameforgeNativePackage can't be autolinked (it's part of the
          // app itself, not a separate npm package) — see that file for
          // what it registers.
          add(FrameforgeNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // The Maven-published `org.opencv:opencv` artifact bundles its native
    // libraries directly in the AAR, but OpenCV's Java layer still needs
    // this explicit init call before any Mat/Imgproc usage — skipping it
    // fails silently with confusing native crashes deep in image
    // processing calls instead of a clear error here.
    if (!OpenCVLoader.initLocal()) {
      Log.e("Frameforge", "OpenCV initialization failed — contour detection will not work")
    }
    loadReactNative(this)
  }
}
