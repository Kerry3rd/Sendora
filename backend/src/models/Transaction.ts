import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface TransactionAttributes {
  id: string;
  userId: string;
  type: 'credit_purchase' | 'sms_charge' | 'refund' | 'bonus' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'mpesa' | 'tigo_pesa' | 'airtel_money' | 'card' | 'bank' | 'system' | 'azampay';
  paymentReference: string | null;
  mpesaReceipt: string | null;  // Added
  phoneNumber: string | null;    // Added
  description: string | null;
  creditsBefore: number;         // ✅ This exists
  creditsAfter: number;          // ✅ This exists
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 
  'id' | 'paymentReference' | 'mpesaReceipt' | 'phoneNumber' | 'description' | 'metadata' | 'createdAt' | 'updatedAt'> {}

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: string;
  public userId!: string;
  public type!: 'credit_purchase' | 'sms_charge' | 'refund' | 'bonus' | 'adjustment';
  public amount!: number;
  public currency!: string;
  public status!: 'pending' | 'completed' | 'failed' | 'cancelled';
  public paymentMethod!: 'mpesa' | 'tigo_pesa' | 'airtel_money' | 'card' | 'bank' | 'system' | 'azampay';
  public paymentReference!: string | null;
  public mpesaReceipt!: string | null;
  public phoneNumber!: string | null;
  public description!: string | null;
  public creditsBefore!: number;
  public creditsAfter!: number;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Transaction.init(
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
    type: {
      type: DataTypes.ENUM('credit_purchase', 'sms_charge', 'refund', 'bonus', 'adjustment'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'TZS',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM('mpesa', 'tigo_pesa', 'airtel_money', 'card', 'bank', 'system', 'azampay'),
      allowNull: false,
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    mpesaReceipt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    creditsBefore: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    creditsAfter: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'transactions',
    modelName: 'Transaction',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['paymentReference'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

export default Transaction;
