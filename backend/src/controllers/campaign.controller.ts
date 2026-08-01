import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CampaignService } from '../services/campaign/campaign.service';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class CampaignController {
  // Helper function to safely get string from params
  private static getParamId(id: string | string[] | undefined): string {
    if (!id) {
      throw new BadRequestError('ID parameter is required');
    }
    return Array.isArray(id) ? id[0] : id;
  }

  // Create campaign
  static async createCampaign(req: AuthRequest, res: Response) {
    const userId = req.user.id;
    const campaignData = req.body;

    const campaign = await CampaignService.create(userId, campaignData);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  }

  // Get all campaigns
  static async getCampaigns(req: AuthRequest, res: Response) {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, search, type } = req.query;

    const result = await CampaignService.findAll(userId, {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      search: search as string,
      type: type as any
    });

    res.json({
      success: true,
      data: result
    });
  }

  // Get single campaign
  static async getCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    const campaign = await CampaignService.findById(campaignId, userId);

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    res.json({
      success: true,
      data: campaign
    });
  }

  // Update campaign
  static async updateCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const campaignId = this.getParamId(id);
    const campaign = await CampaignService.update(campaignId, userId, updates);

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  }

  // Delete campaign
  static async deleteCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    const deleted = await CampaignService.delete(campaignId, userId);

    if (!deleted) {
      throw new NotFoundError('Campaign not found');
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  }

  // Start campaign
  static async startCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;
    const { contacts } = req.body;

    const campaignId = this.getParamId(id);
    const result = await CampaignService.start(campaignId, userId, contacts);

    res.json({
      success: true,
      message: 'Campaign started successfully',
      data: result
    });
  }

  // Pause campaign
  static async pauseCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    const campaign = await CampaignService.pause(campaignId, userId);

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      data: campaign
    });
  }

  // Resume campaign
  static async resumeCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    const campaign = await CampaignService.resume(campaignId, userId);

    res.json({
      success: true,
      message: 'Campaign resumed successfully',
      data: campaign
    });
  }

  // Cancel campaign
  static async cancelCampaign(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    const campaign = await CampaignService.cancel(campaignId, userId);

    res.json({
      success: true,
      message: 'Campaign cancelled successfully',
      data: campaign
    });
  }

  // Get campaign stats - FIXED: Use getCampaignStats instead of getStats
  static async getCampaignStats(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    // FIXED: Changed from getStats to getCampaignStats
    const stats = await CampaignService.getCampaignStats(campaignId, userId);

    res.json({
      success: true,
      data: stats
    });
  }

  // Get campaign logs
  static async getCampaignLogs(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    const campaignId = this.getParamId(id);
    const logs = await CampaignService.getLogs(campaignId, userId, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: logs
    });
  }

  // Get recurring campaigns
  static async getRecurringCampaigns(req: AuthRequest, res: Response) {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const campaigns = await CampaignService.findRecurring(userId, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: campaigns
    });
  }

  // Get birthday campaigns
  static async getBirthdayCampaigns(req: AuthRequest, res: Response) {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const campaigns = await CampaignService.findBirthday(userId, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: campaigns
    });
  }

  // Get campaign instances (for recurring)
  static async getCampaignInstances(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user.id;

    const campaignId = this.getParamId(id);
    const instances = await CampaignService.getInstances(campaignId, userId);

    res.json({
      success: true,
      data: instances
    });
  }
}