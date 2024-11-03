import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ComunicationsClient } from 'src/comunications-client/entities/comunications-client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ComunicationsClient])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
