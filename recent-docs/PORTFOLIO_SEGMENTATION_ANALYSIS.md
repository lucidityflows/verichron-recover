# Portfolio Segmentation Page - Analysis & Action Plan

**Component**: `apps/ui-organizations/src/features/inventory/PortfolioSegmentation.tsx`
**Status**: ⚠️ PARTIALLY CONNECTED - Needs Modal & Button Wiring
**Date**: 2026-01-03

---

## ✅ What's Working

### 1. Backend API (api-workflows)
**Status**: ✅ FULLY IMPLEMENTED

**Endpoints Available**:
```
POST   /organizations/:orgId/workflows/auto-assignment          - Create config
GET    /organizations/:orgId/workflows/auto-assignment          - List configs
GET    /organizations/:orgId/workflows/auto-assignment/:id      - Get one config
PATCH  /organizations/:orgId/workflows/auto-assignment/:id      - Update config
DELETE /organizations/:orgId/workflows/auto-assignment/:id      - Delete config
PATCH  /organizations/:orgId/workflows/auto-assignment/:id/toggle - Toggle enabled
```

**Location**: `apps/api-workflows/src/auto-assignment/auto-assignment.controller.ts`

---

### 2. Frontend Data Layer
**Status**: ✅ FULLY CONNECTED

**Hook**: `apps/ui-organizations/src/features/strategy/hooks/useAutoAssignment.ts`

**Available Functions**:
```typescript
const {
  configs,               // AutoAssignmentConfigResponseDto[]
  isLoading,            // boolean
  createConfig,         // (data: CreateAutoAssignmentDto) => Promise
  isCreating,          // boolean
  toggleConfig,        // (configId: string) => Promise
  removeConfig,        // (configId: string) => Promise
} = useAutoAssignment();
```

**API Client**: Generated via Orval
- `apps/ui-organizations/src/api/generated/workflows/endpoints/auto-assignment/auto-assignment.ts`

---

### 3. Data Display
**Status**: ✅ WORKING

The component correctly:
- ✅ Fetches auto-assignment configurations
- ✅ Fetches portfolios list
- ✅ Displays configs as "segments"
- ✅ Shows loading states
- ✅ Displays config details (name, strategy, filters, enabled status, collector pool)
- ✅ Handles empty state
- ✅ Deletes configs (trash button functional)

---

## ❌ What's Missing

### Issue 1: **Create Segment Button Non-Functional** (CRITICAL)

**Location**: PortfolioSegmentation.tsx lines 69-73

**Current Code**:
```typescript
<button className="...">
  <Plus size={16} />
  Create Segment
</button>
```

**Problem**: No `onClick` handler - button does nothing

**What's Needed**: Modal to create new auto-assignment configuration

---

### Issue 2: **Edit Segment Button Non-Functional**

**Location**: PortfolioSegmentation.tsx line 158

**Current Code**:
```typescript
<button className="...">
  <Filter size={16} />
</button>
```

**Problem**: No `onClick` handler - button does nothing

**What's Needed**: Modal to edit existing configuration

---

### Issue 3: **Segmentation Coverage Calculation Missing**

**Location**: PortfolioSegmentation.tsx lines 99-100

**Current Code**:
```typescript
<span className="...">0 (0%)</span>
...
<div className="..." style={{ width: '0%' }} />
```

**Problem**: Hardcoded to 0% - should calculate based on filters

**What's Needed**: Logic to calculate % of portfolio covered by active segments

---

### Issue 4: **No Segment Detail/Edit View**

**Current State**: Clicking a segment config does nothing

**What's Needed**:
- Modal or slide-over panel to view/edit segment details
- Show full filters, collector pool, assignment stats
- Allow editing configuration

---

## 📊 Data Structure Reference

### CreateAutoAssignmentDto (Input)

```typescript
{
  name: string;                           // "High-Value Accounts"
  description?: string;                   // "Accounts > $5,000"
  enabled: boolean;                       // true
  strategy: AutoAssignmentStrategy;       // "ROUND_ROBIN" | "SKILL_BASED" | "WORKLOAD_BALANCED"

  filters: {
    portfolioIds?: string[];              // Filter by specific portfolios
    balanceRange?: [number, number];      // [min, max] e.g. [5000, 50000]
    accountAgeRange?: [number, number];   // [min, max] in days
    priority?: string[];                  // ["HIGH", "MEDIUM"]
    [key: string]: any;                   // Custom filters
  };

  collectorPool: string[];                // UUID array of collector IDs
  excludeCollectors?: string[];           // UUIDs to exclude
  maxAssignmentsPerDay?: number;          // 50
  workloadThreshold?: number;             // 200 active accounts max
  delayMinutes?: number;                  // 1440 = wait 1 day
}
```

### AutoAssignmentConfigResponseDto (Output)

```typescript
{
  id: string;                    // UUID
  organizationId: string;        // UUID
  name: string;
  description?: string;
  enabled: boolean;
  strategy: string;              // "ROUND_ROBIN" etc.
  filters: { ... };              // Same as above
  collectorPool: string[];
  excludeCollectors?: string[];
  maxAssignmentsPerDay?: number;
  workloadThreshold?: number;
  delayMinutes?: number;
  createdAt: string;             // ISO datetime
  updatedAt: string;             // ISO datetime
}
```

---

## 🎯 Action Plan

### Phase 1: Create Segment Modal (HIGH PRIORITY) - 2 hours

**Goal**: Enable users to create new auto-assignment configurations

**Files to Create/Modify**:
1. `apps/ui-organizations/src/features/strategy/components/CreateSegmentModal.tsx` (NEW)
2. `apps/ui-organizations/src/features/inventory/PortfolioSegmentation.tsx` (UPDATE)

**Modal Requirements**:
```typescript
interface CreateSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolios: Portfolio[];        // For portfolio selection in filters
  collectors: Collector[];        // For collector pool selection
}
```

**Form Fields**:
1. **Basic Info**:
   - Name (text input)
   - Description (textarea, optional)
   - Enabled (checkbox)

2. **Strategy Selection** (radio buttons):
   - Round Robin
   - Skill Based
   - Workload Balanced

3. **Filters** (dynamic):
   - Portfolio IDs (multi-select)
   - Balance Range (min/max inputs)
   - Account Age Range (min/max inputs)
   - Priority (multi-select: HIGH, MEDIUM, LOW)

4. **Collector Pool**:
   - Multi-select collector IDs
   - Option to exclude specific collectors

5. **Advanced Settings** (collapsible):
   - Max Assignments Per Day (number input)
   - Workload Threshold (number input)
   - Delay Minutes (number input)

**Implementation**:
```typescript
// CreateSegmentModal.tsx
export const CreateSegmentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createConfig, isCreating } = useAutoAssignment();
  const [formData, setFormData] = useState<CreateAutoAssignmentDto>({...});

  const handleSubmit = async () => {
    await createConfig(formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Form fields */}
    </Modal>
  );
};
```

**Wire to PortfolioSegmentation**:
```typescript
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

// Update button (line 69)
<button onClick={() => setIsCreateModalOpen(true)}>
  <Plus size={16} />
  Create Segment
</button>

// Render modal
{isCreateModalOpen && (
  <CreateSegmentModal
    isOpen={isCreateModalOpen}
    onClose={() => setIsCreateModalOpen(false)}
    portfolios={portfolios}
    collectors={collectors} // Need to fetch collectors list
  />
)}
```

---

### Phase 2: Edit Segment Modal (MEDIUM PRIORITY) - 1.5 hours

**Goal**: Enable editing existing configurations

**Files to Create/Modify**:
1. `apps/ui-organizations/src/features/strategy/components/EditSegmentModal.tsx` (NEW)
2. `apps/ui-organizations/src/features/inventory/PortfolioSegmentation.tsx` (UPDATE)

**Modal Requirements**:
- Same form as CreateSegmentModal
- Pre-populate with existing config data
- Use `updateConfig` mutation instead of `createConfig`

**Implementation**:
```typescript
const { updateConfig } = useAutoAssignmentControllerUpdate();

const handleUpdate = async (configId: string, data: UpdateAutoAssignmentDto) => {
  await updateConfig({ organizationId, configId, data });
};
```

---

### Phase 3: Segmentation Coverage Calculation (LOW PRIORITY) - 1 hour

**Goal**: Show accurate % of portfolio covered by segments

**Calculation Logic**:
```typescript
// Simplified approach:
const calculateCoverage = (configs: Config[], portfolio: Portfolio) => {
  if (!portfolio || configs.length === 0) return 0;

  // Count unique debts matched by any enabled filter
  const matchedCount = configs
    .filter(c => c.enabled)
    .reduce((total, config) => {
      // Apply filters to portfolio.debtCount
      // This requires backend support or full debt list
      return total + estimateMatchCount(config.filters, portfolio);
    }, 0);

  return Math.min(100, (matchedCount / portfolio.debtCount) * 100);
};
```

**Challenge**: Requires either:
1. Backend endpoint to calculate coverage: `GET /portfolios/:id/segmentation-coverage`
2. Client-side filtering (only works with full debt list)

**Recommendation**: Add backend endpoint for accurate calculation

---

### Phase 4: Collector Pool Management (MEDIUM PRIORITY) - 1 hour

**Goal**: Enable selection of collectors for auto-assignment pool

**What's Needed**:
1. Fetch collectors list from api-collectors
2. Multi-select component for collector pool
3. Display collector names (not just IDs) in segment cards

**API Endpoint** (check if exists):
```
GET /organizations/:orgId/collectors
```

**Hook to Create**:
```typescript
// apps/ui-organizations/src/features/roster/hooks/useCollectors.ts
export const useCollectors = () => {
  const { organizationId } = useUser();
  return useQuery({
    queryKey: ['collectors', organizationId],
    queryFn: () => collectorsControllerFindAll(organizationId!),
    enabled: !!organizationId,
  });
};
```

---

## 🐛 Known Issues

### Issue 1: `removeConfig` Type Mismatch

**Location**: `useAutoAssignment.ts` line 39

**Current**:
```typescript
removeConfig: removeMutation.mutateAsync,
```

**Problem**: Component passes only `configId`, but mutation expects `{ organizationId, configId }`

**Fix**:
```typescript
removeConfig: (configId: string) =>
  removeMutation.mutateAsync({ organizationId: organizationId!, configId }),
```

---

### Issue 2: Missing Toast Notifications

**Problem**: No user feedback after create/update/delete actions

**Fix**: Add toast notifications to mutations
```typescript
const { success, error } = useToast();

createMutation: {
  onSuccess: () => {
    success('Segment Created', 'Auto-assignment configuration created successfully.');
  },
  onError: (err) => {
    error('Creation Failed', err.message);
  }
}
```

---

### Issue 3: Filter Display Format

**Location**: PortfolioSegmentation.tsx line 142

**Current**:
```typescript
<div className="...">
  {config.strategy} • {JSON.stringify(config.filters)}
</div>
```

**Problem**: `JSON.stringify` is not user-friendly

**Fix**: Create filter summary component
```typescript
const FilterSummary: React.FC<{ filters: Filters }> = ({ filters }) => {
  const parts = [];

  if (filters.portfolioIds?.length > 0)
    parts.push(`${filters.portfolioIds.length} portfolio(s)`);
  if (filters.balanceRange)
    parts.push(`$${filters.balanceRange[0].toLocaleString()}-$${filters.balanceRange[1].toLocaleString()}`);
  if (filters.priority?.length > 0)
    parts.push(filters.priority.join(', '));

  return <span>{parts.join(' • ')}</span>;
};
```

---

## 📝 Implementation Checklist

### Must-Have (Before Production)
- [ ] Create `CreateSegmentModal` component
- [ ] Wire "Create Segment" button to modal
- [ ] Fetch collectors list for pool selection
- [ ] Fix `removeConfig` type mismatch
- [ ] Add toast notifications for all mutations
- [ ] Improve filter display (replace JSON.stringify)
- [ ] Handle loading/error states in modal

### Should-Have (Next Sprint)
- [ ] Create `EditSegmentModal` component
- [ ] Wire edit button to modal
- [ ] Calculate real segmentation coverage %
- [ ] Add segment detail view/panel
- [ ] Display collector names (not IDs)
- [ ] Add toggle switch for enabled/disabled status
- [ ] Add confirmation dialog for delete action

### Nice-to-Have (Future)
- [ ] Segment preview (show sample debts that match filters)
- [ ] Assignment history/analytics per segment
- [ ] Duplicate segment feature
- [ ] Import/export segment configurations
- [ ] Bulk enable/disable segments

---

## 🔧 Quick Start Implementation

### Step 1: Fix removeConfig Hook (5 minutes)

**File**: `apps/ui-organizations/src/features/strategy/hooks/useAutoAssignment.ts`

```typescript
// Line 39 - UPDATE
removeConfig: (configId: string) =>
  removeMutation.mutateAsync({ organizationId: organizationId!, configId }),
```

---

### Step 2: Add Toast Notifications (10 minutes)

**File**: `apps/ui-organizations/src/features/strategy/hooks/useAutoAssignment.ts`

```typescript
import { useToast } from '@/shared/hooks';

export const useAutoAssignment = () => {
  const { success, error: toastError } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: CreateAutoAssignmentDto) =>
      autoAssignmentControllerCreate(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoAssignment', organizationId] });
      success('Segment Created', 'Auto-assignment configuration created successfully.');
    },
    onError: (err: any) => {
      toastError('Creation Failed', err.message || 'Failed to create segment.');
    }
  });

  // Similar for toggleMutation and removeMutation
};
```

---

### Step 3: Create Basic Modal (30 minutes)

See detailed implementation in **IMPLEMENTATION_GUIDE.md** (to be created)

---

## 🎨 UI/UX Recommendations

### 1. Visual Improvements
- Add color coding for different strategies (Round Robin = blue, Skill-Based = green, etc.)
- Show enabled/disabled status with toggle switch instead of text
- Add assignment count badge (e.g., "127 assignments today")

### 2. User Experience
- Add filter preview: "Matches ~45 accounts" when creating segment
- Show last assignment timestamp
- Add "Test Assignment" button to preview which collector would get next assignment

### 3. Performance
- Lazy load collector list (only fetch when modal opens)
- Debounce search if adding collector search
- Cache segment calculations

---

## 🚀 Priority Order

1. **Fix removeConfig bug** (5 min) ⚡
2. **Add toast notifications** (10 min) ⚡
3. **Create CreateSegmentModal** (2 hours) 🔥
4. **Wire Create button** (5 min) ⚡
5. **Improve filter display** (30 min)
6. **Fetch collectors list** (30 min)
7. **Create EditSegmentModal** (1.5 hours)
8. **Calculate coverage %** (1 hour)

**Total Time to Fully Functional**: ~5.5 hours

---

## 📚 Additional Resources

- **Backend API Docs**: Check OpenAPI spec at `http://localhost:3009/api/docs`
- **Auto-Assignment Strategy Enum**: `packages/enums/src/workflows/auto-assignment-strategy.enum.ts`
- **Similar Modal Example**: `apps/ui-organizations/src/features/inventory/components/ImportJobDetailModal.tsx`

---

## ✅ Success Criteria

After implementation:
1. ✅ Users can create new auto-assignment configurations via modal
2. ✅ Users can edit existing configurations
3. ✅ Users can delete configurations with confirmation
4. ✅ Users see toast notifications for all actions
5. ✅ Filter display is human-readable
6. ✅ Collector names are shown (not IDs)
7. ✅ Loading and error states handled gracefully
8. ✅ Coverage % calculated accurately

---

**Next Steps**: Would you like me to implement the CreateSegmentModal first, or would you prefer to start with the quick fixes (removeConfig + toasts)?
