/**
 * Canonical Authentication and User Domain Types
 */

export type UserRole = 'customer' | 'admin' | 'super_admin' | 'moderator' | 'vendor';

export interface UserAddress {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  street: string;
  address?: string;
  locality?: string;
  landmark?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  type?: 'home' | 'work' | 'other';
}

export interface UserWallet {
  balance: number;
  holdBalance?: number;
  currency?: string;
}

export interface User {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  avatar?: string;
  addresses?: UserAddress[];
  wallet?: UserWallet;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface SessionMarker {
  hasSession: boolean;
  expiresAt?: number;
  userId?: string;
}

export interface AuthCredentials {
  email?: string;
  phone?: string;
  password?: string;
  otp?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}
