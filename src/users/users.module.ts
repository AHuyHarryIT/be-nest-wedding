import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthIdentityService } from '@/auth/auth-identity.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, AuthIdentityService],
  exports: [UsersService, AuthIdentityService],
})
export class UsersModule {}
