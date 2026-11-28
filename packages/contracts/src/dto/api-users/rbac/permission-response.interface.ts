export interface IPermissionResponse {
  id: string;
  code: string;
  description: string;
  resource: string;
  action: string;
  scope?: string;
  createdAt: Date;
}