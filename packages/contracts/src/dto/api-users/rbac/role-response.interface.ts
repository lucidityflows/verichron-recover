export interface IRoleResponse {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}
