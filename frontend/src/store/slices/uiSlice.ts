// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  autoHide?: number;
}

interface UiState {
  sidebarOpen: boolean;
  darkMode: boolean;
  notifications: Notification[];
  unreadCount: number;
}

const initialState: UiState = {
  sidebarOpen: true,
  darkMode: false,
  notifications: [],
  unreadCount: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const id = Date.now().toString();
      state.notifications.push({
        id,
        ...action.payload,
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    // ADD THIS: Update unread count
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
  },
});

export const { 
  toggleSidebar, 
  setSidebarOpen, 
  toggleDarkMode, 
  addNotification, 
  removeNotification, 
  clearNotifications,
  updateUnreadCount // Make sure to export it
} = uiSlice.actions;

export default uiSlice.reducer;