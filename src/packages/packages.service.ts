import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { Package } from './entities/package.entity';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
  ) {}

  async create(createPackageDto: CreatePackageDto): Promise<Package> {
    const newPackage = this.packageRepository.create(createPackageDto);
    return await this.packageRepository.save(newPackage);
  }

  async findAll(): Promise<Package[]> {
    return await this.packageRepository.find({
      relations: ['items'],
    });
  }

  async findOne(id: string): Promise<Package> {
    const packageFound = await this.packageRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!packageFound) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return packageFound;
  }

  async update(id: string, updatePackageDto: UpdatePackageDto): Promise<Package> {
    const packageToUpdate = await this.findOne(id);
    
    // Update basic package properties
    this.packageRepository.merge(packageToUpdate, updatePackageDto);
    
    return await this.packageRepository.save(packageToUpdate);
  }

  async remove(id: string): Promise<void> {
    const result = await this.packageRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
  }
}
