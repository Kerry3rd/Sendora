import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface GroupAttributes {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  contactsCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface GroupCreationAttributes extends Optional<GroupAttributes, 'id' | 'description' | 'contactsCount' | 'tags' | 'createdAt' | 'updatedAt'> {}

class Group extends Model<GroupAttributes, GroupCreationAttributes> implements GroupAttributes {
  public id!: string;
  public name!: string;
  public description!: string | null;
  public userId!: string;
  public contactsCount!: number;
  public tags!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Group.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    contactsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
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
    tableName: 'groups',
    modelName: 'Group',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['userId', 'name'],
      },
    ],
  }
);

export default Group;
