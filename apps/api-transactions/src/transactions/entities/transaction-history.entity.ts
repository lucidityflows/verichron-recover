import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType, PaymentStatus, PaymentMethod } from "@verichron/enums";;

/**
 * TransactionHistory Entity
 * 
 * Immutable record of all financial transactions in the system.
 * Once a transaction reaches SUCCEEDED or FAILED status, it is never modified.
 * Refunds and retries create new transaction records.
 * 
 * @entity transaction_history
 */
@Entity('transaction_history')
@Check(`"amount" > 0`)
@Index(['organizationId'])
@Index(['debtId'])
@Index(['debtorId'])
@Index(['paymentPlanId'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'debtId'])
export class TransactionHistory {
  @ApiProperty({
    description: 'Unique transaction identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique transaction identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this transaction (denormalized for tenant isolation)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'organization_id',
    nullable: false,
    comment: 'Foreign key to api-organizations - denormalized for performance and security',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Debt account this transaction applies to (nullable for standalone transactions)',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'debt_id',
    nullable: true,
    comment: 'Foreign key to api-debts - debt this transaction applies to',
  })
  debtId: string | null;

  @ApiProperty({
    description: 'Payment plan this transaction is associated with (for scheduled payments)',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'payment_plan_id',
    nullable: true,
    comment: 'Foreign key to payment_plan - null for one-time payments',
  })
  paymentPlanId: string | null;

  @ApiProperty({
    description: 'Debtor who made or received this transaction',
    example: '321e6543-e89b-12d3-a456-426614174777',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'debtor_id',
    nullable: true,
    comment: 'Foreign key to api-debtors',
  })
  debtorId: string | null;

  @ApiProperty({
    description: 'Collector who facilitated this transaction (null for self-service payments)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'collector_user_id',
    nullable: true,
    comment: 'Foreign key to api-users - collector who facilitated this payment (null for self-service)',
  })
  @Index()
  collectorUserId: string | null;

  @ApiProperty({
    description: 'Transaction amount in USD',
    example: 150.50,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
  })
  @Column('decimal', {
    name: 'amount',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'Transaction amount - always positive, must be greater than 0',
  })
  amount: number;

  @ApiProperty({
    description: 'Type of transaction',
    enum: PaymentType,
    example: PaymentType.PAYMENT,
  })
  @Column({
    type: 'enum',
    enum: PaymentType,
    name: 'type',
    nullable: false,
    comment: 'Transaction type - PAYMENT or REFUND',
  })
  type: PaymentType;

  @ApiProperty({
    description: 'Current status of the transaction',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'status',
    nullable: false,
    comment: 'Transaction status - immutable once SUCCEEDED or FAILED',
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Tokenized payment method reference (NOT raw card data)',
    example: 'tok_1234567890abcdef',
  })
  @Column('varchar', {
    name: 'payment_method_token',
    length: 255,
    nullable: false,
    comment: 'Tokenized payment method - never contains raw card data',
  })
  paymentMethodToken: string;

  @ApiProperty({
    description: 'Type of payment method used',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.VISA,
  })
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method_type',
    nullable: false,
    default: PaymentMethod.OTHER,
    comment: 'Type of payment method (VISA, ACH, etc.)',
  })
  @Index()
  paymentMethodType: PaymentMethod;

  @ApiProperty({
    description: 'External payment gateway transaction ID (e.g., Stripe charge ID)',
    example: 'ch_3MmlLrLkdIwHu7ix0SNM0WaR',
    nullable: true,
  })
  @Column('varchar', {
    name: 'gateway_transaction_id',
    length: 255,
    nullable: true,
    comment: 'External gateway transaction ID returned from Stripe/etc',
  })
  gatewayTransactionId: string | null;

  @ApiProperty({
    description: 'Reason for failure if status is FAILED',
    example: 'Card declined - insufficient funds',
    nullable: true,
  })
  @Column('text', {
    name: 'failure_reason',
    nullable: true,
    comment: 'Detailed failure reason from gateway if status is FAILED',
  })
  failureReason: string | null;

  @ApiProperty({
    description: 'Unique idempotency key for preventing duplicate charges',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'idempotency_key',
    nullable: false,
    unique: true,
    comment: 'Unique key passed to gateway to prevent duplicate charges',
  })
  idempotencyKey: string;

  @ApiProperty({
    description: 'ID of the original payment transaction (for REFUND types)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'original_transaction_id',
    nullable: true,
    comment: 'For REFUND transactions - references the original PAYMENT transaction',
  })
  originalTransactionId: string | null;

  @ApiProperty({
    description: 'Additional metadata for the transaction',
    example: { ip_address: '192.168.1.1', user_agent: 'Mozilla/5.0...' },
    nullable: true,
  })
  @Column('jsonb', {
    name: 'metadata',
    nullable: true,
    comment: 'Additional transaction metadata (IP, user agent, etc.)',
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when the transaction was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when transaction was created',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the transaction was last updated',
    example: '2024-01-15T10:30:05.000Z',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when transaction was last updated',
  })
  updatedAt: Date;
}