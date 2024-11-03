import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { TYPES_USERS } from './enums/types-users.enum';
import { STATUS_ENUM } from 'src/enums/status.enums';
import { ComunicationsClient } from 'src/comunications-client/entities/comunications-client.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ComunicationsClient)
    private readonly comnunicationsRepository: Repository<ComunicationsClient>,
  ) {}

  async create(createUserDto: CreateUserDto, userD) {
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    if (userD.role === 'ADMIN') {
      let contador = await this.userRepository
        .createQueryBuilder('user')
        .where('user.companyId = :companyId', { companyId: userD.company.id }) // Corrección aquí
        .getCount();
      let suma = contador + 1;

      if (suma > userD.company.ctda_users) {
        throw new BadRequestException(
          'Has llegado a tu limite de usuarios, contacta con administracion!',
        );
      }
    }

    const hashed = await bcryptjs.hash(createUserDto.password, 10);
    const user = { ...createUserDto, password: hashed };

    const data = await this.userRepository.save(user);

    return { data, message: 'Registro exitoso' };
  }

  async findAll(user) {
    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company');

    if (user.role == TYPES_USERS.OPERATOR) {
      throw new BadRequestException(
        'No tienes permisos para acceder a esta informacion',
      );
    }

    if (user.role == TYPES_USERS.ADMIN) {
      query = query.where('user.companyId = :company', {
        company: user.company.id,
      });
    }

    let data = await query.getMany();

    return { data, message: 'Usuarios obtenidos con exito' };
  }

  async findOne(id: number) {
    let data = await this.userRepository.findOne({
      where: { id },
      relations: ['lotes', 'lotes.documents', 'company'],
    });

    return { data, message: 'Usuario obtenido con exito' };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error(`Usuario con id ${id} no encontrado`);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcryptjs.hash(updateUserDto.password, 10);
    } else {
      delete updateUserDto.password;
    }

    const updatedUser = await this.userRepository.update(id, updateUserDto);
    return { updatedUser, message: `Usuario #${id} actualizado con éxito` };
  }

  async remove(id: number) {
    let data = await this.userRepository.update(id, {
      status: STATUS_ENUM.SUSPENDIDO,
    });

    return { data, message: 'Usuario suspendido con exito' };
  }

  async notifications(user) {
    let data = await this.comnunicationsRepository
      .createQueryBuilder('com')
      .where('com.userId = :userId', { userId: user.id })
      .andWhere('com.view = :view', { view: false })
      .leftJoinAndSelect('com.comunication', 'comunication')
      .getMany();

    return { data, message: 'Notificaciones Obtenidas con exito' };
  }

  async comunications(user) {
    let data = await this.comnunicationsRepository
      .createQueryBuilder('com')
      .where('com.userId = :userId', { userId: user.id })
      .leftJoinAndSelect('com.comunication', 'comunication')
      .getMany();

    return { data, message: 'Notificaciones Obtenidas con exito' };
  }
}
