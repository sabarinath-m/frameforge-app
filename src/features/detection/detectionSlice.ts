import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type DetectionStatus = 'idle' | 'detecting' | 'stable' | 'capturing' | 'captured';

interface DetectionState {
  status: DetectionStatus;
  stableFrameCount: number;
  lastError: string | null;
}

const initialState: DetectionState = {
  status: 'idle',
  stableFrameCount: 0,
  lastError: null,
};

/**
 * This slice deliberately does NOT hold per-frame contour coordinates.
 * Those flow through a Reanimated shared value straight from the frame
 * processor to the Skia overlay (see CameraScreen.tsx), bypassing Redux
 * and the React render cycle entirely — the same "per-frame data must
 * never touch component state" lesson that matters for any camera-driven
 * overlay, not just pose-tracking apps. Redux only tracks state
 * *transitions* (idle -> detecting -> stable -> capturing -> captured),
 * which happen at most a few times per second, not 30-60 times.
 */
const detectionSlice = createSlice({
  name: 'detection',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<DetectionStatus>) {
      state.status = action.payload;
      if (action.payload !== 'stable') {
        state.stableFrameCount = 0;
      }
    },
    incrementStableFrameCount(state) {
      state.stableFrameCount += 1;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.lastError = action.payload;
    },
    reset(state) {
      state.status = 'idle';
      state.stableFrameCount = 0;
      state.lastError = null;
    },
  },
});

export const {setStatus, incrementStableFrameCount, setError, reset} = detectionSlice.actions;
export default detectionSlice.reducer;
