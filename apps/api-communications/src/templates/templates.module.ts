import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './entities/template.entity';
import { TemplatesService } from './templates.service';
import { TemplateRendererService } from './template-renderer.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Template])],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplateRendererService],
  exports: [TemplatesService, TemplateRendererService],
})
export class TemplatesModule {}