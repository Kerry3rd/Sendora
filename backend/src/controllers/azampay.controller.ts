import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { getAzamPayService, initAzamPay } from '../services/payment/azampay.service';
import { getPackage } from '../config/pricing';
import { azampayConfig } from '../config/azampay';

export class AzamPayController {
  // Get supported payment partners
  static async getPaymentPartners(req: Request, res: Response) {
    try {
      const azamPay = getAzamPayService();
      
      if (!azamPay) {
        // Return static list as fallback
        return res.json({
          success: true,
          data: {
            mobile: azampayConfig.mobileProviders,
            bank: azampayConfig.bankProviders
          }
        });
      }

      const result = await azamPay.getPaymentPartners();
      res.json({
        success: true,
        data: result.data || {
          mobile: azampayConfig.mobileProviders,
          bank: azampayConfig.bankProviders
        }
      });
    } catch (error: any) {
      console.error('❌ Get payment partners error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Initiate mobile money payment
  static async initiateMobilePayment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { packageId, phoneNumber, provider } = req.body; // Removed amount, currency from destructuring

      // Log received request with full details
      console.log('📥 AzamPay initiate request - FULL PAYLOAD:', {
        userId,
        packageId,
        phoneNumber,
        provider,
        body: JSON.stringify(req.body, null, 2),
        headers: req.headers
      });

      // Validate each field individually with specific error messages
      const errors = [];

      if (!packageId) {
        errors.push('Package ID is required');
      }

      if (!phoneNumber) {
        errors.push('Phone number is required');
      } else {
        // Format phone number to proper format
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        
        // Validate phone number format (should be 255XXXXXXXXX)
        const phoneRegex = /^255[0-9]{9}$/;
        if (!phoneRegex.test(formattedPhone)) {
          errors.push('Invalid phone number format. Use 255XXXXXXXXX (e.g., 255712345678)');
          console.log('❌ Phone number validation failed:', {
            received: phoneNumber,
            formatted: formattedPhone,
            expected: '255XXXXXXXXX'
          });
        }
      }

      if (!provider) {
        errors.push('Provider is required');
      } else {
        // Validate provider is in allowed list
        const allowedProviders = [
          'Mpesa', 'Tigo', 'Airtel', 'Azampesa', 'Halopesa',
          'CRDB', 'NMB'
        ];
        if (!allowedProviders.includes(provider)) {
          errors.push(`Invalid provider. Must be one of: ${allowedProviders.join(', ')}`);
        }
      }

      // If there are validation errors, return them all
      if (errors.length > 0) {
        console.log('❌ Validation errors:', errors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      const azamPay = getAzamPayService();
      if (!azamPay) {
        console.log('❌ AzamPay service not configured');
        
        // For development/testing, return mock success response
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Using mock AzamPay response for development');
          const pkg = getPackage(packageId);
          
          // Create transaction record
          const transaction = await Transaction.create({
            userId,
            type: 'credit_purchase',
            amount: pkg?.price || 0,
            currency: 'TZS',
            status: 'completed',
            paymentMethod: 'azampay',
            phoneNumber: this.formatPhoneNumber(phoneNumber),
            creditsBefore: 0,
            creditsAfter: pkg?.credits || 0,
            description: `Purchase of ${pkg?.credits} SMS credits via AzamPay (MOCK)`,
            metadata: {
              package: pkg,
              provider,
              mock: true
            }
          });

          // Add credits to user
          const user = await User.findByPk(userId);
          if (user && pkg) {
            user.credits = Number(user.credits) + pkg.credits;
            await user.save();
          }

          return res.json({
            success: true,
            message: 'Payment completed (MOCK MODE)',
            data: {
              transactionId: transaction.id,
              reference: 'MOCK' + Date.now()
            }
          });
        }

        return res.status(500).json({
          success: false,
          message: 'AzamPay service not configured'
        });
      }

      // Get package details
      const pkg = getPackage(packageId);
      if (!pkg) {
        console.log('❌ Invalid package:', packageId);
        return res.status(400).json({
          success: false,
          message: 'Invalid package'
        });
      }

      console.log('✅ Package found:', pkg);

      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        console.log('❌ User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('✅ User found:', user.id);

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        type: 'credit_purchase',
        amount: pkg.price,
        currency: 'TZS',
        status: 'pending',
        paymentMethod: 'azampay',
        phoneNumber: formattedPhone,
        creditsBefore: Number(user.credits) || 0,
        creditsAfter: (Number(user.credits) || 0) + pkg.credits,
        description: `Purchase of ${pkg.credits} SMS credits via AzamPay`,
        metadata: {
          package: pkg,
          provider
        }
      });

      console.log('📝 Transaction created:', transaction.id);

      // Initiate AzamPay payment
      console.log('📤 Calling AzamPay mobileCheckout with:', {
        accountNumber: formattedPhone,
        amount: pkg.price,
        externalId: transaction.id,
        provider
      });

      const result = await azamPay.mobileCheckout({
        accountNumber: formattedPhone,
        amount: pkg.price,
        externalId: transaction.id,
        provider
      });

      console.log('📤 AzamPay response:', JSON.stringify(result, null, 2));

      if (!result.success) {
        await transaction.update({ status: 'failed' });
        return res.status(400).json({
          success: false,
          message: result.message || 'Payment initiation failed',
          errors: result.errors
        });
      }

      // Update transaction with AzamPay reference
      await transaction.update({
        paymentReference: result.transactionId,
        metadata: {
          ...transaction.metadata,
          azamPayResponse: result.data
        }
      });

      res.json({
        success: true,
        message: 'Payment initiated. Check your phone to complete.',
        data: {
          transactionId: transaction.id,
          reference: result.transactionId || result.data?.transactionId
        }
      });

    } catch (error: any) {
      console.error('❌ AzamPay payment error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        message: error.message || 'Payment initiation failed'
      });
    }
  }

  // Helper to format phone number
  private static formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
      return `255${cleaned}`;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `255${cleaned.substring(1)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('255')) {
      return cleaned;
    }
    return cleaned;
  }

  // AzamPay webhook callback
  static async webhook(req: Request, res: Response) {
    try {
      console.log('📲 AzamPay webhook received:', req.body);

      const {
        transactionId,
        transactionstatus,
        reference,
        amount,
        msisdn,
        operator
      } = req.body;

      // Find transaction by ID (stored as externalId)
      const transaction = await Transaction.findOne({
        where: { id: reference } // reference is our externalId
      });

      if (!transaction) {
        console.log(`❌ Transaction not found for reference: ${reference}`);
        return res.status(200).json({ message: 'Transaction not found' });
      }

      console.log(`📝 Found transaction: ${transaction.id}, status: ${transactionstatus}`);

      if (transactionstatus === 'success' || transactionstatus === 'completed') {
        // Update transaction
        await transaction.update({
          status: 'completed',
          paymentReference: transactionId,
          metadata: {
            ...transaction.metadata,
            callback: req.body,
            operator
          }
        });

        // Add credits to user
        const user = await User.findByPk(transaction.userId);
        if (user) {
          const creditsToAdd = transaction.metadata?.package?.credits || 0;
          user.credits = Number(user.credits) + creditsToAdd;
          await user.save();
          console.log(`✅ Added ${creditsToAdd} credits to user ${user.id}`);
        }

        console.log(`✅ AzamPay payment completed: ${transactionId}`);
      } else {
        await transaction.update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            callback: req.body,
            error: `Payment ${transactionstatus}`
          }
        });
        console.log(`❌ AzamPay payment failed: ${transactionstatus}`);
      }

      res.sendStatus(200);

    } catch (error: any) {
      console.error('❌ AzamPay webhook error:', error);
      res.sendStatus(500);
    }
  }
}

export default AzamPayController;