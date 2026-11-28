import * as http from 'http';
import * as https from 'https';
import { logger } from './e2e-logger';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: T;
  raw: string;
}

/**
 * Represents a single HTTP cookie
 */
class Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';

  constructor(name: string, value: string, attributes: Record<string, string> = {}) {
    this.name = name;
    this.value = value;

    if (attributes['Domain']) this.domain = attributes['Domain'];
    if (attributes['Path']) this.path = attributes['Path'];
    if (attributes['Expires']) this.expires = new Date(attributes['Expires']);
    if (attributes['Max-Age']) this.maxAge = parseInt(attributes['Max-Age'], 10);
    if (attributes['HttpOnly'] !== undefined) this.httpOnly = true;
    if (attributes['Secure'] !== undefined) this.secure = true;
    if (attributes['SameSite']) this.sameSite = attributes['SameSite'] as any;
  }

  isExpired(): boolean {
    if (this.expires && this.expires < new Date()) {
      return true;
    }
    return false;
  }

  matches(url: URL): boolean {
    if (this.domain) {
      const domain = this.domain.startsWith('.') ? this.domain.slice(1) : this.domain;
      if (!url.hostname.endsWith(domain)) {
        return false;
      }
    }
    if (this.path && !url.pathname.startsWith(this.path)) {
      return false;
    }
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (this.secure && url.protocol !== 'https:' && !isLocalhost) {
      return false;
    }
    return true;
  }

  toString(): string {
    return `${this.name}=${this.value}`;
  }
}

/**
 * Simple cookie jar to store and manage cookies
 */
export class CookieJar {
  private cookies: Map<string, Cookie> = new Map();

  setCookie(setCookieHeader: string, url: URL): void {
    const parts = setCookieHeader.split(';').map(p => p.trim());
    const [nameValue] = parts;
    const [name, value] = nameValue.split('=');
    if (!name || value === undefined) return;

    const attributes: Record<string, string> = {};
    for (let i = 1; i < parts.length; i++) {
      const [attrName, attrValue] = parts[i].split('=');
      attributes[attrName.trim()] = attrValue ? attrValue.trim() : '';
    }

    const domain = attributes['Domain'] || url.hostname;
    const path = attributes['Path'] || '/';
    const key = `${domain}:${path}:${name}`;
    const cookie = new Cookie(name, value, attributes);
    this.cookies.set(key, cookie);
  }

  getCookies(url: URL): Cookie[] {
    const matchingCookies: Cookie[] = [];
    for (const cookie of this.cookies.values()) {
      if (!cookie.isExpired() && cookie.matches(url)) {
        matchingCookies.push(cookie);
      }
    }
    return matchingCookies;
  }

  getCookieHeader(url: URL): string {
    const cookies = this.getCookies(url);
    if (cookies.length === 0) return '';
    return cookies.map(c => c.toString()).join('; ');
  }

  clear(): void {
    this.cookies.clear();
  }

  getAllCookies(): Cookie[] {
    return Array.from(this.cookies.values());
  }
}

export class ApiClientHelper {
  public cookieJar: CookieJar;

  constructor(protected baseUrl: string, cookieJar?: CookieJar) {
    this.cookieJar = cookieJar || new CookieJar();
  }

  public getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  protected async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = 30000,
    } = options;

    let finalPath = path;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, value.toString());
        }
      });
      const queryString = query.toString();
      if (queryString) {
        finalPath += (finalPath.includes('?') ? '&' : '?') + queryString;
      }
    }

    const url = new URL(finalPath, this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const cookieHeader = this.cookieJar.getCookieHeader(url);
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (cookieHeader) {
        requestHeaders['Cookie'] = cookieHeader;
      }

      const requestOptions: http.RequestOptions = {
        method,
        headers: requestHeaders,
        timeout,
      };

      const req = client.request(url, requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const setCookieHeaders = res.headers['set-cookie'];
          if (setCookieHeaders) {
            for (const setCookie of setCookieHeaders) {
              this.cookieJar.setCookie(setCookie, url);
            }
          }

          const responseHeaders: Record<string, string> = {};
          Object.entries(res.headers).forEach(([key, value]) => {
            if (value) {
              responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
            }
          });

          let parsedBody: any;
          try {
            parsedBody = data ? JSON.parse(data) : null;
          } catch {
            parsedBody = data;
          }

          if (res.statusCode && res.statusCode >= 400) {
            logger.expectedError(`❌ API Error: ${method} ${url.href} returned ${res.statusCode}`);
            logger.expectedError(`📦 Error Body: ${JSON.stringify(parsedBody, null, 2)}`);
          }

          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: responseHeaders,
            body: parsedBody,
            raw: data,
          });
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });

      if (body) {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(bodyString);
      }
      req.end();
    });
  }

  async get<T = any>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T = any>(path: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async patch<T = any>(path: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async put<T = any>(path: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async delete<T = any>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  withAuth(token: string): this {
    const proxy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    const originalRequest = proxy.request.bind(proxy);
    proxy.request = async function (path: string, options: ApiRequestOptions = {}) {
      return originalRequest(path, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      });
    };
    return proxy;
  }

  withHeaders(headers: Record<string, string>): this {
    const proxy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    const originalRequest = proxy.request.bind(proxy);
    proxy.request = async function (path: string, options: ApiRequestOptions = {}) {
      return originalRequest(path, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });
    };
    return proxy;
  }

  clearCookies(): void {
    this.cookieJar.clear();
  }
}

/**
 * Service-specific API clients
 */
export class ApiUsersClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_USERS_URL || process.env.API_USERS_URL || 'http://localhost:3001') {
    super(baseUrl);
  }

  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async getToken(organizationId: string | null | undefined, actToken?: string, fromOrganizationId?: string) {
    const body: any = {};
    if (organizationId !== null && organizationId !== undefined) {
      body.organizationId = organizationId;
    }
    if (actToken) body.actToken = actToken;
    if (fromOrganizationId) body.fromOrganizationId = fromOrganizationId;
    return this.post('/auth/token', body);
  }

  async refreshToken(refreshToken: string) {
    return this.post('/auth/refresh', { refreshToken });
  }

  async switchContext(token: string) {
    return this.withAuth(token).post('/auth/switch-context');
  }

  async getUsers(token: string, organizationId?: string, query?: any) {
    const path = organizationId ? `/organizations/${organizationId}/users` : '/ops/users';
    return this.withAuth(token).get(path, { params: query });
  }

  async createUser(token: string, userData: any) {
    // Note: Creating a user at the top level is deprecated, users should be created via invitations
    return this.withAuth(token).post('/ops/users', userData);
  }

  async getUserById(token: string, organizationId: string | any, userId?: string) {
    // Handle both old (token, userId) and new (token, orgId, userId) signatures
    if (arguments.length === 2) {
      return this.withAuth(token).get(`/ops/users/${organizationId}`);
    }
    return this.withAuth(token).get(`/organizations/${organizationId}/users/${userId}`);
  }

  async updateUser(token: string, userId: string, userData: any) {
    return this.withAuth(token).patch(`/ops/users/${userId}`, userData);
  }

  async deleteUser(token: string, userId: string) {
    return this.withAuth(token).delete(`/ops/users/${userId}`);
  }

  async activateUser(activateDto: any) {
    return this.post('/users/activate', activateDto);
  }

  // Ops Endpoints (Platform Admin)
  async getUsersOps(token: string, query?: any) {
    return this.withAuth(token).get('/ops/users', { params: query });
  }

  async getUserByIdOps(token: string, userId: string) {
    return this.withAuth(token).get(`/ops/users/${userId}`);
  }

  async updateUserStatusOps(token: string, userId: string, status: string) {
    return this.withAuth(token).patch(`/ops/users/${userId}/status`, null, { params: { status } });
  }

  async getRolesOps(token: string, query?: any) {
    return this.withAuth(token).get('/ops/rbac/roles', { params: query });
  }

  async createPlatformRoleOps(token: string, roleData: any) {
    return this.withAuth(token).post('/ops/rbac/roles/platform', roleData);
  }

  async getPermissionsOps(token: string, query?: any) {
    return this.withAuth(token).get('/ops/rbac/permissions', { params: query });
  }

  // RBAC (Tenant Scoped)
  async getRoles(token: string, organizationId?: string) {
    const path = organizationId ? `/organizations/${organizationId}/rbac/roles` : '/ops/rbac/roles';
    return this.withAuth(token).get(path);
  }

  async createRole(token: string, organizationId: string | any, roleData?: any) {
    if (arguments.length === 2) {
      return this.withAuth(token).post('/ops/rbac/roles', organizationId);
    }
    return this.withAuth(token).post(`/organizations/${organizationId}/rbac/roles`, roleData);
  }

  async getRole(token: string, organizationId: string, roleId: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/rbac/roles/${roleId}`);
  }

  async patchRole(token: string, organizationId: string, roleId: string, roleData: any) {
    return this.withAuth(token).patch(`/organizations/${organizationId}/rbac/roles/${roleId}`, roleData);
  }

  async deleteRole(token: string, organizationId: string | any, roleId?: string) {
    if (arguments.length === 2) {
      return this.withAuth(token).delete(`/ops/rbac/roles/${organizationId}`);
    }
    return this.withAuth(token).delete(`/organizations/${organizationId}/rbac/roles/${roleId}`);
  }

  async assignRole(token: string, organizationId: string, userId: string, roleId: string) {
    return this.withAuth(token).post(`/organizations/${organizationId}/rbac/users/${userId}/roles`, { roleId });
  }

  async getPermissions(token: string, organizationId?: string) {
    const path = organizationId ? `/organizations/${organizationId}/rbac/permissions` : '/ops/rbac/permissions';
    return this.withAuth(token).get(path);
  }
}

export class ApiOrganizationsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_ORGANIZATIONS_URL || process.env.API_ORGANIZATIONS_URL || 'http://localhost:3002') {
    super(baseUrl);
  }

  async getOrganizations(token: string, query?: any) {
    return this.withAuth(token).get('/organizations', { params: query });
  }

  async createOrganization(token: string, orgData: any) {
    return this.withAuth(token).post('/organizations', orgData);
  }

  async getOrganization(token: string, orgId: string) {
    return this.withAuth(token).get(`/organizations/${orgId}`);
  }

  async updateOrganization(token: string, orgId: string, orgData: any) {
    return this.withAuth(token).patch(`/organizations/${orgId}`, orgData);
  }

  async deleteOrganization(token: string, orgId: string) {
    return this.withAuth(token).delete(`/organizations/${orgId}`);
  }

  async getSettings(token: string, orgId: string) {
    return this.withAuth(token).get(`/organizations/${orgId}/settings`);
  }

  async updateSettings(token: string, orgId: string, settingsData: any) {
    return this.withAuth(token).patch(`/organizations/${orgId}/settings`, settingsData);
  }

  async provisionOrganization(token: string, onboardingData: any, options: { timeout?: number } = {}) {
    return this.withAuth(token).post('/onboarding', onboardingData, options);
  }

  // Ops Endpoints (Platform Admin)
  async getOrganizationsOps(token: string, query?: any) {
    return this.withAuth(token).get('/ops/organizations', { params: query });
  }

  async createOrganizationOps(token: string, orgData: any) {
    return this.withAuth(token).post('/ops/organizations', orgData);
  }

  async getOrganizationOps(token: string, orgId: string) {
    return this.withAuth(token).get(`/ops/organizations/${orgId}`);
  }

  async updateOrganizationOps(token: string, orgId: string, orgData: any) {
    return this.withAuth(token).patch(`/ops/organizations/${orgId}`, orgData);
  }

  async deleteOrganizationOps(token: string, orgId: string) {
    return this.withAuth(token).delete(`/ops/organizations/${orgId}`);
  }

  async updateOrganizationStatusOps(token: string, orgId: string, status: string) {
    return this.withAuth(token).patch(`/ops/organizations/${orgId}/status`, null, { params: { status } });
  }

  async getSettingsOps(token: string, orgId: string) {
    return this.withAuth(token).get(`/ops/organizations/${orgId}/settings`);
  }

  async updateSettingsOps(token: string, orgId: string, settingsData: any) {
    return this.withAuth(token).patch(`/ops/organizations/${orgId}/settings`, settingsData);
  }

  async getAuditLogsOps(token: string, query?: any) {
    return this.withAuth(token).get('/ops/auditing/logs', { params: query });
  }

  async getOrgAuditLogsOps(token: string, orgId: string, query?: any) {
    return this.withAuth(token).get(`/ops/organizations/${orgId}/auditing/logs`, { params: query });
  }
}

export class ApiDebtorsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_DEBTORS_URL || process.env.API_DEBTORS_URL || 'http://localhost:3004') {
    super(baseUrl);
  }

  async getDebtors(token: string, organizationId: string, query?: any) {
    return this.withAuth(token).get(`/organizations/${organizationId}/debtors`, { params: query });
  }

  async getDebtor(token: string, organizationId: string, debtorId: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/debtors/${debtorId}`);
  }

  async createDebtor(token: string, organizationId: string, debtorData: any) {
    return this.withAuth(token).post(`/organizations/${organizationId}/debtors`, debtorData);
  }

  async updateDebtor(token: string, organizationId: string, debtorId: string, debtorData: any) {
    return this.withAuth(token).patch(`/organizations/${organizationId}/debtors/${debtorId}`, debtorData);
  }

  async deleteDebtor(token: string, organizationId: string, debtorId: string) {
    return this.withAuth(token).delete(`/organizations/${organizationId}/debtors/${debtorId}`);
  }

  async inviteDebtor(token: string, organizationId: string | any, debtorId?: string, inviteData?: any) {
    if (arguments.length === 3) {
      return this.withAuth(token).post(`/debtors/${organizationId}/invite`, debtorId);
    }
    return this.withAuth(token).post(`/organizations/${organizationId}/debtors/${debtorId}/invite`, inviteData);
  }

  async getMyProfile(token: string, organizationId: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/debtors/my-profile`);
  }
}

export class ApiDebtsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_DEBTS_URL || process.env.API_DEBTS_URL || 'http://localhost:3003') {
    super(baseUrl);
  }

  async getDebts(token: string, organizationId: string, query?: any) {
    return this.withAuth(token).get(`/organizations/${organizationId}/debts`, { params: query });
  }

  async getDebt(token: string, organizationId: string, debtId: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/debts/${debtId}`);
  }

  async createDebt(token: string, organizationId: string, debtData: any) {
    return this.withAuth(token).post(`/organizations/${organizationId}/debts`, debtData);
  }

  async getMyDebts(token: string, organizationId: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/debts/my-debts`);
  }

  async getPortfolios(token: string, organizationId: string, query?: any) {
    return this.withAuth(token).get(`/organizations/${organizationId}/portfolios`, { params: query });
  }

  async createPortfolio(token: string, organizationId: string, portfolioData: any) {
    return this.withAuth(token).post(`/organizations/${organizationId}/portfolios`, portfolioData);
  }

  async updateDebt(organizationId: string, debtId: string, debtData: any, token: string) {
    return this.withAuth(token).patch(`/organizations/${organizationId}/debts/${debtId}`, debtData);
  }
}

export class ApiWorkflowsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_WORKFLOWS_URL || process.env.API_WORKFLOWS_URL || 'http://localhost:3009') {
    super(baseUrl);
  }

  async getWorkflowRules(organizationId: string, query: any, token: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/workflows/rules`, { params: query });
  }

  async getWorkflowRule(organizationId: string, ruleId: string, token: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/workflows/rules/${ruleId}`);
  }

  async createWorkflowRule(organizationId: string, ruleData: any, token: string) {
    return this.withAuth(token).post(`/organizations/${organizationId}/workflows/rules`, ruleData);
  }

  async updateWorkflowRule(organizationId: string, ruleId: string, ruleData: any, token: string) {
    return this.withAuth(token).patch(`/organizations/${organizationId}/workflows/rules/${ruleId}`, ruleData);
  }

  async deleteWorkflowRule(organizationId: string, ruleId: string, token: string) {
    return this.withAuth(token).delete(`/organizations/${organizationId}/workflows/rules/${ruleId}`);
  }

  async toggleWorkflowRule(organizationId: string, ruleId: string, token: string) {
    return this.withAuth(token).patch(`/organizations/${organizationId}/workflows/rules/${ruleId}/toggle`);
  }

  async getWorkflowExecutions(organizationId: string, query: any, token: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/workflows/executions`, { params: query });
  }

  async getWorkflowExecution(organizationId: string, executionId: string, token: string) {
    return this.withAuth(token).get(`/organizations/${organizationId}/workflows/executions/${executionId}`);
  }
}

export class ApiTransactionsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_TRANSACTIONS_URL || process.env.API_TRANSACTIONS_URL || 'http://localhost:3005') {
    super(baseUrl);
  }
}

export class ApiCommunicationsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_COMMUNICATIONS_URL || process.env.API_COMMUNICATIONS_URL || 'http://localhost:3006') {
    super(baseUrl);
  }
}

export class ApiCollectorsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_COLLECTORS_URL || process.env.API_COLLECTORS_URL || 'http://localhost:3007') {
    super(baseUrl);
  }
}

export class ApiVoiceClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_VOICE_URL || process.env.API_VOICE_URL || 'http://localhost:3008') {
    super(baseUrl);
  }
}

export class ApiAutomationsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_AUTOMATIONS_URL || process.env.API_AUTOMATIONS_URL || 'http://localhost:3010') {
    super(baseUrl);
  }
}

export class ApiAnalyticsClient extends ApiClientHelper {
  constructor(baseUrl = process.env.E2E_API_ANALYTICS_URL || process.env.API_ANALYTICS_URL || 'http://localhost:3011') {
    super(baseUrl);
  }
}

export function createApiUsersClient(): ApiUsersClient { return new ApiUsersClient(); }
export function createApiOrganizationsClient(): ApiOrganizationsClient { return new ApiOrganizationsClient(); }
export function createApiDebtorsClient(): ApiDebtorsClient { return new ApiDebtorsClient(); }
export function createApiDebtsClient(): ApiDebtsClient { return new ApiDebtsClient(); }
export function createApiWorkflowsClient(): ApiWorkflowsClient { return new ApiWorkflowsClient(); }
export function createApiTransactionsClient(): ApiTransactionsClient { return new ApiTransactionsClient(); }
export function createApiCommunicationsClient(): ApiCommunicationsClient { return new ApiCommunicationsClient(); }
export function createApiCollectorsClient(): ApiCollectorsClient { return new ApiCollectorsClient(); }
export function createApiVoiceClient(): ApiVoiceClient { return new ApiVoiceClient(); }
export function createApiAutomationsClient(): ApiAutomationsClient { return new ApiAutomationsClient(); }
export function createApiAnalyticsClient(): ApiAnalyticsClient { return new ApiAnalyticsClient(); }