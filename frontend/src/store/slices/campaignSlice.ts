import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import campaignService from '../../services/campaign';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  message: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  estimatedCost: number;
  actualCost: number;
  senderId: string;
  isUnicode: boolean;
  isFlash: boolean;
  variables: string[];
  isRecurring: boolean;
  recurrenceRule: any | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  occurrencesCount: number;
  maxOccurrences: number | null;
  parentCampaignId: string | null;
  targetType: 'all' | 'group' | 'segment' | 'manual';
  groupId: string | null;
  segmentRules: any[] | null;
  includedContacts: string[] | null;
  excludedContacts: string[] | null;
  isBirthdayCampaign: boolean;
  birthdayField: string | null;
  birthdayMessageTemplate: string | null;
  sendOn: 'same_day' | 'day_before' | 'week_before';
  sendTime: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  stats?: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    cost: number;
    deliveryRate: number;
  };
}

// Interface for progress updates from WebSocket
interface CampaignProgress {
  campaignId: string;
  sent: number;
  delivered: number;
  failed: number;
  total: number;
  percentage: number;
  status: string;
}

interface CampaignState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  campaignProgress: Record<string, CampaignProgress>; // Store progress by campaign ID
}

const initialState: CampaignState = {
  campaigns: [],
  currentCampaign: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  campaignProgress: {},
};

export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchAll',
  async ({ page, limit, status }: { page: number; limit: number; status?: string }) => {
    const response = await campaignService.getCampaigns(page, limit, status);
    return response.data;
  }
);

export const fetchCampaign = createAsyncThunk(
  'campaigns/fetchOne',
  async (id: string) => {
    const response = await campaignService.getCampaign(id);
    return response.data;
  }
);

export const createCampaign = createAsyncThunk(
  'campaigns/create',
  async (data: any) => {
    const response = await campaignService.createCampaign(data);
    return response.data;
  }
);

export const updateCampaign = createAsyncThunk(
  'campaigns/update',
  async ({ id, data }: { id: string; data: any }) => {
    const response = await campaignService.updateCampaign(id, data);
    return response.data;
  }
);

export const deleteCampaign = createAsyncThunk(
  'campaigns/delete',
  async (id: string) => {
    await campaignService.deleteCampaign(id);
    return id;
  }
);

export const startCampaign = createAsyncThunk(
  'campaigns/start',
  async ({ id, contacts }: { id: string; contacts?: any[] }) => {
    const response = await campaignService.startCampaign(id, contacts);
    return response.data;
  }
);

export const pauseCampaign = createAsyncThunk(
  'campaigns/pause',
  async (id: string) => {
    const response = await campaignService.pauseCampaign(id);
    return response.data;
  }
);

export const resumeCampaign = createAsyncThunk(
  'campaigns/resume',
  async (id: string) => {
    const response = await campaignService.resumeCampaign(id);
    return response.data;
  }
);

export const cancelCampaign = createAsyncThunk(
  'campaigns/cancel',
  async (id: string) => {
    const response = await campaignService.cancelCampaign(id);
    return response.data;
  }
);

export const fetchCampaignStats = createAsyncThunk(
  'campaigns/fetchStats',
  async (id: string) => {
    const response = await campaignService.getCampaignStats(id);
    return { id, stats: response.data };
  }
);

const campaignSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    clearCurrentCampaign: (state) => {
      state.currentCampaign = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
    // ADD THIS: Update campaign progress from WebSocket
    updateCampaignProgress: (state, action: PayloadAction<CampaignProgress>) => {
      const progress = action.payload;
      
      // Store progress in the campaignProgress object
      state.campaignProgress[progress.campaignId] = progress;
      
      // Also update the campaign in the campaigns array if it exists
      const campaignIndex = state.campaigns.findIndex(c => c.id === progress.campaignId);
      if (campaignIndex !== -1) {
        // Update sent/delivered/failed counts
        state.campaigns[campaignIndex].sentCount = progress.sent;
        state.campaigns[campaignIndex].deliveredCount = progress.delivered;
        state.campaigns[campaignIndex].failedCount = progress.failed;
        state.campaigns[campaignIndex].status = progress.status as any;
        
        // Update stats if they exist
        if (state.campaigns[campaignIndex].stats) {
          state.campaigns[campaignIndex].stats!.sent = progress.sent;
          state.campaigns[campaignIndex].stats!.delivered = progress.delivered;
          state.campaigns[campaignIndex].stats!.failed = progress.failed;
          state.campaigns[campaignIndex].stats!.total = progress.total;
        }
      }
      
      // Update current campaign if it's the one being updated
      if (state.currentCampaign?.id === progress.campaignId) {
        state.currentCampaign.sentCount = progress.sent;
        state.currentCampaign.deliveredCount = progress.delivered;
        state.currentCampaign.failedCount = progress.failed;
        state.currentCampaign.status = progress.status as any;
        
        if (state.currentCampaign.stats) {
          state.currentCampaign.stats.sent = progress.sent;
          state.currentCampaign.stats.delivered = progress.delivered;
          state.currentCampaign.stats.failed = progress.failed;
          state.currentCampaign.stats.total = progress.total;
        }
      }
    },
    // ADD THIS: Update campaign status from WebSocket
    updateCampaignStatus: (state, action: PayloadAction<{ campaignId: string; status: string; data?: any }>) => {
      const { campaignId, status } = action.payload;
      
      const campaignIndex = state.campaigns.findIndex(c => c.id === campaignId);
      if (campaignIndex !== -1) {
        state.campaigns[campaignIndex].status = status as any;
      }
      
      if (state.currentCampaign?.id === campaignId) {
        state.currentCampaign.status = status as any;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all campaigns
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload?.campaigns || [];
        state.total = action.payload?.pagination?.total || 0;
        state.page = action.payload?.pagination?.page || state.page;
        state.limit = action.payload?.pagination?.limit || state.limit;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch campaigns';
      })

      // Fetch single campaign
      .addCase(fetchCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaign.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCampaign = action.payload;
      })
      .addCase(fetchCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch campaign';
      })

      // Create campaign
      .addCase(createCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create campaign';
      })

      // Update campaign
      .addCase(updateCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCampaign.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.campaigns.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload.id) {
          state.currentCampaign = action.payload;
        }
      })
      .addCase(updateCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update campaign';
      })

      // Delete campaign
      .addCase(deleteCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCampaign.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = state.campaigns.filter(c => c.id !== action.payload);
        state.total -= 1;
        if (state.currentCampaign?.id === action.payload) {
          state.currentCampaign = null;
        }
      })
      .addCase(deleteCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete campaign';
      })

      // Start campaign
      .addCase(startCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startCampaign.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.campaigns.findIndex(c => c.id === action.payload?.campaign?.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload.campaign;
        }
        if (state.currentCampaign?.id === action.payload?.campaign?.id) {
          state.currentCampaign = action.payload.campaign;
        }
      })
      .addCase(startCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to start campaign';
      })

      // Pause campaign
      .addCase(pauseCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(pauseCampaign.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.campaigns.findIndex(c => c.id === action.payload?.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload?.id) {
          state.currentCampaign = action.payload;
        }
      })
      .addCase(pauseCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to pause campaign';
      })

      // Resume campaign
      .addCase(resumeCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resumeCampaign.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.campaigns.findIndex(c => c.id === action.payload?.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload?.id) {
          state.currentCampaign = action.payload;
        }
      })
      .addCase(resumeCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to resume campaign';
      })

      // Cancel campaign
      .addCase(cancelCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelCampaign.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.campaigns.findIndex(c => c.id === action.payload?.id);
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
        if (state.currentCampaign?.id === action.payload?.id) {
          state.currentCampaign = action.payload;
        }
      })
      .addCase(cancelCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to cancel campaign';
      })

      // Fetch campaign stats
      .addCase(fetchCampaignStats.fulfilled, (state, action) => {
        const { id, stats } = action.payload;
        const campaign = state.campaigns.find(c => c.id === id);
        if (campaign) {
          campaign.stats = stats;
        }
        if (state.currentCampaign?.id === id) {
          state.currentCampaign.stats = stats;
        }
      });
  },
});

// Export all actions
export const { 
  clearCurrentCampaign, 
  clearError, 
  setPage, 
  setLimit,
  updateCampaignProgress, // Make sure to export this
  updateCampaignStatus    // Make sure to export this
} = campaignSlice.actions;

export default campaignSlice.reducer;