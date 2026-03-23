import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { GetUser } from './auth/get-user.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import type { UserContext } from './common/types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'be-nest-wedding',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected(@GetUser() user: UserContext): UserContext {
    return {
      message: 'This is a protected route',
      user: user,
    };
  }
}
