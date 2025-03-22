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
  Query,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { Response } from 'express';

@Controller('lotes')
@UseGuards(AuthGuard)
export class LotesController {
  constructor(private readonly lotesService: LotesService) { }

  @Post()
  create(@Body() createLoteDto, @Request() req) {
    return this.lotesService.create(createLoteDto, req.user);
  }

  @Get()
  findAll(@Request() req) {
    return this.lotesService.findAll(req.user);
  }

  @Post('procesar/cufes')
  procesar(@Body() data) {
    return this.lotesService.procesar(data.authUrl, data.loteId);
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

  @Get('/get/admin/report')
  async getAdminReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Convertir las fechas a objetos Date
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Validar que las fechas sean válidas
    if (isNaN(startDateObj.getTime())) {
      throw new Error('startDate no es una fecha válida');
    }
    if (isNaN(endDateObj.getTime())) {
      throw new Error('endDate no es una fecha válida');
    }

    // Llamar al servicio con las fechas
    return this.lotesService.reportAdmin({ startDate: startDateObj, endDate: endDateObj });
  }
}
