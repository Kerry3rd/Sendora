import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  COMPLETED = 'completed',
  PAUSED = 'paused'
}

export enum MessageType {
  EMAIL = 'email',
  SMS = 'sms',
  NOTIFICATION = 'notification'
}

export enum RepeatType {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

interface ScheduledMessageAttributes {
  id: string;
  userId: string;
  name: string;
  subject: string;
  content: string;
  messageType: MessageType;
  repeatType: RepeatType;
  repeatDay?: number;
  repeatTime: string;
  startDate: Date;
  endDate?: Date;
  lastSentAt?: Date;
  nextScheduledAt: Date;
  status: MessageStatus;
  targetType: 'all' | 'group' | 'contacts';
  targetIds: string[];
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

class ScheduledMessage extends Model<ScheduledMessageAttributes> {
  public id!: string;
  public userId!: string;
  public name!: string;
  public subject!: string;
  public content!: string;
  public messageType!: MessageType;
  public repeatType!: RepeatType;
  public repeatDay!: number | null;
  public repeatTime!: string;
  public startDate!: Date;
  public endDate!: Date | null;
  public lastSentAt!: Date | null;
  public nextScheduledAt!: Date;
  public status!: MessageStatus;
  public targetType!: 'all' | 'group' | 'contacts';
  public targetIds!: string[];
  public sentCount!: number;
  public failedCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ScheduledMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    messageType: {
      type: DataTypes.ENUM('email', 'sms', 'notification'),
      defaultValue: 'email',
    },
    repeatType: {
      type: DataTypes.ENUM('once', 'daily', 'weekly', 'monthly'),
      defaultValue: 'once',
    },
    repeatDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    repeatTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextScheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'completed', 'paused'),
      defaultValue: 'pending',
    },
    targetType: {
      type: DataTypes.ENUM('all', 'group', 'contacts'),
      allowNull: false,
    },
    targetIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    sentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    failedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'scheduled_messages',
  }
);

export default ScheduledMessage;