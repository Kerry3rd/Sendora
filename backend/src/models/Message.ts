import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface MessageAttributes {
  id: string;
  userId: string;
  campaignId: string | null;
  contactId: string | null;
  phoneNumber: string;
  message: string;
  senderId: string;
  status: 'pending' | 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  gateway: string | null;
  gatewayMessageId: string | null;
  gatewayResponse: Record<string, any> | null;
  parts: number;
  cost: number;
  isUnicode: boolean;
  isFlash: boolean;
  scheduledFor: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  error: string | null;
  retryCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 
  'id' | 'campaignId' | 'contactId' | 'gateway' | 'gatewayMessageId' | 
  'gatewayResponse' | 'parts' | 'cost' | 'isUnicode' | 'isFlash' | 
  'scheduledFor' | 'sentAt' | 'deliveredAt' | 'error' | 'retryCount' | 
  'metadata' | 'createdAt' | 'updatedAt'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: string;
  public userId!: string;
  public campaignId!: string | null;
  public contactId!: string | null;
  public phoneNumber!: string;
  public message!: string;
  public senderId!: string;
  public status!: 'pending' | 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  public gateway!: string | null;
  public gatewayMessageId!: string | null;
  public gatewayResponse!: Record<string, any> | null;
  public parts!: number;
  public cost!: number;
  public isUnicode!: boolean;
  public isFlash!: boolean;
  public scheduledFor!: Date | null;
  public sentAt!: Date | null;
  public deliveredAt!: Date | null;
  public error!: string | null;
  public retryCount!: number;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
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
    campaignId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'campaigns',
        key: 'id',
      },
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'contacts',
        key: 'id',
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'queued', 'processing', 'sent', 'delivered', 'failed', 'undelivered'),
      defaultValue: 'pending',
      allowNull: false,
    },
    gateway: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    gatewayMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    gatewayResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    parts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
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
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
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
    tableName: 'messages',
    modelName: 'Message',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['campaignId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['phoneNumber'],
      },
      {
        fields: ['gateway'],
      },
      {
        fields: ['createdAt'],
      },
      {
        fields: ['sentAt'],
      },
      {
        fields: ['gatewayMessageId'],
      },
      {
        fields: ['userId', 'status'],
      },
      {
        fields: ['userId', 'createdAt'],
      },
    ],
  }
);

export default Message;
