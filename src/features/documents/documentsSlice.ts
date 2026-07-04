import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface ScannedDocument {
  id: string;
  rawImageUri: string;
  warpedImageUri: string | null;
  ocrText: string | null;
  createdAt: number;
}

interface DocumentsState {
  items: ScannedDocument[];
}

const initialState: DocumentsState = {
  items: [],
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    addDocument(state, action: PayloadAction<ScannedDocument>) {
      state.items.unshift(action.payload);
    },
    setWarpedImage(state, action: PayloadAction<{id: string; warpedImageUri: string}>) {
      const doc = state.items.find(d => d.id === action.payload.id);
      if (doc) {
        doc.warpedImageUri = action.payload.warpedImageUri;
      }
    },
    setOcrText(state, action: PayloadAction<{id: string; ocrText: string}>) {
      const doc = state.items.find(d => d.id === action.payload.id);
      if (doc) {
        doc.ocrText = action.payload.ocrText;
      }
    },
    removeDocument(state, action: PayloadAction<string>) {
      state.items = state.items.filter(d => d.id !== action.payload);
    },
  },
});

export const {addDocument, setWarpedImage, setOcrText, removeDocument} = documentsSlice.actions;
export default documentsSlice.reducer;
