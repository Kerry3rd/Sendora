import { group } from 'console';
import api from './api';

export interface Group {
  id: string;
  name: string;
  description?: string;
  contactsCount: number;
  contacts?: any[];
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

class GroupService {

  // Add this new method
  async getAvailableContacts(groupId: string, searchTerm?: string, page = 1, limit = 100) {
    try {
      console.log(`📤 API Request: GET /groups/${groupId}/available-contacts`);
      const response = await api.get(`/groups/${groupId}/available-contacts`, {
        params: { 
          search: searchTerm,
          page,
          limit
        }
      });

      console.log('📥 API Response:', response.data);
      console.log('📥 Response status:', response.status);
      
      return response.data;

    } catch (error) {
      console.error('❌ API Error fetching available contacts:', error);
      throw error;
    }
  }

  async getGroups(params?: any) {
    try {
      const response = await api.get('/groups', { params });
      console.log('📥 Groups API response:', response.data);
      
      // Handle different response structures
      const data = response.data?.data || response.data;
      const groups = data?.groups || data || [];

       // Ensure each group has contactCount
      return {
        success: true,
        groups: groups.map((group: any) => ({
          ...group,
          contactCount: group.contactCount || group.contacts?.length || 0
        }))
      };
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      throw { success: false, groups: [] };
    }
  }

  // Get single group with its contacts
  async getGroup(id: string) {
    try {
      const response = await api.get(`/groups/${id}`);
      const data = response.data?.data || response.data;
      return {
        success: true,
        group: {
          ...data,
          contactCount: data.contacts?.length || data.contactCount || 0
        }
      };
    } catch (error) {
      console.error('Failed to fetch group:', error);
      throw error;
    }
  }
  
  async createGroup(data: { name: string; description?: string; tags?: string[] }) {
    try {
      const response = await api.post('/groups', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  async updateGroup(id: string, data: { name?: string; description?: string; tags?: string[] }) {
    try {
      const response = await api.put(`/groups/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  }

  async deleteGroup(id: string) {
    try {
      const response = await api.delete(`/groups/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  }

  async addContacts(groupId: string, contactIds: string[]) {
    try {
      const response = await api.post(`/groups/${groupId}/contacts`, { contactIds });
      return response.data;
    } catch (error) {
      console.error('Failed to add contacts to group:', error);
      throw error;
    }
  }

  async removeContacts(groupId: string, contactIds: string[]) {
    try {
      const response = await api.delete(`/groups/${groupId}/contacts`, {
        data: { contactIds },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to remove contacts from group:', error);
      throw error;
    }
  }
}

const groupService = new GroupService();
export default groupService;
