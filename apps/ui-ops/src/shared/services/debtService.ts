import {
  CreateDebtDto,
  UpdateDebtDto,
  DebtResponseDto,
  PaginatedDebtResponseDto,
  DebtsControllerFindAllParams,
  DebtsControllerFindMyDebtsParams,
} from '../../api/generated/debts_models/index.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import { debtsApiClient } from './apiClient.js';
import { resolveOrgId } from './orgContext.js';

export const debtService = {
  createDebt: async (orgOrDto: string | CreateDebtDto, dtoOrConfig?: CreateDebtDto | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<DebtResponseDto> => {
    const hasExplicitOrg = typeof orgOrDto === 'string';
    const orgId = resolveOrgId(hasExplicitOrg ? orgOrDto : undefined);
    const dto = (hasExplicitOrg ? dtoOrConfig : orgOrDto) as CreateDebtDto;
    const requestConfig = (hasExplicitOrg ? config : dtoOrConfig) as AxiosRequestConfig | undefined;
    const response = await debtsApiClient.post<DebtResponseDto>(`/v1/debts/debts/orgs/${orgId}`, dto, requestConfig);
    return response.data;
  },
  listDebts: async (orgOrQuery?: string | DebtsControllerFindAllParams, queryOrConfig?: DebtsControllerFindAllParams | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<PaginatedDebtResponseDto> => {
    const hasExplicitOrg = typeof orgOrQuery === 'string';
    const orgId = resolveOrgId(hasExplicitOrg ? orgOrQuery : undefined);
    const query = (hasExplicitOrg ? queryOrConfig : orgOrQuery) as DebtsControllerFindAllParams | undefined;
    const requestConfig = (hasExplicitOrg ? config : queryOrConfig) as AxiosRequestConfig | undefined;
    const response = await debtsApiClient.get<PaginatedDebtResponseDto>(`/v1/debts/debts/orgs/${orgId}`, { params: query, ...requestConfig });
    return response.data;
  },
  listMyDebts: async (orgOrQuery?: string | DebtsControllerFindMyDebtsParams, queryOrConfig?: DebtsControllerFindMyDebtsParams | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<PaginatedDebtResponseDto> => {
    const hasExplicitOrg = typeof orgOrQuery === 'string';
    const orgId = resolveOrgId(hasExplicitOrg ? orgOrQuery : undefined);
    const query = (hasExplicitOrg ? queryOrConfig : orgOrQuery) as DebtsControllerFindMyDebtsParams | undefined;
    const requestConfig = (hasExplicitOrg ? config : queryOrConfig) as AxiosRequestConfig | undefined;
    const response = await debtsApiClient.get<PaginatedDebtResponseDto>(`/v1/debts/debts/orgs/${orgId}/mine`, { params: query, ...requestConfig });
    return response.data;
  },
  getDebtById: async (orgOrDebtId: string, debtIdOrConfig?: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<DebtResponseDto> => {
    const hasExplicitOrg = typeof debtIdOrConfig === 'string';
    const orgId = resolveOrgId(hasExplicitOrg ? orgOrDebtId : undefined);
    const debtId = (hasExplicitOrg ? debtIdOrConfig : orgOrDebtId) as string;
    const requestConfig = (hasExplicitOrg ? config : debtIdOrConfig) as AxiosRequestConfig | undefined;
    const response = await debtsApiClient.get<DebtResponseDto>(`/v1/debts/debts/orgs/${orgId}/${debtId}`, requestConfig);
    return response.data;
  },
  updateDebt: async (orgOrDebtId: string, debtIdOrDto: string | UpdateDebtDto, dtoOrConfig?: UpdateDebtDto | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<DebtResponseDto> => {
    const hasExplicitOrg = typeof debtIdOrDto === 'string';
    const orgId = resolveOrgId(hasExplicitOrg ? orgOrDebtId : undefined);
    const debtId = (hasExplicitOrg ? debtIdOrDto : orgOrDebtId) as string;
    const dto = (hasExplicitOrg ? dtoOrConfig : debtIdOrDto) as UpdateDebtDto;
    const requestConfig = (hasExplicitOrg ? config : dtoOrConfig) as AxiosRequestConfig | undefined;
    const response = await debtsApiClient.patch<DebtResponseDto>(`/v1/debts/debts/orgs/${orgId}/${debtId}`, dto, requestConfig);
    return response.data;
  },
  deleteDebt: async (orgOrDebtId: string, debtIdOrConfig?: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<void> => {
    const hasExplicitOrg = typeof debtIdOrConfig === 'string';
    const orgId = resolveOrgId(hasExplicitOrg ? orgOrDebtId : undefined);
    const debtId = (hasExplicitOrg ? debtIdOrConfig : orgOrDebtId) as string;
    const requestConfig = (hasExplicitOrg ? config : debtIdOrConfig) as AxiosRequestConfig | undefined;
    await debtsApiClient.delete(`/v1/debts/debts/orgs/${orgId}/${debtId}`, requestConfig);
  },
};
