import { Module } from '@nestjs/common';
import { ComunicationsService } from './comunications.service';
import { ComunicationsController } from './comunications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comunication } from './entities/comunication.entity';
import { ComunicationsClient } from 'src/comunications-client/entities/comunications-client.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comunication, ComunicationsClient, User])],
  controllers: [ComunicationsController],
  providers: [ComunicationsService],
})
export class ComunicationsModule {}
