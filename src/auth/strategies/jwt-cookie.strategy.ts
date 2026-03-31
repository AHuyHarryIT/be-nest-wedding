import { AuthIdentityService } from '@/auth/auth-identity.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_ACCESS_CONFIG } from '../config/jwt.config';
import { JwtPayload } from '../types/jwt';

export interface AuthenticatedUser {
  userId: string;
  phoneNumber: string;
  userType: 'customer' | 'staff';
}

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(
  Strategy,
  'jwt-cookie',
) {
  constructor(private authIdentityService: AuthIdentityService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Try to get token from cookies first (supports customer and staff cookie names)
          let token: string | null = null;
          if (request && request.cookies) {
            token =
              (request.cookies['staff_access_token'] as string) ||
              (request.cookies['access_token'] as string) ||
              null;
          }

          // If no token in cookies, fall back to Authorization header
          if (!token) {
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              token = authHeader.substring(7);
            }
          }

          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_CONFIG.secret,
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<AuthenticatedUser & { id?: string }> {
    const user = await this.authIdentityService.findById(
      payload.userType,
      payload.sub,
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      phoneNumber: payload.phoneNumber,
      userType: payload.userType,
    };
  }
}
