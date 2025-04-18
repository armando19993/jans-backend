import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePackagesItemDto } from './dto/create-packages-item.dto';
import { UpdatePackagesItemDto } from './dto/update-packages-item.dto';
import { PackagesItem } from './entities/packages-item.entity';
import { Package } from '../packages/entities/package.entity';

@Injectable()
export class PackagesItemsService {
  constructor(
    @InjectRepository(PackagesItem)
    private packageItemRepository: Repository<PackagesItem>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
  ) {}

  async create(createPackagesItemDto: CreatePackagesItemDto): Promise<PackagesItem> {
    const { packageId, ...itemData } = createPackagesItemDto;
    
    if (!packageId) {
      throw new NotFoundException('Package ID is required');
    }
    
    const packageFound = await this.packageRepository.findOne({
      where: { id: packageId }
    });
    
    if (!packageFound) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }
    
    const newItem = this.packageItemRepository.create({
      ...itemData,
      package: packageFound
    });
    
    return await this.packageItemRepository.save(newItem);
  }

  async findAll(): Promise<PackagesItem[]> {
    return await this.packageItemRepository.find({
      relations: ['package']
    });
  }

  async findOne(id: string): Promise<PackagesItem> {
    const item = await this.packageItemRepository.findOne({
      where: { id },
      relations: ['package']
    });
    
    if (!item) {
      throw new NotFoundException(`Package item with ID ${id} not found`);
    }
    
    return item;
  }

  async findByPackageId(packageId: string): Promise<PackagesItem[]> {
    const packageFound = await this.packageRepository.findOne({
      where: { id: packageId }
    });
    
    if (!packageFound) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }
    
    return await this.packageItemRepository.find({
      where: { package: { id: packageId } }
    });
  }

  async update(id: string, updatePackagesItemDto: UpdatePackagesItemDto): Promise<PackagesItem> {
    const item = await this.findOne(id);
    
    // If packageId is provided, update the package relation
    if (updatePackagesItemDto.packageId) {
      const newPackage = await this.packageRepository.findOne({
        where: { id: updatePackagesItemDto.packageId }
      });
      
      if (!newPackage) {
        throw new NotFoundException(`Package with ID ${updatePackagesItemDto.packageId} not found`);
      }
      
      item.package = newPackage;
    }
    
    // Update other properties
    const { packageId, ...itemData } = updatePackagesItemDto;
    this.packageItemRepository.merge(item, itemData);
    
    return await this.packageItemRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const result = await this.packageItemRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Package item with ID ${id} not found`);
    }
  }
}
