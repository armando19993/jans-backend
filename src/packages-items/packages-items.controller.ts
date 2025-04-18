import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, HttpCode } from '@nestjs/common';
import { PackagesItemsService } from './packages-items.service';
import { CreatePackagesItemDto } from './dto/create-packages-item.dto';
import { UpdatePackagesItemDto } from './dto/update-packages-item.dto';

@Controller('packages-items')
export class PackagesItemsController {
  constructor(private readonly packagesItemsService: PackagesItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPackagesItemDto: CreatePackagesItemDto) {
    return this.packagesItemsService.create(createPackagesItemDto);
  }

  @Get()
  findAll() {
    return this.packagesItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packagesItemsService.findOne(id);
  }

  @Get('by-package/:packageId')
  findByPackageId(@Param('packageId') packageId: string) {
    return this.packagesItemsService.findByPackageId(packageId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePackagesItemDto: UpdatePackagesItemDto) {
    return this.packagesItemsService.update(id, updatePackagesItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.packagesItemsService.remove(id);
  }
}
