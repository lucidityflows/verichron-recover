// src/rbac/rbac.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from './entities';
import { UserEntity, UserMembershipEntity } from '../profiles/entities';

import { EventsModule } from '../events/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity, RolePermissionEntity, UserMembershipEntity]),
    EventsModule,
  ],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService], // Export for use in other modules
})
export class RbacModule {}