import { UsersService } from '@/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_ACCESS_CONFIG } from '../config/jwt.config';
import { JwtPayload } from '../types/jwt';

export interface AuthenticatedUser {
  userId: string;
  phoneNumber: string;
}

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(
  Strategy,
  'jwt-cookie',
) {
  constructor(private userService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Try to get token from cookies first
          let token: string | null = null;
          if (request && request.cookies) {
            token = (request.cookies['access_token'] as string) || null;
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

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      userId: payload.sub,
      phoneNumber: payload.phoneNumber,
    };
  }
}
