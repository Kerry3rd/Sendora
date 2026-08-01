import api from './api';

export interface Template {
  id: string;
  userId: string;
  name: string;
  description?: string;
  message: string;
  category: 'general' | 'marketing' | 'transactional' | 'notification' | 'birthday' | 'custom';
  tags: string[];
  variables: string[];
  isPublic: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface TemplatesResponse {
  success: boolean;
  data: {
    templates: Template[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

class TemplateService {
  // Get all templates
  async getTemplates(filters: TemplateFilters = {}) {
    try {
      const params: any = { ...filters };
      if (filters.tags) {
        params.tags = filters.tags.join(',');
      }

      const response = await api.get('/templates', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw error;
    }
  }

  // Get single template
  async getTemplate(id: string) {
    try {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch template:', error);
      throw error;
    }
  }

  // Create template
  async createTemplate(data: Partial<Template>) {
    try {
      const response = await api.post('/templates', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  // Update template
  async updateTemplate(id: string, data: Partial<Template>) {
    try {
      const response = await api.put(`/templates/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }

  // Delete template
  async deleteTemplate(id: string) {
    try {
      const response = await api.delete(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  // Use template (increment usage count)
  async useTemplate(id: string) {
    try {
      const response = await api.post(`/templates/${id}/use`);
      return response.data;
    } catch (error) {
      console.error('Failed to use template:', error);
      throw error;
    }
  }

  // Get popular templates
  async getPopularTemplates(limit: number = 10) {
    try {
      const response = await api.get('/templates/popular', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch popular templates:', error);
      throw error;
    }
  }

  // Get templates by category
  async getTemplatesByCategory(category: string) {
    try {
      const response = await api.get(`/templates/category/${category}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch templates by category:', error);
      throw error;
    }
  }

  // Get template statistics
  async getTemplateStats() {
    try {
      const response = await api.get('/templates/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch template stats:', error);
      throw error;
    }
  }

  // Duplicate template
  async duplicateTemplate(id: string) {
    try {
      const response = await api.post(`/templates/${id}/duplicate`);
      return response.data;
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      throw error;
    }
  }

  // Bulk delete templates
  async bulkDeleteTemplates(ids: string[]) {
    try {
      const response = await api.post('/templates/bulk-delete', { ids });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk delete templates:', error);
      throw error;
    }
  }
}

const templateService = new TemplateService();
export default templateService;