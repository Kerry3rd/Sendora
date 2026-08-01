import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface SMSGatewayAttributes {
  id: string;
  name: string;
  provider: string;
  type: 'http' | 'smpp' | 'api';
  priority: number;
  isEnabled: boolean;
  status: 'active' | 'inactive' | 'maintenance';
  config: Record<string, any>;
  credentials: Record<string, any>;
  balance: number;
  currency: string;
  smsCost: number;
  mmsCost: number;
  unicodeCostMultiplier: number;
  region: string;
  supportsDeliveryReports: boolean;
  supportsUnicode: boolean;
  supportsFlash: boolean;
  maxMessageLength: number;
  maxMessagesPerSecond: number;
  lastUsedAt: Date | null;
  lastCheckedAt: Date | null;
  failureCount: number;
  successCount: number;
  totalMessagesSent: number;
  totalCostIncurred: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SMSGatewayCreationAttributes extends Optional<SMSGatewayAttributes, 
  'id' | 'priority' | 'isEnabled' | 'status' | 'config' | 'credentials' | 
  'balance' | 'currency' | 'smsCost' | 'mmsCost' | 'unicodeCostMultiplier' | 
  'region' | 'supportsDeliveryReports' | 'supportsUnicode' | 'supportsFlash' | 
  'maxMessageLength' | 'maxMessagesPerSecond' | 'lastUsedAt' | 'lastCheckedAt' | 
  'failureCount' | 'successCount' | 'totalMessagesSent' | 'totalCostIncurred' | 
  'metadata' | 'createdAt' | 'updatedAt'> {}

class SMSGateway extends Model<SMSGatewayAttributes, SMSGatewayCreationAttributes> implements SMSGatewayAttributes {
  public id!: string;
  public name!: string;
  public provider!: string;
  public type!: 'http' | 'smpp' | 'api';
  public priority!: number;
  public isEnabled!: boolean;
  public status!: 'active' | 'inactive' | 'maintenance';
  public config!: Record<string, any>;
  public credentials!: Record<string, any>;
  public balance!: number;
  public currency!: string;
  public smsCost!: number;
  public mmsCost!: number;
  public unicodeCostMultiplier!: number;
  public region!: string;
  public supportsDeliveryReports!: boolean;
  public supportsUnicode!: boolean;
  public supportsFlash!: boolean;
  public maxMessageLength!: number;
  public maxMessagesPerSecond!: number;
  public lastUsedAt!: Date | null;
  public lastCheckedAt!: Date | null;
  public failureCount!: number;
  public successCount!: number;
  public totalMessagesSent!: number;
  public totalCostIncurred!: number;
  public metadata!: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper methods
  public canSendMessage(messageLength: number, isUnicode: boolean = false): boolean {
    if (!this.isEnabled || this.status !== 'active') {
      return false;
    }

    if (isUnicode && !this.supportsUnicode) {
      return false;
    }

    const effectiveLength = isUnicode ? messageLength * 2 : messageLength;
    return effectiveLength <= this.maxMessageLength;
  }

  public calculateCost(parts: number, isUnicode: boolean = false, isMms: boolean = false): number {
    const baseCost = isMms ? this.mmsCost : this.smsCost;
    const multiplier = isUnicode ? this.unicodeCostMultiplier : 1;
    return parts * baseCost * multiplier;
  }

  public updateBalance(amount: number): void {
    this.balance += amount;
    this.totalCostIncurred += amount;
  }

  public recordSuccess(): void {
    this.successCount += 1;
    this.totalMessagesSent += 1;
    this.lastUsedAt = new Date();
  }

  public recordFailure(): void {
    this.failureCount += 1;
    this.lastUsedAt = new Date();
  }

  public getSuccessRate(): number {
    const totalAttempts = this.successCount + this.failureCount;
    return totalAttempts > 0 ? (this.successCount / totalAttempts) * 100 : 0;
  }
}

SMSGateway.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('http', 'smpp', 'api'),
      defaultValue: 'http',
      allowNull: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
      defaultValue: 'active',
      allowNull: false,
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    credentials: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
    },
    smsCost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0.01,
      allowNull: false,
    },
    mmsCost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0.05,
      allowNull: false,
    },
    unicodeCostMultiplier: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 2.0,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING(50),
      defaultValue: 'global',
      allowNull: false,
    },
    supportsDeliveryReports: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    supportsUnicode: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    supportsFlash: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    maxMessageLength: {
      type: DataTypes.INTEGER,
      defaultValue: 160,
      allowNull: false,
    },
    maxMessagesPerSecond: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    successCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    totalMessagesSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    totalCostIncurred: {
      type: DataTypes.DECIMAL(12, 4),
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
    tableName: 'sms_gateways',
    modelName: 'SMSGateway',
    indexes: [
      {
        fields: ['provider'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['isEnabled'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['region'],
      },
      {
        unique: true,
        fields: ['name'],
      },
    ],
  }
);

export default SMSGateway;
