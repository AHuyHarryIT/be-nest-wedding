import type { AuthUserType } from './auth-identity.service';

export interface AuthSessionIdentityLookup {
  userType: AuthUserType;
  userId: string;
  isActive: boolean;
}

export interface AuthSessionRecord {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  identity: AuthSessionIdentityLookup;
}

export interface AuthSessionPrincipal {
  userType: AuthUserType;
  userId: string;
}
