import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, Save, Clock, ShieldCheck, Mail, Smartphone, Bell, 
  UserPlus, Zap, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, 
  AlertCircle, Search, LayoutTemplate, MoreVertical, Loader2, Copy,
  CheckCircle2, XCircle, Settings2
} from 'lucide-react';
import { useSettlementStrategy } from './hooks/useSettlementStrategy.js';
import { AuditActionDrawer, AuditImpact } from '@/shared/components';
import { useWorkflowRulesControllerFindAll, useWorkflowRulesControllerUpdate, useWorkflowRulesControllerCreate, useWorkflowRulesControllerToggle, useWorkflowRulesControllerRemove } from '@/api/generated/workflows/endpoints/workflow-rules/workflow-rules';
import { useTemplatesControllerFindAll } from '@/api/generated/communications/endpoints/communication-templates/communication-templates';
import { 
  CreateWorkflowRuleDtoTriggerType, 
  CreateWorkflowRuleDtoPriority,
  WorkflowActionDtoType,
  WorkflowPriority
} from '@/api/generated/workflows_models';
import { ActionType } from '@/api/generated/collectors_models';
import { useUser } from '@/shared/store/userStore';
import { cn } from '@/shared/utils/cn';
import { toast } from 'sonner';

interface DunningStep {
  id: string;
  type: WorkflowActionDtoType;
  order: number;
  config: {
    delayDays: number;
    templateId?: string;
    templateName?: string;
    taskType?: ActionType;
    priority?: WorkflowPriority;
    dueDateOffset?: number;
    description?: string;
    [key: string]: any;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: CreateWorkflowRuleDtoTriggerType;
  steps: DunningStep[];
  raw?: any;
}

/**
 * WorkflowBuilder
 * Fully-wired UI connected to api-workflows and api-communications using Orval types.
 */
export const WorkflowBuilder: React.FC = () => {
  const { organizationId } = useUser();
  
  // API Queries
  const { data: rulesData, isLoading: isLoadingRules, refetch: refetchRules } = useWorkflowRulesControllerFindAll(organizationId!);
  const { data: commTemplatesData, isLoading: isLoadingTemplates } = useTemplatesControllerFindAll(organizationId!, {});
  
  // API Mutations
  const updateRule = useWorkflowRulesControllerUpdate();
  const createRule = useWorkflowRulesControllerCreate();
  const removeRule = useWorkflowRulesControllerRemove();

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Local state for the workflows being edited
  const [localWorkflows, setLocalWorkflows] = useState<Workflow[]>([]);

  // Refs for closing menus
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Sync local state when rules data loads
  useEffect(() => {
    if (rulesData?.data) {
      const mapped = rulesData.data.map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description || '',
        isActive: rule.enabled,
        triggerType: rule.triggerType as CreateWorkflowRuleDtoTriggerType,
        steps: rule.actions.map((action: any) => ({
          id: action.id,
          type: action.type as WorkflowActionDtoType,
          order: action.order,
          config: {
            delayDays: action.config?.delayDays ?? action.config?.delay ?? 0,
            templateId: action.config?.templateId,
            templateName: action.config?.templateName || 'Standard Notice',
            taskType: action.config?.taskType,
            priority: action.config?.priority,
            dueDateOffset: action.config?.dueDateOffset,
            description: action.config?.description,
            ...action.config
          }
        })).sort((a: any, b: any) => a.order - b.order),
        raw: rule
      }));
      setLocalWorkflows(mapped);
      
      if (mapped.length > 0 && !selectedWorkflowId) {
        setSelectedWorkflowId(mapped[0].id);
      }
    }
  }, [rulesData, selectedWorkflowId]);

  const activeWorkflow = localWorkflows.find(w => w.id === selectedWorkflowId);

  // Helper to update local workflow state
  const updateActiveWorkflow = (updater: (w: Workflow) => Workflow) => {
    if (!activeWorkflow) return;
    const updated = updater({ ...activeWorkflow });
    setLocalWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
  };

  // --- Actions ---

  const handleAddNewWorkflow = async () => {
    try {
      const newRuleData = {
        name: 'New Dunning Strategy',
        description: 'Automated dunning sequence for collections.',
        triggerType: CreateWorkflowRuleDtoTriggerType.DEBT_CREATED,
        priority: CreateWorkflowRuleDtoPriority.MEDIUM,
        enabled: false,
        conditions: [],
        actions: []
      };

      const result = await createRule.mutateAsync({
        organizationId: organizationId!,
        data: newRuleData
      });

      toast.success('New workflow created');
      refetchRules();
      setSelectedWorkflowId((result as any).data.id);
      setIsEditing(true);
    } catch (err) {
      toast.error('Failed to create new workflow');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await removeRule.mutateAsync({ organizationId: organizationId!, ruleId: id });
      toast.success('Workflow deleted');
      if (selectedWorkflowId === id) setSelectedWorkflowId(null);
      refetchRules();
    } catch (err) {
      toast.error('Failed to delete workflow');
    }
  };

  const handleDuplicateWorkflow = async (wf: Workflow) => {
    try {
      const duplicateData = {
        name: `${wf.name} (Copy)`,
        description: wf.description,
        triggerType: wf.triggerType,
        priority: (wf.raw?.priority as CreateWorkflowRuleDtoPriority) || CreateWorkflowRuleDtoPriority.MEDIUM,
        enabled: false,
        conditions: wf.raw?.conditions || [],
        actions: wf.steps.map(s => ({
          id: window.crypto.randomUUID(),
          type: s.type,
          order: s.order,
          config: s.config
        }))
      };

      const result = await createRule.mutateAsync({
        organizationId: organizationId!,
        data: duplicateData
      });

      toast.success('Workflow duplicated');
      refetchRules();
      setSelectedWorkflowId((result as any).data.id);
    } catch (err) {
      toast.error('Failed to duplicate workflow');
    }
  };

  const handleSave = () => {
    setShowAuditDrawer(true);
  };

  const handleConfirmChange = async (reason: string, comment: string) => {
    if (!activeWorkflow) return;

    try {
      await updateRule.mutateAsync({
        organizationId: organizationId!,
        ruleId: activeWorkflow.id,
        data: {
          name: activeWorkflow.name,
          description: activeWorkflow.description,
          triggerType: activeWorkflow.triggerType,
          actions: activeWorkflow.steps.map(s => ({
            id: s.id,
            type: s.type,
            order: s.order,
            config: s.config
          }))
        }
      });

      toast.success('Workflow published successfully');
      setIsEditing(false);
      setShowAuditDrawer(false);
      refetchRules();
    } catch (err) {
      console.error('Failed to save workflow:', err);
      toast.error('Failed to publish workflow changes');
    }
  };

  const handleAddAction = (type: WorkflowActionDtoType) => {
    if (!activeWorkflow) return;
    
    const defaultConfig: any = { delayDays: 3 };
    
    if (type === WorkflowActionDtoType.SEND_EMAIL) {
      defaultConfig.templateName = 'Standard Notice';
    } else if (type === WorkflowActionDtoType.CREATE_TASK) {
      defaultConfig.taskType = ActionType.CALL;
      defaultConfig.priority = WorkflowPriority.MEDIUM;
      defaultConfig.dueDateOffset = 1;
    }

    const newStep: DunningStep = {
      id: window.crypto.randomUUID(),
      type,
      order: activeWorkflow.steps.length + 1,
      config: defaultConfig
    };
    
    updateActiveWorkflow(w => ({
      ...w,
      steps: [...w.steps, newStep]
    }));
    setSelectedStepId(newStep.id);
    setShowTypeSelector(false);
  };

  const handleSelectTemplate = (template: any) => {
    if (!selectedStepId || !activeWorkflow) return;
    
    updateActiveWorkflow(w => ({
      ...w,
      steps: w.steps.map(s => 
        s.id === selectedStepId 
          ? { 
              ...s, 
              config: { 
                ...s.config, 
                templateId: template.id, 
                templateName: template.name 
              } 
            } 
          : s
      )
    }));
    setShowTemplatePicker(false);
  };

  // Step Manipulation
  const updateStepDelay = (id: string, newDelay: number) => {
    updateActiveWorkflow(w => ({
      ...w,
      steps: w.steps.map(s => s.id === id ? { ...s, config: { ...s.config, delayDays: newDelay } } : s)
    }));
  };

  const updateStepConfig = (id: string, key: string, value: any) => {
    updateActiveWorkflow(w => ({
      ...w,
      steps: w.steps.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s)
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (!activeWorkflow) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === activeWorkflow.steps.length - 1) return;
    
    const newSteps = [...activeWorkflow.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    updateActiveWorkflow(w => ({
      ...w,
      steps: newSteps.map((s, i) => ({ ...s, order: i + 1 }))
    }));
  };

  const deleteStep = (id: string) => {
    updateActiveWorkflow(w => ({
      ...w,
      steps: w.steps.filter(s => s.id !== id)
    }));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const selectedStep = activeWorkflow?.steps.find(s => s.id === selectedStepId);

  const getActionIcon = (type: WorkflowActionDtoType) => {
    switch (type) {
      case WorkflowActionDtoType.SEND_EMAIL: return Mail;
      case WorkflowActionDtoType.CREATE_TASK: return Bell;
      case WorkflowActionDtoType.ASSIGN_TO_COLLECTOR: return UserPlus;
      case WorkflowActionDtoType.SEND_NOTIFICATION: return Zap;
      default: return Zap;
    }
  };

  const formatActionName = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoadingRules) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Strategy</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Workflows</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workflow Builder</h1>
        </div>

        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors active:scale-95"
          >
            <ShieldCheck size={16} />
            Edit Workflows
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors active:scale-95"
            >
              <Save size={16} />
              Publish All
            </button>
          </div>
        )}
      </header>

      {/* Main Layout - 3 Panes */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 pb-6">
        
        {/* Pane 1: Workflow Library */}
        <div className="col-span-12 md:col-span-3 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <LayoutTemplate size={14} />
              Library
            </h3>
            <button 
              onClick={handleAddNewWorkflow}
              className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-1">
            {localWorkflows.map(wf => (
              <div 
                key={wf.id}
                onClick={() => setSelectedWorkflowId(wf.id)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer border transition-all group relative",
                  selectedWorkflowId === wf.id 
                    ? "bg-primary/5 border-primary/30 shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-muted hover:border-border"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={cn(
                    "text-sm font-bold truncate pr-6", 
                    selectedWorkflowId === wf.id ? "text-primary" : "text-foreground"
                  )}>
                    {wf.name}
                  </span>
                  {wf.isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {wf.description}
                </p>
                
                {/* Context Menu Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(showMoreMenu === wf.id ? null : wf.id);
                  }}
                  className="absolute top-2 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted-foreground/10"
                >
                  <MoreVertical size={14} />
                </button>

                {/* More Menu Dropdown */}
                {showMoreMenu === wf.id && (
                  <div 
                    ref={moreMenuRef}
                    className="absolute right-2 top-8 w-32 bg-card border border-border rounded-md shadow-xl z-50 py-1"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDuplicateWorkflow(wf); setShowMoreMenu(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted transition-colors"
                    >
                      <Copy size={12} /> Duplicate
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); setShowMoreMenu(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-error/10 text-error transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pane 2: Builder Canvas */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-4">
          {activeWorkflow ? (
            <>
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Zap size={18} />
                      </div>
                      <div className="space-y-1">
                        {isEditing ? (
                          <input 
                            value={activeWorkflow.name}
                            onChange={(e) => updateActiveWorkflow(w => ({ ...w, name: e.target.value }))}
                            className="text-sm font-bold bg-transparent border-b border-dashed border-muted-foreground/50 focus:border-primary focus:outline-none w-64"
                          />
                        ) : (
                          <h3 className="text-sm font-bold text-foreground">{activeWorkflow.name}</h3>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {activeWorkflow.steps.length} Actions in Sequence
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Settings2 size={10} /> Triggering Event
                      </label>
                      {isEditing ? (
                        <select 
                          className="w-full bg-muted border-none rounded-md px-2 py-1 text-[11px] font-bold focus:ring-1 focus:ring-primary"
                          value={activeWorkflow.triggerType}
                          onChange={(e) => updateActiveWorkflow(w => ({ ...w, triggerType: e.target.value as CreateWorkflowRuleDtoTriggerType }))}
                        >
                          {Object.values(CreateWorkflowRuleDtoTriggerType).map(type => (
                            <option key={type} value={type}>{formatActionName(type)}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-2 py-1 bg-muted rounded-md text-[11px] font-bold text-foreground w-fit">
                          {formatActionName(activeWorkflow.triggerType)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-muted/20 border border-border rounded-xl p-6 overflow-y-auto custom-scrollbar relative min-h-[400px]">
                <div className="max-w-xl mx-auto relative pb-20">
                  <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-border -z-10" />

                  {activeWorkflow.steps.map((step, index) => {
                    const Icon = getActionIcon(step.type);
                    const isSelected = selectedStepId === step.id;

                    return (
                      <div key={step.id} className="mb-6 group relative">
                        <div className="absolute -top-3 left-[1.6rem] bg-background border border-border px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-sm">
                          <Clock size={10} className="text-muted-foreground" />
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="w-6 p-0 text-[10px] font-bold text-center border-none bg-transparent focus:ring-0"
                              value={step.config.delayDays}
                              onChange={(e) => updateStepDelay(step.id, Number(e.target.value))}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">+{step.config.delayDays}d</span>
                          )}
                        </div>

                        <div 
                          onClick={() => setSelectedStepId(step.id)}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer relative",
                            isSelected 
                              ? "bg-card border-primary shadow-md ring-1 ring-primary/20 scale-[1.01]" 
                              : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                            isSelected ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                          )}>
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                                <span className="text-sm font-bold text-foreground">{formatActionName(step.type)}</span>
                              </div>
                              {step.type === WorkflowActionDtoType.SEND_EMAIL && step.config.templateName && (
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
                                  {step.config.templateName}
                                </span>
                              )}
                              {step.type === WorkflowActionDtoType.CREATE_TASK && step.config.taskType && (
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
                                  {formatActionName(step.config.taskType)}
                                </span>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 border-l border-border">
                              <button 
                                onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }}
                                disabled={index === 0}
                                className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); moveStep(index, 'down'); }}
                                disabled={index === activeWorkflow.steps.length - 1}
                                className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                                className="p-1 hover:bg-error/10 text-error rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isEditing && (
                    <div className="relative">
                      {!showTypeSelector ? (
                        <button 
                          onClick={() => setShowTypeSelector(true)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all ml-2 max-w-[calc(100%-1rem)]"
                        >
                          <div className="h-10 w-10 rounded-full border-2 border-dashed border-inherit flex items-center justify-center">
                            <Plus size={18} />
                          </div>
                          <span className="text-sm font-bold">Add Action Step</span>
                        </button>
                      ) : (
                        <div className="ml-2 flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-lg animate-in fade-in zoom-in duration-200">
                          <button 
                            onClick={() => handleAddAction(WorkflowActionDtoType.SEND_EMAIL)}
                            className="flex-1 flex flex-col items-center gap-1 p-3 hover:bg-muted rounded-md transition-colors"
                          >
                            <Mail size={20} className="text-primary" />
                            <span className="text-[10px] font-bold uppercase">Email</span>
                          </button>
                          <button 
                            onClick={() => handleAddAction(WorkflowActionDtoType.CREATE_TASK)}
                            className="flex-1 flex flex-col items-center gap-1 p-3 hover:bg-muted rounded-md transition-colors"
                          >
                            <Bell size={20} className="text-primary" />
                            <span className="text-[10px] font-bold uppercase">Task</span>
                          </button>
                          <div className="w-px h-10 bg-border mx-1" />
                          <button 
                            onClick={() => setShowTypeSelector(false)}
                            className="p-2 hover:bg-muted rounded-full"
                          >
                            <XCircle size={20} className="text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
               <p>Select a workflow to view details</p>
            </div>
          )}
        </div>

        {/* Pane 3: Inspector */}
        <div className="col-span-12 md:col-span-3 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden relative">
             <div className="p-4 border-b border-border bg-muted/10">
               <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inspector</h3>
             </div>

             {selectedStep ? (
               <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 text-primary">
                     <Clock size={16} />
                     <h4 className="text-sm font-bold">Timing</h4>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-muted-foreground uppercase">Delay Days</label>
                     <input 
                       type="number"
                       className="w-full bg-muted border border-border rounded px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary"
                       value={selectedStep.config.delayDays}
                       onChange={(e) => updateStepDelay(selectedStep.id, Number(e.target.value))}
                       disabled={!isEditing}
                     />
                   </div>
                 </div>

                 <div className="h-px bg-border" />

                 {selectedStep.type === WorkflowActionDtoType.SEND_EMAIL && (
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-primary">
                       <Mail size={16} />
                       <h4 className="text-sm font-bold">Template</h4>
                     </div>
                     <div className="p-3 rounded bg-muted/30 border border-border space-y-2">
                        <p className="text-xs font-bold text-foreground">
                          {selectedStep.config.templateName || 'Standard Notice'}
                        </p>
                        {isEditing && (
                          <button 
                            onClick={() => setShowTemplatePicker(true)}
                            className="text-[10px] text-primary hover:underline"
                          >
                            Select different template...
                          </button>
                        )}
                     </div>
                   </div>
                 )}

                 {selectedStep.type === WorkflowActionDtoType.CREATE_TASK && (
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                       <Bell size={16} />
                       <h4 className="text-sm font-bold">Task Details</h4>
                     </div>
                     
                     <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Task Type</label>
                          <select 
                            disabled={!isEditing}
                            value={selectedStep.config.taskType}
                            onChange={(e) => updateStepConfig(selectedStep.id, 'taskType', e.target.value)}
                            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary"
                          >
                            {Object.values(ActionType).map(type => (
                              <option key={type} value={type}>{formatActionName(type)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Priority</label>
                          <select 
                            disabled={!isEditing}
                            value={selectedStep.config.priority}
                            onChange={(e) => updateStepConfig(selectedStep.id, 'priority', e.target.value)}
                            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary"
                          >
                            {Object.values(WorkflowPriority).map(priority => (
                              <option key={priority} value={priority}>{formatActionName(priority)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Due Date Offset (Days)</label>
                          <input 
                            type="number"
                            disabled={!isEditing}
                            value={selectedStep.config.dueDateOffset}
                            onChange={(e) => updateStepConfig(selectedStep.id, 'dueDateOffset', Number(e.target.value))}
                            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary"
                          />
                        </div>
                     </div>
                   </div>
                 )}

                 <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
                   <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-tight">
                     Check state laws for contact frequency limits.
                   </p>
                 </div>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground opacity-50">
                 <GripVertical size={32} className="mb-2" />
                 <p className="text-xs font-medium">Select a step to configure</p>
               </div>
             )}

             {/* Template Picker Overlay */}
             {showTemplatePicker && (
               <div className="absolute inset-0 bg-background z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
                 <div className="p-4 border-b border-border flex items-center justify-between">
                   <h4 className="text-xs font-bold uppercase tracking-widest">Select Template</h4>
                   <button onClick={() => setShowTemplatePicker(false)}><XCircle size={18} /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-1">
                   {isLoadingTemplates ? (
                     <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                   ) : (commTemplatesData as any)?.data?.map((tpl: any) => (
                     <button
                       key={tpl.id}
                       onClick={() => handleSelectTemplate(tpl)}
                       className="w-full text-left p-2 rounded hover:bg-muted text-xs transition-colors border border-transparent hover:border-border"
                     >
                       <div className="font-bold">{tpl.name}</div>
                       <div className="text-[10px] text-muted-foreground uppercase">{tpl.type}</div>
                     </button>
                   ))}
                 </div>
               </div>
             )}
        </div>

      </div>

      <AuditActionDrawer 
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        onConfirm={handleConfirmChange}
        title="Publish Workflow Updates"
        description="Verify the impact of the updated dunning sequences."
        impacts={[{ label: 'Workflow Modified', previousValue: '-', newValue: activeWorkflow?.name || '', severity: 'INFO' }]}
        isSubmitting={updateRule.isPending}
      />
    </div>
  );
};