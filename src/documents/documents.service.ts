import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import axios from 'axios';
import * as pdf from 'pdf-parse';

@Injectable()
export class DocumentsService {
  create(createDocumentDto: CreateDocumentDto) {
    return 'This action adds a new document';
  }

  findAll() {
    return `This action returns all documents`;
  }

  async findOne(id: number) {
    return `This action returns a #${id} document`;
  }

  update(id: number, updateDocumentDto: UpdateDocumentDto) {
    return `This action updates a #${id} document`;
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

  remove(id: number) {
    return `This action removes a #${id} document`;
  }
}
