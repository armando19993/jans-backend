import { Module } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lote } from './entities/lote.entity';
import { Document } from 'src/documents/entities/document.entity';
import { PdfHandlerService } from 'src/pdf/pdf.handler.service';
import { Event } from 'src/events/entities/event.entity';
import { Company } from 'src/company/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lote, Document, Event, Company])],
  controllers: [LotesController],
  providers: [LotesService, PdfHandlerService],
})
export class LotesModule {}
