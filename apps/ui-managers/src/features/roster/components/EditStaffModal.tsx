import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Phone, MapPin } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { 
  useProfilesControllerUpdateUser, 
  useProfilesControllerGetUserById,
  useProfilesControllerAddPhoneNumber,
  useProfilesControllerDeletePhoneNumber,
  useProfilesControllerAddAddress,
  useProfilesControllerDeleteAddress
} from '@/api/generated/users/endpoints/users/users';
import { useRbacControllerListRoles, useRbacControllerAssignRoleToUser } from '@/api/generated/users/endpoints/rbac/rbac';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { type UserSummaryDto } from '@/api/generated/users_models';
import { PhoneCategory, AddressCategory } from '@/api/generated/users_models';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSummaryDto | null;
}

interface FormData {
  firstName: string;
  lastName: string;
  roleId: string;
}

type Tab = 'PROFILE' | 'CONTACT';

export const EditStaffModal: React.FC<EditStaffModalProps> = ({ isOpen, onClose, user }) => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('PROFILE');
  
  // Queries
  const { data: rolesData, isLoading: isLoadingRoles } = useRbacControllerListRoles(organizationId!, { pageSize: 100 });
  const { data: userDetailData, isLoading: isLoadingDetail } = useProfilesControllerGetUserById(organizationId!, user?.id || '');
  
  // Mutations
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useProfilesControllerUpdateUser();
  const { mutateAsync: assignRole, isPending: isAssigningRole } = useRbacControllerAssignRoleToUser();
  
  const { mutateAsync: addPhone, isPending: isAddingPhone } = useProfilesControllerAddPhoneNumber();
  const { mutateAsync: deletePhone, isPending: isDeletingPhone } = useProfilesControllerDeletePhoneNumber();
  
  const { mutateAsync: addAddress, isPending: isAddingAddress } = useProfilesControllerAddAddress();
  const { mutateAsync: deleteAddress, isPending: isDeletingAddress } = useProfilesControllerDeleteAddress();

  const isSaving = isUpdatingUser || isAssigningRole || isAddingPhone || isDeletingPhone || isAddingAddress || isDeletingAddress;
  const roles = rolesData?.data?.data || [];
  const userDetail = userDetailData?.data;

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    roleId: '',
  });

  // Local state for new contact inputs
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newStreet2, setNewStreet2] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');
  const [newAddrCategory, setNewAddrCategory] = useState<AddressCategory>(AddressCategory.RESIDENCE_PRIMARY);

  // Populate form when data loads
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName,
        lastName: user.lastName,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (userDetail) {
      // Find role for current organization
      const membership = userDetail.memberships?.find(m => m.organizationId === organizationId);
      if (membership?.role) {
        setFormData(prev => ({ ...prev, roleId: membership.role.id }));
      }
    }
  }, [userDetail, organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // 1. Update basic info
      if (formData.firstName !== user.firstName || formData.lastName !== user.lastName) {
        await updateUser({
          organizationId: organizationId!,
          userId: user.id,
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
          },
        });
      }

      // 2. Update Role (if changed)
      const currentRole = userDetail?.memberships?.find(m => m.organizationId === organizationId)?.role;
      if (formData.roleId && currentRole?.id !== formData.roleId) {
        await assignRole({
          organizationId: organizationId!,
          userId: user.id,
          data: { roleId: formData.roleId },
        });
      }
      
      invalidateQueries();
      success('Staff Updated', 'Staff member details updated successfully.');
      onClose();
    } catch (error: any) {
      toastError('Update Failed', error.message || 'Failed to update staff member.');
    }
  };

  const handleAddPhone = async () => {
    if (!user || !newPhone) return;
    
    // Simple E.164 formatting for US numbers
    let formattedPhone = newPhone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!newPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+' + newPhone.replace(/[^0-9]/g, ''); 
    }

    try {
      await addPhone({
        organizationId: organizationId!,
        userId: user.id,
        data: {
          phoneNumber: formattedPhone,
          category: PhoneCategory.MOBILE,
          isPrimary: false
        }
      });
      setNewPhone('');
      invalidateQueries();
      success('Phone Added', 'Phone number added successfully.');
    } catch (error: any) {
      toastError('Failed to add phone', error.message);
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    if (!user) return;
    try {
      await deletePhone({
        organizationId: organizationId!,
        userId: user.id,
        phoneId
      });
      invalidateQueries();
      success('Phone Removed', 'Phone number removed successfully.');
    } catch (error: any) {
      toastError('Failed to remove phone', error.message);
    }
  };

  const handleAddAddress = async () => {
    if (!user || !newStreet || !newCity || !newState || !newZip) return;
    try {
      await addAddress({
        organizationId: organizationId!,
        userId: user.id,
        data: {
          street1: newStreet,
          street2: newStreet2 || undefined,
          city: newCity,
          state: newState,
          postalCode: newZip,
          country: 'US',
          category: newAddrCategory,
          isPrimary: false
        }
      });
      setNewStreet('');
      setNewStreet2('');
      setNewCity('');
      setNewState('');
      setNewZip('');
      setNewAddrCategory(AddressCategory.RESIDENCE_PRIMARY);
      invalidateQueries();
      success('Address Added', 'Address added successfully.');
    } catch (error: any) {
      toastError('Failed to add address', error.message);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    try {
      await deleteAddress({
        organizationId: organizationId!,
        userId: user.id,
        addressId
      });
      invalidateQueries();
      success('Address Removed', 'Address removed successfully.');
    } catch (error: any) {
      toastError('Failed to remove address', error.message);
    }
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' &&
               (key.includes(`/organizations/${organizationId}/users/${user?.id}`) ||
                key === `/organizations/${organizationId}/users`);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Staff Member"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-md transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={(e) => handleSubmit(e)}
            disabled={isSaving || isLoadingDetail}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      }
    >
      <div className="flex gap-4 border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'PROFILE' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('CONTACT')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'CONTACT' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Contact Details
        </button>
      </div>

      {isLoadingDetail ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === 'PROFILE' ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-md border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed directly.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Access Role</label>
            <select
              required
              value={formData.roleId}
              onChange={e => setFormData({ ...formData, roleId: e.target.value })}
              className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              disabled={isLoadingRoles}
            >
              <option value="">Select a role...</option>
              {roles
                .map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
            </select>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Phones */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Phone size={14} /> Phone Numbers
            </h4>
            <div className="space-y-2">
              {userDetail?.phoneNumbers?.map((phone: any) => (
                <div key={phone.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono">{phone.phoneNumber}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{phone.category}</span>
                  </div>
                  <button 
                    onClick={() => handleDeletePhone(phone.id)}
                    className="text-muted-foreground hover:text-error transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="+15551234567"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  onClick={handleAddPhone}
                  disabled={!newPhone || isAddingPhone}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isAddingPhone ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Addresses */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <MapPin size={14} /> Addresses
            </h4>
            <div className="space-y-2">
              {userDetail?.addresses?.map((addr) => (
                <div key={addr.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{addr.street1}</span>
                    {addr.street2 && <span className="text-xs text-muted-foreground">{addr.street2}</span>}
                    <span className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.postalCode}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-muted-foreground hover:text-error transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Street 1" value={newStreet} onChange={e => setNewStreet(e.target.value)} className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                <input placeholder="Street 2 (Apt, Suite, etc.)" value={newStreet2} onChange={e => setNewStreet2(e.target.value)} className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                <input placeholder="City" value={newCity} onChange={e => setNewCity(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                <div className="flex gap-2">
                  <input placeholder="ST" maxLength={2} value={newState} onChange={e => setNewState(e.target.value.toUpperCase())} className="w-16 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  <input placeholder="Zip" value={newZip} onChange={e => setNewZip(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                </div>
                <select 
                  value={newAddrCategory} 
                  onChange={e => setNewAddrCategory(e.target.value as AddressCategory)}
                  className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {Object.values(AddressCategory).map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAddress}
                  disabled={!newStreet || !newCity || !newState || !newZip || isAddingAddress}
                  className="col-span-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isAddingAddress ? <Loader2 size={16} className="animate-spin" /> : 'Add Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
