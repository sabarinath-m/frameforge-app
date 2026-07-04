package systems.keyvalue.frameforge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

/**
 * Registers this app's own native code, which can't be autolinked since
 * it isn't a separate npm package:
 *  - "detectContours" frame processor plugin (ContourDetectorFrameProcessorPlugin.kt)
 *  - PerspectiveWarpModule, a plain bridge NativeModule for the one-shot
 *    deskew call (see that file for why it's not a TurboModule)
 */
class FrameforgeNativePackage : ReactPackage {
  init {
    FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectContours") { proxy, options ->
      ContourDetectorFrameProcessorPlugin(proxy, options)
    }
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(PerspectiveWarpModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
