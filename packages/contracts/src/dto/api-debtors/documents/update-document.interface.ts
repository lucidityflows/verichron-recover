export interface IUpdateDocument {
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  isVerified?: boolean;
  expiresAt?: string;
}
