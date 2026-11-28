import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  ProfilesControllerFindAllOrganizationsParams,
  PaginatedResponseDto,
  AddressResponseDto,
  CreateAddressDto,
  UpdateAddressDto,
  EmailResponseDto,
  CreateEmailDto,
  UpdateEmailDto,
  PhoneNumberResponseDto,
  CreatePhoneNumberDto,
  UpdatePhoneNumberDto,
  ProvisionOrganizationDto,
  OnboardingResponseDto
} from '../../api/generated/organizations_models/index.js'; // Assuming generated types are here
import type { AxiosRequestConfig } from '@verichron/api-client';
import {
  organizationsApiClient,
} from './apiClient.js';

export const organizationService = {
  provisionOrganization: async (dto: ProvisionOrganizationDto, config?: AxiosRequestConfig): Promise<OnboardingResponseDto> => {
    const response = await organizationsApiClient.post<OnboardingResponseDto>('/v1/organizations/onboarding', dto, config);
    return response.data;
  },
  createOrganization: async (dto: CreateOrganizationDto, config?: AxiosRequestConfig): Promise<OrganizationResponseDto> => {
    const response = await organizationsApiClient.post<OrganizationResponseDto>('/ops/organizations/profiles', dto, config);
    return response.data;
  },
  listOrganizations: async (query?: ProfilesControllerFindAllOrganizationsParams, config?: AxiosRequestConfig): Promise<PaginatedResponseDto> => {
    const response = await organizationsApiClient.get<PaginatedResponseDto>('/ops/organizations/profiles', { params: query, ...config });
    return response.data;
  },
  getOrganizationById: async (orgId: string, config?: AxiosRequestConfig): Promise<OrganizationResponseDto> => {
    const response = await organizationsApiClient.get<OrganizationResponseDto>(`/ops/organizations/profiles/${orgId}`, config);
    return response.data;
  },
  updateOrganization: async (orgId: string, dto: UpdateOrganizationDto, config?: AxiosRequestConfig): Promise<OrganizationResponseDto> => {
    const response = await organizationsApiClient.patch<OrganizationResponseDto>(`/ops/organizations/profiles/${orgId}`, dto, config);
    return response.data;
  },
  deleteOrganization: async (orgId: string, config?: AxiosRequestConfig): Promise<void> => {
    await organizationsApiClient.delete(`/ops/organizations/profiles/${orgId}`, config);
  },
  getOrganizationAddresses: async (orgId: string, config?: AxiosRequestConfig): Promise<AddressResponseDto[]> => {
    const response = await organizationsApiClient.get<AddressResponseDto[]>(`/v1/organizations/profiles/${orgId}/addresses`, config);
    return response.data;
  },
  addAddress: async (orgId: string, dto: CreateAddressDto, config?: AxiosRequestConfig): Promise<AddressResponseDto> => {
    const response = await organizationsApiClient.post<AddressResponseDto>(`/v1/organizations/profiles/${orgId}/addresses`, dto, config);
    return response.data;
  },
  updateAddress: async (orgId: string, addressId: string, dto: UpdateAddressDto, config?: AxiosRequestConfig): Promise<AddressResponseDto> => {
    const response = await organizationsApiClient.patch<AddressResponseDto>(`/v1/organizations/profiles/${orgId}/addresses/${addressId}`, dto, config);
    return response.data;
  },
  deleteAddress: async (orgId: string, addressId: string, config?: AxiosRequestConfig): Promise<void> => {
    await organizationsApiClient.delete(`/v1/organizations/profiles/${orgId}/addresses/${addressId}`, config);
  },
  getOrganizationEmails: async (orgId: string, config?: AxiosRequestConfig): Promise<EmailResponseDto[]> => {
    const response = await organizationsApiClient.get<EmailResponseDto[]>(`/v1/organizations/profiles/${orgId}/emails`, config);
    return response.data;
  },
  addEmail: async (orgId: string, dto: CreateEmailDto, config?: AxiosRequestConfig): Promise<EmailResponseDto> => {
    const response = await organizationsApiClient.post<EmailResponseDto>(`/v1/organizations/profiles/${orgId}/emails`, dto, config);
    return response.data;
  },
  updateEmail: async (orgId: string, emailId: string, dto: UpdateEmailDto, config?: AxiosRequestConfig): Promise<EmailResponseDto> => {
    const response = await organizationsApiClient.patch<EmailResponseDto>(`/v1/organizations/profiles/${orgId}/emails/${emailId}`, dto, config);
    return response.data;
  },
  deleteEmail: async (orgId: string, emailId: string, config?: AxiosRequestConfig): Promise<void> => {
    await organizationsApiClient.delete(`/v1/organizations/profiles/${orgId}/emails/${emailId}`, config);
  },
  getOrganizationPhoneNumbers: async (orgId: string, config?: AxiosRequestConfig): Promise<PhoneNumberResponseDto[]> => {
    const response = await organizationsApiClient.get<PhoneNumberResponseDto[]>(`/v1/organizations/profiles/${orgId}/phone-numbers`, config);
    return response.data;
  },
  addPhoneNumber: async (orgId: string, dto: CreatePhoneNumberDto, config?: AxiosRequestConfig): Promise<PhoneNumberResponseDto> => {
    const response = await organizationsApiClient.post<PhoneNumberResponseDto>(`/v1/organizations/profiles/${orgId}/phone-numbers`, dto, config);
    return response.data;
  },
  updatePhoneNumber: async (orgId: string, phoneNumberId: string, dto: UpdatePhoneNumberDto, config?: AxiosRequestConfig): Promise<PhoneNumberResponseDto> => {
    const response = await organizationsApiClient.patch<PhoneNumberResponseDto>(`/v1/organizations/profiles/${orgId}/phone-numbers/${phoneNumberId}`, dto, config);
    return response.data;
  },
  deletePhoneNumber: async (orgId: string, phoneNumberId: string, config?: AxiosRequestConfig): Promise<void> => {
    await organizationsApiClient.delete(`/v1/organizations/profiles/${orgId}/phone-numbers/${phoneNumberId}`, config);
  },
};
