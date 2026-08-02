import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

export enum MessageLogStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed'
}

interface MessageLogAttributes {
  id: string;
  scheduledMessageId: string;
  contactId: string;
  contactEmail?: string | undefined;
  contactPhone?: string;
  status: MessageLogStatus;
  error?: string;
  sentAt: Date;
  metadata?: any;
  createdAt: Date;
}

class MessageLog extends Model<MessageLogAttributes> {
  public id!: string;
  public scheduledMessageId!: string;
  public contactId!: string;
  public contactEmail!: string | undefined;
  public contactPhone!: string | null;
  public status!: MessageLogStatus;
  public error!: string | null;
  public sentAt!: Date;
  public metadata!: any;
  public readonly createdAt!: Date;
}

MessageLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    scheduledMessageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'message_logs',
  }
);

export default MessageLog;