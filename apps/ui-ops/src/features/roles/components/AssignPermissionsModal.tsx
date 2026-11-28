import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '../../../shared/services/rbacService.js';
import { RoleDetailDto, PermissionResponseDto } from '../../../api/generated/users_models/index.js'; // Assuming generated types are here
import { Modal } from '../../../shared/components/Modal.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Search, Key, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface AssignPermissionsModalProps {
  role: RoleDetailDto | null;
  onClose: () => void;
}

export function AssignPermissionsModal({ role, onClose }: AssignPermissionsModalProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());

  // Fetch all available permissions grouped by resource
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['permissions', 'grouped'],
    queryFn: () => rbacService.getGroupedPermissions(organizationId!),
    enabled: !!role && !!organizationId,
  });

  // Get currently assigned permission IDs
  const assignedPermissionIds = new Set(role?.permissions?.map((p) => p.id) || []);

  // Mutation to assign permissions in bulk
  const assignMutation = useMutation({
    mutationFn: (permissionIds: string[]) => {
      if (!organizationId) throw new Error('Organization context is required');
      return rbacService.assignPermissionsToRoleBulk(organizationId, role!.id, { permissionIds });
    },
    onSuccess: () => {
      toast.success('Permissions assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['role', role!.id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to assign permissions');
      toast.error(message);
    },
  });

  const handleTogglePermission = (permissionId: string) => {
    const newSet = new Set(selectedPermissionIds);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissionIds(newSet);
  };

  const handleToggleResource = (permissions: PermissionResponseDto[]) => {
    const resourcePermissionIds = permissions.map((p) => p.id);
    const newSet = new Set(selectedPermissionIds);

    // Check if all permissions in this resource are already selected
    const allSelected = resourcePermissionIds.every((id) => newSet.has(id));

    if (allSelected) {
      // Deselect all
      resourcePermissionIds.forEach((id) => newSet.delete(id));
    } else {
      // Select all
      resourcePermissionIds.forEach((id) => newSet.add(id));
    }

    setSelectedPermissionIds(newSet);
  };

  const handleSubmit = () => {
    if (selectedPermissionIds.size === 0) {
      toast.info('No permissions selected');
      return;
    }

    // Only assign permissions that aren't already assigned
    const newPermissions = Array.from(selectedPermissionIds).filter(
      (id) => !assignedPermissionIds.has(id)
    );

    if (newPermissions.length === 0) {
      toast.info('All selected permissions are already assigned');
      return;
    }

    assignMutation.mutate(newPermissions);
  };

  const handleClose = () => {
    setSelectedPermissionIds(new Set());
    setSearchQuery('');
    onClose();
  };

  if (!role) return null;

  // Filter permissions by search query
  const filteredGroups = permissionsData?.groups?.map((group) => ({
    ...group,
    permissions: group.permissions.filter((permission) =>
      permission.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((group) => group.permissions.length > 0) || [];

  return (
    <Modal
      isOpen={!!role}
      onClose={handleClose}
      title="Assign Permissions"
      description={`Add permissions to ${role.name}`}
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                {selectedPermissionIds.size} permission{selectedPermissionIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            {selectedPermissionIds.size > 0 && (
              <button
                onClick={() => setSelectedPermissionIds(new Set())}
                className="text-sm text-error hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Permissions List by Resource */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {filteredGroups.map((group) => {
              const groupPermissionIds = group.permissions.map((p) => p.id);
              const allSelected = groupPermissionIds.every((id) => selectedPermissionIds.has(id));
              const someSelected = groupPermissionIds.some((id) => selectedPermissionIds.has(id));

              return (
                <div key={group.resource} className="border border-border rounded-lg overflow-hidden">
                  {/* Resource Header */}
                  <button
                    onClick={() => handleToggleResource(group.permissions)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : someSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary opacity-50" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <h4 className="font-semibold text-foreground capitalize">
                          {group.resource}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Permissions in this resource */}
                  <div className="divide-y divide-border">
                    {group.permissions.map((permission) => {
                      const isSelected = selectedPermissionIds.has(permission.id);
                      const isAssigned = assignedPermissionIds.has(permission.id);

                      return (
                        <button
                          key={permission.id}
                          onClick={() => !isAssigned && handleTogglePermission(permission.id)}
                          disabled={isAssigned}
                          className={`
                            w-full flex items-start gap-3 p-4 text-left transition-colors
                            ${isAssigned ? 'bg-success/5 cursor-not-allowed opacity-60' : 'hover:bg-muted/20 cursor-pointer'}
                            ${isSelected && !isAssigned ? 'bg-primary/10' : ''}
                          `}
                        >
                          {isAssigned ? (
                            <CheckSquare className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                          ) : isSelected ? (
                            <CheckSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-sm font-mono font-semibold text-foreground">
                                {permission.code}
                              </code>
                              {isAssigned && (
                                <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                                  Already assigned
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {permission.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">No permissions found</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant={ButtonVariant.GHOST}
              onClick={handleClose}
              disabled={assignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={ButtonVariant.PRIMARY}
              size={ButtonSize.MD}
              onClick={handleSubmit}
              loading={assignMutation.isPending}
              disabled={selectedPermissionIds.size === 0}
            >
              {assignMutation.isPending ? 'Assigning...' : `Assign ${selectedPermissionIds.size} Permission${selectedPermissionIds.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
