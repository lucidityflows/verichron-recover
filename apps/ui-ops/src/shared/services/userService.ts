import {
  // ProvisionInitialAdmin, // commented out in original
  // ProvisionInitialAdminResponse, // commented out in original
  ProfilesControllerListUsersParams,
  PaginatedUsersResponseDto, // Assuming IPaginatedUsersResponseDto becomes this when wrapped around UserSummary
  UserDetailDto,
  InviteUserDto,
  // ActivateUser, // commented out in original
  UpdateUserDto,
  AddressResponseDto,
  CreateAddressDto,
  UpdateAddressDto,
  EmailResponseDto,
  CreateEmailDto,
  UpdateEmailDto,
  PhoneNumberResponseDto,
  CreatePhoneNumberDto,
  UpdatePhoneNumberDto,
  UserSummaryDto
} from '../../api/generated/users_models/index.js'; // Assuming generated types are here
import { AxiosRequestConfig } from '@verichron/api-client';
import {
  usersApiClient,
} from './apiClient.js';

export const userService = {
  // provisionInitialAdmin: async (dto: ProvisionInitialAdmin, config?: AxiosRequestConfig): Promise<ProvisionInitialAdminResponse> => {
  //   const response = await usersApiClient.post<ProvisionInitialAdminResponse>('/v1/users/internal/provision-initial-admin', dto, config);
  //   return response.data;
  // },
  listUsers: async (query?: ProfilesControllerListUsersParams, config?: AxiosRequestConfig): Promise<PaginatedUsersResponseDto> => {
    const response = await usersApiClient.get<PaginatedUsersResponseDto>('/ops/users/profiles', { params: query, ...config });
    return response.data;
  },
  getUserById: async (userId: string, config?: AxiosRequestConfig): Promise<UserDetailDto> => {
    const response = await usersApiClient.get<UserDetailDto>(`/ops/users/profiles/${userId}`, config);
    return response.data;
  },
  inviteUser: async (orgId: string, dto: InviteUserDto, config?: AxiosRequestConfig): Promise<UserDetailDto> => {
    const response = await usersApiClient.post<UserDetailDto>(`/v1/users/profiles/orgs/${orgId}`, dto, config);
    return response.data;
  },
  // activateUser: async (dto: ActivateUser, config?: AxiosRequestConfig): Promise<UserDetailDto> => {
  //   const response = await usersApiClient.post<UserDetailDto>('/v1/users/activate', dto, config);
  //   return response.data;
  // },
  updateUser: async (orgId: string, userId: string, dto: UpdateUserDto, config?: AxiosRequestConfig): Promise<UserDetailDto> => {
    const response = await usersApiClient.patch<UserDetailDto>(`/v1/users/profiles/orgs/${orgId}/${userId}`, dto, config);
    return response.data;
  },
  deleteUser: async (orgId: string, userId: string, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/profiles/orgs/${orgId}/${userId}`, config);
  },
  getUserAddresses: async (orgId: string, userId: string, config?: AxiosRequestConfig): Promise<AddressResponseDto[]> => {
    const response = await usersApiClient.get<AddressResponseDto[]>(`/v1/users/profiles/orgs/${orgId}/${userId}/addresses`, config);
    return response.data;
  },
  addAddress: async (orgId: string, userId: string, dto: CreateAddressDto, config?: AxiosRequestConfig): Promise<AddressResponseDto> => {
    const response = await usersApiClient.post<AddressResponseDto>(`/v1/users/profiles/orgs/${orgId}/${userId}/addresses`, dto, config);
    return response.data;
  },
  updateAddress: async (orgId: string, userId: string, addressId: string, dto: UpdateAddressDto, config?: AxiosRequestConfig): Promise<AddressResponseDto> => {
    const response = await usersApiClient.put<AddressResponseDto>(`/v1/users/profiles/orgs/${orgId}/${userId}/addresses/${addressId}`, dto, config);
    return response.data;
  },
  deleteAddress: async (orgId: string, userId: string, addressId: string, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/profiles/orgs/${orgId}/${userId}/addresses/${addressId}`, config);
  },
  getUserEmails: async (orgId: string, userId: string, config?: AxiosRequestConfig): Promise<EmailResponseDto[]> => {
    const response = await usersApiClient.get<EmailResponseDto[]>(`/v1/users/profiles/orgs/${orgId}/${userId}/emails`, config);
    return response.data;
  },
  addEmail: async (orgId: string, userId: string, dto: CreateEmailDto, config?: AxiosRequestConfig): Promise<EmailResponseDto> => {
    const response = await usersApiClient.post<EmailResponseDto>(`/v1/users/profiles/orgs/${orgId}/${userId}/emails`, dto, config);
    return response.data;
  },
  updateEmail: async (orgId: string, userId: string, emailId: string, dto: UpdateEmailDto, config?: AxiosRequestConfig): Promise<EmailResponseDto> => {
    const response = await usersApiClient.put<EmailResponseDto>(`/v1/users/profiles/orgs/${orgId}/${userId}/emails/${emailId}`, dto, config);
    return response.data;
  },
  deleteEmail: async (orgId: string, userId: string, emailId: string, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/profiles/orgs/${orgId}/${userId}/emails/${emailId}`, config);
  },
  getUserPhoneNumbers: async (orgId: string, userId: string, config?: AxiosRequestConfig): Promise<PhoneNumberResponseDto[]> => {
    const response = await usersApiClient.get<PhoneNumberResponseDto[]>(`/v1/users/profiles/orgs/${orgId}/${userId}/phones`, config);
    return response.data;
  },
  addPhoneNumber: async (orgId: string, userId: string, dto: CreatePhoneNumberDto, config?: AxiosRequestConfig): Promise<PhoneNumberResponseDto> => {
    const response = await usersApiClient.post<PhoneNumberResponseDto>(`/v1/users/profiles/orgs/${orgId}/${userId}/phones`, dto, config);
    return response.data;
  },
  updatePhoneNumber: async (orgId: string, userId: string, phoneId: string, dto: UpdatePhoneNumberDto, config?: AxiosRequestConfig): Promise<PhoneNumberResponseDto> => {
    const response = await usersApiClient.put<PhoneNumberResponseDto>(`/v1/users/profiles/orgs/${orgId}/${userId}/phones/${phoneId}`, dto, config);
    return response.data;
  },
  deletePhoneNumber: async (orgId: string, userId: string, phoneId: string, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/profiles/orgs/${orgId}/${userId}/phones/${phoneId}`, config);
  },
};
