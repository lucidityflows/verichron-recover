import 'reflect-metadata';
import dataSource from '../../datasource';
import { WorkflowTemplate } from '../workflow-templates/entities/workflow-template.entity';
import { STANDARD_WORKFLOW_TEMPLATES } from './workflow-templates.data';

async function seedTemplates() {
  const templateRepository = dataSource.getRepository(WorkflowTemplate);

  console.log('\n🌱 Seeding standard workflow templates...\n');

  let created = 0;
  let skipped = 0;

  for (const templateData of STANDARD_WORKFLOW_TEMPLATES) {
    const existing = await templateRepository.findOne({
      where: { id: templateData.id },
    });

    if (!existing) {
      // Cast the default actions/conditions to match Entity (simple cast due to strict DTO typing vs Entity JSONB)
      const entity = templateRepository.create(templateData as any);
      await templateRepository.save(entity);
      console.log(`  ✅ Created template: ${templateData.name}`);
      created++;
    } else {
      console.log(`  ⏭️  Template already exists: ${templateData.name}`);
      skipped++;
    }
  }

  console.log(`\n✅ Template seeding complete (Created: ${created}, Skipped: ${skipped})\n`);
}

async function main() {
  try {
    console.log('🚀 Starting api-workflows system seeding...\n');
    
    await dataSource.initialize();
    console.log('📦 Database connection established\n');

    await seedTemplates();

    console.log('🎉 System configuration seeding complete!\n');

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

main();
