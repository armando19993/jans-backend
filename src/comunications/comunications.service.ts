import { Injectable } from '@nestjs/common';
import { CreateComunicationDto } from './dto/create-comunication.dto';
import { UpdateComunicationDto } from './dto/update-comunication.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Lote } from 'src/lotes/entities/lote.entity';
import { Repository } from 'typeorm';
import { Comunication } from './entities/comunication.entity';
import { ComunicationsClient } from 'src/comunications-client/entities/comunications-client.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class ComunicationsService {
  constructor(
    @InjectRepository(Comunication)
    private readonly comunicationRepository: Repository<Comunication>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ComunicationsClient)
    private readonly comunicationClientRepository: Repository<ComunicationsClient>,
  ) {}

  async create(createComunicationDto: CreateComunicationDto) {
    try {
      // Guarda el comunicado en la base de datos
      const data = await this.comunicationRepository.save(
        createComunicationDto,
      );

      // Encuentra todos los usuarios
      const usuarios = await this.userRepository.find();

      // Guarda la comunicación para cada usuario
      for (const usuario of usuarios) {
        await this.comunicationClientRepository.save({
          user: usuario,
          comunication: data,
          view: false,
        });
      }

      return { data, message: 'Comunicado creado con éxito!' };
    } catch (error) {
      // Manejo básico de errores
      console.error('Error al crear comunicado:', error);
      throw new Error('No se pudo crear el comunicado.');
    }
  }

  async findAll() {
    let data = await this.comunicationRepository.find();

    return { data, message: 'Listado de Comunicaciones' };
  }

  findOne(id: number) {
    return `This action returns a #${id} comunication`;
  }

  update(id: number, updateComunicationDto: UpdateComunicationDto) {
    return `This action updates a #${id} comunication`;
  }

  async remove(id: number) {
    return await this.comunicationRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const comunication = await transactionalEntityManager.findOne(
          this.comunicationRepository.target,
          { where: { id } },
        );

        if (!comunication) {
          throw new Error('Comunicación no encontrada');
        }

        await transactionalEntityManager.delete(
          this.comunicationClientRepository.target,
          { comunication },
        );

        await transactionalEntityManager.remove(
          this.comunicationRepository.target,
          comunication,
        );

        return { message: 'Eliminado con éxito' };
      },
    );
  }
}
