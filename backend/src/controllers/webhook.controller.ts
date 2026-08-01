import { Request, Response } from 'express';
import Message from '../models/Message';
import Campaign from '../models/Campaign';
import { Op } from 'sequelize';

export class WebhookController {
  // Twilio status callback webhook
  static async twilioStatus(req: Request, res: Response): Promise<void> {
    try {
      const { 
        MessageSid, 
        MessageStatus, 
        To, 
        ErrorCode,
        EventType 
      } = req.body;

      console.log(`📲 Twilio webhook: ${MessageSid} - ${MessageStatus}`);

      // Find message by gateway message ID
      const message = await Message.findOne({
        where: { gatewayMessageId: MessageSid }
      });

      if (!message) {
        console.log(`⚠️ Message not found for SID: ${MessageSid}`);
        res.sendStatus(200); // Still return 200 to Twilio
        return;
      }

      // Update message status based on Twilio status
      let newStatus = message.status;
      let deliveredAt = message.deliveredAt;

      switch (MessageStatus) {
        case 'delivered':
          newStatus = 'delivered';
          deliveredAt = new Date();
          console.log(`✅ Message delivered to ${To}`);
          break;
        case 'sent':
          newStatus = 'sent';
          message.sentAt = new Date();
          break;
        case 'failed':
        case 'undelivered':
          newStatus = 'failed';
          message.error = `Twilio error: ${ErrorCode || 'Unknown'}`;
          console.log(`❌ Message failed: ${ErrorCode}`);
          break;
        case 'queued':
        case 'sending':
          newStatus = 'processing';
          break;
      }

      // Update message
      message.status = newStatus as any;
      if (deliveredAt) message.deliveredAt = deliveredAt;
      message.metadata = {
        ...message.metadata,
        twilioStatus: MessageStatus,
        twilioCallback: req.body,
        updatedAt: new Date()
      };
      await message.save();

      // Update campaign stats
      if (message.campaignId) {
        const campaign = await Campaign.findByPk(message.campaignId);
        if (campaign) {
          if (newStatus === 'delivered') {
            campaign.deliveredCount += 1;
          } else if (newStatus === 'failed') {
            campaign.failedCount += 1;
          }
          await campaign.save();
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('❌ Twilio webhook error:', error);
      res.sendStatus(500);
    }
  }

  // AfricasTalking delivery report webhook
  static async africastalkingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { 
        id,                 // Message ID
        status,             // Success, Failed, Sent, Delivered
        phoneNumber,
        failureReason,
        retryCount 
      } = req.body;

      console.log(`📲 AfricasTalking webhook: ${id} - ${status}`);

      // Find message by gateway message ID
      const message = await Message.findOne({
        where: { gatewayMessageId: id }
      });

      if (!message) {
        console.log(`⚠️ Message not found for ID: ${id}`);
        res.sendStatus(200);
        return;
      }

      // Update message status
      let newStatus = message.status;
      let deliveredAt = message.deliveredAt;

      switch (status) {
        case 'Delivered':
        case 'Success':
          newStatus = 'delivered';
          deliveredAt = new Date();
          console.log(`✅ Message delivered to ${phoneNumber}`);
          break;
        case 'Sent':
          newStatus = 'sent';
          message.sentAt = new Date();
          break;
        case 'Failed':
        case 'Rejected':
          newStatus = 'failed';
          message.error = failureReason || 'AfricasTalking delivery failed';
          console.log(`❌ Message failed: ${failureReason}`);
          break;
        case 'Submitted':
        case 'Pending':
          newStatus = 'processing';
          break;
      }

      // Update message
      message.status = newStatus as any;
      if (deliveredAt) message.deliveredAt = deliveredAt;
      message.metadata = {
        ...message.metadata,
        atStatus: status,
        atCallback: req.body,
        updatedAt: new Date()
      };
      await message.save();

      // Update campaign stats
      if (message.campaignId) {
        const campaign = await Campaign.findByPk(message.campaignId);
        if (campaign && campaign.status === 'running') {
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
                [Op.in]: ['pending', 'queued', 'processing', 'sent']
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
            console.log(`✅ Campaign ${campaign.name} completed via webhook`);
          }



          // if (newStatus === 'delivered') {
          //   campaign.deliveredCount += 1;
          // } else if (newStatus === 'failed') {
          //   campaign.failedCount += 1;
          // }
          // await campaign.save();
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('❌ AfricasTalking webhook error:', error);
      res.sendStatus(500);
    }
  }

  // Test webhook endpoint
  static async testWebhook(req: Request, res: Response): Promise<void> {
    console.log('🔔 Test webhook received:', req.body);
    res.status(200).json({ 
      success: true, 
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }
}

export default WebhookController;
