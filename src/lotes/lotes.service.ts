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
  private readonly CHUNK_SIZE = 20; // Número de documentos a procesar en paralelo
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


  async procesar(authUrl: string, loteId: number) {
    console.log(authUrl)
    try {
      console.log(authUrl)
      const lote = await this.loteRepository.findOne({
        where: { id: loteId },
        relations: ['company'],
      });

      if (!lote) {
        throw new HttpException('Lote no encontrado', HttpStatus.NOT_FOUND);
      }

      const data = await this.documentRepository.find({
        where: { lote: { id: loteId } },
        relations: ['lote'],
      });

      const totalDocuments = data.length;
      if (totalDocuments === 0) {
        throw new HttpException('No hay documentos para procesar', HttpStatus.BAD_REQUEST);
      }

      const chunks = _.chunk(data, this.CHUNK_SIZE);
      const results = [];
      let processedCount = 0;
      let errorCount = 0;

      console.log(
        `Iniciando procesamiento de ${totalDocuments} documentos en chunks de ${this.CHUNK_SIZE} documentos`,
      );

      let partitionKey = null;
      console.log(authUrl)
      try {
        const documentUrlResponse = await axios.post(`${process.env.URL_BASE}/get_document_url`, {
          session_url: authUrl,
        });

        if (!documentUrlResponse.data?.partitionKey) {
          throw new Error('No se pudo obtener la partition key del documento');
        }

        partitionKey = documentUrlResponse.data.partitionKey;
        console.log('PartitionKey obtenida:', partitionKey);
      } catch (error) {
        console.error('Error al obtener la partition key:', error);
        throw new HttpException(
          `Error al obtener la partition key: ${error.message}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const startTime = Date.now();

      // Procesar cada chunk
      for (const [chunkIndex, chunk] of chunks.entries()) {
        const chunkStartTime = Date.now();
        console.log(`Procesando chunk ${chunkIndex + 1}/${chunks.length}`);

        // Procesar documentos en el chunk en paralelo
        const chunkPromises = chunk.map(async (documento) => {
          try {
            const urlDocument = `https://catalogo-vpfe.dian.gov.co/Document/Details?trackId=${documento.cufe}&partitionKey=${partitionKey}`;
            const result = await this.procesarDocumento(authUrl, urlDocument, documento.id);
            processedCount++;
            return result;
          } catch (error) {
            errorCount++;
            console.error(`Error procesando documento ${documento.cufe}:`, error);
            return {
              status: 'error',
              documentKey: documento.cufe,
              error: error.message
            };
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.filter(r => r !== null));

        const chunkTime = Date.now() - chunkStartTime;
        console.log(
          `Chunk ${chunkIndex + 1} completado: ${processedCount}/${totalDocuments} documentos procesados. ` +
          `Errores: ${errorCount}. Tiempo: ${chunkTime}ms`,
        );

        // Actualizar progreso en el lote
        await this.loteRepository.update(loteId, {
          ctda_consultados: processedCount
        });
      }

      const totalTime = Date.now() - startTime;

      // Actualizar estado final del lote
      await this.loteRepository.update(loteId, {
        ctda_consultados: processedCount,
        procesado: true,
      });

      return {
        message: 'Procesamiento completado',
        totalProcesados: processedCount,
        totalErrores: errorCount,
        totalDocumentos: totalDocuments,
        tiempoTotal: `${(totalTime / 1000).toFixed(2)} segundos`,
        resultados: results,
      };
    } catch (error) {
      console.error('Error en el procesamiento batch:', error);
      throw new HttpException(
        `Error en procesamiento batch: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async procesarDocumento(
    urlAuth: string,
    documento: any,
    documentId: number,
    retryCount = 0,
  ): Promise<any> {
    console.log(documento, urlAuth)

    const response = await axios.post(`${process.env.URL_BASE}/procesar_documento`, { auth_url: urlAuth, url_document: documento })

    const result = await response.data;
    console.log(result)

    const formattedDate = this.formatDate(result.Fecha_emision);
    const ivaValue = this.cleanMoneyValue(result.Totales.IVA);
    const totalValue = this.cleanMoneyValue(result.Totales.Total);

    let pdfUrl = null;
    let metodoPago = null;

    // Actualizar el documento en la base de datos
    try {
      console.log("tipo: " + result.Tipo_documento)
      console.log("nro_factura: " + (result.Serie || '') + result.Folio)
      console.log("date_factura: " + formattedDate)
      console.log("nit_emisor: " + result.Emisor.NIT)
      console.log("razon_social_emisor: " + result.Emisor.Nombre)
      console.log("nit_receptor: " + result.Receptor.NIT)
      console.log("razon_social_receptor: " + result.Receptor.Nombre)
      console.log("iva: " + ivaValue)
      console.log("total: " + totalValue)
      console.log("legitimo_tenedor: " + result.Legitimo_tenedor)
      console.log("factura_pdf: " + pdfUrl)
      console.log("forma_pago: " + metodoPago)
      await this.documentRepository.update(documentId, {
        tipo: result.Tipo_documento,
        nro_factura: (result.Serie || '') + result.Folio,
        date_factura: formattedDate,
        nit_emisor: result.Emisor.NIT,
        razon_social_emisor: result.Emisor.Nombre,
        nit_receptor: result.Receptor.NIT,
        razon_social_receptor: result.Receptor.Nombre,
        iva: ivaValue,
        total: totalValue,
        legitimo_tenedor: result.Legitimo_tenedor,
        factura_pdf: pdfUrl,
        forma_pago: metodoPago,
        status: true,
      });
    } catch (error) {
      console.error('Error al actualizar el documento:', error);
      throw new Error(`Error al actualizar el documento: ${error.message}`);
    }


    // Procesar eventos si existen
    if (result.Eventos && Array.isArray(result.Eventos)) {
      for (const evento of result.Eventos) {
        const document = await this.documentRepository.findOne({ where: { id: documentId } });
        if (document) {
          await this.eventRepository.save({
            code: evento.Codigo,
            description: evento.Descripcion,
            date: new Date(evento.Fecha),
            document: document
          });
        }
      }
    }

    return {
      status: 'success',
      documentId,
      tipo: result.Tipo_documento,
      nro_factura: (result.Serie || '') + result.Folio,
      emisor: result.Emisor.Nombre,
      receptor: result.Receptor.Nombre,
      total: totalValue,
      eventos: result.Eventos?.length || 0
    };
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

    return 50;
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
