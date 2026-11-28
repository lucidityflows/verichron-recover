import React, { useState } from 'react';
import {
  useGoalsControllerListGoals,
  useGoalsControllerDeleteGoal,
  getGoalsControllerListGoalsQueryKey,
} from '@/api/generated/collectors/endpoints/goals/goals';
import {
  GoalResponseDto,
} from '@/api/generated/collectors_models';
import {
  Button,
  DataTable,
  Column,
  LoadingSpinner,
  ErrorState,
} from '@/shared/components';
import { Plus, Edit, Trash2, Target, Users, User } from 'lucide-react';
import { getCurrentOrganizationId } from '@/shared/utils/auth';
import { GoalProgressCircle } from './components/GoalProgressCircle.js';
import { GoalFormModal } from './components/GoalFormModal.js';
import { useToastContext } from '@/shared/contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { GoalScope, GoalUnit } from '@/api/generated/collectors_models';

export function GoalListPage() {
  const orgId = getCurrentOrganizationId();
  const toast = useToastContext();
  const queryClient = useQueryClient();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGoal, setExistingGoal] = useState<GoalResponseDto | undefined>();

  const { data: goalsData, isLoading, error } = useGoalsControllerListGoals(
    orgId!,
    {},
    { query: { enabled: !!orgId } }
  );

  const deleteMutation = useGoalsControllerDeleteGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGoalsControllerListGoalsQueryKey(orgId!) });
        toast.success('Goal Deleted', 'The performance goal has been removed.');
      },
      onError: (err: any) => {
        toast.error('Delete Failed', err.message || 'Could not delete goal.');
      },
    },
  });

  const goals = goalsData?.status === 200 ? goalsData.data : [];

  const handleEdit = (goal: GoalResponseDto) => {
    setExistingGoal(goal);
    setShowFormModal(true);
  };

  const handleDelete = (goal: GoalResponseDto) => {
    if (confirm(`Are you sure you want to delete the goal "${goal.name}"?`)) {
      deleteMutation.mutate({ organizationId: orgId!, goalId: goal.id });
    }
  };

  const columns: Column<GoalResponseDto>[] = [
    {
      key: 'name',
      header: 'Goal Name',
      render: (goal) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-primary-muted)]">
            <Target className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-foreground)]">{goal.name}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {goal.period} {goal.type}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Assigned To',
      render: (goal) => (
        <div className="flex items-center gap-2 text-sm">
          {goal.scope === GoalScope.TEAM ? (
            <><Users className="w-4 h-4 text-blue-500" /> <span>Team</span></>
          ) : (
            <><User className="w-4 h-4 text-green-500" /> <span>Individual</span></>
          )}
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Current Progress',
      render: (goal) => (
        <GoalProgressCircle organizationId={orgId!} goalId={goal.id} size="sm" />
      ),
    },
    {
      key: 'target',
      header: 'Target',
      render: (goal) => (
        <div className="text-sm font-medium">
          {goal.unit === GoalUnit.DOLLARS ? `$${Number(goal.targetValue).toLocaleString()}` : goal.targetValue}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (goal) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Edit} onClick={() => handleEdit(goal)} />
          <Button variant="ghost" size="sm" icon={Trash2} className="text-red-500" onClick={() => handleDelete(goal)} />
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner message="Loading performance goals..." />;
  if (error) return <ErrorState title="Error Loading Goals" message={(error as Error).message} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Performance Goals</h1>
          <p className="text-muted-foreground">Manage and track performance targets for your teams and collectors.</p>
        </div>
        <Button icon={Plus} onClick={() => { setExistingGoal(undefined); setShowFormModal(true); }}>
          Create Goal
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={goals}
        getRowKey={(g) => g.id}
        title="Active Goals"
        emptyState={{
          icon: Target,
          title: 'No performance goals set',
          description: 'Start by creating a goal for a team or individual collector.',
          action: { label: 'Create First Goal', onClick: () => setShowFormModal(true) }
        }}
      />

      <GoalFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          queryClient.invalidateQueries({ queryKey: getGoalsControllerListGoalsQueryKey(orgId!) });
        }}
        existingGoal={editingGoal}
      />
    </div>
  );
}
