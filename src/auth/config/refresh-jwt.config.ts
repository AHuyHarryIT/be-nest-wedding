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
  expiresIn: ((process.env.JWT_REFRESH_EXPIRES_IN || 86400) as number) * 1000,
};
