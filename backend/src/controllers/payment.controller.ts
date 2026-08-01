import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { mpesaService } from '../services/payment/mpesa.service';
import { getPackage, PRICING } from '../config/pricing';
import { Op } from 'sequelize';
// Add notification import
import NotificationService from '../services/notification/notification.service';

export class PaymentController {
  // Get available credit packages
  static async getPackages(req: Request, res: Response) {
    res.json({
      success: true,
      data: PRICING.packages,
    });
  }

  // Initiate M-Pesa payment
  static async initiateMpesaPayment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { packageId, phoneNumber } = req.body;

      // Get package details
      const pkg = getPackage(packageId);
      if (!pkg) {
        return res.status(400).json({
          success: false,
          message: 'Invalid package',
        });
      }

      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        type: 'credit_purchase',
        amount: pkg.price,
        currency: 'TZS',
        status: 'pending',
        paymentMethod: 'mpesa',
        phoneNumber,
        creditsBefore: Number(user.credits) || 0,
        creditsAfter: (Number(user.credits) || 0) + pkg.credits,
        description: `Purchase of ${pkg.credits} SMS credits`,
        metadata: {
          package: pkg,
        },
      });

      // Initiate M-Pesa payment
      const result = await mpesaService.stkPush(
        phoneNumber,
        pkg.price,
        `CREDITS-${transaction.id.slice(0, 8)}`,
        `Buy ${pkg.credits} SMS credits`
      );

      if (!result.success) {
        await transaction.update({ status: 'failed' });
        
        // 🔔 Send payment failed notification
        await NotificationService.paymentFailed(
          userId,
          pkg.price,
          result.error || 'Payment initiation failed'
        );
        
        return res.status(400).json({
          success: false,
          message: result.error || 'Payment initiation failed',
        });
      }

      // Update transaction with checkout ID
      await transaction.update({
        paymentReference: result.checkoutRequestID,
        metadata: {
          ...transaction.metadata,
          checkoutRequestID: result.checkoutRequestID,
        },
      });

      res.json({
        success: true,
        message: 'Payment initiated. Please check your phone to complete.',
        data: {
          transactionId: transaction.id,
          checkoutRequestID: result.checkoutRequestID,
        },
      });

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      
      // 🔔 Send payment failed notification
      if (req.user) {
        await NotificationService.paymentFailed(
          req.user.id,
          0,
          error.message || 'Payment initiation failed'
        );
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Payment initiation failed',
      });
    }
  }

  // M-Pesa callback webhook
  static async mpesaCallback(req: Request, res: Response) {
    try {
      console.log('📲 M-Pesa callback received:', JSON.stringify(req.body, null, 2));

      const { Body } = req.body;
      if (!Body || !Body.stkCallback) {
        return res.status(200).json({ ResultCode: 1, ResultDesc: 'Invalid request' });
      }

      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

      // Find transaction
      const transaction = await Transaction.findOne({
        where: { paymentReference: CheckoutRequestID },
      });

      if (!transaction) {
        console.log(`Transaction not found for CheckoutRequestID: ${CheckoutRequestID}`);
        return res.status(200).json({ ResultCode: 1, ResultDesc: 'Transaction not found' });
      }

      // Check if payment was successful
      if (ResultCode === 0) {
        // Extract amount from callback metadata
        let amount = 0;
        let receipt = '';
        let phone = '';

        if (CallbackMetadata?.Item) {
          CallbackMetadata.Item.forEach((item: any) => {
            if (item.Name === 'Amount') amount = item.Value;
            if (item.Name === 'MpesaReceiptNumber') receipt = item.Value;
            if (item.Name === 'PhoneNumber') phone = item.Value;
          });
        }

        // Update transaction
        await transaction.update({
          status: 'completed',
          mpesaReceipt: receipt,
          phoneNumber: phone || transaction.phoneNumber,
          metadata: {
            ...transaction.metadata,
            callback: req.body,
            amount,
          },
        });

        // Add credits to user
        const user = await User.findByPk(transaction.userId);
        if (user) {
          const creditsToAdd = transaction.metadata?.package?.credits || 0;
          user.credits = Number(user.credits) + creditsToAdd;
          await user.save();
          
          // 🔔 Send payment success notification
          await NotificationService.paymentSuccess(
            user.id,
            transaction.amount,
            creditsToAdd
          );
        }

        console.log(`✅ Payment completed for user ${transaction.userId}: ${receipt}`);
      } else {
        // Payment failed
        await transaction.update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            callback: req.body,
            error: ResultDesc,
          },
        });
        
        // 🔔 Send payment failed notification
        await NotificationService.paymentFailed(
          transaction.userId,
          transaction.amount,
          ResultDesc
        );
        
        console.log(`❌ Payment failed: ${ResultDesc}`);
      }

      // Always return success to M-Pesa
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });

    } catch (error: any) {
      console.error('M-Pesa callback error:', error);
      res.status(200).json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
    }
  }

  // Check payment status
  static async checkPaymentStatus(req: AuthRequest, res: Response) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.id;

      const transaction = await Transaction.findOne({
        where: { id: transactionId, userId },
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      res.json({
        success: true,
        data: {
          status: transaction.status,
          credits: transaction.creditsAfter,
          amount: transaction.amount,
          description: transaction.description,
          createdAt: transaction.createdAt,
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get user transaction history
  static async getTransactionHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows } = await Transaction.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
      });

      res.json({
        success: true,
        data: {
          transactions: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Add credits manually (admin only)
  static async addCredits(req: AuthRequest, res: Response) {
    try {
      const { userId, credits, reason } = req.body;
      
      // Check if admin
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const creditsBefore = Number(user.credits) || 0;
      const creditsAfter = creditsBefore + Number(credits);

      await Transaction.create({
        userId,
        type: 'adjustment',
        amount: credits,
        currency: 'TZS',
        status: 'completed',
        paymentMethod: 'system',
        creditsBefore,
        creditsAfter,
        description: reason || 'Admin adjustment',
      });

      user.credits = creditsAfter;
      await user.save();

      // 🔔 Send payment success notification (admin bonus)
      await NotificationService.paymentSuccess(
        userId,
        0,
        credits
      );

      res.json({
        success: true,
        message: `Added ${credits} credits to user`,
        data: { creditsBefore, creditsAfter },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default PaymentController;
