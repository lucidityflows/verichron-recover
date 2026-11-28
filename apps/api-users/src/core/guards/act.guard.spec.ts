import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthContextTokenGuard } from './act.guard';
import { RedisService } from '../../redis/redis.service';

// Create a single mock instance for the AuthGuard's canActivate method
const mockSuperCanActivate = jest.fn();

// Mock the AuthGuard factory to return a simple class with our mock method
// IMPORTANT: AuthGuard is a factory function that returns a class.
// We mock it to return a class with canActivate as a method so super.canActivate() works.
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => {
    return class MockAuthGuard {
      async canActivate(context: any) {
        return mockSuperCanActivate(context);
      }
    };
  }),
}));

// Helper to create a mock ExecutionContext
const createMockContext = (jti: string = 'mock-jti-123', canActivateResult = true): ExecutionContext => {
  const request = {
    user: { jti, sub: 'user-123' }, // Mock user payload with jti
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
};

/**
 * @system-rule R-U-CORE-005
 * @description Unit tests for the AuthContextTokenGuard.
 *
 * ## What This Test Proves:
 * - `AuthContextTokenGuard` correctly allows activation with a valid, unused ACT.
 * - `AuthContextTokenGuard` correctly denies activation if the underlying `AuthGuard` fails.
 * - `AuthContextTokenGuard` correctly denies activation if the ACT has already been used (single-use enforcement).
 *
 * ## What This Test Does NOT Prove:
 * - The internal logic of `ActStrategy` (that's its responsibility, if it existed).
 * - The cryptographic validity of the ACT token (Passport handles this).
 * - Integration with a live Redis instance (RedisService is mocked).
 *
 * ## Mocking Strategy for AuthGuard:
 * `AuthGuard` from `@nestjs/passport` is a factory function that returns a class dynamically.
 * To test classes that extend `AuthGuard('act')`, we mock the entire module at the top level
 * using `jest.mock()`. The mock returns a simple class with a `canActivate` method that
 * calls our test mock function `mockSuperCanActivate`. This allows us to:
 * 1. Control the return value of `super.canActivate()` in each test
 * 2. Verify that the parent guard's logic is properly invoked
 * 3. Test our guard's behavior both when parent succeeds and when it fails
 *
 * Note: We cannot spy on the prototype chain because `AuthGuard` creates classes dynamically.
 * The module-level mock is the cleanest approach for testing NestJS guards that extend AuthGuard.
 */
describe('AuthContextTokenGuard', () => {
  let guard: AuthContextTokenGuard;
  let redisService: RedisService;
  let mockRedisGet: jest.Mock;
  let mockRedisSet: jest.Mock;
  // mockSuperCanActivate is defined globally due to jest.mock hoist

  beforeEach(() => {
    // Manually instantiate the guard with a mocked RedisService
    mockRedisGet = jest.fn();
    mockRedisSet = jest.fn();

    redisService = {
      get: mockRedisGet,
      set: mockRedisSet,
    } as unknown as RedisService;

    guard = new AuthContextTokenGuard(redisService);

    // Reset mocks for each test
    jest.clearAllMocks();
    mockSuperCanActivate.mockClear(); // Clear the global mockSuperCanActivate
  });

  it('should allow activation with a valid, unused ACT', async () => {
    mockSuperCanActivate.mockResolvedValue(true);
    mockRedisGet.mockResolvedValue(null); // ACT is not used

    const context = createMockContext();
    const result = await guard.canActivate(context);

    expect(mockRedisGet).toHaveBeenCalledWith('jti:mock-jti-123');
    expect(result).toBe(true);
  });

  it('should deny activation if the underlying AuthGuard fails', async () => {
    mockSuperCanActivate.mockResolvedValue(false);

    const context = createMockContext();
    const result = await guard.canActivate(context);

    expect(mockRedisGet).not.toHaveBeenCalled(); // Should not check Redis if AuthGuard fails
    expect(result).toBe(false);
  });

  it('should deny activation if the ACT has already been used', async () => {
    mockSuperCanActivate.mockResolvedValue(true);
    mockRedisGet.mockResolvedValue('burned'); // ACT is already used

    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('This authentication context token has already been used.');

    expect(mockRedisGet).toHaveBeenCalledWith('jti:mock-jti-123');
  });
});
