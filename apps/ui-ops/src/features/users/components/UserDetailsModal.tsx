import { useQuery } from '@tanstack/react-query';
import { userService } from '../../../shared/services/userService.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Button } from '../../../shared/components/Button.js';
import { Badge, StatusBadge } from '../../../shared/components/Badge.js';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Building2,
} from 'lucide-react';
import { UserDetailDto } from '../../../api/generated/users_models/index.js';
import { format } from 'date-fns';

interface UserDetailsModalProps {
  userId: string | null;
  onClose: () => void;
  onEdit?: (user: UserDetailDto) => void;
}

export function UserDetailsModal({ userId, onClose, onEdit }: UserDetailsModalProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUserById(userId!),
    enabled: !!userId,
  });

  return (
    <Modal
      isOpen={!!userId}
      onClose={onClose}
      title="User Principal Profile"
      description="Administrative record and security authorization state"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--color-border)] border-t-indigo-600"></div>
            <p className="text-[var(--color-muted-foreground)] text-[10px] font-black uppercase tracking-widest">Accessing Security Vault...</p>
          </div>
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-6 p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10">
            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/10">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-foreground">
                  {user.firstName} {user.lastName}
                </h3>
                <StatusBadge status={user.status} variant="outlined" />
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-bold uppercase tracking-tight">{user.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" size="sm" icon={<User size={10} />}>
                  ADMINISTRATOR
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
                <Hash className="w-3.5 h-3.5 opacity-50" />
                <span>Global User ID</span>
              </div>
              <p className="text-foreground font-mono text-xs font-bold truncate">{user.id}</p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
                <Calendar className="w-3.5 h-3.5 opacity-50" />
                <span>Account Created</span>
              </div>
              <p className="text-foreground text-xs font-bold">
                {format(new Date(user.createdAt), 'MMMM d, yyyy · HH:mm')}
              </p>
            </div>
          </div>

          {/* Organization Memberships */}
          {user.memberships && user.memberships.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1 flex items-center gap-2">
                <Building2 size={12} />
                Tenancy Map
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {user.memberships.map((membership, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Tenant ID</p>
                      <p className="text-xs font-mono font-bold text-foreground mt-0.5 truncate max-w-[120px]">
                        {membership.organizationId as unknown as string}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest">Policy Role</p>
                      <Badge variant="outline" size="sm" className="mt-0.5">{membership.role.name}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1 flex items-center gap-2">
                <Mail size={12} />
                Communication Channels
              </h4>
              <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 space-y-3">
                {user.emails?.map((email) => (
                  <div key={email.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{email.email}</span>
                    {email.isPrimary && <Badge variant="info" size="sm">PRIMARY</Badge>}
                  </div>
                ))}
                {user.phoneNumbers?.map((phone) => (
                  <div key={phone.id} className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/50">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-[var(--color-muted-foreground)]" />
                      <span className="text-sm font-medium text-foreground">{phone.phoneNumber}</span>
                    </div>
                    <Badge variant="outline" size="sm">{phone.category}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {user.addresses && user.addresses.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1 flex items-center gap-2">
                  <MapPin size={12} />
                  Geographic Identity
                </h4>
                <div className="space-y-2">
                  {user.addresses.map((address) => (
                    <div
                      key={address.id}
                      className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 relative"
                    >
                      <p className="text-sm font-bold text-foreground">{address.street1}</p>
                      {address.street2 && (
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{address.street2}</p>
                      )}
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mt-1">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      {address.isPrimary && (
                        <div className="absolute top-4 right-4">
                          <Badge variant="info" size="sm">HOME</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onEdit(user);
                  onClose();
                }}
              >
                Modify Record
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xs font-bold text-[var(--color-muted-foreground)] uppercase">User profile not found</p>
        </div>
      )}
    </Modal>
  );
}