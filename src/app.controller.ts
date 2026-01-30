import { Controller, Get, UseGuards } from '@nestjs/common';
import type { GenericRecord } from './common/types';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { GetUser } from './auth/get-user.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected(
    @GetUser() user: GenericRecord<unknown>,
  ): GenericRecord<unknown> {
    return {
      message: 'This is a protected route',
      user: user,
    };
  }
}
