import { HttpException, Injectable } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtAuthService: JwtService,
  ) {}

  async login(loginAuthDto: LoginAuthDto) {
    const { user, password } = loginAuthDto;
    const findUser = await this.userRepository.findOne({
      where: { username: user },
      relations: ['company'],
    });
    if (!findUser)
      throw new HttpException('Usuario no existe, en la base de datos!', 404);

    const checkPassword = await bcryptjs.compare(password, findUser.password);
    if (!checkPassword)
      throw new HttpException(
        'Error en la clave, recuerda que muchos intento bloquearan tu usuario!',
        403,
      );

    const playload = {
      id: findUser.id,
      name: findUser.name,
      username: findUser.username,
      role: findUser.role,
      company: findUser.company ? findUser.company : null,
    };

    const token = this.jwtAuthService.sign(playload);

    const data = {
      user: { ...findUser, password: null },
      token: token,
    };

    return data;
  }
}
