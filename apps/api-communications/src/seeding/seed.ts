import 'reflect-metadata';
import dataSource from '../../datasource';
import { type DataSource } from 'typeorm';
import { Template } from '../templates/entities/template.entity';
import { TemplateType } from '@verichron/enums';

export async function seedTemplates(ds: DataSource = dataSource) {
  const templatesRepo = ds.getRepository(Template);

  console.log('\n🌱 Seeding system communication templates...\n');

  const systemTemplates = [
    {
      name: 'USER_INVITATION',
      organizationId: '00000000-0000-0000-0000-000000000000',
      type: TemplateType.EMAIL,
      displayName: 'User Invitation',
      subject: 'Welcome to Verichron - Action Required',
      body: `
        <h1>Welcome to Verichron</h1>
        <p>Hello {{user.firstName}},</p>
        <p>You have been invited to join the Verichron platform as an administrator.</p>
        <p>To activate your account and set your password, please click the link below:</p>
        <p>
          <a href="{{invitation.link}}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Activate My Account
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p>{{invitation.link}}</p>
        <p>This invitation will expire on {{invitation.expiresAt}}.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
        <p>Best regards,<br>The Verichron Team</p>
      `,
      description: 'Sent to new users when they are provisioned or invited to the platform.',
      requiredVariables: ['user.firstName', 'invitation.link', 'invitation.expiresAt'],
      isActive: true,
      version: 1,
    },
    {
      name: 'PASSWORD_RESET',
      organizationId: '00000000-0000-0000-0000-000000000000',
      type: TemplateType.EMAIL,
      displayName: 'Password Reset',
      subject: 'Reset Your Verichron Password',
      body: `
        <h1>Password Reset Request</h1>
        <p>Hello {{user.firstName}},</p>
        <p>We received a request to reset your password for your Verichron account.</p>
        <p>To reset your password, please click the link below:</p>
        <p>
          <a href="{{reset.link}}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset My Password
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p>{{reset.link}}</p>
        <p>This link will expire on {{reset.expiresAt}}.</p>
        <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>Best regards,<br>The Verichron Team</p>
      `,
      description: 'Sent when a user requests a password reset.',
      requiredVariables: ['user.firstName', 'reset.link', 'reset.expiresAt'],
      isActive: true,
      version: 1,
    }
  ];

  for (const seed of systemTemplates) {
    const existing = await templatesRepo.findOne({
      where: { name: seed.name, organizationId: seed.organizationId }
    });

    if (!existing) {
      console.log(`  ✅ Creating system template: ${seed.name}`);
      await templatesRepo.save(templatesRepo.create(seed));
    } else {
      console.log(`  ⏭️  System template ${seed.name} already exists, skipping.`);
    }
  }

  console.log(`\n✅ Template seeding complete\n`);
}

async function main() {
  try {
    console.log('🚀 Starting api-communications system data seeding...\n');

    await dataSource.initialize();
    console.log('📦 Database connection established\n');

    await seedTemplates();

    console.log('🎉 Seeding complete!\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:\n', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
