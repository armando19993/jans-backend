import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { Response } from 'express';

@Controller('lotes')
@UseGuards(AuthGuard)
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Post()
  create(@Body() createLoteDto, @Request() req) {
    return this.lotesService.create(createLoteDto, req.user);
  }

  @Get()
  findAll(@Request() req) {
    return this.lotesService.findAll(req.user);
  }

  @Get('procesar/cufes')
  procesar() {
    return this.lotesService.procesar();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lotesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoteDto: UpdateLoteDto) {
    return this.lotesService.update(+id, updateLoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lotesService.remove(+id);
  }

  @Get('/export/documents/:id')
  async downloadExcel(@Param('id') id: number, @Res() res: Response) {
    const buffer = await this.lotesService.export(id);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="documentos_${id}.xlsx"`,
    });
    res.send(buffer);
  }
}
