import  User  from '../models/User';

// Define what we actually store in the JWT token
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  // Only include what's needed for auth
}

// Define what we attach to req.user
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  credits?: number;
  createdAt?: Date;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}