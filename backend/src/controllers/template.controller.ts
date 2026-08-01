import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TemplateService } from '../services/template.service';
import { BadRequestError } from '../utils/errors';

export class TemplateController {
  // Helper to safely get string from params
  private static getParamString(param: string | string[] | undefined): string {
    if (!param) {
      throw new BadRequestError('Parameter is required');
    }
    return Array.isArray(param) ? param[0] : param;
  }

  // Create template
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const templateData = req.body;

      const template = await TemplateService.create(userId, templateData);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template,
      });
    } catch (error: any) {
      console.error('Create template error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create template',
      });
    }
  }

  // Get all templates
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        category,
        search,
        tags,
        isPublic,
      } = req.query;

      const result = await TemplateService.findAll(userId, {
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        search: search as string,
        tags: tags ? (tags as string).split(',') : undefined,
        isPublic: isPublic === 'true',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get all templates error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch templates',
      });
    }
  }

  // Get single template
  static async getOne(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // FIXED: Convert id to string
      const templateId = this.getParamString(id);
      const template = await TemplateService.findById(templateId, userId);

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Get template error:', error);
      if (error instanceof BadRequestError) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Failed to fetch template' });
      }
    }
  }

  // Update template
  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;

      // FIXED: Convert id to string
      const templateId = this.getParamString(id);
      const template = await TemplateService.update(templateId, userId, updates);

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: template,
      });
    } catch (error: any) {
      console.error('Update template error:', error);
      if (error instanceof BadRequestError) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update template' });
      }
    }
  }

  // Delete template
  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // FIXED: Convert id to string
      const templateId = this.getParamString(id);
      await TemplateService.delete(templateId, userId);

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete template error:', error);
      if (error instanceof BadRequestError) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Failed to delete template' });
      }
    }
  }

  // Use template (increment usage)
  static async useTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // FIXED: Convert id to string
      const templateId = this.getParamString(id);
      const template = await TemplateService.useTemplate(templateId, userId);

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Use template error:', error);
      if (error instanceof BadRequestError) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Failed to use template' });
      }
    }
  }

  // Get popular templates
  static async getPopular(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const templates = await TemplateService.getPopular(userId, Number(limit));

      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      console.error('Get popular templates error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch popular templates',
      });
    }
  }

  // Get templates by category
  static async getByCategory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { category } = req.params;

      // FIXED: Convert category to string
      const categoryName = this.getParamString(category);
      const templates = await TemplateService.getByCategory(userId, categoryName);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      console.error('Get templates by category error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch templates by category',
      });
    }
  }

  // Get template statistics
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;

      const stats = await TemplateService.getStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get template stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch template statistics',
      });
    }
  }

  // Bulk delete templates
  static async bulkDelete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('Template IDs are required');
      }

      const deleted = await TemplateService.bulkDelete(userId, ids);

      res.json({
        success: true,
        message: `${deleted} templates deleted successfully`,
      });
    } catch (error: any) {
      console.error('Bulk delete templates error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete templates',
      });
    }
  }

  // Duplicate template
  static async duplicate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // FIXED: Convert id to string
      const templateId = this.getParamString(id);
      const template = await TemplateService.duplicate(templateId, userId);

      res.status(201).json({
        success: true,
        message: 'Template duplicated successfully',
        data: template,
      });
    } catch (error: any) {
      console.error('Duplicate template error:', error);
      if (error instanceof BadRequestError) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Failed to duplicate template' });
      }
    }
  }
}