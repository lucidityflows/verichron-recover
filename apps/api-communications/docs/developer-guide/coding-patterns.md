# API-Communications Phase 3: Implementation Patterns from API-Debts

## Quick Reference Summary

### File Location Reference
- **Main Document**: `/API_DEBTS_PATTERNS_ANALYSIS.md`

---

## Key Architecture Patterns to Follow

### 1. Module Structure (Feature-Based)
```
api-communications/src/
├── core/
│   ├── decorators/ (OrganizationId, Permissions, CurrentUserId, etc.)
│   ├── guards/ (JwtAuthGuard, OrgContextGuard, PermissionsGuard)
│   ├── filters/ (AllExceptionsFilter)
│   └── pipes/ (ValidationPipe)
├── [feature-module]/
│   ├── [feature].module.ts (imports TypeOrmModule.forFeature, exports service)
│   ├── [feature].controller.ts (HTTP routes, Swagger docs)
│   ├── [feature].service.ts (business logic, repositories)
│   ├── dto/ (Create, Update, Query, Response DTOs)
│   ├── entities/ (TypeORM entities)
│   ├── errors/ (Custom exceptions extending BaseException)
│   └── listeners/ (Event subscribers for cross-service communication)
└── app.module.ts (imports feature modules, registers global guards/filters)
```

---

## Critical Implementation Patterns

### Pattern 1: Service Method Signatures

Every service method follows this signature:

```typescript
async methodName(
  organizationId: string,      // For tenant isolation
  userId: string,              // For audit trail & event metadata
  dto: MethodDto,             // Input validation via DTO
): Promise<ResponseDto> {
  // Log entry with context
  this.logger.log(`Action description`, { 
    organizationId, 
    userId,
    relevantContext: 'value'
  });

  try {
    // Transaction for multi-step operations
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Business logic

    // Commit
    await queryRunner.commitTransaction();

    // Publish event AFTER database commit
    await this.eventPublisher.publish<EventDto>(
      EVENT_TOPICS.MODULE_NAME,
      EVENT_TYPES.MODULE_ACTION,
      EVENT_SOURCES.API_COMMUNICATIONS,
      { /* payload */ },
    );

    // Return mapped DTO
    return ResponseDto.fromEntity(entity);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error('Error description', { error: error.message });
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### Pattern 2: Controller Method Signatures

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: '...', description: '...' })
@ApiResponse({ status: 201, type: ResponseDto })
@Permissions('communication:create')  // Declare required permission
async create(
  @OrganizationId() organizationId: string,        // Auto-extracted from JWT
  @Req() request: Request,                         // For user info
  @Body() createDto: CreateDto,                    // Validated DTO
): Promise<ResponseDto> {
  const user = request.user as JwtUser;
  return this.service.create(organizationId, user.sub, createDto);
}
```

### Pattern 3: Repository Access Pattern

```typescript
constructor(
  @InjectRepository(Entity)
  private readonly repository: Repository<Entity>,
  
  @InjectRepository(CrossModuleEntity)
  private readonly crossModuleRepository: Repository<CrossModuleEntity>,
  
  private readonly dataSource: DataSource,
  private readonly eventPublisher: EventPublisher,
  // ... other services
) {}
```

Key points:
- Use `@InjectRepository()` for each entity used
- Import cross-module entities for Layer 2 authorization
- Inject `DataSource` for transaction management
- Inject `EventPublisher` for event publishing

### Pattern 4: Query Builder Authorization Pattern

```typescript
// Layer 2 authorization at database level
const queryBuilder = this.repository
  .createQueryBuilder('entity')
  .where('entity.organization_id = :organizationId', { organizationId });

// INNER JOIN for permission checks
queryBuilder.innerJoin(
  'cross_module_permission',
  'cmp',
  'cmp.resource_id = entity.resource_id AND cmp.user_id = :userId',
  { userId },
);

// Conditional filters
if (query.status) {
  queryBuilder.andWhere('entity.status = :status', { status: query.status });
}

// Pagination + count
const [entities, total] = await queryBuilder
  .orderBy('entity.created_at', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
```

### Pattern 5: Error Handling

1. Create custom exception extending `BaseException`:
```typescript
// errors/custom-error.exception.ts
export class CustomErrorException extends BaseException {
  constructor(context: string) {
    super(
      `Descriptive error message for ${context}`,
      HttpStatus.BAD_REQUEST,
      'COMMUNICATIONS_CUSTOM_001',  // Module_Feature_Code
    );
  }
}
```

2. Register global exception filter in AppModule:
```typescript
{ provide: APP_FILTER, useClass: AllExceptionsFilter }
```

3. Throw from service:
```typescript
if (someCondition) {
  throw new CustomErrorException('context');
}
```

---

## DTO Validation Patterns

### Create/Update DTO

```typescript
export class CreateCommunicationDto {
  @ApiProperty({
    description: 'Clear description',
    example: 'example-value',
    type: String,
    format: 'email',  // or uuid, date, etc.
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  fieldName: string;

  @ApiPropertyOptional({
    description: 'Optional field',
    example: 'optional-value',
    default: null,
  })
  @IsOptional()
  @IsString()
  optionalField?: string;
}
```

### Query DTO (for filtering/pagination)

```typescript
export class QueryCommunicationsDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    type: 'number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    type: 'number',
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: CommunicationStatus,
  })
  @IsOptional()
  @IsEnum(CommunicationStatus)
  status?: CommunicationStatus;
}
```

### Response DTO (with mapper)

```typescript
export class CommunicationResponseDto {
  id: string;
  organizationId: string;
  // ... other fields

  static fromEntity(entity: Communication): CommunicationResponseDto {
    const dto = new CommunicationResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    // ... map all fields
    return dto;
  }

  static fromEntities(entities: Communication[]): CommunicationResponseDto[] {
    return entities.map(entity => CommunicationResponseDto.fromEntity(entity));
  }
}
```

---

## Event Publishing Pattern

### Publishing Events

```typescript
// In service, after successful database commit
await this.eventPublisher.publish<CommunicationSentDto>(
  EVENT_TOPICS.COMMUNICATIONS,           // Topic from @verichron/types
  EVENT_TYPES.COMMUNICATIONS_SENT,       // Event type from @verichron/types
  EVENT_SOURCES.API_COMMUNICATIONS,      // Source from @verichron/types
  {
    communicationId: communication.id,
    organizationId,
    debtorId: communication.debtorId,
    type: communication.type,
    status: 'SENT',
    sentAt: new Date().toISOString(),
    sentBy: userId,
  },
);
```

### Subscribing to Events (Cross-Service Communication)

```typescript
// listeners/debtor-information-received.listener.ts
@Injectable()
export class DebtorInformationReceivedListener {
  @EventSubscriber({
    topicName: EVENT_TOPICS.DEBTORS,           // Topic to subscribe to
    subscriptionName: 'api-communications.debtor-info.sub',
    eventType: EVENT_TYPES.DEBTORS_INFO_RECEIVED,
  })
  async handleDebtorInformationReceived(
    event: EventEnvelope<DebtorInfoPayload>,
  ): Promise<void> {
    const { debtorId, organizationId, contact } = event.data;

    this.logger.log(`Processing debtor info received for ${debtorId}`);

    try {
      // Update preferences/contact info
      await this.preferencesService.updateContactInfo(
        organizationId,
        debtorId,
        contact,
      );

      this.logger.log(`Debtor info updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to process debtor info event`, {
        eventId: event.eventId,
        debtorId,
        error: error.message,
      });
      throw error; // Retry via Pub/Sub
    }
  }
}
```

---

## Guard & Decorator Pattern

### Global Guard Registration

```typescript
// app.module.ts
@Module({
  providers: [
    AppService,
    JwtStrategy,
    
    // Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    
    // Global guards - ORDER MATTERS
    { provide: APP_GUARD, useClass: JwtAuthGuard },           // Step 1: Validate JWT
    { provide: APP_GUARD, useClass: OrgContextGuard },        // Step 2: Extract org context
    { provide: APP_GUARD, useClass: RoleGuard },             // Step 3: Validate roles
    // PermissionsGuard typically applied via @Permissions decorator
  ],
})
export class AppModule {}
```

Guard execution order:
1. **JwtAuthGuard** - Validates JWT token (skips if @Public())
2. **OrgContextGuard** - Extracts organizationId, validates org access, sets `request.activeContext`
3. **RoleGuard** - Validates user roles
4. **PermissionsGuard** - Applied via `@Permissions()` decorator on routes, validates fine-grained permissions

### Custom Decorators

```typescript
// Use in controller methods
@Post()
@Permissions('communication:send')  // Fine-grained permission check
async send(
  @OrganizationId() organizationId: string,  // Auto-extracted from JWT
  @Req() request: Request,                   // For request.user
  @Body() dto: SendCommunicationDto,
): Promise<CommunicationResponseDto> {
  const user = request.user as JwtUser;
  // ...
}
```

---

## Swagger Documentation Pattern

Every endpoint should include:

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiTags('Communications')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Send a communication',
  description: `
    Sends an email or SMS to a debtor.
    
    **Typical Usage:**
    - Event-driven from api-debts (primary)
    - Manual dispatch by admins (rare)
    
    **Compliance:**
    - Checks FDCPA/TCPA rules before sending
    - Respects opt-out preferences
    - Enforces time-of-day restrictions
    
    **Events Published:**
    - CommunicationDispatched
    - CommunicationSent (via gateway webhook)
  `,
})
@ApiBody({ type: SendCommunicationDto })
@ApiResponse({
  status: 201,
  description: 'Communication queued successfully',
  type: CommunicationResponseDto,
})
@ApiResponse({
  status: 400,
  description: 'Validation error',
})
@ApiResponse({
  status: 403,
  description: 'Compliance violation (opt-out, time restriction, etc.)',
})
@ApiResponse({
  status: 409,
  description: 'Conflict - already sent to this debtor recently',
})
@Permissions('communication:send')
async send(
  @OrganizationId() organizationId: string,
  @Req() request: Request,
  @Body() dto: SendCommunicationDto,
): Promise<CommunicationResponseDto> {
  // ...
}
```

---

## Key Constants & Shared Types

Location: `/packages/types/src`

```typescript
// Enums
export enum CommunicationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  LETTER = 'LETTER',
}

export enum CommunicationStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

// Event constants
export const EVENT_TOPICS = {
  COMMUNICATIONS: 'communications-v1',
  DEBTS: 'debts-v1',
  DEBTORS: 'debtors-v1',
};

export const EVENT_TYPES = {
  COMMUNICATIONS_SENT: 'communications.communication.sent',
  COMMUNICATIONS_FAILED: 'communications.communication.failed',
  DEBTS_CREATED: 'debts.debt.created',
  // ... etc
};

export const EVENT_SOURCES = {
  API_COMMUNICATIONS: 'api-communications',
  API_DEBTS: 'api-debts',
  API_DEBTORS: 'api-debtors',
};

// Auth constants
export const JWT_CLAIMS_NAMESPACE = 'https://verichroninc.com/claims';

export enum UserType {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  ORGANIZATION_USER = 'ORGANIZATION_USER',
}
```

---

## Testing Patterns

### Service Unit Test

```typescript
describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let repository: Repository<Communication>;
  let eventPublisher: EventPublisher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationsService,
        { provide: getRepositoryToken(Communication), useValue: mockRepository },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<CommunicationsService>(CommunicationsService);
    repository = module.get<Repository<Communication>>(
      getRepositoryToken(Communication),
    );
    eventPublisher = module.get<EventPublisher>(EventPublisher);
  });

  describe('send', () => {
    it('should send communication and publish event', async () => {
      const organizationId = 'org-123';
      const userId = 'user-456';
      const dto: SendCommunicationDto = { /* ... */ };

      const result = await service.send(organizationId, userId, dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        expect.any(String),  // topic
        expect.any(String),  // eventType
        expect.any(String),  // eventSource
        expect.any(Object),  // data
      );
    });
  });
});
```

---

## Configuration Pattern

Use environment-based configuration:

```typescript
// In app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    // PostgreSQL
    POSTGRES_HOST: Joi.string().default('localhost'),
    POSTGRES_PORT: Joi.number().default(5432),
    POSTGRES_DB: Joi.string().default('communications_db'),

    // MongoDB (for high-volume logs)
    MONGODB_URI: Joi.string().default('mongodb://localhost:27017/communications'),

    // Redis (for caching, rate limiting)
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),

    // Email/SMS Gateways
    EMAIL_PROVIDER: Joi.string().valid('sendgrid', 'mock').default('mock'),
    SMS_PROVIDER: Joi.string().valid('twilio', 'mock').default('mock'),
    SENDGRID_API_KEY: Joi.string().optional(),
    TWILIO_ACCOUNT_SID: Joi.string().optional(),

    // GCP Pub/Sub
    GCP_PROJECT_ID: Joi.string().default('local-dev'),
    PUBSUB_EMULATOR_HOST: Joi.string().optional(),

    // JWT
    JWT_SECRET: Joi.string().default('development-secret'),
  }),
}),
```

---

## Logging Best Practices

```typescript
// Service constructor
private readonly logger = new Logger(ServiceName.name);

// Method entry
this.logger.log(`Action description`, {
  organizationId,
  userId,
  entityId: id,
  additionalContext: 'value',
});

// On error
this.logger.error(`Failed to perform action`, {
  error: error.message,
  organizationId,
  userId,
  entityId: id,
  stack: error.stack,  // Only on error
});

// On warning
this.logger.warn(`Compliance check failed`, {
  organizationId,
  debtorId,
  reason: 'OPT_OUT',
});
```

---

## Dependency Injection Checklist

For each feature module:

- [ ] Create module file with `@Module()` decorator
- [ ] Register entities with `TypeOrmModule.forFeature()`
- [ ] Create controller with route handlers
- [ ] Create service with business logic
- [ ] Export service for cross-module use
- [ ] Create custom exceptions extending `BaseException`
- [ ] Create DTOs with validation decorators
- [ ] Create entities with TypeORM decorators
- [ ] Create event listeners for cross-service events
- [ ] Add Swagger documentation to all endpoints
- [ ] Add permission decorators to protected endpoints
- [ ] Add logging to service methods

---

## File Structure Summary

```
api-communications/src/
│
├── core/                          # Shared infrastructure
│   ├── decorators/
│   │   ├── organization-id.decorator.ts
│   │   ├── permissions.decorator.ts
│   │   ├── current-user-id.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── index.ts
│   │
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   ├── jwt.strategy.ts
│   │   ├── org-context.guard.ts
│   │   ├── permissions.guard.ts
│   │   ├── role.guard.ts
│   │   └── index.ts
│   │
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   │
│   └── pipes/
│       └── validation.pipe.ts
│
├── templates/                     # Feature module example
│   ├── templates.module.ts
│   ├── templates.controller.ts
│   ├── templates.service.ts
│   ├── template-renderer.service.ts
│   │
│   ├── entities/
│   │   └── template.entity.ts
│   │
│   ├── dto/
│   │   ├── create-template.dto.ts
│   │   ├── update-template.dto.ts
│   │   ├── query-templates.dto.ts
│   │   └── template-response.dto.ts
│   │
│   ├── errors/
│   │   ├── template-not-found.exception.ts
│   │   ├── template-already-exists.exception.ts
│   │   └── invalid-template-syntax.exception.ts
│   │
│   └── listeners/
│       └── [event-listener-name].listener.ts
│
├── app.module.ts
├── app.controller.ts
└── main.ts
```

---

## Next Steps for Phase 3

1. Review full analysis at `/API_DEBTS_PATTERNS_ANALYSIS.md`
2. Review existing api-communications Phase 1 code for patterns already in place
3. Identify which modules need Phase 3 features
4. For each new module, follow the patterns above
5. Ensure all endpoints have:
   - Swagger documentation (@ApiOperation, @ApiResponse, etc.)
   - Permission decorators (@Permissions)
   - Proper error handling with custom exceptions
   - Event publishing for domain events
6. Add event listeners for cross-service communication needs
7. Create comprehensive test suites following patterns

