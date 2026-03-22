import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';
import { ProjectService } from './project.service';

@Module({
    imports: [MikroOrmModule.forFeature([Project])],
    controllers: [ProjectController],
    providers: [ProjectRepository, ProjectService],
    exports: [ProjectService],
})
export class ProjectModule {}