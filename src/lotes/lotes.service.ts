import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Lote } from './entities/lote.entity';
import { Repository } from 'typeorm';
import { Document } from 'src/documents/entities/document.entity';
import { PdfHandlerService } from 'src/pdf/pdf.handler.service';
import * as moment from 'moment';
import * as _ from 'lodash';
import { Event } from 'src/events/entities/event.entity';
import { TYPES_USERS } from 'src/user/enums/types-users.enum';
import * as ExcelJS from 'exceljs';
import { Company } from 'src/company/entities/company.entity';
import axios from 'axios';
import * as pdf from 'pdf-parse';

@Injectable()
export class LotesService {
  private readonly CHUNK_SIZE = 10; // Número de documentos a procesar en paralelo
  private readonly MAX_RETRIES = 3; // Número máximo de reintentos por documento

  constructor(
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly pdfHandlerService: PdfHandlerService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) { }


  async create(documentos, user) {
    if (!documentos.length) {
      throw new BadRequestException('El listado de documentos está vacío.');
    }

    const primerDocumento = documentos[0];
    const cufe = primerDocumento['CUFE/CUDE'];

    if (!cufe) {
      throw new BadRequestException('El primer documento no tiene un CUFE válido.');
    }

    try {
      // Verificar la respuesta del API DIAN
      const response = await fetch(`https://lector.jansprogramming.com.co/process?documentKey=${cufe}`);

      const result = await response.json();
      if (result.error) {
        throw new BadRequestException(`Error con el API DIAN: ${result.error}`);
      }
    } catch (error) {
      throw new BadRequestException(`Error al conectar con el API DIAN: ${error.message}`);
    }

    // Crear el lote si no hay errores con el API
    const data = await this.loteRepository.save({
      ctda_registros: documentos.length,
      ctda_consultados: 0,
      user: user.id,
      company: user.company.id,
    });

    // Procesar y guardar los documentos
    for (const documento of documentos) {
      const cufe = documento['CUFE/CUDE'];
      const tipo = documento['Tipo de documento'];

      if (cufe) {
        if (
          tipo == 'Documento soporte con no obligados' ||
          tipo == 'Nota de crédito electrónica'
        ) {
          await this.documentRepository.save({
            cufe,
            tipo,
            status: true,
            razon_social_emisor: 'ESTE TIPO DE DOCUMENTO NO SE PROCESA',
            lote: data,
          });
        } else {
          await this.documentRepository.save({
            cufe,
            lote: data,
          });
        }
      }
    }

    return { data, message: 'Lote creado con éxito' };
  }


  async procesar() {
    try {
      const data = await this.documentRepository.find({
        where: { status: false },
        relations: ['lote', 'lote.company'],
      });

      const totalDocuments = data.length;

      // Obtener el tamaño de chunk óptimo
      const optimalChunkSize = await this.getOptimalChunkSize(totalDocuments);
      const chunks = _.chunk(data, optimalChunkSize);
      const results = [];
      let processedCount = 0;

      console.log(
        `Iniciando procesamiento de ${totalDocuments} documentos en chunks de ${optimalChunkSize}`,
      );

      // Procesar cada chunk
      for (const chunk of chunks) {
        const chunkStartTime = Date.now();

        // Procesar documentos en el chunk en paralelo
        const chunkPromises = chunk.map(async (documento) => {
          const result = await this.procesarDocumento(documento);
          return result;
        });

        const chunkResults = await Promise.allSettled(chunkPromises);

        // Analizar resultados del chunk
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
            processedCount++;
          } else if (result.status === 'rejected') {
            console.error(
              `Error en documento ${chunk[index].cufe}:`,
              result.reason,
            );
          }
        });

        const chunkTime = Date.now() - chunkStartTime;
        console.log(
          `Chunk procesado: ${processedCount}/${totalDocuments} documentos. Tiempo: ${chunkTime}ms`,
        );
      }

      return {
        message: 'Procesamiento completado',
        totalProcesados: processedCount,
        totalDocumentos: totalDocuments,
        resultados: results,
      };
    } catch (error) {
      console.error('Error en el procesamiento batch:', error);
      throw new Error(`Error en procesamiento batch: ${error.message}`);
    }
  }

  private async procesarDocumento(
    documento: any,
    retryCount = 0,
  ): Promise<any> {
    try {
      const documentKey = documento.cufe;

      const response = await fetch(
        `https://lector.jansprogramming.com.co/process?documentKey=${documentKey}`,
      );
      const result = await response.json();

      const formattedDate = this.formatDate(result.datos_factura.fecha);
      const ivaValue = this.cleanMoneyValue(result.secciones.totales.IVA);
      const totalValue = this.cleanMoneyValue(result.secciones.totales.Total);

      const pdfUrl = await this.pdfHandlerService.savePdf(
        `${documentKey}.pdf`,
        result.pdf_base64,
      );

      let metodoPago = null;
      try {
        const pdfData = await this.extractInvoiceDataFromUrl(pdfUrl);
        metodoPago = pdfData.formaDePago;
      } catch (pdfError) {
        console.error('Error al extraer método de pago del PDF:', pdfError);
        // Continuamos con el proceso aunque falle la extracción del método de pago
      }

      // Actualizar el documento en la base de datos
      await this.documentRepository.update(documento.id, {
        tipo: result.datos_factura.tipo_documento,
        nro_factura:
          (result.datos_factura.serie || '') + result.datos_factura.folio,
        date_factura: formattedDate,
        nit_emisor: result.secciones.emisor.NIT,
        razon_social_emisor: result.secciones.emisor.Nombre,
        nit_receptor: result.secciones.receptor.NIT,
        razon_social_receptor: result.secciones.receptor.Nombre,
        iva: ivaValue,
        total: totalValue,
        legitimo_tenedor: result.legitimo_tenedor,
        factura_pdf: pdfUrl,
        forma_pago: metodoPago,
        status: true,
      });

      // Recorrer los eventos y hacer inserciones en otra tabla
      if (result.eventos && Array.isArray(result.eventos)) {
        for (const evento of result.eventos) {
          await this.eventRepository.save({
            code: evento.codigo,
            description: evento.descripcion,
            date: evento.fecha,
            document: documento.id,
          });
        }
      }

      return {
        documentKey,
        status: 'success',
        pdfUrl,
      };
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        console.log(
          `Reintentando documento ${documento.cufe}. Intento ${retryCount + 1}/${this.MAX_RETRIES}`,
        );
        return this.procesarDocumento(documento, retryCount + 1);
      }

      console.error(`Error procesando documento ${documento.cufe}:`, error);
      throw new Error(`Error en documento ${documento.cufe}: ${error.message}`);
    }
  }

  async extractInvoiceDataFromUrl(pdfUrl: string): Promise<Record<string, string | null>> {
    try {
      // Descargar el PDF desde la URL
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Extraer el texto del PDF
      const data = await pdf(buffer);
      const text = data.text;

      // Expresiones regulares mejoradas con patrones más flexibles
      const patterns = {
        numeroDeFactura: /Número de Factura:\s*(.*?)(?=Forma de pago:)/is,
        formaDePago: /Forma de pago:\s*([^\n\r]+)/i,
        fechaDeEmision: /Fecha de Emisión:\s*(\d{2}\/\d{2}\/\d{4})/i,
        medioDePago: /Medio de Pago:\s*([^\n\r]+)/i,
        fechaDeVencimiento: /Fecha de Vencimiento:\s*(\d{2}\/\d{2}\/\d{4})/i,
        tipoDeOperacion: /Tipo de Operación:\s*(.*?)(?=Fecha de orden de pedido:)/is,
        razonSocial: /Razón Social:\s*([^\n\r]+)/i,
        nit: /Nit del Emisor:\s*(\d+)/i,
        total: /Total factura \(=\)\s*COP \$ ([\d.,]+)/i
      };

      // Función helper para extraer datos
      const extractData = (pattern: RegExp): string | null => {
        const match = text.match(pattern);
        return match ? match[1].trim() : null;
      };

      // Extraer todos los datos
      const result: Record<string, string | null> = {};
      for (const [key, pattern] of Object.entries(patterns)) {
        result[key] = extractData(pattern);
      }

      // Procesar los datos extraídos
      if (result.total) {
        result.total = result.total.replace(/,/g, '');
      }

      return result;
    } catch (error) {
      console.error('Error al procesar el PDF:', error);
      throw new HttpException(
        'Error al procesar el PDF desde la URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método opcional para ajustar dinámicamente el tamaño del chunk basado en la carga
  private async getOptimalChunkSize(totalDocuments: number): Promise<number> {
    const MIN_CHUNK_SIZE = 20;
    const MAX_CHUNK_SIZE = 40;

    if (totalDocuments < 100) return MIN_CHUNK_SIZE;
    if (totalDocuments > 100) return MAX_CHUNK_SIZE;

    return 5;
  }

  async findAll(user) {
    let query = this.loteRepository
      .createQueryBuilder('lote')
      .leftJoinAndSelect('lote.company', 'company')
      .leftJoinAndSelect('lote.user', 'user');

    // Condiciones según el rol del usuario
    if (user.role === TYPES_USERS.OPERATOR) {
      query = query.andWhere('lote.userId = :userId', { userId: user.id });
    }

    if (user.role === TYPES_USERS.ADMIN) {
      query = query.andWhere('lote.companyId = :companyId', {
        companyId: user.company.id,
      });
    }

    // Ordenar por id de forma descendente
    query = query.orderBy('lote.id', 'DESC');

    // Obtener los resultados
    let data = await query.getMany();

    return { data, message: 'Listado de lotes obtenidos con éxito' };
  }

  async findOne(id: number) {
    let data = await this.loteRepository.findOne({
      where: { id },
      relations: ['company', 'user', 'documents', 'documents.events'],
    });

    return { data, message: 'Listado obtenido con exito!' };
  }

  async export(id: number) {
    const data = await this.loteRepository.findOne({
      where: { id },
      relations: ['company', 'user', 'documents', 'documents.events'],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Documentos');

    // Definir encabezados
    worksheet.columns = [
      { header: 'Factura', key: 'factura', width: 30 },
      { header: 'Tipo Documento', key: 'tipo_documento', width: 20 },
      { header: 'Forma_Pago', key: 'forma_pago', width: 20 },
      { header: 'Numero Documento', key: 'numero_documento', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Eventos', key: 'eventos', width: 50 },
      { header: 'Nit_Emisor', key: 'nit_emisor', width: 20 },
      { header: 'Razon_Social_Emisor', key: 'razon_social_emisor', width: 30 },
      { header: 'Nit_Receptor', key: 'nit_receptor', width: 20 },
      {
        header: 'Razon_Social_Receptor',
        key: 'razon_social_receptor',
        width: 30,
      },
      { header: 'Iva', key: 'iva', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Legitimo_Tenedor', key: 'legitimo_tenedor', width: 20 },
      { header: 'QR', key: 'qr', width: 20 },
    ];

    // Procesar documentos
    data.documents.forEach((document) => {
      const events =
        document.events && document.events.length > 0
          ? document.events
            .map(
              (event) =>
                `${event.code} ${event.description} ${new Date(event.date).toLocaleDateString()}`,
            )
            .join('\n')
          : 'Sin eventos';
      if (document.tipo != 'Documento soporte con no obligados') {
        const row = worksheet.addRow({
          factura: {
            text: 'Ver Factura',
            hyperlink: `https://api.jansprogramming.com.co/pdfs/${document.cufe}.pdf`,
          },
          tipo_documento: document.tipo,
          forma_pago: document.forma_pago,
          numero_documento: document.nro_factura,
          fecha: new Date(document.date_factura).toLocaleDateString(),
          eventos: events,
          nit_emisor: document.nit_emisor,
          razon_social_emisor: document.razon_social_emisor,
          nit_receptor: document.nit_receptor,
          razon_social_receptor: document.razon_social_receptor,
          iva: document.iva,
          total: document.total,
          legitimo_tenedor: document.legitimo_tenedor,
          qr: {
            text: 'Verificar en DIAN',
            hyperlink: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${document.cufe}`,
          },
        });

        // Aplicar estilos para simular un enlace
        const facturaCell = row.getCell('factura');
        facturaCell.font = { color: { argb: 'FF0000FF' }, underline: true }; // Azul con subrayado

        const qrCell = row.getCell('qr');
        qrCell.font = { color: { argb: 'FF0000FF' }, underline: true }; // Azul con subrayado
      }
    });

    // Generar el archivo en un buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  update(id: number, updateLoteDto: UpdateLoteDto) {
    return `This action updates a #${id} lote`;
  }

  remove(id: number) {
    return `This action removes a #${id} lote`;
  }

  private formatDate(dateString: string): string {
    const formats = [
      'DD-MM-YYYY', // para 27-10-2024
      'D-M-YYYY', // para 7-5-2024
      'DD/MM/YYYY', // para 27/10/2024
      'D/M/YYYY', // para 7/5/2024
      'YYYY-MM-DD', // para 2024-10-27
    ];

    const momentDate = moment(dateString, formats, true);

    if (!momentDate.isValid()) {
      throw new Error(`Formato de fecha inválido: ${dateString}`);
    }

    return momentDate.format('YYYY-MM-DD');
  }

  private cleanMoneyValue(value: string): number {
    if (typeof value !== 'string') {
      return value;
    }
    const cleanValue = value.replace(/[^0-9.]/g, '');
    return Number(parseFloat(cleanValue).toFixed(2));
  }
}

interface ProcessingResult {
  documentKey: string;
  status: 'success' | 'error';
  pdfUrl?: string;
  error?: string;
}
