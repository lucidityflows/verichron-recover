import { CallHandler, ExecutionContext } from '@nestjs/common';
import { RequestContextInterceptor } from './request-context.interceptor';
import { RequestContext } from '../services/request-context.service';
import { of } from 'rxjs';

describe('RequestContextInterceptor', () => {
  let interceptor: RequestContextInterceptor;
  let requestContext: RequestContext;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    requestContext = new RequestContext();
    interceptor = new RequestContextInterceptor(requestContext);

    mockCallHandler = {
      handle: jest.fn(() => of(true)),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should populate RequestContext with user data if authenticated', () => {
    const mockUser = {
      sub: 'user-123',
      username: 'test.user',
      email: 'test@example.com',
      platformRoles: ['PLATFORM_ADMIN'],
    };
    const mockActiveContext = {
      orgId: 'org-456',
      roles: ['ORG_ADMIN'],
      permissions: ['orgs:read'],
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
          activeContext: mockActiveContext,
        }),
      }),
    } as any;

    interceptor.intercept(mockExecutionContext, mockCallHandler);

    expect(requestContext.getUser()).toEqual({
      userId: mockUser.sub,
      username: mockUser.username,
      email: mockUser.email,
      orgId: mockActiveContext.orgId,
      roles: mockActiveContext.roles,
      permissions: mockActiveContext.permissions,
      platformRoles: mockUser.platformRoles,
    });
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should not populate RequestContext if user is not authenticated', () => {
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: undefined,
          activeContext: undefined,
        }),
      }),
    } as any;

    interceptor.intercept(mockExecutionContext, mockCallHandler);

    expect(requestContext.getUser()).toBeUndefined();
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should handle missing activeContext gracefully', () => {
    const mockUser = {
      sub: 'user-123',
      username: 'test.user',
      email: 'test@example.com',
      platformRoles: [],
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
          activeContext: undefined, // Missing activeContext
        }),
      }),
    } as any;

    interceptor.intercept(mockExecutionContext, mockCallHandler);

    expect(requestContext.getUser()).toEqual({
      userId: mockUser.sub,
      username: mockUser.username,
      email: mockUser.email,
      orgId: undefined,
      roles: undefined,
      permissions: undefined,
      platformRoles: mockUser.platformRoles,
    });
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });
});