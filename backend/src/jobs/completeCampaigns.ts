import { Op } from 'sequelize';
import Campaign from '../models/Campaign';
import Message from '../models/Message';

export async function completeCampaigns() {
  console.log('🔄 Checking for campaigns to complete...');
  
  // Find all running campaigns
  const runningCampaigns = await Campaign.findAll({
    where: {
      status: 'running',
    },
  });
  
  let completedCount = 0;
  
  for (const campaign of runningCampaigns) {
    // Count messages for this campaign
    const totalMessages = campaign.totalRecipients;
    
    const deliveredCount = await Message.count({
      where: {
        campaignId: campaign.id,
        status: 'delivered',
      },
    });
    
    const failedCount = await Message.count({
      where: {
        campaignId: campaign.id,
        status: 'failed',
      },
    });
    
    const pendingCount = await Message.count({
      where: {
        campaignId: campaign.id,
        status: {
          [Op.in]: ['pending', 'queued', 'processing']
        },
      },
    });
    
    // If no pending messages, mark as completed
    if (pendingCount === 0) {
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      campaign.deliveredCount = deliveredCount;
      campaign.failedCount = failedCount;
      await campaign.save();
      
      console.log(`✅ Campaign ${campaign.name} completed - ${deliveredCount} delivered, ${failedCount} failed`);
      completedCount++;
    }
  }
  
  if (completedCount > 0) {
    console.log(`✅ ${completedCount} campaigns automatically completed`);
  }
}

// Run every minute
setInterval(completeCampaigns, 60000);

// Run once at startup
completeCampaigns();
