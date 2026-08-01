import { body, param, query, validationResult } from 'express-validator';
import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Keep your existing express-validator validate function
export const validate = (validations: any[]) => {
  return async (req: any, res: any, next: any) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

// Fixed: Use ZodObject type from the 'z' namespace
export const validateWithZod = (schema: z.ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body, query, and params against schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // FIXED: In Zod v4, use 'issues' instead of 'errors'
        const formattedErrors = error.issues.map((err) => ({
          type: 'field',
          msg: err.message,
          path: err.path.join('.'),
          location: err.path[0] || 'body'
        }));

        return res.status(400).json({
          success: false,
          errors: formattedErrors
        });
      }
      next(error);
    }
  };
};

// Zod schemas for runtime validation
// Phone number validation (Tanzanian format)
export const phoneSchema = z.string().regex(/^(?:\+255|0)[67][0-9]{8}$/, {
  message: 'Invalid Tanzanian phone number. Use format: 0712345678 or +255712345678'
});

// Contact validation schema
export const contactZodSchema = z.object({
  phoneNumber: phoneSchema,
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional()
});

// Campaign validation schema
export const campaignZodSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Campaign name must be at least 3 characters').max(100),
    description: z.string().max(500).optional().nullable(),
    message: z.string().min(1, 'Message is required').max(1000),
    senderId: z.string().min(3, 'Sender ID must be at least 3 characters').max(11),
    isUnicode: z.boolean().default(false),
    isFlash: z.boolean().default(false),
    scheduledFor: z.string().datetime().optional().nullable(),
    targetType: z.enum(['all', 'group', 'manual']).default('manual'),
    groupId: z.string().uuid().optional().nullable(),
    contacts: z.array(z.object({
      phoneNumber: phoneSchema,
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().nullable()
    })).optional()
  })
});

// Payment validation schema
export const paymentZodSchema = z.object({
  body: z.object({
    packageId: z.enum(['basic', 'popular', 'business', 'enterprise']),
    phoneNumber: phoneSchema,
    provider: z.enum(['Mpesa', 'Tigo', 'Airtel', 'Azampesa', 'Halopesa', 'CRDB', 'NMB'])
  })
});

// User validation schema
export const userZodSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, 
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: phoneSchema,
    company: z.string().optional()
  })
});

// Keep ALL your existing express-validator validations below
// Auth validations
export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('phone').notEmpty().trim().withMessage('Phone number is required'),
  body('company').optional().trim(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Campaign validations (your existing ones)
export const campaignValidation = [
  body('name').notEmpty().trim().withMessage('Campaign name is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('senderId').notEmpty().trim().withMessage('Sender ID is required'),
  body('scheduledFor').optional().isISO8601().withMessage('Invalid date format'),
  body('isUnicode').optional().isBoolean(),
  body('isFlash').optional().isBoolean(),
];

// Contact validations (your existing ones)
export const contactValidation = [
  body('phoneNumber').notEmpty().trim().withMessage('Phone number is required'),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('tags').optional().isArray(),
  body('customFields').optional().isObject(),
];

// Group validations (new)
export const groupValidation = [
  body('name').notEmpty().trim().withMessage('Group name is required'),
  body('description').optional().trim(),
  body('tags').optional().isArray(),
  body('contactIds').optional().isArray(),
];

// SMS validations (new)
export const smsValidation = [
  body('phoneNumber').notEmpty().trim().withMessage('Phone number is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('senderId').notEmpty().trim().withMessage('Sender ID is required'),
  body('isUnicode').optional().isBoolean(),
  body('isFlash').optional().isBoolean(),
];

export const bulkSmsValidation = [
  body('contacts').isArray().withMessage('Contacts must be an array'),
  body('contacts.*.phoneNumber').notEmpty().trim().withMessage('Phone number is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('senderId').notEmpty().trim().withMessage('Sender ID is required'),
  body('scheduleFor').optional().isISO8601().withMessage('Invalid date format'),
];

// Payment validations (new)
export const paymentValidation = [
  body('packageId').notEmpty().withMessage('Package ID is required'),
  body('phoneNumber').notEmpty().trim().withMessage('Phone number is required'),
  body('provider').notEmpty().withMessage('Provider is required'),
];

// ID param validation
export const idParamValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

// Pagination validation
export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('status').optional().trim(),
];