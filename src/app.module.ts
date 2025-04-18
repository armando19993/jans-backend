import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { LotesModule } from './lotes/lotes.module';
import { DocumentsModule } from './documents/documents.module';
import { EventsModule } from './events/events.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { PdfHandlerService } from './pdf/pdf.handler.service';
import { ComunicationsModule } from './comunications/comunications.module';
import { ComunicationsClientModule } from './comunications-client/comunications-client.module';
import { PackagesModule } from './packages/packages.module';
import { PackagesItemsModule } from './packages-items/packages-items.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'api_jans',
      autoLoadEntities: process.env.DB_AUTOLOAD_ENTITIES === 'true' || true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true' || true,
    }),
    AuthModule,
    UserModule,
    CompanyModule,
    LotesModule,
    DocumentsModule,
    EventsModule,
    ComunicationsModule,
    ComunicationsClientModule,
    PackagesModule,
    PackagesItemsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PdfHandlerService],
  exports: [PdfHandlerService]
})
export class AppModule { }
