import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsUUID, 
  MinLength, 
  Matches,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '@verichron/enums';

// ==========================================
// REQUEST DTOs
// ==========================================

/**
 * DTO for initial login (Step 1 of two-step auth)
 * Returns ACT cookie + organization list
 */
export class AuthLoginDto {
  @ApiProperty({
    description: 'User\'s email address',
    example: 'admin@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({
    description: 'User\'s password (minimum 8 characters)',
    example: '!Str0ngP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  readonly password!: string;

  @ApiPropertyOptional({
    description: 'Optional device identifier for tracking login sessions',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  })
  @IsString()
  @IsOptional()
  readonly deviceId?: string;
}

/**
 * DTO for requesting scoped token (Step 2 of two-step auth)
 * Requires valid ACT cookie from Step 1
 */
export class AuthTokenRequestDto {
  @ApiProperty({
    description: 'The ID of the organization to authenticate into',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  @IsNotEmpty()
  readonly organizationId!: string;
}

/**
 * DTO for refreshing an access token
 */
export class AuthRefreshDto {
  @ApiProperty({
    description: 'The refresh token obtained from login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  readonly refreshToken!: string;
}

/**
 * DTO for switching organization context
 * Exchanges valid JWT for new ACT, allowing user to select different org
 */
export class AuthSwitchContextDto {
  @ApiProperty({
    description: 'The ID of the new organization to switch to',
    format: 'uuid',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  @IsNotEmpty()
  readonly organizationId!: string;
}

/**
 * DTO for password reset request
 */
export class AuthForgotPasswordDto {
  @ApiProperty({
    description: 'Email address associated with the account',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  readonly email!: string;
}

/**
 * DTO for password reset completion
 */
export class AuthResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  readonly token!: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'N3wP@ssw0rd!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
  readonly newPassword!: string;
}

/**
 * DTO for logout
 */
export class AuthLogoutDto {
  @ApiPropertyOptional({
    description: 'Whether to invalidate all sessions for this user',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly allDevices?: boolean = false;
}

// ==========================================
// RESPONSE DTOs
// ==========================================

/**
 * Nested DTO for organization selection after login
 */
export class OrganizationSelectionDto {
  @ApiProperty({ 
    description: 'The unique identifier of the organization',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true, // Add nullable
  })
  @IsUUID()
  organizationId!: string | null; // Allow null

  @ApiProperty({ 
    description: 'The display name of the organization',
    example: 'Acme Collection Agency',
    nullable: true, // Add nullable
  })
  @IsString()
  organizationName!: string | null; // Allow null

  @ApiProperty({ 
    description: 'The user\'s role ID in this organization',
    format: 'uuid',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  roleId!: string;

  @ApiProperty({ 
    description: 'The user\'s role name in this organization',
    example: 'Organization Admin',
  })
  @IsString()
  roleName!: string;

  @ApiPropertyOptional({
    description: 'Whether this is the user\'s primary organization',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

/**
 * Response DTO for login (Step 1)
 * ACT cookie is set via Set-Cookie header (not in response body)
 */
export class AuthLoginResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the authenticated user',
    format: 'uuid',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  userId!: string;

  @ApiProperty({
    description: 'List of organizations the user can authenticate into',
    type: [OrganizationSelectionDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationSelectionDto)
  organizations!: OrganizationSelectionDto[];

  @ApiProperty({
    description: 'User type for UI routing purposes',
    enum: UserType,
    enumName: 'UserType',
    example: UserType.ORG_USER,
  })
  @IsEnum(UserType)
  userType!: UserType;

  @ApiProperty({
    description: 'User\'s full name',
    example: 'John Doe',
  })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({
    description: 'User\'s email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Timestamp when the ACT expires (typically 5 minutes)',
    example: '2025-10-21T18:45:00.000Z',
  })
  @IsDateString()
  actExpiresAt!: string;
}

/**
 * Response DTO for token request (Step 2)
 * Returns scoped JWT + refresh token, clears ACT cookie
 */
export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'The scoped access token (JWT) for API requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3NzBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDIiLCJ1c2VyVHlwZSI6Ik9SR0FOSVpBVElPTl9VU0VSIiwiaHR0cHM6Ly9kZWJ0bGluay5jb20vY2xhaW1zIjp7Im9yZ2FuaXphdGlvbklkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicGVybWlzc2lvbnMiOlsidXNlcjpyZWFkIiwiZGVidDpyZWFkIl19LCJpYXQiOjE2MzMwMjQ4MDAsImV4cCI6MTYzMzExMTIwMH0...',
  })
  @IsString()
  accessToken!: string;

  @ApiProperty({
    description: 'The refresh token for obtaining a new access token (expires in 7 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3NzBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDIiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYzMzAyNDgwMCwiZXhwIjoxNjMzNjI5NjAwfQ...',
  })
  @IsString()
  refreshToken!: string;

  @ApiProperty({
    description: 'When the access token expires (ISO 8601 timestamp)',
    example: '2025-10-21T18:30:00.000Z',
  })
  @IsDateString()
  expiresAt!: string;

  @ApiProperty({
    description: 'Type of token (always "Bearer")',
    example: 'Bearer',
    default: 'Bearer',
  })
  @IsString()
  tokenType!: string;

  @ApiProperty({
    description: 'The organization ID this token is scoped to',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    description: 'List of permissions granted to the user in this organization',
    example: ['user:read', 'user:create', 'debt:read', 'debt:assign:own'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

/**
 * Response DTO for token refresh
 */
export class AuthRefreshResponseDto {
  @ApiProperty({
    description: 'The new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  accessToken!: string;

  @ApiProperty({
    description: 'The new refresh token (for token rotation)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken!: string;

  @ApiProperty({
    description: 'When the new access token expires',
    example: '2025-10-21T19:00:00.000Z',
  })
  @IsDateString()
  expiresAt!: string;
}

/**
 * Response DTO for context switch (returns new ACT)
 */
export class AuthSwitchContextResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Context switch initiated. Please select organization.',
  })
  message!: string;

  @ApiProperty({
    description: 'List of available organizations (same as login response)',
    type: [OrganizationSelectionDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationSelectionDto)
  organizations!: OrganizationSelectionDto[];

  @ApiProperty({
    description: 'When the new ACT expires',
    example: '2025-10-21T18:50:00.000Z',
  })
  @IsDateString()
  actExpiresAt!: string;
}

/**
 * Response DTO for forgot password
 */
export class AuthForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'If an account exists with this email, a password reset link has been sent.',
  })
  message!: string;
}

/**
 * Response DTO for password reset
 */
export class AuthResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password has been reset successfully. You can now log in with your new password.',
  })
  message!: string;
}

/**
 * Response DTO for logout
 */
export class AuthLogoutResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Successfully logged out.',
  })
  message!: string;
}

// ==========================================
// INTERNAL DTOs (for service layer, not exposed via API)
// ==========================================

/**
 * ACT payload structure
 * Used internally for the Authentication Context Token
 */
export interface ActPayload {
  sub: string; // User ID
  jti: string; // Token ID (for single-use check)
  iat: number;
  exp: number;
}

/**
 * Refresh token payload structure
 */
export interface RefreshTokenPayload {
  sub: string; // User ID
  type: 'refresh';
  iat: number;
  exp: number;
}