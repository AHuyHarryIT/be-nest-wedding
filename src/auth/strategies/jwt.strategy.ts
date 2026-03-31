import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/jwt';
import { JWT_ACCESS_CONFIG } from '../config/jwt.config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          const token =
            (request.cookies?.staff_access_token as string | undefined) ||
            (request.cookies?.access_token as string | undefined);
          return token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_CONFIG.secret,
    });
  }

  validate(payload: JwtPayload): {
    id: string;
    userId: string;
    phoneNumber?: string;
    userType: 'customer' | 'staff';
  } {
    return {
      id: payload.sub,
      userId: payload.sub,
      phoneNumber: payload.phoneNumber,
      userType: payload.userType,
    };
  }
}
