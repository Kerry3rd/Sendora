import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { Op } from 'sequelize';

// New enum for recurrence types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type MonthDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;
export type MonthOption = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number; // e.g., every 2 weeks, every 3 months
  weekDays?: WeekDay[]; // for weekly recurrence
  monthDay?: MonthDay; // for monthly recurrence
  month?: MonthOption; // for yearly recurrence
  endType: 'never' | 'after' | 'on';
  endAfter?: number; // number of occurrences
  endDate?: Date; // end on specific date
  timezone: string; // e.g., 'Africa/Dar_es_Salaam'
}

export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface CampaignAttributes {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  message: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  scheduledFor: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  estimatedCost: number;
  actualCost: number;
  senderId: string;
  isUnicode: boolean;
  isFlash: boolean;
  variables: string[];
  
  // NEW: Auto-SMS / Recurring Campaign Fields
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  occurrencesCount: number;
  maxOccurrences: number | null;
  parentCampaignId: string | null; // For campaign instances
  
  // NEW: Group / Segment Fields
  targetType: 'all' | 'group' | 'segment' | 'manual';
  groupId: string | null; // Reference to a saved group
  segmentRules: SegmentRule[] | null; // For one-time segmentation
  includedContacts: string[] | null; // Specific contact IDs
  excludedContacts: string[] | null; // Contacts to exclude
  
  // NEW: Birthday Campaign Fields
  isBirthdayCampaign: boolean;
  birthdayField: string | null; // e.g., 'dateOfBirth', 'birthday'
  birthdayMessageTemplate: string | null; // Template with {{age}} variable
  sendOn: 'same_day' | 'day_before' | 'week_before';
  sendTime: string | null; // Time to send (e.g., '09:00')
  
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface CampaignCreationAttributes extends Optional<CampaignAttributes, 
  'id' | 'description' | 'status' | 'scheduledFor' | 'startedAt' | 
  'completedAt' | 'totalRecipients' | 'sentCount' | 'deliveredCount' | 
  'failedCount' | 'estimatedCost' | 'actualCost' | 'isUnicode' | 
  'isFlash' | 'variables' | 'metadata' | 'createdAt' | 'updatedAt' |
  // NEW: Optional fields for creation
  'isRecurring' | 'recurrenceRule' | 'nextRunAt' | 'lastRunAt' | 
  'occurrencesCount' | 'maxOccurrences' | 'parentCampaignId' |
  'targetType' | 'groupId' | 'segmentRules' | 'includedContacts' | 'excludedContacts' |
  'isBirthdayCampaign' | 'birthdayField' | 'birthdayMessageTemplate' | 'sendOn' | 'sendTime'> {}

class Campaign extends Model<CampaignAttributes, CampaignCreationAttributes> implements CampaignAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public description!: string | null;
  public message!: string;
  public status!: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  public scheduledFor!: Date | null;
  public startedAt!: Date | null;
  public completedAt!: Date | null;
  public totalRecipients!: number;
  public sentCount!: number;
  public deliveredCount!: number;
  public failedCount!: number;
  public estimatedCost!: number;
  public actualCost!: number;
  public senderId!: string;
  public isUnicode!: boolean;
  public isFlash!: boolean;
  public variables!: string[];
  
  // NEW: Auto-SMS / Recurring Campaign Fields
  public isRecurring!: boolean;
  public recurrenceRule!: RecurrenceRule | null;
  public nextRunAt!: Date | null;
  public lastRunAt!: Date | null;
  public occurrencesCount!: number;
  public maxOccurrences!: number | null;
  public parentCampaignId!: string | null;
  
  // NEW: Group / Segment Fields
  public targetType!: 'all' | 'group' | 'segment' | 'manual';
  public groupId!: string | null;
  public segmentRules!: SegmentRule[] | null;
  public includedContacts!: string[] | null;
  public excludedContacts!: string[] | null;
  
  // NEW: Birthday Campaign Fields
  public isBirthdayCampaign!: boolean;
  public birthdayField!: string | null;
  public birthdayMessageTemplate!: string | null;
  public sendOn!: 'same_day' | 'day_before' | 'week_before';
  public sendTime!: string | null;
  
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to calculate next run date based on recurrence rule
  public calculateNextRunDate(fromDate: Date = new Date()): Date | null {
    if (!this.isRecurring || !this.recurrenceRule) return null;
    
    const rule = this.recurrenceRule;
    const nextDate = new Date(fromDate);
    
    switch (rule.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + rule.interval);
        break;
        
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (rule.interval * 7));
        // TODO: Adjust to specific day of week if needed
        break;
        
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + rule.interval);
        if (rule.monthDay) {
          nextDate.setDate(rule.monthDay);
        }
        break;
        
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + rule.interval);
        break;
        
      default:
        return null;
    }
    
    // Check if we've reached the end conditions
    if (rule.endType === 'after' && rule.endAfter && this.occurrencesCount >= rule.endAfter) {
      return null;
    }
    
    if (rule.endType === 'on' && rule.endDate && nextDate > rule.endDate) {
      return null;
    }
    
    return nextDate;
  }

  // Helper to get recipient count based on targeting rules
  public async getRecipientCount(models: any): Promise<number> {
    const { Contact, Group } = models;
    
    switch (this.targetType) {
      case 'all':
        return await Contact.count({ where: { userId: this.userId, isSubscribed: true } });
        
      case 'group':
        if (!this.groupId) return 0;
        // Assuming you have a Group model with many-to-many relationship
        const group = await Group.findByPk(this.groupId, {
          include: [{ model: Contact, as: 'contacts' }]
        });
        return group?.contacts?.length || 0;
        
      case 'segment':
        // Build query from segment rules
        const where: any = { userId: this.userId, isSubscribed: true };
        if (this.segmentRules) {
          this.segmentRules.forEach(rule => {
            switch (rule.operator) {
              case 'eq':
                where[rule.field] = rule.value;
                break;
              case 'gt':
                where[rule.field] = { [Op.gt]: rule.value };
                break;
              // Add more operators as needed
            }
          });
        }
        return await Contact.count({ where });
        
      case 'manual':
        return this.includedContacts?.length || 0;
        
      default:
        return 0;
    }
  }

  // Helper to check if this is a birthday campaign
  public isBirthdayRelevant(today: Date = new Date()): boolean {
    if (!this.isBirthdayCampaign || !this.birthdayField) return false;
    
    // This will be used by the scheduler to find whose birthday it is today
    // The actual query will be handled by the birthday scheduler
    return true;
  }
}

Campaign.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'),
      defaultValue: 'draft',
      allowNull: false,
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalRecipients: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    sentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    deliveredCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    failedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      allowNull: false,
    },
    actualCost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    isUnicode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isFlash: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    variables: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false,
    },
    
    // NEW: Auto-SMS / Recurring Campaign Fields
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    recurrenceRule: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    occurrencesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    maxOccurrences: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    parentCampaignId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'campaigns',
        key: 'id',
      },
    },
    
    // NEW: Group / Segment Fields
    targetType: {
      type: DataTypes.ENUM('all', 'group', 'segment', 'manual'),
      defaultValue: 'all',
      allowNull: false,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'groups', // You'll need to create a Group model
        key: 'id',
      },
    },
    segmentRules: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    includedContacts: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
    },
    excludedContacts: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
    },
    
    // NEW: Birthday Campaign Fields
    isBirthdayCampaign: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    birthdayField: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    birthdayMessageTemplate: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sendOn: {
      type: DataTypes.ENUM('same_day', 'day_before', 'week_before'),
      defaultValue: 'same_day',
      allowNull: false,
    },
    sendTime: {
      type: DataTypes.STRING(5), // Format: "09:00"
      allowNull: true,
    },
    
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'campaigns',
    modelName: 'Campaign',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['scheduledFor'],
      },
      {
        fields: ['createdAt'],
      },
      // NEW INDEXES
      {
        fields: ['isRecurring', 'nextRunAt'],
      },
      {
        fields: ['isBirthdayCampaign'],
      },
      {
        fields: ['parentCampaignId'],
      },
      {
        fields: ['groupId'],
      },
    ],
  }
);

export default Campaign;
