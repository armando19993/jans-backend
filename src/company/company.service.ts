import { Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { STATUS_ENUM } from 'src/enums/status.enums';
import { User } from 'src/user/entities/user.entity';
import { Lote } from 'src/lotes/entities/lote.entity';
import { Document } from 'src/documents/entities/document.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    let data = await this.companyRepository.save(createCompanyDto);

    return { data, message: 'Compañia creada con exito' };
  }

  async findAll() {
    let data = await this.companyRepository.find();

    return { data, message: 'Listado de empresas obtenidos' };
  }

  async findOne(id: number) {
    let data = await this.companyRepository.findOne({ where: { id } });

    return { data, message: 'Informacion de empresa' };
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    let data = await this.companyRepository.update(id, updateCompanyDto);

    return { data, message: 'Actualizacion de empresa correcta!' };
  }

  async remove(id: number) {
    let data = await this.companyRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    await this.companyRepository.update(id, { status: STATUS_ENUM.SUSPENDIDO });

    for (const user of data.users) {
      await this.userRepository.update(user.id, {
        status: STATUS_ENUM.SUSPENDIDO,
      });
    }

    return { data, message: 'Empresa suspendida con exito!' };
  }

  async statisc(user) {
    let usuarios = 0;
    let empresas = 0;
    let lotes = 0;
    let documentos = 0;

    if (user.role == 'ADMIN') {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.companyId = :companyId', { companyId: user.company.id })
        .getCount();

      const [lotesEncontrados, count] = await this.loteRepository.findAndCount({
        where: { company: user.company },
        relations: ['documents'],
      });
      lotes = count;
      documentos = lotesEncontrados.reduce(
        (sum, lote) => sum + lote.documents.length,
        0,
      );
      usuarios = users;
    }

    if (user.role == 'SADMIN') {
      const [users, count] = await this.userRepository.findAndCount();
      usuarios = count;
      const [companys, countC] = await this.companyRepository.findAndCount();
      empresas = countC;
      const [lotess, countL] = await this.loteRepository.findAndCount();
      lotes = countL;
      const [documents, countD] = await this.documentRepository.findAndCount();
      documentos = countD;
    }

    if (user.role == 'OPERATOR') {
      const [lotesEncontrados, count] = await this.loteRepository.findAndCount({
        where: { user: user.id },
        relations: ['documents'],
      });
      lotes = count;
      documentos = lotesEncontrados.reduce(
        (sum, lote) => sum + lote.documents.length,
        0,
      );
    }
    let data = { empresas, usuarios, lotes, documentos };

    return { data, message: 'Estadisticas obtenidas con exito' };
  }
}
