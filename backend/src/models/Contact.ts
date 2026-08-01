import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { Op } from 'sequelize';
import GroupMembership from './GroupMembership';
import Group from './Group';

export interface ContactAttributes {
  id: string;
  userId: string;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  tags: string[];
  customFields: Record<string, any>; // This stores all custom fields like dateOfBirth, age, location, etc.
  isSubscribed: boolean;
  isBlacklisted: boolean;
  lastContacted: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactCreationAttributes extends Optional<ContactAttributes, 
  'id' | 'firstName' | 'lastName' | 'email' | 'company' | 'tags' | 
  'customFields' | 'isSubscribed' | 'isBlacklisted' | 'lastContacted' | 
  'metadata' | 'createdAt' | 'updatedAt'> {}

class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
  public id!: string;
  public userId!: string;
  public phoneNumber!: string;
  public firstName!: string | null;
  public lastName!: string | null;
  public email!: string | null;
  public company!: string | null;
  public tags!: string[];
  public customFields!: Record<string, any>;
  public isSubscribed!: boolean;
  public isBlacklisted!: boolean;
  public lastContacted!: Date | null;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to get age from date of birth
  public getAge(): number | null {
    const dob = this.customFields?.dateOfBirth || this.customFields?.dob || this.customFields?.birthday;
    if (!dob) return null;
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Helper to check if today is contact's birthday
  public isBirthday(today: Date = new Date()): boolean {
    const dob = this.customFields?.dateOfBirth || this.customFields?.dob || this.customFields?.birthday;
    if (!dob) return false;
    
    const birthDate = new Date(dob);
    return birthDate.getDate() === today.getDate() && 
           birthDate.getMonth() === today.getMonth();
  }

  // Helper to get all custom field names
  public static getCustomFieldNames(): string[] {
    // This would ideally be stored in user settings
    return [
      'dateOfBirth', 'dob', 'birthday', 'age', 'gender', 
      'location', 'city', 'country', 'occupation', 'income',
      'education', 'maritalStatus', 'anniversary'
    ];
  }
}

Contact.init(
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
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false,
    },
    customFields: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    isSubscribed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    isBlacklisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    lastContacted: {
      type: DataTypes.DATE,
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
    tableName: 'contacts',
    modelName: 'Contact',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'phoneNumber'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['tags'],
      },
      {
        fields: ['isSubscribed'],
      },
      {
        fields: ['isBlacklisted'],
      },
      // Add GIN index for JSONB queries (for customFields)
      {
        fields: ['customFields'],
        using: 'gin',
      },
    ],
  }
);

Contact.belongsToMany(Group, {
  through: GroupMembership,
  foreignKey: 'contactId',
  otherKey: 'groupId',
  as: 'groups',
});

export default Contact;
