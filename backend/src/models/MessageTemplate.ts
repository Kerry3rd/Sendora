import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface MessageTemplateAttributes {
  id: string;
  userId: string;
  name: string;
  subject: string;
  content: string;
  messageType: 'email' | 'sms' | 'notification';
  tags: string[];
  isDefault: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageTemplateCreationAttributes extends Optional<MessageTemplateAttributes, 
  'id' | 'tags' | 'isDefault' | 'usageCount' | 'lastUsedAt' | 'createdAt' | 'updatedAt' | 'updatedBy'> {}

class MessageTemplate extends Model<MessageTemplateAttributes, MessageTemplateCreationAttributes> {
  public id!: string;
  public userId!: string;
  public name!: string;
  public subject!: string;
  public content!: string;
  public messageType!: 'email' | 'sms' | 'notification';
  public tags!: string[];
  public isDefault!: boolean;
  public usageCount!: number;
  public lastUsedAt!: Date | null;
  public createdBy!: string;
  public updatedBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MessageTemplate.init(
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
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
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
    tableName: 'message_templates',
    indexes: [
      { fields: ['userId'] },
      { fields: ['userId', 'messageType'] },
      { fields: ['isDefault'] },
    ],
  }
);

export default MessageTemplate;