import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/sequelize';

class GroupContact extends Model {
  public groupId!: string;
  public contactId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GroupContact.init(
  {
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id',
      },
    },
    contactId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id',
      },
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
    tableName: 'group_members',
    modelName: 'GroupContact',
    indexes: [
      {
        unique: true,
        fields: ['groupId', 'contactId'],
      },
    ],
  }
);

export default GroupContact;
