import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ComunicationsClientService } from './comunications-client.service';
import { CreateComunicationsClientDto } from './dto/create-comunications-client.dto';
import { UpdateComunicationsClientDto } from './dto/update-comunications-client.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';

@Controller('comunications-client')
@UseGuards(AuthGuard)
@UseInterceptors(ResponseInterceptor)
export class ComunicationsClientController {
  constructor(
    private readonly comunicationsClientService: ComunicationsClientService,
  ) {}

  @Post()
  create(@Body() createComunicationsClientDto: CreateComunicationsClientDto) {
    return this.comunicationsClientService.create(createComunicationsClientDto);
  }

  @Get()
  findAll() {
    return this.comunicationsClientService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comunicationsClientService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComunicationsClientDto: UpdateComunicationsClientDto,
  ) {
    return this.comunicationsClientService.update(
      +id,
      updateComunicationsClientDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comunicationsClientService.remove(+id);
  }
}
