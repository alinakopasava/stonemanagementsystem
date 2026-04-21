export type UserRole = 'klient' | 'monter' | 'admin';

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string | null;
  profile: UserProfile;
}
