import { registerAs } from '@nestjs/config';
import { JwtSignOptions } from '@nestjs/jwt';

export default registerAs(
  'refresh-jwt',
  (): JwtSignOptions => ({
    secret: REFRESH_JWT_CONFIG.secret,
    expiresIn: REFRESH_JWT_CONFIG.expiresIn,
  }),
);

export const REFRESH_JWT_CONFIG = {
  secret: process.env.JWT_REFRESH_SECRET,
  // Default to 7 days (604800 seconds) to match cookie maxAge
  expiresIn: ((process.env.JWT_REFRESH_EXPIRES_IN || 604800) as number) * 1000,
};
