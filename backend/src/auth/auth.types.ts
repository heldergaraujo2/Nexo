export type UserRole = 'customer' | 'provider' | 'admin' | 'moderator';

export interface AuthPrincipal {
  accountId: string;
  role: UserRole;
}

export interface PublicProfile {
  id: string;
  accountId: string;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  professionalInfo: string | null;
  isProvider: boolean;
  createdAt: string;
}
