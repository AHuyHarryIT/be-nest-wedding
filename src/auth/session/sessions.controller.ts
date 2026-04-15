import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { GetUser, type AuthenticatedUser } from '@/auth/get-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionItemDto } from './dto/session-item.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Auth Sessions')
@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  private resolveRefreshToken(request: Request): string {
    const refreshToken =
      (request.cookies?.['refresh_token'] as string | undefined) ||
      (request.cookies?.['staff_refresh_token'] as string | undefined);

    if (!refreshToken?.trim()) {
      throw new ForbiddenException('Refresh token not found in cookies');
    }

    return refreshToken;
  }

  @Get()
  @ApiOperation({
    summary: 'List active sessions for current principal identity',
  })
  @ApiOkResponse({ type: SessionItemDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listOwnSessions(
    @GetUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SessionItemDto[]> {
    return this.sessionsService.listActiveSessions(
      {
        userId: user.userId,
        userType: user.userType,
      },
      this.resolveRefreshToken(request),
    );
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke a selected non-current session for current principal',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({
    description:
      'Cannot revoke current session from other-session revoke endpoint',
  })
  @ApiNotFoundResponse({ description: 'Session not found for principal scope' })
  async revokeOwnSession(
    @GetUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.sessionsService.revokeSession(
      {
        userId: user.userId,
        userType: user.userType,
      },
      sessionId,
      this.resolveRefreshToken(request),
    );
  }

  @Get('staff')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('sessions:read')
  @ApiOperation({
    summary: 'List active staff sessions for authenticated staff principal',
  })
  @ApiOkResponse({ type: SessionItemDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listStaffSessions(
    @GetUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SessionItemDto[]> {
    if (user.userType !== 'staff') {
      throw new ForbiddenException('Only staff users can access this resource');
    }

    return this.sessionsService.listActiveSessions(
      {
        userId: user.userId,
        userType: 'staff',
      },
      this.resolveRefreshToken(request),
    );
  }

  @Delete('staff/:sessionId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('sessions:revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Revoke a selected non-current staff session for current staff principal',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({
    description:
      'Cannot revoke current session from other-session revoke endpoint',
  })
  @ApiNotFoundResponse({ description: 'Session not found for staff principal' })
  async revokeStaffSession(
    @GetUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<void> {
    if (user.userType !== 'staff') {
      throw new ForbiddenException('Only staff users can access this resource');
    }

    await this.sessionsService.revokeSession(
      {
        userId: user.userId,
        userType: 'staff',
      },
      sessionId,
      this.resolveRefreshToken(request),
    );
  }
}
