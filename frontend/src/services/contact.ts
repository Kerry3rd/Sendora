import api from './api';
import { saveAs } from 'file-saver';

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  contactCount?: number;
  createdAt?: string;
  updatedAt?: string;
  contactIds: string[];
  tags: string[];
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  contactIds: string[];
  tags: string[];
  color: string;
  contactCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  tags: string[];
  groups?: string[];
  isSubscribed: boolean;
  isBlacklisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  subscribed: number;
  blacklisted: number;
  uniqueTags: number;
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  addTags?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeFields: string[];
  status?: 'all' | 'subscribed' | 'unsubscribed' | 'blacklisted';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: any;
}

class ContactService {
  // ============ CONTACTS ============

  // Get all contacts with pagination and filters
  async getContacts(params: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    groups?: string[];
    subscribed?: boolean;
    blacklisted?: boolean;
  }) {
    try {
      const queryParams: any = { ...params };
      if (params.tags?.length) {
        queryParams.tags = params.tags.join(',');
      }
      if (params.groups?.length) {
        queryParams.groups = params.groups.join(',');
      }
      
      const response = await api.get('/contacts', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      throw error;
    }
  }

  // Get single contact
  async getContact(id: string) {
    try {
      const response = await api.get(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch contact:', error);
      throw error;
    }
  }

  // Create contact
  async createContact(data: Partial<Contact>) {
    try {
      const response = await api.post('/contacts', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create contact:', error);
      throw error;
    }
  }

  // Update contact
  async updateContact(id: string, data: Partial<Contact>) {
    try {
      const response = await api.put(`/contacts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update contact:', error);
      throw error;
    }
  }

  // Delete contact
  async deleteContact(id: string) {
    try {
      const response = await api.delete(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete contact:', error);
      throw error;
    }
  }

  // Bulk delete contacts
  async bulkDelete(ids: string[]) {
    try {
      const response = await api.post('/contacts/bulk-delete', { ids });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk delete contacts:', error);
      throw error;
    }
  }

  // Get contact statistics
  async getStats() {
    try {
      const response = await api.get('/contacts/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch contact stats:', error);
      throw error;
    }
  }

  // ============ IMPORT/EXPORT ============

  // Import contacts from file
  async importContacts(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/contacts/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for large files
      });
      return response.data;
    } catch (error) {
      console.error('Failed to import contacts:', error);
      throw error;
    }
  }

  // Bulk import with options
  async bulkImport(contacts: Partial<Contact>[], options: ImportOptions = {}) {
    try {
      const response = await api.post('/contacts/bulk-import', {
        contacts,
        options,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk import contacts:', error);
      throw error;
    }
  }

  // Export contacts
  async exportContacts(options: ExportOptions) {
    try {
      const response = await api.post('/contacts/export', options, {
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('Failed to export contacts:', error);
      throw error;
    }
  }

  // Export selected contacts
  async exportSelected(contactIds: string[], options: Partial<ExportOptions> = {}) {
    try {
      const response = await api.post('/contacts/export-selected', {
        contactIds,
        options,
      }, {
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('Failed to export selected contacts:', error);
      throw error;
    }
  }

  // Download sample template
  async downloadSampleTemplate(format: 'csv' | 'excel' = 'excel') {
    try {
      const response = await api.get('/contacts/sample-template', {
        params: { format },
        responseType: 'blob',
      });

      const filename = `contact_template.${format === 'excel' ? 'xlsx' : 'csv'}`;
      saveAs(response.data, filename);
      return { success: true };
    } catch (error) {
      console.error('Failed to download template:', error);
      throw error;
    }
  }

  // Get import history
  async getImportHistory(page = 1, limit = 20) {
    try {
      const response = await api.get('/contacts/import-history', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch import history:', error);
      throw error;
    }
  }

  // Validate contacts before import
  async validateContacts(contacts: Partial<Contact>[]) {
    try {
      const response = await api.post('/contacts/validate', { contacts });
      return response.data;
    } catch (error) {
      console.error('Failed to validate contacts:', error);
      throw error;
    }
  }

  // ============ GROUPS ============

  async getGroups(params?: { page?: number; limit?: number; search?: string }) {
    try {
      const response = await api.get('/groups', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      throw error;
    }
  }

  async getGroup(id: string) {
    try {
      const response = await api.get(`/contacts/groups/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch group:', error);
      throw error;
    }
  }

  async createGroup(data: { name: string; description?: string; contactIds?: string[]; tags?: string[];  color?: string }) {
    try {
      const response = await api.post('/contacts/groups', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  async updateGroup(id: string, data: { name?: string; description?: string; contactIds: string[]; tags: string[]; color?: string }) {
    try {
      const response = await api.put(`/contacts/groups/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  }

  async deleteGroup(id: string) {
    try {
      const response = await api.delete(`/contacts/groups/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  }

  async addContactsToGroup(groupId: string, contactIds: string[]) {
    try {
      const response = await api.post(`/contacts/groups/${groupId}/contacts`, { contactIds });
      return response.data;
    } catch (error) {
      console.error('Failed to add contacts to group:', error);
      throw error;
    }
  }

  async removeContactsFromGroup(groupId: string, contactIds: string[]) {
    try {
      const response = await api.delete(`/contacts/groups/${groupId}/contacts`, {
        data: { contactIds },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to remove contacts from group:', error);
      throw error;
    }
  }
}

const contactService = new ContactService();
export default contactService;