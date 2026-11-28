/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import React, { useState } from 'react';
import { Select } from '@/shared/components/Form';
import { useTeam } from '@/shared/contexts/TeamContext';
import { useUser } from '@/shared/store/userStore'; // For role-based rendering of 'All Teams' option
import { RoleGuard } from './RoleGuard';

interface TeamSelectorProps {
  // Optional: Allows a different placeholder text
  placeholder?: string;
  // Optional: Controls whether the "All Teams" option is shown
  showAllOption?: boolean;
}

export function TeamSelector({
  placeholder = 'Select a team',
  showAllOption = true,
}: TeamSelectorProps) {
  const { selectedTeamId, setSelectedTeamId, currentUserTeams, isLoadingUserTeams } = useTeam();
  const { hasRole } = useUser();

  const canViewAllTeams = hasRole(['Organization Admin', 'Organization Manager']);

  // Handle case where no teams are available, or still loading
  if (isLoadingUserTeams) {
    return (
      <Select value="" disabled>
        <option value="">Loading teams...</option>
      </Select>
    );
  }

  // If there are no teams, don't show the selector
  if (!currentUserTeams || currentUserTeams.length === 0) {
    return null;
  }

  // If there's only one team and user cannot view all teams, don't show selector.
  // This is a common UI optimization to reduce clutter.
  if (
    currentUserTeams?.length === 1 &&
    (!showAllOption || !canViewAllTeams)
  ) {
    return null;
  }

  return (
    <Select
      value={selectedTeamId || ''} // Use empty string for null to work with <select>
      onChange={(e) => setSelectedTeamId(e.target.value || null)} // Convert empty string back to null
      disabled={isLoadingUserTeams}
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>
      {showAllOption && canViewAllTeams && (
        <option value="">All Teams</option>
      )}
      {currentUserTeams?.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
          {team.memberCount !== undefined && ` (${team.memberCount} members)`}
          {(team as any).isPrimary && ' (Primary)'}
        </option>
      ))}
    </Select>
  );
}