import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { TypeORMError } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { User } from 'src/user/entities/user.entity';
import { Lote } from 'src/lotes/entities/lote.entity';
import { Document } from 'src/documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, User, Lote, Document])],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
