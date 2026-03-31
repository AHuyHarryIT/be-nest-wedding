export interface JwtPayload {
  sub: string;
  phoneNumber: string;
  userType: 'customer' | 'staff';
  iat?: number;
  exp?: number;
}
