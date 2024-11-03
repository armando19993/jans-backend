import { Injectable } from '@nestjs/common';
import { CreateComunicationsClientDto } from './dto/create-comunications-client.dto';
import { UpdateComunicationsClientDto } from './dto/update-comunications-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComunicationsClient } from './entities/comunications-client.entity';

@Injectable()
export class ComunicationsClientService {
  constructor(
    @InjectRepository(ComunicationsClient)
    private readonly comunicationClientRepository: Repository<ComunicationsClient>,
  ) {}

  create(createComunicationsClientDto: CreateComunicationsClientDto) {
    return 'This action adds a new comunicationsClient';
  }

  findAll() {
    return `This action returns all comunicationsClient`;
  }

  findOne(id: number) {
    return `This action returns a #${id} comunicationsClient`;
  }

  async update(
    id: number,
    updateComunicationsClientDto: UpdateComunicationsClientDto,
  ) {
    let data = await this.comunicationClientRepository.update(
      id,
      updateComunicationsClientDto,
    );

    return { data, message: 'Actualizado con exito!' };
  }

  remove(id: number) {
    return `This action removes a #${id} comunicationsClient`;
  }
}
