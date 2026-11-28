import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacOpsController } from './rbac.ops.controller';
import { RbacOpsService } from './rbac.ops.service';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from './entities';
import { UserMembershipEntity } from '../profiles/entities';
import { EventsModule } from '../events/event.module';

/**
 * RBAC Ops Module
 * 
 * Manages system-wide role definitions and platform permissions.
 * Bypasses tenant-scoped security for Platform Admin use.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity, 
      PermissionEntity, 
      RolePermissionEntity,
      UserMembershipEntity
    ]),
    EventsModule
  ],
  controllers: [RbacOpsController],
  providers: [RbacOpsService],
  exports: [RbacOpsService],
})
export class RbacOpsModule {}