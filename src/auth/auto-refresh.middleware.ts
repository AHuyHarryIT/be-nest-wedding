import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { JWT_ACCESS_CONFIG } from './config/jwt.config';
import { JwtPayload } from './types/jwt';
import { AuthIdentityService } from './auth-identity.service';

@Injectable()
export class AutoRefreshMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private authIdentityService: AuthIdentityService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
      const accessToken = req.cookies?.['access_token'] as string | undefined;

      // Skip auto-refresh for auth endpoints
      if (req.path.includes('/auth/')) {
        return next();
      }

      // If there's a refresh token, validate it and potentially refresh the access token
      if (refreshToken) {
        // Check if access token is missing or about to expire (within 2 minutes)
        let shouldRefresh = !accessToken;

        if (!shouldRefresh && accessToken) {
          try {
            // Decode the access token to check expiry
            const decoded: JwtPayload = this.jwtService.decode(accessToken);
            if (decoded?.exp) {
              const expiresIn = decoded.exp * 1000 - Date.now(); // Convert to ms
              shouldRefresh = expiresIn < JWT_ACCESS_CONFIG.expiresIn;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            // If we can't decode, assume it's invalid and refresh
            shouldRefresh = true;
          }
        }

        if (shouldRefresh) {
          // Validate refresh token and issue new access token
          const user =
            await this.authIdentityService.findByRefreshToken(refreshToken);

          if (
            user &&
            user.isActive &&
            user.refreshTokenExpiry &&
            user.refreshTokenExpiry > new Date()
          ) {
            // Generate new access token
            const newAccessToken = await this.jwtService.signAsync(
              {
                sub: user.id,
                phoneNumber: user.phoneNumber,
                userType: user.userType,
              },
              {
                expiresIn: JWT_ACCESS_CONFIG.expiresIn,
              },
            );

            // Set new access token in cookie (response → browser)
            res.cookie('access_token', newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: JWT_ACCESS_CONFIG.expiresIn,
            });

            // Also inject into the current request so downstream guards see it
            if (!req.cookies) {
              req.cookies = {};
            }
            req.cookies['access_token'] = newAccessToken;

            console.log(
              '[AutoRefresh] Refreshed access token for user',
              user.id,
            );
          } else {
            // Refresh token is invalid or expired — clear cookies so frontend can detect logout
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            res.setHeader('X-Token-Expired', 'true');
            console.log(
              '[AutoRefresh] Refresh token expired or invalid, cleared cookies',
            );
          }
        }
      }
    } catch (error) {
      console.error('[AutoRefresh] Middleware error:', error);
      // Continue anyway - don't block the request
    }

    next();
  }
}
