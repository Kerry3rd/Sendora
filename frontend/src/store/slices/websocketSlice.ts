import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WebSocketState {
  connected: boolean;
  lastEvent: any;
  connectionError: string | null;
}

const initialState: WebSocketState = {
  connected: false,
  lastEvent: null,
  connectionError: null
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    setLastEvent: (state, action: PayloadAction<any>) => {
      state.lastEvent = action.payload;
    },
    setConnectionError: (state, action: PayloadAction<string | null>) => {
      state.connectionError = action.payload;
    }
  }
});

export const { setConnected, setLastEvent, setConnectionError } = websocketSlice.actions;
export default websocketSlice.reducer;