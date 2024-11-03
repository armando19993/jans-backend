import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComunicationsService } from './comunications.service';
import { CreateComunicationDto } from './dto/create-comunication.dto';
import { UpdateComunicationDto } from './dto/update-comunication.dto';

@Controller('comunications')
export class ComunicationsController {
  constructor(private readonly comunicationsService: ComunicationsService) {}

  @Post()
  create(@Body() createComunicationDto: CreateComunicationDto) {
    return this.comunicationsService.create(createComunicationDto);
  }

  @Get()
  findAll() {
    return this.comunicationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comunicationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComunicationDto: UpdateComunicationDto) {
    return this.comunicationsService.update(+id, updateComunicationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comunicationsService.remove(+id);
  }
}
