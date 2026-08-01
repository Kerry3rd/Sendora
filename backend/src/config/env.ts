export const env = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  // Add other env vars here
} as const;

// Type assertion to ensure string
export const JWT_SECRET: string = env.JWT_SECRET;