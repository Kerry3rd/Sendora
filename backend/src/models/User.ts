import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company: string | null;
  role: 'super_admin' | 'admin' | 'user';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  lastLoginUserAgent: string | null;
  credits: number;
  settings: Record<string, any>;
  isActive: boolean;
  
  // NEW VERIFICATION FIELDS
  username: string | null;
  emailVerificationCode: string | null;
  phoneVerificationCode: string | null;
  tempUserData: Record<string, any> | null;
  
  // NEW SECURITY FIELDS
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  twoFactorBackupCodes: string[] | null;
  tokenVersion: number;
  resetTokenVersion: number;
  lastPasswordChange: Date | null;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  loginHistory: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
    success: boolean;
  }> | null;
  
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'company' | 'isEmailVerified' | 'isPhoneVerified' | 
  'emailVerificationToken' | 'emailVerificationExpires' |
  'passwordResetToken' | 'passwordResetExpires' | 'lastLoginAt' |
  'lastLoginIp' | 'lastLoginUserAgent' | 'credits' | 'settings' | 
  'isActive' | 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 
  'role' | 'credits' | 'phone' | 'createdAt' | 'username' | 
  'emailVerificationCode' | 'phoneVerificationCode' | 'tempUserData' |
  // NEW OPTIONAL FIELDS
  'twoFactorSecret' | 'twoFactorEnabled' | 'twoFactorBackupCodes' |
  'tokenVersion' | 'resetTokenVersion' | 'lastPasswordChange' |
  'failedLoginAttempts' | 'lockUntil' | 'loginHistory'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public phone!: string;
  public company!: string | null;
  public role!: 'super_admin' | 'admin' | 'user';
  public isEmailVerified!: boolean;
  public isPhoneVerified!: boolean;
  public emailVerificationToken!: string | null;
  public emailVerificationExpires!: Date | null;
  public passwordResetToken!: string | null;
  public passwordResetExpires!: Date | null;
  public lastLoginAt!: Date | null;
  public lastLoginIp!: string | null;
  public lastLoginUserAgent!: string | null;
  public credits!: number;
  public settings!: Record<string, any>;
  public isActive!: boolean;
  
  // VERIFICATION FIELDS
  public username!: string | null;
  public emailVerificationCode!: string | null;
  public phoneVerificationCode!: string | null;
  public tempUserData!: Record<string, any> | null;
  
  // SECURITY FIELDS
  public twoFactorSecret!: string | null;
  public twoFactorEnabled!: boolean;
  public twoFactorBackupCodes!: string[] | null;
  public tokenVersion!: number;
  public resetTokenVersion!: number;
  public lastPasswordChange!: Date | null;
  public failedLoginAttempts!: number;
  public lockUntil!: Date | null;
  public loginHistory!: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
    success: boolean;
  }> | null;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to check password
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Instance method to get full name
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Check if account is locked
  public isLocked(): boolean {
    return this.lockUntil ? this.lockUntil > new Date() : false;
  }

  // Increment failed login attempts
  public async incrementFailedAttempts(): Promise<void> {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
    
    // Lock account after 5 failed attempts
    if (this.failedLoginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
    }
    
    await this.save();
  }

  // Reset failed attempts on successful login
  public async resetFailedAttempts(): Promise<void> {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }

  // Add login history entry
  public async addLoginHistory(ip: string, userAgent: string, success: boolean): Promise<void> {
    const history = this.loginHistory || [];
    history.push({
      timestamp: new Date(),
      ip,
      userAgent,
      success
    });
    
    // Keep only last 50 login attempts
    if (history.length > 50) {
      history.shift();
    }
    
    this.loginHistory = history;
    await this.save();
  }

  // Check if 2FA is enabled
  public hasTwoFactorEnabled(): boolean {
    return this.twoFactorEnabled && !!this.twoFactorSecret;
  }

  // Rotate token version (invalidate all tokens)
  public async rotateTokens(): Promise<void> {
    this.tokenVersion = (this.tokenVersion || 0) + 1;
    await this.save();
  }

  // Rotate reset token version
  public async rotateResetTokens(): Promise<void> {
    this.resetTokenVersion = (this.resetTokenVersion || 0) + 1;
    await this.save();
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'user'),
      defaultValue: 'user',
      allowNull: false,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isPhoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.STRING(45), // IPv6 can be up to 45 chars
      allowNull: true,
    },
    lastLoginUserAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    credits: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    
    // VERIFICATION FIELDS
    username: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      validate: {
        len: [3, 20],
        is: /^[a-zA-Z0-9_]+$/i,
      },
    },
    emailVerificationCode: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    phoneVerificationCode: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    tempUserData: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    
    // NEW SECURITY FIELDS
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    twoFactorBackupCodes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    resetTokenVersion: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    lastPasswordChange: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    loginHistory: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    tableName: 'users',
    modelName: 'User',
    indexes: [
      {
        unique: true,
        fields: ['username'],
      },
      {
        fields: ['emailVerificationCode'],
      },
      {
        fields: ['phoneVerificationCode'],
      },
      // NEW INDEXES
      {
        fields: ['twoFactorEnabled'],
      },
      {
        fields: ['tokenVersion'],
      },
      {
        fields: ['lastLoginAt'],
      },
      {
        fields: ['failedLoginAttempts'],
      },
    ],
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
        
        // Initialize security fields
        user.tokenVersion = 1;
        user.resetTokenVersion = 1;
        user.failedLoginAttempts = 0;
        user.twoFactorEnabled = false;
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
          user.lastPasswordChange = new Date();
          user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate tokens on password change
        }
      },
    },
  }
);

export default User;