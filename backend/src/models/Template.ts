import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface TemplateAttributes {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  message: string;
  category: 'general' | 'marketing' | 'transactional' | 'notification' | 'birthday' | 'custom';
  tags: string[];
  variables: string[];
  isPublic: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateCreationAttributes extends Optional<TemplateAttributes, 
  'id' | 'description' | 'tags' | 'variables' | 'isPublic' | 'usageCount' | 'lastUsedAt' | 'metadata' | 'createdAt' | 'updatedAt'> {}

class Template extends Model<TemplateAttributes, TemplateCreationAttributes> implements TemplateAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public description!: string | null;
  public message!: string;
  public category!: 'general' | 'marketing' | 'transactional' | 'notification' | 'birthday' | 'custom';
  public tags!: string[];
  public variables!: string[];
  public isPublic!: boolean;
  public usageCount!: number;
  public lastUsedAt!: Date | null;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Increment usage count
  public async incrementUsage(): Promise<void> {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
  }
}

Template.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('general', 'marketing', 'transactional', 'notification', 'birthday', 'custom'),
      defaultValue: 'general',
      allowNull: false,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    variables: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    isPublic: {
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
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
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
    tableName: 'templates',
    modelName: 'Template',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['isPublic'],
      },
      {
        fields: ['usageCount'],
      },
    ],
  }
);

export default Template;