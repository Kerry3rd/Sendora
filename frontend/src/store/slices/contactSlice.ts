import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface ContactState {
  contacts: any[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

const initialState: ContactState = {
  contacts: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
};

export const fetchContacts = createAsyncThunk(
  'contacts/fetchAll',
  async ({ page, limit }: { page: number; limit: number }) => {
    // TODO: Implement contact fetch
    return { contacts: [], pagination: { total: 0, page, limit } };
  }
);

const contactSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload.contacts;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contacts';
      });
  },
});

export const { clearError } = contactSlice.actions;
export default contactSlice.reducer;
