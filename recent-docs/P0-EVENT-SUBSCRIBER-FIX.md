● Perfect! I've completed a comprehensive strategic analysis and plan. The plan document now includes:

  Key Findings

  1. Your listener implementation is CORRECT - it IS calling super(PortfolioDebtorBatchReadyDto) as expected
  2. Primary suspect: Stale compiled files in packages/event-subscriber/dist/
  3. Long-term solution: Metadata-first architecture (as Gemini proposed) is the right approach

  Recommended Approach

  Two-Phase Strategy:
  - Phase 0 (30 min): Rebuild the event-subscriber package to test if it's a stale build issue
  - Phase 1-5 (12 hours): Implement metadata-first architecture regardless of Phase 0 outcome

  The metadata-first approach:
  - Stores DTO class in @EventSubscription decorator metadata
  - Eliminates reliance on constructor/instance properties
  - Follows exact NestJS patterns (same as @Controller, @UseGuards, etc.)
  - TypeScript-enforced at compile time
  - Immune to proxy wrapping and lifecycle issues

  The plan includes:
  - ✅ Detailed implementation steps for all phases
  - ✅ Migration pattern examples
  - ✅ Risk mitigation strategies
  - ✅ Testing checklist
  - ✅ Timeline estimates (~12 hours total)
  - ✅ Success criteria

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Implementation Plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Event Subscriber Architecture Fix: Strategic Analysis & Plan

 Executive Summary

 Problem: dtoClass property is undefined at runtime during Pub/Sub message processing, causing "Configuration Error: DTO class is not registered" failures.

 Root Cause (Updated):
 - Primary Suspect: Stale compiled files in packages/event-subscriber/dist/
 - Secondary: NestJS DI lifecycle issues, proxy wrapping with forwardRef(), instance-based property inheritance fragility

 Recommended Solution: Two-Phase Approach
 1. Phase 0 (Immediate): Rebuild event-subscriber package to test stale build hypothesis (~30 min)
 2. Phase 1-5 (Migration): Implement Metadata-First Architecture regardless of Phase 0 outcome (~12 hours)

 Why Metadata-First?
 - ✅ Follows NestJS patterns (same as @Controller, @UseGuards, etc.)
 - ✅ Type-safe at compile time
 - ✅ Immune to instance lifecycle issues
 - ✅ Prevents future stale build problems

 Confidence Level: ⭐⭐⭐⭐⭐ (High - aligns with NestJS best practices + addresses immediate issue)

 ---
 Quick Reference

 Current Failure

 Error: Configuration Error: DTO class is not registered on PortfolioDebtorBatchReadyListener.
 Ensure it is passed to super() in the constructor.

 Location: base-listener.abstract.js:56 (Docker container)
 Listener: /apps/api-debtors/src/imports/listeners/portfolio-debtor-batch-ready.listener.ts
 Status: Listener IS calling super(PortfolioDebtorBatchReadyDto) correctly ✅

 Critical Files to Modify

 packages/event-subscriber/src/
 ├── decorators/event-subscription.decorator.ts  [Phase 1 - Add dto parameter]
 ├── subscriber-discovery.service.ts             [Phase 2 - Extract DTO from metadata]
 ├── base-listener.abstract.ts                   [Phase 3 - Accept DTO as parameter]

 apps/*/src/**/listeners/*.listener.ts            [Phase 4 - Move DTO to decorator]
 └── ~50 files across 8 apps

 Migration Pattern

 // ❌ BEFORE (instance-based)
 @Injectable()
 export class MyListener extends AbstractBaseListener<MyDto> {
   constructor(private readonly service: MyService) {
     super(MyDto);  // ← Instance property assignment
   }

   @EventSubscription({ topicName: EVENT_TOPICS.X })
   async onMessage(data: MyDto, envelope: EventEnvelope) { }
 }

 // ✅ AFTER (metadata-based)
 @Injectable()
 export class MyListener extends AbstractBaseListener<MyDto> {
   constructor(private readonly service: MyService) {
     super();  // ← No DTO parameter
   }

   @EventSubscription({
     topicName: EVENT_TOPICS.X,
     dto: MyDto  // ← Stored in decorator metadata
   })
   async onMessage(data: MyDto, envelope: EventEnvelope) { }
 }

 ---
 Current Architecture Analysis

 Data Flow Breakdown

 Pub/Sub Message → SubscriberDiscoveryService.messageHandler()
                  → instanceof AbstractBaseListener check
                  → instance.__executeStandardizedFlow(envelope, methodName)
                  → Check this._internalDtoClass (❌ FAILS HERE)
                  → Transform/Validate with DTO
                  → Call actual handler method

 Critical Files

 | File                                                                     | Purpose                                          | Issue Impact                       |
 |--------------------------------------------------------------------------|--------------------------------------------------|------------------------------------|
 | packages/event-subscriber/src/base-listener.abstract.ts                  | Core validation flow, stores _internalDtoClass   | ⭐⭐⭐⭐⭐ (Direct failure point)  |
 | packages/event-subscriber/src/subscriber-discovery.service.ts            | Discovers listeners, retrieves instances from DI | ⭐⭐⭐⭐ (Instance retrieval)      |
 | packages/event-subscriber/src/decorators/event-subscription.decorator.ts | Marks methods as handlers                        | ⭐⭐⭐⭐⭐ (Solution point)        |
 | packages/event-subscriber/README.md                                      | Documentation                                    | ⭐⭐⭐ (Contains outdated pattern) |

 Why Instance-Based Storage Fails

 1. NestJS Proxy Wrapping: forwardRef() usage in api-automations/events.module.ts may create proxy instances where private fields are inaccessible
 2. Constructor Timing: Even with super(DtoClass) correctly called, NestJS lifecycle hooks (interceptors, guards, middleware) can interrupt initialization
 3. TypeScript Class Fields: useDefineForClassFields: true in tsconfig.json uses ECMAScript semantics that can cause field shadowing
 4. Async Discovery: SubscriberDiscoveryService.onModuleInit() runs discovery asynchronously with .catch(), potentially accessing incomplete instances

 ---
 Solution Evaluation: Metadata-First Architecture

 Gemini's Proposal

 Core Concept: Move DTO class registration from instance property (this._internalDtoClass) to decorator metadata (@EventSubscription({ dto: XDto })).

 Why This Works

 1. Metadata is Load-Time, Not Runtime

 // ✅ Metadata attached during class loading (before any instances exist)
 @EventSubscription({
   topicName: EVENT_TOPICS.DEBTS,
   dto: PortfolioDebtorBatchReadyDto  // Stored in Reflect metadata
 })
 async onMessage(data: PortfolioDebtorBatchReadyDto, envelope: EventEnvelope) {
   // ...
 }

 Metadata Lifecycle:
 - Attached when TypeScript decorator runs during module load
 - Stored on method prototype via Reflect.defineMetadata
 - Accessible via Reflect.getMetadata at any time
 - Completely immune to instance creation, proxying, or DI lifecycle

 2. NestJS Pattern Alignment

 This is the exact same pattern NestJS uses for:
 - @Controller() routes → stores route metadata
 - @UseGuards() → stores guard metadata
 - @SetMetadata() → generic metadata storage
 - @ApiProperty() from Swagger → stores schema metadata

 Example from NestJS Core:
 // How NestJS itself handles route metadata
 @Get('/users')  // ← Stores path in metadata
 getUserList() { }

 The SubscriberDiscoveryService already uses this pattern:
 // Line 49: Scanning for @EventSubscription metadata
 const metadata = Reflect.getMetadata('verichron:event_subscriber', wrapper.metatype.prototype, propertyName);

 3. Type Safety Enforcement

 Current (Weak Enforcement):
 // Developer can forget to call super()
 class MyListener extends AbstractBaseListener<MyDto> {
   constructor() {
     super();  // ❌ Forgot to pass MyDto - only fails at runtime
   }
 }

 Metadata-First (Strong Enforcement):
 // TypeScript enforces dto property at compile time
 interface EventSubscriptionOptions<T> {
   topicName: string;
   dto: new () => T;  // ← REQUIRED by TypeScript
   eventType?: string;
 }

 @EventSubscription({
   topicName: EVENT_TOPICS.DEBTS,
   // ❌ TypeScript error: Property 'dto' is missing
 })

 ---
 Proposed Implementation Strategy

 Phase 1: Decorator Update (Low Risk)

 File: packages/event-subscriber/src/decorators/event-subscription.decorator.ts

 Changes:
 export interface EventSubscriptionOptions<T = any> {
   topicName: string;
   subscriptionName?: string;
   eventType?: string;
   dto: new () => T;  // ← NEW: Mandatory DTO class
 }

 export function EventSubscription<T>(options: EventSubscriptionOptions<T>) {
   return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
     // Store both existing metadata AND the DTO class
     const metadata = {
       topicName: options.topicName,
       subscriptionName: options.subscriptionName,
       eventType: options.eventType,
       dtoClass: options.dto,  // ← NEW: Store DTO in metadata
     };

     Reflect.defineMetadata('verichron:event_subscriber', metadata, target, propertyName);
   };
 }

 Risk: 🟢 Low - Purely additive change, doesn't break existing code yet

 ---
 Phase 2: Discovery Service Update (Medium Risk)

 File: packages/event-subscriber/src/subscriber-discovery.service.ts

 Changes:

 // Line 102-140: Update message handler
 const messageHandler = async (message: Message) => {
   try {
     const envelope = this.parseEnvelope(message);

     // Extract DTO class from metadata (NEW)
     const metadata = Reflect.getMetadata(
       'verichron:event_subscriber',
       wrapper.metatype.prototype,
       methodName
     );
     const dtoClass = metadata?.dtoClass;

     if (!dtoClass) {
       throw new Error(
         `Configuration Error: DTO class not found in metadata for ${wrapper.name}.${methodName}. ` +
         `Ensure @EventSubscription decorator includes 'dto' property.`
       );
     }

     // Event type filtering (unchanged)
     if (subscriptionConfig.eventType && envelope.eventType !== subscriptionConfig.eventType) {
       message.ack();
       return;
     }

     // Execute with DTO class passed as parameter (CHANGED)
     if (instance instanceof AbstractBaseListener) {
       await instance.__executeStandardizedFlow(envelope, methodName, dtoClass);  // ← Pass DTO here
     } else {
       await instance[methodName](envelope.data, envelope);
     }

     message.ack();
   } catch (error) {
     this.logger.error(`Error processing message`, error.stack);
     message.nack();
   }
 };

 Risk: 🟡 Medium - Changes execution flow, needs thorough testing

 ---
 Phase 3: AbstractBaseListener Refactor (High Risk)

 File: packages/event-subscriber/src/base-listener.abstract.ts

 Changes:

 export abstract class AbstractBaseListener<T> {
   protected logger: Logger;

   // ❌ REMOVE: No longer need instance field
   // private _internalDtoClass: new () => T;

   // ❌ REMOVE: No longer need constructor parameter
   constructor() {
     this.logger = new Logger(this.constructor.name);
   }

   /**
    * Standardized event processing flow with DTO class passed as parameter
    * @param envelope - The event envelope
    * @param methodName - Name of the handler method to invoke
    * @param dtoClass - DTO class for validation (from decorator metadata)
    */
   async __executeStandardizedFlow(
     envelope: EventEnvelope<T>,
     methodName: string,
     dtoClass: new () => T  // ← NEW: Accept DTO as parameter
   ): Promise<void> {
     const startTime = Date.now();
     const { eventType, correlationId, source, data } = envelope;

     this.logger.log(`📨 Received event`, {
       eventType,
       correlationId,
       source,
       handler: `${this.constructor.name}.${methodName}`,
     });

     try {
       // ✅ DTO class now guaranteed to exist (passed from metadata)
       const transformedData = plainToInstance(dtoClass, data, {
         excludeExtraneousValues: false,
         enableImplicitConversion: true,
       });

       const validationErrors = await validate(transformedData as object);
       if (validationErrors.length > 0) {
         throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
       }

       await this[methodName].call(this, transformedData, envelope);

       const duration = Date.now() - startTime;
       this.logger.log(`✅ Event processed successfully`, {
         eventType,
         correlationId,
         duration: `${duration}ms`,
       });
     } catch (error) {
       this.logger.error(`❌ Event processing failed`, {
         eventType,
         correlationId,
         error: error.message,
         stack: error.stack,
       });
       throw error;
     }
   }
 }

 Risk: 🔴 High - Breaks all existing listeners (requires simultaneous update)

 ---
 Phase 4: Listener Migration (High Risk)

 Files: All listener implementations across apps

 Pattern Change:

 // ❌ BEFORE
 @Injectable()
 export class ExecuteAutoAssignmentListener extends AbstractBaseListener<ExecuteAutoAssignmentDto> {
   constructor(private readonly autoAssignmentService: AutoAssignmentService) {
     super(ExecuteAutoAssignmentDto);  // ← Remove DTO from constructor
   }

   @EventSubscription({
     topicName: EVENT_TOPICS.AUTOMATIONS,
     eventType: EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT,
   })
   async onMessage(data: ExecuteAutoAssignmentDto, envelope: EventEnvelope) {
     // ...
   }
 }

 // ✅ AFTER
 @Injectable()
 export class ExecuteAutoAssignmentListener extends AbstractBaseListener<ExecuteAutoAssignmentDto> {
   constructor(private readonly autoAssignmentService: AutoAssignmentService) {
     super();  // ← No DTO parameter
   }

   @EventSubscription({
     topicName: EVENT_TOPICS.AUTOMATIONS,
     eventType: EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT,
     dto: ExecuteAutoAssignmentDto,  // ← DTO moved to decorator
   })
   async onMessage(data: ExecuteAutoAssignmentDto, envelope: EventEnvelope) {
     // ...
   }
 }

 Risk: 🔴 High - Must update ~50+ listeners across all apps atomically

 ---
 Phase 5: Documentation & Cleanup (Low Risk)

 Files:
 - packages/event-subscriber/README.md - Update with new pattern
 - Remove outdated protected readonly dtoClass examples
 - Add migration guide for existing listeners

 Risk: 🟢 Low - Documentation only

 ---
 Migration Strategy

 Option A: Big Bang Migration ⚡ (Recommended)

 Approach: Single PR with all changes across packages

 Steps:
 1. Update decorator to make dto required
 2. Update discovery service to extract DTO from metadata
 3. Update base listener to accept DTO as parameter
 4. Update ALL listeners across all apps (scripted find/replace)
 5. Update README and tests
 6. Deploy atomically

 Pros:
 - ✅ Clean cutover, no interim state
 - ✅ No runtime compatibility issues
 - ✅ Forces complete fix

 Cons:
 - ❌ Large changeset (~50+ files)
 - ❌ High risk if testing incomplete
 - ❌ Blocks other work during migration

 Estimated Effort: 4-6 hours (scripted migration)

 ---
 Option B: Gradual Migration with Compatibility Layer 🐢

 Approach: Support both patterns simultaneously

 Steps:
 1. Make dto optional in decorator (backwards compatible)
 2. Update discovery service to try metadata first, fall back to instance property
 3. Update base listener constructor to accept optional DTO parameter
 4. Migrate listeners app-by-app over several PRs
 5. Remove compatibility layer after all listeners migrated

 Compatibility Logic:
 // In SubscriberDiscoveryService
 const dtoClass = metadata?.dtoClass || instance['_internalDtoClass'];
 if (!dtoClass) {
   throw new Error('DTO class not found in metadata or instance');
 }

 // In AbstractBaseListener
 constructor(dtoClass?: new () => T) {
   this.logger = new Logger(this.constructor.name);
   if (dtoClass) {
     this._internalDtoClass = dtoClass;  // Backwards compat
   }
 }

 Pros:
 - ✅ Lower risk per PR
 - ✅ Can test incrementally
 - ✅ Allows parallel work to continue

 Cons:
 - ❌ Temporary complexity (two code paths)
 - ❌ Longer migration timeline
 - ❌ Potential for incomplete migration

 Estimated Effort: 8-10 hours (multiple PRs + testing)

 ---
 Recommendation: Option A (Big Bang) with Safety Net

 Rationale

 1. TypeScript Enforcement: Once dto is required in decorator, TypeScript will immediately flag any listener missing it - no way to have incomplete migration
 2. Scripted Migration: This is a mechanical transformation that can be automated:
 # Example migration script
 find apps -name "*.listener.ts" | xargs sed -i \
   's/super(\(.*Dto\))/super()/' \
   's/@EventSubscription({/@EventSubscription({ dto: \1,/'
 3. Testing Coverage: All listeners follow identical pattern, so testing one validates the approach for all
 4. Clean Architecture: Avoids technical debt of compatibility layer

 Safety Net: Pre-Migration Validation

 Before starting migration:

 1. Add Debug Logging to current implementation to confirm root cause:
 // In base-listener.abstract.ts __executeStandardizedFlow
 this.logger.debug('DTO class check', {
   hasDtoClass: !!this._internalDtoClass,
   constructorName: this.constructor.name,
   isProxy: Object.getPrototypeOf(this) !== this.constructor.prototype,
 });
 2. Capture Runtime State: Run in staging/dev with logging enabled to see if instances are proxied
 3. Prototype Test: Create one test listener using metadata pattern, verify it works end-to-end before full migration

 ---
 Implementation Checklist

 Pre-Migration (Investigation)

 - Add debug logging to capture _internalDtoClass state at runtime
 - Run in dev/staging to capture actual failure conditions
 - Confirm if instances are NestJS proxies (check prototype chain)
 - Test prototype: Single listener using metadata pattern

 Phase 1: Package Update

 - Update EventSubscriptionOptions interface to require dto
 - Update @EventSubscription decorator to store dtoClass in metadata
 - Add tests for decorator metadata storage

 Phase 2: Discovery Service

 - Update SubscriberDiscoveryService to extract DTO from metadata
 - Pass DTO as third parameter to __executeStandardizedFlow
 - Add error if metadata missing
 - Add tests for metadata extraction

 Phase 3: Base Listener

 - Remove _internalDtoClass instance field
 - Remove dtoClass constructor parameter
 - Update __executeStandardizedFlow signature to accept DTO parameter
 - Update method to use parameter instead of instance field
 - Add tests for new execution flow

 Phase 4: Listener Migration

 - Create migration script (sed/awk or Node script)
 - Migrate listeners in api-automations (3 files)
 - Migrate listeners in api-collectors (12 files)
 - Migrate listeners in api-communications (11 files)
 - Migrate listeners in api-debtors (4 files)
 - Migrate listeners in api-debts (4 files)
 - Migrate listeners in api-organizations (2 files)
 - Migrate listeners in api-users (4 files)
 - Migrate listeners in api-workflows (6 files)
 - Verify all listeners compile

 Phase 5: Testing

 - Unit tests for each updated listener
 - Integration test: Publish event → Verify handler receives/validates DTO
 - E2E test: Full workflow with debt import
 - Staging deployment smoke test

 Phase 6: Documentation

 - Update packages/event-subscriber/README.md with new pattern
 - Remove outdated protected readonly dtoClass examples
 - Add migration guide section
 - Update inline code comments

 Phase 7: Deployment

 - Create single PR with all changes
 - Code review with focus on listener migrations
 - Deploy to staging
 - Monitor logs for "DTO class not found" errors
 - Deploy to production
 - Remove debug logging after 24h of stable operation

 ---
 Alternative Approaches Considered

 Alternative 1: Static Class Properties

 Proposal: Use static field instead of instance field
 abstract class AbstractBaseListener<T> {
   protected static readonly DTO_CLASS: new () => any;
 }

 class MyListener extends AbstractBaseListener<MyDto> {
   protected static readonly DTO_CLASS = MyDto;
 }

 Evaluation:
 - ❌ TypeScript doesn't support abstract static properties
 - ❌ Can't enforce implementation at compile time
 - ❌ Less idiomatic than metadata in NestJS
 - ✅ Would avoid instance lifecycle issues

 Verdict: Inferior to metadata approach

 ---
 Alternative 2: Decorator Factory Pattern

 Proposal: Create listener-specific decorators that embed DTO
 function createEventSubscription<T>(dto: new () => T) {
   return function(options: EventSubscriptionOptions) {
     return (target, propertyName, descriptor) => {
       // Store both options and DTO
       Reflect.defineMetadata('verichron:event_subscriber', { ...options, dto }, target, propertyName);
     };
   };
 }

 // Usage
 const AutoAssignmentSubscription = createEventSubscription(ExecuteAutoAssignmentDto);

 class MyListener {
   @AutoAssignmentSubscription({ topicName: EVENT_TOPICS.AUTOMATIONS })
   async onMessage() { }
 }

 Evaluation:
 - ✅ Type-safe at compile time
 - ✅ No constructor needed
 - ❌ Requires creating decorator per DTO (boilerplate)
 - ❌ Less clear than direct pattern

 Verdict: Overly complex, metadata approach is cleaner

 ---
 Alternative 3: Infer DTO from Method Signature

 Proposal: Use TypeScript reflection to infer DTO from handler parameter type
 @EventSubscription({ topicName: EVENT_TOPICS.X })
 async onMessage(data: MyDto) {  // ← Infer MyDto from parameter type
   // ...
 }

 Evaluation:
 - ✅ No explicit DTO declaration needed
 - ❌ Requires runtime reflection library (reflect-metadata limitations)
 - ❌ TypeScript type information erased at runtime
 - ❌ Would need build-time transformation

 Verdict: Not feasible with current TypeScript/NestJS stack

 ---
 Risks & Mitigation

 Risk 1: Migration Script Errors

 Impact: ⭐⭐⭐⭐ - Broken listeners won't receive events
 Mitigation:
 - Manual review of each migrated listener
 - Run TypeScript compiler after migration (will catch missing DTOs)
 - Integration test suite with real Pub/Sub messages

 Risk 2: Metadata Not Accessible

 Impact: ⭐⭐ - Would need fallback pattern
 Mitigation:
 - Test prototype listener before full migration
 - Verify Reflect.getMetadata works in NestJS context
 - Add explicit error if metadata missing

 Risk 3: Performance Impact

 Impact: ⭐ - Metadata lookup on every message
 Mitigation:
 - Metadata lookup is O(1) via Reflect API
 - Already doing metadata lookup in discovery phase
 - Negligible compared to Pub/Sub network latency

 Risk 4: Forgotten Listeners

 Impact: ⭐⭐⭐ - Some listeners not migrated
 Mitigation:
 - TypeScript compiler will error if dto property missing
 - Automated search: grep -r "extends AbstractBaseListener" apps/
 - ESLint rule to enforce pattern

 ---
 Success Criteria

 Must Have ✅

 - All listeners compile without errors
 - All listeners successfully process test events in staging
 - No "Configuration Error: DTO class is not registered" errors in logs
 - Validation still works (invalid payloads rejected)
 - All existing tests pass

 Should Have 🎯

 - Migration completed in single PR
 - Documentation updated
 - Performance benchmarks unchanged (<5% variance)
 - Zero downtime deployment

 Nice to Have 🌟

 - ESLint rule to enforce metadata pattern
 - Migration script for future listener creation
 - Automated test generator for new listeners

 ---
 Timeline Estimate

 | Phase                         | Effort | Risk      | Owner              |
 |-------------------------------|--------|-----------|--------------------|
 | Pre-Migration Investigation   | 2h     | 🟢 Low    | Backend            |
 | Package Update (Decorator)    | 1h     | 🟢 Low    | Backend            |
 | Discovery Service Update      | 2h     | 🟡 Medium | Backend            |
 | Base Listener Refactor        | 1h     | 🟡 Medium | Backend            |
 | Listener Migration (50 files) | 2h     | 🔴 High   | Backend (scripted) |
 | Testing                       | 3h     | 🟡 Medium | QA                 |
 | Documentation                 | 1h     | 🟢 Low    | Backend            |
 | TOTAL                         | 12h    |           | ~1.5 days          |

 ---
 Critical Finding from Runtime Logs

 Error Analysis

 Error Location: /app/node_modules/.pnpm/@verichron+event-subscriber@file++++usr+src+app+packages+event-subscriber/node_modules/@verichron/event-subscriber/dist/base-listener.abstract.js:56:23

 Key Observations:

 1. Listener Implementation is CORRECT:
 // /apps/api-debtors/src/imports/listeners/portfolio-debtor-batch-ready.listener.ts:25
 constructor(private readonly debtorImportProcessor: DebtorImportProcessor) {
   super(PortfolioDebtorBatchReadyDto);  // ✅ Correctly passing DTO
 }
 2. Event Flow is WORKING:
   - api-debts successfully publishes DEBTS_PORTFOLIO_DEBTOR_BATCH_READY event
   - api-debtors receives the event (log shows "📨 Receiving event")
   - Failure occurs during __executeStandardizedFlow when checking _internalDtoClass
 3. Runtime Environment: Docker container with pnpm workspace symlinks
 4. Potential Root Causes:
   - STALE BUILD: dist/ files in event-subscriber package don't match source code
   - RUNTIME PROXY: NestJS DI creates proxy instances where _internalDtoClass isn't accessible
   - COMPILATION MISMATCH: TypeScript useDefineForClassFields: true causing field initialization issues

 Immediate Investigation Needed

 Before implementing metadata-first solution, verify:

 1. Rebuild event-subscriber package:
 cd packages/event-subscriber
 rm -rf dist
 pnpm build
 2. Check if dist/ matches source:
 # Compare constructor in source vs dist
 cat src/base-listener.abstract.ts | grep -A5 "constructor"
 cat dist/base-listener.abstract.js | grep -A5 "constructor"
 3. Verify all apps are using latest build:
 # In Docker, check symlink resolution
 docker exec verichron-api-debtors-test ls -la /app/node_modules/@verichron/event-subscriber

 Hypothesis: The error may be caused by stale compiled files rather than architectural issue. If rebuilding fixes it, the metadata-first migration becomes a preventive measure rather than an urgent fix.

 ---
 Conclusion

 The metadata-first architecture is the correct long-term solution for the following reasons:

 1. ✅ Eliminates instance lifecycle dependency - Metadata exists before any instances created
 2. ✅ Follows NestJS best practices - Same pattern used throughout framework
 3. ✅ Type-safe at compile time - TypeScript enforces dto property
 4. ✅ Immune to proxy wrapping - Metadata on prototype, not instance
 5. ✅ No circular dependency issues - Not affected by forwardRef()
 6. ✅ Clear debugging - Error points to exact decorator missing dto
 7. ✅ Prevents stale build issues - DTO defined at decoration time, not construction time

 Recommendation: Two-phase approach:

 Phase 0: Immediate Fix (30 minutes)

 1. Rebuild event-subscriber package
 2. Restart Docker containers
 3. Test portfolio import flow
 4. If fixed → confirms stale build hypothesis
 5. If NOT fixed → confirms need for metadata-first architecture

 Phase 1-5: Metadata-First Migration (12 hours)

 Proceed with Big Bang migration as outlined above, regardless of Phase 0 outcome:
 - If Phase 0 fixes it → migration prevents future occurrences
 - If Phase 0 doesn't fix it → migration is the architectural fix

 Next Step: Execute Phase 0 to confirm root cause, then proceed with full migration.
