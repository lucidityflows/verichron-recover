import { Controller, Post, Body, Res, Req, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  AuthLoginDto,
  AuthTokenDto,
  AuthOrganizationListResponseDto,
  AuthTokenResponseDto,
  AuthForgotPasswordDto,
  AuthResetPasswordDto,
  AuthForgotPasswordResponseDto,
  AuthResetPasswordResponseDto,
} from './dto';
import { AuthContextTokenGuard } from '../core';
import { JwtAuthGuard, Public } from '@verichron/auth';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TokenIssuanceMethod } from '@verichron/enums';

@ApiTags('Auth')
@Controller('public/users/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Step 1 of Login: Authenticate and get organization list' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful, returns organization list.',
    type: AuthOrganizationListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body() authLoginDto: AuthLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const { act, organizations } = await this.authService.login(authLoginDto, metadata);

    res.cookie('act', act, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5 minutes
    });

    return organizations;
  }

  @Public()
  @UseGuards(AuthContextTokenGuard)
  @Post('token')
  @ApiOperation({ summary: 'Step 2 of Login: Exchange ACT for a scoped JWT' })
  @ApiResponse({
    status: 201,
    description: 'JWTs created successfully.',
    type: AuthTokenResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Invalid or expired Authentication Context Token.' })
  async getToken(
    @Req() req: Request,
    @Body() authTokenDto: AuthTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any; // Payload from ActStrategy
    // organizationId is optional in DTO; undefined means platform admin (no org)
    const organizationId = authTokenDto.organizationId ?? null;

    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Check if this is a context switch by looking for fromOrganizationId in body
    // This will be set by the frontend when switching context
    const fromOrganizationId = authTokenDto.fromOrganizationId;
    const issuanceMethod = fromOrganizationId ? TokenIssuanceMethod.CONTEXT_SWITCH : TokenIssuanceMethod.LOGIN;

    const tokens = await this.authService.getScopedToken(
      user.sub,
      organizationId,
      user.jti,
      issuanceMethod,
      metadata,
      fromOrganizationId,
    );

    res.clearCookie('act');

    return tokens;
  }

  @UseGuards(JwtAuthGuard) // Protected by the main JWT guard
  @Post('switch-context')
  @ApiOperation({ summary: 'Get a new ACT to switch organization context' })
  @ApiResponse({
    status: 200,
    description: 'New context selection initiated.',
    type: AuthOrganizationListResponseDto,
  })
  async switchContext(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as any;
    // This flow re-uses the login logic, but for an already authenticated user.
    // It generates a new ACT and returns the org list, allowing the client to call /token again.
    const { act, organizations } = await this.authService.reissueAct(user.sub); // Assumes a new method `reissueAct` in AuthService

    res.cookie('act', act, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5 minutes
    });

    return organizations;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an access token' })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({
    status: 201,
    description: 'New access token generated.',
    type: AuthTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refreshToken(@Body('refreshToken') refreshToken: string, @Req() req: Request) {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    return this.authService.refreshToken(refreshToken, metadata);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if account exists.',
    type: AuthForgotPasswordResponseDto,
  })
  async forgotPassword(
    @Body() dto: AuthForgotPasswordDto,
    @Req() req: Request,
  ): Promise<AuthForgotPasswordResponseDto> {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await this.authService.requestPasswordReset(dto.email, metadata);

    // Always return success to prevent email enumeration
    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
    type: AuthResetPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token.' })
  async resetPassword(
    @Body() dto: AuthResetPasswordDto,
  ): Promise<AuthResetPasswordResponseDto> {
    await this.authService.resetPassword(dto.token, dto.newPassword);

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}