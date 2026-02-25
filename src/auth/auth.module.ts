import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_ACCESS_CONFIG } from './config/jwt.config';
import { JwtCookieStrategy } from './strategies/jwt-cookie.strategy';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        secret: JWT_ACCESS_CONFIG.secret,
        signOptions: {
          expiresIn: JWT_ACCESS_CONFIG.expiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtCookieStrategy],
  exports: [AuthService],
})
export class AuthModule {}
