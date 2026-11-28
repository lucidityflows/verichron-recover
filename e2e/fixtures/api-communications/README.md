# api-communications Fixtures

Complete fixture suite for testing the api-communications microservice. Provides factories for creating templates, preferences, and seed scenarios for communication patterns.

## Architecture

```
api-communications/
├── factories/                     # Single-entity creation
│   ├── templateFactory.ts
│   └── debtorPreferenceFactory.ts
├── seed/                          # Complete test scenarios
│   ├── organization-communication-setup.seed.ts
│   └── debtor-communication-preferences.seed.ts
└── events/                        # (Future: Event-driven scenarios)
```

## Quick Start

```typescript
import {
  createTemplateFactory,
  createDebtorPreferenceFactory,
  seedOrganizationCommunicationSetup,
  seedDebtorCommunicationPreferences
} from './fixtures/api-communications';

// Create individual entities
const templateFactory = createTemplateFactory(communicationsDataSource);
const template = await templateFactory.createPaymentReceiptTemplate(org.id);

const preferenceFactory = createDebtorPreferenceFactory(communicationsDataSource);
const preference = await preferenceFactory.createDefaultPreference({
  debtorId: debtor.id,
  organizationId: org.id,
});

// Use pre-built scenarios
const scenario = await seedOrganizationCommunicationSetup(communicationsDataSource, {
  organizationId: org.id,
});
```

## Factories

### TemplateFactory

Creates communication templates (EMAIL, SMS, LETTER) with Handlebars variable substitution.

```typescript
const templateFactory = createTemplateFactory(dataSource);

// Create email template
const emailTemplate = await templateFactory.createEmailTemplate({
  organizationId: org.id,
  name: 'payment-reminder',
  displayName: 'Payment Reminder Email',
  subject: 'Payment Due Reminder - {{amount}}',
  body: '<p>Your payment of {{amount}} is due on {{dueDate}}.</p>',
  requiredVariables: ['amount', 'dueDate'],
  description: 'Sent 3 days before payment due date',
  metadata: { category: 'reminder', priority: 'high' },
});

// Create SMS template
const smsTemplate = await templateFactory.createSmsTemplate({
  organizationId: org.id,
  name: 'payment-confirmation',
  displayName: 'Payment Confirmation SMS',
  body: 'Payment of {{amount}} received. Thank you!',
  requiredVariables: ['amount'],
});

// Create letter template
const letterTemplate = await templateFactory.createLetterTemplate({
  organizationId: org.id,
  name: 'debt-notice',
  displayName: 'Debt Collection Notice',
  body: 'Dear {{debtorName}},\n\nThis is to inform you...',
  requiredVariables: ['debtorName', 'debtAmount'],
});

// Create pre-built templates
const paymentReceipt = await templateFactory.createPaymentReceiptTemplate(org.id);
const paymentReminder = await templateFactory.createPaymentReminderSmsTemplate(org.id);

// Create multiple templates
const templates = await templateFactory.createMultipleTemplates({
  organizationId: org.id,
  count: 5,
  type: 'EMAIL',
});
```

**Available Methods:**
- `createTemplate(options)` - General template creation
- `createEmailTemplate(options)` - Email template (requires subject)
- `createSmsTemplate(options)` - SMS template (no subject)
- `createLetterTemplate(options)` - Letter template (no subject)
- `createPaymentReceiptTemplate(orgId)` - Pre-built payment receipt email
- `createPaymentReminderSmsTemplate(orgId)` - Pre-built payment reminder SMS
- `createMultipleTemplates(options)` - Bulk template creation

**Template Types:**
- `EMAIL` - Email templates (HTML, requires subject)
- `SMS` - SMS templates (plain text, 160 chars)
- `LETTER` - Letter templates (plain text, for postal mail)

**Template Features:**
- **Handlebars Syntax**: Use `{{variableName}}` for variable substitution
- **Required Variables**: Track which variables must be provided
- **Versioning**: Templates are versioned (immutable updates)
- **Organization-Scoped**: Each org has isolated templates
- **Metadata**: Store additional categorization data

### DebtorPreferenceFactory

Creates communication preferences for debtors with FDCPA/TCPA compliance support.

```typescript
const preferenceFactory = createDebtorPreferenceFactory(dataSource);

// Create default preference (all channels enabled, FDCPA compliant)
const preference = await preferenceFactory.createDefaultPreference({
  debtorId: debtor.id,
  organizationId: org.id,
  timezone: 'America/New_York',
});

// Create do-not-contact preference
const dncPreference = await preferenceFactory.createDoNotContactPreference({
  debtorId: debtor.id,
  organizationId: org.id,
});

// Create channel-specific opt-out
const smsOptOut = await preferenceFactory.createChannelOptOutPreference({
  debtorId: debtor.id,
  organizationId: org.id,
  optedOutChannels: ['SMS'],
});

// Create email-only preference
const emailOnly = await preferenceFactory.createEmailOnlyPreference({
  debtorId: debtor.id,
  organizationId: org.id,
});

// Create custom time restrictions
const timeRestricted = await preferenceFactory.createTimeRestrictedPreference({
  debtorId: debtor.id,
  organizationId: org.id,
  allowedStartHour: 10,
  allowedEndHour: 18,
  timezone: 'America/Los_Angeles',
});

// Create fully custom preference
const customPref = await preferenceFactory.createPreference({
  debtorId: debtor.id,
  organizationId: org.id,
  doNotContact: false,
  optedOutChannels: ['SMS', 'LETTER'],
  allowedStartHour: 9,
  allowedEndHour: 20,
  dailyContactLimit: 2,
  timezone: 'America/Chicago',
  preferredLanguage: 'en',
  preferredChannels: ['EMAIL'],
  notes: 'Prefers email communication only',
});

// Update preferences
await preferenceFactory.updateOptOutChannels({
  preferenceId: preference.id,
  optedOutChannels: ['SMS'],
});

await preferenceFactory.setDoNotContact({
  preferenceId: preference.id,
  doNotContact: true,
});

// Get existing preference
const existing = await preferenceFactory.getPreference({
  debtorId: debtor.id,
  organizationId: org.id,
});
```

**Available Methods:**
- `createPreference(options)` - General preference creation
- `createDefaultPreference(options)` - All channels enabled, FDCPA compliant
- `createDoNotContactPreference(options)` - Global opt-out
- `createChannelOptOutPreference(options)` - Specific channel opt-outs
- `createEmailOnlyPreference(options)` - Email-only communication
- `createTimeRestrictedPreference(options)` - Custom time restrictions
- `updateOptOutChannels(options)` - Update opt-out channels
- `setDoNotContact(options)` - Set/unset do-not-contact flag
- `getPreference(options)` - Retrieve existing preference

**Communication Channels:**
- `EMAIL` - Email messages
- `SMS` - Text messages
- `LETTER` - Postal mail

**Compliance Features:**
- **FDCPA Time Restrictions**: Default 8am-9pm in debtor's timezone
- **Channel Opt-Outs**: Per-channel opt-out support
- **Global Do Not Contact**: Overrides all channel preferences
- **Daily Contact Limits**: Prevent harassment (default: 3/day)
- **Timezone Support**: Respect debtor's local time
- **Language Preferences**: Multi-language support

## Seed Scenarios

Pre-built scenarios for common testing patterns. These combine factories to create complete, reusable test setups.

### seedOrganizationCommunicationSetup

**Purpose**: Create complete template library for an organization

**Scenario**:
- Payment receipt email template
- Payment reminder SMS template
- Payment confirmation SMS template
- Debt notice letter template
- All templates active and ready to use

```typescript
const scenario = await seedOrganizationCommunicationSetup(communicationsDataSource, {
  organizationId: org.id,
  createdByUserId: admin.id, // Optional
});

// Access scenario data
expect(scenario.emailTemplates.length).toBe(1);
expect(scenario.smsTemplates.length).toBe(2);
expect(scenario.letterTemplates.length).toBe(1);
expect(scenario.allTemplates.length).toBe(4);

// Use templates
const paymentReceipt = scenario.emailTemplates.find(t => t.name === 'payment-receipt');
expect(paymentReceipt.subject).toContain('{{amount}}');
expect(paymentReceipt.requiredVariables).toContain('amount');
```

**Returns**:
```typescript
{
  organizationId: string;
  emailTemplates: Template[];
  smsTemplates: Template[];
  letterTemplates: Template[];
  allTemplates: Template[];
}
```

### seedDebtorCommunicationPreferences

**Purpose**: Create various debtor preference scenarios for testing opt-out handling

**Scenario**:
- Debtor with default preferences (all channels enabled)
- Debtor with do-not-contact flag (global opt-out)
- Debtor with SMS opt-out (email/letter only)
- Debtor with email-only preference
- Debtor with custom time restrictions

```typescript
// Requires 5 debtor IDs for different scenarios
const scenario = await seedDebtorCommunicationPreferences(communicationsDataSource, {
  organizationId: org.id,
  debtorIds: [
    debtor1.id, // Default preferences
    debtor2.id, // Do not contact
    debtor3.id, // SMS opt-out
    debtor4.id, // Email only
    debtor5.id, // Time restricted
  ],
});

// Access scenario data
expect(scenario.defaultPreferences.doNotContact).toBe(false);
expect(scenario.defaultPreferences.optedOutChannels).toEqual([]);

expect(scenario.doNotContactPreferences.doNotContact).toBe(true);

expect(scenario.smsOptOutPreferences.optedOutChannels).toContain('SMS');

expect(scenario.emailOnlyPreferences.preferredChannels).toEqual(['EMAIL']);
expect(scenario.emailOnlyPreferences.optedOutChannels).toContain('SMS');
expect(scenario.emailOnlyPreferences.optedOutChannels).toContain('LETTER');

expect(scenario.timeRestrictedPreferences.allowedStartHour).toBe(10);
expect(scenario.timeRestrictedPreferences.allowedEndHour).toBe(18);

// Use in communication system
const canContact = await checkContactAllowed(debtor2.id, org.id, 'EMAIL');
expect(canContact).toBe(false); // Do not contact flag
```

**Returns**:
```typescript
{
  organizationId: string;
  defaultPreferences: DebtorPreference;
  doNotContactPreferences: DebtorPreference;
  smsOptOutPreferences: DebtorPreference;
  emailOnlyPreferences: DebtorPreference;
  timeRestrictedPreferences: DebtorPreference;
  allPreferences: DebtorPreference[];
}
```

## Common Testing Patterns

### Pattern 1: Template Rendering Testing

```typescript
describe('Template Rendering', () => {
  let scenario: OrganizationCommunicationSetupScenario;

  beforeEach(async () => {
    scenario = await seedOrganizationCommunicationSetup(communicationsDataSource, {
      organizationId: org.id,
    });
  });

  it('should render payment receipt template', async () => {
    const template = scenario.emailTemplates.find(t => t.name === 'payment-receipt');

    const context = {
      debtorName: 'John Doe',
      amount: '$100.00',
      paymentDate: '2024-01-15',
      transactionId: 'tx_123',
      remainingBalance: '$400.00',
    };

    const rendered = await renderTemplate(template, context);

    expect(rendered.subject).toContain('$100.00');
    expect(rendered.body).toContain('John Doe');
    expect(rendered.body).toContain('tx_123');
  });
});
```

### Pattern 2: Compliance Testing

```typescript
describe('Communication Compliance', () => {
  let scenario: DebtorCommunicationPreferencesScenario;

  beforeEach(async () => {
    scenario = await seedDebtorCommunicationPreferences(communicationsDataSource, {
      organizationId: org.id,
      debtorIds: [debtor1.id, debtor2.id, debtor3.id, debtor4.id, debtor5.id],
    });
  });

  it('should respect do-not-contact flag', async () => {
    const canContact = await checkContactAllowed(
      scenario.doNotContactPreferences.debtorId,
      org.id,
      'EMAIL'
    );

    expect(canContact).toBe(false);
  });

  it('should respect channel opt-outs', async () => {
    const canSms = await checkContactAllowed(
      scenario.smsOptOutPreferences.debtorId,
      org.id,
      'SMS'
    );

    const canEmail = await checkContactAllowed(
      scenario.smsOptOutPreferences.debtorId,
      org.id,
      'EMAIL'
    );

    expect(canSms).toBe(false);
    expect(canEmail).toBe(true);
  });

  it('should respect time restrictions', async () => {
    const pref = scenario.timeRestrictedPreferences;

    // 7am PST (too early)
    const tooEarly = await checkContactAllowed(
      pref.debtorId,
      org.id,
      'SMS',
      new Date('2024-01-15T07:00:00-08:00')
    );

    // 2pm PST (allowed)
    const allowed = await checkContactAllowed(
      pref.debtorId,
      org.id,
      'SMS',
      new Date('2024-01-15T14:00:00-08:00')
    );

    // 7pm PST (too late)
    const tooLate = await checkContactAllowed(
      pref.debtorId,
      org.id,
      'SMS',
      new Date('2024-01-15T19:00:00-08:00')
    );

    expect(tooEarly).toBe(false);
    expect(allowed).toBe(true);
    expect(tooLate).toBe(false);
  });
});
```

### Pattern 3: Multi-Channel Communication Testing

```typescript
describe('Multi-Channel Communication', () => {
  it('should send payment confirmation via preferred channels', async () => {
    const templateFactory = createTemplateFactory(communicationsDataSource);
    const preferenceFactory = createDebtorPreferenceFactory(communicationsDataSource);

    // Create templates
    const emailTemplate = await templateFactory.createPaymentReceiptTemplate(org.id);
    const smsTemplate = await templateFactory.createSmsTemplate({
      organizationId: org.id,
      name: 'payment-confirmation-sms',
      body: 'Payment of {{amount}} received.',
    });

    // Create debtor preference (email + SMS)
    const preference = await preferenceFactory.createDefaultPreference({
      debtorId: debtor.id,
      organizationId: org.id,
    });

    // Send via both channels
    await sendCommunication({
      debtorId: debtor.id,
      organizationId: org.id,
      emailTemplateId: emailTemplate.id,
      smsTemplateId: smsTemplate.id,
      context: { amount: '$100.00' },
    });

    // Verify both sent
    const sent = await getSentCommunications(debtor.id);
    expect(sent.filter(c => c.channel === 'EMAIL').length).toBe(1);
    expect(sent.filter(c => c.channel === 'SMS').length).toBe(1);
  });
});
```

## Data Sources

All fixtures require a TypeORM DataSource connection to the api-communications database:

```typescript
import { getCommunicationsDataSource } from '../utils/dbConnections';

const communicationsDataSource = await getCommunicationsDataSource();

// Use factories
const templateFactory = createTemplateFactory(communicationsDataSource);
const preferenceFactory = createDebtorPreferenceFactory(communicationsDataSource);

// Use seeds
const scenario = await seedOrganizationCommunicationSetup(communicationsDataSource, /* ... */);
```

## Entity Relationships

```
Template
  ├── id (uuid)
  ├── organizationId (uuid) -> Organization
  ├── name (string, unique per org)
  ├── displayName (string)
  ├── type (enum: EMAIL, SMS, LETTER)
  ├── subject (string, EMAIL only)
  ├── body (text, Handlebars template)
  ├── version (int, immutable versioning)
  ├── isActive (boolean)
  ├── requiredVariables (jsonb array)
  └── metadata (jsonb)

DebtorPreference
  ├── id (uuid)
  ├── debtorId (uuid) -> Debtor
  ├── organizationId (uuid) -> Organization
  ├── doNotContact (boolean, global opt-out)
  ├── optedOutChannels (jsonb array: EMAIL, SMS, LETTER)
  ├── allowedStartHour (int, FDCPA compliance)
  ├── allowedEndHour (int, FDCPA compliance)
  ├── dailyContactLimit (int, harassment prevention)
  ├── timezone (string, IANA timezone)
  ├── preferredLanguage (string, ISO 639-1)
  └── preferredChannels (jsonb array)
```

## Best Practices

1. **Use Seed Scenarios for E2E Tests**: Prefer `seedOrganizationCommunicationSetup()` for complete setups

2. **Test Compliance**: Always test FDCPA/TCPA compliance (time restrictions, opt-outs)

3. **Template Versioning**: Create new versions instead of modifying existing templates

4. **Handlebars Variables**: Document required variables in `requiredVariables` array

5. **Realistic Templates**: Use actual communication templates from business requirements

6. **Multi-Language Support**: Test with different `preferredLanguage` values

7. **Timezone Testing**: Test time restrictions across different timezones

## Future Enhancements

- **events/**: Event-driven scenarios (message sent events, opt-out events)
- **More seed scenarios**: Multi-language templates, A/B testing scenarios
- **Communication history**: Track sent communications
- **Delivery status**: Email bounces, SMS delivery confirmations
