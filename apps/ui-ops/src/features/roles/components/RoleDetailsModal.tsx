import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '../../../shared/services/rbacService.js';
import { RoleDetailDto, RoleResponseDto } from '../../../api/generated/users_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Shield, Users, Calendar, FileText, Key, Plus, Trash2 } from 'lucide-react';
import { AssignPermissionsModal } from './AssignPermissionsModal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface RoleDetailsModalProps {
  roleId: string | null;
  onClose: () => void;
  onEdit?: (role: RoleResponseDto) => void;
}

export function RoleDetailsModal({ roleId, onClose, onEdit }: RoleDetailsModalProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [showAssignPermissions, setShowAssignPermissions] = useState(false);

  const { data: role, isLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => rbacService.getRoleById(organizationId!, roleId!),
    enabled: !!roleId && !!organizationId,
  });

  // Mutation to remove a permission from role
  const removePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => {
      if (!organizationId) throw new Error('Organization context is required');
      return rbacService.removePermissionFromRole(organizationId, role!.id, permissionId);
    },
    onSuccess: () => {
      toast.success('Permission removed successfully!');
      queryClient.invalidateQueries({ queryKey: ['role', role!.id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to remove permission');
      toast.error(message);
    },
  });

  const handleRemovePermission = (permissionId: string, permissionCode: string) => {
    if (confirm(`Are you sure you want to remove the "${permissionCode}" permission from this role?`)) {
      removePermissionMutation.mutate(permissionId);
    }
  };

  if (!roleId) return null;

  const getTypeBadge = (isSystemRole: boolean) => {
    if (isSystemRole) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-info/10 text-info border-info/20">
          System Role
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/20">
        Custom Role
      </span>
    );
  };

  return (
    <Modal
      isOpen={!!roleId}
      onClose={onClose}
      title="Role Details"
      description="View role information and assigned permissions"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : role ? (
        <div className="space-y-6">
          {/* Role Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {role.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{role.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{role.description as unknown as string}</p>
                <div className="mt-2">
                  {getTypeBadge(role.isSystemRole)}
                </div>
              </div>
            </div>
          </div>

          {/* Role Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Count */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Assigned Users</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{role.userCount}</p>
            </div>

            {/* Permissions Count */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Key className="w-4 h-4" />
                <span className="text-sm font-medium">Permissions</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{role.permissions?.length || 0}</p>
            </div>

            {/* Created Date */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <p className="text-foreground text-sm">
                {new Date(role.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Last Updated */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Last Updated</span>
              </div>
              <p className="text-foreground text-sm">
                {new Date(role.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="p-4 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-foreground">
                <Key className="w-5 h-5" />
                <h4 className="text-lg font-semibold">Assigned Permissions</h4>
              </div>
              {!role.isSystemRole && (
                <button
                  onClick={() => setShowAssignPermissions(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Permissions
                </button>
              )}
            </div>

            {role.permissions && role.permissions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {role.permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono font-semibold text-primary">
                            {permission.code}
                          </code>
                          <span className="text-xs px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                            {permission.resource}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {permission.description}
                        </p>
                      </div>
                      {!role.isSystemRole && (
                        <button
                          onClick={() => handleRemovePermission(permission.id, permission.code)}
                          disabled={removePermissionMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 p-2 text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove permission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground mb-3">No permissions assigned to this role</p>
                {!role.isSystemRole && (
                  <button
                    onClick={() => setShowAssignPermissions(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Permissions
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Organization ID (if applicable) */}
          {role.organizationId && (
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Organization ID</span>
              </div>
              <code className="text-xs text-foreground font-mono bg-muted px-2 py-1 rounded">
                {role.organizationId as unknown as string}
              </code>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Close
            </button>
            {onEdit && !role.isSystemRole && (
              <button
                onClick={() => {
                  onEdit(role);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold hover:shadow-lg transition-all cursor-pointer"
              >
                Edit Role
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Role not found</p>
        </div>
      )}

      {/* Assign Permissions Modal */}
      {showAssignPermissions && (
        <AssignPermissionsModal
          role={role || null}
          onClose={() => setShowAssignPermissions(false)}
        />
      )}
    </Modal>
  );
}
