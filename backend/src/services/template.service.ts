import { Op } from 'sequelize';
import Template from '../models/Template';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { Cache } from '../utils/cache';

export interface TemplateFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  tags?: string[];
  isPublic?: boolean;
}

export class TemplateService {
  // Create template
  static async create(userId: string, data: any): Promise<Template> {
    try {
      // Extract variables from message
      const variables = this.extractVariables(data.message);

      const template = await Template.create({
        ...data,
        userId,
        variables,
        usageCount: 0,
        lastUsedAt: null,
      });

      // Clear cache
      await Cache.delPattern(`templates:${userId}:*`);

      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  // Get all templates for user
  static async findAll(userId: string, filters: TemplateFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        tags,
        isPublic,
      } = filters;

      const offset = (page - 1) * limit;
      const where: any = {
        [Op.or]: [
          { userId },
          { isPublic: true },
        ],
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { message: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (tags && tags.length > 0) {
        where.tags = { [Op.overlap]: tags };
      }

      if (isPublic !== undefined) {
        where.isPublic = isPublic;
      }

      const cacheKey = `templates:${userId}:${page}:${limit}:${category || 'all'}:${search || ''}`;
      
      return Cache.remember(cacheKey, 300, async () => {
        const { count, rows } = await Template.findAndCountAll({
          where,
          limit,
          offset,
          order: [
            ['isPublic', 'DESC'],
            ['usageCount', 'DESC'],
            ['createdAt', 'DESC'],
          ],
        });

        return {
          templates: rows,
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
          },
        };
      });
    } catch (error) {
      console.error('Error finding templates:', error);
      throw error;
    }
  }

  // Get single template
  static async findById(id: string, userId: string): Promise<Template> {
    try {
      const template = await Template.findOne({
        where: {
          id,
          [Op.or]: [
            { userId },
            { isPublic: true },
          ],
        },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      return template;
    } catch (error) {
      console.error('Error finding template:', error);
      throw error;
    }
  }

  // Update template
  static async update(id: string, userId: string, data: any): Promise<Template> {
    try {
      const template = await Template.findOne({
        where: { id, userId },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      // Re-extract variables if message changed
      if (data.message && data.message !== template.message) {
        data.variables = this.extractVariables(data.message);
      }

      await template.update(data);

      // Clear cache
      await Cache.del(`template:${id}`);
      await Cache.delPattern(`templates:${userId}:*`);

      return template;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Delete template
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const template = await Template.findOne({
        where: { id, userId },
      });

      if (!template) {
        throw new NotFoundError('Template not found');
      }

      await template.destroy();

      // Clear cache
      await Cache.del(`template:${id}`);
      await Cache.delPattern(`templates:${userId}:*`);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Use template (increment usage count)
  static async useTemplate(id: string, userId: string): Promise<Template> {
    try {
      const template = await this.findById(id, userId);
      
      template.usageCount += 1;
      template.lastUsedAt = new Date();
      await template.save();
      
      // Clear cache
      await Cache.del(`template:${id}`);
      await Cache.delPattern(`templates:${userId}:*`);
      
      return template;
    } catch (error) {
      console.error('Error using template:', error);
      throw error;
    }
  }

  // Get popular templates
  static async getPopular(userId: string, limit: number = 10): Promise<Template[]> {
    try {
      return await Template.findAll({
        where: {
          [Op.or]: [
            { userId },
            { isPublic: true },
          ],
        },
        order: [['usageCount', 'DESC']],
        limit,
      });
    } catch (error) {
      console.error('Error getting popular templates:', error);
      throw error;
    }
  }

  // Get templates by category
  static async getByCategory(userId: string, category: string): Promise<Template[]> {
    try {
      return await Template.findAll({
        where: {
          [Op.or]: [
            { userId },
            { isPublic: true },
          ],
          category,
        },
        order: [['usageCount', 'DESC']],
      });
    } catch (error) {
      console.error('Error getting templates by category:', error);
      throw error;
    }
  }

  // Get template statistics
  static async getStats(userId: string): Promise<any> {
    try {
      const total = await Template.count({
        where: { userId },
      });

      const publicCount = await Template.count({
        where: { userId, isPublic: true },
      });

      const privateCount = await Template.count({
        where: { userId, isPublic: false },
      });

      const categoryStats = await Template.findAll({
        where: { userId },
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('category')), 'count'],
        ],
        group: ['category'],
        raw: true,
      });

      const mostUsed = await Template.findAll({
        where: { userId },
        order: [['usageCount', 'DESC']],
        limit: 5,
      });

      return {
        total,
        public: publicCount,
        private: privateCount,
        categories: categoryStats,
        mostUsed,
      };
    } catch (error) {
      console.error('Error getting template stats:', error);
      throw error;
    }
  }

  // Bulk delete templates
  static async bulkDelete(userId: string, ids: string[]): Promise<number> {
    try {
      const deleted = await Template.destroy({
        where: {
          id: { [Op.in]: ids },
          userId,
        },
      });

      // Clear cache
      await Cache.delPattern(`templates:${userId}:*`);
      for (const id of ids) {
        await Cache.del(`template:${id}`);
      }

      return deleted;
    } catch (error) {
      console.error('Error bulk deleting templates:', error);
      throw error;
    }
  }

  // Duplicate template
  static async duplicate(id: string, userId: string): Promise<Template> {
    try {
      const template = await this.findById(id, userId);
      
      const newTemplate = await Template.create({
        userId,
        name: `${template.name} (Copy)`,
        description: template.description,
        message: template.message,
        category: template.category,
        tags: template.tags,
        variables: template.variables,
        isPublic: false, // Copies are private by default
        usageCount: 0,
        lastUsedAt: null,
      });

      // Clear cache
      await Cache.delPattern(`templates:${userId}:*`);

      return newTemplate;
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  // Extract variables from message
  private static extractVariables(message: string): string[] {
    const matches = message.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
  }
}

// Make sure to import sequelize at the top
import sequelize from '../config/sequelize';