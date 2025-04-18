import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagesItemsService } from './packages-items.service';
import { PackagesItemsController } from './packages-items.controller';
import { PackagesItem } from './entities/packages-item.entity';
import { PackagesModule } from '../packages/packages.module';
import { Package } from '../packages/entities/package.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackagesItem, Package]),
    PackagesModule
  ],
  controllers: [PackagesItemsController],
  providers: [PackagesItemsService],
  exports: [PackagesItemsService]
})
export class PackagesItemsModule {}
