import {NativeModules} from 'react-native';
import {Point} from '../features/detection/types';

const {PerspectiveWarpModule} = NativeModules;

const LINKING_ERROR =
  'PerspectiveWarpModule is not linked. Rebuild the Android app after adding ' +
  'FrameforgeNativePackage — see android/app/src/main/java/systems/keyvalue/frameforge/PerspectiveWarpModule.kt.';

export function warpToFlatRectangle(imagePath: string, corners: Point[]): Promise<string> {
  if (!PerspectiveWarpModule) {
    return Promise.reject(new Error(LINKING_ERROR));
  }
  return PerspectiveWarpModule.warpToFlatRectangle(imagePath, corners);
}
