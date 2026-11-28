import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateRendererService } from './template-renderer.service';
import { TemplateNotFoundException } from './errors/template-not-found.exception';
import { TemplateAlreadyExistsException } from './errors/template-already-exists.exception';
import { InvalidTemplateSyntaxException } from './errors/invalid-template-syntax.exception';
import { TemplateType } from '@verichron/enums';

/**
 * Templates Service
 *
 * Manages communication templates with versioning and organization isolation
 * - CRUD operations for templates
 * - Template validation (Handlebars syntax)
 * - Immutable versioning (updates create new versions)
 * - Organization-scoped access
 */
@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templatesRepo: Repository<Template>,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  /**
   * Create new template
   */
  async create(
    organizationId: string,
    createTemplateDto: CreateTemplateDto,
    createdBy?: string,
  ): Promise<Template> {
    this.logger.log(`Creating template '${createTemplateDto.name}' for org ${organizationId}`);

    // Check if template with this name already exists for this organization
    const existing = await this.templatesRepo.findOne({
      where: {
        organizationId,
        name: createTemplateDto.name,
        isActive: true,
      },
    });

    if (existing) {
      throw new TemplateAlreadyExistsException(createTemplateDto.name, organizationId);
    }

    // Validate EMAIL templates have subjects
    if (createTemplateDto.type === TemplateType.EMAIL && !createTemplateDto.subject) {
      throw new BadRequestException('EMAIL templates must have a subject');
    }

    // Validate template syntax
    const bodyValidation = this.templateRenderer.validateTemplate(createTemplateDto.body);
    if (!bodyValidation.valid) {
      throw new InvalidTemplateSyntaxException([`Body: ${bodyValidation.error}`]);
    }

    if (createTemplateDto.subject) {
      const subjectValidation = this.templateRenderer.validateTemplate(createTemplateDto.subject);
      if (!subjectValidation.valid) {
        throw new InvalidTemplateSyntaxException([`Subject: ${subjectValidation.error}`]);
      }
    }

    // Create template
    const template = this.templatesRepo.create({
      organizationId,
      ...createTemplateDto,
      version: 1,
      isActive: true,
      createdBy,
    });

    const saved = await this.templatesRepo.save(template);

    this.logger.log(`Template created: ${saved.id} (${saved.name} v${saved.version})`);

    return saved;
  }

  /**
   * Find all templates for organization
   */
  async findAll(organizationId: string, filters?: {
    type?: TemplateType;
    isActive?: boolean;
    name?: string;
  }): Promise<Template[]> {
    const queryBuilder = this.templatesRepo
      .createQueryBuilder('template')
      .where('template.organization_id = :organizationId', { organizationId });

    if (filters?.type) {
      queryBuilder.andWhere('template.type = :type', { type: filters.type });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('template.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.name) {
      queryBuilder.andWhere('template.name ILIKE :name', { name: `%${filters.name}%` });
    }

    queryBuilder.orderBy('template.name', 'ASC').addOrderBy('template.version', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Find template by ID
   */
  async findOne(id: string, organizationId: string): Promise<Template> {
    const template = await this.templatesRepo.findOne({
      where: { id, organizationId },
    });

    if (!template) {
      throw new TemplateNotFoundException(id);
    }

    return template;
  }

  /**
   * Find all versions of a template by name
   */
  async findByName(organizationId: string, name: string): Promise<Template[]> {
    return this.templatesRepo.find({
      where: { organizationId, name },
      order: { version: 'DESC' },
    });
  }

  /**
   * Find active template by name (most recent active version)
   */
  async findActiveByName(organizationId: string, name: string): Promise<Template> {
    const template = await this.templatesRepo.findOne({
      where: {
        organizationId,
        name,
        isActive: true,
      },
      order: { version: 'DESC' },
    });

    if (!template) {
      throw new TemplateNotFoundException(name);
    }

    return template;
  }

  /**
   * Update template (creates new version with incremented version number)
   */
  async update(
    id: string,
    organizationId: string,
    updateData: UpdateTemplateDto,
    updatedBy?: string,
  ): Promise<Template> {
    this.logger.log(`Updating template ${id} for org ${organizationId}`);

    // Get existing template
    const existing = await this.findOne(id, organizationId);

    // Validate new syntax if body is being updated
    if (updateData.body) {
      const validation = this.templateRenderer.validateTemplate(updateData.body);
      if (!validation.valid) {
        throw new InvalidTemplateSyntaxException([`Body: ${validation.error}`]);
      }
    }

    if (updateData.subject) {
      const validation = this.templateRenderer.validateTemplate(updateData.subject);
      if (!validation.valid) {
        throw new InvalidTemplateSyntaxException([`Subject: ${validation.error}`]);
      }
    }

    // Deactivate old version
    existing.isActive = false;
    await this.templatesRepo.save(existing);

    // Create new version
    const newVersion = this.templatesRepo.create({
      organizationId: existing.organizationId,
      name: existing.name,
      type: existing.type,
      displayName: updateData.displayName ?? existing.displayName,
      subject: updateData.subject ?? existing.subject,
      body: updateData.body ?? existing.body,
      description: updateData.description ?? existing.description,
      requiredVariables: updateData.requiredVariables ?? existing.requiredVariables,
      metadata: updateData.metadata ?? existing.metadata,
      version: existing.version + 1,
      isActive: true,
      createdBy: updatedBy,
    });

    const saved = await this.templatesRepo.save(newVersion);

    this.logger.log(`Template updated: ${saved.id} (${saved.name} v${saved.version})`);

    return saved;
  }

  /**
   * Soft delete template (set isActive = false)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    this.logger.log(`Soft deleting template ${id} for org ${organizationId}`);

    const template = await this.findOne(id, organizationId);

    template.isActive = false;
    await this.templatesRepo.save(template);

    this.logger.log(`Template soft deleted: ${id}`);
  }

  /**
   * Render template with context
   */
  async render(templateId: string, organizationId: string, context: any): Promise<string> {
    const template = await this.findOne(templateId, organizationId);
    return this.templateRenderer.render(template.body, context);
  }

  /**
   * Preview template rendering with provided context
   */
  async renderPreview(
    templateId: string,
    organizationId: string,
    context: any,
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.findOne(templateId, organizationId);

    const result: { subject?: string; body: string } = {
      body: this.templateRenderer.render(template.body, context),
    };

    if (template.subject) {
      result.subject = this.templateRenderer.render(template.subject, context);
    }

    return result;
  }
}
