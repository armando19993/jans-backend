import { Module } from '@nestjs/common';
import { ComunicationsClientService } from './comunications-client.service';
import { ComunicationsClientController } from './comunications-client.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComunicationsClient } from './entities/comunications-client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ComunicationsClient])],
  controllers: [ComunicationsClientController],
  providers: [ComunicationsClientService],
})
export class ComunicationsClientModule {}
