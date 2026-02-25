import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: JWT_ACCESS_CONFIG.secret,
    signOptions: {
      expiresIn: JWT_ACCESS_CONFIG.expiresIn,
    },
  }),
);

export const JWT_ACCESS_CONFIG = {
  secret: process.env.JWT_ACCESS_SECRET || 'fallback-secret',
  expiresIn: ((process.env.JWT_ACCESS_EXPIRES_IN || 600) as number) * 1000,
};
