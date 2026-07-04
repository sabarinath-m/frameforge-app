import {configureStore} from '@reduxjs/toolkit';
import detectionReducer from '../features/detection/detectionSlice';
import documentsReducer from '../features/documents/documentsSlice';

export const store = configureStore({
  reducer: {
    detection: detectionReducer,
    documents: documentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
