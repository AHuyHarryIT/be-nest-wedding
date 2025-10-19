import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  ChangePasswordDto,
  LoginDto,
  MessageResponseDto,
  RegisterDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { GetUser, type AuthenticatedUser } from './get-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered with tokens set in cookies',
    type: AuthResponseDto,
  })
  @ApiConflictResponse({
    description: 'User with this phone number or email already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);

    // Set cookies
    this.setCookies(
      response,
      (result as any).accessToken,
      (result as any).refreshToken,
    );

    // Return response without tokens in body
    return {
      message: result.message,
      user: result.user,
    } as AuthResponseDto;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login with phone number and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in with tokens set in cookies',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive account',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);

    // Set cookies
    this.setCookies(
      response,
      (result as any).accessToken,
      (result as any).refreshToken,
    );

    // Return response without tokens in body
    return {
      message: result.message,
      user: result.user,
    } as AuthResponseDto;
  }

  private setCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    // Set access token cookie (shorter expiration)
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (longer expiration)
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile information' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getProfile(@GetUser() user: AuthenticatedUser) {
    return this.authService.validateUser(user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile information' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  @ApiConflictResponse({
    description: 'Email already exists for another user',
  })
  async updateProfile(
    @GetUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, updateProfileDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token, or incorrect current password',
  })
  async changePassword(
    @GetUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(user.userId, changePasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT tokens using cookie' })
  @ApiResponse({
    status: 200,
    description: 'New tokens generated and set in cookies',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Tokens refreshed successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = request.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new Error('Refresh token not found in cookies');
    }

    const tokens = await this.authService.refreshTokens({
      refresh_token: refreshToken,
    });

    // Set new cookies
    this.setCookies(response, tokens.accessToken, tokens.refreshToken);

    return { message: 'Tokens refreshed successfully' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout and clear cookies' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out and cookies cleared',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async logout(
    @GetUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponseDto> {
    // Clear cookies
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');

    // Invalidate refresh token in database
    return this.authService.logout(user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user information (alternative endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getCurrentUser(@GetUser() user: AuthenticatedUser) {
    return this.authService.validateUser(user.userId);
  }
}
